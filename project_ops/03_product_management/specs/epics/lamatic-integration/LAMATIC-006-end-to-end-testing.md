# LAMATIC-006: End-to-End Testing & Demo

**Story ID:** LAMATIC-006  
**Type:** Testing/Verification  
**Priority:** P1  
**Estimate:** 30 minutes  
**Status:** To Do  
**Depends On:** LAMATIC-005 (Lamatic Flow)

---

## Overview

Perform end-to-end testing of the complete Lamatic integration flow:  
Gmail → Lamatic → Bridge Service → FeedPrism → Qdrant

Verify idempotency, extraction accuracy, and overall system reliability.

---

## Test Scenarios

### Scenario 1: Happy Path (New Email)
1. Send a newsletter email to the connected Gmail account
2. Verify Lamatic flow triggers within 5 seconds
3. Verify bridge service receives the webhook
4. Verify FeedPrism processes the email
5. Verify content is extracted and stored in Qdrant
6. Verify Slack notification is sent (if configured)

**Expected Result:** Email is processed successfully, content appears in Qdrant.

### Scenario 2: Idempotency Check (Duplicate Email)
1. Resend the same email from Scenario 1
2. Verify Lamatic flow triggers again
3. Verify bridge service **skips** the email (already processed)
4. Verify no duplicate vectors in Qdrant

**Expected Result:** Bridge returns `{"status": "skipped", "reason": "already_processed"}`.

### Scenario 3: Error Handling
1. Stop the FeedPrism backend
2. Send a new email
3. Verify bridge service returns an error
4. Restart FeedPrism
5. Retry the same email (manual trigger or resend)
6. Verify it processes successfully

**Expected Result:** Graceful error handling, retry works.

---

## Testing Checklist

- [ ] Gmail trigger detects emails within 5 seconds
- [ ] Bridge service receives correct payload format
- [ ] Idempotency check works (duplicates are skipped)
- [ ] New emails are processed and stored in Qdrant
- [ ] Extraction quality is acceptable (spot-check a few emails)
- [ ] End-to-end latency < 15 seconds
- [ ] Error handling works (service unavailable, retries, etc.)

---

## Demo Script

For hackathon presentation:

1. **Show the Flow:** Open Lamatic Studio, display the flow diagram
2. **Show Monitoring:** Open:
   - Lamatic logs
   - Bridge service terminal
   - FeedPrism backend logs
   - Slack channel (optional)
3. **Trigger the Flow:** Send a test email or forward a newsletter
4. **Watch Real-Time:**
   - Lamatic flow executes
   - Bridge receives webhook
   - FeedPrism extracts content
   - Slack notification arrives
5. **Verify Results:** Open FeedPrism UI, search for the extracted content
6. **Demonstrate Idempotency:** Resend the same email, show "skipped" log

**Total Demo Time:** 60-90 seconds

---

## Performance Benchmarks

| Metric | Target | Actual |
|--------|--------|--------|
| Gmail → Lamatic trigger | < 5s | ___ |
| Lamatic → Bridge call | < 1s | ___ |
| Bridge → FeedPrism → Qdrant | < 10s | ___ |
| End-to-End | < 15s | ___ |

---

## Next Steps

After testing:
1. Fix any bugs or performance issues
2. Proceed to **LAMATIC-007** for documentation
