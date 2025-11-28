from typing import List, Dict, Optional
from app.database.qdrant_client import QdrantService

class RecommendationService:
    def __init__(self):
        self.qdrant = QdrantService()
    
    def discover_similar(
        self,
        item_id: str,
        content_type: str,
        limit: int = 5
    ) -> List[Dict]:
        """Discover similar items using Discovery API."""
        
        collection = self.qdrant.get_collection_name(content_type)
        
        # Retrieve target item
        # We need to find the point ID first. 
        # Assuming item_id passed here is the ID used in Qdrant (UUID).
        # If it's an external ID, we might need to search for it first, 
        # but for this implementation we assume it's the Qdrant Point ID.
        
        try:
            target_points = self.qdrant.client.retrieve(
                collection_name=collection,
                ids=[item_id]
            )
            
            if not target_points:
                return []
            
            target = target_points[0]
            
            # Use Discovery API
            # The 'target' argument in discover expects a point ID or a vector.
            results = self.qdrant.client.discover(
                collection_name=collection,
                target=target.id,
                using="full_text",  # Must specify vector name for named vectors
                limit=limit,
                with_payload=True
            )
            
            return [{"id": r.id, "score": r.score, "payload": r.payload} for r in results]
            
        except Exception as e:
            print(f"Error in discover_similar: {e}")
            return []
