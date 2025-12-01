# LAMATIC-003: Create Lamatic Bridge Service

**Story ID:** LAMATIC-003  
**Type:** Backend/Service  
**Priority:** P0 (Critical)  
**Estimate:** 45 minutes  
**Status:** To Do  
**Depends On:** LAMATIC-000 (Idempotency Check)

---

## Overview

Create a standalone FastAPI service (`lamatic_bridge/`) that acts as the intermediary between Lamatic's webhook and the FeedPrism backend. This service receives email payloads from Lamatic, optionally checks for duplicates, and forwards them to FeedPrism for processing.

**Why a Bridge Service?**
- **Zero Impact:** FeedPrism backend remains untouched
- **Isolation:** Can be developed, tested, and deployed independently
- **Flexibility:** Easy to add Lamatic-specific logic without polluting FeedPrism
- **Rollback:** Simply remove the service if needed

---

## Implementation Steps

### Step 1: Create Project Structure

Create a new folder `lamatic_bridge/` at the repository root:

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack
mkdir -p lamatic_bridge
cd lamatic_bridge
```

### Step 2: Create `requirements.txt`

Create `lamatic_bridge/requirements.txt`:

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
httpx==0.25.1
python-dotenv==1.0.0
loguru==0.7.2
qdrant-client==1.7.0
```

### Step 3: Create `.env` Template

Create `lamatic_bridge/.env.example`:

```bash
# FeedPrism Backend URL (adjust for your deployment)
FEEDPRISM_URL=http://localhost:8000

# Qdrant Connection (for idempotency check)
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_API_KEY=

# Bridge Service Port
BRIDGE_PORT=8001
```

Copy to `.env`:
```bash
cp .env.example .env
```

### Step 4: Create Main Service File

Create `lamatic_bridge/main.py`:

```python
"""
Lamatic Bridge Service

Receives webhooks from Lamatic and forwards to FeedPrism with idempotency check.
"""

import os
import sys
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import httpx
from loguru import logger
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add FeedPrism to path for QdrantService import
feedprism_path = Path(__file__).parent.parent / "feedprism_main"
sys.path.append(str(feedprism_path))

from app.database.qdrant_client import QdrantService

# Initialize FastAPI
app = FastAPI(
    title="Lamatic Bridge Service",
    description="Receives Lamatic webhooks and forwards to FeedPrism",
    version="1.0.0"
)

# Configuration
FEEDPRISM_URL = os.getenv("FEEDPRISM_URL", "http://localhost:8000")
BRIDGE_PORT = int(os.getenv("BRIDGE_PORT", "8001"))

# Initialize Qdrant (for idempotency check)
try:
    qdrant = QdrantService()
    logger.success("Qdrant client initialized")
except Exception as e:
    logger.warning(f"Qdrant initialization failed: {e}")
    qdrant = None


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Lamatic Bridge",
        "status": "running",
        "feedprism_url": FEEDPRISM_URL,
        "qdrant_connected": qdrant is not None
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "bridge": "healthy",
        "feedprism": await check_feedprism_health(),
        "qdrant": qdrant is not None
    }


async def check_feedprism_health() -> bool:
    """Check if FeedPrism backend is reachable"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{FEEDPRISM_URL}/", timeout=5.0)
            return resp.status_code == 200
    except Exception:
        return False


@app.post("/receive")
async def receive_webhook(request: Request):
    """
    Receive email webhook from Lamatic.
    
    Expected payload:
    {
        "email_id": "gmail_message_id",
        "subject": "Email subject",
        "from": "sender@example.com",
        "body_html": "<html>...",
        "body_text": "..."
    }
    """
    try:
        payload = await request.json()
        email_id = payload.get("email_id")
        
        if not email_id:
            raise HTTPException(status_code=400, detail="email_id is required")
        
        logger.info(f"Received webhook for email: {email_id}")
        
        # Check idempotency (skip if already processed)
        if qdrant and qdrant.is_email_processed(email_id):
            logger.info(f"Email {email_id} already processed, skipping")
            return JSONResponse({
                "status": "skipped",
                "reason": "already_processed",
                "email_id": email_id
            })
        
        # Forward to FeedPrism
        logger.info(f"Forwarding email {email_id} to FeedPrism")
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{FEEDPRISM_URL}/api/lamatic/bridge",
                json=payload,
                timeout=30.0  # Allow time for extraction
            )
            resp.raise_for_status()
            result = resp.json()
        
        logger.success(f"Successfully processed email {email_id}")
        return JSONResponse(result)
        
    except httpx.HTTPStatusError as e:
        logger.error(f"FeedPrism returned error: {e.response.status_code}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"FeedPrism error: {e.response.text}"
        )
    except Exception as e:
        logger.exception(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=BRIDGE_PORT)
```

### Step 5: Create Dockerfile

Create `lamatic_bridge/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY main.py .
COPY .env .

# Expose port
EXPOSE 8001

# Run service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Step 6: Create Docker Compose Entry

Add to project root `docker-compose.yml` (or create if it doesn't exist):

```yaml
services:
  lamatic-bridge:
    build:
      context: ./lamatic_bridge
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      - FEEDPRISM_URL=http://feedprism-backend:8000
      - QDRANT_HOST=qdrant
      - QDRANT_PORT=6333
    depends_on:
      - feedprism-backend
      - qdrant
```

### Step 7: Test Locally

```bash
# Navigate to bridge folder
cd lamatic_bridge

# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

Visit `http://localhost:8001` to see the health check.

---

## Acceptance Criteria

### Functional
- [x] Bridge service runs on port 8001
- [ ] `/receive` endpoint accepts JSON payloads
- [ ] Idempotency check works (calls `qdrant.is_email_processed()`)
- [ ] Forwards new emails to FeedPrism `/api/lamatic/bridge`
- [ ] Returns appropriate responses (200 for success, 400 for bad requests)

### Technical
- [ ] Service starts without errors
- [ ] Health check endpoint (`/`) returns status
- [ ] Docker image builds successfully
- [ ] Logs show clear request/response flow

---

## Testing

Test the bridge service with `curl`:

```bash
# Health check
curl http://localhost:8001/health

# Send test email
curl -X POST http://localhost:8001/receive \
  -H "Content-Type: application/json" \
  -d '{
    "email_id": "test_email_123",
    "subject": "Test Email",
    "from": "test@example.com",
    "body_html": "<p>Test content</p>",
    "body_text": "Test content"
  }'
```

---

## Next Steps

After completing this story:
1. Proceed to **LAMATIC-004** to add the minimal router to FeedPrism
2. Then **LAMATIC-005** to configure Lamatic flow to call this bridge

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8001 already in use | Change `BRIDGE_PORT` in `.env` |
| Qdrant connection fails | Ensure Qdrant is running on port 6333 |
| FeedPrism unreachable | Update `FEEDPRISM_URL` in `.env` |
| ImportError for QdrantService | Ensure `feedprism_main` is in parent directory |
