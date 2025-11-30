# B-001: SSE Extraction State Sync Issue

**Priority: P1**
**Status:** ✅ Complete (Nov 30, 2025)

## Problem

When the backend is actively extracting content, the frontend can lose sync and show stale state ("15 emails ready" with Extract button) instead of the extraction progress. This happens because:

1. **SSE connection is ephemeral** — If the user refreshes the page, switches tabs, or loses network briefly, the SSE stream is lost
2. **No server-side extraction state** — Backend doesn't track "extraction in progress" globally, so frontend can't query current status on page load
3. **No reconnection logic** — Frontend doesn't attempt to reconnect or recover state after SSE disconnection

**User Impact:** Confusing UX where backend is working but frontend shows nothing is happening. User might click "Extract" again, causing duplicate work or errors.

## Goal

- [x] Frontend always reflects actual backend extraction state
- [x] Page refresh during extraction shows current progress
- [x] SSE disconnection triggers automatic reconnection or state recovery
- [x] Prevent duplicate extraction requests while one is in progress

## Analysis

### Current Flow

```
User clicks Extract → POST /pipeline/extract → SSE stream starts → Frontend updates
                                                    ↓
                                            (connection lost)
                                                    ↓
                                            Frontend shows stale state
                                            Backend continues extracting
```

### Root Causes

1. **No extraction status endpoint** — Frontend can't ask "is extraction running?"
2. **No extraction ID/session tracking** — Can't reconnect to an ongoing extraction
3. **SSE is fire-and-forget** — Once connection drops, no recovery mechanism

## Proposed Solutions

### Option A: Polling-based Status (Simpler)

Add a `/pipeline/extraction-status` endpoint that returns:
```json
{
  "is_extracting": true,
  "progress": {
    "current": 5,
    "total": 15,
    "events": 3,
    "courses": 1,
    "blogs": 2
  },
  "started_at": "2025-11-30T13:40:00Z"
}
```

Frontend polls this on page load and periodically during extraction.

**Pros:** Simple, works across page refreshes
**Cons:** Not real-time, adds polling overhead

### Option B: SSE Reconnection with State Recovery (Better UX)

1. Backend tracks extraction state globally (like `_fetch_in_progress`)
2. On SSE connect, if extraction is running, immediately send current progress
3. Frontend attempts reconnection on disconnect

**Pros:** Real-time, seamless recovery
**Cons:** More complex state management

### Option C: Hybrid (Recommended)

1. Add status endpoint for initial state check on page load
2. Keep SSE for real-time updates during active extraction
3. Frontend checks status on mount, connects to SSE if extraction is running

## Implementation Plan

### Backend Changes

**File:** `app/routers/pipeline.py`

1. Add global extraction state tracking:
```python
_extraction_in_progress = False
_extraction_progress = {
    "current": 0,
    "total": 0,
    "events": 0,
    "courses": 0,
    "blogs": 0,
    "message": ""
}
```

2. Add status endpoint:
```python
@router.get("/extraction-status")
async def get_extraction_status():
    return {
        "is_extracting": _extraction_in_progress,
        "progress": _extraction_progress if _extraction_in_progress else None
    }
```

3. Update `_extraction_stream()` to set/clear global state

### Frontend Changes

**File:** `src/services/api.ts`
- Add `getExtractionStatus()` function

**File:** `src/components/prism/PrismOverview.tsx`
1. On mount, check extraction status
2. If extraction is running, set state to 'extracting' and start polling
3. Add reconnection logic for SSE disconnection

## Files to Modify

| File | Changes |
|------|---------|
| `app/routers/pipeline.py` | Add extraction state tracking, status endpoint |
| `src/services/api.ts` | Add `getExtractionStatus()` |
| `src/components/prism/PrismOverview.tsx` | Check status on mount, handle reconnection |

## Notes

- This is a UX polish issue, not a data integrity issue (extraction completes regardless)
- Consider adding a "extraction already in progress" guard on the Extract button
- Could also show a toast/notification when extraction completes in background
