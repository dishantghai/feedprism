<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# FEEDPRISM IMPLEMENTATION GUIDE (CONTINUED)

## 6. DAY 4: ENHANCED SEARCH, FILTERING \& TIME-AWARENESS

**Goal:** Implement advanced search features including time-aware filtering (upcoming/past events), actionable items prioritization, and comprehensive email tagging system.

**Estimated Time:** 6-8 hours

### 6.1 Time-Aware Search (Theory)

**Why Time-Awareness Matters:**

Users typically want different things based on temporal context:

- **"Upcoming events"** → Future events only (after today)
- **"Past workshops"** → Historical events (before today)
- **"This week"** → Events in next 7 days
- **"This month"** → Events in current month

**Implementation Strategy:**

```python
# Date filtering logic
today = datetime.now().date()

# Upcoming (future events)
filter = {"gte": today.isoformat()}

# Past (historical events)
filter = {"lte": today.isoformat()}

# This week
week_end = today + timedelta(days=7)
filter = {"gte": today.isoformat(), "lte": week_end.isoformat()}
```

**Qdrant Date Filtering:**

Qdrant supports range queries on payload fields:

```python
FieldCondition(
    key="entity.start_date",
    range=Range(
        gte="2025-11-24",  # Greater than or equal
        lte="2025-12-31"   # Less than or equal
    )
)
```


### 6.2 Enhanced Search Service

**Create `app/services/search.py`:**

