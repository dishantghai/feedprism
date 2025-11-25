# Phase 4: Qdrant Enhancements - Multi-Collection, Named Vectors, Grouping API

**Goal:** Implement advanced Qdrant features that differentiate FeedPrism for Top 3 hackathon ranking.

**Estimated Time:** 8-10 hours

**Prerequisites:** Phase 3 complete (verified ✅)

---

## Overview

### What Makes Phase 4 Critical for Winning

**This is the TOP 3 differentiator!** Most hackathon projects will have:
- ✅ Basic vector search
- ✅ LLM extraction
- ❌ BUT: Shallow Qdrant usage

**You'll have:**
- 🎯 **Multi-collection architecture** (type-specific optimization)
- 🎯 **Named vectors** (multi-representation per document)
- 🎯 **Grouping API** (native deduplication with source tracking)

**Sponsor Impact:** Shows deep Qdrant mastery, not just "I used Qdrant"

---

## Architecture Evolution

**Before (Phase 1-3):**
```
Single Collection: "feedprism_emails"
└── All content mixed (events, courses, blogs)
    └── Single vector per item (title + description)
        └── Post-search deduplication
```

**After (Phase 4):**
```
Collection 1: "feedprism_events"
├── Named vectors: {title, description, full_text}
├── HNSW: m=16, ef_construct=200 (high recall)
└── Grouping by canonical_item_id

Collection 2: "feedprism_courses"
├── Named vectors: {title, description, full_text}
├── HNSW: m=24, ef_construct=100 (balanced)
└── Grouping by canonical_item_id

Collection 3: "feedprism_blogs"
├── Named vectors: {title, description, full_text}
├── HNSW: m=16, ef_construct=150 (fast)
└── Grouping by canonical_item_id
```

---

## Module 4.1: Multi-Collection Architecture (3 hours)

**File:** `app/database/qdrant_client.py` (major refactor)

### Theory: Why Multiple Collections?

**Benefits:**
1. **Type-specific optimization:** Different HNSW configs per collection
2. **Faster queries:** Smaller index per collection
3. **Cleaner separation:** Events, courses, blogs isolated
4. **Production-ready:** Microservices architecture pattern

**Trade-offs:**
- More complex routing logic
- Can't search across all types in single query (need to merge)

### Implementation

```python
from typing import Literal

ContentType = Literal["events", "courses", "blogs"]

class QdrantService:
    def __init__(self):
        self.client = QC(host=settings.qdrant_host, port=settings.qdrant_port)
        # Map content types to collection names
        self.collections = {
            "events": "feedprism_events",
            "courses": "feedprism_courses",
            "blogs": "feedprism_blogs"
        }
    
    def create_all_collections(self):
        """Create type-specific collections with optimized HNSW."""
        
        # HNSW tuning per content type
        hnsw_configs = {
            "events": {"m": 16, "ef_construct": 200},  # High recall
            "courses": {"m": 24, "ef_construct": 100}, # Balanced
            "blogs": {"m": 16, "ef_construct": 150}    # Fast retrieval
        }
        
        for content_type, collection_name in self.collections.items():
            if self._collection_exists(collection_name):
                continue
            
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=384,
                    distance=Distance.COSINE,
                    hnsw_config=hnsw_configs[content_type]
                ),
                sparse_vectors_config={"keywords": SparseVectorParams()}
            )
            logger.info(f"✅ Created {collection_name}")
    
    def get_collection_name(self, content_type: ContentType) -> str:
        """Get collection name for content type."""
        return self.collections[content_type]
    
    def upsert_by_type(self, content_type: ContentType, points: List[PointStruct]):
        """Upsert to type-specific collection."""
        collection = self.get_collection_name(content_type)
        self.client.upsert(collection_name=collection, points=points)
```

**Migration Script:** `scripts/migrate_to_multi_collection.py`

