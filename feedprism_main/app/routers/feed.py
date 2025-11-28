"""
Feed Router

Endpoints for listing and retrieving extracted content items.
"""

from typing import List, Literal, Optional
from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from app.database.qdrant_client import QdrantService
from app.models.api import FeedItem, FeedResponse

router = APIRouter(prefix="/api/feed", tags=["feed"])

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
        description=payload.get("description"),
        tags=payload.get("tags", []),
        url=payload.get("registration_link") or payload.get("enrollment_link") or payload.get("url"),
        start_time=payload.get("start_time"),
        location=payload.get("location"),
        organizer=payload.get("organizer"),
        provider=payload.get("provider"),
        author=payload.get("author"),
        source=payload.get("source"),
        score=point.get("score"),
        extracted_at=payload.get("extracted_at")
    )


@router.get("", response_model=FeedResponse)
async def get_feed(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    types: Optional[str] = Query(None, description="Comma-separated types: event,course,blog")
):
    """
    Get paginated feed of all extracted items.
    
    Returns items from all content types, sorted by extraction date.
    """
    logger.info(f"Fetching feed: page={page}, page_size={page_size}, types={types}")
    
    # Parse types filter
    type_list = ["events", "courses", "blogs"]
    if types:
        type_map = {"event": "events", "course": "courses", "blog": "blogs"}
        type_list = [type_map.get(t.strip(), t.strip()) for t in types.split(",")]
    
    all_items: List[FeedItem] = []
    
    # Fetch from each collection
    for content_type in type_list:
        try:
            collection = qdrant.get_collection_name(content_type)
            if not collection:
                continue
                
            # Use scroll to get all items
            offset = None
            while True:
                batch, offset = qdrant.client.scroll(
                    collection_name=collection,
                    limit=100,
                    offset=offset,
                    with_payload=True
                )
                
                # Map content_type back to singular form
                item_type = content_type.rstrip("s")  # events -> event
                
                for point in batch:
                    item = _point_to_feed_item(
                        {"id": point.id, "payload": point.payload},
                        item_type
                    )
                    all_items.append(item)
                
                if offset is None:
                    break
                    
        except Exception as e:
            logger.warning(f"Error fetching from {content_type}: {e}")
            continue
    
    # Sort by extracted_at (newest first)
    all_items.sort(
        key=lambda x: x.extracted_at or "",
        reverse=True
    )
    
    # Paginate
    total = len(all_items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = all_items[start:end]
    
    return FeedResponse(
        items=page_items,
        total=total,
        page=page,
        page_size=page_size,
        has_more=end < total
    )


@router.get("/by-type/{item_type}", response_model=FeedResponse)
async def get_feed_by_type(
    item_type: Literal["event", "course", "blog"],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Get feed items filtered by content type."""
    logger.info(f"Fetching {item_type}s: page={page}")
    
    # Map to collection name
    collection_map = {
        "event": "events",
        "course": "courses", 
        "blog": "blogs"
    }
    content_type = collection_map[item_type]
    
    items: List[FeedItem] = []
    
    try:
        collection = qdrant.get_collection_name(content_type)
        
        offset = None
        while True:
            batch, offset = qdrant.client.scroll(
                collection_name=collection,
                limit=100,
                offset=offset,
                with_payload=True
            )
            
            for point in batch:
                item = _point_to_feed_item(
                    {"id": point.id, "payload": point.payload},
                    item_type
                )
                items.append(item)
            
            if offset is None:
                break
                
    except Exception as e:
        logger.error(f"Error fetching {item_type}s: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    # Sort and paginate
    items.sort(key=lambda x: x.extracted_at or "", reverse=True)
    
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    
    return FeedResponse(
        items=items[start:end],
        total=total,
        page=page,
        page_size=page_size,
        has_more=end < total
    )


@router.get("/{item_id}", response_model=FeedItem)
async def get_feed_item(
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
