# FeedPrism: Master Context Document

**Hackathon:** Memory Over Models — AI Hackathon  
**Project Type:** Unstructured Data RAG Challenge  
**Product Alignment:** Spayce Email AI Layer Module  
**Document Version:** 1.1

---

## 1. Executive Overview

### What FeedPrism Is

FeedPrism is an intelligent email intelligence system that transforms unstructured, content-rich emails into organized, searchable knowledge. It automatically processes emails (newsletters, event announcements, course invitations, blog digests) to extract structured information—events, courses, blogs, actionable items—converting messy HTML into clean, categorized content with rich metadata, source traceability, and semantic search capabilities.

**The Name:** "FeedPrism" captures the core metaphor—a continuous **feed** of raw, messy email data passes through a **prism** that refracts it into a structured spectrum of organized knowledge (Events, Courses, Blogs, Actions).

### Why It Exists

**The Problem:**
- Professionals receive 50-200+ content-rich emails monthly (newsletters, event invites, course announcements, blog digests)
- Valuable content (events, courses, articles, actionable items) gets buried in inbox chaos
- Manual extraction is time-consuming and inconsistent
- No way to search semantically across extracted content ("find upcoming ML courses")
- Duplicate content appears across multiple sources with no deduplication
- No temporal awareness (upcoming vs. past events)
- Actionable items (RSVPs, registrations, deadlines) are hidden in email prose
- Non-content emails (transactional, personal) clutter the feed without proper tagging

**The Solution:**
FeedPrism uses vector memory (Qdrant) and intelligent extraction to create a persistent, searchable knowledge base from **all emails**. It identifies content-rich emails, extracts structured information, tags non-content emails, and surfaces actionable items—enabling users to discover, organize, and act on valuable content that would otherwise be lost in the feed.

### Hackathon Alignment: "Memory Over Models"

FeedPrism embodies the **memory-first paradigm:**

1. **Persistent Vector Memory:** Every extracted item (event, course, blog, action) is embedded and stored in Qdrant with rich metadata (type, tags, dates, source, status, actionable_items)
2. **Retrieval Over Generation:** The system prioritizes accurate retrieval with hybrid search (dense + lexical) and reranking rather than generating synthetic content
3. **Temporal Memory:** Time-aware payloads enable "upcoming vs past" reasoning without re-prompting an LLM
4. **Source Traceability:** Every retrieved item links back to the original email, ensuring provenance
5. **Deduplication Memory:** Vector similarity identifies canonical items across multiple email sources, reducing redundancy
6. **Long-term Utility:** Unlike chat interfaces, FeedPrism builds a growing knowledge base that improves with more data
7. **Actionable Memory:** Extracts and surfaces action items (RSVPs, deadlines, registrations) from email prose

### Value Proposition

**Hackathon Value:**
- Demonstrates advanced Qdrant features (hybrid search, payload filtering, reranking, multimodal potential)
- Tackles genuinely messy unstructured data (HTML emails with embedded links, images, event details)
- Shows measurable quality (precision@k, MRR, latency) and production-readiness
- Differentiates through metrics, resilience, and RAG discipline

**Product Value (Spayce Integration):**
- Becomes the **Email Intelligence Layer** for Spayce's evolving productivity platform
- Starts with learning content extraction (Phase 1), expands to **general email intelligence** (work, personal)
- Enables automatic content flow from email sources into Spayce's hierarchical folder structure
- Implements content tag triggers, multi-content classification, and actionable item extraction
- Forms the foundation for calendar integration, task management, event preference learning, and workflow automation

**Competitiveness:**
- **Top 10 likelihood:** High—functional hybrid retrieval, filters, metrics, clean demo
- **Top 3 potential:** Achievable with strong quality metrics, deduplication, time-aware reasoning, and polished README demonstrating HNSW/quantization decisions

---

## 2. Vision and Goals

### High-Level Vision

FeedPrism envisions a world where **valuable information flows automatically from scattered email sources into organized, actionable knowledge.** Content-rich emails (newsletters, event invites, course announcements) are the first focus; the architecture supports expansion to all email types (work, personal, transactional) and eventually non-email sources (blog subscriptions, course platform feeds, event archives, social media).

The system demonstrates that **memory and retrieval quality, not model size, determine usefulness** in knowledge management and email intelligence.

### Short-Term Hackathon Goals

**Minimum Winning Product (7 Days):**

