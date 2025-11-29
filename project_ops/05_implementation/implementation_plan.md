# FeedPrism Implementation Plan

**Document Version:** 1.0  
**Created:** Nov 28, 2025  
**Scope:** Frontend UI Implementation

---

## Related Documentation

| Document | Scope |
|----------|-------|
| **This document** | Frontend UI phases (React + Vite + Tailwind) |
| `02_planning/revised_implementation_guide/Phase_0-7_*.md` | Backend/Qdrant implementation |
| `02_planning/revised_implementation_guide/Phase_5_Enhancements.md` | Feed card UX enhancements |
| `PROJECT_STATUS.md` | **Single source of truth for progress** |

---

## Overview

This document outlines the phased implementation plan for FeedPrism's frontend UI and required backend API endpoints. The implementation follows a modular architecture with clear separation between frontend and backend layers.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Components │  │   Hooks     │  │   Services  │  │    Store    │    │
│  │  (UI Layer) │  │ (Logic)     │  │  (API)      │  │  (State)    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │                │                │                │            │
│         └────────────────┴────────────────┴────────────────┘            │
│                                   │                                      │
│                          HTTP/REST (port 5173 → 8000)                   │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────┐
│                           BACKEND (FastAPI)                             │
│                                   │                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Routers   │  │  Services   │  │   Models    │  │  Database   │    │
│  │  (API)      │  │  (Business) │  │  (Pydantic) │  │  (Qdrant)   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                          │
│  Port: 8000                                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────┐
│                         EXTERNAL SERVICES                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │   Gmail     │  │   OpenAI    │  │   Qdrant    │                     │
│  │   API       │  │   API       │  │   Vector DB │                     │
│  └─────────────┘  └─────────────┘  └─────────────┘                     │
│                                                                          │
│  Ports: Gmail (OAuth), OpenAI (HTTPS), Qdrant (6333)                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

### Frontend (`/frontend`)
```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Root component
│   ├── index.css                   # Global styles + design tokens
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx         # Arc-style sidebar
│   │   │   ├── MainContent.tsx     # Content area wrapper
│   │   │   └── Layout.tsx          # Main layout
│   │   ├── prism/
│   │   │   ├── PrismOverview.tsx   # Collapsible prism section
│   │   │   ├── RawFeedPanel.tsx    # Left: raw emails
│   │   │   ├── PrismVisual.tsx     # Center: prism animation
│   │   │   └── CategoryPanel.tsx   # Right: categories
│   │   ├── feed/
│   │   │   ├── FeedCard.tsx        # Notion-style card
│   │   │   ├── FeedList.tsx        # Card list
│   │   │   ├── ExtractedItem.tsx   # Nested extracted item
│   │   │   └── EmptyState.tsx      # No results
│   │   ├── search/
│   │   │   ├── CommandBar.tsx      # ⌘K search
│   │   │   ├── CommandPalette.tsx  # Modal palette
│   │   │   └── FilterBar.tsx       # Filter chips
│   │   ├── metrics/
│   │   │   └── MetricsPanel.tsx    # Hackathon metrics
│   │   └── ui/                     # Reusable primitives
│   │       ├── Button.tsx
│   │       ├── Badge.tsx
│   │       ├── Skeleton.tsx
│   │       └── ...
│   ├── hooks/
│   │   ├── useApi.ts               # API fetching
│   │   ├── useKeyboard.ts          # Keyboard shortcuts
│   │   └── useLocalStorage.ts      # Persistence
│   ├── services/
│   │   └── api.ts                  # Backend API client
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   └── lib/
│       └── utils.ts                # Utility functions
```

### Backend (`/feedprism_main`)
```
feedprism_main/
├── app/
│   ├── main.py                     # FastAPI app + routes
│   ├── config.py                   # Settings
│   ├── routers/                    # NEW: API routers
│   │   ├── __init__.py
│   │   ├── feed.py                 # Feed endpoints
│   │   ├── search.py               # Search endpoints
│   │   ├── emails.py               # Email endpoints
│   │   └── metrics.py              # Metrics endpoints
│   ├── services/
│   │   ├── analytics.py
│   │   ├── extractor.py
│   │   ├── gmail_client.py
│   │   ├── embedder.py
│   │   └── ...
│   ├── models/
│   │   ├── extraction.py
│   │   └── api.py                  # NEW: API response models
│   └── database/
│       └── qdrant_client.py
```

---

## Backend Setup Instructions

