"""
Multi-Content Ingestion Script

Demonstrates complete Phase 2 pipeline:
Gmail → Parse → Orchestrate → Extract (Events, Courses, Blogs) → Embed → Store → Search

Uses ExtractionOrchestrator to process all content types in parallel.

Author: FeedPrism Team
"""
import sys
import os

# ----------------------------------------------------------------------
# Ensure the project root (the directory containing the `app` package)
# is on the Python import path, regardless of where the script is run.
# ----------------------------------------------------------------------
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import asyncio
import uuid
from datetime import datetime
from typing import List, Dict, Any

from qdrant_client.models import PointStruct
from loguru import logger

from app.services.gmail_client import GmailClient
from app.services.parser import EmailParser
from app.services.orchestrator import ExtractionOrchestrator
from app.services.embedder import EmbeddingService
from app.database.qdrant_client import QdrantService
from app.services.deduplicator import DeduplicationService


async def ingest_multi_content(
    days_back: int = 7,
    max_emails: int = 20
) -> Dict[str, Any]:
    """
    Ingest emails and extract all content types (events, courses, blogs).
    
    Args:
        days_back: How many days back to fetch emails
        max_emails: Maximum emails to process
    
    Returns:
        Dict with statistics
    """
    logger.info("=" * 70)
    logger.info("PHASE 2: MULTI-CONTENT EXTRACTION PIPELINE")
    logger.info("=" * 70)
    
    # Initialize services
    logger.info("\n📦 Initializing services...")
    gmail = GmailClient()
    parser = EmailParser()
    orchestrator = ExtractionOrchestrator()  # ← Phase 2: Use orchestrator
    embedder = EmbeddingService()
    qdrant = QdrantService()
    deduplicator = DeduplicationService()
    
    # Create collections
    qdrant.create_all_collections(recreate=False)
    
    # Fetch emails
    logger.info(f"\n📧 Fetching emails (last {days_back} days, max {max_emails})...")
    emails = gmail.fetch_content_rich_emails(
        days_back=days_back,
        max_results=max_emails
    )
    
    if not emails:
        logger.warning("No emails found")
        return {
            "emails_processed": 0,
            "events_extracted": 0,
            "courses_extracted": 0,
            "blogs_extracted": 0,
            "total_points_stored": 0
        }
    
    logger.success(f"Fetched {len(emails)} emails")
    
    # Process emails
    all_points = []
    stats = {
        "emails_processed": 0,
        "emails_failed": 0,
        "events_extracted": 0,
        "courses_extracted": 0,
        "blogs_extracted": 0,
        "total_points_stored": 0
    }
    
    extracted_at = datetime.utcnow().isoformat() + "Z"
    
    for i, email in enumerate(emails, 1):
        try:
            logger.info(f"\n[{i}/{len(emails)}] Processing: {email['subject'][:60]}...")
            
            # Parse HTML
            if not email.get('body_html'):
                logger.warning("No HTML body, skipping")
                continue
            
            parsed = parser.parse_html_email(email['body_html'])
            
            # Phase 2: Extract ALL content types using orchestrator
            result = await orchestrator.extract_all(
                parsed['text'],
                email['subject']
            )
            
            # Process EVENTS
            for event in result['events']:
                # Named vectors
                vectors = embedder.create_named_vectors(
                    title=event.title,
                    description=event.description or "",
                    full_text=f"{event.title} {event.description} {event.location}"
                )
                
                # Deduplication
                canonical_id = deduplicator.compute_canonical_id(event.title, "event")
                duplicates = deduplicator.find_duplicates(event.title, event.description or "", "events")
                
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vectors,
                    payload={
                        "content_type": "event",
                        "canonical_item_id": canonical_id,
                        "is_duplicate": len(duplicates) > 0,
                        "duplicate_count": len(duplicates),
                        "title": event.title,
                        "description": event.description,
                        "start_time": event.start_time,
                        "end_time": event.end_time,
                        "timezone": event.timezone,
                        "location": event.location,
                        "registration_link": event.registration_link,
                        "organizer": event.organizer,
                        "cost": event.cost,
                        "tags": event.tags,
                        "source_email_id": email['id'],
                        "source_subject": email['subject'],
                        "source_from": email['from'],
                        "extracted_at": extracted_at
                    }
                )
                all_points.append(point)
                stats["events_extracted"] += 1
            
            # Process COURSES
            for course in result['courses']:
                # Named vectors
                vectors = embedder.create_named_vectors(
                    title=course.title,
                    description=course.description or "",
                    full_text=f"{course.title} {course.description} {course.provider}"
                )
                
                # Deduplication
                canonical_id = deduplicator.compute_canonical_id(course.title, "course")
                duplicates = deduplicator.find_duplicates(course.title, course.description or "", "courses")
                
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vectors,
                    payload={
                        "content_type": "course",
                        "canonical_item_id": canonical_id,
                        "is_duplicate": len(duplicates) > 0,
                        "duplicate_count": len(duplicates),
                        "title": course.title,
                        "description": course.description,
                        "provider": course.provider,
                        "instructor": course.instructor,
                        "level": course.level.value if course.level else None,
                        "duration": course.duration,
                        "cost": course.cost,
                        "enrollment_link": course.enrollment_link,
                        "start_date": course.start_date,
                        "certificate_offered": course.certificate_offered,
                        "tags": course.tags,
                        "source_email_id": email['id'],
                        "source_subject": email['subject'],
                        "source_from": email['from'],
                        "extracted_at": extracted_at
                    }
                )
                all_points.append(point)
                stats["courses_extracted"] += 1
            
            # Process BLOGS
            for blog in result['blogs']:
                # Named vectors
                vectors = embedder.create_named_vectors(
                    title=blog.title,
                    description=blog.description or "",
                    full_text=f"{blog.title} {blog.description} {blog.author}"
                )
                
                # Deduplication
                canonical_id = deduplicator.compute_canonical_id(blog.title, "blog")
                duplicates = deduplicator.find_duplicates(blog.title, blog.description or "", "blogs")
                
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vectors,
                    payload={
                        "content_type": "blog",
                        "canonical_item_id": canonical_id,
                        "is_duplicate": len(duplicates) > 0,
                        "duplicate_count": len(duplicates),
                        "title": blog.title,
                        "description": blog.description,
                        "author": blog.author,
                        "published_date": blog.published_date,
                        "url": blog.url,
                        "category": blog.category,
                        "reading_time": blog.reading_time,
                        "source": blog.source,
                        "tags": blog.tags,
                        "source_email_id": email['id'],
                        "source_subject": email['subject'],
                        "source_from": email['from'],
                        "extracted_at": extracted_at
                    }
                )
                all_points.append(point)
                stats["blogs_extracted"] += 1
            
            total_items = len(result['events']) + len(result['courses']) + len(result['blogs'])
            if total_items > 0:
                logger.success(
                    f"Extracted {total_items} items: "
                    f"{len(result['events'])} events, "
                    f"{len(result['courses'])} courses, "
                    f"{len(result['blogs'])} blogs"
                )
            else:
                logger.info("No content found in this email")
            
            stats["emails_processed"] += 1
            
        except Exception as e:
            logger.error(f"Failed to process email: {e}")
            stats["emails_failed"] += 1
            continue
    
    # Store points by type
    points_by_type = {"events": [], "courses": [], "blogs": []}
    
    for point in all_points:
        ctype = point.payload.get("content_type")
        if ctype == "event":
            points_by_type["events"].append(point)
        elif ctype == "course":
            points_by_type["courses"].append(point)
        elif ctype == "blog":
            points_by_type["blogs"].append(point)
            
    if any(points_by_type.values()):
        logger.info(f"\n💾 Storing items in Qdrant...")
        
        for ctype, points in points_by_type.items():
            if points:
                qdrant.upsert_by_type(ctype, points)
                logger.success(f"Stored {len(points)} {ctype}")
                
        stats["total_points_stored"] = len(all_points)
    
    # Summary
    logger.info("\n" + "=" * 70)
    logger.info("INGESTION COMPLETE")
    logger.info("=" * 70)
    logger.info(f"Emails processed: {stats['emails_processed']}")
    logger.info(f"Emails failed: {stats['emails_failed']}")
    logger.info(f"Events extracted: {stats['events_extracted']}")
    logger.info(f"Courses extracted: {stats['courses_extracted']}")
    logger.info(f"Blogs extracted: {stats['blogs_extracted']}")
    logger.info(f"Total points stored: {stats['total_points_stored']}")
    logger.info("=" * 70)
    
    return stats


