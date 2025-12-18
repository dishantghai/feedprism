# FeedPrism Implementation Handoff Document

**Version:** 1.0  
**Date:** December 18, 2025  
**Author:** FeedPrism Team  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Architecture Overview](#3-architecture-overview)
4. [Project Structure](#4-project-structure)
5. [Backend Implementation](#5-backend-implementation)
6. [Database Schema (Qdrant)](#6-database-schema-qdrant)
7. [API Reference](#7-api-reference)
8. [Frontend Implementation](#8-frontend-implementation)
9. [Services Deep Dive](#9-services-deep-dive)
10. [Configuration & Environment](#10-configuration--environment)
11. [Docker & Deployment](#11-docker--deployment)
12. [Integration Guide](#12-integration-guide)
13. [Data Flow & Pipelines](#13-data-flow--pipelines)
14. [Testing & Verification](#14-testing--verification)

---

## 1. Executive Summary

FeedPrism is an intelligent email intelligence system that transforms unstructured, content-rich emails (newsletters, event invites, course announcements) into organized, searchable knowledge. It uses **Qdrant vector database** for semantic search and **LLM-based extraction** to identify events, courses, and blog articles from HTML emails.

### Core Capabilities

- **Email Ingestion:** Gmail OAuth integration for fetching emails
- **Content Extraction:** LLM-powered extraction of events, courses, and blogs
- **Vector Storage:** Multi-collection Qdrant architecture with named vectors
- **Hybrid Search:** Dense (semantic) + Sparse (keyword) search with RRF fusion
- **Real-time Pipeline:** SSE streaming for extraction progress
- **Demo Mode:** Pre-loaded sample data for demonstrations

### System Components

| Component | Technology | Port | Purpose |
|-----------|------------|------|---------|
| Backend | FastAPI (Python) | 8000 | REST API server |
| Frontend | React + TypeScript | 80 (nginx) | Web UI |
| Vector DB | Qdrant | 6333/6334 | Semantic search |
| Lamatic Bridge | FastAPI | 8001 | Webhook integration |

---

## 2. Tech Stack & Dependencies

### Backend (Python 3.11+)

```
feedprism_main/requirements.txt
```

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| **Web Framework** | FastAPI | 0.115.0 | Async REST API |
| **ASGI Server** | uvicorn | 0.30.0 | Production server |
| **Validation** | pydantic | 2.9.0 | Data validation |
| **Settings** | pydantic-settings | 2.5.0 | Config management |
| **Gmail API** | google-api-python-client | 2.149.0 | OAuth & email fetch |
| **HTML Parsing** | beautifulsoup4 | 4.12.3 | Email parsing |
| **HTML→Text** | html2text | 2024.2.26 | Markdown conversion |
| **LLM** | openai | 1.51.0 | GPT-4o-mini extraction |
| **Embeddings** | sentence-transformers | 3.2.0 | Local embeddings |
| **ML Backend** | torch | 2.5.0 | PyTorch (CPU) |
| **Vector DB** | qdrant-client | 1.11.3 | Qdrant operations |
| **Logging** | loguru | 0.7.2 | Structured logging |
| **HTTP Client** | httpx | 0.27.2 | Async requests |

### Frontend (Node.js 18+)

```
frontend/package.json
```

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| **Framework** | React | 19.2.0 | UI framework |
| **Build Tool** | Vite | 7.2.4 | Dev server & bundler |
| **Language** | TypeScript | 5.9.3 | Type safety |
| **Styling** | TailwindCSS | 4.1.17 | Utility CSS |
| **Icons** | lucide-react | 0.555.0 | Icon components |
| **Charts** | recharts | 3.5.1 | Metrics visualization |

### Infrastructure

| Component | Image/Version | Purpose |
|-----------|---------------|---------|
| Qdrant | qdrant/qdrant:latest | Vector database |
| Python | 3.11-slim | Backend container base |
| Nginx | (via frontend Dockerfile) | Frontend reverse proxy |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FeedPrism System                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐      ┌─────────────────────────────────────────────────┐  │
│  │   Gmail     │      │                 Backend (FastAPI)                │  │
│  │   OAuth     │──────▶│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │  │
│  └─────────────┘      │  │ Pipeline│ │ Search  │ │  Feed   │ │Metrics│ │  │
│                       │  │ Router  │ │ Router  │ │ Router  │ │Router │ │  │
│                       │  └────┬────┘ └────┬────┘ └────┬────┘ └───┬───┘ │  │
│                       │       │           │           │          │     │  │
│                       │  ┌────▼───────────▼───────────▼──────────▼───┐ │  │
│                       │  │              Services Layer               │ │  │
│                       │  │ • GmailClient  • EmailParser              │ │  │
│                       │  │ • LLMExtractor • EmbeddingService         │ │  │
│                       │  │ • Orchestrator • DemoService              │ │  │
│                       │  └──────────────────────┬────────────────────┘ │  │
│                       │                         │                      │  │
│                       └─────────────────────────┼──────────────────────┘  │
│                                                 │                         │
│                       ┌─────────────────────────▼──────────────────────┐  │
│                       │                   Qdrant                        │  │
│                       │  ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │  │
│                       │  │feedprism_   │ │feedprism_   │ │feedprism_ │ │  │
│                       │  │events       │ │courses      │ │blogs      │ │  │
│                       │  │HNSW m=16    │ │HNSW m=24    │ │HNSW m=16  │ │  │
│                       │  │ef=200       │ │ef=100       │ │ef=150     │ │  │
│                       │  └─────────────┘ └─────────────┘ └───────────┘ │  │
│                       └────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────┐         ┌─────────────────────────────────┐ │
│  │    Frontend (React)     │◀────────│         Nginx Proxy             │ │
│  │  • Prism Overview       │         │  Port 80 → Backend :8000        │ │
│  │  • Feed/Search/Metrics  │         └─────────────────────────────────┘ │
│  └─────────────────────────┘                                             │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

1. **Ingestion:** Gmail API → Parser → LLM Extractor → Embedder → Qdrant
2. **Search:** Query → Embedder → Hybrid Search (Dense + Sparse) → RRF Fusion → Results
3. **Feed:** Qdrant Scroll → Payload Transform → Paginated Response

---

## 4. Project Structure

```
mom_hack/
├── feedprism_main/                 # Backend (FastAPI)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py               # Pydantic settings
│   │   ├── main.py                 # FastAPI app & routers
│   │   ├── database/
│   │   │   └── qdrant_client.py    # Qdrant operations (691 lines)
│   │   ├── models/
│   │   │   ├── api.py              # API response models
│   │   │   └── extraction.py       # Extraction schemas (LLM output)
│   │   ├── routers/
│   │   │   ├── __init__.py         # Router exports
│   │   │   ├── pipeline.py         # Extraction pipeline (SSE)
│   │   │   ├── search.py           # Search endpoints
│   │   │   ├── feed.py             # Feed endpoints
│   │   │   ├── metrics.py          # Metrics/analytics
│   │   │   ├── emails.py           # Email operations
│   │   │   ├── demo.py             # Demo mode
│   │   │   └── lamatic_bridge.py   # Webhook integration
│   │   ├── services/
│   │   │   ├── gmail_client.py     # Gmail API wrapper
│   │   │   ├── parser.py           # HTML email parser
│   │   │   ├── extractor.py        # LLM extraction
│   │   │   ├── embedder.py         # Sentence embeddings
│   │   │   ├── orchestrator.py     # Pipeline coordination
│   │   │   ├── demo_service.py     # Demo data generator
│   │   │   ├── deduplicator.py     # Content deduplication
│   │   │   ├── recommender.py      # Similar items (Discovery API)
│   │   │   └── analytics.py        # Usage analytics
│   │   └── utils/
│   │       └── sparse_vector.py    # BM25-style sparse vectors
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                        # Frontend (React)
│   ├── src/
│   │   ├── App.tsx                 # Main app component
│   │   ├── main.tsx                # Entry point
│   │   ├── index.css               # Global styles (TailwindCSS)
│   │   ├── components/             # UI components
│   │   ├── services/
│   │   │   └── api.ts              # API client (564 lines)
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript interfaces
│   │   ├── hooks/                  # Custom hooks
│   │   └── contexts/               # React contexts
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
│
├── lamatic_bridge/                  # Lamatic webhook bridge
│   ├── main.py
│   └── Dockerfile
│
├── docker-compose.yml              # Container orchestration
├── feedprism_master_context.md     # Product vision document
└── README.md                       # Project documentation
```

---

## 5. Backend Implementation

### 5.1 Application Entry Point

**File:** `feedprism_main/app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="FeedPrism API",
    description="Email intelligence API for extracting and organizing content",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(feed_router)       # /api/feed
app.include_router(emails_router)     # /api/emails
app.include_router(search_router)     # /api/search
app.include_router(metrics_router)    # /api/metrics
app.include_router(pipeline_router)   # /api/pipeline
app.include_router(demo_router)       # /api/demo
app.include_router(lamatic_router)    # /api/lamatic
```

### 5.2 Configuration Management

**File:** `feedprism_main/app/config.py`

Uses Pydantic Settings for type-safe configuration:

```python
class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str
    
    # Gmail
    gmail_credentials_path: Path = Path("credentials.json")
    gmail_token_path: Path = Path("token.json")
    
    # Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_api_key: str | None = None
    
    # Embeddings
    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    
    # LLM
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.0
    llm_max_tokens: int = 2000
    
    # Pipeline
    email_fetch_hours_back: int = 24
    email_max_limit: int = 50
    
    # Demo Mode
    demo_mode: bool = False
    demo_user_name: str = "Demo User"
    demo_user_email: str = "demo@feedprism.app"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        frozen=True
    )

settings = Settings()
```

### 5.3 Router Structure

| Router | Prefix | Purpose |
|--------|--------|---------|
| `feed_router` | `/api/feed` | Paginated content feed |
| `emails_router` | `/api/emails` | Email operations |
| `search_router` | `/api/search` | Hybrid search |
| `metrics_router` | `/api/metrics` | Dashboard analytics |
| `pipeline_router` | `/api/pipeline` | Extraction pipeline |
| `demo_router` | `/api/demo` | Demo mode operations |
| `lamatic_router` | `/api/lamatic` | Webhook integration |

---

## 6. Database Schema (Qdrant)

### 6.1 Multi-Collection Architecture

FeedPrism uses **3 separate Qdrant collections** with content-type-specific HNSW tuning:

```python
collections = {
    "events": "feedprism_events",    # HNSW m=16, ef_construct=200 (High Recall)
    "courses": "feedprism_courses",  # HNSW m=24, ef_construct=100 (Balanced)
    "blogs": "feedprism_blogs"       # HNSW m=16, ef_construct=150 (Fast)
}
```

### 6.2 Named Vectors Configuration

Each collection stores **3 named dense vectors** + **1 sparse vector**:

```python
vectors_config = {
    "title": VectorParams(size=384, distance=Distance.COSINE),
    "description": VectorParams(size=384, distance=Distance.COSINE),
    "full_text": VectorParams(size=384, distance=Distance.COSINE)
}

sparse_vectors_config = {
    "keywords": SparseVectorParams()  # For BM25-style lexical search
}
```

### 6.3 Payload Schema

Every point stores rich metadata for filtering:

```python
# Common payload fields (all content types)
payload = {
    # Source Traceability
    "source_email_id": "msg_abc123",        # Gmail message ID
    "source_subject": "Weekly Newsletter",
    "source_sender": "Newsletter Name",
    "source_sender_email": "news@example.com",
    "source_received_at": "2025-01-15T10:00:00Z",
    
    # Content Fields
    "title": "Event/Course/Blog Title",
    "description": "Full description text",
    "hook": "Compelling summary",
    "tags": ["AI", "Machine Learning"],
    "url": "https://registration-link.com",
    "image_url": "https://image.url/banner.jpg",
    "is_free": True,
    
    # Metadata
    "extracted_at": "2025-01-15T12:00:00Z",
    "canonical_item_id": "uuid-for-dedup",
}

# Event-specific fields
event_payload = {
    **payload,
    "start_time": "2025-01-20T14:00:00Z",
    "end_time": "2025-01-20T16:00:00Z",
    "timezone": "America/New_York",
    "location": "Online",
    "organizer": "AI Conference",
    "event_type": "webinar",  # webinar/conference/workshop/meetup/talk/hackathon
    "cost": "Free"
}

# Course-specific fields
course_payload = {
    **payload,
    "provider": "Coursera",
    "instructor": "John Doe",
    "level": "intermediate",  # beginner/intermediate/advanced/all_levels
    "duration": "6 weeks",
    "certificate_offered": True,
    "what_you_learn": ["Skill 1", "Skill 2"]
}

# Blog-specific fields
blog_payload = {
    **payload,
    "author": "Jane Smith",
    "author_title": "CTO at Startup",
    "published_date": "2025-01-10",
    "source": "Tech Blog",
    "category": "AI",
    "reading_time": "5 min read",
    "key_points": ["Point 1", "Point 2"]
}
```

### 6.4 Auxiliary Collection

```python
# Tracks all processed emails (including those with 0 extractions)
attempted_emails_collection = "feedprism_attempted_emails"

payload = {
    "email_id": "msg_abc123",
    "attempted_at": "2025-01-15T12:00:00Z"
}
```

---

## 7. API Reference

### 7.1 Feed Endpoints

#### `GET /api/feed`
Get paginated feed of all extracted items.

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `page_size` | int | 20 | Items per page (max 100) |
| `types` | string | null | Comma-separated: `event,course,blog` |
| `senders` | string | null | Comma-separated sender emails |
| `tags` | string | null | Comma-separated tags |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid-123",
      "email_id": "msg_abc",
      "email_subject": "Weekly Newsletter",
      "sender": "AI Weekly",
      "sender_email": "news@aiweekly.co",
      "received_at": "2025-01-15T10:00:00Z",
      "item_type": "event",
      "title": "AI Conference 2025",
      "hook": "The biggest AI event of the year",
      "description": "Full description...",
      "image_url": "https://...",
      "tags": ["AI", "Conference"],
      "url": "https://register.com",
      "start_time": "2025-02-15T09:00:00Z",
      "location": "San Francisco",
      "score": 0.95,
      "extracted_at": "2025-01-15T12:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "has_more": true
}
```

#### `GET /api/feed/by-type/{type}`
Get items filtered by content type (optimized).

#### `GET /api/feed/{item_id}`
Get single item details.

**Parameters:**
- `item_type`: Required query param (`event`, `course`, `blog`)

#### `GET /api/feed/senders`
Get all unique senders with counts.

**Response:**
```json
{
  "senders": [
    {"email": "news@aiweekly.co", "display_name": "AI Weekly", "count": 25},
    {"email": "learn@coursera.org", "display_name": "Coursera", "count": 18}
  ],
  "total": 12
}
```

---

### 7.2 Search Endpoints

#### `POST /api/search`
Hybrid search with filters.

**Request Body:**
```json
{
  "query": "machine learning workshop",
  "types": ["event", "course"],
  "tags": ["AI"],
  "date_from": "2025-01-01",
  "date_to": "2025-12-31",
  "limit": 20
}
```

**Response:**
```json
{
  "results": [/* FeedItem array */],
  "total": 15,
  "query": "machine learning workshop"
}
```

#### `GET /api/search/quick`
Quick search for command palette.

**Parameters:**
- `q`: Search query
- `limit`: Max results (default 10)

---

### 7.3 Pipeline Endpoints

#### `GET /api/pipeline/unprocessed-emails`
Get emails not yet processed.

**Parameters:**
- `hours_back`: Hours to look back (uses settings default if not provided)

**Response:**
```json
{
  "unprocessed_count": 25,
  "total_fetched": 100,
  "processed_count": 75,
  "hours_back": 48,
  "emails": [
    {
      "id": "msg_abc123",
      "subject": "Newsletter Title",
      "sender": "Sender Name",
      "sender_email": "sender@example.com",
      "received_at": "2025-01-15T10:00:00Z",
      "snippet": "First 100 chars...",
      "body_text": "Full text...",
      "body_html": "<html>..."
    }
  ]
}
```

#### `POST /api/pipeline/extract`
Start extraction pipeline with SSE streaming.

**Request Body:**
```json
["msg_id1", "msg_id2", "msg_id3"]
```

**Response:** Server-Sent Events stream

```
event: start
data: {"message": "Starting extraction pipeline", "total": 3}

event: fetch
data: {"current": 1, "total": 3, "message": "Fetching email 1/3", "email_id": "msg_id1", "subject": "Newsletter"}

event: parse
data: {"current": 1, "message": "Parsing email HTML", "email_id": "msg_id1"}

event: extract
data: {"current": 1, "message": "Extracting content", "events": 2, "courses": 1, "blogs": 3}

event: ingest
data: {"current": 1, "message": "Ingesting to Qdrant", "events_total": 2, "courses_total": 1, "blogs_total": 3}

event: progress
data: {"current": 2, "total": 3, "events": 5, "courses": 2, "blogs": 8, "message": "Processing..."}

event: complete
data: {"message": "Extraction complete", "total_extracted": 33, "events": 11, "courses": 5, "blogs": 17, "emails_processed": 3, "errors": 0}
```

#### `GET /api/pipeline/extraction-status`
Get current extraction status (for SSE reconnection).

**Response:**
```json
{
  "is_extracting": true,
  "progress": {
    "current": 5,
    "total": 10,
    "events": 12,
    "courses": 3,
    "blogs": 8,
    "message": "Extracting content",
    "emails_processed": 5,
    "errors": 0
  },
  "started_at": "2025-01-15T12:00:00Z"
}
```

#### `GET /api/pipeline/settings`
Get current pipeline configuration.

#### `POST /api/pipeline/settings`
Update runtime settings.

**Parameters:**
- `email_max_limit`: 1-500
- `email_fetch_hours_back`: 1-240

#### `POST /api/pipeline/re-extract`
Re-extract content from existing emails (deletes and re-processes).

#### `GET /api/pipeline/processed-emails`
Get all processed email IDs.

#### `POST /api/pipeline/reset-fetch-lock`
Reset stuck fetch lock (recovery endpoint).

---

### 7.4 Metrics Endpoints

#### `GET /api/metrics`
Get dashboard metrics.

**Parameters:**
- `days`: Time range (default 30)

**Response:**
```json
{
  "total_emails_processed": 156,
  "total_items_extracted": 423,
  "categories": [
    {"type": "event", "count": 187, "icon": "📅"},
    {"type": "course", "count": 98, "icon": "📚"},
    {"type": "blog", "count": 138, "icon": "📝"}
  ],
  "top_tags": {"AI": 89, "Machine Learning": 67, "Python": 45},
  "last_sync": "2025-01-15T12:00:00Z",
  "precision": 0.82,
  "mrr": 0.65,
  "avg_latency_ms": 450.5,
  "dedup_rate": 0.23
}
```

#### `GET /api/metrics/history`
Get historical metrics for trend charts (24 data points).

#### `GET /api/metrics/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "qdrant": "connected",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

---

### 7.5 Demo Mode Endpoints

#### `GET /api/demo/status`
Check demo mode status.

#### `GET /api/demo/config`
Get full demo configuration.

#### `POST /api/demo/toggle`
Enable/disable demo mode.

#### `POST /api/demo/reset`
Reset demo state (clear extracted items, reload demo emails).

#### `GET /api/demo/emails/unprocessed`
Get demo emails available for extraction.

#### `GET /api/demo/user`
Get demo user information.

---

### 7.6 Recommendations Endpoint

#### `GET /api/recommendations/{item_id}`
Get similar items (Qdrant Discovery API).

**Parameters:**
- `content_type`: event/course/blog
- `limit`: Max results (default 5)

---

### 7.7 Analytics Endpoint

#### `GET /api/analytics`
Get email statistics.

**Parameters:**
- `days`: Time range (default 30)

---

## 8. Frontend Implementation

### 8.1 API Client

**File:** `frontend/src/services/api.ts`

The API client provides typed functions for all backend endpoints:

```typescript
// Feed API
export async function getFeed(page, pageSize, types?, senders?, tags?): Promise<FeedResponse>
export async function getSenders(): Promise<SendersResponse>
export async function getFeedByType(type, page, pageSize): Promise<FeedResponse>
export async function getFeedItem(itemId, itemType): Promise<FeedItem>

// Search API
export async function search(request: SearchRequest): Promise<SearchResponse>
export async function quickSearch(query, limit): Promise<SearchResponse>

// Pipeline API
export async function getUnprocessedEmails(hoursBack?): Promise<UnprocessedEmailsResponse>
export async function getExtractionStatus(): Promise<ExtractionStatusResponse>
export function startExtraction(emailIds, onEvent, onError, onComplete): AbortFunction
export function startReExtraction(emailIds, onEvent, onError, onComplete): AbortFunction

// Metrics API
export async function getMetrics(days): Promise<MetricsResponse>
export async function getHealthCheck(): Promise<HealthResponse>

// Demo API
export async function getDemoStatus(): Promise<DemoStatus>
export async function getDemoConfig(): Promise<DemoConfig>
export async function toggleDemoMode(enabled): Promise<DemoStatus>
export async function resetDemoState(): Promise<DemoResetResponse>
```

### 8.2 TypeScript Types

**File:** `frontend/src/types/index.ts`

```typescript
export type ItemType = 'event' | 'course' | 'blog';
export type EventType = 'webinar' | 'conference' | 'workshop' | 'meetup' | 'talk' | 'hackathon' | 'other';

export interface FeedItem {
    id: string;
    email_id: string;
    email_subject: string;
    sender: string;
    sender_email: string;
    received_at: string;
    item_type: ItemType;
    title: string;
    hook?: string;
    description?: string;
    image_url?: string;
    tags: string[];
    url?: string;
    is_free?: boolean;
    
    // Event-specific
    start_time?: string;
    end_time?: string;
    timezone?: string;
    location?: string;
    organizer?: string;
    event_type?: EventType;
    cost?: string;
    
    // Course-specific
    provider?: string;
    instructor?: string;
    level?: string;
    duration?: string;
    certificate_offered?: boolean;
    what_you_learn?: string[];
    
    // Blog-specific
    author?: string;
    author_title?: string;
    source?: string;
    category?: string;
    reading_time?: string;
    published_date?: string;
    key_points?: string[];
    
    // Metadata
    score?: number;
    extracted_at?: string;
}

export interface SearchRequest {
    query: string;
    types?: ItemType[];
    tags?: string[];
    date_from?: string;
    date_to?: string;
    limit?: number;
}

export interface MetricsResponse {
    total_emails_processed: number;
    total_items_extracted: number;
    categories: CategoryCount[];
    top_tags: Record<string, number>;
    precision?: number;
    mrr?: number;
    avg_latency_ms?: number;
    dedup_rate?: number;
}
```

---

## 9. Services Deep Dive

### 9.1 Gmail Client

**File:** `feedprism_main/app/services/gmail_client.py`

```python
class GmailClient:
    """Gmail API client with OAuth 2.0 authentication."""
    
    def list_messages(self, query: str, max_results: int) -> List[Dict]
    def list_messages_paginated(self, query, page_size, page_token) -> Tuple[List, str]
    def get_message(self, message_id: str, retries: int = 3) -> Dict
    def get_messages_batch(self, message_ids: List[str]) -> List[Dict]
    def parse_message_headers(self, message: Dict) -> Dict
    def extract_body(self, message: Dict) -> Dict  # Returns {body_html, body_text}
    def fetch_content_rich_emails(self, days_back, max_results) -> List[Dict]
```

**Query Patterns:**
```python
# Fetch newsletters from last 30 days
query = "after:2024/12/18 category:promotions OR category:updates"
```

### 9.2 Email Parser

**File:** `feedprism_main/app/services/parser.py`

```python
class EmailParser:
    """HTML email parser with cleaning and text extraction."""
    
    def parse_html_email(self, html_content: str) -> Dict:
        """
        Returns:
            - clean_html: Cleaned HTML (scripts/styles removed)
            - text: Plain text with preserved structure
            - title: Extracted title
            - links: List of {text, url}
            - images: List of {src, alt}
        """
    
    def _clean_html(self, soup: BeautifulSoup) -> BeautifulSoup
    def _html_to_text(self, html: str) -> str
    def _extract_images(self, soup: BeautifulSoup) -> List[Dict]
    def _extract_links(self, soup: BeautifulSoup) -> List[Dict]
```

### 9.3 LLM Extractor

**File:** `feedprism_main/app/services/extractor.py`

```python
class LLMExtractor:
    """LLM-based extractor using OpenAI structured output."""
    
    def __init__(self, api_key=None, model=None):
        self.client = AsyncOpenAI(api_key=api_key or settings.openai_api_key)
        self.model = model or settings.llm_model
    
    async def extract_events(self, email_text, email_subject) -> EventExtractionResult
    async def extract_courses(self, email_text, email_subject) -> CourseExtractionResult
    async def extract_blogs(self, email_text, email_subject, images=None) -> BlogExtractionResult
```

**Extraction Models (Pydantic):**

```python
class ExtractedEvent(BaseModel):
    title: str
    hook: Optional[str]
    description: Optional[str]
    event_type: Optional[EventType]
    image_url: Optional[str]
    start_time: Optional[str]  # ISO 8601
    end_time: Optional[str]
    timezone: Optional[str]
    location: Optional[str]
    registration_link: Optional[str]
    tags: List[str]
    organizer: Optional[str]
    cost: Optional[str]
    is_free: Optional[bool]

class EventExtractionResult(BaseModel):
    events: List[ExtractedEvent]
    confidence: float  # 0.0 - 1.0
```

### 9.4 Embedding Service

**File:** `feedprism_main/app/services/embedder.py`

```python
class EmbeddingService:
    """Sentence-transformers embedding service."""
    
    def __init__(self, model_name=None):
        self.model = SentenceTransformer(
            model_name or settings.embedding_model_name
        )
        self.dimension = settings.embedding_dimension  # 384
    
    def embed_text(self, text: str) -> List[float]
    def embed_batch(self, texts: List[str], batch_size=32) -> List[List[float]]
    def create_named_vectors(self, title, description, full_text) -> Dict[str, List[float]]
```

### 9.5 Qdrant Service

**File:** `feedprism_main/app/database/qdrant_client.py`

```python
class QdrantService:
    """Qdrant vector database operations."""
    
    # Collection Management
    def create_all_collections(self, recreate=False) -> None
    def get_collection_name(self, content_type: ContentType) -> str
    def get_collection_info(self, content_type) -> Dict
    
    # Point Operations
    def upsert_by_type(self, content_type, points: List[PointStruct]) -> None
    def get_point(self, point_id, content_type) -> Optional[Dict]
    def delete_points(self, point_ids, content_type) -> None
    def delete_by_email_ids(self, email_ids: List[str]) -> Dict[str, int]
    
    # Search
    def search(self, query_vector, content_type, vector_name="title", limit=10, filter_dict=None) -> List[Dict]
    def hybrid_search(self, query_vector, query_text, content_type, limit=10) -> List[Dict]
    def search_with_filters(self, query_vector, content_type, date_range=None, tags=None, limit=10) -> List[Dict]
    def search_with_grouping(self, query_vector, content_type, vector_name="title", limit=10, group_size=3) -> List[Dict]
    def search_upcoming_events(self, query_vector, days_ahead=30, limit=10) -> List[Dict]
    def search_recent_blogs(self, query_vector, days_back=7, limit=10) -> List[Dict]
    
    # Email Tracking
    def get_processed_email_ids(self) -> set
    def is_email_processed(self, email_id: str) -> bool
    def mark_emails_as_attempted(self, email_ids: List[str]) -> int
    def get_attempted_email_ids(self) -> set
```

**Hybrid Search Implementation:**

```python
def hybrid_search(self, query_vector, query_text, content_type, limit=10):
    # Dense search (semantic)
    dense_results = self.client.search(
        collection_name=collection,
        query_vector=query_vector,
        limit=limit * 2
    )
    
    # Sparse search (keyword)
    sparse_vec = create_sparse_vector(query_text)
    sparse_results = self.client.search(
        collection_name=collection,
        query_vector=NamedSparseVector(name="keywords", vector=sparse_vec),
        limit=limit * 2
    )
    
    # RRF Fusion
    fused_ids = self._rrf_fusion(dense_results, sparse_results, k=60)
    return self._retrieve_by_ids(fused_ids[:limit])

def _rrf_fusion(self, dense_results, sparse_results, k=60):
    """Reciprocal Rank Fusion: score = Σ 1/(k + rank)"""
    scores = {}
    for rank, result in enumerate(dense_results, 1):
        scores[result.id] = scores.get(result.id, 0) + 1 / (k + rank)
    for rank, result in enumerate(sparse_results, 1):
        scores[result.id] = scores.get(result.id, 0) + 1 / (k + rank)
    return sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
```

### 9.6 Sparse Vector Utility

**File:** `feedprism_main/app/utils/sparse_vector.py`

```python
def create_sparse_vector(text: str) -> Dict[str, List]:
    """
    Generate BM25-style sparse vector using hashing trick.
    
    Returns: {"indices": [int], "values": [float]}
    """
    words = re.findall(r'\b\w+\b', text.lower())
    word_counts = Counter(words)
    
    indices = []
    values = []
    
    for word, count in word_counts.items():
        idx = hash(word) % 1000000  # Hashing trick
        indices.append(idx)
        values.append(float(count))
    
    return {"indices": indices, "values": values}
```

---

## 10. Configuration & Environment

### 10.1 Environment Variables

**File:** `feedprism_main/.env.example`

```bash
# Required
OPENAI_API_KEY=sk-...

# Qdrant (optional for local, required for cloud)
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_API_KEY=your_secure_key

# Gmail OAuth (optional if demo mode)
GMAIL_CREDENTIALS_PATH=credentials.json
GMAIL_TOKEN_PATH=token.json

# Demo Mode
DEMO_MODE=true
DEMO_USER_NAME=Demo User
DEMO_USER_EMAIL=demo@feedprism.app

# LLM Settings
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.0
LLM_MAX_TOKENS=2000

# Embedding Settings
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# Pipeline Settings
EMAIL_FETCH_HOURS_BACK=24
EMAIL_MAX_LIMIT=50

# Logging
LOG_LEVEL=INFO
```

### 10.2 Root-level Environment

**File:** `.env` (for Docker Compose)

```bash
OPENAI_API_KEY=sk-...
QDRANT_API_KEY=your_secure_key
DEMO_MODE=true
DEMO_USER_NAME=Demo User
DEMO_USER_EMAIL=demo@feedprism.app
LOG_LEVEL=INFO
```

---

## 11. Docker & Deployment

### 11.1 Docker Compose

**File:** `docker-compose.yml`

```yaml
services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: feedprism-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    environment:
      - QDRANT__SERVICE__API_KEY=${QDRANT_API_KEY}
    volumes:
      - qdrant_data:/qdrant/storage

  backend:
    build:
      context: ./feedprism_main
      dockerfile: Dockerfile
    container_name: feedprism-backend
    ports:
      - "8000:8000"
    environment:
      - QDRANT_HOST=qdrant
      - QDRANT_PORT=6333
      - QDRANT_API_KEY=${QDRANT_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DEMO_MODE=${DEMO_MODE:-true}
    volumes:
      - ./feedprism_main/data:/app/data
      - ./feedprism_main/token.json:/app/token.json
      - ./feedprism_main/credentials.json:/app/credentials.json
    depends_on:
      - qdrant

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: feedprism-frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  lamatic-bridge:
    build:
      context: ./lamatic_bridge
      dockerfile: Dockerfile
    container_name: feedprism-lamatic-bridge
    ports:
      - "8001:8001"
    environment:
      - FEEDPRISM_URL=http://backend:8000
      - QDRANT_HOST=qdrant
      - QDRANT_PORT=6333
    depends_on:
      - backend
      - qdrant

volumes:
  qdrant_data:
```

### 11.2 Backend Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 11.3 Deployment Commands

```bash
# Start all services
docker compose up --build -d

# View logs
docker compose logs -f backend

# Restart specific service
docker compose restart backend

# Stop all
docker compose down

# Stop and remove volumes (reset data)
docker compose down -v
```

---

## 12. Integration Guide

### 12.1 Integrating with FeedPrism APIs

#### Authentication

Currently, FeedPrism uses Qdrant API key authentication for the vector database. The REST API itself is open (configure behind a reverse proxy in production).

```python
import httpx

BASE_URL = "http://localhost:8000"

async def get_feed(page=1, types=None):
    params = {"page": page, "page_size": 20}
    if types:
        params["types"] = ",".join(types)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/api/feed", params=params)
        return response.json()
```

#### Searching Content

```python
async def search_events(query: str, limit: int = 10):
    request = {
        "query": query,
        "types": ["event"],
        "limit": limit
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/search",
            json=request
        )
        return response.json()
```

#### Triggering Extraction

```python
import asyncio

async def extract_emails(email_ids: list):
    """Start extraction and stream progress."""
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            f"{BASE_URL}/api/pipeline/extract",
            json=email_ids,
            timeout=300
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = json.loads(line[6:])
                    print(f"Progress: {data}")
```

### 12.2 Direct Qdrant Integration

For advanced integrations, you can connect directly to Qdrant:

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

client = QdrantClient(
    host="localhost",
    port=6333,
    api_key="your_api_key"
)

# Search events by sender
results = client.search(
    collection_name="feedprism_events",
    query_vector=("title", query_embedding),
    query_filter=Filter(
        must=[
            FieldCondition(
                key="source_sender_email",
                match=MatchValue(value="news@aiweekly.co")
            )
        ]
    ),
    limit=10
)
```

### 12.3 Webhook Integration (Lamatic Bridge)

The Lamatic Bridge service (`port 8001`) accepts webhooks:

```python
# POST http://localhost:8001/webhook

{
    "event": "extract_emails",
    "payload": {
        "email_ids": ["msg_1", "msg_2"]
    }
}
```

---

## 13. Data Flow & Pipelines

### 13.1 Extraction Pipeline

```
1. FETCH: Gmail API → Email Metadata + Body
   └── GmailClient.fetch_content_rich_emails()

2. PARSE: HTML → Clean Text + Links + Images
   └── EmailParser.parse_html_email()

3. EXTRACT: Clean Text → Structured Content (LLM)
   └── LLMExtractor.extract_events/courses/blogs()
   └── Returns: EventExtractionResult, CourseExtractionResult, BlogExtractionResult

4. EMBED: Titles/Descriptions → 384D Vectors
   └── EmbeddingService.create_named_vectors()

5. SPARSE: Full Text → BM25 Sparse Vector
   └── create_sparse_vector()

6. INGEST: Points → Qdrant Collections
   └── QdrantService.upsert_by_type()

7. TRACK: Mark Email as Processed
   └── QdrantService.mark_emails_as_attempted()
```

### 13.2 Search Pipeline

```
1. QUERY: User Input
   └── "machine learning events next month"

2. EMBED: Query → 384D Vector
   └── EmbeddingService.embed_text()

3. SPARSE: Query → Sparse Vector
   └── create_sparse_vector()

4. DENSE SEARCH: Semantic Similarity
   └── client.search(query_vector=dense_vector)

5. SPARSE SEARCH: Keyword Matching
   └── client.search(query_vector=sparse_vector)

6. RRF FUSION: Combine Rankings
   └── score = Σ 1/(k + rank)

7. RETRIEVE: Get Full Payloads
   └── client.retrieve(ids=top_ids)

8. TRANSFORM: Qdrant Points → FeedItems
   └── _point_to_feed_item()
```

---

## 14. Testing & Verification

### 14.1 Health Check

```bash
# Check API health
curl http://localhost:8000/api/metrics/health

# Expected response
{"status": "healthy", "qdrant": "connected", "timestamp": "..."}
```

### 14.2 Verify Collections

```python
from qdrant_client import QdrantClient

client = QdrantClient(host="localhost", port=6333)

for collection in ["feedprism_events", "feedprism_courses", "feedprism_blogs"]:
    info = client.get_collection(collection)
    print(f"{collection}: {info.points_count} points")
```

### 14.3 Test Search

```bash
# Quick search
curl "http://localhost:8000/api/search/quick?q=machine+learning&limit=5"

# Full search
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "AI conference 2025", "types": ["event"], "limit": 10}'
```

### 14.4 Test Extraction

```bash
# Get unprocessed emails
curl "http://localhost:8000/api/pipeline/unprocessed-emails?hours_back=48"

# Start extraction
curl -X POST http://localhost:8000/api/pipeline/extract \
  -H "Content-Type: application/json" \
  -d '["msg_id1", "msg_id2"]'
```

---

## Appendix A: Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `app/main.py` | 81 | FastAPI entry point |
| `app/config.py` | 196 | Configuration management |
| `app/database/qdrant_client.py` | 691 | Qdrant operations |
| `app/routers/pipeline.py` | 815 | Extraction pipeline |
| `app/routers/feed.py` | 369 | Feed endpoints |
| `app/routers/search.py` | 146 | Search endpoints |
| `app/services/extractor.py` | 360 | LLM extraction |
| `app/services/gmail_client.py` | 373 | Gmail API |
| `app/services/parser.py` | 371 | HTML parsing |
| `app/services/embedder.py` | 107 | Embeddings |
| `app/models/api.py` | 203 | API models |
| `app/models/extraction.py` | 292 | Extraction schemas |
| `frontend/src/services/api.ts` | 564 | Frontend API client |

---

## Appendix B: Common Integration Patterns

### Pattern 1: Fetch and Display Feed

```javascript
// Frontend example
const response = await fetch('/api/feed?page=1&types=event,course');
const data = await response.json();
data.items.forEach(item => {
    console.log(`${item.item_type}: ${item.title}`);
});
```

### Pattern 2: Semantic Search

```python
# Backend integration
from app.database.qdrant_client import QdrantService
from app.services.embedder import EmbeddingService

qdrant = QdrantService()
embedder = EmbeddingService()

query = "Learn about transformers and attention mechanisms"
query_vector = embedder.embed_text(query)

results = qdrant.hybrid_search(
    query_vector=query_vector,
    query_text=query,
    content_type="courses",
    limit=10
)
```

### Pattern 3: Add Custom Content

```python
# Ingest custom content
from qdrant_client.models import PointStruct
import uuid

point = PointStruct(
    id=str(uuid.uuid4()),
    vector={
        "title": embedder.embed_text("Custom Course Title"),
        "description": embedder.embed_text("Course description"),
        "full_text": embedder.embed_text("Full content text")
    },
    payload={
        "title": "Custom Course Title",
        "description": "Course description",
        "source_email_id": "external_import",
        "tags": ["custom", "imported"],
        "provider": "External Platform",
        "extracted_at": datetime.now().isoformat()
    }
)

qdrant.upsert_by_type("courses", [point])
```

---

**Document End**

*This handoff document provides complete technical details for integrating with FeedPrism. For questions or clarifications, refer to the codebase or contact the FeedPrism team.*
