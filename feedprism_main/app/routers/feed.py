"""
Feed Router

Endpoints for listing and retrieving extracted content items.
"""

from typing import List, Literal, Optional
from collections import defaultdict
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from app.database.qdrant_client import QdrantService
from app.models.api import FeedItem, FeedResponse

router = APIRouter(prefix="/api/feed", tags=["feed"])


class SenderInfo(BaseModel):
    """Sender information with display name and count."""
    email: str
    display_name: str
    count: int


class SendersResponse(BaseModel):
    """Response for senders endpoint."""
    senders: List[SenderInfo]
    total: int

# Initialize Qdrant service
qdrant = QdrantService()


def _point_to_feed_item(point: dict, content_type: str) -> FeedItem:
    """Convert a Qdrant point to a FeedItem."""
    payload = point.get("payload", {})
    
    return FeedItem(
        id=str(point.get("id", "")),
        email_id=payload.get("source_email_id", ""),
        email_subject=payload.get("source_subject", ""),
        sender=payload.get("source_sender", "Unknown"),
        sender_email=payload.get("source_sender_email", ""),
        received_at=payload.get("source_received_at", ""),
        item_type=content_type,
        title=payload.get("title", "Untitled"),
        hook=payload.get("hook"),
        description=payload.get("description"),
        image_url=payload.get("image_url"),
        tags=payload.get("tags", []),
        url=payload.get("registration_link") or payload.get("enrollment_link") or payload.get("url"),
        is_free=payload.get("is_free"),
        
        # Event fields
        start_time=payload.get("start_time"),
        end_time=payload.get("end_time"),
        timezone=payload.get("timezone"),
        location=payload.get("location"),
        organizer=payload.get("organizer"),
        event_type=payload.get("event_type"),
        cost=payload.get("cost"),
        
        # Course fields
        provider=payload.get("provider"),
        instructor=payload.get("instructor"),
        level=payload.get("level"),
        duration=payload.get("duration"),
        certificate_offered=payload.get("certificate_offered"),
        what_you_learn=payload.get("what_you_learn", []),
        
        # Blog fields
        author=payload.get("author"),
        author_title=payload.get("author_title"),
        source=payload.get("source"),
        category=payload.get("category"),
        reading_time=payload.get("reading_time"),
        published_date=payload.get("published_date"),
        key_points=payload.get("key_points", []),
        
        # Metadata
        score=point.get("score"),
        extracted_at=payload.get("extracted_at")
    )


@router.get("", response_model=FeedResponse)
def get_feed(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    types: Optional[str] = Query(None, description="Comma-separated types: event,course,blog"),
    senders: Optional[str] = Query(None, description="Comma-separated sender emails to filter by"),
    tags: Optional[str] = Query(None, description="Comma-separated tags to filter by")
):
    """
    Get paginated feed of all extracted items.
    
    Returns items from all content types, sorted by extraction date.
    Supports filtering by type, sender, and tags.
    """
    logger.info(f"Fetching feed: page={page}, page_size={page_size}, types={types}, senders={senders}, tags={tags}")
    
    # Parse types filter
    type_list = ["events", "courses", "blogs"]
    if types:
        type_map = {"event": "events", "course": "courses", "blog": "blogs"}
        type_list = [type_map.get(t.strip(), t.strip()) for t in types.split(",")]
    
    # Parse senders filter
    sender_list = None
    if senders:
        sender_list = [s.strip().lower() for s in senders.split(",") if s.strip()]
    
    # Parse tags filter
    tag_list = None
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()]
    
    all_items: List[FeedItem] = []
    total_count = 0
    
    # Fetch limited items from each collection (optimized)
    # We fetch more than page_size to allow for sorting across collections
    has_filters = sender_list or tag_list
    fetch_limit = page_size * 3 if has_filters else page_size * 2  # Fetch more if filtering
    
    for content_type in type_list:
        try:
            collection = qdrant.get_collection_name(content_type)
            if not collection:
                continue
            
            # Get collection info for total count (only if no sender filter)
            if not sender_list:
                try:
                    info = qdrant.client.get_collection(collection)
                    total_count += info.points_count
                except:
                    pass
                
            # Fetch only what we need (scroll once with limit)
            batch, _ = qdrant.client.scroll(
                collection_name=collection,
                limit=fetch_limit,
                offset=None,
                with_payload=True
            )
            
            # Map content_type back to singular form
            item_type = content_type.rstrip("s")  # events -> event
            
            for point in batch:
                # Apply sender filter if specified
                if sender_list:
                    sender_email = (point.payload.get("source_sender_email") or "").lower()
                    if sender_email not in sender_list:
                        continue
                
                # Apply tag filter if specified (OR logic - item must have at least one matching tag)
                if tag_list:
                    item_tags = [t.lower() for t in (point.payload.get("tags") or [])]
                    if not any(tag in item_tags for tag in tag_list):
                        continue
                
                item = _point_to_feed_item(
                    {"id": point.id, "payload": point.payload},
                    item_type
                )
                all_items.append(item)
                    
        except Exception as e:
            logger.warning(f"Error fetching from {content_type}: {e}")
            continue
    
    # Update total count if filters were applied
    if sender_list or tag_list:
        total_count = len(all_items)
    
    # Sort by extracted_at (newest first)
    all_items.sort(
        key=lambda x: x.extracted_at or "",
        reverse=True
    )
    
    # Paginate
    start = (page - 1) * page_size
    end = start + page_size
    page_items = all_items[start:end]
    
    return FeedResponse(
        items=page_items,
        total=total_count,
        page=page,
        page_size=page_size,
        has_more=len(all_items) > end
    )


