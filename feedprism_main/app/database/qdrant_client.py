"""
Qdrant Vector Database Client

Handles all Qdrant operations: collection management, point upsert,
vector search, and payload filtering.

Author: FeedPrism Team
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from qdrant_client import QdrantClient as QdrantClientSDK
from qdrant_client.models import (
    Distance,
    VectorParams,
    SparseVectorParams,
    SparseVector,
    NamedSparseVector,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    Range
)
from loguru import logger

from app.config import settings
from app.utils.sparse_vector import create_sparse_vector


class QdrantService:
    """
    Service for Qdrant vector database operations.
    
    Handles collection management, point upsert, vector search, and payload filtering
    for multi-content type storage (events, courses, blogs).
    
    Recommended Payload Structure:
        For Phase 2+ multi-content storage, use this standardized structure:
        
        {
            "content_type": "event|course|blog",  # Required for filtering
            "title": str,                          # Content title
            "description": str,                    # Content description
            "source_email_id": str,               # Gmail message ID
            "source_subject": str,                # Email subject
            "source_from": str,                   # Email sender
            "extracted_at": str,                  # ISO 8601 timestamp
            "tags": List[str],                    # Content tags
            
            # Type-specific fields (optional)
            "start_time": str,                    # Events only
            "location": str,                      # Events only
            "provider": str,                      # Courses only
            "author": str,                        # Blogs only
            "url": str,                           # Courses/Blogs
            # ... other fields as needed
        }
    
    Example Usage:
        >>> qdrant = QdrantService()
        >>> qdrant.create_collection()
        >>> 
        >>> # Store event with content_type
        >>> point = PointStruct(
        ...     id="uuid",
        ...     vector=[...],
        ...     payload={"content_type": "event", "title": "AI Conference"}
        ... )
        >>> qdrant.upsert_points([point])
        >>> 
        >>> # Search only courses
        >>> results = qdrant.search(
        ...     query_vector=[...],
        ...     filter_dict={"content_type": "course"}
        ... )
    """
    
    def __init__(
        self,
        host: str = None,
        port: int = None,
        collection_name: str = None
    ):
        """Initialize Qdrant client."""
        self.host = host or settings.qdrant_host
        self.port = port or settings.qdrant_port
        self.collection_name = collection_name or settings.qdrant_collection_name
        self.vector_size = settings.embedding_dimension
        
        logger.info(f"Connecting to Qdrant: {self.host}:{self.port}")
        self.client = QdrantClientSDK(host=self.host, port=self.port)
        logger.success("Qdrant client initialized")
    
    def create_collection(self, recreate: bool = False) -> None:
        """
        Create Qdrant collection for events.
        
        Args:
            recreate: If True, delete existing collection first
        """
        if recreate and self.client.collection_exists(self.collection_name):
            logger.warning(f"Deleting existing collection: {self.collection_name}")
            self.client.delete_collection(self.collection_name)
        
        if not self.client.collection_exists(self.collection_name):
            logger.info(f"Creating collection: {self.collection_name}")
            
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.vector_size,
                    distance=Distance.COSINE
                ),
                sparse_vectors_config={
                    "keywords": SparseVectorParams()
                }
            )
            
            logger.success(f"Collection created: {self.collection_name}")
        else:
            logger.info(f"Collection already exists: {self.collection_name}")
    
    def upsert_points(self, points: List[PointStruct]) -> None:
        """
        Insert or update points in collection.
        
        Args:
            points: List of PointStruct objects
        """
        if not points:
            logger.warning("No points to upsert")
            return
        
        logger.info(f"Upserting {len(points)} points to {self.collection_name}")
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        
        logger.success(f"Upserted {len(points)} points")
    
    def search(
        self,
        query_vector: List[float],
        limit: int = 10,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar vectors.
        
        Args:
            query_vector: Query embedding
            limit: Number of results to return
            filter_dict: Optional payload filters (e.g., {"type": "event"})
        
        Returns:
            List of search results with payload and score
        """
        # Build filter if provided
        search_filter = None
        if filter_dict:
            conditions = [
                FieldCondition(
                    key=key,
                    match=MatchValue(value=value)
                )
                for key, value in filter_dict.items()
            ]
            search_filter = Filter(must=conditions)
        
        logger.info(f"Searching {self.collection_name} (limit={limit})")
        
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=limit,
            query_filter=search_filter
        )
        
        # Convert to dict format
        formatted_results = [
            {
                "id": result.id,
                "score": result.score,
                "payload": result.payload
            }
            for result in results
        ]
        
        logger.success(f"Found {len(formatted_results)} results")
        return formatted_results

    def hybrid_search(
        self,
        query_vector: List[float],
        query_text: str,
        limit: int = 10
    ) -> List[Dict]:
        """Hybrid search: dense + sparse with RRF fusion."""
        
        # Dense search
        dense_results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=limit * 2
        )
        
        # Sparse search
        sparse_vec_dict = create_sparse_vector(query_text)
        sparse_vec = SparseVector(**sparse_vec_dict)
        sparse_results = self.client.search(
            collection_name=self.collection_name,
            query_vector=NamedSparseVector(name="keywords", vector=sparse_vec),
            limit=limit * 2
        )
        
        # RRF Fusion
        fused_ids = self._rrf_fusion(dense_results, sparse_results, k=60)
        
        # Retrieve full payloads for top results
        # Note: _rrf_fusion returns IDs. We need to fetch the points.
        top_ids = fused_ids[:limit]
        if not top_ids:
            return []
            
        points = self.client.retrieve(
            collection_name=self.collection_name,
            ids=top_ids
        )
        
        # Map points back to order of top_ids
        point_map = {point.id: point for point in points}
        ordered_results = []
        for pid in top_ids:
            if pid in point_map:
                point = point_map[pid]
                ordered_results.append({
                    "id": point.id,
                    "score": 0.0, # RRF doesn't give a meaningful probability score, just rank
                    "payload": point.payload
                })
                
        return ordered_results

    def _rrf_fusion(self, dense_results, sparse_results, k=60):
        """Reciprocal Rank Fusion algorithm."""
        scores = {}
        
        # Aggregate scores from both result sets
        for rank, result in enumerate(dense_results, 1):
            scores[result.id] = scores.get(result.id, 0) + 1 / (k + rank)
        
        for rank, result in enumerate(sparse_results, 1):
            scores[result.id] = scores.get(result.id, 0) + 1 / (k + rank)
        
        # Sort by combined score
        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        return sorted_ids

    def search_with_filters(
        self,
        query_vector: List[float],
        content_type: Optional[str] = None,
        date_range: Optional[tuple] = None,
        tags: Optional[List[str]] = None,
        limit: int = 10
    ) -> List[Dict]:
        """Search with payload filters."""
        
        must_conditions = []
        
        # Filter by content type
        if content_type:
            must_conditions.append(
                FieldCondition(key="content_type", match=MatchValue(value=content_type))
            )
        
        # Filter by date range
        if date_range:
            start_date, end_date = date_range
            # Convert to timestamps - Qdrant Range filter requires numeric values            # Data is stored as timestamps, so we must filter with timestamps
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date).timestamp()
            if isinstance(end_date, str):
                end_date = datetime.fromisoformat(end_date).timestamp()
            must_conditions.append(
                FieldCondition(
                    key="start_date",  # This field stores timestamps
                    range=Range(gte=start_date, lte=end_date)
                )
            )        
        # Filter by tags
        if tags:
            for tag in tags:
                must_conditions.append(
                    FieldCondition(key="tags", match=MatchValue(value=tag))
                )
        
        query_filter = Filter(must=must_conditions) if must_conditions else None
        
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=limit
        )
        
        return [
            {
                "id": result.id,
                "score": result.score,
                "payload": result.payload
            }
            for result in results
        ]

    def search_upcoming_events(
        self,
        query_vector: List[float],
        days_ahead: int = 30,
        limit: int = 10
    ) -> List[Dict]:
        """Search for upcoming events only."""
        
        today = datetime.now().isoformat()
        future = (datetime.now() + timedelta(days=days_ahead)).isoformat()
        
        return self.search_with_filters(
            query_vector=query_vector,
            content_type="event",
            date_range=(today, future),
            limit=limit
        )

    def search_recent_blogs(
        self,
        query_vector: List[float],
        days_back: int = 7,
        limit: int = 10
    ) -> List[Dict]:
        """Search for recent blog posts."""
        
        past = (datetime.now() - timedelta(days=days_back)).isoformat()
        today = datetime.now().isoformat()
        
        return self.search_with_filters(
            query_vector=query_vector,
            content_type="blog",
            date_range=(past, today),
            limit=limit
        )
    
    def get_point(self, point_id: str) -> Optional[Dict[str, Any]]:
        """Get single point by ID."""
        try:
            point = self.client.retrieve(
                collection_name=self.collection_name,
                ids=[point_id]
            )
            
            if point:
                return {
                    "id": point[0].id,
                    "payload": point[0].payload,
                    "vector": point[0].vector
                }
            return None
            
        except Exception as e:
            logger.error(f"Failed to get point {point_id}: {e}")
            return None
    
    def delete_points(self, point_ids: List[str]) -> None:
        """Delete points by IDs."""
        logger.info(f"Deleting {len(point_ids)} points")
        
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=point_ids
        )
        
        logger.success(f"Deleted {len(point_ids)} points")
    
    def get_collection_info(self) -> Dict[str, Any]:
        """Get collection statistics."""
        info = self.client.get_collection(self.collection_name)
        
        return {
            "name": self.collection_name,
            "vectors_count": info.vectors_count,
            "points_count": info.points_count,
            "status": info.status
        }