### Prerequisites
1. **Python 3.10+** installed
2. **Qdrant** running locally (Docker recommended)
3. **Gmail credentials** (`credentials.json`, `token.json` in root)
4. **OpenAI API key** in `.env`

### Step 1: Start Qdrant (Docker)
```bash
# Pull and run Qdrant
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z \
  qdrant/qdrant
```

### Step 2: Setup Python Environment
```bash
cd feedprism_main

# Create virtual environment
python -m venv .venv

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Configure Environment
```bash
# Copy example env (if exists) or create .env
cp .env.example .env

# Edit .env with your values:
# OPENAI_API_KEY=sk-...
# GMAIL_CREDENTIALS_PATH=../credentials.json
# GMAIL_TOKEN_PATH=../token.json
# QDRANT_HOST=localhost
# QDRANT_PORT=6333
```

### Step 4: Run FastAPI Server
```bash
# From feedprism_main directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using Python directly
python -m uvicorn app.main:app --reload --port 8000
```

### Step 5: Verify Backend
```bash
# Test root endpoint
curl http://localhost:8000/

# Expected: {"message": "Welcome to FeedPrism API"}

# View API docs
open http://localhost:8000/docs
```

---

## Implementation Phases

### Phase 0: Backend API Preparation
**Goal:** Add required API endpoints before frontend development

#### 0.1 Create API Response Models
- [ ] Create `app/models/api.py` with response schemas
- [ ] Define `FeedItem`, `EmailSummary`, `SearchResult`, `MetricsResponse`

#### 0.2 Create API Routers
- [ ] Create `app/routers/` directory structure
- [ ] Implement `feed.py` router:
  - `GET /api/feed` - List all items (paginated)
  - `GET /api/feed/{item_id}` - Get single item
  - `GET /api/feed/by-type/{type}` - Filter by type
- [ ] Implement `search.py` router:
  - `POST /api/search` - Hybrid search with filters
- [ ] Implement `emails.py` router:
  - `GET /api/emails/recent` - Recent raw emails (for Prism)
  - `GET /api/emails/{email_id}` - Single email details
- [ ] Implement `metrics.py` router:
  - `GET /api/metrics` - Retrieval quality metrics

#### 0.3 Update Main App
- [ ] Register routers in `main.py`
- [ ] Add CORS middleware for frontend
- [ ] Add health check endpoint

#### 0.4 Verification
- [ ] All endpoints return valid JSON
- [ ] Swagger docs accessible at `/docs`
- [ ] CORS allows `http://localhost:5173`

---

### Phase 1: Frontend Project Setup ✅
**Goal:** Initialize React + Vite + Tailwind with design tokens

#### 1.1 Initialize Project
- [x] Create Vite React TypeScript project
- [x] Install dependencies (Tailwind, Lucide icons, clsx)
- [x] Configure Tailwind with design tokens from `visual_design_improvements.md`

#### 1.2 Setup Design System
- [x] Create `index.css` with CSS variables (colors, spacing, typography)
- [ ] Create base utility components (`Button`, `Badge`, `Skeleton`) — deferred to Phase 7
- [ ] Setup dark mode support (optional) — deferred

#### 1.3 Configure API Client
- [x] Create `services/api.ts` with fetch wrapper
- [x] Configure proxy to backend in `vite.config.ts`
- [x] Create TypeScript types matching backend models

#### 1.4 Verification
- [x] `npm run dev` starts without errors
- [x] Design tokens visible in browser DevTools
- [x] API proxy works (test with `/api/metrics`)

---

### Phase 2: Layout & Sidebar ✅
**Goal:** Implement Arc-style sidebar with navigation

#### 2.1 Create Layout Components
- [x] `Layout.tsx` - Main grid layout (sidebar + content)
- [x] `Sidebar.tsx` - Arc-style sidebar with sections
- [x] `MainContent.tsx` - Content area wrapper

#### 2.2 Sidebar Features
- [x] Logo and branding (prism triangle + magenta→orange gradient)
- [x] Command bar trigger (⌘K) — placeholder, wired in Phase 4
- [x] Pinned section (Home, Actions, Metrics)
- [x] Spaces section (Events, Courses, Blogs)
- [x] Raw Inbox link
- [x] Settings and user area
- [ ] Collapsible behavior (responsive) — deferred to Phase 7

#### 2.3 Navigation State
- [x] Active route highlighting
- [x] Badge counts from API
- [x] Hover states and transitions

#### 2.4 Verification
- [x] Sidebar renders correctly (deep navy gradient background)
- [x] Navigation items clickable (view routing works)
- [ ] Responsive collapse works — deferred

