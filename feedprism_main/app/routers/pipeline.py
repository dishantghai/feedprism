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


@router.get("/unprocessed-emails")
def get_unprocessed_emails(
    hours_back: int = Query(None, description="Hours back to fetch (uses settings default if not provided)")
):
    """
    Get emails from Gmail that have NOT been processed yet.
    
    Compares Gmail emails against Qdrant to find unprocessed ones.
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
    
    hours = hours_back or settings.email_fetch_hours_back
    logger.info(f"Fetching unprocessed emails from last {hours} hours")
    
    try:
        _fetch_in_progress = True
        _fetch_started_at = time.time()
        
        gmail = get_gmail()
        qdrant = get_qdrant()
        
        # Get processed email IDs from Qdrant
        processed_ids = qdrant.get_processed_email_ids()
        
        # Fetch recent emails from Gmail
        # Convert hours to days (minimum 1 day for Gmail API)
        days_back = max(1, hours // 24 + 1)
        # Limit to 15 emails for faster response and fewer SSL issues
        raw_emails = gmail.fetch_content_rich_emails(days_back=days_back, max_results=15)
        
        # If we got some emails, continue even if there were some failures
        if not raw_emails:
            logger.warning("No emails fetched from Gmail")
            return {
                "unprocessed_count": 0,
                "total_fetched": 0,
                "processed_count": len(processed_ids),
                "hours_back": hours,
                "emails": []
            }
        
        # Filter to only unprocessed emails within the time window
        from datetime import datetime, timedelta
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        unprocessed = []
        for email in raw_emails:
            if email["id"] in processed_ids:
                continue
            
            # Check if email is within time window
            try:
                email_date = datetime.fromisoformat(email.get("date", "").replace("Z", "+00:00"))
                if email_date.replace(tzinfo=None) < cutoff_time:
                    continue
            except:
                pass  # Include if date parsing fails
            
            sender_name, sender_email = _parse_sender(email.get("from", ""))
            unprocessed.append({
                "id": email["id"],
                "subject": email.get("subject", "No Subject"),
                "sender": sender_name,
                "sender_email": sender_email,
                "received_at": email.get("date", ""),
                "snippet": email.get("snippet", "")[:150] if email.get("snippet") else None,
                "body_text": email.get("body_text"),
                "body_html": email.get("body_html")
            })
        
        logger.info(f"Found {len(unprocessed)} unprocessed emails out of {len(raw_emails)} total")
        
        return {
            "unprocessed_count": len(unprocessed),
            "total_fetched": len(raw_emails),
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
    
    def sse_event(event_type: str, data: dict) -> str:
        """Format SSE event."""
        return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    
    # Start event
    yield sse_event("start", {
        "total_emails": total,
        "message": f"Starting extraction for {total} emails"
    })
    
    for idx, email_id in enumerate(email_ids, 1):
        try:
            # Fetch email
            yield sse_event("fetch", {
                "current": idx,
                "total": total,
                "email_id": email_id,
                "message": f"Fetching email {idx}/{total}"
            })
            
            email = gmail.get_message(email_id)
            headers = gmail.parse_message_headers(email)
            body = gmail.extract_body(email)
            
            subject = headers.get("subject", "No Subject")
            sender = headers.get("from", "Unknown")
            date = headers.get("date", "")
            
            # Parse email
            yield sse_event("parse", {
                "current": idx,
                "total": total,
                "subject": subject[:50],
                "message": f"Parsing: {subject[:40]}..."
            })
            
            # Get text content
            text_content = body.get("text") or ""
            if not text_content and body.get("html"):
                parsed = parser.parse_html_email(body["html"])
                text_content = parsed.get("text", "")
            
            if not text_content:
                yield sse_event("skip", {
                    "current": idx,
                    "total": total,
                    "reason": "No text content",
                    "message": f"Skipping email {idx}: no content"
                })
                continue
            
            # Extract content
            yield sse_event("extract", {
                "current": idx,
                "total": total,
                "subject": subject[:50],
                "message": f"Extracting content from: {subject[:40]}..."
            })
            
            extracted = await orchestrator.extract_all(text_content, subject)
            
            events = extracted.get("events", [])
            courses = extracted.get("courses", [])
            blogs = extracted.get("blogs", [])
            
            extracted_count = len(events) + len(courses) + len(blogs)
            
            if extracted_count == 0:
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
                        "description": blog.description,
                        "author": blog.author,
                        "published_date": blog.published_date,
                        "url": blog.url,
                        "category": blog.category,
                        "reading_time": blog.reading_time,
                        "tags": blog.tags,
                        "source": blog.source,
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
    """Get current pipeline settings."""
    return {
        "email_fetch_hours_back": settings.email_fetch_hours_back,
        "llm_model": settings.llm_model,
        "embedding_model": settings.embedding_model_name
    }
