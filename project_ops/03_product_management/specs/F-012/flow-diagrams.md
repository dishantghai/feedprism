# F-012: Flow Diagrams & Architecture

## User Journey Flow

```
1. SEARCH/BROWSE
   │
   ├─→ User searches "AI conferences"
   │
   └─→ Backend: Qdrant Grouping API
       └─→ Groups by canonical_item_id
           └─→ Returns 1 item + all sources

2. VIEW RESULTS
   │
   ├─→ Single source: "📧 AI Weekly"
   ├─→ 2-3 sources: "📊 Seen in 2 sources" (blue)
   ├─→ 4-5 sources: "📊 Seen in 4 sources" (purple)
   └─→ 6+ sources: "🔥 Seen in 8 sources" (gradient, pulsing)

3. EXPAND SOURCES
   │
   └─→ Click badge → Source list slides down
       └─→ Shows: sender, date, "View Email" button

4. VIEW SOURCE EMAIL
   │
   └─→ Click "View Email" → EmailModal opens
       └─→ Shows: email content + navigation

5. NAVIGATE SOURCES
   │
   └─→ Click Next/Prev or use ←/→ keys
       └─→ Modal updates to different source
```

## Component Architecture

```
ContentCard
  │
  ├─→ DuplicateSourceBadge
  │     │
  │     ├─→ Badge (moderate/popular/viral)
  │     │
  │     ├─→ SourceList (when expanded)
  │     │     └─→ SourceListItem × N
  │     │           └─→ "View Email" button
  │     │
  │     └─→ EmailModal (when source clicked)
  │           ├─→ Source navigation header
  │           ├─→ Email metadata
  │           ├─→ Email body (HTML)
  │           └─→ Action buttons
  │
  └─→ Tags, Details button
```

## Data Flow

```
Frontend Search
    ↓
POST /api/search
    ↓
SearchService.search()
    ↓
Qdrant Grouping API
  - group_by: "canonical_item_id"
  - group_size: 10
    ↓
_get_sources_for_canonical_item()
  - Scroll collection
  - Filter by canonical_id
  - Extract source metadata
    ↓
Response with sources array
    ↓
DuplicateSourceBadge renders
    ↓
User clicks "View Email"
    ↓
GET /api/emails/{email_id}
    ↓
GmailService.get_email()
    ↓
EmailModal displays content
```

## State Management

```typescript
// DuplicateSourceBadge State
{
  isExpanded: boolean,
  selectedEmailId: string | null
}

// User clicks badge
→ setIsExpanded(!isExpanded)

// User clicks "View Email"
→ setSelectedEmailId(source.email_id)
  → Opens EmailModal

// User navigates sources
→ onNavigateSource(newIndex)
  → Updates selectedEmailId
    → EmailModal re-fetches
```

## Rendering Logic

```
if (sources.length === 0)
  → Show error state

if (sources.length === 1)
  → Render simple email link

if (sources.length === 2-3)
  → Render MODERATE badge (blue)

if (sources.length === 4-5)
  → Render POPULAR badge (purple)

if (sources.length >= 6)
  → Render VIRAL badge (gradient + pulse)
```

## Performance Strategy

```
Backend:
  ✓ Qdrant Grouping API (native dedup)
  ✓ Cache emails (Redis, 1h TTL)
  ✓ Limit sources per item (max 10)
  → Target: < 500ms search

Frontend:
  ✓ Lazy load EmailModal
  ✓ Prefetch adjacent sources
  ✓ Virtualize long lists (>20)
  → Target: < 300ms modal open
```

## Error Handling

```
Email Deleted:
  → Show "Email no longer available"
  → Disable "View Email" button

Network Error:
  → Show "Failed to load"
  → Provide [Retry] button

No Sources:
  → Show "No source information"
  → Warning state

Partial Data:
  → Show "Unknown" for missing fields
  → Still allow viewing if email_id exists
```
