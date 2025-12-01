# LAMATIC-002: Lamatic Account & Project Setup

**Story ID:** LAMATIC-002  
**Type:** Setup/Configuration  
**Priority:** P0 (Blocker)  
**Estimate:** 15 minutes  
**Status:** To Do  
**Depends On:** None (can be done in parallel with LAMATIC-001)

---

## Overview

Create a Lamatic.ai account and set up the project that will contain our FeedPrism Email Intelligence flow.

---

## Prerequisites

- Email address for signup
- Google OAuth credentials from LAMATIC-001 (needed later for Gmail Node)

---

## Step-by-Step Instructions

### Step 1: Create Lamatic Account

1. Go to [https://lamatic.ai](https://lamatic.ai)
2. Click **"Sign Up"** or **"Get Started"** button
3. Sign up using:
   - **Email/Password**, or
   - **Google Account** (recommended for faster setup)
4. Verify email if required
5. Complete any onboarding prompts

### Step 2: Create New Project

1. After login, you'll see the Lamatic Studio dashboard
2. Click **"+ New Project"** or **"Create Project"**
3. Enter project details:
   - **Project Name:** `FeedPrism-Lamatic-Integration`
   - **Description:** `Real-time email intelligence for FeedPrism hackathon`
4. Click **"Create"**

### Step 3: Explore the Lamatic Studio Interface

Familiarize yourself with the key sections:

```
┌─────────────────────────────────────────────────────────────┐
│                    LAMATIC STUDIO                            │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  📁 Projects │    Main Workspace Area                       │
│              │    - Flows                                   │
│  📊 Flows    │    - Agents                                  │
│              │    - Deployments                             │
│  🤖 Agents   │                                              │
│              │                                              │
│  📦 Context  │                                              │
│  (VectorDB)  │                                              │
│              │                                              │
│  🔧 Jobs     │                                              │
│              │                                              │
│  📈 Logs     │                                              │
│              │                                              │
│  ⚙️ Settings │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

**Key Sections for Our Integration:**
- **Flows:** Where we'll build the Email Intelligence Pipeline
- **Jobs:** For viewing scheduled/triggered job executions
- **Logs:** For debugging and monitoring flow runs

### Step 4: Get API Credentials (For SDK Integration)

1. Go to **Settings** (gear icon or settings link)
2. Navigate to **API Keys** or **Developer** section
3. Click **"Generate API Key"** or **"Create New Key"**
4. Copy and save:
   - **API Key:** `lmtc_xxxxxxxxxxxx`
   - **Project ID:** Found in project settings or URL
   - **Endpoint:** `https://api.lamatic.ai` (or project-specific endpoint)

Store these for later use with the Lamatic SDK:
```javascript
// These will be used if we need SDK integration
const lamaticConfig = {
  apiKey: "lmtc_your_api_key",
  projectId: "your-project-id",
  endpoint: "https://api.lamatic.ai"
};
```

### Step 5: Verify Project Setup

**Account Created:**
- [ ] Lamatic account created and verified
- [ ] Can access Lamatic Studio dashboard

**Project Created:**
- [ ] Project "FeedPrism-Lamatic-Integration" created
- [ ] Can navigate to Flows section
- [ ] Can navigate to Settings section

**API Credentials (Optional but Recommended):**
- [ ] API Key generated and saved
- [ ] Project ID noted
- [ ] Endpoint URL noted

---

## Understanding Lamatic Concepts

### Flows
A **Flow** is a visual workflow that defines how data moves through your AI pipeline. For FeedPrism, our flow will:
1. Trigger on new Gmail message
2. Call FeedPrism API
3. Branch based on content type
4. Send notifications

### Nodes
**Nodes** are the building blocks of flows. We'll use:
- **Gmail Node** (Trigger) - Detect new emails
- **API Node** - Call FeedPrism backend
- **Code Node** - Parse and transform data
- **Branch Node** - Conditional routing
- **Slack Node** - Send notifications

### Deployment
Flows must be **deployed** to run. Lamatic deploys to edge servers for low latency (150ms typical).

---

## Lamatic Free Tier Limits

As of documentation review, Lamatic offers:
- ✅ Visual flow builder access
- ✅ Gmail, Slack, and other app integrations
- ✅ Edge deployment
- ✅ Basic monitoring and logs
- ⚠️ Check current limits at [lamatic.ai/pricing](https://lamatic.ai/pricing)

These limits are sufficient for hackathon demo purposes.

---

## Next Steps

After completing this setup:
1. Proceed to **LAMATIC-003** to create FeedPrism API endpoints
2. Then **LAMATIC-004** for Slack setup (if using notifications)
3. Then **LAMATIC-005** to build the actual flow

---

## Reference Links

- [Lamatic Studio](https://lamatic.ai)
- [Lamatic Documentation](https://lamatic.ai/docs)
- [Lamatic SDK Docs](https://lamatic.ai/docs/sdk)
- [Flow Editor Docs](https://lamatic.ai/docs/flows/editor)