```python
"""
Enhanced Search Service

This module provides high-level search functionality with:
- Natural language query understanding
- Time-aware filtering (upcoming, past, date ranges)
- Smart entity type inference
- Result ranking and deduplication
- Query expansion

Author: FeedPrism Team
Date: Nov 2025
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum

from loguru import logger

from app.database.qdrant_client import QdrantClient


class TimeFilter(str, Enum):
    """Temporal filter options."""
    UPCOMING = "upcoming"      # Future events
    PAST = "past"              # Historical events
    THIS_WEEK = "this_week"    # Next 7 days
    THIS_MONTH = "this_month"  # Current month
    NEXT_MONTH = "next_month"  # Next month
    CUSTOM = "custom"          # Custom date range


class SearchService:
    """
    High-level search service with intelligent query processing.
    
    Features:
    - Natural language query parsing
    - Time-aware filtering
    - Entity type inference
    - Result ranking
    - Deduplication
    
    Attributes:
        qdrant_client: Qdrant vector database client
    """
    
    def __init__(self):
        """Initialize search service."""
        self.qdrant_client = QdrantClient()
        logger.info("Search service initialized")
    
    def search(
        self,
        query: str,
        time_filter: Optional[TimeFilter] = None,
        custom_date_range: Optional[Dict[str, str]] = None,
        entity_types: Optional[List[str]] = None,
        limit: int = 10,
        deduplicate: bool = True
    ) -> Dict[str, Any]:
        """
        Perform intelligent search with automatic query enhancement.
        
        Args:
            query: Natural language search query
            time_filter: Temporal filter (upcoming, past, this_week, etc.)
            custom_date_range: Custom date range ({"gte": "2025-11-24", "lte": "2025-12-31"})
            entity_types: Filter by entity types (auto-inferred if None)
            limit: Maximum results
            deduplicate: Remove duplicate/similar results
        
        Returns:
            Dict with search results and metadata
        
        Example:
            >>> service = SearchService()
            >>> results = service.search(
            ...     query="upcoming AI workshops in India",
            ...     time_filter=TimeFilter.UPCOMING,
            ...     limit=10
            ... )
        """
        logger.info(f"Search query: '{query}'")
        
        # Parse query for entity type hints
        if entity_types is None:
            entity_types = self._infer_entity_types(query)
            logger.debug(f"Inferred entity types: {entity_types}")
        
        # Build date filter
        date_filter = None
        if time_filter:
            date_filter = self._build_date_filter(time_filter)
            logger.debug(f"Date filter: {date_filter}")
        elif custom_date_range:
            date_filter = custom_date_range
        
        # Perform search
        results = self.qdrant_client.hybrid_search(
            query=query,
            entity_types=entity_types,
            limit=limit * 2 if deduplicate else limit,  # Get more for dedup
            date_filter=date_filter
        )
        
        # Deduplicate if requested
        if deduplicate and len(results) > 1:
            results = self._deduplicate_results(results)
        
        # Limit final results
        results = results[:limit]
        
        # Add metadata
        return {
            "query": query,
            "time_filter": time_filter.value if time_filter else None,
            "entity_types": entity_types,
            "total_results": len(results),
            "results": results,
            "search_metadata": {
                "date_filter_applied": date_filter is not None,
                "deduplication_applied": deduplicate
            }
        }
    
    def search_upcoming_events(
        self,
        query: str,
        days_ahead: int = 30,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for upcoming events (convenience method).
        
        Args:
            query: Search query
            days_ahead: Look ahead N days (default: 30)
            limit: Max results
        
        Returns:
            List of upcoming events sorted by date
        """
        today = datetime.now().date()
        future_date = today + timedelta(days=days_ahead)
        
        results = self.qdrant_client.hybrid_search(
            query=query,
            entity_types=["event"],
            limit=limit,
            date_filter={
                "gte": today.isoformat(),
                "lte": future_date.isoformat()
            }
        )
        
        # Sort by start_date (ascending - soonest first)
        sorted_results = sorted(
            results,
            key=lambda x: x['entity'].get('start_date', '9999-99-99')
        )
        
        return sorted_results
    
    def search_past_events(
        self,
        query: str,
        days_back: int = 90,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for past events (convenience method).
        
        Args:
            query: Search query
            days_back: Look back N days (default: 90)
            limit: Max results
        
        Returns:
            List of past events sorted by date (most recent first)
        """
        today = datetime.now().date()
        past_date = today - timedelta(days=days_back)
        
        results = self.qdrant_client.hybrid_search(
            query=query,
            entity_types=["event"],
            limit=limit,
            date_filter={
                "gte": past_date.isoformat(),
                "lte": today.isoformat()
            }
        )
        
        # Sort by start_date (descending - most recent first)
        sorted_results = sorted(
            results,
            key=lambda x: x['entity'].get('start_date', '0000-00-00'),
            reverse=True
        )
        
        return sorted_results
    
    def search_by_tags(
        self,
        tags: List[str],
        entity_types: Optional[List[str]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search by exact tag matches.
        
        Args:
            tags: List of tags to match
            entity_types: Filter by types
            limit: Max results
        
        Returns:
            List of entities with matching tags
        """
        # Build query from tags
        query = " ".join(tags)
        
        results = self.qdrant_client.hybrid_search(
            query=query,
            entity_types=entity_types,
            limit=limit,
            tag_filter=tags
        )
        
        return results
    
    def get_actionable_items(
        self,
        priority: Optional[str] = None,
        with_deadline: bool = False,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get actionable items from indexed emails.
        
        Args:
            priority: Filter by priority ("high", "medium", "low")
            with_deadline: Only return items with deadlines
            limit: Max results
        
        Returns:
            List of actionable items sorted by priority and deadline
        
        Note:
            This requires actionable items to be indexed separately.
            For MVP, we'll extract from indexed entity payloads.
        """
        # Search for all entities with actionable_items in payload
        # This is a simplified version - in production, index actionable items separately
        
        query = "register enroll apply rsvp download"  # Common action verbs
        
        results = self.qdrant_client.hybrid_search(
            query=query,
            entity_types=["event", "course"],  # Events and courses often have actions
            limit=limit * 2
        )
        
        # Extract actionable items from payloads
        # (This assumes original extraction included actionable_items)
        actionable_items = []
        
        for result in results:
            entity = result['entity']
            
            # Check for registration links/deadlines
            if entity.get('registration_link') or entity.get('registration_deadline'):
                item = {
                    "action": f"Register for {entity.get('title', 'event')}",
                    "deadline": entity.get('registration_deadline'),
                    "link": entity.get('registration_link'),
                    "priority": self._infer_priority(entity),
                    "entity": entity,
                    "entity_type": result['entity_type']
                }
                actionable_items.append(item)
        
        # Filter by priority if specified
        if priority:
            actionable_items = [
                item for item in actionable_items
                if item['priority'].lower() == priority.lower()
            ]
        
        # Filter by deadline if specified
        if with_deadline:
            actionable_items = [
                item for item in actionable_items
                if item['deadline'] is not None
            ]
        
        # Sort by priority (high > medium > low) then deadline (soonest first)
        priority_order = {"high": 0, "medium": 1, "low": 2}
        
        sorted_items = sorted(
            actionable_items,
            key=lambda x: (
                priority_order.get(x['priority'].lower(), 3),
                x.get('deadline', '9999-99-99')
            )
        )
        
        return sorted_items[:limit]
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _infer_entity_types(self, query: str) -> Optional[List[str]]:
        """
        Infer entity types from query keywords.
        
        Args:
            query: Search query
        
        Returns:
            List of inferred entity types or None (search all)
        """
        query_lower = query.lower()
        
        # Event keywords
        event_keywords = [
            'event', 'workshop', 'webinar', 'conference', 'meetup',
            'seminar', 'talk', 'session', 'hackathon', 'upcoming'
        ]
        
        # Course keywords
        course_keywords = [
            'course', 'class', 'training', 'bootcamp', 'certification',
            'learn', 'tutorial', 'lesson'
        ]
        
        # Blog keywords
        blog_keywords = [
            'blog', 'article', 'post', 'read', 'story'
        ]
        
        # Check for matches
        has_event = any(kw in query_lower for kw in event_keywords)
        has_course = any(kw in query_lower for kw in course_keywords)
        has_blog = any(kw in query_lower for kw in blog_keywords)
        
        # Build list
        types = []
        if has_event:
            types.append("event")
        if has_course:
            types.append("course")
        if has_blog:
            types.append("blog")
        
        # Return None if no specific type inferred (search all)
        return types if types else None
    
    def _build_date_filter(self, time_filter: TimeFilter) -> Dict[str, str]:
        """
        Build date filter dict from TimeFilter enum.
        
        Args:
            time_filter: TimeFilter enum value
        
        Returns:
            Date filter dict with "gte" and/or "lte" keys
        """
        today = datetime.now().date()
        
        if time_filter == TimeFilter.UPCOMING:
            return {"gte": today.isoformat()}
        
        elif time_filter == TimeFilter.PAST:
            return {"lte": today.isoformat()}
        
        elif time_filter == TimeFilter.THIS_WEEK:
            week_end = today + timedelta(days=7)
            return {
                "gte": today.isoformat(),
                "lte": week_end.isoformat()
            }
        
        elif time_filter == TimeFilter.THIS_MONTH:
            # Last day of current month
            next_month = today.replace(day=28) + timedelta(days=4)
            month_end = next_month - timedelta(days=next_month.day)
            return {
                "gte": today.isoformat(),
                "lte": month_end.isoformat()
            }
        
        elif time_filter == TimeFilter.NEXT_MONTH:
            # First day of next month
            next_month_start = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
            # Last day of next month
            next_month_end = (next_month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            return {
                "gte": next_month_start.isoformat(),
                "lte": next_month_end.isoformat()
            }
        
        return {}
    
    def _infer_priority(self, entity: Dict[str, Any]) -> str:
        """
        Infer priority from entity data.
        
        Args:
            entity: Entity dict
        
        Returns:
            Priority string ("high", "medium", "low")
        """
        # Check for deadline urgency
        deadline = entity.get('registration_deadline') or entity.get('enrollment_deadline')
        
        if deadline:
            try:
                deadline_date = datetime.fromisoformat(deadline.replace('Z', '+00:00')).date()
                days_until = (deadline_date - datetime.now().date()).days
                
                if days_until <= 3:
                    return "high"
                elif days_until <= 7:
                    return "medium"
            except Exception:
                pass
        
        # Check for cost (free events are higher priority for users)
        cost = entity.get('cost', '').lower()
        if 'free' in cost:
            return "medium"
        
        # Default
        return "low"
    
    def _deduplicate_results(
        self,
        results: List[Dict[str, Any]],
        similarity_threshold: float = 0.9
    ) -> List[Dict[str, Any]]:
        """
        Remove duplicate or highly similar results.
        
        Args:
            results: List of search results
            similarity_threshold: Title similarity threshold (0-1)
        
        Returns:
            Deduplicated results
        
        Strategy:
            - Compare entity titles
            - If similarity > threshold, keep only highest-scoring result
        """
        if not results:
            return results
        
        # Simple deduplication based on exact title match
        # For production, use Levenshtein distance or embedding similarity
        
        seen_titles = set()
        unique_results = []
        
        for result in results:
            entity = result['entity']
            title = entity.get('title', '').lower().strip()
            
            if title and title not in seen_titles:
                seen_titles.add(title)
                unique_results.append(result)
        
        removed_count = len(results) - len(unique_results)
        if removed_count > 0:
            logger.debug(f"Removed {removed_count} duplicate results")
        
        return unique_results


# Test search service
if __name__ == '__main__':
    service = SearchService()
    
    print("=" * 60)
    print("Search Service Test")
    print("=" * 60)
    
    # Test 1: Upcoming events
    print("\n1. Upcoming AI events:")
    results = service.search_upcoming_events(
        query="AI machine learning",
        days_ahead=30,
        limit=5
    )
    
    for i, result in enumerate(results, 1):
        entity = result['entity']
        print(f"  {i}. {entity.get('title')} - {entity.get('start_date')}")
    
    # Test 2: Past events
    print("\n2. Past workshops:")
    results = service.search_past_events(
        query="workshop",
        days_back=90,
        limit=5
    )
    
    for i, result in enumerate(results, 1):
        entity = result['entity']
        print(f"  {i}. {entity.get('title')} - {entity.get('start_date')}")
    
    # Test 3: Actionable items
    print("\n3. High-priority actionable items:")
    items = service.get_actionable_items(
        priority="high",
        limit=5
    )
    
    for i, item in enumerate(items, 1):
        print(f"  {i}. {item['action']} - Deadline: {item.get('deadline', 'None')}")
```


