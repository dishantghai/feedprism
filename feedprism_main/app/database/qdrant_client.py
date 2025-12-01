"""
Qdrant Vector Database Client

Handles all Qdrant operations: collection management, point upsert,
vector search, and payload filtering.

Author: FeedPrism Team
"""

from typing import Any, Dict, List, Optional, Literal
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
    Range,
    HnswConfigDiff
)
from loguru import logger

from app.config import settings
from app.utils.sparse_vector import create_sparse_vector

ContentType = Literal["events", "courses", "blogs"]

class QdrantService:
    """
    Service for Qdrant vector database operations.
    
    Handles collection management, point upsert, vector search, and payload filtering
    for multi-content type storage (events, courses, blogs).
    
    Architecture (Phase 4+):
        - feedprism_events: HNSW m=16, ef=200 (High Recall)
        - feedprism_courses: HNSW m=24, ef=100 (Balanced)
        - feedprism_blogs: HNSW m=16, ef=150 (Fast)
    """
    
    def __init__(
        self,
        host: str = None,
        port: int = None,
        api_key: str = None
    ):
        """Initialize Qdrant client."""
        self.host = host or settings.qdrant_host
        self.port = port or settings.qdrant_port
        self.api_key = api_key or settings.qdrant_api_key
        self.vector_size = settings.embedding_dimension
        
        # Map content types to collection names
        self.collections = {
            "events": "feedprism_events",
            "courses": "feedprism_courses",
            "blogs": "feedprism_blogs"
        }
        
        logger.info(f"Connecting to Qdrant: {self.host}:{self.port}")
        # Pass API key if configured (for authentication)
        self.client = QdrantClientSDK(
            host=self.host,
            port=self.port,
            api_key=self.api_key,
            https=False
        )
        logger.success("Qdrant client initialized" + (" with API key" if self.api_key else ""))
    
    def get_collection_name(self, content_type: ContentType) -> str:
        """Get collection name for content type."""
        return self.collections.get(content_type)

    def create_all_collections(self, recreate: bool = False) -> None:
        """
        Create type-specific collections with optimized HNSW.
        
        Args:
            recreate: If True, delete existing collections first
        """
        # HNSW tuning per content type
        hnsw_configs = {
            "events": HnswConfigDiff(m=16, ef_construct=200),  # High recall
            "courses": HnswConfigDiff(m=24, ef_construct=100), # Balanced
            "blogs": HnswConfigDiff(m=16, ef_construct=150)    # Fast retrieval
        }
        
        for content_type, collection_name in self.collections.items():
            if recreate and self.client.collection_exists(collection_name):
                logger.warning(f"Deleting existing collection: {collection_name}")
                self.client.delete_collection(collection_name)
            
            if not self.client.collection_exists(collection_name):
                logger.info(f"Creating collection: {collection_name}")
                
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config={
                        "title": VectorParams(size=self.vector_size, distance=Distance.COSINE),
                        "description": VectorParams(size=self.vector_size, distance=Distance.COSINE),
                        "full_text": VectorParams(size=self.vector_size, distance=Distance.COSINE)
                    },
                    sparse_vectors_config={
                        "keywords": SparseVectorParams()
                    },
                    hnsw_config=hnsw_configs[content_type]
                )
                logger.success(f"Created {collection_name}")
            else:
                logger.info(f"Collection already exists: {collection_name}")

    def upsert_by_type(self, content_type: ContentType, points: List[PointStruct]) -> None:
        """
        Upsert to type-specific collection.
        
        Args:
            content_type: Type of content (events, courses, blogs)
            points: List of PointStruct objects
        """
        if not points:
            logger.warning(f"No points to upsert for {content_type}")
            return
            
        collection = self.get_collection_name(content_type)
        if not collection:
            raise ValueError(f"Invalid content type: {content_type}")
            
        logger.info(f"Upserting {len(points)} points to {collection}")
        
        self.client.upsert(
            collection_name=collection,
            points=points
        )
        
        logger.success(f"Upserted {len(points)} points to {collection}")
    
    def search(
        self,
        query_vector: List[float],
        content_type: ContentType,
        vector_name: str = "title",
        limit: int = 10,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar vectors in a specific collection.
        
        Args:
            query_vector: Query embedding
            content_type: Type of content to search
            vector_name: Name of vector to search (title, description, full_text)
            limit: Number of results to return
            filter_dict: Optional payload filters
        """
        collection = self.get_collection_name(content_type)
        if not collection:
            raise ValueError(f"Invalid content type: {content_type}")

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
        
        logger.info(f"Searching {collection} using {vector_name} (limit={limit})")
        
        results = self.client.search(
            collection_name=collection,
            query_vector=(vector_name, query_vector),
            limit=limit,
            query_filter=search_filter
        )
        
        return [
            {
                "id": result.id,
                "score": result.score,
                "payload": result.payload
            }
            for result in results
        ]

    def search_with_grouping(
        self,
        query_vector: List[float],
        content_type: ContentType,
        vector_name: str = "title",
        limit: int = 10,
        group_size: int = 3
    ) -> List[Dict]:
        """
        Search with automatic deduplication using Grouping API.
        
        Args:
            query_vector: Query embedding
            content_type: Content type
            vector_name: Vector to search
            limit: Number of groups (unique items) to return
            group_size: Max items per group
        """
        collection = self.get_collection_name(content_type)
        if not collection:
            raise ValueError(f"Invalid content type: {content_type}")
            
        results = self.client.search_groups(
            collection_name=collection,
            query_vector=(vector_name, query_vector),
            limit=limit,
            group_by="canonical_item_id",
            group_size=group_size,
            with_payload=True
        )
        
        formatted = []
        for group in results.groups:
            canonical = group.hits[0]
            sources = group.hits
            
            formatted.append({
                "id": canonical.id,
                "score": canonical.score,
                "payload": canonical.payload,
                "source_count": len(sources),
                "sources": [
                    {
                        "email_id": hit.payload.get("source_email_id"), 
                        "subject": hit.payload.get("source_subject")
                    }
                    for hit in sources
                ]
            })
        
        return formatted

    def hybrid_search(
        self,
        query_vector: List[float],
        query_text: str,
        content_type: ContentType,
        limit: int = 10
    ) -> List[Dict]:
        """Hybrid search: dense + sparse with RRF fusion."""
        collection = self.get_collection_name(content_type)
        if not collection:
            raise ValueError(f"Invalid content type: {content_type}")
        
        # Dense search
        dense_results = self.client.search(
            collection_name=collection,
            query_vector=query_vector,
            limit=limit * 2
        )
        
        # Sparse search
        sparse_vec_dict = create_sparse_vector(query_text)
        sparse_vec = SparseVector(**sparse_vec_dict)
        sparse_results = self.client.search(
            collection_name=collection,
            query_vector=NamedSparseVector(name="keywords", vector=sparse_vec),
            limit=limit * 2
        )
        
        # RRF Fusion
        fused_ids = self._rrf_fusion(dense_results, sparse_results, k=60)
        
        # Retrieve full payloads for top results
        top_ids = fused_ids[:limit]
        if not top_ids:
            return []
            
        points = self.client.retrieve(
            collection_name=collection,
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
                    "score": 0.0, # RRF doesn't give a meaningful probability score
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
        content_type: ContentType,
        date_range: Optional[tuple] = None,
        tags: Optional[List[str]] = None,
        limit: int = 10
    ) -> List[Dict]:
        """Search with payload filters."""
        collection = self.get_collection_name(content_type)
        if not collection:
            raise ValueError(f"Invalid content type: {content_type}")
        
        must_conditions = []
        
        # Filter by date range
        if date_range:
            start_date, end_date = date_range
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date).timestamp()
            if isinstance(end_date, str):
                end_date = datetime.fromisoformat(end_date).timestamp()
            must_conditions.append(
                FieldCondition(
                    key="start_date",
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
            collection_name=collection,
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
            content_type="events",
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
            content_type="blogs",
            date_range=(past, today),
            limit=limit
        )
    
    def get_point(self, point_id: str, content_type: ContentType) -> Optional[Dict[str, Any]]:
        """Get single point by ID from specific collection."""
        collection = self.get_collection_name(content_type)
        if not collection:
            return None
            
        try:
            point = self.client.retrieve(
                collection_name=collection,
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
    
    def delete_points(self, point_ids: List[str], content_type: ContentType) -> None:
        """Delete points by IDs from specific collection."""
        collection = self.get_collection_name(content_type)
        if not collection:
            return

        logger.info(f"Deleting {len(point_ids)} points from {collection}")
        
        self.client.delete(
            collection_name=collection,
            points_selector=point_ids
        )
        
        logger.success(f"Deleted {len(point_ids)} points")
    
    def get_collection_info(self, content_type: ContentType) -> Dict[str, Any]:
        """Get collection statistics."""
        collection = self.get_collection_name(content_type)
        if not collection:
            return {}

        info = self.client.get_collection(collection)
        
        return {
            "name": collection,
            "vectors_count": info.vectors_count,
            "points_count": info.points_count,
            "status": info.status
        }
    
    def get_processed_email_ids(self) -> set:
        """
        Get all unique source_email_id values from all collections.
        
        Used to filter out already-processed emails from Gmail fetch.
        
        Returns:
            Set of email IDs that have been processed
        """
        processed_ids = set()
        
        for content_type in ["events", "courses", "blogs"]:
            try:
                collection = self.get_collection_name(content_type)
                if not collection or not self.client.collection_exists(collection):
                    continue
                
                offset = None
                while True:
                    batch, offset = self.client.scroll(
                        collection_name=collection,
                        limit=100,
                        offset=offset,
                        with_payload=["source_email_id"]
                    )
                    
                    for point in batch:
                        email_id = point.payload.get("source_email_id")
                        if email_id:
                            processed_ids.add(email_id)
                    
                    if offset is None:
                        break
                        
            except Exception as e:
                logger.warning(f"Error fetching processed IDs from {content_type}: {e}")
                continue
        
        logger.info(f"Found {len(processed_ids)} processed email IDs")
        return processed_ids
    
    def delete_by_email_ids(self, email_ids: List[str]) -> Dict[str, int]:
        """
        Delete all extracted items for the given source email IDs.
        
        Args:
            email_ids: List of Gmail email IDs to delete items for
            
        Returns:
            Dict with count of deleted items per collection
        """
        from qdrant_client.models import Filter, FieldCondition, MatchAny
        
        deleted_counts = {}
        
        for content_type in ["events", "courses", "blogs"]:
            try:
                collection = self.get_collection_name(content_type)
                if not collection or not self.client.collection_exists(collection):
                    deleted_counts[content_type] = 0
                    continue
                
                # Delete points where source_email_id matches any of the provided IDs
                result = self.client.delete(
                    collection_name=collection,
                    points_selector=Filter(
                        must=[
                            FieldCondition(
                                key="source_email_id",
                                match=MatchAny(any=email_ids)
                            )
                        ]
                    )
                )
                
                # Qdrant delete returns operation info, not count
                # We'll count by checking before/after or just log success
                deleted_counts[content_type] = len(email_ids)  # Approximate
                logger.info(f"Deleted items from {collection} for {len(email_ids)} emails")
                
            except Exception as e:
                logger.error(f"Error deleting from {content_type}: {e}")
                deleted_counts[content_type] = 0
        
        return deleted_counts

    def is_email_processed(self, email_id: str) -> bool:
        """
        Check if an email has already been processed by querying all collections.
        
        Args:
            email_id: Gmail message ID to check
            
        Returns:
            True if email ID exists in any collection, False otherwise
        """
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        
        for content_type in ["events", "courses", "blogs"]:
            try:
                collection = self.get_collection_name(content_type)
                if not collection or not self.client.collection_exists(collection):
                    continue
                
                # Fast check: scroll for just 1 item with this source_email_id
                batch, _ = self.client.scroll(
                    collection_name=collection,
                    scroll_filter=Filter(
                        must=[
                            FieldCondition(
                                key="source_email_id",
                                match=MatchValue(value=email_id)
                            )
                        ]
                    ),
                    limit=1,
                    with_payload=False,
                    with_vectors=False
                )
                
                if batch:
                    logger.info(f"Email {email_id} found in {collection}")
                    return True
                    
            except Exception as e:
                logger.warning(f"Error checking status in {content_type}: {e}")
                continue
        
        return False
