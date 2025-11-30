# F-001: Metrics Dashboard Panel

## Problem

The frontend has no metrics visibility. Judges expect to see live quality metrics (precision@k, MRR, latency) as evidence of RAG discipline. Users can't gauge system health or extraction quality.

## Goal

- [ ] Dedicated metrics view accessible from sidebar
- [ ] Display key metrics: precision@10, MRR, latency p95/p99, extraction counts
- [ ] Pipeline health indicators (last run, items processed, errors)
- [ ] Matches the existing Arc-style design (magenta/orange brand)

## Approach

Backend already has `/api/metrics` endpoint. Frontend needs:
1. New route `/metrics` with MetricsDashboard component
2. Stat cards for numeric metrics
3. Optional: simple charts for trends (recharts or similar)
4. Polling or SSE for live updates

## Notes

- See `05_implementation/implementation_plan.md` → Phase 6 for original design notes
- Keep it simple—stat cards > fancy charts for hackathon
