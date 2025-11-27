"""
Deduplication Service

Handles canonical ID generation and duplicate detection for content items.
Uses deterministic hashing for ID generation and vector similarity for finding potential duplicates.

Author: FeedPrism Team
"""

import hashlib
from typing import List, Dict, Optional
from loguru import logger

from app.services.embedder import EmbeddingService
from app.database.qdrant_client import QdrantService

class DeduplicationService:
    """Service for content deduplication."""
    
    def __init__(self):
        self.embedder = EmbeddingService()
        self.qdrant = QdrantService()
        
    def compute_canonical_id(self, title: str, content_type: str) -> str:
        """
        Generate canonical ID for grouping.
        
        Args:
            title: Content title
            content_type: Content type (event, course, blog)
            
        Returns:
            MD5 hash string
        """
        if not title:
            return ""
            
        # Normalize title: lowercase, remove special chars, keep alphanumeric and spaces
        normalized = title.lower().strip()
        normalized = ''.join(c for c in normalized if c.isalnum() or c.isspace())
        
        # Deterministic hash
        # content_type prefix ensures "Python Course" != "Python Event"
        content = f"{content_type}:{normalized}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def find_duplicates(
        self,
        title: str,
        description: str,
        content_type: str,
        threshold: float = 0.92
    ) -> List[Dict]:
        """
        Find potential duplicates via vector similarity.
        
        Args:
            title: Content title
            description: Content description
            content_type: Content type to search in
            threshold: Similarity threshold (0.0 to 1.0)
            
        Returns:
            List of similar items
        """
        # Create vector for search (using title + description for best semantic match)
        query_vec = self.embedder.embed_text(f"{title} {description}")
        
        # Search in specific collection
        # Note: We use the default search which searches the "title" vector if named vectors are enabled,
        # or the single vector if not. We'll refine this when QdrantService is updated.
        results = self.qdrant.search(
            query_vector=query_vec,
            content_type=content_type + "s" if not content_type.endswith("s") else content_type,
            limit=5
        )
        
        # Filter by score
        duplicates = [r for r in results if r['score'] > threshold]
        
        if duplicates:
            logger.info(f"Found {len(duplicates)} potential duplicates for '{title}'")
            
        return duplicates
