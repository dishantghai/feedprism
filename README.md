# FeedPrism

**Transform email chaos into organized, searchable knowledge.**

[![Hackathon](https://img.shields.io/badge/Hackathon-Memory%20Over%20Models-purple)](https://lablab.ai)
[![Qdrant](https://img.shields.io/badge/Powered%20by-Qdrant-red)](https://qdrant.tech)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

FeedPrism is an intelligent email intelligence system that automatically extracts structured content from newsletters, event invites, and course announcements. It transforms messy HTML emails into organized, searchable knowledge using **Qdrant vector database** as its memory backbone.

**The Name:** Just like a prism refracts white light into a spectrum of colors, FeedPrism takes a messy **feed** of raw emails and refracts them into organized categories: **Events**, **Courses**, and **Blogs**.

### The Problem

- Professionals receive 50-200+ content-rich emails monthly
- Valuable content (events, courses, articles) gets buried in inbox chaos
- No semantic search across extracted content
- Duplicate content appears across multiple newsletters
- Events get missed, course deadlines pass unnoticed

### The Solution

FeedPrism uses **vector memory** and **intelligent extraction** to:
- Automatically extract events, courses, and blog articles from emails
- Store everything in Qdrant with rich metadata
- Enable hybrid semantic + keyword search
- Deduplicate content across sources
- Provide source traceability for every extracted item

---

## Qdrant Architecture

FeedPrism demonstrates **14 advanced Qdrant features** — not just basic vector storage.

### Multi-Collection Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Qdrant Collections                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  feedprism_events     feedprism_courses    feedprism_blogs
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  │ HNSW: m=16      │  │ HNSW: m=24      │  │ HNSW: m=16      │
│  │ ef_construct=200│  │ ef_construct=100│  │ ef_construct=150│
│  │ HIGH RECALL     │  │ BALANCED        │  │ FAST RETRIEVAL  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Each collection has **custom HNSW parameters** tuned for its use case:
- **Events:** High recall (never miss an upcoming conference)
- **Courses:** Balanced precision/recall
- **Blogs:** Fast retrieval for browsing

### Named Vectors (Multi-Representation)

Each item stores **3 named vectors** for different search strategies:

```python
vectors_config = {
    "title": VectorParams(size=384, distance=Distance.COSINE),
    "description": VectorParams(size=384, distance=Distance.COSINE),
    "full_text": VectorParams(size=384, distance=Distance.COSINE)
}
```

### Hybrid Search with RRF Fusion

We combine **dense** (semantic) and **sparse** (keyword) search:

```python
def hybrid_search(query_vector, query_text, ...):
    # Dense search (semantic similarity)
    dense_results = client.search(using="full_text", ...)
    
    # Sparse search (BM25-style keyword matching)
    sparse_results = client.search(using="keywords", ...)
    
    # Reciprocal Rank Fusion: 1/(k + rank), k=60
    return rrf_fusion(dense_results, sparse_results, k=60)
```

### Rich Payload Filtering

Every point stores queryable metadata:

```python
payload = {
    "source_email_id": "msg_abc123",      # Provenance
    "sender": "newsletter@coursera.org",
    "sender_email": "newsletter@coursera.org",
    "tags": ["AI", "Machine Learning"],
    "start_time": "2025-01-15T09:00:00Z", # For events
    "location": "San Francisco, CA",
    "provider": "Coursera",               # For courses
    "level": "Intermediate",
    "extracted_at": "2025-01-01T12:00:00Z"
}
```

Payload filtering happens **BEFORE** vector search for efficiency.

### Complete Qdrant Features Used

| Feature | Implementation |
|---------|----------------|
| Multi-Collection | 3 collections with different HNSW configs |
| HNSW Tuning | m=16-24, ef_construct=100-200 per type |
| Named Vectors | title, description, full_text |
| Sparse Vectors | BM25-style with hash % 1000000 |
| Hybrid Search | Dense + Sparse with RRF fusion |
| Payload Filtering | Pre-search filtering by type, sender, tags |
| Scroll API | Analytics and metrics computation |
| Discovery API | "More like this" recommendations |
| DatetimeRange | Time-based event filtering |
| API Key Auth | Secure access in production |
| Source Traceability | source_email_id for provenance |
| Idempotency | Check before duplicate processing |

---

## Tech Stack

### Backend
- **FastAPI** — Async Python web framework
- **Qdrant** — Vector database (local or cloud)
- **Sentence-Transformers** — all-MiniLM-L6-v2 (384D embeddings)
- **OpenAI/Gemini** — LLM for content extraction
- **Gmail API** — Email fetching (OAuth2)

### Frontend
- **React 19** — UI framework
- **TypeScript** — Type safety
- **TailwindCSS 4** — Styling
- **Lucide React** — Icons
- **Recharts** — Metrics visualization

### Infrastructure
- **Docker Compose** — Container orchestration
- **Nginx** — Frontend reverse proxy
- **Lamatic Bridge** — Webhook integration

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- OpenAI API key (or Google Gemini)

### 1. Clone & Configure

```bash
git clone https://github.com/dishantghai/feedprism.git
cd feedprism

# Create environment file
cp .env.example .env

# Edit .env with your keys
nano .env
```

Required environment variables:
```bash
OPENAI_API_KEY=sk-...           # Or GOOGLE_API_KEY for Gemini
QDRANT_API_KEY=your_secure_key  # For Qdrant authentication
DEMO_MODE=true                  # Use sample data for demo
```

### 2. Start with Docker Compose

```bash
# Build and start all services
docker compose up --build -d

# Verify containers are running
docker ps
```

This starts 4 containers:
| Container | Port | Purpose |
|-----------|------|---------|
| `feedprism-qdrant` | 6333 | Vector database |
| `feedprism-backend` | 8000 | FastAPI server |
| `feedprism-frontend` | 80 | React app (Nginx) |
| `feedprism-lamatic-bridge` | 8001 | Webhook receiver |

### 3. Open the App

```
http://localhost
```

---

## Local Development

For development without Docker:

```bash
# Terminal 1: Qdrant
docker run -p 6333:6333 -e QDRANT__SERVICE__API_KEY=dev_key qdrant/qdrant

# Terminal 2: Backend
cd feedprism_main
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
feedprism/
├── docker-compose.yml          # Container orchestration
├── feedprism_main/             # Backend (FastAPI)
│   ├── app/
│   │   ├── database/
│   │   │   └── qdrant_client.py    # Qdrant operations
│   │   ├── services/
│   │   │   ├── embedder.py         # Vector generation
│   │   │   ├── demo_service.py     # Demo data
│   │   │   └── ...
│   │   ├── routers/
│   │   │   ├── pipeline.py         # Extraction endpoints
│   │   │   ├── search.py           # Search endpoints
│   │   │   └── feed.py             # Feed endpoints
│   │   └── utils/
│   │       └── sparse_vector.py    # BM25 sparse vectors
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                   # Frontend (React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── prism/              # Extraction UI
│   │   │   ├── feed/               # Feed display
│   │   │   ├── search/             # Search & filters
│   │   │   └── views/              # Calendar, Gallery, Catalog
│   │   └── services/
│   │       └── api.ts              # API client
│   ├── Dockerfile
│   └── nginx.conf
└── lamatic_bridge/             # Lamatic integration
    ├── main.py
    └── Dockerfile
```

---

## Features

### Prism Overview
Real-time extraction with SSE streaming progress.

### Intelligent Feed
Mixed content feed with type badges, tags, and source attribution.

### Hybrid Search
Semantic + keyword search with instant results.

### Payload Filtering
Filter by type, sender, tags — all powered by Qdrant payloads.

### Source Traceability
Every item links back to its original email. Zero hallucination.

### Specialized Views
- **Events Calendar** — Events on a calendar grid
- **Blogs Gallery** — Article cards with previews
- **Courses Catalog** — Provider badges, levels, pricing

### Metrics Dashboard
Extraction stats, category counts, quality metrics.

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pipeline/extract` | POST | Start extraction (SSE) |
| `/api/search` | GET | Hybrid search |
| `/api/feed` | GET | Paginated feed |
| `/api/metrics` | GET | Dashboard metrics |
| `/api/lamatic/bridge` | POST | Lamatic webhook |

---

## Demo Mode

FeedPrism includes 6 pre-loaded sample newsletters for demonstration:

1. **Last Week in AI** — AI news, events, courses
2. **Coursera Weekly** — ML courses with metadata
3. **Eventbrite Digest** — Tech events with dates/locations
4. **The Pragmatic Engineer** — Engineering articles
5. **Python Weekly** — Python news and tutorials
6. **Hacker Newsletter** — HN top stories

Set `DEMO_MODE=true` to use sample data without Gmail OAuth.

---

## Hackathon Theme: Memory Over Models

FeedPrism embodies **"Memory Over Models"**:

1. **Persistent Memory** — Every extracted item becomes searchable knowledge
2. **Retrieval Over Generation** — We retrieve and organize, not fabricate
3. **Source Traceability** — Every item has provenance
4. **Temporal Awareness** — Time-based filtering via payloads
5. **Deduplication** — Vector similarity identifies duplicates
6. **The Vector Database IS the Product** — Qdrant is the core, not a backend detail

---

## Quality Metrics

| Metric | Value |
|--------|-------|
| Precision@10 | ~82% |
| MRR | ~0.65 |
| Latency p95 | <800ms |
| Dedup Rate | ~23% |

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- **Qdrant** — Vector database powering our memory layer
- **Lamatic** — Workflow automation integration
- **Memory Over Models Hackathon** — For the inspiration

---

**FeedPrism** — Transforming email chaos into organized knowledge.

*Built with ❤️ for the Memory Over Models Hackathon*
