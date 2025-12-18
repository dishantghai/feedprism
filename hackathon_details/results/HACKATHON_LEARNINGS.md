# FeedPrism: Hackathon Learnings & Technical Deep Dive

**Hackathon:** Memory Over Models — AI Hackathon  
**Result:** 🥇 **First Place Winner**  
**Author:** Dishant Ghai  
**Date:** December 2025

---

## Executive Summary

FeedPrism won first place at the Memory Over Models Hackathon by demonstrating that **memory and retrieval quality—not model sophistication—determine usefulness** in AI applications. This document captures the technical learnings, Qdrant discoveries, and insights gained during the 10-day build.

The project transformed from "yet another RAG system" into a production-ready email intelligence platform by deeply leveraging Qdrant's advanced features—many of which we didn't know existed before this hackathon.

---

## 1. The "Memory Over Models" Philosophy

### What It Actually Means

The hackathon's theme wasn't just a catchy tagline. It represented a fundamental shift in how we approached the problem:

| Traditional Approach | Memory Over Models Approach |
|---------------------|----------------------------|
| Use bigger LLMs for better answers | Use better retrieval for accurate answers |
| Generate content on-the-fly | Remember and retrieve existing content |
| Hope the model knows the answer | Know exactly where the answer came from |
| Black-box responses | Source-traceable results |

### How FeedPrism Embodied This

1. **Zero Hallucination by Design** — Every extracted item stores `source_email_id`. Users can verify any claim by clicking through to the original email.

2. **The Vector Database IS the Product** — Qdrant isn't a backend implementation detail; it's the core value proposition. The quality of our search directly determines user value.

3. **Retrieval Over Generation** — We don't generate summaries or synthesize content. We extract, organize, and retrieve—ensuring provenance at every step.

---

## 2. Qdrant: From "Just a Vector Store" to Full-Featured Database

### Initial Misconception

Before this hackathon, my understanding of Qdrant was limited:
- "It stores vectors"
- "You search by similarity"
- "It's like Pinecone or Weaviate"

### What We Actually Discovered

Qdrant is a **complete database solution** with features that eliminated our need for PostgreSQL, Redis, or any secondary database.

#### 14 Qdrant Features We Used

| # | Feature | How We Used It | Mind-Blown Moment |
|---|---------|---------------|-------------------|
| 1 | **Multi-Collection** | Separate collections for events, courses, blogs | Each can have different HNSW configs! |
| 2 | **HNSW Tuning** | `m=16, ef_construct=200` for events | Realized m controls graph connectivity, ef controls build quality |
| 3 | **Named Vectors** | `title`, `description`, `full_text` per point | Same item, multiple search strategies |
| 4 | **Sparse Vectors** | BM25-style keyword matching | Exact term matching alongside semantic |
| 5 | **Hybrid Search** | Dense + Sparse fusion | Best of both worlds |
| 6 | **RRF Fusion** | `1/(k + rank)` with k=60 | Mathematical elegance of rank fusion |
| 7 | **Payload Filtering** | Filter BEFORE vector search | Huge performance gain |
| 8 | **Rich Payloads** | Store all metadata as queryable fields | Replaced need for SQL database |
| 9 | **Scroll API** | Efficient iteration for analytics | No expensive full retrievals |
| 10 | **DatetimeRange** | Time-based event filtering | Native temporal queries |
| 11 | **API Key Auth** | Secure production access | Enterprise-ready out of the box |
| 12 | **Grouping API** | Automatic deduplication | Canonical items without post-processing |
| 13 | **Idempotency Checks** | Prevent duplicate processing | Query by payload to check existence |
| 14 | **Collection Info** | Stats and health monitoring | Built-in observability |

---

## 3. Technical Deep Dives

### 3.1 Multi-Collection Architecture with Custom HNSW

**The Discovery:**
Each Qdrant collection can have its own HNSW parameters. This means you can optimize retrieval characteristics per content type.

**Our Implementation:**
```python
hnsw_configs = {
    "events": HnswConfigDiff(m=16, ef_construct=200),  # High Recall
    "courses": HnswConfigDiff(m=24, ef_construct=100), # Balanced
    "blogs": HnswConfigDiff(m=16, ef_construct=150)    # Fast Retrieval
}
```

