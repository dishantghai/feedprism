# FeedPrism Product Backlog

> Quick capture, minimal fields. See `WORKFLOW.md` for how this works.

---

## Active Items

### Features

#### F-015: Course View Enhancement
Priority: P2
Upgrade Course cards with provider branding, instructor info, level/duration/cost, and Enroll CTA.

#### F-001: Metrics Dashboard Panel
Priority: P1
Frontend metrics panel showing precision@k, latency, extraction counts, and pipeline health.


---

### Bugs

*None tracked currently.*

---

### Improvements

*None tracked currently.*

---

### Tech Debt

*None tracked currently.*

---

## Completed

#### ✅ F-015: Course View Enhancement (Nov 30, 2025)
Provider branding, instructor/level/duration/cost display, Enroll Now CTA, View Source button.

#### ✅ F-010: Search Bar Integration (Nov 30, 2025)
Persistent SearchBar with debounced search, inherits active filters, semantic search via embeddings.

#### ✅ F-013: Saved Tags & Tag-Based Filtering (Nov 30, 2025)
ClickableTag on cards, QuickTagBar with saved/frequent tags, localStorage persistence, remove tags, backend filtering.

#### ✅ F-014: Event View Enhancement (Nov 30, 2025)
Enhanced EventCard with larger date badge, description, Register/Add to Calendar CTAs, View Source link.

#### ✅ F-008: Source Email Modal (Nov 30, 2025)
View original email in modal with HTML body, metadata, and "Open in Gmail" action.

#### ✅ F-009: Source Icon Overlay (Nov 30, 2025)
Gmail icon on FeedCard avatars and DetailModal header. Extensible for future sources.

#### ✅ F-007: Filter by Sender (Nov 30, 2025)
Sender dropdown in FilterBar with search, multi-select, display names, and item counts.

#### ✅ F-006: Micro-animations & Polish (Nov 30, 2025)
Hover effects, staggered list animations, modal transitions, reduced motion support.

#### ✅ F-005: Loading States & Skeleton UI (Nov 30, 2025)
Reusable skeleton components (FeedCard, EmailItem, Metrics, BlogCard, DetailModal) with shimmer animation.

#### ✅ F-004: Blog View Enhancement (Nov 30, 2025)
Full blog cards in email view (not compact), detail modal with featured image, hook, key takeaways.

#### ✅ I-001: Re-extract Existing Emails (Nov 30, 2025)
Added `/api/pipeline/re-extract` endpoint to re-process emails with new extraction logic (hook, image_url, etc.).

#### ✅ B-001: SSE Extraction State Sync (Nov 30, 2025)
Backend status endpoint + frontend polling to sync extraction state on page refresh.

#### ✅ F-003: Capture Blog Images and Hooks (Nov 30, 2025)
Backend: Extract images from HTML, pass to LLM, enhanced hook prompts, store all blog fields in Qdrant.

#### ✅ F-002: Fix Blog View (Nov 30, 2025)
Frontend: Enhanced BlogCard with prominent images, larger size, and more content display.

---

## Ideas Parking Lot

> Half-formed ideas, maybes, future possibilities. Not committed.

- Calendar integration (export events to .ics)
- Graph visualization of content relationships
- Email preference learning
- Mobile-responsive improvements
- Batch operations on feed items
