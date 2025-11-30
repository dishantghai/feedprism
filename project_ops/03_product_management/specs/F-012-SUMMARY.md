# F-012: Duplicate Content Viewer - Quick Summary

## What This Feature Does

Shows users when the same content (event, course, blog) appears in multiple newsletters, with:
- **Visual badges** showing source count ("Seen in 3 sources")
- **Expandable source lists** showing all newsletters that mentioned the content
- **Click-to-view** functionality to open any source email in a modal
- **Source navigation** to browse between different source emails

## Key User Benefits

1. **Reduce Information Overload:** See one canonical item instead of 5 duplicates
2. **Social Proof:** "Seen in 8 sources" = this is important/popular
3. **Verification:** View the same content from multiple sources to verify accuracy
4. **Provenance:** Complete traceability back to original emails

## Technical Highlights (for Hackathon)

- ✅ Uses **Qdrant Grouping API** for native deduplication
- ✅ Demonstrates **canonical item IDs** with deterministic hashing
- ✅ Shows **multi-source tracking** across collections
- ✅ Integrates with existing **Email Modal** (F-008)
- ✅ Advanced Qdrant features that differentiate from basic vector search

## Visual Design

### Badge Variants
- **2-3 sources:** Blue badge (moderate)
- **4-5 sources:** Purple badge (popular)  
- **6+ sources:** Gradient badge with pulse animation (viral) 🔥

### Example Card
```
┌────────────────────────────────────────┐
│  📅 NeurIPS 2025 Conference           │
│  Dec 10-16, 2025 • Vancouver          │
│                                        │
│  🔥 Seen in 8 sources        [Expand] │
│  ├─ 📧 AI Weekly (Nov 28)    [View]   │
│  ├─ 📧 ML News (Nov 27)      [View]   │
│  └─ 📧 Tech Digest (Nov 26)  [View]   │
│                                        │
│  #AI #Conference #MachineLearning      │
└────────────────────────────────────────┘
```

## Implementation Phases

1. **Backend (2h):** Update search API to use Grouping API and return sources
2. **Core UI (3h):** Build DuplicateSourceBadge and SourceListItem components
3. **Modal Integration (2h):** Add source navigation to EmailModal
4. **Polish (2h):** Animations, responsive design, accessibility
5. **Testing (1h):** Edge cases, performance, cross-browser

**Total: ~10 hours**

## Files to Create/Modify

### New Files
- `src/components/DuplicateSourceBadge/DuplicateSourceBadge.tsx`
- `src/components/DuplicateSourceBadge/SourceListItem.tsx`
- `src/components/DuplicateSourceBadge/DuplicateSourceBadge.css`

### Modified Files
- `src/components/EmailModal/EmailModal.tsx` (add source navigation)
- `src/types/index.ts` (add Source interface)
- `app/services/search.py` (use Grouping API)
- `app/database/qdrant_client.py` (add search_with_grouping if not exists)

## Demo Script for Judges

1. Show search results with duplicate badges
2. Expand badge to reveal all sources
3. Click "View Email" on any source
4. Navigate between sources using Prev/Next
5. Explain: "This uses Qdrant's Grouping API with canonical IDs for intelligent deduplication"

## Success Metrics

- **Deduplication Rate:** % of results that are duplicates (target: 30%+)
- **User Engagement:** % of users who expand duplicate badges
- **Source Exploration:** Average sources viewed per session
- **Performance:** Search with grouping < 500ms (p95)

## Why This Wins the Hackathon

✅ **Advanced Qdrant Usage:** Goes beyond basic vector search  
✅ **Real User Value:** Solves actual information overload problem  
✅ **Visual Impact:** Beautiful UI with animations and polish  
✅ **Complete Feature:** Backend + Frontend + UX fully integrated  
✅ **Measurable Results:** Clear metrics (dedup rate, performance)  
✅ **Demo-Friendly:** Easy to show and explain to judges