async def search_by_content_type(
    query: str,
    content_type: str,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Search for specific content type.
    
    Args:
        query: Search query
        content_type: "event", "course", or "blog"
        limit: Number of results
    
    Returns:
        List of search results
    """
    logger.info(f"\n🔍 Searching {content_type}s for: '{query}'")
    
    embedder = EmbeddingService()
    qdrant = QdrantService()
    
    query_vector = embedder.embed_text(query)
    
    # Map singular type to plural collection name
    type_map = {
        "event": "events",
        "course": "courses",
        "blog": "blogs"
    }
    collection_type = type_map.get(content_type)
    
    if not collection_type:
        logger.error(f"Invalid content type: {content_type}")
        return []

    # Phase 2: Filter by content_type
    results = qdrant.search(
        query_vector=query_vector,
        content_type=collection_type,
        limit=limit,
        filter_dict={"content_type": content_type}
    )
    
    logger.info(f"\nFound {len(results)} {content_type}(s):\n")
    for i, result in enumerate(results, 1):
        payload = result['payload']
        logger.info(f"{i}. {payload.get('title', 'N/A')}")
        logger.info(f"   Score: {result.get('score', 0):.3f}")
        
        # Show type-specific fields
        if content_type == "event":
            logger.info(f"   Location: {payload.get('location', 'N/A')}")
            logger.info(f"   Start: {payload.get('start_time', 'N/A')}")
        elif content_type == "course":
            logger.info(f"   Provider: {payload.get('provider', 'N/A')}")
            logger.info(f"   Level: {payload.get('level', 'N/A')}")
            logger.info(f"   Cost: {payload.get('cost', 'N/A')}")
        elif content_type == "blog":
            logger.info(f"   Author: {payload.get('author', 'N/A')}")
            logger.info(f"   Category: {payload.get('category', 'N/A')}")
        
        logger.info(f"   From: {payload.get('source_subject', '')[:50]}...")
        logger.info("")
    
    return results


async def main():
    """Run Phase 2 multi-content pipeline."""
    # Ingest emails
    stats = await ingest_multi_content(days_back=7, max_emails=10)
    
    if stats["total_points_stored"] > 0:
        # Demonstrate filtered searches by content type
        logger.info("\n" + "=" * 70)
        logger.info("DEMONSTRATING CONTENT-TYPE FILTERING")
        logger.info("=" * 70)
        
        # Search for events
        await search_by_content_type("AI conference workshop", "event", limit=3)
        
        # Search for courses
        await search_by_content_type("machine learning course", "course", limit=3)
        
        # Search for blogs
        await search_by_content_type("artificial intelligence article", "blog", limit=3)
        
        logger.info("=" * 70)
        logger.info("PHASE 2 PIPELINE COMPLETE! 🎉")
        logger.info("=" * 70)


if __name__ == '__main__':
    asyncio.run(main())
