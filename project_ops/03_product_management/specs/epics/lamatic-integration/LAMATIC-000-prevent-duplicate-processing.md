# LAMATIC-000: Prevent Duplicate Email Processing

**Story ID:** LAMATIC-000  
**Type:** Backend/Safeguard  
**Priority:** P0 (Critical)  
**Estimate:** 30 minutes  
**Status:** ✅ Complete

---

## Overview

Implement an idempotency check in the new Lamatic ingestion pipeline to prevent processing the same email multiple times. Since Lamatic will push emails to FeedPrism in real-time, we must ensure that if an email is re-sent (e.g., due to retries, backfills, or flow restarts), it is identified as "already processed" and skipped, similar to how the current pull-based system works.

**Why this is critical:**
Without this check, re-running a Lamatic flow on past emails would duplicate vectors in Qdrant, polluting the search results and wasting storage/compute.

---

## Technical Approach

The logic should mirror the existing `get_unprocessed_emails` logic in `app/routers/pipeline.py` but adapted for single-item push.

1.  **Check Qdrant:** Before processing an incoming email from Lamatic, query Qdrant to see if a point with `source_email_id == incoming_email_id` already exists.
2.  **Service Method:** Expose a method `is_email_processed(email_id: str) -> bool` in `QdrantService` (or reuse existing `get_processed_email_ids` efficiently).
3.  **API Behavior:**
    *   If processed: Return `200 OK` with a message like `{"status": "skipped", "reason": "already_processed"}`.
    *   If new: Proceed with extraction and ingestion.

---

## Acceptance Criteria

### Functional
- [x] The system **MUST** check if an email ID exists in Qdrant before starting extraction.
- [ ] If the email ID exists, the API **MUST** return a success response (200) but **skip** all processing (no LLM calls, no DB writes). *(API integration in LAMATIC-003)*
- [ ] The response for skipped emails should clearly indicate it was skipped. *(API integration in LAMATIC-003)*
- [x] New emails **MUST** be processed normally.

### Technical
- [x] Implement efficient check (e.g., `scroll` with filter for specific ID, or `retrieve` if we use email ID as point ID - *Note: We currently use UUIDs for point IDs, so we must filter by `source_email_id` payload field*).
- [x] Ensure the check covers all collections (`events`, `courses`, `blogs`).

---

## Implementation Plan

1.  **Modify `QdrantService` (`app/database/qdrant_client.py`):**
    - Add `is_email_processed(email_id: str) -> bool` method.
    - This method should query all 3 collections. If found in any, return `True`.

2.  **Usage:**
    - This method will be used in the future `LAMATIC-003` (API Router) implementation.

---

## References
- Existing logic: `app/routers/pipeline.py` -> `get_unprocessed_emails`
- Qdrant Client: `app/database/qdrant_client.py`
