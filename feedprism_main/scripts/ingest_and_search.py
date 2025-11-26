"""
End-to-End Ingestion and Search Pipeline

Demonstrates complete Phase 1 pipeline:
Gmail → Parse → Extract → Embed → Store → Search

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
from typing import List, Dict, Any

from qdrant_client.models import PointStruct
from loguru import logger

from app.services.gmail_client import GmailClient
from app.services.parser import EmailParser
from app.services.extractor import LLMExtractor
from app.services.embedder import EmbeddingService
from app.database.qdrant_client import QdrantService


async def ingest_emails(
    days_back: int = 7,
    max_emails: int = 20
) -> Dict[str, Any]:
    """
    Ingest emails and extract events.
    
    Args:
        days_back: How many days back to fetch emails
        max_emails: Maximum emails to process
    
    Returns:
        Dict with statistics
    """
    logger.info("=" * 70)
    logger.info("PHASE 1: END-TO-END PIPELINE")
    logger.info("=" * 70)
    
    # Initialize services
    logger.info("\n📦 Initializing services...")
    gmail = GmailClient()
    parser = EmailParser()
    extractor = LLMExtractor()
    embedder = EmbeddingService()
    qdrant = QdrantService()
    
    # Create collection
    qdrant.create_collection(recreate=False)
    
    # Fetch emails
    logger.info(f"\n📧 Fetching emails (last {days_back} days, max {max_emails})...")
    emails = gmail.fetch_content_rich_emails(
        days_back=days_back,
        max_results=max_emails
    )
    
    if not emails:
        logger.warning("No emails found")
        return {"emails_processed": 0, "events_extracted": 0, "points_stored": 0}
    
    logger.success(f"Fetched {len(emails)} emails")
    
    # Process emails
    all_points = []
    stats = {
        "emails_processed": 0,
        "emails_failed": 0,
        "events_extracted": 0,
        "points_stored": 0
    }
    
    for i, email in enumerate(emails, 1):
        try:
            logger.info(f"\n[{i}/{len(emails)}] Processing: {email['subject'][:60]}...")
            
            # Parse HTML
            if not email.get('body_html'):
                logger.warning("No HTML body, skipping")
                continue
            
            parsed = parser.parse_html_email(email['body_html'])
            
            # Extract events
            result = await extractor.extract_events(
                parsed['text'],
                email['subject']
            )
            
            if not result.events:
                logger.info("No events found in this email")
                stats["emails_processed"] += 1
                continue
            
            # Create points for each event
            for event in result.events:
                text_to_embed = f"{event.title} {event.description or ''}"
                vector = embedder.embed_text(text_to_embed)
                
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "title": event.title,
                        "description": event.description,
                        "start_time": event.start_time,
                        "location": event.location,
                        "registration_link": str(event.registration_link) if event.registration_link else None,
                        "tags": event.tags,
                        "source_email_id": email['id'],
                        "source_subject": email['subject'],
                        "source_from": email['from'],
                        "type": "event"
                    }
                )
                all_points.append(point)
                stats["events_extracted"] += 1
            
            logger.success(f"Extracted {len(result.events)} events")
            stats["emails_processed"] += 1
        except Exception as e:
            logger.error(f"Failed to process email: {e}")
            stats["emails_failed"] += 1
            continue
    
    # Store all points
    if all_points:
        logger.info(f"\n💾 Storing {len(all_points)} events in Qdrant...")
        qdrant.upsert_points(all_points)
        stats["points_stored"] = len(all_points)
        logger.success(f"Stored {len(all_points)} events")
    
    # Summary
    logger.info("\n" + "=" * 70)
    logger.info("INGESTION COMPLETE")
    logger.info("=" * 70)
    logger.info(f"Emails processed: {stats['emails_processed']}")
    logger.info(f"Emails failed: {stats['emails_failed']}")
    logger.info(f"Events extracted: {stats['events_extracted']}")
    logger.info(f"Points stored: {stats['points_stored']}")
    logger.info("=" * 70)
    
    return stats


async def search_events(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search for events.
    
    Args:
        query: Search query
        limit: Number of results
    
    Returns:
        List of search results
    """
    logger.info(f"\n🔍 Searching for: '{query}'")
    
    embedder = EmbeddingService()
    qdrant = QdrantService()
    
    query_vector = embedder.embed_text(query)
    
    results = qdrant.search(
        query_vector=query_vector,
        limit=limit,
        filter_dict={"type": "event"}
    )
    
    logger.info(f"\nFound {len(results)} results:\n")
    for i, result in enumerate(results, 1):
        payload = result['payload']
        logger.info(f"{i}. {payload.get('title', 'N/A')}")
        logger.info(f"   Score: {result.get('score', 0):.3f}")
        logger.info(f"   Location: {payload.get('location', 'N/A')}")
        logger.info(f"   Start: {payload.get('start_time', 'N/A')}")
        logger.info(f"   Source: {payload.get('source_subject', '')[:50]}...")
        logger.info("")
    
    return results


async def main():
    """Run end-to-end pipeline."""
    stats = await ingest_emails(days_back=7, max_emails=10)
    
    if stats["points_stored"] > 0:
        await search_events("machine learning workshop", limit=5)
        await search_events("AI conference", limit=5)


if __name__ == '__main__':
    asyncio.run(main())