**Why This Matters:**
- **Events:** High recall ensures you never miss an upcoming conference. We'd rather show 10 possibly-relevant events than miss the one you cared about.
- **Courses:** Balanced precision/recall because course searches are more intentional.
- **Blogs:** Fast retrieval because users browse articles quickly.

**The Learning:**
HNSW's `m` parameter controls how many connections each node has in the graph—higher means better recall but more memory. `ef_construct` controls index build quality—higher means slower indexing but better search accuracy.

### 3.2 Named Vectors: Multi-Representation Search

**The Discovery:**
A single point can store multiple named vectors, enabling different search strategies.

**Our Implementation:**
```python
vectors_config = {
    "title": VectorParams(size=384, distance=Distance.COSINE),
    "description": VectorParams(size=384, distance=Distance.COSINE),
    "full_text": VectorParams(size=384, distance=Distance.COSINE)
}
```

**Why This Matters:**
- Search by `title` for precise queries ("AI Summit 2025")
- Search by `full_text` for comprehensive semantic matching
- Search by `description` for balanced results

**The Learning:**
Multi-representation isn't just about storing more data—it's about giving users different "lenses" to search through the same content.

### 3.3 Hybrid Search with RRF Fusion

**The Problem:**
- Dense-only search misses exact keyword matches (dates, names, acronyms)
- Sparse-only search misses semantic relationships ("ML" ≠ "machine learning")

**Our Solution:**
```python
def hybrid_search(query_vector, query_text, ...):
    # Dense search (semantic)
    dense_results = client.search(query_vector=query_vector, ...)
    
    # Sparse search (BM25-style keywords)
    sparse_vec = create_sparse_vector(query_text)
    sparse_results = client.search(query_vector=sparse_vec, ...)
    
    # Reciprocal Rank Fusion
    return rrf_fusion(dense_results, sparse_results, k=60)
```

**RRF Algorithm:**
```python
def rrf_fusion(dense_results, sparse_results, k=60):
    scores = {}
    for rank, result in enumerate(dense_results, 1):
        scores[result.id] = scores.get(result.id, 0) + 1/(k + rank)
    for rank, result in enumerate(sparse_results, 1):
        scores[result.id] = scores.get(result.id, 0) + 1/(k + rank)
    return sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
```

**The Learning:**
The `k` parameter controls how much weight to give to rank differences. Higher `k` means ranks matter less; lower `k` means top ranks dominate. We found `k=60` gave good balance.

### 3.4 Sparse Vectors: The Hashing Trick

**The Challenge:**
BM25-style sparse vectors need consistent word-to-index mapping. Without a pre-built vocabulary, how do we ensure "apple" always maps to the same index?

**Our Solution:**
```python
def create_sparse_vector(text: str):
    words = re.findall(r'\b\w+\b', text.lower())
    word_counts = Counter(words)
    
    indices = []
    values = []
    for word, count in word_counts.items():
        # Hashing trick: consistent index for each word
        idx = hash(word) % 1000000
        indices.append(idx)
        values.append(float(count))
    
    return {"indices": indices, "values": values}
```

**The Learning:**
The "hashing trick" (also called feature hashing) allows vocabulary-free sparse representations. Collisions are rare enough with a large enough space (we used 1M dimensions).

### 3.5 Payload Filtering: Pre-Search Efficiency

**The Discovery:**
Qdrant filters happen BEFORE vector search, not after. This is a massive performance optimization.

**Traditional Approach (Wrong):**
1. Vector search all 100,000 documents
2. Return top 1,000
3. Filter to type="event" → 50 results
4. Return top 10

**Qdrant Approach (Right):**
1. Filter to type="event" → 5,000 candidates
2. Vector search only those 5,000
3. Return top 10

**Our Implementation:**
```python
query_filter = Filter(must=[
    FieldCondition(key="item_type", match=MatchValue(value="event")),
    FieldCondition(key="status", match=MatchValue(value="upcoming"))
])

results = client.search(
    collection_name="feedprism_events",
    query_vector=query_vector,
    query_filter=query_filter,  # Filters BEFORE search
    limit=10
)
```

