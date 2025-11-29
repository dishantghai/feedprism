# Phase 5 Enhancements: Feed Card Redesign & Extraction Improvements

**Goal:** Improve visual engagement and content richness of feed cards, enhance LLM extraction accuracy.

**Built On Top Of:** Phase 5 Advanced Features (Discovery API, Scroll API, Analytics)

**Completed:** November 29, 2025

---

## Related Documentation

| Document | Scope |
|----------|-------|
| `Phase_5_Advanced_Features.md` | Original Phase 5 (Discovery API, Scroll API) |
| `05_implementation/implementation_plan.md` | Frontend UI phases |
| `PROJECT_STATUS.md` | **Single source of truth for progress** |

---

## Overview

This enhancement phase focused on two key areas:
1. **Richer Data Extraction** - Enhanced LLM prompts and data models to capture more relevant information
2. **Improved Feed UI** - Redesigned feed cards for better visual engagement and content-first display

---

## Enhancement 1: Extended Data Models

### 1.1 New Fields Added to Extraction Models

**File:** `feedprism_main/app/models/extraction.py`

| Field | Type | Description | Applies To |
|-------|------|-------------|------------|
| `hook` | `Optional[str]` | Compelling 1-2 sentence teaser | All types |
| `image_url` | `Optional[str]` | Thumbnail/banner image URL | All types |
| `event_type` | `Optional[str]` | webinar, conference, workshop, meetup, talk, hackathon | Events |
| `is_free` | `Optional[bool]` | Quick filter for free content | Events, Courses |
| `author_title` | `Optional[str]` | Author credentials (e.g., "CTO at Stripe") | Blogs |
| `key_points` | `Optional[List[str]]` | 3-5 main takeaways | Blogs |
| `what_you_learn` | `Optional[List[str]]` | Key skills/outcomes | Courses |
| `reading_time` | `Optional[str]` | Estimated read time | Blogs |
| `category` | `Optional[str]` | Content category (AI, Career, etc.) | Blogs |

### 1.2 API Model Updates

**File:** `feedprism_main/app/models/api.py`

Updated `FeedItem` model to include all new fields for API responses.

### 1.3 Frontend Type Updates

**File:** `frontend/src/types/index.ts`

```typescript
export interface FeedItem {
    // ... existing fields ...
    
    // New enrichment fields
    hook?: string;
    image_url?: string;
    event_type?: string;
    is_free?: boolean;
    author_title?: string;
    key_points?: string[];
    what_you_learn?: string[];
    reading_time?: string;
    category?: string;
}
```

---

## Enhancement 2: Improved LLM Extraction Prompts

### 2.1 Problem Statement

The original prompts had vague classification criteria, leading to:
- Meetups being extracted as courses
- Courses being extracted as blogs
- Single webinars classified as courses

### 2.2 Solution: Clear Type Definitions

**File:** `feedprism_main/app/services/extractor.py`

Each prompt now includes:

1. **Explicit Definition** - What IS this type?
2. **Include List** (✓) - What to extract as this type
3. **Exclude List** (✗) - What NOT to extract as this type
4. **Key Differentiator** - Simple decision rule

### 2.3 Updated Prompts

#### Event Prompt
```
=== WHAT IS AN EVENT? ===
An EVENT is a scheduled gathering at a SPECIFIC DATE AND TIME where people attend together.

EXTRACT AS EVENTS:
✓ Webinars (live online sessions with a specific time)
✓ Conferences (multi-day industry gatherings)
✓ Meetups (community gatherings, networking events)
✓ Workshops (hands-on sessions at a specific time)
✓ Talks/Presentations, Hackathons, AMAs

DO NOT EXTRACT AS EVENTS:
✗ Online courses (even if they have a start date)
✗ Articles or blog posts
✗ Self-paced tutorials, Podcast episodes

KEY: If there's no specific date/time, it's probably NOT an event.
```

#### Course Prompt
```
=== WHAT IS A COURSE? ===
A COURSE is a STRUCTURED EDUCATIONAL PROGRAM with a curriculum designed to teach specific skills over time.

EXTRACT AS COURSES:
✓ Online courses (Coursera, Udemy, edX, etc.)
✓ Bootcamps, Certification programs
✓ Multi-session training series
✓ Cohort-based courses, Self-paced video courses

DO NOT EXTRACT AS COURSES:
✗ Single webinars or talks (those are events)
✗ Meetups (those are events)
✗ Blog posts or tutorials (those are blogs)

KEY DIFFERENTIATOR:
- SINGLE SESSION at a specific time → EVENT
- STRUCTURED LEARNING with multiple lessons → COURSE
```

