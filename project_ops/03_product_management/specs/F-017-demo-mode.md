# F-017: Demo Mode for Hackathon Judging

**Status:** ✅ Complete (Nov 30, 2025)  
**Last Updated:** Nov 30, 2025 - Enhanced with runtime toggle, UI settings, extraction flow

## Problem

For hackathon demos and judging, requiring judges to:
1. Login with their Gmail account
2. Have their emails processed
3. Wait for data to populate

...creates friction and delays. Additionally, Gmail OAuth requires either:
- Whitelisting each judge's email (max 100 test users)
- Google verification process (weeks/months)

## Solution

Implement a **Demo Mode** that:
1. Uses pre-defined sample email and feed data (no real Gmail needed)
2. Requires no login
3. Shows a demo banner to indicate sample data
4. Works immediately when deployed
5. **Can be toggled at runtime via Settings UI** (no server restart needed)
6. **State persists across server restarts** via file-based persistence
7. **Complete extraction-to-feed flow** - extracted items appear in feed

---

## Configuration

### Environment Variable

```bash
# .env
DEMO_MODE=true
DEMO_USER_NAME=Demo User
DEMO_USER_EMAIL=demo@feedprism.app
```

### Toggle Demo Mode

| Setting | Behavior |
|---------|----------|
| `DEMO_MODE=true` | No login required, uses pre-loaded data |
| `DEMO_MODE=false` | Login required, uses user's Gmail |

---

## Implementation

### Backend

**New Router:** `app/routers/demo.py`

| Endpoint | Description |
|----------|-------------|
| `GET /api/demo/status` | Check if demo mode is enabled |
| `GET /api/demo/user` | Get demo user info |
| `GET /api/demo/config` | Get full demo configuration |
| `POST /api/demo/toggle` | Toggle demo mode on/off at runtime |
| `POST /api/demo/reset` | Reset demo state (clear extracted flag) |
| `GET /api/demo/emails/unprocessed` | Get pre-defined demo emails for extraction |
| `POST /api/demo/emails/mark-extracted` | Mark demo emails as extracted |
| `GET /api/demo/stats` | Get demo collection stats |
| `GET /api/demo/feed` | Get pre-defined demo feed items (18 items) |

**New Service:** `app/services/demo_service.py`
- `DemoService` class managing demo data
- Pre-defined `DEMO_EMAILS` (6 sample newsletters)
- Pre-defined demo feed items (5 events, 6 courses, 7 blogs)
- Items spread across different source emails for realistic grouping

**File-based Persistence:** `data/demo_state.json`
- Stores `{"demo_mode": true/false}` 
- Survives server restarts
- Updated when toggling via API

**Config Changes:** `app/config.py`
- Added `demo_mode: bool`
- Added `demo_user_name: str`
- Added `demo_user_email: str`

### Frontend

**New Context:** `src/contexts/DemoContext.tsx`
- Provides `isDemo`, `isLoading`, `config`, `user` throughout app
- Fetches demo status on mount
- `toggleDemo(enabled)` - toggles demo mode via API
- `refreshDemoStatus()` - refetches demo state
- `demoExtracted` - tracks if demo extraction completed (sessionStorage)
- `setDemoExtracted()` - marks extraction as complete

**New Component:** `src/components/demo/DemoBanner.tsx`
- Fixed position gradient banner at top of page
- Centered layout with flexbox
- Shows "Demo Mode - Exploring pre-loaded newsletter data"
- Displays demo user avatar and name
- "Sample Data" badge

**Settings Integration:** `src/components/settings/SettingsView.tsx`
- Toggle switch to enable/disable demo mode
- Shows current status
- Reloads page after toggle for clean state

**App.tsx Changes:**
- Wrapped in `DemoProvider`
- Added `DemoBanner` at top
- Added padding when demo banner is shown

**FeedList Changes:**
- Waits for `isDemoLoading` before fetching
- Uses `/api/demo/feed` when in demo mode
- Only shows items after `demoExtracted` is true

**PrismOverview Changes:**
- Fetches demo emails from `/api/demo/emails/unprocessed`
- Calls `setDemoExtracted(true)` on extraction complete
- Feed automatically refreshes to show extracted items

---

## User Experience

### Demo Mode Enabled

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎯 Demo Mode - Exploring pre-loaded newsletter data  [Sample]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Sidebar]  │  [Main Content - Pre-loaded data]                │
│             │                                                   │
│  Home       │  Events, Courses, Blogs from sample emails       │
│  Events     │                                                   │
│  Courses    │  All features work normally                       │
│  Blogs      │  - Search                                         │
│  ...        │  - Filters                                        │
│             │  - Tags                                           │
│             │  - Calendar views                                 │
│             │                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Demo Mode Disabled

- Shows login page (when F-011 is implemented)
- Requires Gmail OAuth
- Uses user's actual emails

---

## Files Created/Modified

