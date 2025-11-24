# What sponsors want to see

The event is optimized for projects where memory and retrieval are the core product and not an add‑on. Ideas that will win should visibly leverage Qdrant for high‑quality vector search and persistent memory, and optionally Lamatic to orchestrate multi‑step agentic workflows, integrations, and deployment. Judges will favor systems that are useful, performant, and show depth of vector usage—not chatbot UIs.

## Sponsor priorities mapped to features

- Qdrant (main sponsor): Demonstrate robust retrieval over messy, unstructured data; use advanced vector DB features (filters, payloads/metadata, hybrid dense+sparse search, reranking, multimodal embeddings, collections, sharding/replication for scale). Show measurable search quality (precision/recall@k), latency, and cost awareness. Turn memory into a product capability: long‑term user memory, session memory, domain knowledge bases, recommendation, deduplication, semantic routing.

- Lamatic (optional accelerator): Use its visual flow builder, one‑click integrations, and executeFlow APIs to wire ingestion, chunking, embedding, enrichment, retrieval, tool use, and action steps into a coherent agentic pipeline. Demonstrate fast iteration, deployment, and monitoring with clear workflow runs and resilience (retries, fallbacks, guards).

## Themes and the kinds of winning ideas ￼

Unstructured Data RAG (messy PDFs, docs, screenshots) ￼

- Build an ingestion pipeline that converts raw files to structured chunks, embeds with domain‑appropriate models, stores in Qdrant, and runs hybrid retrieval with metadata filters and reranking. Show OCR for images/screenshots, layout‑aware chunking, de‑duplication, and query understanding.

- Win signals: measurable retrieval quality (benchmark queries), latency profiles, low hallucination, clear fallbacks (keyword → vector → rerank), and production‑ready README and demo.

AI Second Brain (persistent personal/team memory) ￼

- A memory OS where notes, chats, files, and tasks are stored as vectors; use Qdrant payloads for context, permissions, time, projects; surface contextual recall across apps. With Lamatic, automate workflows like “capture → normalize → embed → store → notify → retrieve on demand.”

- Win signals: strong UX, useful auto‑organizing memory, time‑aware recall, and tight permission filtering.

Domain‑Specific Systems (health, finance, HR, law, travel, education) ￼

- Build compliance‑aware, filter‑heavy retrieval over domain corpora with Qdrant; add Lamatic flows that triage requests, call domain tools/APIs, and compose multi‑step answers with citations.

- Win signals: reliable answers, domain‑safe filtering, traceable sources, KPI dashboards.

## 10 concrete idea blueprints that sponsors would promote ￼

1. Layout‑Aware PDF RAG: Ingest complex reports with OCR + table detection, chunk by layout, embed, store in Qdrant with table/figure payload tags. Hybrid search (dense+sparse) plus reranking. Lamatic flow: upload → parse → embed → store → query → answer with citations.

2. Session‑Memory Support Desk: Persist customer conversations as vectors with metadata (account, product, sentiment) in Qdrant; retrieve context on new tickets and auto‑draft responses. Lamatic orchestrates triage, retrieval, tool calls, and escalation.

3. Research Copilot with Source Tracing: Crawl a focused corpus (e.g., clinical guidelines), embed paragraphs with provenance, store in Qdrant; multi‑hop retrieval + reranking. Lamatic manages tasks: crawl → dedupe → embed → answer → export report.

4. Finance Brief Generator: Parse earnings calls and filings; time‑aware retrieval from Qdrant with ticker/date filters; summarize changes quarter‑over‑quarter. Lamatic drives scheduled ingestion and report generation.

5. HR Policy Navigator: Semantic search over policies with role/region filters via Qdrant payloads; Lamatic agents route queries, fetch authoritative snippets, and log decisions.

6. Legal Clause Finder: Clause‑level embeddings stored in Qdrant with contract metadata; hybrid search for precedent, clause similarity, and risk flags. Lamatic handles review workflow and redline suggestions.

7. Travel Knowledge Mesh: Multimodal retrieval (text+image) in Qdrant for attractions, routes, and advisories; Lamatic integrates external APIs for live data, composes itineraries with evidence.

8. Coding Memory for Teams: Vectorize code snippets, ADRs, and PR discussions; use Qdrant for semantic recall with repo/file filters; Lamatic automates ingestion per commit and assists in PR writing with retrieved context.

9. Education Tutor with Long‑Term Memory: Store student interactions and misconceptions as vectors in Qdrant; Lamatic orchestrates personalized lesson planning with retrieval of prior attempts and targeted hints.

10. Recommendations with Feedback Loops: Content/item embeddings in Qdrant, capture click/like feedback to update payloads; Lamatic runs re‑ranking cycles, A/B tests, and daily retraining jobs.

## How to exploit sponsor features explicitly ￼

- Qdrant depth:

 ▫ Use collections for domains; payloads for metadata (author, date, permissions).

 ▫ Hybrid retrieval (dense + lexical) and reranking to cut hallucinations.

 ▫ Filters for time, role, geography; payload‑based routing.

 ▫ Multimodal embeddings (images, audio, text) when applicable.

 ▫ Measure recall@k, MRR, latency p95/p99, memory footprint; document HNSW parameters, quantization, and scaling decisions.

- Lamatic leverage:

 ▫ Visual flow builder for ingestion and answering pipelines.

 ▫ Execute flows via SDKs (JavaScript/Next.js/Python/Curl) for clean demos.

 ▫ Integrate external tools/data in “one‑click” steps; add retries and guards.

 ▫ Track success metrics across steps; expose workflow runs in the demo.

