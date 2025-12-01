# LAMATIC-003: FeedPrism Lamatic API Router

**Story ID:** LAMATIC-003  
**Type:** Backend Development  
**Priority:** P0 (Blocker)  
**Estimate:** 45 minutes  
**Status:** To Do  
**Depends On:** None (can be done in parallel with LAMATIC-001, LAMATIC-002)

---

## Overview

Create a dedicated API router in FeedPrism backend to handle requests from Lamatic flows. This includes:
1. Single email ingestion endpoint (for real-time processing)
2. Actions query endpoint (for reminder flows)
3. Webhook endpoint for event notifications (for calendar creation)

---

## Technical Requirements

### Endpoint 1: Ingest Single Email

**Purpose:** Called by Lamatic when Gmail trigger detects new email

```
POST /api/lamatic/ingest
Content-Type: application/json
```

**Request Body (from Lamatic Gmail Node output):**
```json
{
  "emailId": "msg_abc123def456",
  "from": "newsletter@aiweekly.com",
  "to": "user@example.com",
  "subject": "AI Weekly: Top Stories This Week",
  "body": "<html>...email HTML content...</html>",
  "timestamp": "2025-12-01T10:30:00Z",
  "labels": ["INBOX", "UNREAD"],
  "attachments": []
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Email processed successfully",
  "data": {
    "email_id": "msg_abc123def456",
    "items_extracted": 5,
    "content_summary": {
      "events": 2,
      "courses": 1,
      "blogs": 2,
      "actions": 1
    },
    "events": [
      {
        "id": "evt_uuid_123",
        "title": "AI Summit 2024",
        "start_time": "2025-12-15T09:00:00Z",
        "end_time": "2025-12-15T17:00:00Z",
        "location": "San Francisco, CA",
        "description": "Annual AI conference...",
        "registration_url": "https://aisummit.com/register"
      }
    ],
    "actions": [
      {
        "id": "act_uuid_456",
        "type": "register",
        "title": "Register for AI Summit",
        "deadline": "2025-12-10T23:59:59Z",
        "url": "https://aisummit.com/register"
      }
    ],
    "has_events": true,
    "has_actions": true
  }
}
```

### Endpoint 2: Get Pending Actions

**Purpose:** Called by scheduled Lamatic job to get upcoming action reminders

```
GET /api/lamatic/actions?due_within_hours=48&status=pending
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "actions": [
      {
        "id": "act_uuid_456",
        "type": "register",
        "title": "Register for AI Summit",
        "deadline": "2025-12-10T23:59:59Z",
        "url": "https://aisummit.com/register",
        "source_email_subject": "AI Weekly: Top Stories",
        "source_sender": "newsletter@aiweekly.com",
        "hours_until_deadline": 24
      }
    ],
    "count": 1
  }
}
```

### Endpoint 3: Webhook for External Notifications (Optional)

**Purpose:** Receive webhook calls from Lamatic for bidirectional communication

```
POST /api/lamatic/webhook
Content-Type: application/json
```

---

## Implementation

### File: `feedprism_main/app/routers/lamatic.py`

