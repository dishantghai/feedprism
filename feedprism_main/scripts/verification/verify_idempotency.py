import sys
import os
from pathlib import Path
import uuid
from loguru import logger
from qdrant_client.models import PointStruct

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

from app.database.qdrant_client import QdrantService

def verify_idempotency():
    logger.info("🚀 Starting Idempotency Verification")
    
    try:
        qdrant = QdrantService()
        
        # Test ID
        test_email_id = f"test_idempotency_{uuid.uuid4()}"
        logger.info(f"Testing with unique Email ID: {test_email_id}")
        
        # 1. Check before insertion (should be False)
        logger.info("Step 1: Checking non-existent email...")
        exists = qdrant.is_email_processed(test_email_id)
        if exists:
            logger.error("❌ Email should not exist yet")
            return False
        logger.success("✅ Correctly identified new email")
        
        # 2. Insert dummy item
        logger.info("Step 2: Inserting dummy item...")
        
        # Create zero vectors of correct dimension
        vector_size = qdrant.vector_size
        zero_vector = [0.0] * vector_size
        
        dummy_point = PointStruct(
            id=str(uuid.uuid4()),
            vector={
                "title": zero_vector,
                "description": zero_vector,
                "full_text": zero_vector
            },
            payload={
                "source_email_id": test_email_id,
                "title": "Test Idempotency Item",
                "description": "This is a test item for verification"
            }
        )
        
        # Insert into events collection
        qdrant.upsert_by_type("events", [dummy_point])
        
        # 3. Check after insertion (should be True)
        logger.info("Step 3: Checking existing email...")
        exists = qdrant.is_email_processed(test_email_id)
        if not exists:
            logger.error("❌ Email should exist now (was not found after insert)")
            # Cleanup attempt
            qdrant.delete_by_email_ids([test_email_id])
            return False
        logger.success("✅ Correctly identified existing email")
        
        # 4. Cleanup
        logger.info("Step 4: Cleaning up...")
        qdrant.delete_by_email_ids([test_email_id])
        
        # 5. Verify cleanup
        logger.info("Step 5: Verifying cleanup...")
        exists = qdrant.is_email_processed(test_email_id)
        if exists:
            logger.error("❌ Cleanup failed (item still exists)")
            return False
            
        logger.success("✅ Cleanup successful")
        return True
        
    except Exception as e:
        logger.exception(f"Verification failed with exception: {e}")
        return False

if __name__ == "__main__":
    if verify_idempotency():
        logger.success("🎉 Idempotency verification passed!")
        sys.exit(0)
    else:
        logger.error("💥 Idempotency verification failed!")
        sys.exit(1)
