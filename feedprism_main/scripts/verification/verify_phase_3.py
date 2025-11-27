import sys
import os
import time
from pathlib import Path
from datetime import datetime, timedelta


# Determine the project root relative to this file (two levels up)
project_root = Path(__file__).resolve().parents[2]  # .../feedprism_main

# Change working directory to the project root so relative paths resolve correctly
os.chdir(project_root)

# Ensure the project root is on the import path
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from app.database.qdrant_client import QdrantService
from app.services.embedder import EmbeddingService
from app.utils.sparse_vector import create_sparse_vector
from qdrant_client.models import PointStruct, SparseVector

def verify_phase_3():
    print("🚀 Starting Phase 3 Verification...")
    
    # 1. Initialize Services
    qdrant = QdrantService()
    embedder = EmbeddingService()
    
    # 2. Recreate Collections (to enable sparse vectors)
    print("\n📦 Recreating collections with sparse vector support...")
    qdrant.create_all_collections(recreate=True)
    
    # 3. Prepare Test Data
    print("\n📝 Preparing test data...")
    
    # Events
    events = [
        {
            "text": "Machine Learning Workshop: Deep Dive into Transformers",
            "type": "event",
            "date": (datetime.now() + timedelta(days=5)).isoformat(),
            "tags": ["ai", "ml", "workshop"]
        },
        {
            "text": "Web Development Bootcamp: React and Node.js",
            "type": "event",
            "date": (datetime.now() + timedelta(days=15)).isoformat(),
            "tags": ["web", "javascript", "bootcamp"]
        },
        {
            "text": "Data Science Conference 2025",
            "type": "event",
            "date": (datetime.now() + timedelta(days=45)).isoformat(),
            "tags": ["data", "science", "conference"]
        }
    ]
    
    # Blogs
    blogs = [
        {
            "text": "Understanding Sparse Vectors in Qdrant",
            "type": "blog",
            "date": (datetime.now() - timedelta(days=2)).isoformat(),
            "tags": ["qdrant", "vector-db", "tutorial"]
        },
        {
            "text": "The Future of AI Agents",
            "type": "blog",
            "date": (datetime.now() - timedelta(days=10)).isoformat(),
            "tags": ["ai", "agents", "future"]
        }
    ]
    
    all_items = events + blogs
    points = []
    
    for i, item in enumerate(all_items):
        # Generate Dense Vector
        dense_vec = embedder.embed_text(item["text"])
        
        # Generate Sparse Vector
        sparse_vec_dict = create_sparse_vector(item["text"])
        sparse_vec = SparseVector(**sparse_vec_dict)
        
        # Create Point
        # Note: Using dictionary for mixed vectors. "" is the default dense vector.
        vector = {
            "": dense_vec,
            "keywords": sparse_vec
        }
        
        # Convert date to timestamp for Range filtering
        date_timestamp = datetime.fromisoformat(item["date"]).timestamp()
        
        point = PointStruct(
            id=i + 1,
            vector=vector,
            payload={
                "content_type": item["type"],
                "title": item["text"],
                "start_date": date_timestamp,  # Store as timestamp (float)
                "start_date_iso": item["date"],  # Keep ISO for display
                "tags": item["tags"]
            }
        )
        points.append(point)
        
    # 4. Upsert Data
    print(f"\n📤 Upserting {len(points)} points...")
    
    events_points = [p for p in points if p.payload["content_type"] == "event"]
    blogs_points = [p for p in points if p.payload["content_type"] == "blog"]
    
    if events_points:
        qdrant.upsert_by_type("events", events_points)
    if blogs_points:
        qdrant.upsert_by_type("blogs", blogs_points)
    
    # Wait for indexing
    time.sleep(2)
    
    # 5. Test Search Methods
    print("\n🔍 Testing Search Methods...")
    
    query = "machine learning"
    query_vec = embedder.embed_text(query)
    
    # Test 5.1: Hybrid Search (Events)
    print(f"\n--- Hybrid Search for '{query}' (Events) ---")
    results = qdrant.hybrid_search(query_vec, query, content_type="events", limit=3)
    for res in results:
        print(f"  - [{res['payload']['content_type']}] {res['payload']['title']}")
        
    if not results:
        print("  ❌ No results found!")
    else:
        print("  ✅ Hybrid search working")

    # Test 5.2: Filtered Search (Upcoming Events)
    print(f"\n--- Upcoming Events (Next 30 days) ---")
    events_results = qdrant.search_upcoming_events(query_vec, days_ahead=30, limit=3)
    for res in events_results:
        print(f"  - [{res['payload']['start_date_iso']}] {res['payload']['title']}")
        
    if len(events_results) == 2: # Should match ML Workshop and Web Dev Bootcamp
        print("  ✅ Upcoming events filter working (Found 2)")
    else:
        print(f"  ⚠️ Expected 2 events, found {len(events_results)}")

    # Test 5.3: Filtered Search (Recent Blogs)
    print(f"\n--- Recent Blogs (Last 7 days) ---")
    blogs_results = qdrant.search_recent_blogs(query_vec, days_back=7, limit=3)
    for res in blogs_results:
        print(f"  - [{res['payload']['start_date_iso']}] {res['payload']['title']}")
        
    if len(blogs_results) == 1: # Should match "Understanding Sparse Vectors"
        print("  ✅ Recent blogs filter working (Found 1)")
    else:
        print(f"  ⚠️ Expected 1 blog, found {len(blogs_results)}")

    print("\n🎉 Phase 3 Verification Complete!")

if __name__ == "__main__":
    verify_phase_3()
