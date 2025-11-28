"""
Emails Router

Endpoints for raw email data (used in Prism visualization).
Fetches real emails from Gmail using OAuth token.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from app.models.api import EmailSummary, EmailDetail, PrismStats, CategoryCount
from app.database.qdrant_client import QdrantService
from app.services.gmail_client import GmailClient

router = APIRouter(prefix="/api/emails", tags=["emails"])

qdrant = QdrantService()

# Gmail client (lazy init to avoid auth errors on import)
_gmail_client: Optional[GmailClient] = None


def get_gmail_client() -> GmailClient:
    """Get or create Gmail client instance."""
    global _gmail_client
    if _gmail_client is None:
        _gmail_client = GmailClient()
    return _gmail_client


def _get_unique_emails_from_items() -> List[dict]:
    """Extract unique email metadata from all extracted items."""
    emails_map = {}
    
    for content_type in ["events", "courses", "blogs"]:
        try:
            collection = qdrant.get_collection_name(content_type)
            if not collection:
                continue
            
            offset = None
            while True:
                batch, offset = qdrant.client.scroll(
                    collection_name=collection,
                    limit=100,
                    offset=offset,
                    with_payload=True
                )
                
                for point in batch:
                    payload = point.payload
                    email_id = payload.get("source_email_id")
                    
                    if email_id and email_id not in emails_map:
                        emails_map[email_id] = {
                            "id": email_id,
                            "subject": payload.get("source_subject", "No Subject"),
                            "sender": payload.get("source_sender", "Unknown"),
                            "sender_email": payload.get("source_sender_email", ""),
                            "received_at": payload.get("source_received_at", ""),
                            "extracted_count": 0
                        }
                    
                    if email_id:
                        emails_map[email_id]["extracted_count"] += 1
                
                if offset is None:
                    break
                    
        except Exception as e:
            logger.warning(f"Error fetching from {content_type}: {e}")
            continue
    
    return list(emails_map.values())


def _parse_sender(from_header: str) -> tuple[str, str]:
    """Parse 'From' header into name and email."""
    import re
    # Pattern: "Name <email@example.com>" or just "email@example.com"
    match = re.match(r'^(.+?)\s*<(.+?)>$', from_header)
    if match:
        return match.group(1).strip().strip('"'), match.group(2).strip()
    return from_header, from_header


@router.get("/recent", response_model=List[EmailSummary])
async def get_recent_emails(
    limit: int = Query(10, ge=1, le=50, description="Number of emails to return"),
    source: str = Query("gmail", description="Source: 'gmail' for live fetch, 'processed' for Qdrant")
):
    """
    Get recent emails.
    
    - source=gmail: Fetch live from Gmail API (raw inbox)
    - source=processed: Get emails that have been processed (from Qdrant)
    
    Used for the Prism Overview visualization showing raw email feed.
    """
    logger.info(f"Fetching recent emails: limit={limit}, source={source}")
    
    if source == "gmail":
        # Fetch live from Gmail
        try:
            gmail = get_gmail_client()
            # Fetch recent emails (last 7 days, content-rich)
            raw_emails = gmail.fetch_content_rich_emails(days_back=7, max_results=limit)
            
            # Get processed email IDs from Qdrant to show extracted count
            processed_emails = {e["id"]: e["extracted_count"] for e in _get_unique_emails_from_items()}
            
            result = []
            for email in raw_emails[:limit]:
                sender_name, sender_email = _parse_sender(email.get("from", ""))
                result.append(EmailSummary(
                    id=email["id"],
                    subject=email.get("subject", "No Subject"),
                    sender=sender_name,
                    sender_email=sender_email,
                    received_at=email.get("date", ""),
                    snippet=email.get("snippet", "")[:150] if email.get("snippet") else None,
                    extracted_count=processed_emails.get(email["id"], 0)
                ))
            
            return result
            
        except Exception as e:
            logger.error(f"Gmail fetch failed: {e}")
            # Fallback to processed emails
            logger.info("Falling back to processed emails from Qdrant")
    
    # Fallback: Get from Qdrant (processed emails)
    emails = _get_unique_emails_from_items()
    emails.sort(key=lambda x: x.get("received_at", ""), reverse=True)
    emails = emails[:limit]
    
    return [
        EmailSummary(
            id=e["id"],
            subject=e["subject"],
            sender=e["sender"],
            sender_email=e["sender_email"],
            received_at=e["received_at"],
            snippet=e["subject"][:100] if e["subject"] else None,
            extracted_count=e["extracted_count"]
        )
        for e in emails
    ]


@router.get("/prism-stats", response_model=PrismStats)
async def get_prism_stats():
    """
    Get stats for the Prism Overview section.
    
    Returns recent emails (from Gmail) and category counts (from Qdrant) for the visualization.
    """
    logger.info("Fetching Prism stats")
    
    # Get recent emails from Gmail (live fetch)
    recent_emails = []
    processed_emails_map = {e["id"]: e["extracted_count"] for e in _get_unique_emails_from_items()}
    
    try:
        gmail = get_gmail_client()
        raw_emails = gmail.fetch_content_rich_emails(days_back=7, max_results=10)
        
        for email in raw_emails[:10]:
            sender_name, sender_email = _parse_sender(email.get("from", ""))
            recent_emails.append(EmailSummary(
                id=email["id"],
                subject=email.get("subject", "No Subject"),
                sender=sender_name,
                sender_email=sender_email,
                received_at=email.get("date", ""),
                snippet=email.get("snippet", "")[:150] if email.get("snippet") else None,
                extracted_count=processed_emails_map.get(email["id"], 0)
            ))
    except Exception as e:
        logger.warning(f"Gmail fetch failed, using processed emails: {e}")
        # Fallback to processed emails from Qdrant
        emails = _get_unique_emails_from_items()
        emails.sort(key=lambda x: x.get("received_at", ""), reverse=True)
        for e in emails[:10]:
            recent_emails.append(EmailSummary(
                id=e["id"],
                subject=e["subject"],
                sender=e["sender"],
                sender_email=e["sender_email"],
                received_at=e["received_at"],
                snippet=e["subject"][:100] if e["subject"] else None,
                extracted_count=e["extracted_count"]
            ))
    
    # Get category counts from Qdrant
    category_counts = []
    total_extracted = 0
    
    icon_map = {
        "events": "📅",
        "courses": "📚",
        "blogs": "📝"
    }
    
    for content_type in ["events", "courses", "blogs"]:
        try:
            info = qdrant.get_collection_info(content_type)
            count = info.get("points_count", 0)
            total_extracted += count
            
            category_counts.append(CategoryCount(
                type=content_type.rstrip("s"),  # events -> event
                count=count,
                icon=icon_map.get(content_type, "📄")
            ))
        except Exception as e:
            logger.warning(f"Error getting count for {content_type}: {e}")
            category_counts.append(CategoryCount(
                type=content_type.rstrip("s"),
                count=0,
                icon=icon_map.get(content_type, "📄")
            ))
    
    return PrismStats(
        recent_emails=recent_emails,
        category_counts=category_counts,
        total_extracted=total_extracted,
        last_sync=None  # TODO: Track last sync time
    )


@router.get("/{email_id}", response_model=EmailDetail)
async def get_email_detail(email_id: str):
    """Get detailed email information with all extracted items."""
    logger.info(f"Fetching email detail: {email_id}")
    
    email_data = None
    extracted_items = []
    
    for content_type in ["events", "courses", "blogs"]:
        try:
            collection = qdrant.get_collection_name(content_type)
            if not collection:
                continue
            
            # Search for items from this email
            offset = None
            while True:
                batch, offset = qdrant.client.scroll(
                    collection_name=collection,
                    limit=100,
                    offset=offset,
                    with_payload=True
                )
                
                for point in batch:
                    payload = point.payload
                    if payload.get("source_email_id") == email_id:
                        # Capture email metadata from first match
                        if email_data is None:
                            email_data = {
                                "id": email_id,
                                "subject": payload.get("source_subject", "No Subject"),
                                "sender": payload.get("source_sender", "Unknown"),
                                "sender_email": payload.get("source_sender_email", ""),
                                "received_at": payload.get("source_received_at", "")
                            }
                        
                        # Add extracted item
                        item_type = content_type.rstrip("s")
                        extracted_items.append({
                            "id": str(point.id),
                            "type": item_type,
                            "title": payload.get("title", "Untitled"),
                            "description": payload.get("description"),
                            "tags": payload.get("tags", []),
                            "url": payload.get("registration_link") or payload.get("enrollment_link") or payload.get("url"),
                            "extracted_at": payload.get("extracted_at")
                        })
                
                if offset is None:
                    break
                    
        except Exception as e:
            logger.warning(f"Error searching {content_type}: {e}")
            continue
    
    if email_data is None:
        raise HTTPException(status_code=404, detail="Email not found")
    
    return EmailDetail(
        id=email_data["id"],
        subject=email_data["subject"],
        sender=email_data["sender"],
        sender_email=email_data["sender_email"],
        received_at=email_data["received_at"],
        extracted_count=len(extracted_items),
        extracted_items=extracted_items
    )
