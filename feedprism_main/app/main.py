from fastapi import FastAPI, HTTPException
from app.services.recommender import RecommendationService
from app.services.analytics import AnalyticsService

app = FastAPI(title="FeedPrism API")

# Initialize services
# We initialize them here to be reused across requests
recommender = RecommendationService()
analytics = AnalyticsService()

@app.get("/")
async def root():
    return {"message": "Welcome to FeedPrism API"}

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