#### Blog Prompt
```
=== WHAT IS A BLOG/ARTICLE? ===
A BLOG is written content that you READ. Passive consumption, not active participation.

EXTRACT AS BLOGS:
✓ Blog posts and articles
✓ Newsletter featured content/essays
✓ Written tutorials and guides
✓ Research summaries, Case studies

DO NOT EXTRACT AS BLOGS:
✗ Events, webinars, meetups (you attend them)
✗ Online courses (structured learning)
✗ Product announcements without article content

KEY DIFFERENTIATOR:
- If you ATTEND it → EVENT
- If you ENROLL and learn over time → COURSE
- If you READ it → BLOG
```

---

## Enhancement 3: Feed Card UI Redesign

### 3.1 FeedCard Component (Email Wrapper)

**File:** `frontend/src/components/feed/FeedCard.tsx`

**Before:** Too thin - just a line with sender name
**After:** Balanced email context with:
- Sender avatar with initials
- Email subject line
- Type count badges (e.g., "1 event", "2 articles")
- Timestamp with clock icon

```tsx
// Email Header with avatar, subject, and type badges
<div className="px-4 py-3 border-b">
    <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br ...">
            {getInitials(sender)}
        </div>
        <div className="flex-1">
            <span className="text-sm font-medium">{sender}</span>
            <p className="text-xs truncate">{email_subject}</p>
        </div>
        {/* Type badges */}
        {typeCounts.event && <span className="bg-blue-100">1 event</span>}
        {typeCounts.course && <span className="bg-green-100">1 course</span>}
        {typeCounts.blog && <span className="bg-purple-100">1 article</span>}
    </div>
</div>
```

### 3.2 ExtractedItemCard Component

**File:** `frontend/src/components/feed/ExtractedItemCard.tsx`

**Key Changes:**
- Always use compact mode inside FeedCard (email context already shown)
- Added image support for all card types
- Display new metadata fields (event_type, is_free, duration, key_points)
- Cleaner, less "loud" color scheme

#### Compact Card Features:
| Card Type | Thumbnail | Metadata Shown |
|-----------|-----------|----------------|
| Event | Image or Date badge | event_type, location, time, is_free |
| Course | Image or icon | provider, duration, is_free |
| Blog | Image or category color | source, author, reading_time |

#### Image Support:
```tsx
{item.image_url ? (
    <img 
        src={item.image_url} 
        alt="" 
        className="w-12 h-12 rounded-lg object-cover"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
) : (
    <div className="w-12 h-12 rounded-lg bg-blue-100">
        <Calendar className="w-5 h-5 text-blue-600" />
    </div>
)}
```

---

## Enhancement 4: Gmail Client Improvements

### 4.1 Optimized Query

**File:** `feedprism_main/app/services/gmail_client.py`

**Before:** 
```python
"(unsubscribe OR newsletter OR event OR webinar OR course)"
# Full-text search - slow on large mailboxes
```

**After:**
```python
"category:promotions OR category:updates OR (subject:(newsletter OR webinar OR event OR course))"
# Uses Gmail's pre-indexed categories - much faster
```

### 4.2 Better Error Handling

- Added progress logging every 10 messages
- Catch all exceptions, not just HttpError
- Reduced default max_results from 50 → 20 for faster response

---

## Enhancement 5: Feed Router Updates

**File:** `feedprism_main/app/routers/feed.py`

Updated `_point_to_feed_item` to map all new fields from Qdrant payload:

```python
def _point_to_feed_item(point, item_type: str) -> FeedItem:
    payload = point.payload
    return FeedItem(
        # ... existing fields ...
        
        # New enrichment fields
        hook=payload.get("hook"),
        image_url=payload.get("image_url"),
        event_type=payload.get("event_type"),
        is_free=payload.get("is_free"),
        author_title=payload.get("author_title"),
        key_points=payload.get("key_points"),
        what_you_learn=payload.get("what_you_learn"),
        reading_time=payload.get("reading_time"),
        category=payload.get("category"),
    )
```

---

## Enhancement 6: Gmail & Pipeline Robustness

**Files:**
- `feedprism_main/app/services/gmail_client.py`
- `feedprism_main/app/routers/pipeline.py`

### 6.1 GmailClient Retries & Resilience

**File:** `feedprism_main/app/services/gmail_client.py`

- Added **retry logic** to `get_message`:
  - Signature: `get_message(self, message_id: str, retries: int = 3)`
  - Retries on non-`HttpError` exceptions (e.g., transient SSL / connection errors).
  - Uses backoff: waits **2s, 4s, 6s** between attempts.
  - Logs each retry with the attempt number and error.

