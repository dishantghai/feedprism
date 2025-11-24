<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# FEEDPRISM IMPLEMENTATION GUIDE (CONTINUED)

## 7. DAY 5: METRICS, BENCHMARKING \& EVALUATION

**Goal:** Implement comprehensive evaluation metrics (Precision@k, MRR, latency), create a benchmark dataset with manual labels, and build an evaluation pipeline to measure system performance.

**Estimated Time:** 7-9 hours

### 7.1 Understanding Information Retrieval Metrics (Theory)

**Why Metrics Matter:**

Without quantitative evaluation, you can't:

- Prove your system works better than baselines
- Identify weak points (false positives, missed results)
- Justify hybrid search over pure semantic/keyword
- Demonstrate improvement to judges

**Key Metrics for FeedPrism:**


| Metric | What It Measures | Why It Matters |
| :-- | :-- | :-- |
| **Precision@k** | Relevance of top-k results | User sees top 5-10 results, not all 100 |
| **Recall@k** | Coverage of relevant items in top-k | Did we miss important results? |
| **MRR** | Average rank of first relevant result | Users scan from top, first hit matters |
| **NDCG@k** | Graded relevance (not just binary) | Some results are "more relevant" than others |
| **Latency** | Query response time | UX requirement (<500ms ideal) |

**Formulas:**

```python
# Precision@k
# = (# relevant results in top-k) / k
# Example: 7 relevant out of top-10 = 0.70

# Recall@k
# = (# relevant in top-k) / (total relevant in dataset)
# Example: Found 7 out of 10 total relevant = 0.70

# Mean Reciprocal Rank (MRR)
# = Average of (1 / rank_of_first_relevant)
# Example: First relevant at rank 3 → 1/3 = 0.333
# Average across 10 queries → MRR = 0.65

# NDCG@k (Normalized Discounted Cumulative Gain)
# Accounts for graded relevance (0=irrelevant, 1=somewhat, 2=very relevant)
# DCG@k = Σ (relevance_i / log2(i+1)) for i=1 to k
# NDCG@k = DCG@k / IDCG@k (normalized by ideal DCG)
```

**Benchmark Dataset Structure:**

```json
{
  "queries": [
    {
      "query_id": "q001",
      "query": "upcoming AI workshops in India",
      "relevant_entity_ids": [
        "event_email123_0",  // Highly relevant
        "event_email456_1"   // Somewhat relevant
      ],
      "relevance_scores": {
        "event_email123_0": 2,  // 2 = highly relevant
        "event_email456_1": 1   // 1 = somewhat relevant
      },
      "notes": "User looking for future AI events in India"
    }
  ]
}
```


### 7.2 Metrics Implementation

**Create `app/utils/metrics.py`:**

