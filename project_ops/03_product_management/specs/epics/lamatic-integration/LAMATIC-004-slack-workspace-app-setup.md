# LAMATIC-004: Add Minimal Router to FeedPrism

**Story ID:** LAMATIC-004  
**Type:** Backend/Router  
**Priority:** P0 (Critical)  
**Estimate:** 20 minutes  
**Status:** To Do  
**Depends On:** LAMATIC-003 (Bridge Service)

---

## Overview

Add a **single minimal router file** to FeedPrism that forwards requests from the Lamatic Bridge Service to the existing extraction pipeline. This is the **ONLY** change we make to the FeedPrism backend.

**Impact:** 1 new file (`app/routers/lamatic_bridge.py`) + 1 line in `app/main.py`

---

## Implementation Steps

### Step 1: Create Router File

Create `feedprism_main/app/routers/lamatic_bridge.py`:

```python
"""
Lamatic Bridge Router

Minimal router that receives forwarded requests from the Lamatic Bridge Service
and passes them to the existing FeedPrism extraction pipeline.

This is the ONLY file added to FeedPrism for the Lamatic integration.
"""

from typing import Dict, Any
from fastapi import APIRouter, Request, HTTPException
from loguru import logger

router = APIRouter(prefix="/api/lamatic", tags=["lamatic"])


@router.post("/bridge")
async def lamatic_bridge_endpoint(request: Request) -> Dict[str, Any]:
    """
    Receive email payload from Lamatic Bridge Service.
    
    Payload format (from Lamatic):
    {
        "email_id": "gmail_message_id",
        "subject": "Email subject",
        "from": "sender@example.com",
        "body_html": "<html>...",
        "body_text": "..."
    }
    
    Returns:
    {
        "status": "success",
        "email_id": "...",
        "extracted": {
            "events": [...],
            "courses": [...],
            "blogs": [...]
        }
    }
    """
    try:
        payload = await request.json()
        email_id = payload.get("email_id")
        
        if not email_id:
            raise HTTPException(status_code=400, detail="email_id is required")
        
        logger.info(f"[Lamatic Bridge] Received email: {email_id}")
        
        # TODO: In a full implementation, we would:
        # 1. Parse the email payload
        # 2. Call the orchestrator to extract content
        # 3. Store in Qdrant
        # 4. Return extraction results
        
        # For now, return a placeholder response
        # This will be implemented when we integrate with the existing pipeline
        
        return {
            "status": "success",
            "email_id": email_id,
            "message": "Router is working. Full extraction pipeline integration pending.",
            "extracted": {
                "events": [],
                "courses": [],
                "blogs": []
            }
        }
        
    except Exception as e:
        logger.error(f"[Lamatic Bridge] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

### Step 2: Register Router in Main App

Edit `feedprism_main/app/main.py`:

Find the section where routers are included (around line 36-41):

```python
# Register routers
app.include_router(feed_router)
app.include_router(emails_router)
app.include_router(search_router)
app.include_router(metrics_router)
app.include_router(pipeline_router)
app.include_router(demo_router)
```

Add **ONE line**:

```python
from app.routers.lamatic_bridge import router as lamatic_bridge_router

# Register routers
app.include_router(feed_router)
app.include_router(emails_router)
app.include_router(search_router)
app.include_router(metrics_router)
app.include_router(pipeline_router)
app.include_router(demo_router)
app.include_router(lamatic_bridge_router)  # ← ADD THIS LINE
```

### Step 3: Verify Router is Loaded

Restart the FeedPrism backend:

```bash
cd feedprism_main
uvicorn app.main:app --reload
```

Visit `http://localhost:8000/docs` and verify that `/api/lamatic/bridge` appears in the API documentation.

---

## Acceptance Criteria

### Functional
- [ ] New endpoint `/api/lamatic/bridge` is accessible
- [ ] Endpoint accepts JSON payloads with `email_id`
- [ ] Returns 200 status for valid requests
- [ ] Returns 400 for missing `email_id`

### Technical
- [ ] Only 1 new file created (`app/routers/lamatic_bridge.py`)
- [ ] Only 1 line added to `app/main.py`
- [ ] Existing tests still pass (no breaking changes)
- [ ] OpenAPI docs show the new endpoint

---

## Testing

Test the new endpoint:

```bash
# Test with curl
curl -X POST http://localhost:8000/api/lamatic/bridge \
  -H "Content-Type: application/json" \
  -d '{
    "email_id": "test_email_123",
    "subject": "Test Email",
    "from": "test@example.com",
    "body_html": "<p>Test</p>",
    "body_text": "Test"
  }'

# Expected response:
# {
#   "status": "success",
#   "email_id": "test_email_123",
#   "message": "Router is working...",
#   "extracted": {...}
# }
```

---

## Optional: Full Pipeline Integration

If you want to **fully integrate** with the existing extraction pipeline (not required for Lamatic demo), you can update the router to:

1. Call `EmailParser` to parse the HTML
2. Call `ExtractionOrchestrator` to extract content
3. Store results in Qdrant
4. Return real extraction results

This can be done later without affecting the Lamatic integration.

---

## Next Steps

After completing this story:
1. Test the full flow: Lamatic → Bridge → FeedPrism Router
2. Proceed to **LAMATIC-005** to build the Lamatic flow

---

## Rollback Plan

If needed, rollback is trivial:
1. Delete `app/routers/lamatic_bridge.py`
2. Remove the single import/include line from `app/main.py`
3. Restart the server

---

## Summary

**Files Changed:**
- `feedprism_main/app/routers/lamatic_bridge.py` (NEW - 50 lines)
- `feedprism_main/app/main.py` (MODIFIED - 1 line added)

**Impact:** Minimal. Zero changes to existing extraction logic, Qdrant, or other routers.
