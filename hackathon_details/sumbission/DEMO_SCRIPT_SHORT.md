
**Target Duration:** 90-120 seconds  

---
## THE SCRIPT

### OPENING (0:00 - 0:10)

**[Show: App open with Prism Overview, raw emails on left]**
> "Hi, My Name is **Dishant**, and I'm presenting my Hack idea - **FeedPrism**"
> "Since the AI Hype started, I registered for more than 30 Newsletters and joined various Communities and Events. From there, I receive more than 60-70 content-rich emails containing technical blogs, Workshop and Event Invites, and Course Invites. 
> 
> On the Same Lines, professionals who receive hundreds of content-rich emails find it difficult to manage this barrage of content, and this valuable content gets buried in the pile of emails. Events go unnoticed. Deadlines get missed.
>
> So we built **FeedPrism** — with **Qdrant** doing all the memory-heavy lifting."
> 
> "Like a prism refracts light into colours, FeedPrism refracts messy emails into organised categories: Events, Courses, and Blogs."  Let's see it in action. The New Emails are fetched on the Left, Let's Extract Content from these.

**[Click: Extract button, show SSE progress streaming]**

> "As you can see here, that messy email feed is real-time parsed, embedded, and stored in Qdrant."
>
> We use **three specialised collections** — events, courses, blogs — each with **tuned HNSW parameters** for its use case. Events get high recall, so you never miss an important one."
> 
>Each of these emails contains MULTIPLE pieces of valuable content buried in HTML — events with dates and locations, courses with instructors and pricing, blog articles with key insights.
> For Demo, we are showing EMAIL as the Source and included these 3 destination themes, but we can extend them to any source and any content or action-item that we want to fetch from a messy unstructured stream and organise them as a knowledge base or actionable items.
> 
> As the EXTRACTION IS NOW COMPLETE, 

**[Show: Feed with extracted items appearing]**
> we can now see this feed gets refreshed with the newly extracted content. Every item stores **source_email_id** in the payload for full source tracebility. 
> Now Let's look at the Filters, Tags and Search.

**[Click: Filter by 'Events', 'UPCOMING', then  type "LLM"]**
 >"**Payload filtering** happens BEFORE vector search. Filter by type, sender, or tags — Qdrant narrows search candidates first, then searches. This is Fast and precise."
 >
  "We have implemented **Hybrid search** that combines dense semantic vectors with sparse BM25 keywords, fused using **Reciprocal Rank Fusion**. 'Machine learning' finds 'deep learning' and 'neural networks' semantically, plus exact keyword matches."

> We have Added Dynamic Tags that user can Add at runtime which becomes part of the retrival during search 

> We have added Temporal Filters in our Search using Qdrants DateTimeRange that identifies Past Events from Upcoming ones.

> We have used Scroll API to get Metrics and Analytics.

> We Check that we are not processing Duplicate Emails  all using Qdrant we have not used any other database for this hackathon.

**[Quick clicks: Events → Calendar, Blogs → Gallery, Courses → Catalog]**

> "We have also created Content-specific views powered by payload data — events on a calendar View based on Start Time, courses with provider and level badges, blogs in a gallery. Same Qdrant data, different presentations."

> **[Return to Home, show full feed]**
> In the End, I would like to say that "FeedPrism embodies 'Memory Over Models.' 
   We don't generate content — we remember and retrieve it. The vector database IS doing all the heavy lifting.

We also built a backend feature that, when a New Email Arrives in the LAMATIC project, it feeds it into Qdrant. The Backend was Ready, but while building the Flow in lamatic, we realised Gmail node Integration is a paid feature, so we did not go ahead with that.
   
All in all it was a Great Experience. Thank. You."

---

## QDRANT FEATURES MENTIONED (Checklist)

| # | Feature | When Said |
|---|---------|-----------|
| 1 | Multi-Collection | "three specialized collections" |
| 2 | HNSW Tuning | "tuned HNSW parameters" |
| 3 | Payload Filtering | "filtering happens BEFORE vector search" |
| 4 | Hybrid Search | "dense semantic + sparse BM25" |
| 5 | RRF Fusion | "Reciprocal Rank Fusion" |
| 6 | Source Traceability | "source_email_id in payload" |
| 7 | Named Vectors | (implied in hybrid search) |
| 8 | Sparse Vectors | "sparse BM25 keywords" |

---

## KEY PHRASES TO HIT

1. **"Tuned HNSW parameters"** — shows you understand the algorithm
2. **"Payload filtering BEFORE vector search"** — efficiency insight
3. **"Reciprocal Rank Fusion"** — advanced retrieval technique
4. **"source_email_id for traceability"** — zero hallucination
5. **"The vector database IS the product"** — hackathon theme alignment

---

## TIMING BREAKDOWN

| Section | Duration | Cumulative |
|---------|----------|------------|
| Opening | 10s | 0:10 |
| Prism Concept | 10s | 0:20 |
| Qdrant Features | 35s | 0:55 |
| Specialized Views | 15s | 1:10 |
| Closing | 10s | 1:20 |

**Total: 80 seconds** (buffer for natural pauses)

---

## SCREEN ACTIONS SUMMARY

1. **0:00** — App open, Prism Overview visible
2. **0:15** — Click Extract, watch progress
3. **0:25** — Scroll to feed, point at cards
4. **0:30** — Click Events filter, then Courses
5. **0:40** — Type "machine learning" in search
6. **0:50** — Click Source on a card, show modal
7. **0:55** — Click Events → Calendar view
8. **1:00** — Click Blogs → Gallery view
9. **1:05** — Click Courses → Catalog view
10. **1:10** — Return to Home, pause on feed

---

## PRE-RECORDING

```bash
# Start everything
docker compose up -d

# Open browser
open http://localhost
```

- Reset demo state before recording
- Practice 2-3 times
- Speak at natural pace (not rushed)

---

*90 seconds. Every word counts. Make them remember Qdrant.*