```python
"""
Information Retrieval Metrics

This module implements standard IR metrics for evaluating search quality:
- Precision@k, Recall@k
- Mean Reciprocal Rank (MRR)
- Normalized Discounted Cumulative Gain (NDCG@k)
- Mean Average Precision (MAP)
- Latency measurements

Theory:
- Binary relevance: relevant (1) or not (0)
- Graded relevance: scale of 0-2 (0=irrelevant, 1=somewhat, 2=highly)
- Ranking matters: top results weighted more heavily

Author: FeedPrism Team
Date: Nov 2025
"""

from typing import List, Dict, Set, Any, Tuple
import math
from collections import defaultdict

from loguru import logger


class IRMetrics:
    """
    Information Retrieval metrics calculator.
    
    Supports:
    - Binary relevance (relevant/not relevant)
    - Graded relevance (0-2 scale)
    - Multiple metrics per query
    - Aggregation across queries
    """
    
    @staticmethod
    def precision_at_k(
        retrieved: List[str],
        relevant: Set[str],
        k: int
    ) -> float:
        """
        Calculate Precision@k.
        
        Precision@k = (# relevant items in top-k) / k
        
        Args:
            retrieved: List of retrieved entity IDs (ranked order)
            relevant: Set of relevant entity IDs (ground truth)
            k: Number of top results to consider
        
        Returns:
            Precision@k score (0.0 to 1.0)
        
        Example:
            >>> retrieved = ["e1", "e2", "e3", "e4", "e5"]
            >>> relevant = {"e1", "e3", "e5", "e7"}
            >>> precision_at_k(retrieved, relevant, k=5)
            0.6  # 3 out of 5 are relevant
        """
        if k == 0 or not retrieved:
            return 0.0
        
        top_k = retrieved[:k]
        relevant_in_topk = sum(1 for item in top_k if item in relevant)
        
        return relevant_in_topk / k
    
    @staticmethod
    def recall_at_k(
        retrieved: List[str],
        relevant: Set[str],
        k: int
    ) -> float:
        """
        Calculate Recall@k.
        
        Recall@k = (# relevant in top-k) / (total # relevant)
        
        Args:
            retrieved: List of retrieved entity IDs
            relevant: Set of relevant entity IDs
            k: Number of top results to consider
        
        Returns:
            Recall@k score (0.0 to 1.0)
        
        Example:
            >>> retrieved = ["e1", "e2", "e3", "e4", "e5"]
            >>> relevant = {"e1", "e3", "e5", "e7"}  # 4 total relevant
            >>> recall_at_k(retrieved, relevant, k=5)
            0.75  # Found 3 out of 4 relevant
        """
        if not relevant or not retrieved:
            return 0.0
        
        top_k = retrieved[:k]
        relevant_in_topk = sum(1 for item in top_k if item in relevant)
        
        return relevant_in_topk / len(relevant)
    
    @staticmethod
    def reciprocal_rank(
        retrieved: List[str],
        relevant: Set[str]
    ) -> float:
        """
        Calculate Reciprocal Rank (RR).
        
        RR = 1 / (rank of first relevant item)
        If no relevant item found, RR = 0
        
        Args:
            retrieved: List of retrieved entity IDs
            relevant: Set of relevant entity IDs
        
        Returns:
            Reciprocal rank (0.0 to 1.0)
        
        Example:
            >>> retrieved = ["e1", "e2", "e3", "e4"]
            >>> relevant = {"e3", "e5"}
            >>> reciprocal_rank(retrieved, relevant)
            0.333  # First relevant at rank 3 → 1/3
        """
        for rank, item in enumerate(retrieved, start=1):
            if item in relevant:
                return 1.0 / rank
        
        return 0.0  # No relevant items found
    
    @staticmethod
    def mean_reciprocal_rank(
        queries: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate Mean Reciprocal Rank (MRR) across multiple queries.
        
        MRR = Average of RR scores across all queries
        
        Args:
            queries: List of query dicts with 'retrieved' and 'relevant'
        
        Returns:
            MRR score (0.0 to 1.0)
        
        Example:
            >>> queries = [
            ...     {"retrieved": ["e1", "e2"], "relevant": {"e1"}},  # RR = 1.0
            ...     {"retrieved": ["e1", "e2", "e3"], "relevant": {"e3"}}  # RR = 0.33
            ... ]
            >>> mean_reciprocal_rank(queries)
            0.665  # (1.0 + 0.33) / 2
        """
        if not queries:
            return 0.0
        
        rr_scores = []
        for query in queries:
            rr = IRMetrics.reciprocal_rank(
                query['retrieved'],
                query['relevant']
            )
            rr_scores.append(rr)
        
        return sum(rr_scores) / len(rr_scores)
    
    @staticmethod
    def dcg_at_k(
        retrieved: List[str],
        relevance_scores: Dict[str, float],
        k: int
    ) -> float:
        """
        Calculate Discounted Cumulative Gain (DCG@k).
        
        DCG@k = Σ(relevance_i / log2(i+1)) for i=1 to k
        
        Discounting: Results at higher ranks contribute more
        
        Args:
            retrieved: List of retrieved entity IDs
            relevance_scores: Dict mapping entity_id → relevance (0-2)
            k: Number of top results
        
        Returns:
            DCG@k score
        
        Example:
            >>> retrieved = ["e1", "e2", "e3"]
            >>> relevance = {"e1": 2, "e2": 0, "e3": 1}
            >>> dcg_at_k(retrieved, relevance, k=3)
            # 2/log2(2) + 0/log2(3) + 1/log2(4) = 2.0 + 0 + 0.5 = 2.5
        """
        dcg = 0.0
        for i, item in enumerate(retrieved[:k], start=1):
            relevance = relevance_scores.get(item, 0)
            # Discount factor: log2(i+1)
            dcg += relevance / math.log2(i + 1)
        
        return dcg
    
    @staticmethod
    def ndcg_at_k(
        retrieved: List[str],
        relevance_scores: Dict[str, float],
        k: int
    ) -> float:
        """
        Calculate Normalized Discounted Cumulative Gain (NDCG@k).
        
        NDCG@k = DCG@k / IDCG@k
        
        IDCG = Ideal DCG (sorted by relevance in descending order)
        NDCG normalizes DCG to 0-1 range
        
        Args:
            retrieved: List of retrieved entity IDs
            relevance_scores: Dict mapping entity_id → relevance
            k: Number of top results
        
        Returns:
            NDCG@k score (0.0 to 1.0)
        """
        # Calculate DCG
        dcg = IRMetrics.dcg_at_k(retrieved, relevance_scores, k)
        
        # Calculate IDCG (ideal DCG)
        # Sort all items by relevance (descending)
        ideal_order = sorted(
            relevance_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        ideal_retrieved = [item_id for item_id, _ in ideal_order]
        idcg = IRMetrics.dcg_at_k(ideal_retrieved, relevance_scores, k)
        
        # Normalize
        if idcg == 0:
            return 0.0
        
        return dcg / idcg
    
    @staticmethod
    def average_precision(
        retrieved: List[str],
        relevant: Set[str]
    ) -> float:
        """
        Calculate Average Precision (AP).
        
        AP = (Σ(Precision@k × rel(k))) / (# relevant items)
        
        Where rel(k) = 1 if item at rank k is relevant, 0 otherwise
        
        Args:
            retrieved: List of retrieved entity IDs
            relevant: Set of relevant entity IDs
        
        Returns:
            AP score (0.0 to 1.0)
        """
        if not relevant:
            return 0.0
        
        precision_sum = 0.0
        relevant_count = 0
        
        for k in range(1, len(retrieved) + 1):
            if retrieved[k-1] in relevant:
                relevant_count += 1
                precision_at_k = relevant_count / k
                precision_sum += precision_at_k
        
        return precision_sum / len(relevant)
    
    @staticmethod
    def mean_average_precision(
        queries: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate Mean Average Precision (MAP) across queries.
        
        MAP = Average of AP scores
        
        Args:
            queries: List of query dicts
        
        Returns:
            MAP score (0.0 to 1.0)
        """
        if not queries:
            return 0.0
        
        ap_scores = []
        for query in queries:
            ap = IRMetrics.average_precision(
                query['retrieved'],
                query['relevant']
            )
            ap_scores.append(ap)
        
        return sum(ap_scores) / len(ap_scores)
    
    @staticmethod
    def calculate_all_metrics(
        retrieved: List[str],
        relevant: Set[str],
        relevance_scores: Dict[str, float],
        k_values: List[int] = [5, 10, 20]
    ) -> Dict[str, float]:
        """
        Calculate all metrics for a single query.
        
        Args:
            retrieved: Retrieved entity IDs
            relevant: Relevant entity IDs
            relevance_scores: Graded relevance scores
            k_values: List of k values for @k metrics
        
        Returns:
            Dict of metric_name → score
        """
        metrics = {}
        
        # Precision@k and Recall@k for each k
        for k in k_values:
            metrics[f'precision@{k}'] = IRMetrics.precision_at_k(
                retrieved, relevant, k
            )
            metrics[f'recall@{k}'] = IRMetrics.recall_at_k(
                retrieved, relevant, k
            )
            metrics[f'ndcg@{k}'] = IRMetrics.ndcg_at_k(
                retrieved, relevance_scores, k
            )
        
        # Reciprocal rank
        metrics['reciprocal_rank'] = IRMetrics.reciprocal_rank(
            retrieved, relevant
        )
        
        # Average precision
        metrics['average_precision'] = IRMetrics.average_precision(
            retrieved, relevant
        )
        
        return metrics
    
    @staticmethod
    def aggregate_metrics(
        all_metrics: List[Dict[str, float]]
    ) -> Dict[str, float]:
        """
        Aggregate metrics across multiple queries.
        
        Args:
            all_metrics: List of metric dicts (one per query)
        
        Returns:
            Dict of aggregated metrics (mean values)
        """
        if not all_metrics:
            return {}
        
        # Collect all metric names
        metric_names = set()
        for metrics in all_metrics:
            metric_names.update(metrics.keys())
        
        # Calculate means
        aggregated = {}
        for metric_name in metric_names:
            values = [m.get(metric_name, 0.0) for m in all_metrics]
            aggregated[metric_name] = sum(values) / len(values)
        
        return aggregated


# Test metrics
if __name__ == '__main__':
    print("=" * 60)
    print("IR Metrics Test")
    print("=" * 60)
    
    # Sample data
    retrieved = ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "e10"]
    relevant = {"e1", "e3", "e5", "e7", "e9", "e11", "e12"}
    relevance_scores = {
        "e1": 2,  # Highly relevant
        "e3": 2,
        "e5": 1,  # Somewhat relevant
        "e7": 1,
        "e9": 1,
        "e11": 2,  # Not retrieved
        "e12": 1
    }
    
    # Calculate metrics
    metrics = IRMetrics.calculate_all_metrics(
        retrieved,
        relevant,
        relevance_scores,
        k_values=[5, 10]
    )
    
    print("\nMetrics for sample query:")
    print(f"  Retrieved: {len(retrieved)} items")
    print(f"  Relevant: {len(relevant)} items")
    print(f"  Relevant in retrieved: {len(relevant & set(retrieved))}")
    
    print("\nScores:")
    for metric, value in sorted(metrics.items()):
        print(f"  {metric}: {value:.4f}")
    
    # Test MRR
    print("\n" + "=" * 60)
    print("MRR Test (Multiple Queries)")
    print("=" * 60)
    
    queries = [
        {
            "retrieved": ["e1", "e2", "e3"],
            "relevant": {"e1", "e4"}  # RR = 1.0 (first is relevant)
        },
        {
            "retrieved": ["e1", "e2", "e3"],
            "relevant": {"e2", "e4"}  # RR = 0.5 (second is relevant)
        },
        {
            "retrieved": ["e1", "e2", "e3"],
            "relevant": {"e3", "e4"}  # RR = 0.333 (third is relevant)
        }
    ]
    
    mrr = IRMetrics.mean_reciprocal_rank(queries)
    print(f"\nMRR: {mrr:.4f}")
    print(f"  Expected: ~0.611 ((1.0 + 0.5 + 0.333) / 3)")
```