### 6.3 FastAPI Backend Implementation

**Create `app/main.py`:**

```python
"""
FeedPrism FastAPI Backend

Main application with REST API endpoints for:
- Email ingestion
- Content search (hybrid, time-aware)
- Metrics and evaluation
- Health checks

Author: FeedPrism Team
Date: Nov 2025
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
from datetime import datetime

from loguru import logger

from app.config import settings
from app.models.search import SearchRequest, SearchResponse
from app.services.search import SearchService, TimeFilter
from app.services.gmail_client import GmailClient
from app.services.parser import EmailParser
from app.services.extractor import LLMExtractor
from app.database.qdrant_client import QdrantClient


# Initialize FastAPI app
app = FastAPI(
    title="FeedPrism API",
    description="Intelligent email knowledge extraction and search system",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware (allow frontend access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (frontend)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Initialize services
search_service = SearchService()
gmail_client = None  # Lazy initialization
email_parser = None
llm_extractor = None
qdrant_client = None


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "FeedPrism API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "docs": "/api/docs",
            "search": "/api/search",
            "upcoming": "/api/search/upcoming",
            "actions": "/api/actionable-items",
            "ingest": "/api/ingest",
            "stats": "/api/stats"
        }
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Check Qdrant connection
        client = QdrantClient()
        stats = client.get_collection_stats()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "qdrant": "connected",
                "collection_points": stats.get('points_count', 0)
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")


# ============================================================================
# SEARCH ENDPOINTS
# ============================================================================

@app.post("/api/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Hybrid search endpoint with time-aware filtering.
    
    Request body:
        {
            "query": "upcoming AI workshops",
            "time_filter": "upcoming",  # optional
            "entity_types": ["event"],  # optional
            "limit": 10
        }
    
    Response:
        {
            "query": "upcoming AI workshops",
            "total_results": 5,
            "results": [...]
        }
    """
    try:
        # Parse time filter
        time_filter = None
        if request.time_filter:
            try:
                time_filter = TimeFilter(request.time_filter)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid time_filter: {request.time_filter}"
                )
        
        # Perform search
        results = search_service.search(
            query=request.query,
            time_filter=time_filter,
            entity_types=request.entity_types,
            limit=request.limit
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search/upcoming")
async def search_upcoming(
    query: str = Query(..., description="Search query"),
    days: int = Query(30, description="Days ahead to search"),
    limit: int = Query(10, description="Max results")
):
    """
    Search upcoming events (convenience endpoint).
    
    Example: GET /api/search/upcoming?query=AI%20workshop&days=14&limit=5
    """
    try:
        results = search_service.search_upcoming_events(
            query=query,
            days_ahead=days,
            limit=limit
        )
        
        return {
            "query": query,
            "days_ahead": days,
            "total_results": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Upcoming search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search/past")
async def search_past(
    query: str = Query(..., description="Search query"),
    days: int = Query(90, description="Days back to search"),
    limit: int = Query(10, description="Max results")
):
    """Search past events."""
    try:
        results = search_service.search_past_events(
            query=query,
            days_back=days,
            limit=limit
        )
        
        return {
            "query": query,
            "days_back": days,
            "total_results": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Past search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search/tags")
async def search_by_tags(
    tags: List[str] = Query(..., description="Tags to search"),
    entity_types: Optional[List[str]] = Query(None, description="Entity types"),
    limit: int = Query(10, description="Max results")
):
    """
    Search by tags.
    
    Example: GET /api/search/tags?tags=AI&tags=Python&limit=5
    """
    try:
        results = search_service.search_by_tags(
            tags=tags,
            entity_types=entity_types,
            limit=limit
        )
        
        return {
            "tags": tags,
            "entity_types": entity_types,
            "total_results": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Tag search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ACTIONABLE ITEMS
# ============================================================================

@app.get("/api/actionable-items")
async def get_actionable_items(
    priority: Optional[str] = Query(None, description="Filter by priority"),
    with_deadline: bool = Query(False, description="Only items with deadlines"),
    limit: int = Query(20, description="Max results")
):
    """
    Get actionable items sorted by priority and deadline.
    
    Example: GET /api/actionable-items?priority=high&with_deadline=true
    """
    try:
        items = search_service.get_actionable_items(
            priority=priority,
            with_deadline=with_deadline,
            limit=limit
        )
        
        return {
            "total_items": len(items),
            "priority_filter": priority,
            "deadline_filter": with_deadline,
            "items": items
        }
        
    except Exception as e:
        logger.error(f"Actionable items fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# INGESTION (Manual Trigger)
# ============================================================================

@app.post("/api/ingest")
async def trigger_ingestion(
    days_back: int = Query(7, description="Days to look back"),
    max_emails: int = Query(50, description="Max emails to fetch")
):
    """
    Manually trigger email ingestion and extraction.
    
    This endpoint:
    1. Fetches emails from Gmail
    2. Parses HTML content
    3. Extracts entities with LLM
    4. Indexes in Qdrant
    
    Note: This is a long-running operation (may take 1-2 minutes).
    """
    global gmail_client, email_parser, llm_extractor, qdrant_client
    
    try:
        logger.info(f"Starting ingestion: {days_back} days, max {max_emails}")
        
        # Initialize services if needed
        if gmail_client is None:
            gmail_client = GmailClient()
            email_parser = EmailParser()
            llm_extractor = LLMExtractor()
            qdrant_client = QdrantClient()
        
        # Fetch emails
        logger.info("Fetching emails from Gmail...")
        emails = gmail_client.fetch_content_rich_emails(
            days_back=days_back,
            max_results=max_emails
        )
        
        if not emails:
            return {
                "status": "success",
                "message": "No new emails found",
                "emails_fetched": 0
            }
        
        # Parse HTML
        logger.info(f"Parsing {len(emails)} emails...")
        for email in emails:
            if email.get('body_html'):
                parsed = email_parser.parse_html_email(email['body_html'])
                email['parsed_text'] = parsed['text']
        
        # Extract entities (async batch)
        logger.info("Extracting entities with LLM...")
        import asyncio
        extractions = await llm_extractor.extract_batch(emails, max_concurrent=3)
        
        # Index in Qdrant
        logger.info("Indexing in Qdrant...")
        all_events = []
        all_courses = []
        all_blogs = []
        
        for extraction in extractions:
            for event in extraction.events:
                event_dict = event.model_dump()
                event_dict['email_id'] = extraction.email_id
                all_events.append(event_dict)
            
            for course in extraction.courses:
                course_dict = course.model_dump()
                course_dict['email_id'] = extraction.email_id
                all_courses.append(course_dict)
            
            for blog in extraction.blogs:
                blog_dict = blog.model_dump()
                blog_dict['email_id'] = extraction.email_id
                all_blogs.append(blog_dict)
        
        indexed_events = qdrant_client.index_entities(all_events, "event") if all_events else 0
        indexed_courses = qdrant_client.index_entities(all_courses, "course") if all_courses else 0
        indexed_blogs = qdrant_client.index_entities(all_blogs, "blog") if all_blogs else 0
        
        # Get cost
        cost_summary = llm_extractor.get_cost_summary()
        
        return {
            "status": "success",
            "message": "Ingestion completed",
            "emails_fetched": len(emails),
            "entities_extracted": {
                "events": len(all_events),
                "courses": len(all_courses),
                "blogs": len(all_blogs)
            },
            "entities_indexed": {
                "events": indexed_events,
                "courses": indexed_courses,
                "blogs": indexed_blogs
            },
            "api_cost_usd": cost_summary['total_cost_usd']
        }
        
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# STATS & METRICS
# ============================================================================

@app.get("/api/stats")
async def get_stats():
    """Get collection statistics."""
    try:
        client = QdrantClient()
        stats = client.get_collection_stats()
        
        return {
            "collection": stats.get('collection_name'),
            "total_points": stats.get('points_count', 0),
            "indexed_vectors": stats.get('indexed_vectors_count', 0),
            "status": stats.get('status'),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Stats fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# STARTUP EVENT
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("FeedPrism API starting up...")
    logger.info(f"Environment: {settings.log_level}")
    logger.info(f"Qdrant: {settings.qdrant_host}:{settings.qdrant_port}")
    logger.success("FeedPrism API ready!")


if __name__ == '__main__':
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )
```


