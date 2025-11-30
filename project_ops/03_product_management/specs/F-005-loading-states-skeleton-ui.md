# F-005: Loading States & Skeleton UI

**Priority:** P2
**Status:** ✅ Complete (Nov 30, 2025)

## Problem

The app uses simple spinners or blank states during loading, which feels jarring and doesn't give users a sense of the content structure they're about to see.

## Goal

- [x] Create reusable skeleton components for all major UI elements
- [x] Replace spinners with content-aware skeletons
- [x] Use consistent shimmer animation across all skeletons
- [x] Improve perceived performance

## Solution

### New Components

Created `frontend/src/components/ui/Skeleton.tsx` with:

| Component | Usage |
|-----------|-------|
| `Skeleton` | Base element with shimmer animation |
| `StatCardSkeleton` | Metrics stat cards |
| `EmailItemSkeleton` | Email list items in RawFeedPanel |
| `FeedCardSkeleton` | Feed cards (email groups) |
| `BlogCardSkeleton` | Blog cards (larger format) |
| `DetailModalSkeleton` | Detail modal content |
| `SidebarCountSkeleton` | Sidebar count badges |
| `MetricsGridSkeleton` | Full metrics view |

### Integration

| File | Change |
|------|--------|
| `App.tsx` | MetricsView uses `MetricsGridSkeleton` |
| `FeedList.tsx` | Imports `FeedCardSkeleton` from ui |
| `RawFeedPanel.tsx` | Uses `EmailItemSkeleton` |

### Animation

Uses existing `.skeleton` class from `index.css`:

```css
.skeleton {
  background: linear-gradient(90deg,
      var(--color-bg-tertiary) 25%,
      var(--color-bg-hover) 50%,
      var(--color-bg-tertiary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

## Files Changed

| File | Change |
|------|--------|
| `components/ui/Skeleton.tsx` | New - all skeleton components |
| `components/ui/index.ts` | New - exports |
| `App.tsx` | Use MetricsGridSkeleton |
| `components/feed/FeedList.tsx` | Import FeedCardSkeleton from ui |
| `components/prism/RawFeedPanel.tsx` | Use EmailItemSkeleton |