### 7.3 Benchmark Dataset Creation

**Create `app/utils/benchmark.py`:**

```python
"""
Benchmark Dataset Creation Helper

This module helps create and validate benchmark datasets for evaluation.

A benchmark dataset consists of:
1. Queries (natural language questions)
2. Ground truth relevant entities
3. Relevance scores (0-2 scale)

Author: FeedPrism Team
Date: Nov 2025
"""

import json
from typing import Dict, List, Any
from pathlib import Path
from datetime import datetime

from loguru import logger

from app.config import settings


class BenchmarkDataset:
    """
    Helper class for creating and managing benchmark datasets.
    """
    
    def __init__(self, dataset_path: Path = None):
        """
        Initialize benchmark dataset.
        
        Args:
            dataset_path: Path to benchmark JSON file
        """
        if dataset_path is None:
            dataset_path = settings.data_dir / "benchmark" / "queries.json"
        
        self.dataset_path = dataset_path
        self.queries = []
        
        # Load existing dataset if available
        if self.dataset_path.exists():
            self.load()
    
    def add_query(
        self,
        query_id: str,
        query_text: str,
        relevant_entities: List[str],
        relevance_scores: Dict[str, int],
        notes: str = ""
    ) -> None:
        """
        Add a query to the benchmark dataset.
        
        Args:
            query_id: Unique query identifier (e.g., "q001")
            query_text: Natural language query
            relevant_entities: List of relevant entity IDs
            relevance_scores: Dict mapping entity_id → relevance (0-2)
            notes: Optional notes about the query
        """
        query = {
            "query_id": query_id,
            "query": query_text,
            "relevant_entities": relevant_entities,
            "relevance_scores": relevance_scores,
            "notes": notes,
            "created_at": datetime.now().isoformat()
        }
        
        # Check for duplicate query_id
        existing_ids = {q["query_id"] for q in self.queries}
        if query_id in existing_ids:
            logger.warning(f"Query ID {query_id} already exists, overwriting")
            self.queries = [q for q in self.queries if q["query_id"] != query_id]
        
        self.queries.append(query)
        logger.info(f"Added query: {query_id} - '{query_text}'")
    
    def save(self) -> None:
        """Save benchmark dataset to JSON file."""
        self.dataset_path.parent.mkdir(parents=True, exist_ok=True)
        
        data = {
            "version": "1.0",
            "created_at": datetime.now().isoformat(),
            "total_queries": len(self.queries),
            "queries": self.queries
        }
        
        with open(self.dataset_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        logger.success(f"Saved benchmark dataset: {self.dataset_path}")
        logger.info(f"  Total queries: {len(self.queries)}")
    
    def load(self) -> None:
        """Load benchmark dataset from JSON file."""
        with open(self.dataset_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        self.queries = data.get("queries", [])
        logger.info(f"Loaded benchmark dataset: {len(self.queries)} queries")
    
    def get_query(self, query_id: str) -> Dict[str, Any]:
        """Get query by ID."""
        for query in self.queries:
            if query["query_id"] == query_id:
                return query
        
        raise ValueError(f"Query not found: {query_id}")
    
    def validate(self) -> Dict[str, Any]:
        """
        Validate benchmark dataset.
        
        Checks:
        - Unique query IDs
        - Valid relevance scores (0-2)
        - Non-empty queries
        
        Returns:
            Validation report dict
        """
        issues = []
        
        # Check unique IDs
        query_ids = [q["query_id"] for q in self.queries]
        if len(query_ids) != len(set(query_ids)):
            issues.append("Duplicate query IDs found")
        
        # Check each query
        for query in self.queries:
            qid = query["query_id"]
            
            # Empty query text
            if not query.get("query", "").strip():
                issues.append(f"{qid}: Empty query text")
            
            # Empty relevant entities
            if not query.get("relevant_entities"):
                issues.append(f"{qid}: No relevant entities")
            
            # Invalid relevance scores
            scores = query.get("relevance_scores", {})
            for entity_id, score in scores.items():
                if score not in [0, 1, 2]:
                    issues.append(
                        f"{qid}: Invalid relevance score for {entity_id}: {score}"
                    )
        
        report = {
            "valid": len(issues) == 0,
            "total_queries": len(self.queries),
            "issues": issues
        }
        
        return report


def create_sample_benchmark():
    """Create a sample benchmark dataset for testing."""
    dataset = BenchmarkDataset()
    
    # Sample queries (you'll replace with real ones after manual labeling)
    sample_queries = [
        {
            "query_id": "q001",
            "query": "upcoming AI workshops in India",
            "relevant_entities": [
                "event_email123_0",
                "event_email456_1"
            ],
            "relevance_scores": {
                "event_email123_0": 2,  # Highly relevant
                "event_email456_1": 1   # Somewhat relevant
            },
            "notes": "User wants future AI events in India"
        },
        {
            "query_id": "q002",
            "query": "machine learning courses for beginners",
            "relevant_entities": [
                "course_email789_0",
                "course_email234_1"
            ],
            "relevance_scores": {
                "course_email789_0": 2,
                "course_email234_1": 2
            },
            "notes": "Beginner-level ML courses"
        },
        {
            "query_id": "q003",
            "query": "latest GPT-4 articles",
            "relevant_entities": [
                "blog_email111_0",
                "blog_email222_1",
                "blog_email333_2"
            ],
            "relevance_scores": {
                "blog_email111_0": 2,
                "blog_email222_1": 2,
                "blog_email333_2": 1
            },
            "notes": "Recent articles about GPT-4"
        }
    ]
    
    for query_data in sample_queries:
        dataset.add_query(**query_data)
    
    dataset.save()
    
    # Validate
    report = dataset.validate()
    print("\n" + "=" * 60)
    print("Validation Report")
    print("=" * 60)
    print(f"Valid: {report['valid']}")
    print(f"Total queries: {report['total_queries']}")
    if report['issues']:
        print("\nIssues:")
        for issue in report['issues']:
            print(f"  - {issue}")
    else:
        print("\n✅ No issues found!")
    
    return dataset


if __name__ == '__main__':
    print("=" * 60)
    print("Creating Sample Benchmark Dataset")
    print("=" * 60)
    
    dataset = create_sample_benchmark()
    
    print(f"\n📁 Saved to: {dataset.dataset_path}")
    print("\n💡 Next steps:")
    print("1. Review indexed entities (check entity IDs)")
    print("2. Create real queries based on your data")
    print("3. Manually label relevant entities for each query")
    print("4. Update queries.json with real labels")
```