1. ✅ **Email Ingestion:** Gmail API integration; fetch 50-200 content-rich emails
2. ✅ **Content Extraction:** Identify and extract events, courses, blogs, and **actionable items** from HTML
3. ✅ **Email Tagging:** Tag all emails (content-rich, transactional, personal, promotional) for filtering
4. ✅ **Theme Suggestions:** AI suggests content themes; user can configure labels/senders
5. ✅ **Vector Storage:** Store chunks in Qdrant with structured payloads (type, tags, date, source_email_id, status, actions)
6. ✅ **Hybrid Retrieval:** Dense embeddings + lexical search with reranking
7. ✅ **Filters:** Time-aware (upcoming/past), type-based, sender-based, theme-based
8. ✅ **Deduplication:** Canonical item detection via vector similarity
9. ✅ **Demo:** Before/after UI showing messy inbox → organized content library + actionable items
10. ✅ **Metrics:** Precision@10, MRR, latency p95/p99, deduplication rate

**Stretch Goals:**
- Calendar integration ("upcoming events not on calendar" + export)
- Multi-label classification with confidence thresholds
- Graph visualization of content relationships

### Long-Term Product Goals (Spayce Ecosystem)

**Integration Roadmap:**

1. **Email Intelligence Layer - Phase 1 (Hackathon - Learning Focus):**
   - Extract content from content-rich emails (newsletters, event invites, course announcements)
   - Extract actionable items (RSVPs, registrations, deadlines)
   - Tag all emails for filtering
   - Store in Qdrant with metadata
   - Provide search and filter APIs

2. **Spayce Integration (Phase 2 - Post-Hackathon):**
   - API-first architecture enables Spayce UI to consume FeedPrism endpoints
   - Extracted content flows into Spayce's Space/SubSpace hierarchy
   - Content tag triggers route items to designated folders
   - Source traceability links Spayce items back to original emails

3. **General Email Intelligence (Phase 3 - Work & Personal):**
   - Expand to work emails (meeting notes, project updates, decisions)
   - Personal email intelligence (receipts, travel confirmations, important dates)
   - Cross-email insights ("All decisions about Project X")
   - Email-to-task automation
   - Smart email archiving based on content value

4. **AI Second Brain (Phase 4):**
   - FeedPrism becomes one subsystem in Spayce's unified content repository
   - Multi-context workflows (combine email content + notes + PDFs)
   - Graph-based content hierarchy emerges from vector similarity

**Relationship with Spayce:**
- **Modular Design:** FeedPrism is a standalone service with clean APIs
- **Data Sharing:** Spayce reads from FeedPrism's Qdrant collections via API
- **UI Separation:** Hackathon has minimal demo UI; Spayce provides production UI
- **Reusable Core:** 100% of FeedPrism code becomes Spayce's email module

---

## 3. Key Personas

### Persona 1: End-User (Inside Spayce)

