# Epic: Lamatic Integration for Real-Time Email Intelligence

**Epic ID:** EPIC-LAMATIC  
**Created:** December 1, 2025  
**Updated:** December 1, 2025 (Revised for Minimal Impact)  
**Status:** In Progress  
**Priority:** High  
**Estimated Effort:** 2.5-3 hours  
**Based On:** `project_ops/01_idea_generation/lamatic_ideas_for_feedprism.md`

---

## Executive Summary

Integrate Lamatic.ai's visual flow builder with FeedPrism to enable real-time email processing using a **minimal-impact bridge service architecture**. This approach keeps the FeedPrism backend clean and untouched while adding Lamatic orchestration capabilities.

### Why This Matters for the Hackathon
- **Qdrant Sponsor:** FeedPrism already showcases deep Qdrant usage; Lamatic adds orchestration
- **Lamatic Sponsor:** Demonstrates Gmail triggers, API nodes, visual workflows, edge deployment
- **"Memory Over Models" Theme:** Real-time processing = memory that's always current
- **Clean Architecture:** Bridge service isolates Lamatic integration, zero impact on core FeedPrism

---

## Epic Scope

### What We're Building (Bridge Architecture)
```
┌─────────────────────────────────────────────────────────────┐
│                LAMATIC CLOUD (Visual Flow Builder)           │
│                                                               │
│  📧 Gmail Trigger → API Node → Code Node → Branch            │
│                       ↓                                       │
│              Calls Bridge Service                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         LAMATIC BRIDGE SERVICE (Standalone - Port 8001)      │
│                                                               │
│  • Receives Lamatic webhook (email payload)                  │
│  • Checks idempotency (is_email_processed)                   │
│  • Forwards to FeedPrism minimal router                      │
│  • Returns extraction results to Lamatic                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              FEEDPRISM BACKEND (Minimal Changes)             │
│                                                               │
│  NEW: /api/lamatic/bridge (20 lines of code)                │
│       ↓                                                       │
│  EXISTING: Extraction Pipeline (UNTOUCHED)                   │
│       ↓                                                       │
│  EXISTING: Qdrant Storage (+ idempotency check)             │
└─────────────────────────────────────────────────────────────┘
```

### Deliverables
1. **Lamatic Bridge Service:** Standalone FastAPI service (new folder: `lamatic_bridge/`)
2. **FeedPrism Minimal Router:** Single file `app/routers/lamatic_bridge.py` (20 lines)
3. **Lamatic Flow:** "FeedPrism Email Intelligence" flow with Gmail trigger
4. **Documentation:** Updated README with bridge architecture

---

## Stories in This Epic

| Story ID | Title | Priority | Estimate | Status |
|----------|-------|----------|----------|--------|
| LAMATIC-000 | Prevent Duplicate Email Processing | P0 | 30 min | ✅ Complete |
| LAMATIC-001 | Google Cloud OAuth Setup for Gmail API | P0 | 30 min | ✅ Complete |
| LAMATIC-002 | Lamatic Account & Project Setup | P0 | 15 min | ✅ Complete |
| LAMATIC-003 | Create Lamatic Bridge Service | P0 | 45 min | To Do |
| LAMATIC-004 | Add Minimal Router to FeedPrism | P0 | 20 min | To Do |
| LAMATIC-005 | Build Lamatic Flow: Email Intelligence | P0 | 45 min | To Do |
| LAMATIC-006 | End-to-End Testing & Demo | P1 | 30 min | To Do |
| LAMATIC-007 | Documentation & README Update | P2 | 20 min | To Do |

---

## Success Criteria

### Functional
- [ ] New email in Gmail triggers Lamatic flow within 5 seconds
- [ ] Bridge service receives webhook and forwards to FeedPrism
- [ ] FeedPrism extracts content and returns structured response
- [ ] Duplicate emails are automatically skipped (idempotency check)
- [ ] Slack notification sent (optional)

### Demo Quality
- [ ] Can demonstrate full loop in under 90 seconds
- [ ] Visual Lamatic flow diagram available for presentation
- [ ] Clear before/after comparison