### 7.4 Evaluation Pipeline

**Create `scripts/evaluate.py`:**

```python
"""
Evaluation Pipeline

This script runs comprehensive evaluation on the search system:
1. Load benchmark queries
2. Run searches
3. Calculate metrics
4. Generate evaluation report

Usage:
    python scripts/evaluate.py
    python scripts/evaluate.py --benchmark data/benchmark/queries.json
"""

import argparse
import json
import sys
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger

from app.config import settings
from app.services.search import SearchService
from app.utils.metrics import IRMetrics
from app.utils.benchmark import BenchmarkDataset


class Evaluator:
    """
    Search system evaluator.
    
    Runs benchmark queries and calculates metrics.
    """
    
    def __init__(self, benchmark_path: Path = None):
        """Initialize evaluator with benchmark dataset."""
        self.benchmark = BenchmarkDataset(benchmark_path)
        self.search_service = SearchService()
        
        if not self.benchmark.queries:
            raise ValueError("Benchmark dataset is empty!")
        
        logger.info(f"Loaded {len(self.benchmark.queries)} benchmark queries")
    
    def evaluate(
        self,
        k_values: List[int] = [5, 10, 20]
    ) -> Dict[str, Any]:
        """
        Run full evaluation.
        
        Args:
            k_values: List of k values for @k metrics
        
        Returns:
            Evaluation report dict
        """
        logger.info("Starting evaluation...")
        
        all_metrics = []
        query_results = []
        latencies = []
        
        for query_data in self.benchmark.queries:
            query_id = query_data["query_id"]
            query_text = query_data["query"]
            relevant = set(query_data["relevant_entities"])
            relevance_scores = query_data["relevance_scores"]
            
            logger.info(f"Evaluating: {query_id} - '{query_text}'")
            
            # Run search with timing
            start_time = time.time()
            
            search_results = self.search_service.search(
                query=query_text,
                limit=max(k_values)  # Get enough results for largest k
            )
            
            latency = (time.time() - start_time) * 1000  # Convert to ms
            latencies.append(latency)
            
            # Extract retrieved entity IDs
            retrieved = [
                result["id"]
                for result in search_results["results"]
            ]
            
            # Calculate metrics
            metrics = IRMetrics.calculate_all_metrics(
                retrieved=retrieved,
                relevant=relevant,
                relevance_scores=relevance_scores,
                k_values=k_values
            )
            
            metrics["latency_ms"] = latency
            all_metrics.append(metrics)
            
            # Store query result
            query_results.append({
                "query_id": query_id,
                "query": query_text,
                "retrieved_count": len(retrieved),
                "relevant_count": len(relevant),
                "latency_ms": latency,
                "metrics": metrics,
                "top_5_results": [
                    {
                        "id": r["id"],
                        "score": r["score"],
                        "title": r["entity"].get("title", "N/A"),
                        "relevant": r["id"] in relevant
                    }
                    for r in search_results["results"][:5]
                ]
            })
            
            logger.info(f"  P@5: {metrics['precision@5']:.3f}, "
                       f"MRR: {metrics['reciprocal_rank']:.3f}, "
                       f"Latency: {latency:.1f}ms")
        
        # Aggregate metrics
        aggregated = IRMetrics.aggregate_metrics(all_metrics)
        
        # Add latency stats
        aggregated["mean_latency_ms"] = sum(latencies) / len(latencies)
        aggregated["max_latency_ms"] = max(latencies)
        aggregated["min_latency_ms"] = min(latencies)
        
        # Build report
        report = {
            "evaluation_timestamp": datetime.now().isoformat(),
            "benchmark_queries": len(self.benchmark.queries),
            "k_values": k_values,
            "aggregated_metrics": aggregated,
            "query_results": query_results
        }
        
        logger.success("Evaluation complete!")
        
        return report
    
    def print_report(self, report: Dict[str, Any]) -> None:
        """Print evaluation report to console."""
        print("\n" + "=" * 60)
        print("EVALUATION REPORT")
        print("=" * 60)
        
        print(f"\nTimestamp: {report['evaluation_timestamp']}")
        print(f"Benchmark queries: {report['benchmark_queries']}")
        print(f"K values: {report['k_values']}")
        
        print("\n" + "=" * 60)
        print("AGGREGATED METRICS")
        print("=" * 60)
        
        metrics = report['aggregated_metrics']
        
        # Precision@k
        print("\nPrecision@k:")
        for k in report['k_values']:
            print(f"  P@{k}: {metrics[f'precision@{k}']:.4f}")
        
        # Recall@k
        print("\nRecall@k:")
        for k in report['k_values']:
            print(f"  R@{k}: {metrics[f'recall@{k}']:.4f}")
        
        # NDCG@k
        print("\nNDCG@k:")
        for k in report['k_values']:
            print(f"  NDCG@{k}: {metrics[f'ndcg@{k}']:.4f}")
        
        # Other metrics
        print(f"\nMean Reciprocal Rank: {metrics['reciprocal_rank']:.4f}")
        print(f"Mean Average Precision: {metrics['average_precision']:.4f}")
        
        # Latency
        print(f"\nLatency:")
        print(f"  Mean: {metrics['mean_latency_ms']:.2f}ms")
        print(f"  Min: {metrics['min_latency_ms']:.2f}ms")
        print(f"  Max: {metrics['max_latency_ms']:.2f}ms")
        
        # Per-query breakdown
        print("\n" + "=" * 60)
        print("PER-QUERY RESULTS")
        print("=" * 60)
        
        for result in report['query_results']:
            print(f"\nQuery: {result['query_id']}")
            print(f"  Text: '{result['query']}'")
            print(f"  P@5: {result['metrics']['precision@5']:.3f}")
            print(f"  RR: {result['metrics']['reciprocal_rank']:.3f}")
            print(f"  Latency: {result['latency_ms']:.1f}ms")
            
            print(f"  Top 5 results:")
            for i, r in enumerate(result['top_5_results'], 1):
                relevant_mark = "✓" if r['relevant'] else "✗"
                print(f"    {i}. [{relevant_mark}] {r['title']} (score: {r['score']:.3f})")
    
    def save_report(self, report: Dict[str, Any], output_path: Path = None) -> None:
        """Save evaluation report to JSON file."""
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = settings.data_dir / "benchmark" / f"evaluation_{timestamp}.json"
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        logger.success(f"Saved evaluation report: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate search system performance"
    )
    parser.add_argument(
        '--benchmark',
        type=Path,
        default=None,
        help='Path to benchmark dataset JSON'
    )
    parser.add_argument(
        '--k-values',
        nargs='+',
        type=int,
        default=[5, 10, 20],
        help='K values for @k metrics (default: 5 10 20)'
    )
    parser.add_argument(
        '--output',
        type=Path,
        default=None,
        help='Output path for evaluation report'
    )
    
    args = parser.parse_args()
    
    # Configure logger
    log_file = settings.data_dir / "logs" / f"evaluation_{datetime.now():%Y%m%d_%H%M%S}.log"
    logger.add(log_file, level=settings.log_level)
    
    try:
        # Initialize evaluator
        evaluator = Evaluator(benchmark_path=args.benchmark)
        
        # Run evaluation
        report = evaluator.evaluate(k_values=args.k_values)
        
        # Print report
        evaluator.print_report(report)
        
        # Save report
        evaluator.save_report(report, output_path=args.output)
        
        print(f"\n📊 Log file: {log_file}")
        
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        raise


if __name__ == '__main__':
    main()
```


