# Epic: Lamatic Integration for FeedPrism

This folder contains the complete implementation plan for integrating Lamatic.ai with FeedPrism for real-time email intelligence.

## Quick Links

| Document | Description |
|----------|-------------|
| [EPIC-OVERVIEW.md](./EPIC-OVERVIEW.md) | Epic summary, scope, and architecture |
| [LAMATIC-001](./LAMATIC-001-google-cloud-oauth-setup.md) | Google Cloud OAuth Setup |
| [LAMATIC-002](./LAMATIC-002-lamatic-account-project-setup.md) | Lamatic Account & Project Setup |
| [LAMATIC-003](./LAMATIC-003-feedprism-lamatic-api-router.md) | FeedPrism API Router |
| [LAMATIC-004](./LAMATIC-004-slack-workspace-app-setup.md) | Slack Setup (Optional) |
| [LAMATIC-005](./LAMATIC-005-lamatic-flow-email-intelligence.md) | **Main Flow Build** |
| [LAMATIC-006](./LAMATIC-006-end-to-end-testing.md) | Testing & Demo Script |
| [LAMATIC-007](./LAMATIC-007-documentation-readme-update.md) | Documentation Updates |

## Implementation Order

```
┌─────────────────────────────────────────────────────────────┐
│                 PARALLEL SETUP (45 min)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LAMATIC-001          LAMATIC-002          LAMATIC-003      │
│  Google OAuth         Lamatic Account      FeedPrism API    │
│  (30 min)             (15 min)             (45 min)         │
│                                                              │
│  ───────────────────────────────────────────────────────    │
│                          ↓                                   │
│                                                              │
│                    LAMATIC-004                               │
│                    Slack Setup                               │
│                    (20 min - optional)                       │
│                                                              │
│  ───────────────────────────────────────────────────────    │
│                          ↓                                   │
│                                                              │
│                    LAMATIC-005                               │
│                    Build Lamatic Flow                        │
│                    (45 min - CRITICAL)                       │
│                                                              │
│  ───────────────────────────────────────────────────────    │
│                          ↓                                   │
│                                                              │
│                    LAMATIC-006                               │
│                    Testing & Demo                            │
│                    (25 min)                                  │
│                                                              │
│  ───────────────────────────────────────────────────────    │
│                          ↓                                   │
│                                                              │
│                    LAMATIC-007                               │
│                    Documentation                             │
│                    (20 min)                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Total Time: 2.5 - 3 hours
```

## Key Resources

### Lamatic Documentation
- **Overview:** https://lamatic.ai/docs
- **Gmail Node:** https://lamatic.ai/docs/nodes/apps/gmail-node
- **API Node:** https://lamatic.ai/docs/nodes/data/api-node
- **Branch Node:** https://lamatic.ai/docs/nodes/logic/branch-node
- **Code Node:** https://lamatic.ai/docs/nodes/logic/code-node
- **Slack Node:** https://lamatic.ai/docs/nodes/apps/slack-node
- **SDK:** https://lamatic.ai/docs/sdk

### Google Cloud
- **Console:** https://console.cloud.google.com
- **Gmail API:** https://developers.google.com/gmail/api
- **OAuth Setup:** https://developers.google.com/identity/protocols/oauth2

## Critical Notes

> ⚠️ **Gmail Credentials:** Must be set up through Google Cloud Console first. There is NO "Settings > Integrations" in Lamatic for Gmail. Credentials are configured directly in the Gmail Node within your flow.

> ⚠️ **FeedPrism Accessibility:** Lamatic needs to reach your FeedPrism API. Use either:
> - Deployed URL (Railway, Render, etc.)
> - ngrok tunnel for local development

> ⚠️ **OAuth Warning:** Google shows "This app isn't verified" warning. Click Advanced > "Go to app (unsafe)" for testing.

## Success Metrics

| Metric | Target |
|--------|--------|
| Gmail trigger latency | < 5 seconds |
| End-to-end processing | < 10 seconds |
| Slack notification delay | < 3 seconds |
| Flow success rate | > 95% |

## Demo Script Summary

1. Show Lamatic flow diagram (15s)
2. Send test email (10s)
3. Watch flow execute in logs (20s)
4. Show Slack notification (15s)
5. Show content in FeedPrism UI (15s)
6. Wrap up benefits (15s)

**Total: 90 seconds**
