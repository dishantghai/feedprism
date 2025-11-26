"""
Embedding Generation Service

Uses sentence-transformers to generate dense vector embeddings
for semantic search.

Author: FeedPrism Team
"""

from typing import List, Union
import numpy as np

from sentence_transformers import SentenceTransformer
from loguru import logger

from app.config import settings


class EmbeddingService:
    """Service for generating text embeddings."""
    
    def __init__(self, model_name: str = None):
        """Initialize embedding model."""
        self.model_name = model_name or settings.embedding_model_name
        self.dimension = settings.embedding_dimension
        
        logger.info(f"Loading embedding model: {self.model_name}")
        self.model = SentenceTransformer(self.model_name)
        logger.success(f"Model loaded: {self.dimension}D vectors")
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for single text.
        
        Args:
            text: Input text
        
        Returns:
            List of floats (embedding vector)
        """
        if not text or not text.strip():
            logger.warning("Empty text provided, returning zero vector")
            return [0.0] * self.dimension
        
        try:
            # Generate embedding
            embedding = self.model.encode(text, convert_to_numpy=True)
            
            # Convert to list
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return [0.0] * self.dimension
    
    def embed_batch(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (efficient).
        
        Args:
            texts: List of input texts
            batch_size: Batch size for processing
        
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        try:
            logger.info(f"Embedding {len(texts)} texts in batches of {batch_size}")
            
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,
                convert_to_numpy=True,
                show_progress_bar=len(texts) > 100
            )
            
            return embeddings.tolist()
            
        except Exception as e:
            logger.error(f"Batch embedding failed: {e}")
            return [[0.0] * self.dimension] * len(texts)
