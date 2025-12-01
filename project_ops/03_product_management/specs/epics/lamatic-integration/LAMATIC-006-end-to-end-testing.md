# LAMATIC-006: End-to-End Testing & Demo Script

**Story ID:** LAMATIC-006  
**Type:** Testing/QA  
**Priority:** P1 (Important)  
**Estimate:** 25 minutes  
**Status:** To Do  
**Depends On:** LAMATIC-001 through LAMATIC-005

---

## Overview

Comprehensive testing of the complete Lamatic + FeedPrism integration, including creating a demo script for the hackathon presentation.

---

## Test Plan

### Test 1: FeedPrism API Endpoint Verification

**Purpose:** Verify the FeedPrism API is accessible and returns expected format

**Steps:**
1. Ensure FeedPrism backend is running
2. Note the public URL (deployment or ngrok)
3. Test health endpoint:
   ```bash
   curl https://YOUR_FEEDPRISM_URL/api/lamatic/health
   ```
4. Expected response:
   ```json
   {"status": "healthy", "service": "feedprism-lamatic-integration", "timestamp": "..."}
   ```

**Pass Criteria:** 200 OK response with healthy status

### Test 2: FeedPrism Ingest Endpoint

**Purpose:** Verify the ingest endpoint processes email data correctly

**Steps:**
1. Send test request:
   ```bash
   curl -X POST https://YOUR_FEEDPRISM_URL/api/lamatic/ingest \
     -H "Content-Type: application/json" \
     -d '{
       "emailId": "test_001",
       "from": "newsletter@aiweekly.com",
       "to": "user@example.com",
       "subject": "AI Weekly: Test Newsletter",
       "body": "<html><body><h1>Upcoming Event: AI Summit 2024</h1><p>Join us on Dec 15 in San Francisco</p></body></html>",
       "timestamp": "2025-12-01T10:30:00Z",
       "labels": ["INBOX"],
       "attachments": []
     }'
   ```
2. Verify response contains:
   - `status: "success"`
   - `data.items_extracted` > 0
   - `data.has_events` or `data.has_actions`

**Pass Criteria:** 200 OK with extracted content

### Test 3: Gmail Trigger in Lamatic

**Purpose:** Verify Gmail Node triggers on new emails

**Steps:**
1. Open Lamatic Studio
2. Go to the FeedPrism Email Intelligence flow
3. Open the Gmail Trigger node debug panel
4. Send a test email to the connected Gmail account
5. Watch for trigger event in Lamatic logs

**Pass Criteria:** Trigger fires within 10 seconds of email arrival

### Test 4: Full Flow Execution

**Purpose:** Verify entire flow executes correctly

**Steps:**
1. Send a test email with known content:
   ```
   Subject: Test Newsletter - AI Summit Event
   Body: Join us for AI Summit 2024 on December 15th in San Francisco!
         Register at: https://aisummit.example.com
         Registration deadline: December 10th
   ```
2. Watch Lamatic logs for each node execution
3. Verify:
   - Gmail Trigger → fires
   - API Node → calls FeedPrism successfully
   - Code Node → parses without error
   - Branch Node → routes correctly
   - Gmail/Slack Node → executes

**Pass Criteria:** All nodes execute with green status

### Test 5: Slack Notification

**Purpose:** Verify Slack receives formatted notification

**Steps:**
1. Complete Test 4
2. Check `#feedprism-alerts` channel
3. Verify message contains:
   - Email sender
   - Subject line
   - Extraction summary
   - Event details (if extracted)

**Pass Criteria:** Message appears in Slack within 15 seconds

### Test 6: Calendar Draft Creation

**Purpose:** Verify calendar event draft is created

**Steps:**
1. Send email with clear event data
2. Check Gmail Drafts folder
3. Look for calendar event draft or email draft with event details

**Pass Criteria:** Draft created with correct event details

### Test 7: Error Handling

**Purpose:** Verify graceful handling of errors

**Steps:**
1. Test with invalid FeedPrism URL
2. Test with malformed email body
3. Test with missing required fields

