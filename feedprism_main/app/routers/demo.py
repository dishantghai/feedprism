"""
Demo Mode Router

Provides endpoints for demo mode functionality:
- Check if demo mode is enabled
- Get demo user info
- Demo mode status for frontend
- Toggle demo mode at runtime
- Reset demo state (clear extracted items)
- Get demo emails for extraction
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
from pathlib import Path

from app.services.demo_service import get_demo_service
from app.config import settings

router = APIRouter(prefix="/api/demo", tags=["demo"])

# File to persist demo mode state across restarts
DEMO_STATE_FILE = Path("data/demo_state.json")


def _load_demo_state() -> dict:
    """Load demo state from file, falling back to settings."""
    try:
        if DEMO_STATE_FILE.exists():
            with open(DEMO_STATE_FILE, "r") as f:
                return json.load(f)
    except Exception:
        pass
    
    # Fall back to settings from .env
    return {
        "enabled": settings.demo_mode,
        "user_name": settings.demo_user_name,
        "user_email": settings.demo_user_email
    }


def _save_demo_state(state: dict) -> None:
    """Save demo state to file for persistence."""
    try:
        DEMO_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(DEMO_STATE_FILE, "w") as f:
            json.dump(state, f)
    except Exception as e:
        print(f"Warning: Could not save demo state: {e}")


# Initialize from persisted state or settings
_demo_state = _load_demo_state()
_demo_mode_enabled = _demo_state.get("enabled", False)
_demo_user_name = _demo_state.get("user_name", "Demo User")
_demo_user_email = _demo_state.get("user_email", "demo@feedprism.app")


class DemoStatus(BaseModel):
    """Demo mode status response."""
    enabled: bool
    user_name: str | None = None
    user_email: str | None = None
    message: str


class DemoUser(BaseModel):
    """Demo user information."""
    id: str = "demo-user"
    name: str
    email: str
    picture: str = "https://api.dicebear.com/7.x/avataaars/svg?seed=demo"
    is_demo: bool = True


class DemoToggleRequest(BaseModel):
    """Request to toggle demo mode."""
    enabled: bool


@router.get("/status", response_model=DemoStatus)
async def get_demo_status():
    """
    Check if demo mode is enabled.
    
    Returns:
        DemoStatus with enabled flag and optional user info
    """
    global _demo_mode_enabled
    
    if _demo_mode_enabled:
        return DemoStatus(
            enabled=True,
            user_name=_demo_user_name,
            user_email=_demo_user_email,
            message="Demo mode is active. Using pre-loaded email data."
        )
    else:
        return DemoStatus(
            enabled=False,
            message="Demo mode is disabled. Login required."
        )


@router.post("/toggle", response_model=DemoStatus)
async def toggle_demo_mode(request: DemoToggleRequest):
    """
    Toggle demo mode on/off at runtime.
    Persists the setting to file for survival across restarts.
    
    Args:
        request: DemoToggleRequest with enabled flag
        
    Returns:
        Updated DemoStatus
    """
    global _demo_mode_enabled
    
    _demo_mode_enabled = request.enabled
    
    # Persist the state to file
    _save_demo_state({
        "enabled": _demo_mode_enabled,
        "user_name": _demo_user_name,
        "user_email": _demo_user_email
    })
    
    if _demo_mode_enabled:
        return DemoStatus(
            enabled=True,
            user_name=_demo_user_name,
            user_email=_demo_user_email,
            message="Demo mode enabled. Using pre-loaded email data."
        )
    else:
        return DemoStatus(
            enabled=False,
            message="Demo mode disabled. Login required for full access."
        )


@router.get("/user", response_model=DemoUser)
async def get_demo_user():
    """
    Get demo user information.
    
    Returns:
        DemoUser with demo account details
    """
    global _demo_mode_enabled
    
    if not _demo_mode_enabled:
        return DemoUser(
            name="Guest",
            email="guest@feedprism.app",
            is_demo=False
        )
    
    return DemoUser(
        name=_demo_user_name,
        email=_demo_user_email,
        is_demo=True
    )


@router.get("/config")
async def get_demo_config():
    """
    Get demo configuration for frontend.
    
    Returns:
        Configuration object for frontend demo mode handling
    """
    global _demo_mode_enabled
    
    return {
        "demo_mode": _demo_mode_enabled,
        "features": {
            "login_required": not _demo_mode_enabled,
            "email_sync_enabled": not _demo_mode_enabled,
            "data_source": "pre-loaded" if _demo_mode_enabled else "gmail",
        },
        "user": {
            "name": _demo_user_name if _demo_mode_enabled else None,
            "email": _demo_user_email if _demo_mode_enabled else None,
        },
        "banner": {
            "show": _demo_mode_enabled,
            "text": "🎯 Demo Mode - Exploring pre-loaded newsletter data",
            "type": "info"
        }
    }


@router.post("/reset")
async def reset_demo_state():
    """
    Reset demo state - clear all extracted items and mark emails as unprocessed.
    
    This allows the demo extraction to be run again from scratch.
    
    Returns:
        Reset status with counts
    """
    demo_service = get_demo_service()
    result = demo_service.reset_demo_state()
    return result


@router.get("/emails")
async def get_demo_emails():
    """
    Get pre-defined demo emails for extraction.
    
    Returns:
        List of demo emails with their content
    """
    demo_service = get_demo_service()
    emails = demo_service.get_demo_emails()
    
    return {
        "emails": emails,
        "total": len(emails)
    }


@router.get("/emails/unprocessed")
async def get_unprocessed_demo_emails():
    """
    Get demo emails that haven't been extracted yet.
    
    Returns:
        List of unprocessed demo emails
    """
    demo_service = get_demo_service()
    emails = demo_service.get_unprocessed_demo_emails()
    
    return {
        "emails": [
            {
                "id": e["id"],
                "subject": e["subject"],
                "sender": e["sender"],
                "sender_email": e["sender_email"],
                "snippet": e["snippet"],
                "received_at": e["received_at"]
            }
            for e in emails
        ],
        "unprocessed_count": len(emails),
        "total_demo_emails": len(demo_service.get_demo_emails()),
        "hours_back": 24  # Simulated
    }


@router.post("/emails/mark-extracted")
async def mark_demo_emails_extracted(email_ids: List[str]):
    """
    Mark demo emails as extracted.
    
    Args:
        email_ids: List of email IDs that were extracted
        
    Returns:
        Updated status
    """
    demo_service = get_demo_service()
    demo_service.mark_as_extracted(email_ids)
    
    return {
        "success": True,
        "marked_count": len(email_ids),
        "remaining_unprocessed": len(demo_service.get_unprocessed_demo_emails())
    }


@router.get("/stats")
async def get_demo_stats():
    """
    Get demo mode statistics.
    
    Returns:
        Demo stats including email counts and collection sizes
    """
    demo_service = get_demo_service()
    return demo_service.get_demo_stats()


@router.get("/feed")
async def get_demo_feed(
    page: int = 1,
    page_size: int = 20,
    types: Optional[str] = None
):
    """
    Get demo feed items (pre-defined events, courses, blogs).
    
    This endpoint returns demo data that doesn't require real extraction.
    Used when demo mode is enabled.
    
    Args:
        page: Page number (1-indexed)
        page_size: Items per page
        types: Comma-separated list of types to filter (event,course,blog)
        
    Returns:
        Demo feed items
    """
    demo_service = get_demo_service()
    raw_items = demo_service.get_demo_feed_items()
    
    # Transform items to match FeedItem format expected by frontend
    items = []
    for item in raw_items:
        transformed = {
            **item,
            # Map source_* fields to expected field names
            "email_id": item.get("source_email_id", ""),
            "email_subject": item.get("source_subject", ""),
            "sender": item.get("source_sender", ""),
            "sender_email": item.get("source_sender_email", ""),
            "received_at": item.get("source_received_at", ""),
        }
        # Remove source_* fields to avoid duplication
        for key in ["source_email_id", "source_subject", "source_sender", "source_sender_email", "source_received_at"]:
            transformed.pop(key, None)
        items.append(transformed)
    
    # Filter by types if specified
    if types:
        type_list = [t.strip() for t in types.split(",")]
        items = [item for item in items if item["item_type"] in type_list]
    
    # Paginate
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_items = items[start:end]
    
    return {
        "items": paginated_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": end < total
    }
