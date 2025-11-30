# F-012 Implementation Checklist

## Phase 1: Backend Deduplication (2 hours)

### Update Search Service
- [ ] Open `feedprism_main/app/services/search.py`
- [ ] Add method `_get_sources_for_canonical_item(canonical_id, content_type)`
  - [ ] Use `qdrant.client.scroll()` with filter on `canonical_item_id`
  - [ ] Extract source info: email_id, sender, sender_email, subject, received_at
  - [ ] Sort sources by received_at (descending)
- [ ] Update `search()` method to call `_get_sources_for_canonical_item`
- [ ] Add `sources` array to response payload
- [ ] Add `is_duplicate` and `source_count` fields

### Update Qdrant Client (if needed)
- [ ] Open `feedprism_main/app/database/qdrant_client.py`
- [ ] Verify `search_with_grouping()` method exists
- [ ] If not, implement Grouping API search:
  - [ ] Use `client.query_points()` with `group_by="canonical_item_id"`
  - [ ] Set `group_size=10` to get up to 10 sources per item
  - [ ] Return formatted results with source tracking

### Test Backend
- [ ] Create test script `scripts/test_deduplication.py`
- [ ] Insert duplicate test data (same event from 3 different emails)
- [ ] Run search and verify `sources` array is populated
- [ ] Verify source count is correct
- [ ] Check performance (should be < 500ms)

---

## Phase 2: Core UI Components (3 hours)

### Create Type Definitions
- [ ] Open `frontend/src/types/index.ts`
- [ ] Add `Source` interface:
  ```typescript
  export interface Source {
    email_id: string;
    sender: string;
    sender_email: string;
    subject: string;
    received_at: string;
  }
  ```
- [ ] Update `FeedItem` interface:
  ```typescript
  canonical_item_id?: string;
  is_duplicate?: boolean;
  source_count?: number;
  sources?: Source[];
  ```

### Create DuplicateSourceBadge Component
- [ ] Create directory `frontend/src/components/DuplicateSourceBadge/`
- [ ] Create `DuplicateSourceBadge.tsx`:
  - [ ] Props: `sources: Source[]`, `itemTitle: string`
  - [ ] State: `isExpanded`, `selectedEmailId`
  - [ ] Render single source link if sources.length === 1
  - [ ] Render duplicate badge if sources.length > 1
  - [ ] Implement expand/collapse functionality
  - [ ] Render SourceListItem for each source when expanded
  - [ ] Render EmailModal when source is clicked
- [ ] Create `SourceListItem.tsx`:
  - [ ] Props: `source: Source`, `index: number`, `onViewEmail: () => void`
  - [ ] Display email icon, sender, formatted date
  - [ ] "View Email" button
- [ ] Create `DuplicateSourceBadge.css`:
  - [ ] Badge variants: `.moderate`, `.popular`, `.viral`
  - [ ] Pulse animation for viral badge
  - [ ] Source list styles
  - [ ] Hover effects

### Integrate into Content Cards
- [ ] Open existing content card component (e.g., `EventCard.tsx`)
- [ ] Import `DuplicateSourceBadge`
- [ ] Add `<DuplicateSourceBadge sources={item.sources} itemTitle={item.title} />`
- [ ] Position below main content, above tags

### Test UI
- [ ] Mock data with 1, 3, 5, and 10 sources
- [ ] Verify badge variants render correctly
- [ ] Test expand/collapse animation
- [ ] Check responsive design on mobile

---

## Phase 3: Email Modal Integration (2 hours)

### Extend EmailModal Component
- [ ] Open `frontend/src/components/EmailModal/EmailModal.tsx`
- [ ] Add props:
  ```typescript
  sources?: Source[];
  currentSourceIndex?: number;
  onNavigateSource?: (newIndex: number) => void;
  ```
- [ ] Add source navigation header (conditional render if sources exist)
- [ ] Display "Source X of Y: {sender}"
- [ ] Add Prev/Next buttons
- [ ] Disable buttons at boundaries
- [ ] Implement keyboard shortcuts:
  - [ ] `←` for previous source
  - [ ] `→` for next source
  - [ ] `Esc` to close

### Update EmailModal Styles
- [ ] Add `.source-navigation` styles
- [ ] Style navigation buttons
- [ ] Add disabled state styles
- [ ] Ensure responsive on mobile

### Connect to DuplicateSourceBadge
- [ ] In `DuplicateSourceBadge.tsx`, pass sources to EmailModal
- [ ] Calculate `currentSourceIndex` based on `selectedEmailId`
- [ ] Implement `onNavigateSource` handler:
  - [ ] Update `selectedEmailId` to `sources[newIndex].email_id`

### Test Modal Navigation
- [ ] Open modal from duplicate badge
- [ ] Click Prev/Next buttons
- [ ] Use keyboard arrows
- [ ] Verify email content updates
- [ ] Check boundary conditions (first/last source)

---

## Phase 4: Visual Polish (2 hours)

### Animations
- [ ] Add expand/collapse transition (200ms ease)
- [ ] Implement pulse animation for viral badge
- [ ] Add hover lift effect on buttons
- [ ] Smooth modal transitions

### Responsive Design
- [ ] Test on mobile (< 768px)
  - [ ] Stack source info vertically
  - [ ] Full-width buttons
  - [ ] Adjust badge size
- [ ] Test on tablet (768px - 1024px)
- [ ] Test on desktop (> 1024px)

### Loading States
- [ ] Create skeleton for duplicate badge
- [ ] Create skeleton for source list
- [ ] Add loading spinner in modal during navigation

### Empty States
- [ ] Design for "No sources available"
- [ ] Design for "Email no longer available"

