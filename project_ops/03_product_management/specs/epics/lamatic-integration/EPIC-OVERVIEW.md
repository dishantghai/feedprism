# Epic: Lamatic Integration for Real-Time Email Intelligence

**Epic ID:** EPIC-LAMATIC  
**Created:** December 1, 2025  
**Status:** Planning  
**Priority:** High  
**Estimated Effort:** 2.5-3 hours  
**Based On:** `project_ops/01_idea_generation/lamatic_ideas_for_feedprism.md`

---

## Executive Summary

Integrate Lamatic.ai's visual flow builder with FeedPrism to enable real-time email processing and automatic calendar event creation. This combines **Idea 1 (Real-Time Email Intelligence)** and **Idea 5 (Instant Calendar Event Creator)** from the Lamatic ideas document.

### Why This Matters for the Hackathon
- **Qdrant Sponsor:** FeedPrism already showcases deep Qdrant usage; Lamatic adds orchestration
- **Lamatic Sponsor:** Demonstrates Gmail triggers, API nodes, visual workflows, edge deployment
- **"Memory Over Models" Theme:** Real-time processing = memory that's always current

---

## Epic Scope

### What We're Building
```
┌─────────────────────────────────────────────────────────────┐
│                    COMPLETE AUTOMATION LOOP                  │
└─────────────────────────────────────────────────────────────┘

    📧 Newsletter Arrives (Gmail)
           │
           ▼
    ┌──────────────┐
    │ Gmail Trigger│ (Lamatic - real-time)
    │   Node       │
    └──────────────┘
           │
           ▼
    ┌──────────────┐
    │   API Node   │ (Call FeedPrism /api/lamatic/ingest)
    │              │
    └──────────────┘
           │
           ▼
    ┌──────────────┐
    │  Code Node   │ (Parse response, check content types)
    └──────────────┘
           │
           ▼
    ┌──────────────┐
    │ Branch Node  │ (Route based on extracted content)
    └──────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────┐
│Has Event│ │Has Action│
└─────────┘ └─────────┘
     │           │
     ▼           ▼
┌─────────┐ ┌─────────┐
│ Gmail   │ │  Slack  │
│Calendar │ │ Alert   │
│ Draft   │ │         │
└─────────┘ └─────────┘
     │           │
     └─────┬─────┘
           ▼
    ┌──────────────┐
    │    Slack     │ (Summary notification)
    │ Notification │
    └──────────────┘
           │
           ▼
    ✅ User Informed in Real-Time
```

### Deliverables
1. **FeedPrism Backend:** New `/api/lamatic/` router with ingest endpoint
2. **Lamatic Flow:** "FeedPrism Email Intelligence" flow with Gmail trigger
3. **Slack Integration:** Real-time notifications for extracted content
4. **Documentation:** Updated README with Lamatic architecture diagram

---

## Stories in This Epic

| Story ID | Title | Priority | Estimate |
|----------|-------|----------|----------|
| LAMATIC-000 | Prevent Duplicate Email Processing | P0 | 30 min |
| LAMATIC-001 | Google Cloud OAuth Setup for Gmail API | P0 | 30 min |
| LAMATIC-002 | Lamatic Account & Project Setup | P0 | 15 min |
| LAMATIC-003 | FeedPrism Lamatic API Router | P0 | 45 min |
| LAMATIC-004 | Slack Workspace & App Setup | P1 | 20 min |
| LAMATIC-005 | Lamatic Flow: Email Intelligence Pipeline | P0 | 45 min |
| LAMATIC-006 | End-to-End Testing & Demo Script | P1 | 25 min |
| LAMATIC-007 | Documentation & README Update | P2 | 20 min |

---

## Success Criteria

### Functional
- [ ] New email in Gmail triggers Lamatic flow within 5 seconds
- [ ] FeedPrism extracts content and returns structured response
- [ ] Events trigger calendar draft creation
- [ ] Slack notification sent with extraction summary

### Demo Quality
- [ ] Can demonstrate full loop in under 90 seconds
- [ ] Visual Lamatic flow diagram available for presentation
- [ ] Clear before/after comparison

### Technical
- [ ] API response time < 3 seconds for single email
- [ ] Error handling for Gmail OAuth failures
- [ ] Graceful degradation if Lamatic unavailable

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         LAMATIC CLOUD                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Flow: Email Intelligence                  │   │
│  │                                                           │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐  │   │
│  │  │ Gmail   │──▶│  API    │──▶│  Code   │──▶│ Branch  │  │   │
│  │  │ Trigger │   │  Node   │   │  Node   │   │  Node   │  │   │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘  │   │
│  │                     │                           │         │   │
│  │                     ▼                     ┌─────┴─────┐   │   │
│  │              FeedPrism API                │     │     │   │   │
│  │                                     ┌─────┐ ┌─────┐    │   │
│  │                                     │Gmail│ │Slack│    │   │
│  │                                     │Draft│ │Node │    │   │
│  │                                     └─────┘ └─────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FEEDPRISM BACKEND                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  POST /api/lamatic/ingest                                 │   │
│  │  - Receives email data from Lamatic                       │   │
│  │  - Calls existing extraction pipeline                     │   │
│  │  - Returns structured content (events, courses, actions)  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    QDRANT                                 │   │
│  │  - Stores extracted content as vectors                    │   │
│  │  - Hybrid search, payload filtering                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Gmail → Lamatic:** Email metadata (id, from, subject, body)
2. **Lamatic → FeedPrism:** HTTP POST with email data
3. **FeedPrism → Qdrant:** Store extracted content vectors
4. **FeedPrism → Lamatic:** JSON response with extraction results
5. **Lamatic → Gmail:** Create calendar draft (if events found)
6. **Lamatic → Slack:** Send notification summary

---

## Dependencies

### External Services Required
- **Google Cloud Console** - For Gmail API OAuth credentials
- **Lamatic.ai Account** - Free tier sufficient
- **Slack Workspace** - For notifications (optional but recommended)

### Internal Dependencies
- FeedPrism extraction pipeline must be working
- FeedPrism backend must be publicly accessible (or use ngrok for demo)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gmail OAuth complexity | Medium | Use service account or simplified OAuth |
| Lamatic free tier limits | Low | Free tier sufficient for demo |
| Network latency | Low | Edge deployment provides fast response |
| FeedPrism not publicly accessible | Medium | Use ngrok tunnel for demo |

---

## References

- **Lamatic Documentation:** https://lamatic.ai/docs
- **Gmail Node Docs:** https://lamatic.ai/docs/nodes/apps/gmail-node
- **API Node Docs:** https://lamatic.ai/docs/nodes/data/api-node
- **Slack Node Docs:** https://lamatic.ai/docs/nodes/apps/slack-node
- **SDK Docs:** https://lamatic.ai/docs/sdk
