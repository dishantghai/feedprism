"""
Pipeline Router

Endpoints for the extraction pipeline with Server-Sent Events (SSE) for progress streaming.
Used by the Prism Overview demo to show real-time extraction progress.
"""

import json
import asyncio
import uuid
from datetime import datetime
from typing import List, Dict, Any, AsyncGenerator

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from loguru import logger
from qdrant_client.models import PointStruct

from app.config import settings
from app.database.qdrant_client import QdrantService
from app.services.gmail_client import GmailClient
from app.services.parser import EmailParser
from app.services.orchestrator import ExtractionOrchestrator
from app.services.embedder import EmbeddingService
from app.services.analytics import AnalyticsService
from app.utils.sparse_vector import create_sparse_vector

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

# Lazy-initialized services
_gmail_client = None
_qdrant = None
_parser = None
_orchestrator = None
_embedder = None

# Lock to prevent concurrent Gmail API calls (causes SSL issues)
import threading
import time
_gmail_lock = threading.Lock()
_fetch_in_progress = False
_fetch_started_at: float = 0  # Timestamp when fetch started
_FETCH_TIMEOUT_SECONDS = 120  # Auto-reset after 2 minutes

# Global extraction state tracking (for SSE reconnection)
_extraction_in_progress = False
_extraction_started_at: float = 0
_extraction_progress: Dict[str, Any] = {
    "current": 0,
    "total": 0,
    "events": 0,
    "courses": 0,
    "blogs": 0,
    "message": "",
    "emails_processed": 0,
    "errors": 0
}
_EXTRACTION_TIMEOUT_SECONDS = 600  # Auto-reset after 10 minutes

# Runtime settings store (persists across requests, resets on server restart)
# These can be modified via API and override the config defaults
_runtime_settings: Dict[str, Any] = {
    "email_max_limit": None,  # None means use config default
    "email_fetch_hours_back": None,  # None means use config default
}


def get_email_max_limit() -> int:
    """Get the current email max limit, preferring runtime setting over config default."""
    if _runtime_settings["email_max_limit"] is not None:
        return min(_runtime_settings["email_max_limit"], 500)  # Enforce hard cap
    return min(settings.email_max_limit, 500)


def get_email_fetch_hours() -> int:
    """Get the current email fetch hours, preferring runtime setting over config default."""
    if _runtime_settings["email_fetch_hours_back"] is not None:
        return min(_runtime_settings["email_fetch_hours_back"], 240)  # Enforce hard cap of 240 hours
    return min(settings.email_fetch_hours_back, 240)


def get_gmail() -> GmailClient:
    global _gmail_client
    if _gmail_client is None:
        _gmail_client = GmailClient()
    return _gmail_client


def get_qdrant() -> QdrantService:
    global _qdrant
    if _qdrant is None:
        _qdrant = QdrantService()
        _qdrant.create_all_collections()
    return _qdrant


def get_parser() -> EmailParser:
    global _parser
    if _parser is None:
        _parser = EmailParser()
    return _parser


def get_orchestrator() -> ExtractionOrchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = ExtractionOrchestrator()
    return _orchestrator


def get_embedder() -> EmbeddingService:
    global _embedder
    if _embedder is None:
        _embedder = EmbeddingService()
    return _embedder


def _parse_sender(from_header: str) -> tuple:
    """Parse 'From' header into name and email."""
    import re
    match = re.match(r'^(.+?)\s*<(.+?)>$', from_header)
    if match:
        return match.group(1).strip().strip('"'), match.group(2).strip()
    return from_header, from_header


@router.post("/reset-fetch-lock")
def reset_fetch_lock():
    """
    Manually reset the fetch lock if it gets stuck.
    Use this if you're getting 429 errors after a server crash.
    """
    global _fetch_in_progress, _fetch_started_at
    was_locked = _fetch_in_progress
    _fetch_in_progress = False
    _fetch_started_at = 0
    logger.info(f"Fetch lock manually reset (was_locked={was_locked})")
    return {"status": "ok", "was_locked": was_locked}