### 7.5 Create Your Benchmark Dataset

**Step-by-step process:**

1. **First, inspect your indexed data to know what entities exist:**
```bash
# Create a helper script to list all indexed entities
python -c "
from app.database.qdrant_client import QdrantClient

client = QdrantClient()

# Get sample points to see entity structure
# (In production, you'd scroll through all points)
results = client.client.scroll(
    collection_name=client.collection_name,
    limit=50,
    with_payload=True
)

points = results[0]

print('Sample indexed entities:')
print('='*60)

for point in points[:10]:
    entity = point.payload.get('entity', {})
    print(f\"ID: {point.id}\")
    print(f\"Type: {point.payload.get('entity_type')}\")
    print(f\"Title: {entity.get('title', 'N/A')}\")
    print(f\"Date: {entity.get('start_date', 'N/A')}\")
    print('-'*60)
"
```

2. **Create your benchmark queries based on real data:**
```bash
# Edit the benchmark creation script
python -c "
from app.utils.benchmark import BenchmarkDataset

dataset = BenchmarkDataset()

# ADD YOUR REAL QUERIES HERE based on indexed entities
# Example template:
dataset.add_query(
    query_id='q001',
    query_text='upcoming AI workshops',
    relevant_entities=[
        'event_test001_0',  # Replace with actual IDs from step 1
        'event_test002_0'
    ],
    relevance_scores={
        'event_test001_0': 2,  # 2 = highly relevant
        'event_test002_0': 1   # 1 = somewhat relevant
    },
    notes='User wants future AI workshops'
)

# Add 10-20 queries covering different scenarios:
# - Events (upcoming, past, specific topics)
# - Courses (beginner, advanced, specific subjects)
# - Blogs (recent articles, specific topics)
# - Different time filters
# - Different locations

dataset.save()
print(f'Saved to: {dataset.dataset_path}')
"
```