**Expected Behavior:**
- Flow should not crash
- Error should be logged
- Notification should indicate failure (or skip gracefully)

**Pass Criteria:** Flow handles errors without crashing

---

## Performance Benchmarks

| Metric | Target | Acceptable |
|--------|--------|------------|
| Gmail trigger latency | < 5s | < 10s |
| FeedPrism API response | < 2s | < 5s |
| Total end-to-end time | < 10s | < 20s |
| Slack notification delay | < 3s | < 5s |

---

## Test Checklist

### Pre-Demo Verification

- [ ] FeedPrism backend running and accessible
- [ ] ngrok tunnel active (if using local)
- [ ] Lamatic flow deployed
- [ ] Gmail credentials valid
- [ ] Slack channel ready and visible
- [ ] Test email account accessible

### Flow Execution Tests

- [ ] Gmail trigger fires on new email
- [ ] API Node successfully calls FeedPrism
- [ ] Code Node parses response correctly
- [ ] Branch Node routes based on content
- [ ] Calendar draft created (if events found)
- [ ] Slack notification received

### Demo Preparation

- [ ] Have test email ready to send
- [ ] Browser tabs open:
  - Lamatic Studio (flow view)
  - Lamatic Logs
  - FeedPrism UI
  - Slack channel
  - Gmail (to see draft)
- [ ] Screen recording ready (optional backup)

---

## Demo Script (90 Seconds)

### Setup (Before Demo)
1. Open browser with tabs:
   - Tab 1: Lamatic Studio - Flow diagram visible
   - Tab 2: Slack `#feedprism-alerts`
   - Tab 3: FeedPrism UI - Content view
   - Tab 4: Gmail - Ready to send email
2. Prepare test email in drafts

### Demo Flow

**[0:00 - 0:15] Introduction**
> "Let me show you FeedPrism with real-time Lamatic automation."
> 
> "This flow monitors Gmail, extracts content using FeedPrism's AI pipeline, stores in Qdrant, and notifies via Slack - all automatically."

**[0:15 - 0:25] Show Architecture**
> "Here's the Lamatic flow..."
> 
> [Show Lamatic Studio tab with flow diagram]
> 
> "Gmail trigger, FeedPrism API call, branching logic, calendar draft, and Slack notification."

**[0:25 - 0:35] Send Test Email**
> "Watch what happens when a newsletter arrives..."
> 
> [Switch to Gmail tab, send the prepared test email]
> 
> "Email sent."

**[0:35 - 0:50] Show Real-Time Processing**
> [Switch to Lamatic Logs tab]
> 
> "The flow is triggering now..."
> 
> [Wait for nodes to show execution]
> 
> "Gmail detected, calling FeedPrism, extracting content..."

**[0:50 - 1:05] Show Results**
> [Switch to Slack tab]
> 
> "And here's the Slack notification - arrived in under 10 seconds."
> 
> [Show the notification with extracted content]
> 
> [Switch to FeedPrism UI]
> 
> "Content is now searchable in FeedPrism with full Qdrant hybrid search."

**[1:05 - 1:30] Wrap Up**
> "This demonstrates memory-over-models in action:"
> - "Real-time ingestion, not batch"
> - "Qdrant stores the memory, Lamatic orchestrates the actions"
> - "Never miss an important event or deadline"

---

## Fallback Plans

### If Gmail Trigger Fails
1. Use webhook trigger instead
2. Manually call the webhook with test data
3. Show flow execution from API Node onwards

### If FeedPrism API Unreachable
1. Use pre-recorded demo video
2. Show API response from earlier test (in Lamatic logs)
3. Explain the expected behavior

### If Slack Fails
1. Show logs where Slack call was made
2. Explain Slack would receive the message
3. Continue with other results

---

## Recorded Backup

Create a backup screen recording:

1. Start screen recording
2. Run through demo script
3. Capture successful end-to-end execution
4. Save video as backup for presentation

---

## Next Steps

After completing testing:
1. Fix any issues found
2. Proceed to **LAMATIC-007** for documentation
3. Practice demo 2-3 times before presentation