**The Learning:**
Design your payloads with filtering in mind. Every field you might filter on should be a payload field.

### 3.6 Using Qdrant as the ONLY Database

**The Realization:**
We initially planned to use:
- Qdrant for vectors
- PostgreSQL for metadata
- Redis for caching

**What Actually Happened:**
Qdrant's payload system is so powerful that we eliminated the need for other databases entirely.

**What We Store in Payloads:**
```python
payload = {
    # Source traceability
    "source_email_id": "msg_abc123",
    "source_subject": "Weekly AI News",
    "sender": "newsletter@example.com",
    
    # Content metadata
    "title": "AI Summit 2025",
    "item_type": "event",
    "tags": ["AI", "Conference", "San Francisco"],
    
    # Temporal data
    "start_time": "2025-01-15T09:00:00Z",
    "extracted_at": "2024-12-01T10:30:00Z",
    
    # Display data
    "description": "Annual AI conference...",
    "location": "San Francisco, CA",
    "price": "$599",
    "registration_url": "https://...",
    
    # Deduplication
    "canonical_item_id": "evt_unique_123"
}
```

**The Learning:**
If your metadata is query-able and doesn't require complex joins, Qdrant payloads can replace your entire metadata store. This simplified our architecture dramatically.

---

## 4. Architecture Decisions & Tradeoffs

### 4.1 Separate Collections vs. Single Collection with Type Filter

**Option A: Single Collection**
```
feedprism_content (all items)
└── payload.item_type = "event" | "course" | "blog"
```

**Option B: Separate Collections (Our Choice)**
```
feedprism_events   (HNSW: high recall)
feedprism_courses  (HNSW: balanced)
feedprism_blogs    (HNSW: fast)
```

**Why We Chose B:**
1. Custom HNSW per content type
2. Independent scaling
3. Cleaner API design
4. Type-specific optimizations possible

**Tradeoff:**
Cross-type search requires querying multiple collections. We accepted this because most user queries are type-specific anyway.

### 4.2 Named Vectors vs. Separate Points

**Option A: Separate Points per Vector**
```
Point 1: {id: "evt_123_title", vector: [...], payload: {original_id: "evt_123"}}
Point 2: {id: "evt_123_desc", vector: [...], payload: {original_id: "evt_123"}}
```

**Option B: Named Vectors (Our Choice)**
```
Point: {
    id: "evt_123",
    vectors: {
        "title": [...],
        "description": [...],
        "full_text": [...]
    },
    payload: {...}
}
```

**Why We Chose B:**
1. Single point = single payload = simpler data model
2. No need to join results after search
3. Native Qdrant feature, not a workaround

### 4.3 Demo Mode: File-Based State vs. Qdrant

We needed demo mode to work without Gmail OAuth. Options:

**Option A: Store demo state in Qdrant**
**Option B: File-based JSON state (Our Choice)**

**Why B:**
- Demo state is ephemeral and user-specific
- Didn't want to pollute Qdrant with demo data
- Simple `data/demo_state.json` was sufficient

---

## 5. What Would We Improve?

### 5.1 Quantization

**What We Didn't Do:**
We used full 32-bit float vectors. Qdrant supports scalar and binary quantization for memory savings.

**What We'd Add:**
```python
collection.update_collection(
    quantization_config=ScalarQuantization(
        scalar=ScalarQuantizationConfig(
            type=ScalarType.INT8,
            quantile=0.99,
            always_ram=True
        )
    )
)
```

**Expected Benefit:**
4x memory reduction with minimal precision loss.

### 5.2 Reranking

**What We Have:**
RRF fusion of dense + sparse results.

**What We'd Add:**
Cross-encoder reranking for final precision boost.

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
scores = reranker.predict([(query, doc) for doc in top_k_docs])
```

### 5.3 Discovery API for Recommendations

**What We Explored But Didn't Ship:**
Qdrant's Discovery API for "more like this" recommendations.

```python
client.discover(
    collection_name="feedprism_events",
    target="evt_123",  # Show more like this
    context=[...],     # But not like these
    limit=5
)
```

**Why We Didn't Ship:**
Time constraints. The API is ready in our codebase but not exposed in the UI.

### 5.4 Sharding for Scale

**Current State:**
Single-node Qdrant, sufficient for demo scale.

**For Production:**
```yaml
# Qdrant Cloud or self-hosted cluster
collections:
  feedprism_events:
    shard_number: 3
    replication_factor: 2
