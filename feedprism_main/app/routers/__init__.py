"""API Routers for FeedPrism."""

from .feed import router as feed_router
from .emails import router as emails_router
from .search import router as search_router
from .metrics import router as metrics_router

__all__ = ["feed_router", "emails_router", "search_router", "metrics_router"]