@router.get("/senders", response_model=SendersResponse)
def get_senders():
    """
    Get all unique senders with their display names and item counts.
    
    Returns senders sorted by count (most items first).
    """
    logger.info("Fetching all senders")
    
    # Aggregate senders across all collections
    sender_counts: dict[str, dict] = defaultdict(lambda: {"display_name": "", "count": 0})
    
    for content_type in ["events", "courses", "blogs"]:
        try:
            collection = qdrant.get_collection_name(content_type)
            if not collection:
                continue
            
            # Scroll through all points to get sender info
            offset = None
            while True:
                batch, next_offset = qdrant.client.scroll(
                    collection_name=collection,
                    limit=100,
                    offset=offset,
                    with_payload=["source_sender", "source_sender_email"]
                )
                
                for point in batch:
                    email = point.payload.get("source_sender_email", "")
                    name = point.payload.get("source_sender", "")
                    
                    if email:
                        email_lower = email.lower()
                        sender_counts[email_lower]["count"] += 1
                        # Keep the display name (prefer non-empty)
                        if name and not sender_counts[email_lower]["display_name"]:
                            sender_counts[email_lower]["display_name"] = name
                
                if next_offset is None or len(batch) < 100:
                    break
                offset = next_offset
                    
        except Exception as e:
            logger.warning(f"Error fetching senders from {content_type}: {e}")
            continue
    
    # Convert to list and sort by count
    senders = [
        SenderInfo(
            email=email,
            display_name=data["display_name"] or _extract_name_from_email(email),
            count=data["count"]
        )
        for email, data in sender_counts.items()
    ]
    
    # Sort by count descending
    senders.sort(key=lambda x: x.count, reverse=True)
    
    return SendersResponse(
        senders=senders,
        total=len(senders)
    )


def _extract_name_from_email(email: str) -> str:
    """
    Extract a readable name from an email address.
    
    Examples:
    - "newsletter@aiweekly.co" → "Aiweekly"
    - "hello@techcrunch.com" → "Techcrunch"
    """
    if not email or "@" not in email:
        return email or "Unknown"
    
    # Get domain without TLD
    domain = email.split("@")[1].split(".")[0]
    
    # Capitalize and clean up
    return domain.replace("-", " ").replace("_", " ").title()


@router.get("/by-type/{item_type}", response_model=FeedResponse)
def get_feed_by_type(
    item_type: Literal["event", "course", "blog"],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Get feed items filtered by content type (optimized)."""
    logger.info(f"Fetching {item_type}s: page={page}")
    
    # Map to collection name
    collection_map = {
        "event": "events",
        "course": "courses", 
        "blog": "blogs"
    }
    content_type = collection_map[item_type]
    
    items: List[FeedItem] = []
    total = 0
    
    try:
        collection = qdrant.get_collection_name(content_type)
        
        # Get total count
        try:
            info = qdrant.client.get_collection(collection)
            total = info.points_count
        except:
            pass
        
        # Fetch only what we need for this page
        fetch_limit = page_size * 2
        batch, _ = qdrant.client.scroll(
            collection_name=collection,
            limit=fetch_limit,
            offset=None,
            with_payload=True
        )
        
        for point in batch:
            item = _point_to_feed_item(
                {"id": point.id, "payload": point.payload},
                item_type
            )
            items.append(item)
                
    except Exception as e:
        logger.error(f"Error fetching {item_type}s: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    # Sort and paginate
    items.sort(key=lambda x: x.extracted_at or "", reverse=True)
    
    start = (page - 1) * page_size
    end = start + page_size
    
    return FeedResponse(
        items=items[start:end],
        total=total,
        page=page,
        page_size=page_size,
        has_more=len(items) > end
    )


@router.get("/{item_id}", response_model=FeedItem)
def get_feed_item(
    item_id: str,
    item_type: Literal["event", "course", "blog"] = Query(..., description="Type of item")
):
    """Get a single feed item by ID."""
    logger.info(f"Fetching item: {item_id} (type={item_type})")
    
    collection_map = {
        "event": "events",
        "course": "courses",
        "blog": "blogs"
    }
    content_type = collection_map[item_type]
    
    point = qdrant.get_point(item_id, content_type)
    
    if not point:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return _point_to_feed_item(point, item_type)
