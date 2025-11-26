"""
Qdrant Vector Database Client

Handles all Qdrant operations: collection management, point upsert,
vector search, and payload filtering.

Author: FeedPrism Team
"""

from typing import Any, Dict, List, Optional

from qdrant_client import QdrantClient as QdrantClientSDK
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue
)
from loguru import logger

from app.config import settings


class QdrantService:
    """Service for Qdrant vector database operations."""
    
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
                )
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
