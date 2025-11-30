# I-001: Re-extract Existing Emails for New Fields

**Priority: P1**
**Status:** ✅ Complete (Nov 30, 2025)

## Problem

Existing extracted items in Qdrant are missing new fields added in F-003:
- `hook` - Engaging opening line for blog cards
- `image_url` - Blog thumbnail image
- `author_title` - Author's role/title
- `key_points` - Summary bullet points

These fields are now extracted by the updated LLM prompts, but old data doesn't have them.

## Goal

- [x] Provide a way to re-extract existing emails with the new extraction logic
- [x] Delete old extracted items before re-extraction to avoid duplicates
- [x] Support re-extracting all emails or specific ones

## Solution

### Backend

**New endpoints in `app/routers/pipeline.py`:**

1. `GET /api/pipeline/processed-emails` - Returns list of all processed email IDs
2. `POST /api/pipeline/re-extract` - Re-extracts emails with SSE progress streaming
   - Accepts optional `email_ids` array (re-extracts all if not provided)
   - Deletes existing items for those emails first
   - Runs full extraction pipeline with new logic

**New method in `app/database/qdrant_client.py`:**

- `delete_by_email_ids(email_ids)` - Deletes all items from all collections for given source email IDs

### Frontend

**New functions in `src/services/api.ts`:**

- `getProcessedEmails()` - Fetches processed email IDs
- `startReExtraction(emailIds, onEvent, onError, onComplete)` - SSE streaming for re-extraction

## Usage

### Via API (curl)

```bash
# Check how many emails are processed
curl http://localhost:8000/api/pipeline/processed-emails

# Re-extract ALL processed emails
curl -X POST http://localhost:8000/api/pipeline/re-extract \
  -H "Content-Type: application/json" \
  -d "null"

# Re-extract specific emails
curl -X POST http://localhost:8000/api/pipeline/re-extract \
  -H "Content-Type: application/json" \
  -d '["email_id_1", "email_id_2"]'
```

### Via Frontend

The API functions are available for future UI integration (e.g., a "Re-extract All" button in settings).

## Files Changed

| File | Change |
|------|--------|
| `app/routers/pipeline.py` | Added `/re-extract` and `/processed-emails` endpoints |
| `app/database/qdrant_client.py` | Added `delete_by_email_ids()` method |
| `frontend/src/services/api.ts` | Added `getProcessedEmails()` and `startReExtraction()` |
