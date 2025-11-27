"""
Migrate from single collection to three type-specific collections.
"""

import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from loguru import logger
from qdrant_client.http.models import PointStruct

from app.database.qdrant_client import QdrantService
from app.config import settings

async def migrate():
    logger.info("Starting migration to multi-collection architecture...")
    
    qdrant = QdrantService()
    
    # Create new collections
    qdrant.create_all_collections()
    
    # Old collection name
    old_collection = "feedprism_emails" # Assuming this was the old default
    
    if not qdrant.client.collection_exists(old_collection):
        logger.error(f"Old collection {old_collection} not found!")
        return

    # Group points by content_type
    points_by_type = {"events": [], "courses": [], "blogs": []}
    
    offset = None
    total_migrated = 0
    
    while True:
        # Scroll through old collection
        batch, offset = qdrant.client.scroll(
            collection_name=old_collection,
            limit=100,
            offset=offset,
            with_payload=True,
            with_vectors=True
        )
        
        for point in batch:
            # Determine content type from payload
            # Fallback to 'events' if not specified (or handle as error)
            content_type = point.payload.get("content_type", "events")
            
            # Normalize content type string (e.g. "event" -> "events")
            if content_type.endswith("s"):
                normalized_type = content_type
            else:
                normalized_type = content_type + "s"
                
            if normalized_type in points_by_type:
                # Create new point struct
                new_point = PointStruct(
                    id=point.id,
                    vector=point.vector,
                    payload=point.payload
                )
                points_by_type[normalized_type].append(new_point)
            else:
                logger.warning(f"Unknown content type: {content_type} for point {point.id}")
        
        if offset is None:
            break
            
    # Upsert to new collections
    for content_type, points in points_by_type.items():
        if points:
            qdrant.upsert_by_type(content_type, points)
            logger.info(f"✅ Migrated {len(points)} {content_type}")
            total_migrated += len(points)
            
    logger.success(f"Migration complete! Total points migrated: {total_migrated}")

if __name__ == "__main__":
    asyncio.run(migrate())
