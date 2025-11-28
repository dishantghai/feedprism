from typing import Dict, List
from collections import Counter
from datetime import datetime, timedelta
from qdrant_client.models import Filter, FieldCondition, Range, DatetimeRange
from app.database.qdrant_client import QdrantService

class AnalyticsService:
    def __init__(self):
        self.qdrant = QdrantService()
    
    def get_email_stats(self, days: int = 30) -> Dict:
        """Get email statistics using Scroll API."""
        
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        stats = {
            "total_items": 0,
            "by_type": Counter(),
            "top_organizers": Counter(),
            "top_providers": Counter(),
            "top_tags": Counter()
        }
        
        # Scroll through all collections
        for content_type in ["events", "courses", "blogs"]:
            collection = self.qdrant.get_collection_name(content_type)
            offset = None
            
            while True:
                # Note: scroll returns (points, next_page_offset)
                batch, offset = self.qdrant.client.scroll(
                    collection_name=collection,
                    scroll_filter=Filter(
                        must=[FieldCondition(
                            key="extracted_at",
                            range=DatetimeRange(gte=cutoff_date)
                        )]
                    ),
                    limit=100,
                    offset=offset,
                    with_payload=True
                )
                
                for point in batch:
                    stats["total_items"] += 1
                    stats["by_type"][content_type] += 1
                    
                    # Analyze payload
                    if content_type == "events":
                        org = point.payload.get("organizer", "Unknown")
                        stats["top_organizers"][org] += 1
                    elif content_type == "courses":
                        prov = point.payload.get("provider", "Unknown")
                        stats["top_providers"][prov] += 1
                    
                    # Tags
                    # Tags might be a list or a single string depending on extraction
                    tags = point.payload.get("tags", [])
                    if isinstance(tags, list):
                        for tag in tags:
                            stats["top_tags"][tag] += 1
                    elif isinstance(tags, str):
                         stats["top_tags"][tags] += 1

                if offset is None:
                    break
        
        return {
            "total_items": stats["total_items"],
            "by_type": dict(stats["by_type"]),
            "top_organizers": dict(stats["top_organizers"].most_common(10)),
            "top_providers": dict(stats["top_providers"].most_common(10)),
            "top_tags": dict(stats["top_tags"].most_common(20)),
            "avg_per_week": stats["total_items"] / (days / 7) if days > 0 else 0
        }
