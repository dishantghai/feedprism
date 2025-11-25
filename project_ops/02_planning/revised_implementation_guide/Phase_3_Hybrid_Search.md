# Phase 3: Hybrid Search - Dense + Sparse Vectors with Filtering

**Goal:** Add hybrid search (dense + sparse BM25), payload filtering, and time-aware queries for improved retrieval quality.

**Estimated Time:** 6-8 hours

**Prerequisites:** Phase 2 complete (verified ✅)

---

## Overview

### What We're Adding

**Current (Dense-only):**
```
Query → Embed → Dense Vector Search → Results
```

**Enhanced (Hybrid):**
```
Query → Embed (Dense) → ┐
Query → Tokenize (Sparse) → ├→ RRF Fusion → Filter → Results
                             ┘
```

**Key Improvements:**
1. **Sparse Vectors (BM25):** Keyword matching (complements semantic search)
2. **Reciprocal Rank Fusion (RRF):** Combine dense + sparse scores
3. **Payload Filtering:** Pre-filter by content_type, date, tags
4. **Time-aware Queries:** Upcoming events, recent articles

---

## Modules

### Module 3.1: Enable Sparse Vectors in Qdrant (2 hours)

**Update collection configuration:**

```python
# In qdrant_client.py create_collection method
from qdrant_client.models import VectorParams, SparseVectorParams

self.client.create_collection(
    collection_name=self.collection_name,
    vectors_config=VectorParams(
        size=384,
        distance=Distance.COSINE
    ),
    sparse_vectors_config={
        "keywords": SparseVectorParams()
    }
)
```

**Add BM25-like sparse vector generation:**

```python
def create_sparse_vector(text: str) -> dict:
    """Generate sparse vector from text (simple keyword extraction)."""
    import re
    from collections import Counter
    
    # Tokenize
    words = re.findall(r'\b\w+\b', text.lower())
    
    # Count frequencies (simple TF)
    word_counts = Counter(words)
    
    # Create sparse vector
    indices = list(range(len(word_counts)))
    values = list(word_counts.values())
    
    return {"indices": indices, "values": values}
```

---

### Module 3.2: Hybrid Search Implementation (2.5 hours)

**Add hybrid search method to Qdrant client:**

```python
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
    sparse_vec = create_sparse_vector(query_text)
    sparse_results = self.client.search(
        collection_name=self.collection_name,
        query_vector=("keywords", sparse_vec),
        limit=limit * 2
    )
    
    # RRF Fusion
    fused = self._rrf_fusion(dense_results, sparse_results, k=60)
    return fused[:limit]

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
    # Retrieve full payloads...
    return sorted_ids
```

**Verification:** Compare dense-only vs. hybrid search results

---

### Module 3.3: Payload Filtering (2 hours)

**Add filter support:**

```python
from qdrant_client.models import Filter, FieldCondition, MatchValue, Range

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
        collection_name=self.collection_name,
        query_vector=query_vector,
        query_filter=query_filter,
        limit=limit
    )
    
    return results
```

---

### Module 3.4: Time-Aware Queries (1.5 hours)

**Add helper methods:**

```python
from datetime import datetime, timedelta

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
```

---

## Verification

Run comprehensive search quality tests:

```bash
python << 'EOF'
from app.database.qdrant_client import QdrantService
from app.services.embedder import EmbeddingService

qdrant = QdrantService()
embedder = EmbeddingService()

query = "machine learning workshop"
query_vec = embedder.embed_text(query)

# Test 1: Dense-only search
dense_results = qdrant.search(query_vec, limit=5)
print(f"Dense-only: {len(dense_results)} results")

# Test 2: Hybrid search
hybrid_results = qdrant.hybrid_search(query_vec, query, limit=5)
print(f"Hybrid: {len(hybrid_results)} results")

# Test 3: Filtered search (events only)
filtered = qdrant.search_upcoming_events(query_vec, days_ahead=30, limit=5)
print(f"Upcoming events: {len(filtered)} results")

print("\n✅ All search modes working!")
EOF
```

## Git Commit

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack
git add feedprism_main/
git commit -m "feat(feedprism): Phase 3 complete - Hybrid search with filtering

- Sparse vectors (BM25) for keyword matching
- RRF fusion for dense + sparse combination
- Payload filtering (type, date, tags)
- Time-aware query helpers (upcoming, recent)

Search quality improved through hybrid approach"
git tag feedprism-phase-3-complete
```

---

## Phase 3 Complete! 🎉

**Next Step:** **[Phase 4: Qdrant Enhancements](Phase_4_Qdrant_Enhancements.md)**

---
