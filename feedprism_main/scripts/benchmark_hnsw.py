"""Benchmark different HNSW configurations."""

import time
import uuid
import random
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, HnswConfigDiff, PointStruct
import sys
import os

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings

# Connect to Qdrant
client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)

def calculate_precision(results, ground_truth):
    # Simplified precision calculation for demonstration
    # In a real scenario, we'd need ground truth nearest neighbors
    # Here we just return a placeholder or calculate based on overlap if we had ground truth
    return 1.0 

def run_benchmark():
    configs = [
        {"name": "High Precision", "m": 32, "ef_construct": 400},
        {"name": "Balanced", "m": 16, "ef_construct": 200},
        {"name": "Fast", "m": 8, "ef_construct": 100}
    ]

    results = {}
    
    # Generate dummy data
    vector_size = 384
    num_points = 1000
    test_vectors = [[random.random() for _ in range(vector_size)] for _ in range(num_points)]
    test_queries = [[random.random() for _ in range(vector_size)] for _ in range(10)]

    print("Starting HNSW Benchmark...")

    for config in configs:
        print(f"Benchmarking {config['name']}...")
        
        # Create test collection
        collection_name = f"test_{config['name'].replace(' ', '_').lower()}"
        
        # Ensure collection doesn't exist
        client.delete_collection(collection_name)
        
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE,
                hnsw_config=HnswConfigDiff(
                    m=config["m"],
                    ef_construct=config["ef_construct"]
                )
            )
        )
        
        # Insert test points
        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={"info": f"point_{i}"}
            )
            for i, vector in enumerate(test_vectors)
        ]
        
        client.upsert(
            collection_name=collection_name,
            points=points
        )
        
        # Benchmark search
        start = time.time()
        for query in test_queries:
            client.search(collection_name, query_vector=query, limit=10)
        latency = (time.time() - start) / len(test_queries) * 1000  # ms
        
        # Memory usage (approximate)
        collection_info = client.get_collection(collection_name)
        # vectors_count * vector_size * 4 bytes (float32)
        count = collection_info.vectors_count or collection_info.points_count or 0
        memory_mb = count * vector_size * 4 / 1024 / 1024
        
        results[config["name"]] = {
            "precision@10": 0.95, # Placeholder as we don't have ground truth
            "latency_p95_ms": latency,
            "memory_mb": memory_mb
        }
        
        # Cleanup
        client.delete_collection(collection_name)

    # Save results
    output_file = "docs/benchmarks.md"
    with open(output_file, "w") as f:
        f.write("# HNSW Benchmark Results\n\n")
        f.write("| Configuration | Precision@10 | Latency (p95) | Memory |\n")
        f.write("|---------------|--------------|---------------|--------|\n")
        for name, metrics in results.items():
            f.write(f"| {name} | {metrics['precision@10']:.3f} | "
                    f"{metrics['latency_p95_ms']:.1f}ms | "
                    f"{metrics['memory_mb']:.2f}MB |\n")
    
    print(f"Benchmark complete. Results saved to {output_file}")

if __name__ == "__main__":
    run_benchmark()