**Profile:**
- Learning professional (Data Scientist, AI Engineer, Product Manager)
- Subscribes to 10-20 newsletters (AI/ML Weekly, DataCamp, O'Reilly, conference organizers)
- Receives 50-200 content-rich emails monthly
- Struggles to extract and organize valuable content

**Needs:**
- Automatic extraction of events, courses, articles, and **actionable items** from content-rich emails
- Semantic search ("Find upcoming NLP workshops")
- Time-aware filtering ("Show only upcoming events")
- **Action tracking** ("Show me all pending RSVPs and deadlines")
- Source traceability ("Which email was this from?")
- Deduplication across multiple sources
- **Theme-based organization** ("Show me all AI/ML Events")
- One-click calendar export and action execution

**Success Markers:**
- Can find relevant content in <5 seconds vs. 5+ minutes of manual inbox search
- Zero duplicates in search results
- High relevance (precision@10 ≥ 75%)
- Upcoming events accurately identified
- Direct link to original email for verification

**Pain Points Solved:**
- ❌ Lost content buried in 200+ unread emails → ✅ Organized library
- ❌ Duplicates across sources → ✅ Canonical items
- ❌ "Was this event last week or next week?" → ✅ Temporal status
- ❌ "Which email mentioned this course?" → ✅ Source link
- ❌ Missed registration deadlines → ✅ Actionable items view
- ❌ Manual email categorization → ✅ AI theme suggestions

### Persona 2: Hackathon Evaluator / Judge

**Profile:**
- Technical evaluator from Qdrant, Lamatic, or AI Collective
- Reviewing 50-100 projects in 2-3 days
- Prioritizes projects showing **memory depth**, **retrieval quality**, and **production-readiness**
- Wants to see **measurable results**, not just "it works"

**Expectations:**
1. **Qdrant Depth:**
   - Advanced vector DB usage beyond basic embedding storage
   - Hybrid search (dense + sparse), reranking, payload filtering
   - HNSW parameter tuning, quantization awareness, cost considerations

2. **Retrieval Quality:**
   - Benchmark metrics (precision@k, recall@k, MRR)
   - Ablation studies (dense-only vs. hybrid vs. hybrid+rerank)
   - Clear improvement signal

3. **Messy Data Handling:**
   - Real email parsing (HTML, inline images, event extraction)
   - Robustness (fallbacks, retries, error handling)

4. **Provenance & Transparency:**
   - Source traceability
   - Low/zero hallucination (thanks to filters and reranking)
   - Explainable results

5. **Real-World Utility:**
   - Solves a genuine problem
   - Production-credible architecture
   - Clear path to scale

**Success Markers for Judges:**
- ✅ README explains HNSW params, quantization, and scaling rationale
- ✅ Metrics dashboard shows precision@10 ≥ 0.75, MRR ≥ 0.6
- ✅ Demo shows before/after transformation clearly
- ✅ Hybrid search + reranking improve results vs. baseline
- ✅ Deduplication reduces duplicates by ≥30%
- ✅ Latency p95 ≤ 800ms on small dataset
- ✅ Every result links to source email

**Red Flags to Avoid:**
- ❌ Pure chatbot UI with no memory demonstration
- ❌ No metrics or benchmarks
- ❌ Hallucinated answers with no source
- ❌ Generic RAG with no domain-specific innovation
- ❌ Vague "it uses Qdrant" without feature depth

---

## 4. High-Level System Concept

### Conceptual Flow

```
Raw Email Feed (Content-Rich + Transactional + Personal + Promotional)
        ↓
    Ingestion (Gmail API)
        ↓
    Email Tagging (Content-Rich / Transactional / Personal / Promotional)
        ↓
    Filter: Content-Rich Emails Only
        ↓
    Normalization (HTML → Clean Text + Metadata)
        ↓
    Content Type Detection (Event / Course / Blog / Resource)
        ↓
    Actionable Item Extraction (RSVPs, Deadlines, Registrations)
        ↓
    Structured Extraction (Title, Description, Date, Image, Links, Actions)
        ↓
    Theme Suggestion (AI analyzes patterns, suggests themes)
        ↓
    Embedding (Dense Vectors + Lexical Vectors)
        ↓
    Qdrant Storage (Payloads: type, tags, source_id, status, time, actions, theme)
        ↓
    Deduplication (Vector Similarity → Canonical Items)
        ↓
    Indexing (HNSW for Fast Retrieval)
        ↓
    User Query
        ↓
    Hybrid Retrieval (Dense + Lexical)
        ↓
    Filtering (Time, Type, Sender, Theme, Email Tag)
        ↓
    Reranking (Cross-Encoder or LLM Scoring)
        ↓
    Results with Source Links + Actionable Items
        ↓
    User Value (Discovery, Organization, Action)
```

### How Memory, Retrieval, and Relevance Are Handled

**Memory:**
- **Persistent Vectors:** Every content item and action is embedded once and stored permanently
- **Rich Payloads:** Metadata (type, tags, timestamps, status, source_email_id, sender, canonical_item_id, actionable_items, theme, email_tag) enables filtering and reasoning without re-embedding
- **Temporal Memory:** Status field (`upcoming`, `past`, `unknown`) computed once at ingestion
- **Deduplication Memory:** Canonical item IDs link duplicates, preserving all sources
- **Action Memory:** Actionable items stored with deadlines for proactive reminders

**Retrieval:**
- **Hybrid Search:** Dense embeddings capture semantic meaning; lexical vectors match exact terms (dates, names, venues)
- **Reranking:** Top-k results are rescored (cross-encoder or LLM) to boost precision
- **Fallback Chain:** Keyword → Dense → Hybrid → Rerank ensures robustness

**Relevance:**
- **Filters Before Search:** Narrow scope (type, time window, sender) before vector search
- **Payload Boosting:** Prioritize recent or upcoming items
- **Source Traceability:** Users can verify relevance by clicking through to original email
- **Measured Quality:** Precision@k and MRR tracked continuously

### High-Level API-First Modularity for Spayce

**Architecture Principles:**
1. **Separation of Concerns:** FeedPrism = extraction + storage + retrieval; Spayce = UI + hierarchy + workflows
2. **API-First:** All functionality exposed via REST/GraphQL endpoints
3. **Data Ownership:** Qdrant collections owned by FeedPrism; Spayce reads via API
4. **Extensible:** New sources (RSS, APIs) plug into same pipeline

**Key APIs:**

```
POST /ingest
  - Fetch and parse emails
  - Extract content
  - Store in Qdrant
  - Return: {items_extracted, items_deduped, status}

GET /search?q=<query>&type=<event|course|blog>&status=<upcoming|past>&limit=<n>
  - Hybrid retrieval
  - Apply filters
  - Rerank results
  - Return: [{id, title, description, type, date, source_link, relevance_score}]

GET /item/<id>
  - Retrieve full item details
  - Include: all sources (if deduplicated), metadata, original email link

POST /export/calendar
  - Export event(s) to .ics format
  - Return: calendar file

GET /metrics
  - Return: precision@k, MRR, latency, dedup_rate, index_size
```

**Spayce Integration Flow:**
1. User connects Gmail via FeedPrism interface
2. FeedPrism ingests content-rich emails, extracts content and actions, stores in Qdrant
3. Spayce queries `/search` API to populate content libraries
4. User views content in Spayce UI (Space/SubSpace hierarchy)
5. Click on item → Spayce shows details + source link to email + actionable items
6. Spayce triggers workflows (e.g., "Add to calendar", "Mark action complete") via FeedPrism APIs

---

## 5. Core Features

### 1. Content Ingestion & Normalization

**What It Does:**
- Connects to Gmail via OAuth
- Fetches content-rich emails from designated labels/senders or AI-suggested themes
- Parses messy HTML (inline styles, embedded images, link extraction)
- Normalizes to clean text + structured metadata

**Why It Matters:**
- Emails are the messiest unstructured data format
- Demonstrates robustness and real-world applicability
- Foundation for all downstream processing

**User Value:**
- Automated—no manual copy-paste
- Scalable to hundreds of emails

### 2. Multi-Label Content Extraction

**What It Does:**
- Classifies content into types: Event, Course, Blog, Resource, Other
- Extracts structured fields:
  - **Event:** Title, description, start/end time, timezone, location/link, image
  - **Course:** Title, description, provider, link, image
  - **Blog:** Title, description, author, link, image
- Handles multi-content emails (one newsletter contains both events and courses)

**Why It Matters:**
- Single newsletter often has 5-10 content items across types
- Multi-label classification is a technical showcase
- Mirrors real-world newsletter structure

**User Value:**
- Browse by type ("Show me only events")
- Clear categorization

### 3. Hybrid Search & Retrieval

**What It Does:**
- **Dense Embeddings:** Semantic similarity (e.g., "NLP workshop" matches "natural language processing seminar")
- **Lexical Vectors:** Keyword matching (exact dates, venue names, acronyms)
- **Hybrid Fusion:** Combines both for balanced recall and precision
- **Reranking:** Cross-encoder rescores top-k for final ranking

**Why It Matters:**
- Dense-only misses exact matches (dates, names)
- Lexical-only misses semantic intent
- Judges want to see advanced Qdrant usage
- Measurable improvement vs. baselines

**User Value:**
- More relevant results
- Handles both precise ("Jan 15 event") and vague ("upcoming AI conference") queries

### 4. Time-Aware Filtering

**What It Does:**
- Adds `status` payload: `upcoming`, `past`, `unknown`
- Computes at ingestion: if `start_time > now` → upcoming; else past
- Enables filters: "Show only upcoming events"
- Special view: "Upcoming events not on calendar"

**Why It Matters:**
- Temporal reasoning is crucial for events
- Demonstrates payload filtering (Qdrant strength)
- Production-useful feature

**User Value:**
- No stale results
- Quickly find what's actionable now

### 5. Deduplication & Canonicalization

**What It Does:**
- After extraction, compute vector similarity across new items and existing items
- If similarity > threshold (e.g., 0.92), mark as duplicate
- Assign `canonical_item_id` to link duplicates
- Store all sources; display canonical item with "seen in 3 newsletters"

**Why It Matters:**
- Same event/course appears in multiple newsletters
- Reduces noise in search results
- Shows advanced vector usage

**User Value:**
- Clean, duplicate-free library
- See which newsletters cover similar content

### 6. Source Traceability

**What It Does:**
- Every content item stores `source_email_id`, `sender`, `subject`
- Direct link to original email in Gmail
- Users can verify extraction accuracy

**Why It Matters:**
- Provenance is a core RAG principle
- Judges penalize hallucination
- Users trust results they can verify

**User Value:**
- "Open original email" button
- Full context if extraction is incomplete

### 7. Result Filtering & Grouping

**What It Does:**
- Filter by: type, status, sender, date range, tags
- Group results by: type, sender, week
- Sort by: relevance, recency, start_time

**Why It Matters:**
- Large libraries need organization
- Demonstrates payload-based routing

**User Value:**
- Browse 200 items efficiently
- "Show me all courses from DataCamp in the last month"

### 8. Simple Demo UX

**What It Does:**
- **Before View:** Screenshot of messy inbox with 50 unread newsletters
- **After View:** Organized library with filters, search bar, result cards
- **Metrics Panel:** Live precision@k, MRR, latency, dedup rate
- **Search Bar:** Try queries like "upcoming NLP events" or "machine learning courses"
- **Result Cards:** Show title, description, type badge, date, source link, relevance score

**Why It Matters:**
- Visual transformation impresses judges
- Metrics demonstrate rigor
- Usability shows product thinking

**User Value:**
- Intuitive interface
- Transparent quality metrics

### 9. Actionable Item Extraction

**What It Does:**
- Identifies action items embedded in email prose (RSVPs, registrations, deadlines, links to click)
- Extracts structured action data:
  - **Action Type:** RSVP, Register, Submit, Deadline, Click Link
  - **Deadline/Date:** When the action must be completed
  - **Link/CTA:** Direct link to perform the action
  - **Context:** Brief description of what the action is for
- Surfaces actionable items prominently in search results and dedicated "Actions" view

**Why It Matters:**
- Action items are often buried in paragraphs ("Register by Nov 30th")
- Missing deadlines costs opportunities (conference tickets, course enrollments)
- Demonstrates advanced NER (Named Entity Recognition) and intent extraction
- Differentiates from pure content extraction

**User Value:**
- Never miss a registration deadline
- "Show me all pending actions" view
- One-click to perform action (opens registration link)

### 10. Email Tagging & Classification

**What It Does:**
- Tags **all emails** (not just content-rich ones) with categories:
  - **Content-Rich:** Newsletters, event invites, course announcements, blog digests
  - **Transactional:** Receipts, confirmations, shipping notifications
  - **Personal:** Friends, family, non-work correspondence
  - **Promotional:** Marketing, sales, ads
  - **Work:** Project updates, meeting notes, decisions (future)
  - **Other:** Uncategorized
- Enables filtering: "Show only content-rich emails" or "Hide promotional"
- Provides email feed overview: "You have 45 content-rich emails, 120 promotional, 15 transactional"

**Why It Matters:**
- Users need to filter noise to find valuable content
- Demonstrates multi-class classification at scale
- Foundation for future work/personal email intelligence
- Shows system handles **all emails**, not just a subset

**User Value:**
- Clean inbox view (filter out noise)
- Understand email composition ("80% of my emails are promotional spam")
- Focus on high-value emails

### 11. AI Theme Suggestions

**What It Does:**
- Analyzes user's email history (senders, subjects, content)
- Suggests content themes automatically:
  - **Example Themes:** "AI/ML Events", "Data Science Courses", "Tech Newsletters", "Conference Announcements"
- User can:
  - Accept suggested themes (one-click)
  - Modify theme names
  - Add custom themes
  - Configure labels/senders manually for each theme
- Themes become filters: "Show me all 'AI/ML Events' content"

**Why It Matters:**
- Manual configuration is tedious ("Which senders should I track?")
- AI can discover patterns user didn't notice ("You get a lot of Python tutorial emails")
- Personalization without manual setup
- Demonstrates intelligent onboarding

**User Value:**
- Zero-config setup (AI does the work)
- Discover hidden patterns in email habits
- Flexible: AI suggests, user refines

---

## 6. Use Cases & User Journeys

### Journey 1: Searching for an Upcoming Event

**Scenario:**
User remembers seeing an "NLP workshop" in a newsletter but can't recall which one or when it is.

**Steps:**
1. User opens FeedPrism
2. Searches: "NLP workshop"
3. Filters: Type = Event, Status = Upcoming
4. Sees 2 results ranked by relevance
5. Clicks top result → sees full details (date, time, link, description)
6. Clicks "View Original Email" → opens Gmail thread
7. Clicks "Add to Calendar" → exports .ics file

**Outcome:**
- Found event in <10 seconds vs. 5+ minutes scrolling through emails
- Verified source before adding to calendar
- No duplicates in results

### Journey 2: Browsing Organized Content

**Scenario:**
User wants to see all machine learning courses received in the last 3 months to plan a learning path.

**Steps:**
1. User opens FeedPrism
2. Filters: Type = Course, Date Range = Last 3 Months
3. Sorts by: Recency
4. Browses result cards (15 courses)
5. Groups by: Sender to see which platforms send most courses
6. Bookmarks 3 courses to "Learning Plan" folder (Spayce integration)

**Outcome:**
- Comprehensive view of available courses
- Pattern discovery (DataCamp sends weekly courses)
- Foundation for learning path planning

### Journey 3: Viewing Canonical Items Across Sources

**Scenario:**
User notices the same "AI Summit 2024" event mentioned in 3 newsletters.

**Steps:**
1. User searches: "AI Summit 2024"
2. Sees 1 canonical result with badge "Seen in 3 sources"
3. Expands sources → sees: AI Weekly, DataCamp, O'Reilly
4. Clicks each source link to compare details (different discount codes!)
5. Chooses O'Reilly source (50% discount)

**Outcome:**
- No duplicate noise
- Discovered hidden value (multiple discount codes)
- Made informed decision

### Journey 4: Exporting to Calendar

**Scenario:**
User wants to add all upcoming AI/ML events to calendar with one click.

**Steps:**
1. User filters: Type = Event, Status = Upcoming, Tags = AI/ML
2. Sees 5 events
3. Clicks "Export All to Calendar"
4. Downloads .ics file with all 5 events
5. Imports into Google Calendar

**Outcome:**
- Bulk calendar sync in <30 seconds
- No manual copy-paste of event details

### Journey 5: Verifying Extraction Accuracy

**Scenario:**
User sees a course with incomplete description and wants to check the original.

**Steps:**
1. User views course card
2. Notices description is truncated
3. Clicks "View Original Email"
4. Reads full email with additional context (prerequisites, instructor bio)
5. Returns to FeedPrism with full understanding

**Outcome:**
- Transparency builds trust
- User can always verify source

---

## 7. Spayce Integration Context

### Why Modularity Is Required

**Separation of Concerns:**
- **FeedPrism:** Email-specific extraction and storage
- **Spayce:** Multi-source content aggregation, UI, workflows, hierarchy

**Benefits:**
1. **Independent Scaling:** FeedPrism can process millions of emails independently
2. **Testability:** Email pipeline tested in isolation
3. **Reusability:** Other products (not just Spayce) can use FeedPrism APIs
4. **Technology Flexibility:** FeedPrism uses Python/FastAPI; Spayce can use Next.js/Flutter

### How FeedPrism APIs Integrate into Spayce UI

**Integration Architecture:**

```
Spayce Frontend (Next.js/Flutter)
        ↓
Spayce Backend (API Gateway)
        ↓
FeedPrism APIs (/search, /ingest, /export)
        ↓
Qdrant (Shared Vector Memory)
```

**User Experience:**
1. **Spayce Dashboard:** Shows "15 new events extracted from email"
2. **Content Library View:** User navigates to "Learning Events" Space
3. **Behind the Scenes:** Spayce calls `FeedPrism.search(type=event, status=upcoming)`
4. **Result Rendering:** Spayce UI renders results in card/graph view
5. **Drill-Down:** User clicks event → Spayce shows FeedPrism metadata + source link
6. **Action:** User adds to calendar → Spayce calls `FeedPrism.export(id=123)`

**API Contract Example:**

```json
// Spayce calls FeedPrism
GET /search?q=machine%20learning&type=course&limit=10

// FeedPrism responds
{
  "results": [
    {
      "id": "evt_abc123",
      "title": "Deep Learning Specialization",
      "description": "5-course series on neural networks...",
      "type": "course",
      "provider": "Coursera",
      "link": "https://coursera.org/...",
      "image_url": "https://...",
      "source_email_id": "email_xyz789",
      "source_link": "https://mail.google.com/...",
      "extracted_at": "2024-11-20T10:30:00Z",
      "relevance_score": 0.94
    }
  ],
  "total": 23,
  "query_latency_ms": 45
}
```

### Data Sharing Model

**Shared Resources:**
- **Qdrant Collections:** FeedPrism creates `email_content` collection; Spayce has read access
- **Embedding Models:** Shared model endpoint (e.g., OpenAI API key) to ensure vector compatibility

**Data Ownership:**
- FeedPrism writes to `email_content` collection
- Spayce reads via FeedPrism API (no direct Qdrant writes)
- Spayce creates its own collections for non-email content (files, notes)

**Privacy & Permissions:**
- User-level isolation via payload field `owner_id`
- Qdrant queries always filter by `owner_id = current_user`
- Future: Team memory with `team_id` and `permissions` fields

### Why This Hackathon Project Becomes a Reusable Subsystem

**Production-Ready Design:**
1. **API-First:** All features exposed via APIs
2. **Stateless:** Processing is idempotent and scalable
3. **Well-Documented:** README explains architecture, APIs, and integration
4. **Tested:** Benchmark suite validates retrieval quality
5. **Resilient:** Fallbacks and retries handle failures gracefully

**Post-Hackathon Roadmap:**
- **Week 1-2 (Hackathon):** Standalone FeedPrism with demo UI
- **Week 3-4:** Spayce integration (API consumption, UI embedding)
- **Month 2:** Add non-email sources (RSS, course platform APIs)
- **Month 3:** Multi-user support (team memory, permissions)
- **Month 4:** Advanced features (workflow automation, preference learning)

**Long-Term Vision:**
FeedPrism evolves into Spayce's **Content Ingestion Engine**, handling all external sources with a unified pipeline: Fetch → Parse → Extract → Embed → Store → Index.

---

## 8. Hackathon Alignment

### Theme: "Memory Over Models"

| **Aspect** | **How FeedPrism Aligns** |
|------------|---------------------------|
| **Persistent Memory** | Vector database stores all extracted content permanently; grows with more content-rich emails |
| **Retrieval Quality** | Hybrid search + reranking + filters prioritize accurate retrieval over generative guessing |
| **Temporal Awareness** | Time-based payloads enable "upcoming vs past" without re-prompting LLMs |
| **Provenance** | Every result links to source email; zero hallucination on facts |
| **Memory as Product** | The vector index IS the product; not a throwaway chat context |
| **Long-term Value** | Knowledge base compounds over months/years of emails |
| **Actionable Memory** | Extracts and remembers action items with deadlines |

### Sponsor Expectations

**Qdrant (Main Sponsor):**
- ✅ Demonstrates hybrid dense+sparse search
- ✅ Uses payload filtering extensively (type, status, time, sender)
- ✅ Implements reranking for quality boost
- ✅ Shows HNSW parameter tuning and quantization awareness
- ✅ Measures retrieval quality (precision@k, MRR, latency)
- ✅ Handles messy unstructured data (HTML emails)
- ✅ Deduplication via vector similarity
- ✅ Scalable design (sharding/replication notes in README)

**Lamatic (Optional Accelerator):**
- ⚠️ Optional integration for workflow orchestration
- If used: Visual flow builder for ingestion and answering pipelines
- Show retries, fallbacks, and monitoring

### Judges' Criteria Fit

| **Criterion** | **FeedPrism Approach** | **Score Potential** |
|---------------|--------------------------|---------------------|
| **Functionality** | Fully working email→extraction→search→export pipeline | High (9-10/10) |
| **Originality** | Not a chatbot; focuses on extraction, dedup, and temporal reasoning | High (8-9/10) |
| **Completeness** | End-to-end system with metrics and documentation | High (9/10) |
| **Relevance** | Solves real problem; production-credible | High (9/10) |
| **Presentation** | Clear before/after demo, metrics panel, source traceability | High (8-9/10) |

**Differentiation Strategies:**
1. **Metrics Dashboard:** Live precision@k, MRR, latency, dedup rate (most projects won't have this)
2. **Hybrid + Rerank:** Ablation study showing improvement over dense-only
3. **Deduplication:** Canonical items with multi-source tracking
4. **Time-Aware:** Upcoming/past filtering with "not on calendar" view
5. **Provenance:** Every result has source link
6. **README Quality:** Document HNSW params, quantization, scaling decisions

---

## 9. Success Criteria

### High-Level Metrics

**Retrieval Quality:**
- **Precision@10 ≥ 0.75:** 7+ out of top 10 results are relevant
- **MRR ≥ 0.6:** First relevant result appears in top 2 on average
- **Hallucination Rate = 0%:** No wrong-type items after filters (measured on labeled benchmark)

**Performance:**
- **Latency p95 ≤ 800ms:** 95% of queries complete in <800ms
- **Latency p99 ≤ 1.2s:** 99% of queries complete in <1.2s
- **Ingestion Rate:** Process 50 emails in <5 minutes

**Data Quality:**
- **Deduplication Rate ≥ 30%:** Reduce duplicates by at least 30% across content-rich emails
- **Extraction Accuracy ≥ 85%:** Correctly identify content type in 85%+ of items (manual review of 50 samples)
- **Temporal Classification ≥ 90%:** Correctly classify upcoming vs. past in 90%+ of events
- **Action Extraction Accuracy ≥ 80%:** Correctly identify actionable items in 80%+ of content-rich emails

**User Experience:**
- **Search→Result Time <1s:** User sees results within 1 second of query
- **Source Link Click Success 100%:** Every source link opens correct email
- **Demo Flow <90s:** Complete demo script in under 90 seconds

**Demo Quality:**
- ✅ Clear before/after contrast
- ✅ Live search demo
- ✅ Metrics panel visible
- ✅ Source traceability demonstrated
- ✅ Deduplication shown

**Documentation Quality:**
- ✅ README explains architecture
- ✅ HNSW parameters documented
- ✅ Quantization choices explained
- ✅ Scaling strategy outlined
- ✅ API documentation included
- ✅ Benchmark results presented

---

## 10. Risks & Considerations

### Conceptual Risks

**1. Noisy Data**
- **Risk:** Emails contain promotional content, signatures, disclaimers
- **Mitigation:** Use LLM-based content detection to filter noise; implement confidence thresholds

**2. Time Constraints**
- **Risk:** 7 days is tight for full feature set
- **Mitigation:** Prioritize MVP (events only first, then expand); defer graph viz and calendar if needed

**3. Over-Scoping**
- **Risk:** Trying to implement all features (events + courses + blogs + calendar + graph)
- **Mitigation:** Day 1-3 focus on events only; expand only if ahead of schedule

**4. Email Parsing Brittleness**
- **Risk:** Every newsletter has different HTML structure
- **Mitigation:** Use robust parsers (BeautifulSoup + LLM extraction); implement fallbacks

**5. Evaluation Dataset Quality**
- **Risk:** Hand-labeling 40 queries is tedious and error-prone
- **Mitigation:** Start with 20 high-quality queries; expand if time permits; involve user testing

**6. HNSW Parameter Tuning**
- **Risk:** Default params may not be optimal for this dataset
- **Mitigation:** Run quick experiments on Day 4; document trade-offs even if not fully optimized

**7. Demo Dependency on Live APIs**
- **Risk:** Gmail API rate limits or failures during demo
- **Mitigation:** Pre-ingest data; use cached results for demo; have backup static dataset

**8. UX Misunderstandings**
- **Risk:** Judges don't immediately understand the value proposition
- **Mitigation:** Clear before/after visuals; 3-sentence pitch at demo start; printed metrics card

**9. Similarity to Other RAG Projects**
- **Risk:** Many teams will build email/doc RAG systems
- **Mitigation:** Differentiate via metrics, dedup, time-awareness, and provenance; emphasize production-readiness

**10. Integration Complexity (Spayce)**
- **Risk:** API design may not fit Spayce's needs
- **Mitigation:** Design APIs first (Day 1); get early feedback; keep it simple (REST with JSON)

### Additional Risks to Monitor

**Technical:**
- Vector dimensionality mismatch (ensure consistent embedding model)
- Qdrant cloud quota limits (monitor index size)
- LLM API costs (track spend; use caching)

**Non-Technical:**
- Team coordination (clear task division)
- Scope creep (stick to 7-day plan)
- Demo environment setup (test on clean machine before submission)

---

## 11. Appendix: 7-Day Execution Plan Summary

| **Day** | **Focus** | **Deliverables** |
|---------|-----------|------------------|
| **1-2** | Data + Baseline | Gmail integration, 50-200 emails fetched, HTML parsing, Qdrant schema, basic embeddings |
| **3-4** | Retrieval Quality | Hybrid search, reranking, filters, labeled benchmark (20-40 queries), metrics computed |
| **5** | Dedup + Time | Canonical items via similarity, time-aware status, "upcoming not on calendar" view |
| **6** | Demo + Docs | Before/after UI, metrics panel, README with HNSW/quantization notes |
| **7** | Video + Polish | 60-90s demo video, final testing, submission prep |

---

## 12. Clarifying Questions

Before finalizing this document, please confirm:

1. **API Design:** Should FeedPrism APIs be RESTful, GraphQL, or both? Preference for Spayce integration?

2. **Embedding Model:** OpenAI `text-embedding-3-small` (default) or domain-specific model? Budget constraints?

3. **Benchmark Dataset:** Hand-label 20 vs. 40 queries? Use existing dataset or create from scratch?

4. **Lamatic Integration:** Required or optional? If optional, prioritize Qdrant depth over Lamatic orchestration?

5. **Calendar Integration:** Must-have for hackathon or stretch goal? (Impacts Day 5-6 timeline)

6. **Demo Environment:** Local setup, deployed (Vercel/Render), or both?

---

**Document Status:** Ready for Review  
**Next Steps:** Address clarifying questions → Proceed to implementation planning → Begin execution
