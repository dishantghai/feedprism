# FeedPrism Implementation Plan

**Document Version:** 1.0  
**Created:** Nov 28, 2025  
**Status:** In Progress

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

### Phase 1: Frontend Project Setup
**Goal:** Initialize React + Vite + Tailwind with design tokens

#### 1.1 Initialize Project
- [ ] Create Vite React TypeScript project
- [ ] Install dependencies (Tailwind, Lucide icons, clsx)
- [ ] Configure Tailwind with design tokens from `visual_design_improvements.md`

#### 1.2 Setup Design System
- [ ] Create `index.css` with CSS variables (colors, spacing, typography)
- [ ] Create base utility components (`Button`, `Badge`, `Skeleton`)
- [ ] Setup dark mode support (optional)

#### 1.3 Configure API Client
- [ ] Create `services/api.ts` with fetch wrapper
- [ ] Configure proxy to backend in `vite.config.ts`
- [ ] Create TypeScript types matching backend models

#### 1.4 Verification
- [ ] `npm run dev` starts without errors
- [ ] Design tokens visible in browser DevTools
- [ ] API proxy works (test with `/api/feed`)

---

### Phase 2: Layout & Sidebar
**Goal:** Implement Arc-style sidebar with navigation

#### 2.1 Create Layout Components
- [ ] `Layout.tsx` - Main grid layout (sidebar + content)
- [ ] `Sidebar.tsx` - Arc-style sidebar with sections
- [ ] `MainContent.tsx` - Content area wrapper

#### 2.2 Sidebar Features
- [ ] Logo and branding
- [ ] Command bar trigger (⌘K)
- [ ] Pinned section (Home, Actions, Metrics)
- [ ] Spaces section (Events, Courses, Blogs, Themes)
- [ ] Raw Inbox link
- [ ] Settings and user area
- [ ] Collapsible behavior (responsive)

#### 2.3 Navigation State
- [ ] Active route highlighting
- [ ] Badge counts from API
- [ ] Hover states and transitions

#### 2.4 Verification
- [ ] Sidebar renders correctly
- [ ] Navigation items clickable
- [ ] Responsive collapse works

---

### Phase 3: Prism Overview Section
**Goal:** Implement collapsible hackathon visualization

#### 3.1 Create Prism Components
- [ ] `PrismOverview.tsx` - Container with collapse logic
- [ ] `RawFeedPanel.tsx` - Left panel showing raw emails
- [ ] `PrismVisual.tsx` - Center prism with animation
- [ ] `CategoryPanel.tsx` - Right panel with category counts

#### 3.2 Data Integration
- [ ] Fetch recent emails from `/api/emails/recent`
- [ ] Fetch category counts from `/api/metrics`
- [ ] Real-time updates (optional)

#### 3.3 Collapse Behavior
- [ ] Expand/collapse animation (300ms)
- [ ] Persist state in localStorage
- [ ] Collapsed summary line

#### 3.4 Verification
- [ ] Prism visualization renders
- [ ] Collapse/expand works smoothly
- [ ] Data loads from API

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

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Backend API | ✅ Complete | Added feed, emails, search, metrics routers |
| Phase 1: Frontend Setup | 🔲 Not Started | |
| Phase 2: Layout & Sidebar | 🔲 Not Started | |
| Phase 3: Prism Overview | 🔲 Not Started | |
| Phase 4: Command & Filters | 🔲 Not Started | |
| Phase 5: Feed Cards | 🔲 Not Started | |
| Phase 6: Metrics Panel | 🔲 Not Started | |
| Phase 7: Polish | 🔲 Not Started | |

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
