# Phase 5: Advanced Features - Discovery API, Scroll API, Analytics & Benchmarking

**Goal:** Add showcase features (recommendations, analytics) and performance benchmarking to demonstrate production readiness.

**Estimated Time:** 8-10 hours

**Prerequisites:** Phase 4 complete (verified ✅)

---

## Overview

Phase 5 adds features that showcase Qdrant depth beyond basic search:
1.  **Discovery API:** Content recommendations ("Related items")
2. **Scroll API:** Email pattern analytics dashboard
3. **HNSW Benchmarking:** Documented optimization decisions

---

## Module 5.1: Discovery API for Recommendations (3 hours)

**File:** `app/services/recommender.py` (NEW)

### Theory: Discovery API

**Use Case:** User clicks "Intro to PyTorch" course → Show 5 related courses

**How it works:**
```
Target Item → Qdrant Discovery API → Similar Items
(uses vector + context for better recommendations)
```

### Implementation

```python
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
        target = self.qdrant.client.retrieve(
            collection_name=collection,
            ids=[item_id]
        )[0]
        
        # Use Discovery API
        results = self.qdrant.client.discover(
            collection_name=collection,
            target=target.id,
            limit=limit,
            with_payload=True
        )
        
        return [{"id": r.id, "score": r.score, "payload": r.payload} for r in results]
```

**FastAPI endpoint:**

```python
from app.services.recommender import RecommendationService

recommender = RecommendationService()

@app.get("/api/recommendations/{item_id}")
async def get_recommendations(item_id: str, content_type: str, limit: int = 5):
    """Get recommended items similar to given item."""
    recommendations = recommender.discover_similar(item_id, content_type, limit)
    return {"recommendations": recommendations}
```

**UI Enhancement:** Slide-out panel (Phase 6)

---

## Module 5.2: Scroll API for Email Analytics (3.5 hours)

**File:** `app/services/analytics.py` (NEW)

### Theory: Scroll API

**Use Case:** Analyze all emails to find patterns:
- How many AI events per month?
- Top event organizers?
- Most common course providers?

**Why Scroll API?**
- Efficiently batch-retrieve ALL points
- Pagination through large datasets
- No query needed (retrieves everything)

### Implementation

```python
from collections import Counter
from datetime import datetime, timedelta
from qdrant_client.models import Filter, FieldCondition, Range

class AnalyticsService:
    def __init__(self):
        self.qdrant = QdrantService()
    
    def get_email_stats(self, days: int = 30) -> Dict:
        """Get email statistics using Scroll API."""
        
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        stats = {
            "total_items": 0,
            "by_type": Counter(),
            "top_organizers": Counter(),
            "top_providers": Counter(),
            "top_tags": Counter()
        }
        
        # Scroll through all collections
        for content_type in ["events", "courses", "blogs"]:
            collection = self.qdrant.get_collection_name(content_type)
            offset = None
            
            while True:
                batch, offset = self.qdrant.client.scroll(
                    collection_name=collection,
                    scroll_filter=Filter(
                        must=[FieldCondition(
                            key="extracted_at",
                            range=Range(gte=cutoff_date)
                        )]
                    ),
                    limit=100,
                    offset=offset,
                    with_payload=True
                )
                
                for point in batch:
                    stats["total_items"] += 1
                    stats["by_type"][content_type] += 1
                    
                    # Analyze payload
                    if content_type == "events":
                        org = point.payload.get("organizer", "Unknown")
                        stats["top_organizers"][org] += 1
                    elif content_type == "courses":
                        prov = point.payload.get("provider", "Unknown")
                        stats["top_providers"][prov] += 1
                    
                    # Tags
                    for tag in point.payload.get("tags", []):
                        stats["top_tags"][tag] += 1
                
                if offset is None:
                    break
        
        return {
            "total_items": stats["total_items"],
            "by_type": dict(stats["by_type"]),
            "top_organizers": dict(stats["top_organizers"].most_common(10)),
            "top_providers": dict(stats["top_providers"].most_common(10)),
            "top_tags": dict(stats["top_tags"].most_common(20)),
            "avg_per_week": stats["total_items"] / (days / 7)
        }
```

