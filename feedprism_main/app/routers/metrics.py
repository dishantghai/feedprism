"""
Metrics Router

Endpoints for dashboard metrics and analytics.
"""

from datetime import datetime
from fastapi import APIRouter, Query
from loguru import logger

from app.database.qdrant_client import QdrantService
from app.services.analytics import AnalyticsService
from app.models.api import MetricsResponse, CategoryCount

router = APIRouter(prefix="/api/metrics", tags=["metrics"])

qdrant = QdrantService()
analytics = AnalyticsService()


@router.get("", response_model=MetricsResponse)
async def get_metrics(days: int = Query(30, ge=1, le=365)):
    """
    Get dashboard metrics.
    
    Returns extraction stats, category counts, and quality metrics.
    """
    logger.info(f"Fetching metrics for last {days} days")
    
    # Get analytics from existing service
    try:
        stats = analytics.get_email_stats(days)
    except Exception as e:
        logger.warning(f"Analytics error: {e}")
        stats = {
            "total_items": 0,
            "by_type": {},
            "top_tags": {}
        }
    
    # Get category counts
    category_counts = []
    total_items = 0
    
    icon_map = {
        "events": "📅",
        "courses": "📚", 
        "blogs": "📝"
    }
    
    for content_type in ["events", "courses", "blogs"]:
        try:
            info = qdrant.get_collection_info(content_type)
            count = info.get("points_count", 0)
            total_items += count
            
            category_counts.append(CategoryCount(
                type=content_type.rstrip("s"),
                count=count,
                icon=icon_map.get(content_type, "📄")
            ))
        except Exception as e:
            logger.warning(f"Error getting {content_type} count: {e}")
            category_counts.append(CategoryCount(
                type=content_type.rstrip("s"),
                count=0,
                icon=icon_map.get(content_type, "📄")
            ))
    
    # Count unique emails
    unique_emails = set()
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
                    with_payload=["source_email_id"]
                )
                
                for point in batch:
                    email_id = point.payload.get("source_email_id")
                    if email_id:
                        unique_emails.add(email_id)
                
                if offset is None:
                    break
        except Exception:
            continue
    
    return MetricsResponse(
        total_emails_processed=len(unique_emails),
        total_items_extracted=total_items,
        categories=category_counts,
        top_tags=stats.get("top_tags", {}),
        last_sync=datetime.now().isoformat(),
        # Quality metrics (placeholder values for demo)
        precision=0.92,
        mrr=0.85,
        avg_latency_ms=145.0,
        dedup_rate=0.23
    )


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    
    # Check Qdrant connection
    qdrant_ok = False
    try:
        for content_type in ["events", "courses", "blogs"]:
            info = qdrant.get_collection_info(content_type)
            if info:
                qdrant_ok = True
                break
    except Exception:
        pass
    
    return {
        "status": "healthy" if qdrant_ok else "degraded",
        "qdrant": "connected" if qdrant_ok else "disconnected",
        "timestamp": datetime.now().isoformat()
    }
