"""
Lamatic Bridge Router

Minimal router to receive forwarded emails from the Lamatic Bridge service.
Processes emails through the existing extraction pipeline.
"""

import uuid
import time
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger
from qdrant_client.models import PointStruct

from app.database.qdrant_client import QdrantService
from app.services.gmail_client import GmailClient
from app.services.parser import EmailParser
from app.services.orchestrator import ExtractionOrchestrator
from app.services.embedder import EmbeddingService
from app.services.analytics import AnalyticsService
from app.utils.sparse_vector import create_sparse_vector

router = APIRouter(prefix="/api/lamatic", tags=["lamatic"])

# Lazy-initialized services
_qdrant = None
_gmail = None
_parser = None
_orchestrator = None
_embedder = None


def get_qdrant() -> QdrantService:
    global _qdrant
    if _qdrant is None:
        _qdrant = QdrantService()
        _qdrant.create_all_collections()
    return _qdrant


def get_gmail() -> GmailClient:
    global _gmail
    if _gmail is None:
        _gmail = GmailClient()
    return _gmail


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


class LamaticEmailPayload(BaseModel):
    """Email payload from Lamatic Bridge."""
    email_id: str
    subject: Optional[str] = None
    sender: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    received_at: Optional[str] = None


def _parse_sender(from_header: str) -> tuple:
    """Parse 'From' header into name and email."""
    import re
    if not from_header:
        return "Unknown", "unknown@unknown.com"
    match = re.match(r'^(.+?)\s*<(.+?)>$', from_header)
    if match:
        return match.group(1).strip().strip('"'), match.group(2).strip()
    return from_header, from_header


@router.post("/bridge")
async def process_lamatic_email(payload: LamaticEmailPayload):
    """
    Process an email forwarded from the Lamatic Bridge.
    
    This endpoint:
    1. Parses the email content
    2. Extracts events, courses, and blogs using LLM
    3. Stores results in Qdrant
    4. Returns extraction summary
    """
    email_id = payload.email_id
    logger.info(f"Processing Lamatic email: {email_id}")
    
    start_time = time.time()
    
    try:
        qdrant = get_qdrant()
        parser = get_parser()
        orchestrator = get_orchestrator()
        embedder = get_embedder()
        
        # Check idempotency
        if qdrant.is_email_processed(email_id):
            logger.info(f"Email {email_id} already processed")
            return {
                "status": "skipped",
                "reason": "already_processed",
                "email_id": email_id
            }
        
        # Get text content
        text_content = payload.body_text or ""
        images = []
        
        if payload.body_html:
            parsed = parser.parse_html_email(payload.body_html)
            if not text_content:
                text_content = parsed.get("text", "")
            images = parsed.get("images", [])
        
        if not text_content:
            logger.warning(f"No text content in email {email_id}")
            return {
                "status": "skipped",
                "reason": "no_content",
                "email_id": email_id
            }
        
        subject = payload.subject or "No Subject"
        sender = payload.sender or "Unknown"
        sender_name, sender_email = _parse_sender(sender)
        
        # Extract content using LLM
        logger.info(f"Extracting content from: {subject[:50]}...")
        extracted = await orchestrator.extract_all(text_content, subject, images)
        
        events = extracted.get("events", [])
        courses = extracted.get("courses", [])
        blogs = extracted.get("blogs", [])
        
        total_extracted = len(events) + len(courses) + len(blogs)
        
        if total_extracted == 0:
            logger.info(f"No extractable content in email {email_id}")
            return {
                "status": "processed",
                "email_id": email_id,
                "extracted": {
                    "events": 0,
                    "courses": 0,
                    "blogs": 0,
                    "total": 0
                }
            }
        
        # Store in Qdrant
        results = {"events": 0, "courses": 0, "blogs": 0}
        
        # Events
        if events:
            event_points = []
            for event in events:
                point_id = str(uuid.uuid4())
                vectors = embedder.create_named_vectors(
                    title=event.title,
                    description=event.description or event.title,
                    full_text=f"{event.title} {event.description or ''}"
                )
                
                payload_data = {
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
                    "source_sender_email": sender_email,
                    "source_received_at": payload.received_at,
                    "extracted_at": datetime.now().isoformat(),
                    "source": "lamatic"
                }
                
                event_points.append(PointStruct(
                    id=point_id,
                    vector=vectors,
                    payload=payload_data
                ))
            
            qdrant.upsert_by_type("events", event_points)
            results["events"] = len(events)
        
        # Courses
        if courses:
            course_points = []
            for course in courses:
                point_id = str(uuid.uuid4())
                vectors = embedder.create_named_vectors(
                    title=course.title,
                    description=course.description or course.title,
                    full_text=f"{course.title} {course.description or ''}"
                )
                
                payload_data = {
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
                    "source_sender_email": sender_email,
                    "source_received_at": payload.received_at,
                    "extracted_at": datetime.now().isoformat(),
                    "source": "lamatic"
                }
                
                course_points.append(PointStruct(
                    id=point_id,
                    vector=vectors,
                    payload=payload_data
                ))
            
            qdrant.upsert_by_type("courses", course_points)
            results["courses"] = len(courses)
        
        # Blogs
        if blogs:
            blog_points = []
            for blog in blogs:
                point_id = str(uuid.uuid4())
                vectors = embedder.create_named_vectors(
                    title=blog.title,
                    description=blog.description or blog.title,
                    full_text=f"{blog.title} {blog.description or ''}"
                )
                
                payload_data = {
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
                    "source_sender_email": sender_email,
                    "source_received_at": payload.received_at,
                    "extracted_at": datetime.now().isoformat(),
                    "ingestion_source": "lamatic"
                }
                
                blog_points.append(PointStruct(
                    id=point_id,
                    vector=vectors,
                    payload=payload_data
                ))
            
            qdrant.upsert_by_type("blogs", blog_points)
            results["blogs"] = len(blogs)
        
        # Track latency
        duration_ms = (time.time() - start_time) * 1000
        AnalyticsService.track_latency(duration_ms)
        
        logger.success(f"Processed email {email_id}: {results}")
        
        return {
            "status": "processed",
            "email_id": email_id,
            "extracted": {
                "events": results["events"],
                "courses": results["courses"],
                "blogs": results["blogs"],
                "total": sum(results.values())
            },
            "processing_time_ms": round(duration_ms, 2)
        }
        
    except Exception as e:
        logger.exception(f"Error processing Lamatic email {email_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def lamatic_status():
    """Check Lamatic integration status."""
    qdrant = get_qdrant()
    
    # Count items ingested via Lamatic
    lamatic_count = 0
    for content_type in ["events", "courses", "blogs"]:
        try:
            collection = qdrant.get_collection_name(content_type)
            if collection and qdrant.client.collection_exists(collection):
                # This is a rough count - proper implementation would filter by source
                info = qdrant.get_collection_info(content_type)
                lamatic_count += info.get("points_count", 0)
        except Exception:
            pass
    
    return {
        "status": "active",
        "endpoint": "/api/lamatic/bridge",
        "qdrant_connected": True,
        "total_items_in_qdrant": lamatic_count
    }