**FastAPI endpoint:**

```python
analytics = AnalyticsService()

@app.get("/api/analytics")
async def get_analytics(days: int = 30):
    stats = analytics.get_email_stats(days)
    return stats
```

**UI Enhancement:** Analytics dashboard (Phase 6)

---

## Module 5.3: HNSW Benchmarking (2.5 hours)

**File:** `scripts/benchmark_hnsw.py` (NEW)

### Theory: HNSW Parameter Tuning

**Parameters:**
- **m**: Number of connections per node (higher = better recall, slower build)
- **ef_construct**: Build-time search depth (higher = better quality, slower build)

**Goal:** Find optimal balance for precision vs. latency

### Implementation

```python
"""Benchmark different HNSW configurations."""

import time
from qdrant_client.models import Distance, HnswConfigDiff

configs = [
    {"name": "High Precision", "m": 32, "ef_construct": 400},
    {"name": "Balanced", "m": 16, "ef_construct": 200},
    {"name": "Fast", "m": 8, "ef_construct": 100}
]

results = {}

for config in configs:
    # Create test collection
    collection_name = f"test_{config['name'].replace(' ', '_').lower()}"
    
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(
            size=384,
            distance=Distance.COSINE,
            hnsw_config=HnswConfigDiff(
                m=config["m"],
                ef_construct=config["ef_construct"]
            )
        )
    )
    
    # Insert 1000 test points
    # ... (insertion code) ...
    
    # Benchmark search
    start = time.time()
    for query in test_queries:
        client.search(collection_name, query_vector=query, limit=10)
    latency = (time.time() - start) / len(test_queries) * 1000  # ms
    
    # Calculate precision@10
    precision = calculate_precision(...)
    
    # Memory usage
    collection_info = client.get_collection(collection_name)
    memory_mb = collection_info.vectors_count * 384 * 4 / 1024 / 1024
    
    results[config["name"]] = {
        "precision@10": precision,
        "latency_p95_ms": latency,
        "memory_mb": memory_mb
    }
    
    # Cleanup
    client.delete_collection(collection_name)

# Save results
with open("docs/benchmarks.md", "w") as f:
    f.write("# HNSW Benchmark Results\n\n")
    f.write("| Configuration | Precision@10 | Latency (p95) | Memory |\n")
    f.write("|---------------|--------------|---------------|--------|\n")
    for name, metrics in results.items():
        f.write(f"| {name} | {metrics['precision@10']:.3f} | "
                f"{metrics['latency_p95_ms']:.1f}ms | "
                f"{metrics['memory_mb']:.0f}MB |\n")
```

**Run benchmark:**

```bash
python scripts/benchmark_hnsw.py
# Outputs: docs/benchmarks.md with results table
```

**Documentation:** Add benchmarks to README (Phase 6)

---

## Verification

```bash
python << 'EOF'
from app.services.recommender import RecommendationService
from app.services.analytics import AnalyticsService

# Test Discovery API
recommender = RecommendationService()
recs = recommender.discover_similar("test_id", "events", limit=5)
print(f"✅ Discovery API: {len(recs)} recommendations")

# Test Scroll API analytics
analytics = AnalyticsService()
stats = analytics.get_email_stats(days=30)
print(f"✅ Analytics: {stats['total_items']} items analyzed")

print("\n🎉 Phase 5 complete!")
EOF
```

## Git Commit

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack
git add feedprism_main/
git commit -m "feat(feedprism): Phase 5 complete - Advanced features

- Discovery API for content recommendations
- Scroll API for email pattern analytics
- HNSW benchmarking with documented decisions
- Analytics service for insights generation

Production-ready features showcased"
git tag feedprism-phase-5-complete
```

---

## Phase 5 Complete! 🎉

**Next Step:** **[UI & Demo Guide](UI_Demo_Guide.md)**

---
