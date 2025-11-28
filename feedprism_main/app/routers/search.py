"""
Search Router

Endpoints for searching extracted content.
"""

from typing import List
from fastapi import APIRouter, HTTPException
from loguru import logger

from app.database.qdrant_client import QdrantService
from app.services.embedder import EmbeddingService
from app.models.api import SearchRequest, SearchResponse, FeedItem

router = APIRouter(prefix="/api/search", tags=["search"])

qdrant = QdrantService()
embedder = EmbeddingService()


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


@router.post("", response_model=SearchResponse)
async def search_items(request: SearchRequest):
    """
    Search for items using hybrid search (semantic + keyword).
    
    Supports filtering by type, tags, and date range.
    """
    logger.info(f"Searching: query='{request.query}', types={request.types}")
    
    results: List[FeedItem] = []
    
    # If no query, return recent items
    if not request.query.strip():
        # Fetch recent items from each type
        for item_type in request.types:
            content_type = f"{item_type}s"  # event -> events
            try:
                collection = qdrant.get_collection_name(content_type)
                if not collection:
                    continue
                
                batch, _ = qdrant.client.scroll(
                    collection_name=collection,
                    limit=request.limit // len(request.types),
                    with_payload=True
                )
                
                for point in batch:
                    item = _point_to_feed_item(
                        {"id": point.id, "payload": point.payload},
                        item_type
                    )
                    results.append(item)
                    
            except Exception as e:
                logger.warning(f"Error fetching {content_type}: {e}")
                continue
        
        # Sort by date
        results.sort(key=lambda x: x.extracted_at or "", reverse=True)
        
        return SearchResponse(
            results=results[:request.limit],
            total=len(results),
            query=request.query
        )
    
    # Generate query embedding
    try:
        query_embedding = embedder.embed_text(request.query)
    except Exception as e:
        logger.error(f"Embedding error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate query embedding")
    
    # Search each content type
    for item_type in request.types:
        content_type = f"{item_type}s"  # event -> events
        
        try:
            # Use hybrid search if available, otherwise semantic search
            search_results = qdrant.search(
                query_vector=query_embedding,
                content_type=content_type,
                vector_name="title",
                limit=request.limit,
                filter_dict=None  # TODO: Add tag/date filters
            )
            
            for result in search_results:
                item = _point_to_feed_item(result, item_type)
                results.append(item)
                
        except Exception as e:
            logger.warning(f"Search error for {content_type}: {e}")
            continue
    
    # Sort by score (highest first)
    results.sort(key=lambda x: x.score or 0, reverse=True)
    
    # Limit results
    results = results[:request.limit]
    
    return SearchResponse(
        results=results,
        total=len(results),
        query=request.query
    )


@router.get("/quick", response_model=SearchResponse)
async def quick_search(q: str = "", limit: int = 10):
    """
    Quick search endpoint for command palette.
    
    Simpler interface for fast searches.
    """
    request = SearchRequest(query=q, limit=limit)
    return await search_items(request)