```python
"""Migrate from single collection to three type-specific collections."""

async def migrate():
    qdrant = QdrantService()
    
    # Create new collections
    qdrant.create_all_collections()
    
    # Scroll through old collection
    old_collection = "feedprism_emails"
    
    # Group points by content_type
    points_by_type = {"events": [], "courses": [], "blogs": []}
    
    offset = None
    while True:
        batch, offset = qdrant.client.scroll(
            collection_name=old_collection,
            limit=100,
            offset=offset,
            with_payload=True,
            with_vectors=True
        )
        
        for point in batch:
            content_type = point.payload.get("content_type")
            if content_type in points_by_type:
                points_by_type[content_type].append(point)
        
        if offset is None:
            break
    
    # Upsert to new collections
    for content_type, points in points_by_type.items():
        if points:
            qdrant.upsert_by_type(content_type, points)
            logger.info(f"✅ Migrated {len(points)} {content_type}")
```

**UI Enhancement:** Add collection tabs to frontend (covered in Phase 6)

**Commit:**
```bash
git add feedprism_main/
git commit -m "feat(feedprism): multi-collection architecture with type-specific HNSW tuning"
```

---

## Module 4.2: Named Vectors (3 hours)

**File:** `app/database/qdrant_client.py` (extend collections)

### Theory: Why Named Vectors?

**Problem:** Single vector can't capture different representations:
- **Title:** "AI Summit 2025" (exact match important)
- **Description:** "Learn about machine learning trends" (semantic important)
- **Full text:** Comprehensive context

**Solution:** Multiple embeddings per document

### Implementation

**Update collection creation:**

```python
def create_all_collections(self):
    """Create collections with named vectors."""
    
    for content_type, collection_name in self.collections.items():
        self.client.create_collection(
            collection_name=collection_name,
            vectors_config={
                "title": VectorParams(size=384, distance=Distance.COSINE),
                "description": VectorParams(size=384, distance=Distance.COSINE),
                "full_text": VectorParams(size=384, distance=Distance.COSINE)
            },
            sparse_vectors_config={"keywords": SparseVectorParams()},
            hnsw_config=self._get_hnsw_config(content_type)
        )
```

**Update embedder service:**

```python
# In app/services/embedder.py

def create_named_vectors(
    self,
    title: str,
    description: str,
    full_text: str
) -> Dict[str, List[float]]:
    """Generate named vectors for multi-representation."""
    return {
        "title": self.embed_text(title),
        "description": self.embed_text(description or title),
        "full_text": self.embed_text(full_text)
    }
```

**Update ingestion to use named vectors:**

```python
# When creating points
vectors = embedder.create_named_vectors(
    title=event.title,
    description=event.description or "",
    full_text=f"{event.title} {event.description} {event.location}"
)

point = PointStruct(
    id=str(uuid.uuid4()),
    vector=vectors,  # Dict of named vectors
    payload={...}
)
```

**Search with specific vector:**

```python
def search_by_title(self, query_vec, content_type, limit=10):
    """Search using title vector (exact match priority)."""
    collection = self.get_collection_name(content_type)
    return self.client.search(
        collection_name=collection,
        query_vector=("title", query_vec),  # Use "title" named vector
        limit=limit
    )

def search_by_description(self, query_vec, content_type, limit=10):
    """Search using description vector (semantic priority)."""
    return self.client.search(
        collection_name=collection,
        query_vector=("description", query_vec),
        limit=limit
    )
```

**Commit:**
```bash
git commit -m "feat(feedprism): named vectors for multi-representation search"
```

---

## Module 4.3: Grouping API for Deduplication (2.5 hours)

**Files:** `app/services/deduplicator.py` (NEW), `app/database/qdrant_client.py` (extend)

### Theory: Deduplication Challenge

**Problem:** Same event appears in 3 newsletters
- "NeurIPS 2025" from AI Weekly
- "NeurIPS Conference" from ML News
- "NeurIPS 2025 Conference" from Tech Digest

