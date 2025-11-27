# Verification script for Phase 4 (combined)
# ------------------------------------------------------------
# This script merges the checks from verify_phase_4_1.py (multi‑collection
# architecture) and verify_phase_4_2_3.py (named vectors + grouping API).
# It can be run directly with `python verify_phase_4_combined.py`.

import sys
import os
import asyncio
import uuid
from datetime import datetime, timedelta

# Ensure the project root is on the import path when executing from the scripts folder
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from loguru import logger
from qdrant_client.models import PointStruct

from app.database.qdrant_client import QdrantService
from app.services.embedder import EmbeddingService
from app.services.deduplicator import DeduplicationService

# ------------------------------------------------------------------
# Helper
# ------------------------------------------------------------------
def _singular(content_type: str) -> str:
    """Return the singular form used in payloads (e.g. 'event' for 'events')."""
    return content_type[:-1] if content_type.endswith("s") else content_type

# ------------------------------------------------------------------
# Phase 4.1 – Multi‑Collection Architecture verification
# ------------------------------------------------------------------
async def _verify_multi_collection(qdrant: QdrantService, embedder: EmbeddingService) -> None:
    logger.info("🚀 Starting Phase 4.1 verification (multi‑collection architecture)…")

    # 1️⃣ Verify collections exist (re‑create to ensure named‑vector config)
    qdrant.create_all_collections(recreate=True)
    expected = {"feedprism_events", "feedprism_courses", "feedprism_blogs"}
    existing = {c.name for c in qdrant.client.get_collections().collections}
    missing = expected - existing
    if missing:
        logger.error(f"❌ Missing collections: {missing}")
        return
    logger.success("✅ All collections present.")

    # 2️⃣ Simple upsert + search per collection
    test_data = {
        "events": [
            {"title": "AI Summit 2025", "desc": "Global AI conference"},
            {"title": "Python Meetup", "desc": "Local developers meetup"},
        ],
        "courses": [
            {"title": "Advanced NLP Course", "desc": "Learn transformers"},
            {"title": "React for Beginners", "desc": "Web dev basics"},
        ],
        "blogs": [
            {"title": "The State of AI", "desc": "Trends in 2025"},
            {"title": "Qdrant Optimization", "desc": "How to tune HNSW"},
        ],
    }

    for ctype, items in test_data.items():
        points = []
        for item in items:
            vec = embedder.embed_text(f"{item['title']} {item['desc']}")
            point = PointStruct(
                id=str(uuid.uuid4()),
                vector=vec,
                payload={
                    "content_type": _singular(ctype),
                    "title": item["title"],
                    "description": item["desc"],
                },
            )
            points.append(point)
        logger.info(f"Upserting {len(points)} points to {ctype} collection…")
        qdrant.upsert_by_type(ctype, points)
        # Search test (simple keyword)
        query_vec = embedder.embed_text("AI")
        results = qdrant.search(query_vec, content_type=ctype, limit=5)
        logger.info(f"Search in {ctype} returned {len(results)} results.")
        for r in results:
            logger.debug(f"  • {r['payload'].get('title')}")

    logger.success("✅ Phase 4.1 verification complete.")

# ------------------------------------------------------------------
# Phase 4.2 – Named Vectors verification
# ------------------------------------------------------------------
async def _verify_named_vectors(qdrant: QdrantService, embedder: EmbeddingService) -> None:
    logger.info("🚀 Starting Phase 4.2 verification (named vectors)…")

    # Create a test item where title and description are intentionally different
    title = "Apple Pie Recipe"
    description = "A tutorial on how to code in Python"  # misleading on purpose
    vectors = embedder.create_named_vectors(title=title, description=description, full_text=f"{title} {description}")
    point = PointStruct(
        id=str(uuid.uuid4()),
        vector=vectors,
        payload={
            "content_type": "blog",
            "title": title,
            "description": description,
            "canonical_item_id": "unique_id_1",
        },
    )
    qdrant.upsert_by_type("blogs", [point])

    # Title vector search – should match on "Apple"
    query_vec = embedder.embed_text("Apple")
    res_title = qdrant.search(query_vec, "blogs", vector_name="title", limit=1)
    if res_title and res_title[0]["payload"]["title"] == title:
        logger.success("✅ Title‑vector search matched correctly.")
    else:
        logger.error("❌ Title‑vector search failed.")

    # Description vector search – should match on "Python"
    query_vec = embedder.embed_text("Python")
    res_desc = qdrant.search(query_vec, "blogs", vector_name="description", limit=1)
    if res_desc and res_desc[0]["payload"]["title"] == title:
        logger.success("✅ Description‑vector search matched correctly.")
    else:
        logger.error("❌ Description‑vector search failed.")

    logger.success("✅ Phase 4.2 verification complete.")