---

### Phase 3: Prism Overview Section ✅
**Goal:** Implement collapsible hackathon visualization with live extraction demo

#### 3.1 Create Prism Components
- [x] `PrismOverview.tsx` - Container with collapse logic and extraction state management
- [x] `RawFeedPanel.tsx` - Left panel showing unprocessed emails
- [x] `PrismVisual.tsx` - Center prism image
- [x] `ExtractionPanel.tsx` - Right panel with Extract button, progress, and results

#### 3.2 Data Integration
- [x] Fetch unprocessed emails from `/api/pipeline/unprocessed-emails`
- [x] Filter out already-processed emails (check Qdrant)
- [x] SSE streaming for extraction progress

#### 3.3 Extraction Pipeline
- [x] `POST /api/pipeline/extract` - Full extraction with SSE progress
- [x] Parse emails → LLM extraction → Embed → Ingest to Qdrant
- [x] Real-time progress updates (fetch, parse, extract, ingest)
- [x] Results summary (events, courses, blogs counts)

#### 3.4 Collapse Behavior
- [x] Expand/collapse animation (300ms)
- [x] Persist state in localStorage
- [x] Collapsed summary line

#### 3.5 Verification
- [x] Prism visualization renders with image
- [x] Collapse/expand works smoothly
- [x] Unprocessed emails load from Gmail API
- [x] Extract button triggers pipeline with progress
- [x] Results display after extraction complete

---

### Phase 4: Command Bar & Filters
**Goal:** Implement Notion-style search and filtering

#### 4.1 Command Bar
- [ ] `CommandBar.tsx` - Search input trigger
- [ ] `CommandPalette.tsx` - Modal with search results
- [ ] Keyboard shortcut (⌘K / Ctrl+K)

#### 4.2 Command Palette Features
- [ ] Recent items section
- [ ] Quick actions section
- [ ] Filter suggestions
- [ ] Keyboard navigation (↑/↓, Enter, Escape)

#### 4.3 Filter Bar
- [ ] `FilterBar.tsx` - Filter chips row
- [ ] Type filter (Events, Courses, Blogs, All)
- [ ] Status filter (Upcoming, Past, Any)
- [ ] Sender filter (dropdown)
- [ ] Date range filter
- [ ] Sort dropdown (Relevance, Recent)

#### 4.4 Search Integration
- [ ] Connect to `/api/search` endpoint
- [ ] Debounced search (300ms)
- [ ] Loading states

#### 4.5 Verification
- [ ] ⌘K opens command palette
- [ ] Filters update feed
- [ ] Search returns results

---

### Phase 5: Feed Cards
**Goal:** Implement Notion-style content cards

#### 5.1 Card Components
- [ ] `FeedCard.tsx` - Main card component
- [ ] `ExtractedItem.tsx` - Nested item (event, course, blog)
- [ ] `FeedList.tsx` - Card list with virtualization (optional)

#### 5.2 Card Features
- [ ] Sender icon and name
- [ ] Timestamp
- [ ] Email subject
- [ ] Summary text
- [ ] Extracted items (nested blocks)
- [ ] Action buttons (Register, Read, etc.)
- [ ] Urgency indicators (Due Tomorrow)
- [ ] "View Original Email" link

#### 5.3 Card States
- [ ] Default state
- [ ] Hover state (border highlight)
- [ ] Loading skeleton
- [ ] Empty state

#### 5.4 Data Integration
- [ ] Fetch from `/api/feed`
- [ ] Pagination or infinite scroll
- [ ] Filter integration

#### 5.5 Verification
- [ ] Cards render with real data
- [ ] Extracted items display correctly
- [ ] Actions are clickable

---

### Phase 6: Metrics Panel
**Goal:** Implement hackathon metrics dashboard

#### 6.1 Metrics Components
- [ ] `MetricsPanel.tsx` - Main panel
- [ ] Metric cards (Precision, MRR, Latency, Dedup Rate)
- [ ] Status indicators (Good, Normal, Warning)
- [ ] Last sync timestamp

#### 6.2 Data Integration
- [ ] Fetch from `/api/metrics`
- [ ] Auto-refresh (30s interval)
- [ ] Loading states

#### 6.3 Verification
- [ ] Metrics display correctly
- [ ] Status colors match thresholds
- [ ] Refresh works

---

### Phase 7: Polish & Refinement
**Goal:** Add animations, loading states, and final touches

