# LAMATIC-004: Slack Workspace & App Setup

**Story ID:** LAMATIC-004  
**Type:** Setup/Configuration  
**Priority:** P1 (Important but not blocking)  
**Estimate:** 20 minutes  
**Status:** To Do  
**Depends On:** LAMATIC-002 (Lamatic account needed)

---

## Overview

Set up Slack integration for receiving real-time notifications when FeedPrism extracts content from emails. The Lamatic Slack Node can send messages to Slack channels.

> **Note:** This is optional but highly recommended for demo impact. Real-time Slack notifications make the demo more impressive.

---

## Prerequisites

- Slack workspace (can be a free workspace)
- Admin access to install apps in the workspace
- Lamatic account (from LAMATIC-002)

---

## Step-by-Step Instructions

### Step 1: Create/Access Slack Workspace

**Option A: Use Existing Workspace**
- Use your team's existing Slack workspace
- Ensure you have permission to install apps

**Option B: Create New Workspace (for Demo)**
1. Go to [slack.com/create](https://slack.com/create)
2. Click **"Create a New Workspace"**
3. Enter your email and follow setup prompts
4. Name the workspace (e.g., "FeedPrism Demo")
5. Create a channel named `#feedprism-alerts`

### Step 2: Install Lamatic App in Slack

According to Lamatic Slack Node documentation, you need to install the Lamatic app:

1. Go to your Slack workspace
2. The Lamatic Slack Node documentation mentions:
   > "Check that the Lamatic app is available for installation"
   > "Ensure the Lamatic app has necessary permissions"

3. **In Slack:**
   - Click on **Apps** in the left sidebar
   - Click **"Add apps"** or search for **"Lamatic"**
   - If Lamatic app is available, click **"Add"**
   - Authorize the requested permissions

4. **Alternative - Use Incoming Webhook:**
   If Lamatic app is not available in Slack App Directory, you can create an incoming webhook:
   
   a. Go to [api.slack.com/apps](https://api.slack.com/apps)
   b. Click **"Create New App"**
   c. Choose **"From scratch"**
   d. Name: `FeedPrism Notifications`
   e. Select your workspace
   f. Go to **"Incoming Webhooks"**
   g. Toggle **"Activate Incoming Webhooks"** to On
   h. Click **"Add New Webhook to Workspace"**
   i. Select channel: `#feedprism-alerts`
   j. Copy the webhook URL

### Step 3: Create Notification Channel

1. In Slack, click **"+"** next to Channels
2. Create channel: `#feedprism-alerts`
3. Make it public (or private if preferred)
4. Add description: "FeedPrism email extraction notifications"
5. Invite the Lamatic app/bot to this channel:
   - Type `/invite @Lamatic` in the channel
   - Or right-click channel > Settings > Integrations > Add apps

### Step 4: Configure Credentials for Lamatic

When building the flow in LAMATIC-005, you'll configure Slack credentials directly in the Slack Node:

**Lamatic Slack Node Configuration:**
```yaml
# From Lamatic docs
nodeName: Slack
values:
  credentials: "my-slack-creds"  # Name you give to your credentials
  action: postMessage
  channel: "#feedprism-alerts"   # Your channel
  message: "{{message_content}}" # Dynamic from flow
```

**Credential Setup in Lamatic Flow Editor:**
1. Drag Slack Node into your flow
2. Click on **"credentials"** field
3. Click **"Add new Credentials"**
4. Follow Lamatic's Slack authorization flow
5. Name the credential (e.g., `feedprism-slack`)

### Step 5: Test Slack Integration

After setup, verify the channel receives messages:

1. In Lamatic, create a simple test flow:
   - Webhook trigger → Slack Node (send test message)
2. Trigger the webhook
3. Verify message appears in `#feedprism-alerts`

---

## Message Format for FeedPrism Notifications

Design the notification message template:

### New Content Extracted Notification:
```
🔔 *FeedPrism: New Content Extracted*

📧 *From:* {{email.from}}
📋 *Subject:* {{email.subject}}

📊 *Extracted:*
• Events: {{data.content_summary.events}}
• Courses: {{data.content_summary.courses}}
• Blogs: {{data.content_summary.blogs}}
• Actions: {{data.content_summary.actions}}

{{#if data.has_events}}
📅 *Next Event:* {{data.events[0].title}}
🕐 {{data.events[0].start_time}}
📍 {{data.events[0].location}}
{{/if}}

{{#if data.has_actions}}
⚡ *Action Required:* {{data.actions[0].title}}
⏰ Due: {{data.actions[0].deadline}}
{{/if}}

_Processed at {{timestamp}}_
```

### Simpler Version (Recommended for Demo):
```
📧 *New newsletter processed!*
From: {{email.from}}

Extracted: {{data.items_extracted}} items
• {{data.content_summary.events}} events
• {{data.content_summary.actions}} actions

{{#if data.has_events}}
📅 Found event: *{{data.events[0].title}}*
{{/if}}
```

---

## Verification Checklist

**Workspace Setup:**
- [ ] Slack workspace accessible
- [ ] `#feedprism-alerts` channel created
- [ ] Lamatic app/bot invited to channel

**Credentials:**
- [ ] Slack credentials configured in Lamatic
- [ ] Can send test message to channel

**Testing:**
- [ ] Test message received in Slack
- [ ] Message formatting looks correct

---

## Troubleshooting

### Issue: "channel_not_found"
**Solution:** 
- Ensure channel name is correct (including `#`)
- Invite Lamatic bot to the channel

### Issue: "not_in_channel"
**Solution:**
- Invite Lamatic app to the channel using `/invite @Lamatic`

### Issue: "invalid_auth"
**Solution:**
- Re-authorize Slack credentials in Lamatic
- Regenerate webhook URL if using webhooks

### Issue: Messages not appearing
**Solution:**
- Check Lamatic flow logs for errors
- Verify channel permissions
- Test with a simple "Hello" message first

---

## Next Steps

After completing this:
1. Proceed to **LAMATIC-005** to build the complete flow
2. The Slack Node will be added as the final step in the flow

---

## Reference Links

- [Lamatic Slack Node Documentation](https://lamatic.ai/docs/nodes/apps/slack-node)
- [Slack API Documentation](https://api.slack.com/)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