# ------------------------------------------------------------------
# Phase 4.3 – Grouping API (deduplication) verification
# ------------------------------------------------------------------
async def _verify_grouping_api(qdrant: QdrantService, embedder: EmbeddingService, deduplicator: DeduplicationService) -> None:
    logger.info("🚀 Starting Phase 4.3 verification (grouping API)…")

    # Create two duplicate events and one unique event
    canonical_dup = deduplicator.compute_canonical_id("Duplicate Event", "event")
    canonical_unique = deduplicator.compute_canonical_id("Unique Event", "event")

    points = []
    # Duplicate 1
    vec1 = embedder.create_named_vectors("Duplicate Event", "Source A", "Duplicate Event Source A")
    points.append(PointStruct(
        id=str(uuid.uuid4()),
        vector=vec1,
        payload={
            "content_type": "event",
            "title": "Duplicate Event",
            "source_subject": "Newsletter A",
            "canonical_item_id": canonical_dup,
        },
    ))
    # Duplicate 2
    vec2 = embedder.create_named_vectors("Duplicate Event", "Source B", "Duplicate Event Source B")
    points.append(PointStruct(
        id=str(uuid.uuid4()),
        vector=vec2,
        payload={
            "content_type": "event",
            "title": "Duplicate Event",
            "source_subject": "Newsletter B",
            "canonical_item_id": canonical_dup,
        },
    ))
    # Unique event
    vec3 = embedder.create_named_vectors("Unique Event", "Source C", "Unique Event Source C")
    points.append(PointStruct(
        id=str(uuid.uuid4()),
        vector=vec3,
        payload={
            "content_type": "event",
            "title": "Unique Event",
            "source_subject": "Newsletter C",
            "canonical_item_id": canonical_unique,
        },
    ))

    qdrant.upsert_by_type("events", points)

    # Standard search – should return all three points
    query_vec = embedder.embed_text("Event")
    std_results = qdrant.search(query_vec, "events", limit=10)
    logger.info(f"Standard search returned {len(std_results)} items (expected 3).")

    # Grouped search – should return 2 groups (duplicate + unique)
    grouped = qdrant.search_with_grouping(query_vec, "events", limit=10)
    logger.info(f"Grouped search returned {len(grouped)} groups (expected 2).")
    if len(grouped) == 2:
        logger.success("✅ Grouping API correctly identified duplicate group.")
        dup_group = next((g for g in grouped if g["payload"]["title"] == "Duplicate Event"), None)
        if dup_group and dup_group["source_count"] == 2:
            logger.success("✅ Duplicate group source count is correct (2).")
        else:
            logger.error("❌ Duplicate group source count mismatch.")
    else:
        logger.error("❌ Grouping API did not return expected number of groups.")

    logger.success("✅ Phase 4.3 verification complete.")

# ------------------------------------------------------------------
# Main entry point – run all three phases sequentially
# ------------------------------------------------------------------
async def verify_phase_4_combined() -> None:
    qdrant = QdrantService()
    embedder = EmbeddingService()
    deduplicator = DeduplicationService()

    await _verify_multi_collection(qdrant, embedder)
    await _verify_named_vectors(qdrant, embedder)
    await _verify_grouping_api(qdrant, embedder, deduplicator)
    logger.success("🎉 All Phase 4 verification steps completed successfully.")

if __name__ == "__main__":
    asyncio.run(verify_phase_4_combined())