```python
"""
Lamatic Integration Router

Provides API endpoints for Lamatic flow integration:
- Real-time email ingestion from Gmail triggers
- Pending actions for reminder flows
- Webhook handling for bidirectional communication
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import logging

# Import existing extraction and storage modules
# from app.services.extraction import extract_content_from_email
# from app.services.qdrant import store_extracted_content
# from app.services.actions import get_pending_actions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lamatic", tags=["lamatic"])


# ============== Pydantic Models ==============

class LamaticEmailInput(BaseModel):
    """
    Input model matching Lamatic Gmail Node output schema.
    See: https://lamatic.ai/docs/nodes/apps/gmail-node#output
    """
    emailId: str = Field(..., description="Gmail message ID")
    from_address: str = Field(..., alias="from", description="Sender email")
    to: str = Field(..., description="Recipient email")
    subject: str = Field(..., description="Email subject line")
    body: str = Field(..., description="Email body content (HTML)")
    timestamp: str = Field(..., description="Email timestamp ISO format")
    labels: List[str] = Field(default_factory=list, description="Gmail labels")
    attachments: List[dict] = Field(default_factory=list, description="Attachments")
    
    class Config:
        populate_by_name = True


class ExtractedEvent(BaseModel):
    """Event extracted from email"""
    id: str
    title: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    registration_url: Optional[str] = None


class ExtractedAction(BaseModel):
    """Action item extracted from email"""
    id: str
    type: str  # register, rsvp, submit, deadline
    title: str
    deadline: Optional[str] = None
    url: Optional[str] = None


class IngestResponse(BaseModel):
    """Response for email ingestion"""
    status: str
    message: str
    data: dict


class ActionsResponse(BaseModel):
    """Response for actions query"""
    status: str
    data: dict


# ============== Endpoints ==============

@router.post("/ingest", response_model=IngestResponse)
async def ingest_email_from_lamatic(
    email: LamaticEmailInput,
    background_tasks: BackgroundTasks
):
    """
    Process a single email from Lamatic Gmail trigger.
    
    This endpoint is called by Lamatic's API Node when the Gmail 
    trigger detects a new email. It:
    1. Parses the email content
    2. Extracts events, courses, blogs, and actions
    3. Stores in Qdrant
    4. Returns structured data for Lamatic branching logic
    """
    logger.info(f"Received email from Lamatic: {email.subject} from {email.from_address}")
    
    try:
        # TODO: Integrate with existing extraction pipeline
        # result = await extract_content_from_email(
        #     email_id=email.emailId,
        #     from_email=email.from_address,
        #     subject=email.subject,
        #     body_html=email.body,
        #     received_at=email.timestamp
        # )
        
        # For now, return mock response structure
        # Replace with actual extraction logic
        
        mock_events = [
            ExtractedEvent(
                id=f"evt_{email.emailId[:8]}",
                title="Extracted Event Title",
                start_time="2025-12-15T09:00:00Z",
                end_time="2025-12-15T17:00:00Z",
                location="San Francisco, CA",
                description="Event description extracted from email",
                registration_url="https://example.com/register"
            )
        ]
        
        mock_actions = [
            ExtractedAction(
                id=f"act_{email.emailId[:8]}",
                type="register",
                title="Register for event",
                deadline="2025-12-10T23:59:59Z",
                url="https://example.com/register"
            )
        ]
        
        response_data = {
            "email_id": email.emailId,
            "items_extracted": len(mock_events) + len(mock_actions),
            "content_summary": {
                "events": len(mock_events),
                "courses": 0,
                "blogs": 0,
                "actions": len(mock_actions)
            },
            "events": [e.dict() for e in mock_events],
            "actions": [a.dict() for a in mock_actions],
            "has_events": len(mock_events) > 0,
            "has_actions": len(mock_actions) > 0
        }
        
        logger.info(f"Extracted {response_data['items_extracted']} items from email")
        
        return IngestResponse(
            status="success",
            message="Email processed successfully",
            data=response_data
        )
        
    except Exception as e:
        logger.error(f"Error processing email: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process email: {str(e)}"
        )


@router.get("/actions", response_model=ActionsResponse)
async def get_pending_actions_for_lamatic(
    due_within_hours: int = 48,
    status: str = "pending"
):
    """
    Get pending action items with upcoming deadlines.
    
    Called by Lamatic scheduled job for reminder flows.
    Returns actions that are due within the specified hours.
    """
    logger.info(f"Fetching actions due within {due_within_hours} hours")
    
    try:
        # TODO: Integrate with actual Qdrant query
        # actions = await get_actions_from_qdrant(
        #     due_within_hours=due_within_hours,
        #     status=status
        # )
        
        # Mock response
        now = datetime.utcnow()
        deadline = now + timedelta(hours=24)
        
        mock_actions = [
            {
                "id": "act_mock_001",
                "type": "register",
                "title": "Register for AI Summit",
                "deadline": deadline.isoformat() + "Z",
                "url": "https://aisummit.com/register",
                "source_email_subject": "AI Weekly Newsletter",
                "source_sender": "newsletter@aiweekly.com",
                "hours_until_deadline": 24
            }
        ]
        
        return ActionsResponse(
            status="success",
            data={
                "actions": mock_actions,
                "count": len(mock_actions)
            }
        )
        
    except Exception as e:
        logger.error(f"Error fetching actions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch actions: {str(e)}"
        )


@router.post("/webhook")
async def handle_lamatic_webhook(payload: dict):
    """
    Handle incoming webhooks from Lamatic flows.
    
    This can be used for bidirectional communication,
    such as receiving confirmations or triggering actions.
    """
    logger.info(f"Received webhook from Lamatic: {payload}")
    
    # Process webhook based on event type
    event_type = payload.get("event_type", "unknown")
    
    return {
        "status": "received",
        "event_type": event_type,
        "message": "Webhook processed"
    }


@router.get("/health")
async def lamatic_health_check():
    """
    Health check endpoint for Lamatic to verify connectivity.
    """
    return {
        "status": "healthy",
        "service": "feedprism-lamatic-integration",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
```

---

## Integration with Main App

### Update `feedprism_main/app/main.py`:

```python
# Add import
from app.routers import lamatic

# Add router
app.include_router(lamatic.router)
```

---

## Testing

### Test with curl:

```bash
# Health check
curl http://localhost:8000/api/lamatic/health

# Test ingest endpoint
curl -X POST http://localhost:8000/api/lamatic/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "emailId": "test_email_123",
    "from": "newsletter@test.com",
    "to": "user@example.com",
    "subject": "Test Newsletter",
    "body": "<html><body>Test content</body></html>",
    "timestamp": "2025-12-01T10:30:00Z",
    "labels": ["INBOX"],
    "attachments": []
  }'

# Test actions endpoint
curl "http://localhost:8000/api/lamatic/actions?due_within_hours=48"
```

---

## Public Accessibility for Lamatic

Lamatic needs to reach your FeedPrism API. Options:

### Option 1: Deploy to Cloud (Recommended for Demo)
If FeedPrism is deployed (Railway, Render, etc.), use the public URL.

### Option 2: Use ngrok for Local Development
```bash
# Install ngrok
brew install ngrok

# Start tunnel
ngrok http 8000

# Use the https URL provided (e.g., https://abc123.ngrok.io)
```

Save the ngrok URL - you'll use it in the Lamatic API Node configuration.

---

## Acceptance Criteria

- [ ] `/api/lamatic/ingest` endpoint accepts Lamatic Gmail Node output format
- [ ] `/api/lamatic/actions` endpoint returns pending actions
- [ ] `/api/lamatic/health` endpoint returns healthy status
- [ ] Endpoints are publicly accessible (via deployment or ngrok)
- [ ] Error handling returns proper HTTP status codes
- [ ] Logging captures incoming requests

---

## Next Steps

After completing this:
1. Test endpoints locally with curl
2. Set up public accessibility (ngrok or deploy)
3. Proceed to **LAMATIC-004** (Slack setup) or **LAMATIC-005** (build flow)