- Hardened `get_messages_batch`:
  - Logs total count and progress every 10 messages.
  - Adds a small **100ms delay** between individual message fetches to reduce rate limiting.
  - Skips failed messages instead of aborting the whole batch.
  - Logs summary: `Failed to fetch X/Y messages` + `Fetched N/Y messages`.

### 6.2 /unprocessed-emails Endpoint Guard Rails

**File:** `feedprism_main/app/routers/pipeline.py`

- Added a **global in-flight guard** to prevent concurrent Gmail fetches:
  - Global flag: `_fetch_in_progress: bool`.
  - At the top of `get_unprocessed_emails`:
    - If a fetch is already running, respond with **HTTP 429** and message:
      - `"Email fetch already in progress. Please wait."`
  - Sets `_fetch_in_progress = True` at the start of the try block.
  - Resets `_fetch_in_progress = False` in a `finally` block so it recovers even on errors.

- Tuned Gmail fetch size for stability:
  - Reduced `max_results` used by the pipeline from **50 → 20 → 15**:
    - `raw_emails = gmail.fetch_content_rich_emails(days_back=days_back, max_results=15)`
  - Purpose: limit per-call load on Gmail, reduce SSL and rate-limit issues for large mailboxes.

- Safe behavior when Gmail returns no emails:
  - If `raw_emails` is empty, the endpoint returns a valid payload with:
    - `unprocessed_count = 0`
    - `total_fetched = 0`
    - `emails = []`
  - Avoids 500s in the "no matching emails" case.

Overall, these changes make the Phase 5 pipeline demo much more robust against flaky networks, SSL hiccups, and users clicking "Refresh" multiple times.

---

## Files Modified

| File | Changes |
|------|---------|
| `app/models/extraction.py` | Added new fields to Pydantic models |
| `app/models/api.py` | Added new fields to FeedItem API model |
| `app/services/extractor.py` | Rewrote all 3 extraction prompts |
| `app/services/gmail_client.py` | Optimized query, better error handling |
| `app/routers/feed.py` | Map new fields from Qdrant |
| `app/routers/pipeline.py` | Reduced max_results for speed |
| `frontend/src/types/index.ts` | Added new TypeScript fields |
| `frontend/src/components/feed/FeedCard.tsx` | Redesigned email wrapper |
| `frontend/src/components/feed/ExtractedItemCard.tsx` | Added image support, compact mode |
| `frontend/src/components/feed/FeedList.tsx` | Simplified layout |

---

## Verification

### Test Extraction Classification
```bash
# Re-extract emails to test new prompts
curl -X POST http://localhost:8000/api/pipeline/extract \
  -H "Content-Type: application/json" \
  -d '{"email_ids": ["test_email_id"]}'
```

### Verify New Fields in API Response
```bash
curl http://localhost:8000/api/feed?page=1&page_size=5 | jq '.items[0] | {hook, image_url, event_type, is_free}'
```

### Visual Verification
- Feed cards should show balanced email headers
- Items should be compact with images when available
- Event type labels should appear (Webinar, Workshop, etc.)
- Free badges should show for free content

---

## Known Limitations

1. **Existing Data** - Previously extracted items won't have new fields until re-extracted
2. **Image URLs** - LLM can only extract images with direct URL links in email text/HTML
3. **Classification** - Still depends on email content quality; ambiguous content may be misclassified

---

## Next Steps

1. **Phase 6: UI & Demo** - Add recommendation slide-out panel, analytics dashboard
2. **Re-extraction** - Consider bulk re-extraction to populate new fields
3. **Image Fallbacks** - Add placeholder images based on category/type

---

## Git Commit

```bash
git add -A
git commit -m "feat: Enhance feed cards with richer data and improve extraction prompts

## Data Model Enhancements
- Add new fields: hook, image_url, event_type, is_free, author_title, key_points, what_you_learn
- Update LLM prompts with clear type definitions and exclusion rules

## Frontend Improvements
- Redesign FeedCard with balanced email context
- Update ExtractedItemCard with compact mode and image support
- Add event_type labels, is_free indicators, duration display

## Backend Fixes
- Optimize Gmail query using categories for faster search
- Better error handling and progress logging
- Reduce default email fetch for faster response"
```

---

## Phase 5 Enhancements Complete! 🎉

**Builds on:** Phase 5 Advanced Features (Discovery API, Scroll API, Analytics)
**Next:** [Phase 6: UI & Demo](Phase_6_UI_Demo.md)
