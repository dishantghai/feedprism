# LAMATIC-005: Lamatic Flow - Email Intelligence Pipeline

**Story ID:** LAMATIC-005  
**Type:** Integration Development  
**Priority:** P0 (Critical)  
**Estimate:** 45 minutes  
**Status:** To Do  
**Depends On:** LAMATIC-001, LAMATIC-002, LAMATIC-003, LAMATIC-004


---

## Overview

Build the Lamatic flow that:
1. Triggers on new Gmail messages (real-time)
2. Calls **Lamatic Bridge Service** (`http://bridge:8001/receive`) to process the email
3. Bridge service handles idempotency and forwards to FeedPrism
4. (Optional) Sends Slack notification with summary

This demonstrates Lamatic + Bridge + FeedPrism + Qdrant working together with **minimal impact** on the FeedPrism backend.

---

## Prerequisites

Before starting, ensure you have:
- [ ] Google OAuth credentials (from LAMATIC-001)
- [ ] Lamatic project created (from LAMATIC-002)
- [ ] **Bridge service running** on port 8001 (from LAMATIC-003)
- [ ] FeedPrism minimal router added (from LAMATIC-004)
- [ ] Bridge service accessible to Lamatic (use ngrok for local dev)

---

## Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                FLOW: FeedPrism Email Intelligence                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐                                           │
│  │  1. Gmail Node   │ ◄── TRIGGER: On New Email                 │
│  │  (Event Trigger) │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           │ emailId, from, to, subject, body, timestamp         │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │  2. API Node     │ ◄── POST to FeedPrism /api/lamatic/ingest │
│  │  (FeedPrism)     │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           │ status, data: {events, actions, has_events, ...}    │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │  3. Code Node    │ ◄── Parse response, prepare variables     │
│  │  (Data Parser)   │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           │ parsed data with formatted message                  │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │  4. Branch Node  │ ◄── Route based on content type           │
│  │  (Router)        │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│     ┌─────┴─────┐                                               │
│     ▼           ▼                                               │
│  ┌───────┐  ┌───────┐                                           │
│  │ Event │  │ No    │                                           │
│  │ Found │  │ Event │                                           │
│  └───┬───┘  └───┬───┘                                           │
│      │          │                                               │
│      ▼          │                                               │
│  ┌───────────┐  │                                               │
│  │ 5. Gmail  │  │                                               │
│  │ Calendar  │  │                                               │
│  │ Draft     │  │                                               │
│  └─────┬─────┘  │                                               │
│        │        │                                               │
│        └────┬───┘                                               │
│             │                                                   │
│             ▼                                                   │
│  ┌──────────────────┐                                           │
│  │  6. Slack Node   │ ◄── Send notification                     │
│  │  (Notification)  │                                           │
│  └──────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Build Instructions

### Step 1: Create New Flow

