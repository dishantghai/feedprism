from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.services.recommender import RecommendationService
from app.services.analytics import AnalyticsService
from app.routers import feed_router, emails_router, search_router, metrics_router
from app.routers.pipeline import router as pipeline_router
from app.routers.demo import router as demo_router, _demo_mode_enabled
from app.config import settings

# Log demo mode status on startup
print(f"🎯 Demo Mode: {'ENABLED' if _demo_mode_enabled else 'DISABLED'}")
print(f"   (from .env: {settings.demo_mode}, runtime: {_demo_mode_enabled})")

app = FastAPI(
    title="FeedPrism API",
    description="Email intelligence API for extracting and organizing content",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*",  # Allow all origins for hackathon demo (production: restrict this)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(feed_router)
app.include_router(emails_router)
app.include_router(search_router)
app.include_router(metrics_router)
app.include_router(pipeline_router)
app.include_router(demo_router)

# Initialize services
# We initialize them here to be reused across requests
recommender = RecommendationService()
analytics = AnalyticsService()

@app.get("/")
async def root():
    # Import here to get current runtime state
    from app.routers.demo import _demo_mode_enabled as current_demo_mode
    return {
        "message": "Welcome to FeedPrism API",
        "docs": "/docs",
        "demo_mode": current_demo_mode
    }

@app.get("/api/recommendations/{item_id}")
async def get_recommendations(item_id: str, content_type: str, limit: int = 5):
    """Get recommended items similar to given item."""
    try:
        recommendations = recommender.discover_similar(item_id, content_type, limit)
        return {"recommendations": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics")
async def get_analytics(days: int = 30):
    """Get email statistics."""
    try:
        stats = analytics.get_email_stats(days)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