### Technical
- [ ] API response time < 3 seconds for single email
- [ ] Bridge service is isolated and deployable independently
- [ ] **Zero impact on existing FeedPrism extraction pipeline**
- [ ] FeedPrism changes limited to ONE new router file

---

## Architecture Overview

### System Components (Minimal Impact Design)

```
┌─────────────────────────────────────────────────────────────────┐
│                         LAMATIC CLOUD                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Flow: Email Intelligence                  │   │
│  │                                                           │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐               │   │
│  │  │ Gmail   │──▶│  API    │──▶│  Code   │──▶ Slack/Cal  │   │
│  │  │ Trigger │   │  Node   │   │  Node   │               │   │
│  │  └─────────┘   └─────────┘   └─────────┘               │   │
│  │                     │                                     │   │
│  │                     ▼                                     │   │
│  │              http://bridge:8001/receive                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LAMATIC BRIDGE SERVICE                        │
│                      (Standalone Container)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  POST /receive                                            │   │
│  │  1. Parse email payload from Lamatic                     │   │
│  │  2. Check QdrantService.is_email_processed(email_id)     │   │
│  │  3. If processed: return cached response                 │   │
│  │  4. If new: POST to FeedPrism /api/lamatic/bridge        │   │
│  │  5. Return extraction results to Lamatic                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FEEDPRISM BACKEND                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  POST /api/lamatic/bridge (NEW - app/routers/            │   │
│  │                              lamatic_bridge.py)          │   │
│  │  - Forwards to existing extraction endpoint              │   │
│  │  - Returns JSON response                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Existing /api/pipeline/extract (UNTOUCHED)              │   │
│  │  - Parser, Extractor, Orchestrator, Embedder             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    QDRANT                                 │   │
│  │  - Stores extracted content as vectors                    │   │
│  │  - Idempotency via is_email_processed()                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Gmail → Lamatic:** Email arrives, Gmail trigger fires
2. **Lamatic → Bridge:** API Node POSTs email payload to bridge `/receive`
3. **Bridge → Qdrant:** Check `is_email_processed(email_id)`
4. **Bridge → FeedPrism:** If new, POST to `/api/lamatic/bridge`
5. **FeedPrism → Pipeline:** Use existing extraction logic
6. **FeedPrism → Qdrant:** Store vectors
7. **FeedPrism → Bridge → Lamatic:** Return extraction results
8. **Lamatic → Slack/Calendar:** Execute downstream actions

---

## Why Bridge Architecture?

| Aspect | Traditional Integration | Bridge Architecture |
|--------|-------------------------|---------------------|
| **FeedPrism Changes** | Multiple files, new routers, auth logic | ONE router file (20 lines) |
| **Testing Impact** | May break existing tests | Zero impact on tests |
| **Deployment** | Coupled deployment | Independent deployment |
| **Rollback** | Complex | Delete bridge, remove 1 router |
| **Future Migration** | Hard to refactor | Easy to merge later |

---

## Dependencies

### External Services Required
- **Google Cloud Console** - OAuth credentials (already done in LAMATIC-001)
- **Lamatic.ai Account** - Free tier (already done in LAMATIC-002)
- **ngrok or Public URL** - To expose bridge service during development

### Internal Dependencies
- FeedPrism extraction pipeline (already complete)
- Qdrant `is_email_processed()` method (already complete in LAMATIC-000)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bridge service downtime | High | Monitor with health checks; easy restart |
| Network latency | Low | Bridge runs on same server as FeedPrism |
| FeedPrism changes break tests | **ELIMINATED** | Bridge is isolated; zero pipeline changes |
| Bridge not accessible from Lamatic | Medium | Use ngrok for dev; proper DNS for prod |

---

## References

- **Lamatic Documentation:** https://lamatic.ai/docs
- **Gmail Node Docs:** https://lamatic.ai/docs/nodes/apps/gmail-node
- **API Node Docs:** https://lamatic.ai/docs/nodes/data/api-node
- **FastAPI Docs:** https://fastapi.tiangolo.com