3. **Run evaluation:**
```bash
python scripts/evaluate.py
```

**Expected output:**

```
============================================================
EVALUATION REPORT
============================================================

Timestamp: 2025-11-24T18:30:00.123456
Benchmark queries: 15
K values: [5, 10, 20]

============================================================
AGGREGATED METRICS
============================================================

Precision@k:
  P@5: 0.7800
  P@10: 0.7200
  P@20: 0.6500

Recall@k:
  R@5: 0.6500
  R@10: 0.8200
  R@20: 0.9100

NDCG@k:
  NDCG@5: 0.8234
  NDCG@10: 0.8567
  NDCG@20: 0.8712

Mean Reciprocal Rank: 0.8333
Mean Average Precision: 0.7892

Latency:
  Mean: 87.45ms
  Min: 62.30ms
  Max: 125.80ms

============================================================
PER-QUERY RESULTS
============================================================

Query: q001
  Text: 'upcoming AI workshops'
  P@5: 0.800
  RR: 1.000
  Latency: 78.2ms
  Top 5 results:
    1. [✓] AI Workshop on LLMs (score: 0.892)
    2. [✓] Machine Learning Seminar (score: 0.854)
    3. [✗] Python Data Science Course (score: 0.823)
    4. [✓] Deep Learning Workshop (score: 0.801)
    5. [✓] AI Ethics Discussion (score: 0.789)
```


***

**🎉 DAY 5 COMPLETE!**

You now have:

- ✅ Comprehensive metrics implementation (Precision@k, Recall@k, MRR, NDCG@k, MAP)
- ✅ Benchmark dataset management system
- ✅ Automated evaluation pipeline
- ✅ Per-query and aggregated metrics reporting
- ✅ Latency measurements
- ✅ JSON evaluation reports for documentation

**Metrics achieved (typical values):**

- Precision@5: 0.70-0.85 (70-85% of top-5 results are relevant)
- MRR: 0.80+ (first relevant result usually in top 2)
- Latency: 60-120ms (well under 500ms threshold)

**Next Steps:** Day 6 - Build the frontend demo interface (HTML/CSS/JavaScript) with search UI, result display, and metrics dashboard.

Should I proceed with Day 6?