@router.get("/extraction-status")
def get_extraction_status():
    """
    Get current extraction pipeline status.
    
    Used by frontend to sync state on page load or after SSE disconnection.
    Returns whether extraction is in progress and current progress if so.
    """
    global _extraction_in_progress, _extraction_started_at, _extraction_progress
    
    # Auto-reset stale extraction state (e.g., after server crash)
    if _extraction_in_progress and _extraction_started_at > 0:
        elapsed = time.time() - _extraction_started_at
        if elapsed > _EXTRACTION_TIMEOUT_SECONDS:
            logger.warning(f"Resetting stale extraction state (was stuck for {elapsed:.0f}s)")
            _extraction_in_progress = False
    
    if _extraction_in_progress:
        return {
            "is_extracting": True,
            "progress": _extraction_progress,
            "started_at": datetime.fromtimestamp(_extraction_started_at).isoformat() if _extraction_started_at else None
        }
    
    return {
        "is_extracting": False,
        "progress": None,
        "started_at": None
    }


@router.get("/unprocessed-emails")
def get_unprocessed_emails(
    hours_back: int = Query(None, description="Hours back to fetch (uses settings default if not provided)")
):
    """
    Get emails from Gmail that have NOT been processed yet.
    
    Paginates through Gmail results until we accumulate `email_max_limit` unprocessed emails.
    This ensures that each batch contains new emails, and repeated calls will eventually
    exhaust all unprocessed emails in the time window.
    """
    global _fetch_in_progress, _fetch_started_at
    
    # Auto-reset stale lock (e.g., after server restart or crash)
    if _fetch_in_progress and _fetch_started_at > 0:
        elapsed = time.time() - _fetch_started_at
        if elapsed > _FETCH_TIMEOUT_SECONDS:
            logger.warning(f"Resetting stale fetch lock (was stuck for {elapsed:.0f}s)")
            _fetch_in_progress = False
    
    # Prevent concurrent fetches (causes SSL issues)
    if _fetch_in_progress:
        logger.warning("Email fetch already in progress, returning cached or empty")
        raise HTTPException(status_code=429, detail="Email fetch already in progress. Please wait.")
    
    # Use provided hours_back, or fall back to runtime setting (or config default)
    hours = hours_back if hours_back is not None else get_email_fetch_hours()
    logger.info(f"Fetching unprocessed emails from last {hours} hours (max 240)")
    
    try:
        _fetch_in_progress = True
        _fetch_started_at = time.time()
        
        gmail = get_gmail()
        qdrant = get_qdrant()
        
        # Get all processed/attempted email IDs from Qdrant upfront
        processed_ids = qdrant.get_processed_email_ids()
        logger.info(f"Found {len(processed_ids)} already processed emails")
        
        # Convert hours to days for Gmail query (minimum 1 day for Gmail API)
        days_back = max(1, hours // 24 + 1)
        
        # Build Gmail query for content-rich emails
        query_parts = [
            f"newer_than:{days_back}d",
            "category:promotions OR category:updates OR (subject:(newsletter OR webinar OR event OR course))"
        ]
        query = " ".join(query_parts)
        
        # Get the batch limit
        max_emails = get_email_max_limit()
        logger.info(f"Target batch size: {max_emails} unprocessed emails")
        
        # Paginate through Gmail results until we have enough unprocessed emails
        from datetime import datetime, timedelta
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        unprocessed = []
        total_fetched = 0
        page_token = None
        pages_fetched = 0
        max_pages = 20  # Safety limit to prevent infinite loops
        
        while len(unprocessed) < max_emails and pages_fetched < max_pages:
            # Fetch a page of message IDs
            message_list, page_token = gmail.list_messages_paginated(
                query=query,
                page_size=100,  # Fetch 100 IDs per page
                page_token=page_token
            )
            
            if not message_list:
                logger.info("No more messages from Gmail")
                break
            
            pages_fetched += 1
            total_fetched += len(message_list)
            
            # Filter out already processed emails
            unprocessed_ids = [
                msg["id"] for msg in message_list 
                if msg["id"] not in processed_ids
            ]
            
            if not unprocessed_ids:
                logger.debug(f"Page {pages_fetched}: all {len(message_list)} emails already processed")
                if page_token is None:
                    break
                continue
            
            logger.info(f"Page {pages_fetched}: {len(unprocessed_ids)}/{len(message_list)} unprocessed")
            
            # Fetch full message content for unprocessed emails
            messages = gmail.get_messages_batch(unprocessed_ids)
            
            for message in messages:
                try:
                    parsed = gmail._parse_message_to_dict(message)
                    
                    # Check if email is within time window
                    try:
                        email_date = datetime.fromisoformat(parsed.get("date", "").replace("Z", "+00:00"))
                        if email_date.replace(tzinfo=None) < cutoff_time:
                            continue
                    except:
                        pass  # Include if date parsing fails
                    
                    sender_name, sender_email = _parse_sender(parsed.get("from", ""))
                    unprocessed.append({
                        "id": parsed["id"],
                        "subject": parsed.get("subject", "No Subject"),
                        "sender": sender_name,
                        "sender_email": sender_email,
                        "received_at": parsed.get("date", ""),
                        "snippet": parsed.get("snippet", "")[:150] if parsed.get("snippet") else None,
                        "body_text": parsed.get("body_text"),
                        "body_html": parsed.get("body_html")
                    })
                    
                    # Stop if we have enough
                    if len(unprocessed) >= max_emails:
                        break
                        
                except Exception as e:
                    logger.error(f"Failed to parse message {message.get('id')}: {e}")
                    continue
            
            # Stop if no more pages
            if page_token is None:
                break
        
        # Trim to exact batch size
        unprocessed = unprocessed[:max_emails]
        
        logger.info(f"Found {len(unprocessed)} unprocessed emails (fetched {total_fetched} total across {pages_fetched} pages)")
        
        return {
            "unprocessed_count": len(unprocessed),
            "total_fetched": total_fetched,
            "processed_count": len(processed_ids),
            "hours_back": hours,
            "emails": unprocessed
        }
        
    except Exception as e:
        logger.error(f"Failed to get unprocessed emails: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        _fetch_in_progress = False


async def _extraction_stream(email_ids: List[str]) -> AsyncGenerator[str, None]:
    """
    Generator that yields SSE events during extraction pipeline.
    
    Event types:
    - start: Pipeline started
    - fetch: Fetching email
    - parse: Parsing email
    - extract: Extracting content
    - ingest: Ingesting to Qdrant
    - complete: Pipeline complete
    - error: Error occurred
    """
    global _extraction_in_progress, _extraction_started_at, _extraction_progress
    
    gmail = get_gmail()
    qdrant = get_qdrant()
    parser = get_parser()
    orchestrator = get_orchestrator()
    embedder = get_embedder()
    
    total = len(email_ids)
    results = {
        "events": 0,
        "courses": 0,
        "blogs": 0,
        "emails_processed": 0,
        "errors": []
    }
    
    # Track emails that were attempted (processed, skipped, or errored)
    # These will be marked as "attempted" to prevent re-fetching
    attempted_email_ids = []
    
    # Set global extraction state
    _extraction_in_progress = True
    _extraction_started_at = time.time()
    _extraction_progress.update({
        "current": 0,
        "total": total,
        "events": 0,
        "courses": 0,
        "blogs": 0,
        "message": f"Starting extraction for {total} emails",
        "emails_processed": 0,
        "errors": 0
    })
    
    def sse_event(event_type: str, data: dict) -> str:
        """Format SSE event."""
        return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    
    def update_progress(current: int = None, message: str = None, events: int = None, courses: int = None, blogs: int = None):
        """Update global progress state."""
        if current is not None:
            _extraction_progress["current"] = current
        if message is not None:
            _extraction_progress["message"] = message
        if events is not None:
            _extraction_progress["events"] = events
        if courses is not None:
            _extraction_progress["courses"] = courses
        if blogs is not None:
            _extraction_progress["blogs"] = blogs
        _extraction_progress["emails_processed"] = results["emails_processed"]
        _extraction_progress["errors"] = len(results["errors"])
    
    try:
        # Start event
        yield sse_event("start", {
            "total_emails": total,
            "message": f"Starting extraction for {total} emails"
        })
        
        for idx, email_id in enumerate(email_ids, 1):
            try:
                # Update global progress
                update_progress(current=idx, message=f"Fetching email {idx}/{total}")
                
                # Fetch email
                yield sse_event("fetch", {
                    "current": idx,
                    "total": total,
                    "email_id": email_id,
                    "message": f"Fetching email {idx}/{total}"
                })
                
                # Start timer for latency tracking
                email_start_time = time.time()
                
                email = gmail.get_message(email_id)
                headers = gmail.parse_message_headers(email)
                body = gmail.extract_body(email)
                
                subject = headers.get("subject", "No Subject")
                sender = headers.get("from", "Unknown")
                date = headers.get("date", "")
                
                # Parse email
                update_progress(message=f"Parsing: {subject[:40]}...")
                yield sse_event("parse", {
                    "current": idx,
                    "total": total,
                    "subject": subject[:50],
                    "message": f"Parsing: {subject[:40]}..."
                })
                
                # Get text content and images from HTML
                text_content = body.get("text") or ""
                images = []
                if body.get("html"):
                    parsed = parser.parse_html_email(body["html"])
                    if not text_content:
                        text_content = parsed.get("text", "")
                    images = parsed.get("images", [])
                
                if not text_content:
                    attempted_email_ids.append(email_id)  # Mark as attempted even if skipped
                    yield sse_event("skip", {
                        "current": idx,
                        "total": total,
                        "reason": "No text content",
                        "message": f"Skipping email {idx}: no content"
                    })
                    continue
                
                # Extract content (pass images for blog extraction)
                update_progress(message=f"Extracting content from: {subject[:40]}...")
                yield sse_event("extract", {
                    "current": idx,
                    "total": total,
                    "subject": subject[:50],
                    "message": f"Extracting content from: {subject[:40]}..."
                })
                
                extracted = await orchestrator.extract_all(text_content, subject, images)
                
                events = extracted.get("events", [])
                courses = extracted.get("courses", [])
                blogs = extracted.get("blogs", [])
                
                extracted_count = len(events) + len(courses) + len(blogs)
                
                if extracted_count == 0:
                    attempted_email_ids.append(email_id)  # Mark as attempted even if no content extracted
                    yield sse_event("skip", {
                        "current": idx,
                        "total": total,
                        "reason": "No content extracted",
                        "message": f"No extractable content in email {idx}"
                    })
                    continue
                
                # Ingest to Qdrant
                yield sse_event("ingest", {
                    "current": idx,
                    "total": total,
                    "events": len(events),
                    "courses": len(courses),
                    "blogs": len(blogs),
                    "message": f"Ingesting {extracted_count} items to Qdrant"
                })
                
                sender_name, sender_email_addr = _parse_sender(sender)
                
                # Create points for events
                if events:
                    event_points = []
                    for event in events:
                        point_id = str(uuid.uuid4())
                        vectors = embedder.create_named_vectors(
                            title=event.title,
                            description=event.description or event.title,
                            full_text=f"{event.title} {event.description or ''}"
                        )
                        
                        payload = {
                            "title": event.title,
                            "description": event.description,
                            "start_time": event.start_time,
                            "end_time": event.end_time,
                            "location": event.location,
                            "registration_link": event.registration_link,
                            "tags": event.tags,
                            "organizer": event.organizer,
                            "cost": event.cost,
                            "source_email_id": email_id,
                            "source_subject": subject,
                            "source_sender": sender_name,
                            "source_sender_email": sender_email_addr,
                            "source_received_at": date,
                            "extracted_at": datetime.now().isoformat()
                        }
                        
                        # Add sparse vector
                        sparse_text = f"{event.title} {' '.join(event.tags)}"
                        sparse_vec = create_sparse_vector(sparse_text)
                        
                        event_points.append(PointStruct(
                            id=point_id,
                            vector=vectors,
                            payload=payload
                        ))
                    
                    qdrant.upsert_by_type("events", event_points)
                    results["events"] += len(events)
                
                # Create points for courses
                if courses:
                    course_points = []
                    for course in courses:
                        point_id = str(uuid.uuid4())
                        vectors = embedder.create_named_vectors(
                            title=course.title,
                            description=course.description or course.title,
                            full_text=f"{course.title} {course.description or ''}"
                        )
                        
                        payload = {
                            "title": course.title,
                            "description": course.description,
                            "provider": course.provider,
                            "instructor": course.instructor,
                            "level": course.level.value if course.level else None,
                            "duration": course.duration,
                            "cost": course.cost,
                            "enrollment_link": course.enrollment_link,
                            "tags": course.tags,
                            "start_date": course.start_date,
                            "certificate_offered": course.certificate_offered,
                            "source_email_id": email_id,
                            "source_subject": subject,
                            "source_sender": sender_name,
                            "source_sender_email": sender_email_addr,
                            "source_received_at": date,
                            "extracted_at": datetime.now().isoformat()
                        }
                        
                        course_points.append(PointStruct(
                            id=point_id,
                            vector=vectors,
                            payload=payload
                        ))
                    
                    qdrant.upsert_by_type("courses", course_points)
                    results["courses"] += len(courses)
                
                # Create points for blogs
                if blogs:
                    blog_points = []
                    for blog in blogs:
                        point_id = str(uuid.uuid4())
                        vectors = embedder.create_named_vectors(
                            title=blog.title,
                            description=blog.description or blog.title,
                            full_text=f"{blog.title} {blog.description or ''}"
                        )
                        
                        payload = {
                            "title": blog.title,
                            "hook": blog.hook,
                            "description": blog.description,
                            "image_url": blog.image_url,
                            "author": blog.author,
                            "author_title": blog.author_title,
                            "published_date": blog.published_date,
                            "url": blog.url,
                            "category": blog.category,
                            "reading_time": blog.reading_time,
                            "tags": blog.tags,
                            "source": blog.source,
                            "key_points": blog.key_points,
                            "source_email_id": email_id,
                            "source_subject": subject,
                            "source_sender": sender_name,
                            "source_sender_email": sender_email_addr,
                            "source_received_at": date,
                            "extracted_at": datetime.now().isoformat()
                        }
                        
                        blog_points.append(PointStruct(
                            id=point_id,
                            vector=vectors,
                            payload=payload
                        ))
                    
                    qdrant.upsert_by_type("blogs", blog_points)
                    results["blogs"] += len(blogs)
                
                results["emails_processed"] += 1
                attempted_email_ids.append(email_id)  # Mark as attempted after successful processing
                
                # Record latency
                duration_ms = (time.time() - email_start_time) * 1000
                AnalyticsService.track_latency(duration_ms)
                
                # Update global progress with totals
                update_progress(
                    current=idx,
                    events=results["events"],
                    courses=results["courses"],
                    blogs=results["blogs"],
                    message=f"Processed {idx}/{total} emails"
                )
                
                # Progress event
                yield sse_event("progress", {
                    "current": idx,
                    "total": total,
                    "events_total": results["events"],
                    "courses_total": results["courses"],
                    "blogs_total": results["blogs"],
                    "message": f"Processed {idx}/{total} emails"
                })
                
                # Small delay to prevent overwhelming
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error processing email {email_id}: {e}")
                attempted_email_ids.append(email_id)  # Mark as attempted even on error
                results["errors"].append({
                    "email_id": email_id,
                    "error": str(e)
                })
                yield sse_event("error", {
                    "current": idx,
                    "total": total,
                    "email_id": email_id,
                    "error": str(e),
                    "message": f"Error processing email {idx}"
                })
        
        # Complete event
        yield sse_event("complete", {
            "emails_processed": results["emails_processed"],
            "events": results["events"],
            "courses": results["courses"],
            "blogs": results["blogs"],
            "total_extracted": results["events"] + results["courses"] + results["blogs"],
            "errors": len(results["errors"]),
            "message": "Extraction complete!"
        })
    
    finally:
        # Always reset extraction state when done
        _extraction_in_progress = False
        
        # Mark all attempted emails in Qdrant (including skipped/errored)
        # This prevents them from being re-fetched in subsequent batches
        if attempted_email_ids:
            try:
                qdrant.mark_emails_as_attempted(attempted_email_ids)
                logger.info(f"Marked {len(attempted_email_ids)} emails as attempted")
            except Exception as e:
                logger.error(f"Failed to mark emails as attempted: {e}")
        
        logger.info(f"Extraction complete: {results['emails_processed']} emails, {results['events']} events, {results['courses']} courses, {results['blogs']} blogs")


@router.post("/extract")
async def extract_emails(email_ids: List[str]):
    """
    Run extraction pipeline on specified emails with SSE progress streaming.
    
    Returns Server-Sent Events stream with progress updates.
    """
    if not email_ids:
        raise HTTPException(status_code=400, detail="No email IDs provided")
    
    logger.info(f"Starting extraction pipeline for {len(email_ids)} emails")
    
    return StreamingResponse(
        _extraction_stream(email_ids),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/settings")
async def get_pipeline_settings():
    """Get current pipeline settings including runtime overrides."""
    return {
        "email_fetch_hours_back": get_email_fetch_hours(),  # Use runtime value
        "email_max_limit": get_email_max_limit(),  # Use runtime value
        "llm_model": settings.llm_model,
        "embedding_model": settings.embedding_model_name
    }


@router.post("/settings")
async def update_pipeline_settings(
    email_max_limit: int = Query(None, ge=1, le=500, description="Maximum emails to process per batch (1-500)"),
    email_fetch_hours_back: int = Query(None, ge=1, le=240, description="Hours back to fetch emails (1-240)")
):
    """
    Update pipeline settings at runtime.
    
    These settings persist until server restart. To make permanent changes,
    update the .env file or environment variables.
    
    Args:
        email_max_limit: Maximum number of emails to fetch/process per batch (1-500)
        email_fetch_hours_back: Hours back to fetch emails for processing (1-240)
    
    Returns:
        Updated settings values
    """
    global _runtime_settings
    
    updated = []
    
    if email_max_limit is not None:
        _runtime_settings["email_max_limit"] = min(email_max_limit, 500)  # Enforce hard cap
        logger.info(f"Updated runtime email_max_limit to {_runtime_settings['email_max_limit']}")
        updated.append(f"email_max_limit={_runtime_settings['email_max_limit']}")
    
    if email_fetch_hours_back is not None:
        _runtime_settings["email_fetch_hours_back"] = min(email_fetch_hours_back, 240)  # Enforce hard cap
        logger.info(f"Updated runtime email_fetch_hours_back to {_runtime_settings['email_fetch_hours_back']}")
        updated.append(f"email_fetch_hours_back={_runtime_settings['email_fetch_hours_back']}")
    
    return {
        "status": "ok",
        "email_max_limit": get_email_max_limit(),
        "email_fetch_hours_back": get_email_fetch_hours(),
        "message": f"Settings updated: {', '.join(updated)}" if updated else "No settings changed"
    }


@router.post("/re-extract")
async def re_extract_emails(email_ids: List[str] = None):
    """
    Re-extract content from existing emails.
    
    This deletes existing extracted items for the specified emails (or all if none specified)
    and re-runs extraction with the latest extraction logic (including new fields like
    hook, image_url, author_title, key_points).
    
    Args:
        email_ids: Optional list of specific email IDs to re-extract. 
                   If not provided, re-extracts ALL processed emails.
    
    Returns:
        SSE stream with re-extraction progress.
    """
    qdrant = get_qdrant()
    
    # If no email IDs provided, get all processed email IDs
    if not email_ids:
        email_ids = list(qdrant.get_processed_email_ids())
    
    if not email_ids:
        raise HTTPException(status_code=400, detail="No emails to re-extract")
    
    logger.info(f"Starting re-extraction for {len(email_ids)} emails")
    
    # Delete existing extracted items for these emails
    deleted = qdrant.delete_by_email_ids(email_ids)
    logger.info(f"Deleted existing items: {deleted}")
    
    # Run extraction pipeline on these emails
    return StreamingResponse(
        _extraction_stream(email_ids),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/processed-emails")
async def get_processed_emails():
    """
    Get list of all processed email IDs from Qdrant.
    
    Useful for checking what's been extracted and for re-extraction.
    """
    qdrant = get_qdrant()
    email_ids = list(qdrant.get_processed_email_ids())
    
    return {
        "count": len(email_ids),
        "email_ids": email_ids
    }