#### 7.1 Animations
- [ ] Hover transitions (100ms)
- [ ] Collapse/expand (300ms)
- [ ] Command palette slide-up
- [ ] Loading shimmer

#### 7.2 Loading States
- [ ] Skeleton cards
- [ ] Skeleton sidebar
- [ ] Spinner for actions

#### 7.3 Empty States
- [ ] No results illustration
- [ ] Clear filters button
- [ ] Helpful message

#### 7.4 Error Handling
- [ ] API error display
- [ ] Retry buttons
- [ ] Offline indicator

#### 7.5 Accessibility
- [ ] Focus states
- [ ] Keyboard navigation
- [ ] ARIA labels
- [ ] Screen reader support

#### 7.6 Verification
- [ ] All animations smooth
- [ ] Loading states visible
- [ ] Keyboard navigation works
- [ ] No console errors

---

## API Endpoints Reference

### Feed Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feed` | List all items (paginated) |
| GET | `/api/feed/{id}` | Get single item |
| GET | `/api/feed/by-type/{type}` | Filter by content type |

### Search Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search` | Hybrid search with filters |

### Email Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emails/recent` | Recent raw emails |
| GET | `/api/emails/{id}` | Single email details |

### Metrics Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics` | Retrieval quality metrics |
| GET | `/api/analytics` | Email statistics |

---

## Current Progress

> **Note:** For current project status, see `project_ops/PROJECT_STATUS.md`

---

## Phase 0 Completion Log

**Files Created:**
- `app/models/api.py` - API response models (FeedItem, EmailSummary, MetricsResponse, etc.)
- `app/routers/__init__.py` - Router exports
- `app/routers/feed.py` - Feed endpoints (GET /api/feed, /api/feed/{id}, /api/feed/by-type/{type})
- `app/routers/emails.py` - Email endpoints (GET /api/emails/recent, /api/emails/prism-stats, /api/emails/{id})
- `app/routers/search.py` - Search endpoints (POST /api/search, GET /api/search/quick)
- `app/routers/metrics.py` - Metrics endpoints (GET /api/metrics, /api/metrics/health)

**Files Modified:**
- `app/main.py` - Added CORS middleware and registered routers

**Endpoints Available:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feed` | Paginated feed of all items |
| GET | `/api/feed/{id}?item_type=event` | Single item by ID |
| GET | `/api/feed/by-type/{type}` | Items by type |
| POST | `/api/search` | Hybrid search with filters |
| GET | `/api/search/quick?q=...` | Quick search |
| GET | `/api/emails/recent` | Recent processed emails |
| GET | `/api/emails/prism-stats` | Stats for Prism visualization |
| GET | `/api/emails/{id}` | Email detail with extracted items |
| GET | `/api/metrics` | Dashboard metrics |
| GET | `/api/metrics/health` | Health check |

---

## Phase 1 Completion Log

**Files Created:**
- `frontend/vite.config.ts` - Vite config with Tailwind plugin and API proxy to port 8000
- `frontend/src/index.css` - Design tokens (colors, typography, spacing, animations)
- `frontend/src/types/index.ts` - TypeScript types matching backend Pydantic models
- `frontend/src/services/api.ts` - API client for all backend endpoints
- `frontend/src/lib/utils.ts` - Utility functions (cn, formatRelativeTime, getTypeColor, etc.)
- `frontend/src/App.tsx` - Initial status page testing API connection

**Design Tokens Applied:**
- Magenta + Orange brand palette (`--color-prism-start: #EC4899`, `--color-prism-end: #F97316`)
- Category colors: Events (magenta), Courses (orange), Blogs (amber), Actions (red)
- Notion-inspired typography and spacing (8px grid)
- Custom scrollbar styling
- Animation keyframes (fadeIn, slideUp, shimmer)

**Verified:**
- Vite dev server running on port 5173
- API proxy working (frontend → backend on port 8000)
- Metrics fetched and displayed from `/api/metrics`

---

## Phase 2 Completion Log

**Files Created:**
- `frontend/src/components/layout/Sidebar.tsx` - Arc-style dark sidebar with:
  - Prism logo mark (triangle + beam with magenta→orange gradient)
  - Command bar trigger (⌘K placeholder)
  - Pinned section (Home, Actions, Metrics)
  - Spaces section (Events, Courses, Blogs with badge counts)
  - Raw Inbox link
  - Settings and user avatar
  - Deep navy gradient background (`#0b0d1a` → `#222636`)