### 6.4 Pydantic Models for API

**Create `app/models/search.py`:**

```python
"""
Pydantic models for search API requests/responses.
"""

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Search request model."""
    query: str = Field(..., description="Search query text")
    time_filter: Optional[str] = Field(
        None,
        description="Time filter: upcoming, past, this_week, this_month, next_month"
    )
    entity_types: Optional[List[str]] = Field(
        None,
        description="Filter by entity types: event, course, blog"
    )
    limit: int = Field(10, ge=1, le=100, description="Maximum results")


class SearchResponse(BaseModel):
    """Search response model."""
    query: str
    time_filter: Optional[str]
    entity_types: Optional[List[str]]
    total_results: int
    results: List[Dict[str, Any]]
    search_metadata: Dict[str, Any]
```


### 6.5 Test FastAPI Backend

**Run the server:**

```bash
# Start FastAPI server
python -m app.main

# Or with uvicorn directly
uvicorn app.main:app --reload --port 8000
```

**Expected output:**

```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**Test endpoints with curl:**

```bash
# 1. Health check
curl http://localhost:8000/api/health

# 2. Search upcoming events
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AI workshops",
    "time_filter": "upcoming",
    "entity_types": ["event"],
    "limit": 5
  }'

# 3. Get actionable items
curl "http://localhost:8000/api/actionable-items?priority=high&limit=10"