1. Open **Lamatic Studio** (https://studio.lamatic.ai or your project URL)
2. Navigate to **Flows** in the left sidebar
3. Click **"+ New Flow"** or **"Create Flow"**
4. Name the flow: `FeedPrism Email Intelligence`
5. Add description: `Real-time email processing and content extraction`

### Step 2: Add Gmail Trigger Node

This node triggers the flow when a new email arrives.

1. In the flow editor, you should see an empty canvas
2. Click the **"+"** button or drag from the **Nodes** panel
3. Search for **"Gmail"** and select **Gmail Node**
4. Click on the node to configure it

**Configuration:**

| Field | Value |
|-------|-------|
| **Node Name** | `Gmail Trigger` |
| **Action** | Select `On New Email` or `GMAIL_NEW_GMAIL_MESSAGE` |
| **Credentials** | Click "Add new credentials" (see below) |

**Adding Gmail Credentials:**

1. Click **"Add new credentials"** in the credentials dropdown
2. A popup/modal will appear
3. Enter a credential name: `feedprism-gmail-oauth`
4. You'll need to enter:
   - **Client ID:** From Google Cloud Console (LAMATIC-001)
   - **Client Secret:** From Google Cloud Console (LAMATIC-001)
5. Click **"Authorize"** or **"Connect"**
6. Google OAuth screen will appear - authorize access
7. If you see "This app isn't verified" warning:
   - Click **"Advanced"**
   - Click **"Go to FeedPrism Email Intelligence (unsafe)"**
   - Click **"Allow"** for requested permissions
8. Return to Lamatic - credentials should be connected
9. Select the newly created credentials

**Gmail Node Output (Available Variables):**
```yaml
# These variables are available to subsequent nodes
emailId: "msg_abc123..."        # Unique email ID
from: "sender@example.com"       # Sender email
to: "recipient@example.com"      # Recipient
subject: "Email Subject"         # Subject line
body: "<html>...</html>"         # Full HTML body
timestamp: "2025-12-01T10:30:00Z"
labels: ["INBOX", "UNREAD"]
attachments: []
```

### Step 3: Add API Node (Call Bridge Service)

This node calls the **Lamatic Bridge Service** to process the email.

1. Click **"+"** after the Gmail Trigger node
2. Search for **"API"** in the nodes panel
3. Select **API Node**
4. Connect it to the Gmail Trigger node (should auto-connect)

**Configuration:**

| Field | Value |
|-------|-------|
| **Node Name** | `Bridge Service Call` |
| **URL** | `https://YOUR_BRIDGE_URL/receive` (see below) |
| **Method** | `POST` |
| **Headers** | `{"Content-Type": "application/json"}` |
| **Body** | See below |
| **Retries** | `1` |
| **Retry Delay** | `1000` (1 second) |

**Body Configuration:**

Use the variables from the Gmail node:

```json
{
  "email_id": "{{gmailTrigger.emailId}}",
  "subject": "{{gmailTrigger.subject}}",
  "from": "{{gmailTrigger.from}}",
  "body_html": "{{gmailTrigger.body}}",
  "body_text": "{{gmailTrigger.body}}"
}
```

> **Note:** Variable syntax may be `{{nodeId.field}}` or `${nodeId.field}` depending on Lamatic version. Check the node output panel for exact variable names.

**Finding Your Bridge URL:**
- **Local with ngrok:** 
  1. Run bridge service: `cd lamatic_bridge && python main.py`
  2. In another terminal: `ngrok http 8001`
  3. Use the ngrok HTTPS URL (e.g., `https://abc123.ngrok.io`)
- **Deployed:** Use your deployment URL (e.g., `https://bridge.yourapp.com`)
- **Test first:** Visit `https://your-bridge-url/health` to verify

### Step 4: Add Code Node (Parse Response)

This node parses the FeedPrism response and prepares data for branching.

1. Click **"+"** after the API Node
2. Search for **"Code"** and select **Code Node**
3. Connect it to the API Node

**Configuration:**

| Field | Value |
|-------|-------|
| **Node Name** | `Parse Response` |
| **Code** | See below |

**JavaScript Code:**

```javascript
// Parse the FeedPrism API response
const apiResponse = input.feedprismIngest; // Adjust node name if different

// Extract key data
const data = apiResponse.data || {};
const events = data.events || [];
const actions = data.actions || [];
const hasEvents = data.has_events || events.length > 0;
const hasActions = data.has_actions || actions.length > 0;

// Get first event details for calendar
let firstEvent = null;
if (events.length > 0) {
  firstEvent = {
    title: events[0].title || "Untitled Event",
    startTime: events[0].start_time || null,
    endTime: events[0].end_time || null,
    location: events[0].location || "",
    description: events[0].description || "",
    registrationUrl: events[0].registration_url || ""
  };
}

// Get first action for notification
let firstAction = null;
if (actions.length > 0) {
  firstAction = {
    title: actions[0].title || "Action Required",
    deadline: actions[0].deadline || null,
    url: actions[0].url || ""
  };
}

// Build Slack message
const emailFrom = input.gmailTrigger.from || "Unknown";
const emailSubject = input.gmailTrigger.subject || "No Subject";

let slackMessage = `📧 *New newsletter processed!*\n`;
slackMessage += `From: ${emailFrom}\n`;
slackMessage += `Subject: ${emailSubject}\n\n`;
slackMessage += `📊 Extracted: ${data.items_extracted || 0} items\n`;

if (data.content_summary) {
  slackMessage += `• Events: ${data.content_summary.events || 0}\n`;
  slackMessage += `• Courses: ${data.content_summary.courses || 0}\n`;
  slackMessage += `• Actions: ${data.content_summary.actions || 0}\n`;
}

if (hasEvents && firstEvent) {
  slackMessage += `\n📅 *Event Found:* ${firstEvent.title}`;
  if (firstEvent.startTime) {
    slackMessage += `\n🕐 ${firstEvent.startTime}`;
  }
  if (firstEvent.location) {
    slackMessage += `\n📍 ${firstEvent.location}`;
  }
}

if (hasActions && firstAction) {
  slackMessage += `\n\n⚡ *Action Required:* ${firstAction.title}`;
  if (firstAction.deadline) {
    slackMessage += `\n⏰ Due: ${firstAction.deadline}`;
  }
}

// Return structured output
return {
  hasEvents: hasEvents,
  hasActions: hasActions,
  firstEvent: firstEvent,
  firstAction: firstAction,
  slackMessage: slackMessage,
  itemsExtracted: data.items_extracted || 0
};
```

### Step 5: Add Branch Node (Route by Content Type)

This node routes the flow based on whether events were found.

1. Click **"+"** after the Code Node
2. Search for **"Branch"** and select **Branch Node**
3. Connect it to the Code Node

**Configuration:**

| Field | Value |
|-------|-------|
| **Node Name** | `Route by Content` |
| **Branches** | 2 branches (see below) |

**Branch Setup:**

- **Branch 1:** `Has Event`
  - Condition: `parseResponse.hasEvents === true`
  - This branch will go to Gmail Calendar Draft node

- **Branch 2:** `No Event`  
  - Condition: `parseResponse.hasEvents === false`
  - This branch goes directly to Slack notification

### Step 6: Add Gmail Calendar Draft Node (Event Branch)

This node creates a calendar event draft when events are found.

1. On the **"Has Event"** branch, click **"+"**
2. Search for **"Gmail"** and select **Gmail Node**
3. Configure as an action node

**Configuration:**

| Field | Value |
|-------|-------|
| **Node Name** | `Create Calendar Draft` |
| **Action** | `GMAIL_CREATE_EMAIL_DRAFT` or `Create Event Draft` |
| **Credentials** | Select your `feedprism-gmail-oauth` credentials |
| **Subject** | `📅 Event: {{parseResponse.firstEvent.title}}` |
| **Body** | See below |

**Email/Event Body:**
```
Event: {{parseResponse.firstEvent.title}}

Date: {{parseResponse.firstEvent.startTime}}
Location: {{parseResponse.firstEvent.location}}

Description:
{{parseResponse.firstEvent.description}}

Registration: {{parseResponse.firstEvent.registrationUrl}}

---
Extracted by FeedPrism
```

> **Note:** The calendar draft action may work differently. Test with a simple email draft first, then adjust for calendar format if needed.

### Step 7: Add Slack Node (Notification)

This node sends the notification to Slack. It should receive input from both branches.

1. After both branches, add a **Slack Node** that both paths connect to
2. Search for **"Slack"** and select **Slack Node**
3. Connect both the Calendar Draft node AND the "No Event" branch to this node

**Configuration:**

| Field | Value |
|-------|-------|
| **Node Name** | `Send Notification` |
| **Action** | `postMessage` or `Send Message` |
| **Credentials** | Click "Add new credentials" |
| **Channel** | `#feedprism-alerts` |
| **Message** | `{{parseResponse.slackMessage}}` |

**Adding Slack Credentials:**

1. Click **"Add new credentials"**
2. Follow Lamatic's Slack authorization flow
3. Authorize Lamatic to access your workspace
4. Select your workspace and authorize
5. Name the credential: `feedprism-slack`

### Step 8: Save and Test Flow

1. Click **"Save"** in the toolbar
2. Use the **Debug** or **Test** feature:
   - Click on the Gmail Trigger node
   - Look for a "Test" or "Debug" button
   - You may need to send a test email to trigger

**Manual Testing:**
1. Send an email to your connected Gmail account
2. Check Lamatic logs to see if the trigger fired
3. Check each node's output in the debug panel
4. Verify Slack message was sent

### Step 9: Deploy Flow

1. Click **"Deploy"** in the toolbar
2. Review the deployment summary
3. Confirm deployment
4. Note the deployment status

**Post-Deployment:**
1. Go to **Jobs** to see flow executions
2. Go to **Logs** to monitor and debug

---

## Low-Code YAML Reference

The complete flow in Lamatic's YAML format (for reference):

```yaml
# FeedPrism Email Intelligence Flow
name: FeedPrism Email Intelligence
description: Real-time email processing and content extraction

triggerNode:
  nodeId: triggerNode_gmail
  nodeType: gmailNode
  nodeName: Gmail Trigger
  values:
    credentials: feedprism-gmail-oauth
    action: GMAIL_NEW_GMAIL_MESSAGE
  modes: {}

nodes:
  # API Node - Call FeedPrism
  - nodeId: apiNode_feedprism
    nodeType: apiNode
    nodeName: FeedPrism Ingest
    values:
      url: "https://YOUR_FEEDPRISM_URL/api/lamatic/ingest"
      method: POST
      headers: '{"Content-Type": "application/json"}'
      body: |
        {
          "emailId": "{{triggerNode_gmail.emailId}}",
          "from": "{{triggerNode_gmail.from}}",
          "to": "{{triggerNode_gmail.to}}",
          "subject": "{{triggerNode_gmail.subject}}",
          "body": "{{triggerNode_gmail.body}}",
          "timestamp": "{{triggerNode_gmail.timestamp}}",
          "labels": {{triggerNode_gmail.labels}},
          "attachments": {{triggerNode_gmail.attachments}}
        }
      retries: '1'
      retry_delay: '1000'
    needs:
      - triggerNode_gmail

  # Code Node - Parse Response
  - nodeId: codeNode_parse
    nodeType: codeNode
    nodeName: Parse Response
    values:
      code: |
        // JavaScript code from Step 4
        const apiResponse = input.apiNode_feedprism;
        // ... rest of code
    needs:
      - apiNode_feedprism

  # Branch Node - Route by Content
  - nodeId: branchNode_route
    nodeType: branchNode
    nodeName: Route by Content
    values:
      branches:
        - label: Has Event
          value: branchNode_route-hasEvent
          condition: "codeNode_parse.hasEvents === true"
        - label: No Event
          value: branchNode_route-noEvent
          condition: "codeNode_parse.hasEvents === false"
    needs:
      - codeNode_parse

  # Gmail Calendar Draft (Has Event branch)
  - nodeId: gmailNode_calendar
    nodeType: gmailNode
    nodeName: Create Calendar Draft
    values:
      credentials: feedprism-gmail-oauth
      action: GMAIL_CREATE_EMAIL_DRAFT
      subject: "📅 Event: {{codeNode_parse.firstEvent.title}}"
      body: "Event details..."
    needs:
      - branchNode_route
    branch: branchNode_route-hasEvent

  # Slack Notification (both branches merge here)
  - nodeId: slackNode_notify
    nodeType: slackNode
    nodeName: Send Notification
    values:
      credentials: feedprism-slack
      action: postMessage
      channel: "#feedprism-alerts"
      message: "{{codeNode_parse.slackMessage}}"
    needs:
      - gmailNode_calendar
      - branchNode_route-noEvent
```

---

## Troubleshooting

### Gmail Trigger Not Firing
- Verify OAuth credentials are valid
- Check if test user is authorized in Google Cloud Console
- Try revoking and re-authorizing credentials
- Check Lamatic logs for OAuth errors

### API Node Returns Error
- Verify FeedPrism URL is correct and accessible
- Test the URL with curl from your machine
- Check if ngrok tunnel is still running (if using)
- Look at FeedPrism server logs

### Code Node Errors
- Check JavaScript syntax
- Verify input variable names match node IDs
- Use console.log for debugging (check Lamatic logs)

### Branch Not Working
- Verify condition syntax
- Test with hardcoded true/false first
- Check Code Node output includes expected fields

### Slack Not Receiving Messages
- Verify Slack credentials are authorized
- Check channel name (include `#`)
- Ensure Lamatic app is invited to channel
- Test with a simple "Hello" message first

---

## Acceptance Criteria

- [ ] Gmail trigger detects new emails within 10 seconds
- [ ] API Node successfully calls FeedPrism and gets response
- [ ] Code Node parses response without errors
- [ ] Branch Node routes correctly based on has_events
- [ ] Calendar draft created when events are found
- [ ] Slack notification sent for all processed emails
- [ ] End-to-end latency < 15 seconds

---

## Demo Script

1. Open Lamatic Studio showing the flow diagram
2. Open Slack `#feedprism-alerts` channel
3. Open FeedPrism UI in another tab
4. Send test email to connected Gmail
5. Watch:
   - Lamatic flow executes (show logs)
   - Slack notification arrives
   - Content appears in FeedPrism UI
6. Total time: < 10 seconds

---

## Next Steps

After completing this:
1. Proceed to **LAMATIC-006** for end-to-end testing
2. Then **LAMATIC-007** for documentation