### New Files
- `feedprism_main/app/routers/demo.py` - Demo API router with all endpoints
- `feedprism_main/app/services/demo_service.py` - DemoService with pre-defined data
- `feedprism_main/data/demo_state.json` - Persisted demo mode state
- `frontend/src/contexts/DemoContext.tsx` - Demo context with toggle support
- `frontend/src/contexts/index.ts` - Context exports
- `frontend/src/components/demo/DemoBanner.tsx` - Fixed position demo banner
- `frontend/src/components/demo/index.ts` - Demo component exports
- `frontend/src/components/settings/SettingsView.tsx` - Settings with demo toggle
- `frontend/src/components/settings/index.ts` - Settings exports

### Modified Files
- `feedprism_main/app/config.py` - Added demo settings
- `feedprism_main/app/main.py` - Registered demo router, startup logging
- `feedprism_main/.env` - Added demo config
- `frontend/src/services/api.ts` - Added demo API functions (toggle, reset, feed, emails)
- `frontend/src/App.tsx` - Added DemoProvider, DemoBanner, padding for banner
- `frontend/src/components/feed/FeedList.tsx` - Demo feed integration, wait for context
- `frontend/src/components/prism/PrismOverview.tsx` - Demo extraction flow, setDemoExtracted

---

## Deployment Instructions

### For Hackathon Demo

1. Set `DEMO_MODE=true` in `.env`
2. Ensure Qdrant has pre-loaded email data
3. Deploy backend and frontend
4. Judges can use immediately without login

### For Production

1. Set `DEMO_MODE=false` in `.env`
2. Implement F-011 (Gmail OAuth)
3. Users must login with Gmail

---

## Pre-loaded Data Requirements

The demo mode relies on existing data in Qdrant. Ensure:

1. **Qdrant is running** with `feedprism_emails` collection
2. **Sample emails are ingested** via pipeline
3. **Extracted items exist** (events, courses, blogs)

To populate demo data:
```bash
cd feedprism_main
python -m app.pipeline.run  # Ingest and extract from sample emails
```

---

## Demo Extraction Simulation

In demo mode, the Prism Overview shows a **simulated extraction** experience:

### What Users See

1. **Sample Newsletters** (left panel):
   - Last Week in AI #226
   - Coursera Weekly: New ML Courses
   - Tech Events This Week
   - The Pragmatic Engineer
   - Hacker Newsletter
   - Python Weekly

2. **"Extract Content" Button** (right panel):
   - Clicking triggers simulated extraction
   - Progress bar animates through steps
   - Shows realistic messages like "Parsing Last Week in AI..."
   - Running totals update (Events: 5, Courses: 6, Blogs: 7)

3. **Completion State**:
   - Shows "18 items extracted"
   - Breakdown by type
   - "Reset" button to run demo again

### Technical Implementation

```tsx
// PrismOverview.tsx - Demo extraction simulation
const handleDemoExtract = useCallback(() => {
    const steps = [
        { message: 'Fetching sample newsletters...', events: 0, courses: 0, blogs: 0 },
        { message: 'Parsing "Last Week in AI"...', events: 1, courses: 0, blogs: 2 },
        // ... more steps
    ];
    
    // Animate through steps at 800ms intervals
    const interval = setInterval(() => {
        // Update progress state
    }, 800);
}, []);
```

---

## Benefits

| Benefit | Description |
|---------|-------------|
| **Zero friction** | Judges can use app immediately |
| **No OAuth issues** | No Google verification needed |
| **Consistent demo** | Same data for all judges |
| **Fast setup** | Just set env var |
| **Clear indication** | Banner shows it's demo mode |
| **Live extraction feel** | Simulated extraction shows the pipeline in action |

---

## Future Enhancements

- [ ] Add "Try with your own Gmail" button in demo mode
- [x] ~~Add demo data reset endpoint~~ → Implemented `/api/demo/reset`
- [ ] Add demo tour/walkthrough
- [ ] Add sample data generator script
- [x] ~~Make demo extraction actually re-process sample emails from Qdrant~~ → Pre-defined demo feed items now appear after extraction

## Demo Content Summary

### Pre-defined Demo Emails (6)
| Email | Sender | Content |
|-------|--------|---------|
| demo-email-001 | Last Week in AI | AI news, Gemini 3, Claude 4, AI Agents |
| demo-email-002 | Coursera | TensorFlow, LangChain, MLOps courses |
| demo-email-003 | Eventbrite Digest | AI Summit, React Conf, DevOps Days |
| demo-email-004 | The Pragmatic Engineer | Code reviews, system design, salary tips |
| demo-email-005 | Python Weekly | PyCon, Python courses, Python 3.13 |
| demo-email-006 | Hacker Newsletter | SQLite, State of JS articles |

### Pre-defined Demo Feed Items (18)
| Type | Count | Examples |
|------|-------|----------|
| Events | 5 | AI Summit 2025, React Conf, PyCon, DevOps Days, NeurIPS Workshop |
| Courses | 6 | TensorFlow, LangChain, MLOps, Python DS, System Design, React 19 |
| Blogs | 7 | Code Reviews, SQLite, Gemini 3, AI Agents, Salary, Python 3.13, State of JS |

All items are spread across different source emails for realistic email grouping in the feed.
