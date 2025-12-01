# LAMATIC-001: Google Cloud OAuth Setup for Gmail API

**Story ID:** LAMATIC-001  
**Type:** Setup/Configuration  
**Priority:** P0 (Blocker)  
**Estimate:** 30 minutes  
**Status:** To Do

---

## Overview

Set up Google Cloud OAuth credentials required for Lamatic's Gmail Node to access Gmail API. This is a prerequisite for all Gmail-related functionality in Lamatic.

> **IMPORTANT:** The Lamatic Gmail Node documentation states credentials must be set up through Google Cloud Console first, then configured within the Lamatic flow. There is NO "Settings > Integrations" tab in Lamatic for Gmail - credentials are configured directly in the Gmail Node within your flow.

---

## Prerequisites

- Google Account (Gmail account you want to monitor)
- Access to Google Cloud Console (https://console.cloud.google.com)

---

## Step-by-Step Instructions

### Step 1: Create or Select Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click the project dropdown at the top of the page
3. Click **"New Project"** (or select existing project)
4. Enter project details:
   - **Project Name:** `FeedPrism-Lamatic` (or any name)
   - **Organization:** Leave as default or select your org
5. Click **"Create"**
6. Wait for project creation (30 seconds)
7. Select the newly created project from the dropdown

### Step 2: Enable Gmail API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
   - Or direct link: https://console.cloud.google.com/apis/library
2. Search for **"Gmail API"**
3. Click on **"Gmail API"** in results
4. Click **"Enable"** button
5. Wait for API to be enabled (10-20 seconds)

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
   - Or direct link: https://console.cloud.google.com/apis/credentials/consent
2. Select **User Type:**
   - Choose **"External"** (for testing with any Gmail account)
   - Or **"Internal"** (if using Google Workspace and want to restrict to org)
3. Click **"Create"**
4. Fill in **App Information:**
   - **App name:** `FeedPrism Email Intelligence`
   - **User support email:** Your email address
   - **App logo:** Optional (skip for now)
5. Fill in **Developer contact information:**
   - **Email addresses:** Your email address
6. Click **"Save and Continue"**
7. **Scopes Screen:**
   - Click **"Add or Remove Scopes"**
   - Search and select these scopes:
     - `https://www.googleapis.com/auth/gmail.readonly` (Read emails)
     - `https://www.googleapis.com/auth/gmail.send` (Send emails - for calendar draft)
     - `https://www.googleapis.com/auth/calendar.events` (Create calendar events)
   - Click **"Update"**
   - Click **"Save and Continue"**
8. **Test Users Screen:**
   - Click **"Add Users"**
   - Add the Gmail address you'll use for testing
   - Click **"Add"**
   - Click **"Save and Continue"**
9. **Summary Screen:**
   - Review settings
   - Click **"Back to Dashboard"**

### Step 4: Create OAuth Client ID Credentials

1. Go to **APIs & Services** > **Credentials**
   - Or direct link: https://console.cloud.google.com/apis/credentials
2. Click **"+ Create Credentials"** at the top
3. Select **"OAuth client ID"**
4. Configure OAuth client:
   - **Application type:** Select **"Web application"**
   - **Name:** `Lamatic Gmail Integration`
5. Under **Authorized redirect URIs:**
   - Click **"+ Add URI"**
   - Add: `https://api.lamatic.ai/oauth/callback` 
   - **Note:** Check Lamatic docs for exact callback URL - this may vary
6. Click **"Create"**
7. **IMPORTANT - Save Credentials:**
   - A popup will show your credentials
   - **Copy and save securely:**
     - **Client ID:** `xxxxx.apps.googleusercontent.com`
     - **Client Secret:** `GOCSPX-xxxxx`
   - Click **"Download JSON"** for backup
   - Click **"OK"**

### Step 5: Verify Setup

**Credentials Created:**
- [ ] Client ID saved securely
- [ ] Client Secret saved securely
- [ ] JSON file downloaded as backup

**APIs Enabled:**
- [ ] Gmail API enabled
- [ ] (Optional) Google Calendar API enabled

**OAuth Consent:**
- [ ] Consent screen configured
- [ ] Required scopes added
- [ ] Test user email added

---

## Credentials Storage

Store credentials securely. **Never commit to git.**

Create a local file (gitignored):
```bash
# Create credentials file
touch ~/.feedprism/google_oauth_credentials.json
```

Add content:
```json
{
  "lamatic_gmail_oauth": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "client_secret": "GOCSPX-YOUR_CLIENT_SECRET",
    "project_id": "feedprism-lamatic",
    "created_at": "2025-12-01"
  }
}
```

---

## Common Issues & Troubleshooting

### Issue: "App not verified" warning
**Solution:** This is expected for external apps in testing. Click "Advanced" > "Go to FeedPrism Email Intelligence (unsafe)" to proceed. For production, submit app for verification.

### Issue: "Access blocked: This app's request is invalid"
**Causes:**
- Redirect URI mismatch - verify exact URI from Lamatic docs
- Scopes not properly configured
**Solution:** Double-check redirect URIs and re-add scopes

### Issue: "Gmail API has not been used in project"
**Solution:** Enable Gmail API in APIs & Services > Library

### Issue: "Quota exceeded"
**Solution:** Gmail API has generous free quotas. If exceeded, check for runaway processes.

---

## Next Steps

After completing this setup:
1. Proceed to **LAMATIC-002** to create Lamatic account and project
2. You'll configure these credentials directly in the Gmail Node when building the flow in **LAMATIC-005**

---

## Reference Links

- [Google Cloud Console](https://console.cloud.google.com)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2)
- [Lamatic Gmail Node Docs](https://lamatic.ai/docs/nodes/apps/gmail-node)