# 4. Collection stats
curl http://localhost:8000/api/stats
```

**Access interactive API docs:**

Open browser → `http://localhost:8000/api/docs`

You'll see Swagger UI with all endpoints documented and testable.

### 6.6 Update Requirements

**Add to `requirements.txt`:**

```txt
# Add these to existing requirements.txt
python-multipart==0.0.9
```

**Install:**

```bash
pip install python-multipart
```


***

**🎉 DAY 4 COMPLETE!**

You now have:

- ✅ Enhanced search service with time-aware filtering (upcoming/past/this week/this month)
- ✅ Actionable items extraction and prioritization
- ✅ FastAPI backend with RESTful endpoints
- ✅ Automatic API documentation (Swagger UI)
- ✅ Search by tags, date ranges, entity types
- ✅ Deduplication logic
- ✅ Manual ingestion trigger endpoint
- ✅ Collection statistics endpoint

**API Endpoints Available:**

- `POST /api/search` - Hybrid search with filters
- `GET /api/search/upcoming` - Upcoming events
- `GET /api/search/past` - Past events
- `GET /api/search/tags` - Search by tags
- `GET /api/actionable-items` - Prioritized actions
- `POST /api/ingest` - Manual ingestion trigger
- `GET /api/stats` - Collection statistics
- `GET /api/health` - Health check

**Next Steps:** Day 5 - Implement metrics (Precision@k, MRR, latency), create benchmark dataset, and build evaluation pipeline.

Should I proceed with Day 5?

