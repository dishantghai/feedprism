# FeedPrism UI/UX Research (Single Document)

## 0. Executive Summary
FeedPrism is the Email Intelligence Layer for Spayce. The UI turns messy, content‑rich emails into a searchable, time‑aware, provenance‑rich library of events, courses, blogs, and actions. The design emphasizes:
- Retrieval over generation (hybrid dense + lexical, payload filters, reranking).
- Time awareness (upcoming/past), deduplication (canonical items), and source traceability.
- Lightweight demo UI with metrics to satisfy hackathon judges and sponsor criteria.

## 1. Goals & Non‑Goals
- Goals
  - Fast discovery of valuable items within content‑rich emails.
  - Transparent retrieval with source links and metrics visible.
  - Action visibility (RSVP, register, deadlines) with one‑click CTAs.
  - Scalable information architecture that flows into Spayce Spaces/Sub‑Spaces.

- Non‑Goals (Hackathon scope)
  - Full Spayce Content Explorer implementation (provide minimal integration hooks).
  - Complex calendar sync beyond .ics export.
  - Advanced graph visualization (stretch only).

## 2. Primary Users & Jobs‑to‑Be‑Done
- End‑User (Learner/Professional)
  - Find upcoming AI/ML events quickly.
  - Browse all recent ML courses to plan a learning path.
  - See deduplicated canonical items across newsletters.
  - Act on pending deadlines with direct CTAs.
  - Verify provenance from the original email.

- Hackathon Judge/Evaluator
  - Confirm memory depth and Qdrant feature usage at a glance.
  - See measurable quality improvements (precision@k, MRR, latency).
  - Validate low‑hallucination retrieval via source links.
  - Understand production‑credible architecture.

## 3. Core Flows
- Search & Filter Flow
  1) User types a query (e.g., “upcoming NLP workshops”).
  2) Applies filters: Type=Event, Status=Upcoming, Sender/Theme.
  3) Results display with canonical badge, relevance score, and source link.
  4) Action in details: “Add to Calendar”, “Open Original Email”, “Register”.

- Actions Flow
  1) Navigate to “Actions” view.
  2) See structured items: “Register by Nov 30” → CTA link.
  3) Optionally mark done (MVP: engage CTA; stretch: completion status).

- Deduplication Flow
  1) Results show “Seen in N sources”.
  2) Expand to view source emails and choose preferred link (e.g., best discount).
  3) Canonical item remains the primary card.

- Provenance Flow
  1) Every result includes “Open Original Email”.
  2) Users can verify extracted details vs. source.

## 4. Key Screens

### 4.1 Dashboard (Hackathon Demo)
- Hero: “Inbox → Organized Memory”
- Tiles:
  - New Items Extracted: Events/Courses/Blogs/Actions
  - Quick Filters: Upcoming Events, Recent Courses, All Actions
- Metrics Panel (live): Precision@10, MRR, Latency p95/p99, Dedup Rate
- CTA: Connect Gmail (if not connected)

### 4.2 Library (Search & Results)
- Header: Search bar and filter panel
- Result Cards:
  - Title, Type badge, Date/Status (Upcoming/Past)
  - Sender, Tags, Canonical badge (“Seen in N sources”)
  - Actions: View Details | Open Original Email | Add to Calendar | View Actions
- Sort: Relevance | Recency | Start Time
- Pagination or infinite scroll (MVP: simple pagination)

### 4.3 Details Panel
- Title and Type badge
- Structured fields:
  - Events: Date/time, location/link, image (optional), description
  - Courses: Provider, link, image, description
  - Blogs: Author, link, image, description
- Action Items section:
  - CTA buttons: Register/RSVP/Deadline
- Sources section:
  - List of deduped source emails with links
- Transparency section:
  - Relevance score and payload preview (for judge visibility)

### 4.4 Actions View
- List of pending actions with status badges:
  - “Register by Nov 30 — NLP Workshop” [Open Link]
  - “RSVP — AI Summit 2024” [Open Link]
- Filters: Action type (RSVP/Register/Deadline), Time window

### 4.5 Empty States
- Search
  - “No results. Try widening filters or switching Status to ‘All’.”
- Actions
  - “No pending actions. Check ‘Past’ or ‘Unknown’ items.”
- Gmail
  - “Connect Gmail to start ingesting content‑rich emails.”

## 5. Information Architecture
- Top‑Level Sections
  - Dashboard
  - Library (Search)
  - Actions
  - Metrics (for demo; can be embedded on Dashboard)
- Facets and Filters
  - Type: All | Events | Courses | Blogs | Resources
  - Status: All | Upcoming | Past | Unknown
  - Sender: Any | top senders
  - Theme: Any | AI/ML Events | Data Science Courses | Tech Newsletters
  - Date Range: custom picker
  - Sort: Relevance | Recency | Start Time
- Data Entities
  - Item (Event, Course, Blog, Resource)
  - Canonical group with sources
  - Action (deadline, CTA link, type)
  - Source email reference
  - Metrics snapshot

## 6. Copy & Microcopy
- Search Placeholder: “Search events, courses, blogs… Try: ‘upcoming NLP workshops’”
- Canonical Badge: “Seen in N sources”
- Source Link: “Open Original Email”
- Action CTAs: “Register”, “RSVP”, “Add to Calendar”
- Metrics Labels: “Precision@10”, “MRR”, “Latency p95/p99”, “Dedup Rate”
- Empty State Hints: “Widen filters”, “Switch Status to ‘All’”, “Connect Gmail”

## 7. Interaction Design Notes
- Filters update results immediately (debounced search, e.g., 300ms).
- Clicking a card opens the Details panel (modal or side drawer).
- Canonical badge expands to show source list inline.
- Metrics panel updates after each query (minimal flicker; show last query’s stats).
- Accessibility: keyboard navigable filters, buttons with clear focus states, sufficient contrast, semantic HTML.

