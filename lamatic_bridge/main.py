"""
Lamatic Bridge Service

Receives webhooks from Lamatic and forwards to FeedPrism.
Idempotency is handled by FeedPrism backend.
"""

import os
from typing import Optional

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
from loguru import logger
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(
    title="Lamatic Bridge Service",
    description="Receives Lamatic webhooks and forwards to FeedPrism",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
FEEDPRISM_URL = os.getenv("FEEDPRISM_URL", "http://localhost:8000")
BRIDGE_PORT = int(os.getenv("BRIDGE_PORT", "8001"))


class EmailPayload(BaseModel):
    """Expected payload from Lamatic webhook."""
    email_id: str
    subject: Optional[str] = None
    sender: Optional[str] = None  # 'from' is reserved in Python
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    received_at: Optional[str] = None


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "Lamatic Bridge",
        "status": "running",
        "feedprism_url": FEEDPRISM_URL
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    feedprism_healthy = await check_feedprism_health()
    
    return {
        "bridge": "healthy",
        "feedprism": feedprism_healthy,
        "feedprism_url": FEEDPRISM_URL
    }


async def check_feedprism_health() -> bool:
    """Check if FeedPrism backend is reachable."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{FEEDPRISM_URL}/", timeout=5.0)
            return resp.status_code == 200
    except Exception as e:
        logger.warning(f"FeedPrism health check failed: {e}")
        return False


@app.post("/receive")
async def receive_webhook(payload: EmailPayload):
    """
    Receive email webhook from Lamatic.
    
    Flow:
    1. Forward to FeedPrism /api/lamatic/bridge
    2. FeedPrism handles idempotency check internally
    3. Return extraction results to Lamatic
    """
    email_id = payload.email_id
    
    if not email_id:
        raise HTTPException(status_code=400, detail="email_id is required")
    
    logger.info(f"Received webhook for email: {email_id}")
    logger.info(f"Forwarding email {email_id} to FeedPrism")
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{FEEDPRISM_URL}/api/lamatic/bridge",
                json=payload.model_dump(),
                timeout=60.0  # Allow time for extraction
            )
            resp.raise_for_status()
            result = resp.json()
        
        logger.success(f"Successfully processed email {email_id}")
        return JSONResponse(result)
        
    except httpx.HTTPStatusError as e:
        logger.error(f"FeedPrism returned error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"FeedPrism error: {e.response.text}"
        )
    except httpx.ConnectError as e:
        logger.error(f"Cannot connect to FeedPrism at {FEEDPRISM_URL}: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to FeedPrism at {FEEDPRISM_URL}"
        )
    except Exception as e:
        logger.exception(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/test")
async def test_endpoint(request: Request):
    """
    Test endpoint to verify the bridge is receiving data correctly.
    Echoes back the received payload without forwarding to FeedPrism.
    """
    try:
        payload = await request.json()
        logger.info(f"Test endpoint received: {payload}")
        return {
            "status": "received",
            "payload": payload,
            "message": "Test successful - payload received but not forwarded"
        }
    except Exception as e:
        logger.error(f"Test endpoint error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Lamatic Bridge on port {BRIDGE_PORT}")
    logger.info(f"FeedPrism URL: {FEEDPRISM_URL}")
    uvicorn.run(app, host="0.0.0.0", port=BRIDGE_PORT)