```

---

## 6. Lamatic Integration: What Worked & What Didn't

### What Worked

We built a **Lamatic Bridge** service:
- Receives webhooks from Lamatic flows
- Forwards email data to FeedPrism
- FeedPrism extracts content and stores in Qdrant

**Architecture:**
```
Lamatic Flow → Webhook → Lamatic Bridge (port 8001) → FeedPrism API → Qdrant
```

### What Didn't Work

**Gmail Node is a paid feature in Lamatic.** We discovered this late in development. The flow we built:

```yaml
trigger: GMAIL_NEW_GMAIL_MESSAGE
→ process: Extract content
→ action: POST to FeedPrism webhook
```

...couldn't be deployed without a paid plan.

**The Pivot:**
We kept the bridge infrastructure and documented it as "Lamatic-ready." The backend is fully functional—just needs the Lamatic trigger.

### The Learning

Always verify integration requirements early. We spent hours building the bridge before discovering the Gmail limitation.

---

## 7. Key Metrics & Results

### Retrieval Quality

| Metric | Target | Achieved |
|--------|--------|----------|
| Precision@10 | ≥75% | ~82% |
| MRR | ≥0.6 | ~0.65 |
| Latency p95 | <800ms | ~450ms |
| Dedup Rate | ≥30% | ~23% |

### HNSW Benchmark Results

| Configuration | Precision@10 | Latency (p95) | Memory |
|---------------|--------------|---------------|--------|
| High Precision | 0.950 | 4.9ms | 1.46MB |
| Balanced | 0.950 | 1.6ms | 1.46MB |
| Fast | 0.950 | 1.8ms | 1.46MB |

### Extraction Stats (Demo Dataset)

- **Emails Processed:** 6 newsletters
- **Items Extracted:** 33 total
  - Events: 11
  - Courses: 5
  - Blogs: 17

---

## 8. Quotes That Guided Us

From the hackathon organizers:

> "Models are commodities. Anyone can call an API. But building systems that remember, retrieve, and reason? That's the skill gap."
> — Deepak Chawla, HiDevs

> "The best AI isn't about generating new content—it's about perfectly remembering and retrieving what already exists."
> — FeedPrism Philosophy

---

## 9. Acknowledgments

### Sponsors & Organizers

- **Qdrant** — For powering the vector infrastructure and sponsoring the hackathon
- **Neil Kanungo & Andre Zayarni** (Qdrant) — For backing this vision
- **Lamatic.ai** — For workflow orchestration capabilities
- **HiDevs** — Deepak Chawla and team for organizing
- **AI Collective** — For amplifying across the builder community

### Technical Gratitude

- **Sentence-Transformers** — For the excellent `all-MiniLM-L6-v2` model
- **Qdrant Documentation** — Genuinely excellent, made discovery possible
- **FastAPI** — For making Python APIs a joy to build

---

## 10. What's Next: From Hackathon to Product

FeedPrism isn't just a hackathon project—it's the foundation for **Spayce's Email Intelligence Layer**.

### Immediate (Post-Hackathon)
- [ ] Add cross-encoder reranking
- [ ] Implement scalar quantization
- [ ] Expose Discovery API in UI

### Short-Term (1-2 Months)
- [ ] Integrate with Spayce's Space/SubSpace hierarchy
- [ ] Add non-email sources (RSS, course platform APIs)
- [ ] Multi-user support with tenant isolation

### Long-Term Vision
FeedPrism becomes **Content Ingestion Engine** for Spayce—handling all external sources with a unified pipeline: Fetch → Parse → Extract → Embed → Store → Index.

---

## Conclusion

This hackathon transformed our understanding of vector databases. Qdrant isn't just "where you put vectors"—it's a complete solution for building memory-first AI applications.

The key insight: **The vector database IS the product.** When you design with retrieval quality as the north star, everything else follows.

---

*Document Version: 1.0*  
*Last Updated: December 2025*  
*Author: Dishant Ghai*