## 8. Visual Design Principles
- Clean, information‑dense cards with clear hierarchy.
- Badges and chips for Type, Status, Canonical count.
- Neutral palette with accent for actions and metrics.
- Icons:
  - Event (calendar), Course (graduation cap), Blog (document), Action (bolt/flag).
- Loading states: skeleton cards; spinners avoided where possible.

## 9. Spayce Alignment
- Spaces/Sub‑Spaces
  - FeedPrism surfaces items that can be bookmarked into Spaces/Sub‑Spaces.
  - Themes map to Spaces (e.g., “AI/ML Events” Space).
- Content Explorer
  - Library can render in “Blog View” (rich card) or “Folder View” (compact list).
  - Source‑Content bidirectional links preserved.
- Email Integration
  - Gmail connect CTA; provenance via source link.
- Extensibility
  - Future: integrate courses/events directly into Spayce schedules and notes.

## 10. Sponsor & Judge Checklist (In‑UI Evidence)
- Qdrant Depth visible via:
  - Hybrid Search label in results header.
  - Filters (payload‑backed) for type/time/sender/theme.
  - Canonical items badge and source expansion.
  - Metrics panel with precision@k, MRR, latency, dedup rate.
- Lamatic (optional)
  - If used, show a “Workflow Runs” badge on ingestion page.
- Provenance
  - “Open Original Email” on every item.

## 11. Metrics in UI (Targets)
- Precision@10 ≥ 0.75
- MRR ≥ 0.6
- Latency p95 ≤ 800ms (small dataset)
- Dedup Rate ≥ 30%
- Temporal Classification ≥ 90%
- Extraction Accuracy ≥ 85%
- Display metrics inline with last query time stamp.

## 12. Research Plan & Methods
- Unmoderated task tests (Maze/Useberry/Lyssna)
  - Tasks: search an upcoming event; export to calendar; find all courses last 3 months; open original email.
  - Success metrics: task completion time, first‑click success, SUS/UMUX‑Lite scores.
- Card sorting / tree testing (Optimal Workshop/Lyssna)
  - Validate filter taxonomy and grouping (“Type/Status/Sender/Theme”).
- Moderated usability interviews (Lookback/Zoom)
  - Observe comprehension of canonical items and source tracing.
- Analytics (Mixpanel/Amplitude)
  - Track search queries, filter usage, click‑through on actions, source link opens.
- Heatmaps/session replay (Hotjar/FullStory)
  - Identify friction in filter panel and details view.

## 13. Content Model (for designers/devs)
- Item
  - id, title, description, type, date/time, status
  - sender, tags, theme
  - image_url (optional)
  - relevance_score
  - canonical_item_id (optional)
  - actions: [{type, deadline, link, context}]
  - source_email_id, source_link
  - owner_id
- Metrics Snapshot
  - precision_at_10, mrr, latency_p95, dedup_rate, timestamp

## 14. Wireframe Annotations (Text)
- Dashboard
  - Top: headline + short pitch
  - Left: metrics panel
  - Right: ingestion status (Gmail connected/not)
  - Bottom: quick filters (Upcoming Events, Recent Courses, Actions)

- Library
  - Top bar: search, filters, sort
  - Grid/list: cards with badges and primary actions
  - Footer: pagination; metrics panel sticky or floating

- Details panel
  - Left: item description and structured fields
  - Right: actions block with CTAs
  - Bottom: sources list; transparency block (relevance/payload preview)

- Actions view
  - List grouped by deadline proximity
  - CTA prominent; filter chips above

## 15. Copy Variants (A/B options)
- Search placeholder
  - A: “Search events, courses, blogs…”
  - B: “Find ‘upcoming NLP workshops’ or ‘ML courses last 3 months’”
- Canonical badge
  - A: “Seen in N sources”
  - B: “Consolidated from N newsletters”
- Metrics header
  - A: “Retrieval Quality”
  - B: “Search Quality Metrics”

## 16. Accessibility Checklist
- Color contrast AA+
- Keyboard access to search and filters
- Focus states visible on cards and CTAs
- ARIA labels on badges and metrics
- Alt text for images; icons with titles
- Avoid text in images; use semantic headings

## 17. Risks & Mitigations (UI)
- Risk: Metrics confuse end‑users
  - Mitigation: Scope metrics primarily to demo mode; in production, tuck under “Developer Tools”.
- Risk: Canonicalization not understood
  - Mitigation: Tooltip and expandable sources list; show a concrete example.
- Risk: Over‑filtering leading to empty results
  - Mitigation: Smart defaults; suggest widening filters; show popular queries.

## 18. Demo Script (60–90s)
- Hook: “We’re memory‑first, not a chatbot.”
- Before→After: Inbox screenshot vs. organized Library.
- Live search: “upcoming NLP workshops” → canonical item → open source → export calendar.
- Actions: “Register by Nov 30” CTA from Actions view.
- Metrics: precision@10, MRR, latency, dedup rate update.
- Close: “FeedPrism is Spayce’s Email Intelligence Layer—useful, performant, and provenance‑rich.”

## 19. Handoff Notes
- Component inventory
  - Search bar, Filter panel, Card, Badge, Details panel, Actions list, Metrics panel.
- API bindings
  - /search → Library results
  - /item/:id → Details
  - /export/calendar → Calendar CTA
  - /metrics → Metrics panel (optional)
- Spayce integration
  - “Save to Space” action (hook)
  - Theme → Space mapping

## 20. Next Iteration Targets
- Bulk export to calendar
- Saved searches as Smart Spaces
- Confidence badges on extraction fields
- Graph relationships glimpse (stretch)
- Team permissions (owner_id, team_id filters)