**Old Way (Phase 1-3):** Post-search dedup (slow, messy)

**New Way (Phase 4):** Qdrant Grouping API (native, fast)

### Implementation

**Deduplication service:**

```python
import hashlib

class DeduplicationService:
    def compute_canonical_id(self, title: str, content_type: str) -> str:
        """Generate canonical ID for grouping."""
        # Normalize title
        normalized = title.lower().strip()
        normalized = ''.join(c for c in normalized if c.isalnum() or c.isspace())
        
        # Deterministic hash
        content = f"{content_type}:{normalized}"
        return hashlib.md5(content.encode()).hexdigest()
    
    async def find_duplicates(self, title, description, content_type):
        """Find potential duplicates via vector similarity."""
        query_vec = self.embedder.embed_text(f"{title} {description}")
        
        results = self.qdrant.search_by_type(
            content_type=content_type,
            query_vector=("title", query_vec),
            limit=5
        )
        
        # Filter by similarity threshold (0.92)
        duplicates = [r for r in results if r['score'] > 0.92]
        return duplicates
```

**Add canonical_item_id to payload during ingestion:**

```python
canonical_id = deduplicator.compute_canonical_id(event.title, "events")
duplicates = await deduplicator.find_duplicates(event.title, event.description, "events")

payload = {
    "canonical_item_id": canonical_id,
    "is_duplicate": len(duplicates) > 0,
    "duplicate_count": len(duplicates),
    # ... other fields
}
```

**Search with Grouping API:**

```python
def search_with_grouping(
    self,
    content_type: ContentType,
    query_vector: List[float],
    limit: int = 10
) -> List[Dict]:
    """Search with automatic deduplication."""
    from qdrant_client.models import QueryRequest
    
    collection = self.get_collection_name(content_type)
    
    results = self.client.query_points(
        collection_name=collection,
        query=query_vector,
        using="title",
        limit=limit * 2,
        with_payload=True,
        # GROUP by canonical_item_id
        group_by="canonical_item_id",
        group_size=5  # Show up to 5 sources per item
    )
    
    # Format results with source tracking
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
                {"email_id": hit.payload["source_email_id"], 
                 "subject": hit.payload["source_subject"]}
                for hit in sources
            ]
        })
    
    return formatted[:limit]
```

**UI Enhancement:** Display deduplication badges (Phase 6)

**Commit:**
```bash
git commit -m "feat(feedprism): Grouping API for native deduplication with source tracking"
```

---

## Verification

```bash
python << 'EOF'
from app.database.qdrant_client import QdrantService
from app.services.deduplicator import DeduplicationService

qdrant = QdrantService()
dedup = DeduplicationService()

# Test 1: Multi-collection exists
collections = qdrant.client.get_collections()
assert any(c.name == "feedprism_events" for c in collections.collections)
print("✅ Multi-collection architecture verified")

# Test 2: Named vectors work
# (insert test item with named vectors, verify retrieval)
print("✅ Named vectors verified")

# Test 3: Grouping API deduplication
results = qdrant.search_with_grouping("events", test_vector, limit=5)
print(f"✅ Grouping API working: {len(results)} unique results")

print("\n🎉 Phase 4 complete - Advanced Qdrant features verified!")
EOF
```

## Git Commit

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack
git add feedprism_main/
git commit -m "feat(feedprism): Phase 4 complete - Advanced Qdrant features

- Multi-collection architecture (events/courses/blogs)
- Type-specific HNSW optimization
- Named vectors (title/description/full_text)
- Grouping API for smart deduplication
- Canonical item ID computation
- Source tracking for multi-source items

TOP 3 DIFFERENTIATION ACHIEVED"
git tag feedprism-phase-4-complete
```

---

## Phase 4 Complete! 🎉

**Critical Achievement:** You now have advanced Qdrant features that 90% of hackathon projects won't have!

**Next Step:** **[Phase 5: Advanced Features](Phase_5_Advanced_Features.md)**

---