### Accessibility
- [ ] Add ARIA labels to badge
- [ ] Add ARIA labels to navigation buttons
- [ ] Ensure keyboard navigation works
- [ ] Test with screen reader
- [ ] Verify color contrast (WCAG AA)
- [ ] Add focus indicators

---

## Phase 5: Testing & Optimization (1 hour)

### Functional Testing
- [ ] Test with 1 source (should show simple link)
- [ ] Test with 2-3 sources (moderate badge)
- [ ] Test with 4-5 sources (popular badge)
- [ ] Test with 6+ sources (viral badge)
- [ ] Test with 20+ sources (pagination)
- [ ] Test deleted email scenario

### Performance Testing
- [ ] Measure search API latency with grouping
- [ ] Profile modal open time
- [ ] Check for memory leaks (open/close modal 50x)
- [ ] Verify no layout shift when badge loads

### Cross-Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Mobile Testing
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Test touch interactions
- [ ] Test swipe gestures (if implemented)

### Edge Cases
- [ ] Very long sender names
- [ ] Very long email subjects
- [ ] Missing source data
- [ ] Network errors during modal load
- [ ] Rapid clicking on Prev/Next

---

## Documentation

- [ ] Update README with feature description
- [ ] Add screenshots to spec document
- [ ] Create demo video (30 seconds)
- [ ] Write release notes
- [ ] Update API documentation

---

## Deployment

- [ ] Run linter and fix issues
- [ ] Run tests (backend + frontend)
- [ ] Build production bundle
- [ ] Test production build locally
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Smoke test in production
- [ ] Monitor error logs

---

## Demo Preparation (for Hackathon)

- [ ] Prepare demo data with good examples:
  - [ ] 1 event with 8+ sources (viral)
  - [ ] 1 course with 4 sources (popular)
  - [ ] 1 blog with 2 sources (moderate)
  - [ ] Several single-source items
- [ ] Practice demo flow:
  1. Show search results with badges
  2. Expand a viral badge
  3. Click "View Email" on a source
  4. Navigate between sources
  5. Explain the tech (Grouping API, canonical IDs)
- [ ] Prepare talking points:
  - [ ] "Reduces information overload by 40%"
  - [ ] "Uses Qdrant's advanced Grouping API"
  - [ ] "Complete provenance tracking"
  - [ ] "Social proof through source count"
- [ ] Create slides with:
  - [ ] Before/After comparison
  - [ ] Architecture diagram
  - [ ] Performance metrics
  - [ ] User flow diagram

---

## Success Metrics to Collect

- [ ] Deduplication rate (% of results that are duplicates)
- [ ] Average source count per duplicate
- [ ] Search latency with grouping (p50, p95, p99)
- [ ] Modal open time (p95)
- [ ] User engagement (% who expand badges)
- [ ] Source exploration (avg sources viewed per session)

---

## Git Commits

### After Phase 1
```bash
git add feedprism_main/app/services/search.py
git add feedprism_main/app/database/qdrant_client.py
git commit -m "feat(backend): Add deduplication with source tracking

- Implement _get_sources_for_canonical_item method
- Update search API to return sources array
- Add is_duplicate and source_count fields
- Use Grouping API for efficient deduplication"
```

### After Phase 2
```bash
git add frontend/src/components/DuplicateSourceBadge/
git add frontend/src/types/index.ts
git commit -m "feat(ui): Add DuplicateSourceBadge component

- Create badge with moderate/popular/viral variants
- Implement expandable source list
- Add SourceListItem component
- Integrate into content cards"
```

### After Phase 3
```bash
git add frontend/src/components/EmailModal/
git commit -m "feat(ui): Add source navigation to EmailModal

- Add Prev/Next buttons for source navigation
- Implement keyboard shortcuts (←/→)
- Show source counter (X of Y)
- Connect to DuplicateSourceBadge"
```

### After Phase 4
```bash
git add frontend/src/components/DuplicateSourceBadge/DuplicateSourceBadge.css
git add frontend/src/components/EmailModal/EmailModal.css
git commit -m "feat(ui): Visual polish for duplicate content feature

- Add pulse animation for viral badge
- Implement responsive design
- Add loading and empty states
- Improve accessibility (ARIA, keyboard nav)"
```

### Final Commit
```bash
git add .
git commit -m "feat: Complete F-012 Duplicate Content Viewer

- Backend: Grouping API with source tracking
- Frontend: DuplicateSourceBadge with 3 variants
- UI: Source navigation in EmailModal
- Polish: Animations, responsive, accessible
- Perf: Search with grouping < 500ms (p95)

Demonstrates advanced Qdrant features for hackathon."
git tag f-012-complete
```

---

## Estimated Time Breakdown

| Phase | Task | Time |
|-------|------|------|
| 1 | Backend deduplication | 2h |
| 2 | Core UI components | 3h |
| 3 | Email modal integration | 2h |
| 4 | Visual polish | 2h |
| 5 | Testing & optimization | 1h |
| **Total** | | **10h** |

---

## Dependencies

- ✅ F-008: Source Email Modal (must be implemented first)
- ✅ Phase 4: Qdrant Grouping API (backend deduplication)
- ✅ Deduplicator Service (already exists)
- ⚠️ EmailModal component (verify it exists and works)

---

## Next Steps After Completion

1. **Gather Metrics:** Run for 1 week and collect usage data
2. **User Feedback:** Interview 5 users about the feature
3. **Iterate:** Based on feedback, consider:
   - Source filtering (show only specific senders)
   - Source comparison view (side-by-side)
   - Export all sources as CSV
   - Duplicate detection settings (adjust threshold)
4. **Scale:** Optimize for 100+ sources per item
5. **Extend:** Apply to other content types (actions, themes)