- `frontend/src/components/layout/MainContent.tsx` - Content area wrapper with title/subtitle
- `frontend/src/components/layout/Layout.tsx` - Main layout combining sidebar + content
- `frontend/src/components/layout/index.ts` - Barrel exports

**Files Modified:**
- `frontend/src/App.tsx` - Refactored to use Layout with view routing:
  - `VIEW_CONFIG` mapping for all views (home, events, courses, blogs, actions, metrics, inbox, settings)
  - `HomeView` with stat cards and placeholders for Prism/Feed
  - `MetricsView` with quality metrics and top tags
  - `PlaceholderView` for unimplemented views
  - Sidebar badge counts extracted from metrics API
- `frontend/src/index.css` - Updated design tokens:
  - Lightened sidebar colors
  - Magenta + Orange brand palette (removed purple)
  - Updated badge background colors

**Features Implemented:**
- Sidebar navigation with active state highlighting
- View routing driven by `activeView` state
- Collapsible sections (Pinned, Spaces)
- Badge counts from `/api/metrics`
- Responsive layout shell

**Verified:**
- Sidebar renders with correct gradient background
- Navigation between views works
- Metrics displayed in Home and Metrics views
- Prism logo displays with magenta→orange gradient

---

## Commit Strategy

Each phase will be committed with meaningful messages:

```
feat(backend): add feed API endpoints
feat(frontend): initialize vite + react + tailwind
feat(sidebar): implement arc-style navigation
feat(prism): add collapsible overview section
feat(search): implement command palette
feat(feed): add notion-style cards
feat(metrics): add hackathon dashboard
style: add animations and polish
```

---

## Next Steps

1. **Verify Backend Setup** - Run FastAPI and confirm it works
2. **Start Phase 0** - Add required API endpoints
3. **Proceed to Phase 1** - Initialize frontend project

---

## Notes

- All phases are designed to be independently testable
- Each phase builds on the previous one
- Mock data can be used if backend is not ready
- Design tokens from `visual_design_improvements.md` are the source of truth

---

## Future Optimizations

### Performance Improvements (Post-Hackathon)

1. **Processed Email ID Lookup Optimization**
   - Current: Scrolls through all Qdrant collections to get `source_email_id` values
   - Impact: O(n) where n = total items in Qdrant (~50-100ms for <1000 items)
   - Future options:
     - Create dedicated `processed_emails` collection with just IDs
     - Use Redis/SQLite cache for O(1) lookup
     - Implement Bloom filter for probabilistic fast check

2. **SSE Connection Management**
   - Add extraction job tracking to prevent duplicate runs
   - Implement job queue for concurrent extraction requests
   - Add ability to cancel in-progress extractions

3. **Incremental Sync**
   - Track last sync timestamp
   - Only fetch emails newer than last sync
   - Background sync with notifications

---

## Phase 3 Completion Log

**Backend Files Created:**
- `app/routers/pipeline.py` - Pipeline router with:
  - `GET /api/pipeline/unprocessed-emails` - Fetch unprocessed emails from Gmail
  - `POST /api/pipeline/extract` - Run extraction with SSE streaming
  - `GET /api/pipeline/settings` - Get pipeline settings

**Backend Files Modified:**
- `app/config.py` - Added `email_fetch_hours_back` setting (default: 8 hours)
- `app/database/qdrant_client.py` - Added `get_processed_email_ids()` method
- `app/main.py` - Registered pipeline router

**Frontend Files Created:**
- `src/components/prism/ExtractionPanel.tsx` - Right panel with 4 states:
  - Empty (all caught up)
  - Ready (Extract button)
  - Extracting (progress bar + running totals)
  - Complete (results summary)

**Frontend Files Modified:**
- `src/services/api.ts` - Added pipeline API functions with SSE parsing
- `src/components/prism/PrismOverview.tsx` - Rewritten for demo flow:
  - Fetches unprocessed emails on load
  - Manages extraction state machine
  - Handles SSE events for progress
- `src/components/prism/RawFeedPanel.tsx` - Added `title` prop
- `src/components/prism/index.ts` - Export ExtractionPanel

**Demo Flow:**
1. Page loads → Fetches unprocessed emails from last 8 hours
2. Left panel shows unprocessed emails
3. Right panel shows "Extract Content" button
4. Click Extract → SSE stream shows real-time progress
5. Complete → Shows extraction summary (11 Events, 5 Courses, 17 Blogs)
6. Refresh → Previously processed emails filtered out

**Verified:**
- Full extraction pipeline working end-to-end
- SSE streaming progress updates in UI
- Processed emails correctly filtered from subsequent loads
