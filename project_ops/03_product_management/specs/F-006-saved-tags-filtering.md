# F-006: Saved Tags & Tag-Based Filtering

## Problem
Content items (events, courses, blogs) have many tags extracted from emails. Users cannot easily track tags they care about or quickly filter content by their preferred topics. Tags are visible but not actionable, reducing their utility for personalized content discovery.

## Goal
- Allow users to **save tags** they're interested in directly from the content detail view
- Display **saved tags** in the Command Bar for quick access
- Enable **filtering by saved tags** to surface relevant content instantly
- Handle large numbers of tags (10-50+ saved tags) gracefully
- Maintain consistency with the Notion/Arc design language

---

## User Flow

### 1. Discovering & Saving Tags

**Detail View:**
```
┌────────────────────────────────────────────────────────┐
│  📅 Advanced NLP Workshop 2024                        │
│  ──────────────────────────────────────────────────   │
│                                                        │
│  Tags:                                                 │
│  [NLP ⭐]  [Workshop ⭐]  [AI]  [Hands-on]  [Python]  │
│   saved     saved       unsaved  unsaved    unsaved   │
└────────────────────────────────────────────────────────┘
```

**Interaction:**
- Tags appear as pills below the title/description
- Unsaved tags: Gray background, no icon
- Hover: Show star outline icon
- Click: Star fills, tag saved, subtle animation
- Saved tags: Colored background (accent color), filled star icon
- Click again: Unsave (star outline, gray background)

### 2. Viewing Saved Tags in Command Bar

**Command Bar (⌘K):**
```
┌──────────────────────────────────────────────────────┐
│  🔍  Search commands, content, or type a query...   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🏷️ SAVED TAGS                              [▼]     │
│  ├─ NLP (12)                                        │
│  ├─ Workshop (8)                                    │
│  ├─ AI (45)                                         │
│  ├─ Python (23)                                     │
│  ├─ Deep Learning (15)                              │
│  └─ Show all (15 more) →                           │
│                                                      │
│  QUICK ACTIONS                                       │
│  ├─ ⚡ View pending actions                         │
│  └─ 📊 Open metrics dashboard                       │
└──────────────────────────────────────────────────────┘
```

**Behavior:**
- Collapsible "🏷️ Saved Tags" section (expanded by default)
- Shows **top 10 most-used** saved tags with item counts
- "Show all" link opens a modal/drawer with full list
- Click a tag → filters Library view by that tag
- Multi-select: Shift+Click or checkboxes for multiple tags

### 3. Filtering by Tags

**Library View with Active Tag Filter:**
```
┌──────────────────────────────────────────────────────┐
│  Active Filters:                                     │
│  [Type: All ▾]  [Status: Any ▾]  [🏷️ NLP ×]         │
│                                                      │
│  Showing 12 items tagged with "NLP"                  │
└──────────────────────────────────────────────────────┘
```

**Filter Logic:**
- **Single tag:** Show all items with that tag
- **Multiple tags:** OR logic (items with ANY of the selected tags)
- **Combined with other filters:** AND logic (e.g., Type=Event AND tag=NLP)
- Clear individual tags with × icon
- "Clear all filters" button

---

## Implementation Details

### Frontend Components

#### 1. TagPill Component
```tsx
// src/components/TagPill.tsx
interface TagPillProps {
  tag: string;
  isSaved: boolean;
  onToggleSave: (tag: string) => void;
  showSaveIcon?: boolean; // true in detail view, false in card view
}

// States:
// - Default (unsaved): bg-gray-100, text-gray-700
// - Hover (unsaved): bg-gray-200, show star outline
// - Saved: bg-blue-100, text-blue-700, filled star
// - Transition: 150ms ease
```

#### 2. SavedTagsSection Component
```tsx
// src/components/CommandBar/SavedTagsSection.tsx
interface SavedTagsSectionProps {
  savedTags: Array<{ tag: string; count: number }>;
  onTagClick: (tag: string) => void;
  onShowAll: () => void;
}

// Features:
// - Collapsible (localStorage state)
// - Top 10 tags sorted by count
// - "Show all" link if > 10 tags
// - Keyboard navigation (↑/↓ arrows)
```

#### 3. SavedTagsModal Component
```tsx
// src/components/SavedTagsModal.tsx
interface SavedTagsModalProps {
  savedTags: Array<{ tag: string; count: number }>;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onApply: () => void;
  onClose: () => void;
}

// Features:
// - Search within saved tags
// - Multi-select with checkboxes
// - Bulk actions: Select all, Clear all
// - Sort by: Name, Count, Recently added
// - Delete saved tags
```

### Backend API

#### 1. Save/Unsave Tag
```http
POST /api/user/tags/save
{
  "tag": "NLP",
  "action": "save" | "unsave"
}

Response:
{
  "success": true,
  "saved_tags": ["NLP", "Workshop", "AI", ...]
}
```

#### 2. Get Saved Tags
```http
GET /api/user/tags/saved

Response:
{
  "tags": [
    { "tag": "NLP", "count": 12, "saved_at": "2024-11-30T10:00:00Z" },
    { "tag": "Workshop", "count": 8, "saved_at": "2024-11-29T15:30:00Z" },
    ...
  ]
}
```

#### 3. Filter by Tags
```http
GET /api/search?tags=NLP,Workshop&type=event&status=upcoming

Response:
{
  "items": [...],
  "total": 12,
  "filters_applied": {
    "tags": ["NLP", "Workshop"],
    "type": "event",
    "status": "upcoming"
  }
}
```

### Database Schema

```sql
-- New table for user saved tags
CREATE TABLE user_saved_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tag VARCHAR(100) NOT NULL,
  saved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tag)
);

CREATE INDEX idx_user_saved_tags_user ON user_saved_tags(user_id);
CREATE INDEX idx_user_saved_tags_tag ON user_saved_tags(tag);

-- Query to get saved tags with counts
SELECT 
  ust.tag,
  COUNT(DISTINCT i.id) as count,
  ust.saved_at
FROM user_saved_tags ust
LEFT JOIN items i ON i.tags @> ARRAY[ust.tag]
WHERE ust.user_id = $1
GROUP BY ust.tag, ust.saved_at
ORDER BY count DESC;
```

### State Management

```tsx
// src/contexts/SavedTagsContext.tsx
interface SavedTagsContextType {
  savedTags: string[];
  tagCounts: Record<string, number>;
  saveTag: (tag: string) => Promise<void>;
  unsaveTag: (tag: string) => Promise<void>;
  isSaved: (tag: string) => boolean;
  refreshCounts: () => Promise<void>;
}

// Persists to backend on save/unsave
// Caches in localStorage for offline access
// Syncs on app load
```

---

## UX Specifications

### Visual Design

**Tag Pill Styles:**
```css
/* Unsaved tag */
.tag-pill {
  background: var(--color-bg-tertiary); /* #F7F6F3 */
  color: var(--color-text-secondary); /* #787774 */
  border: 1px solid var(--color-border); /* #E8E8E6 */
  border-radius: 12px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.tag-pill:hover {
  background: var(--color-bg-secondary); /* #FBFBFA */
  border-color: var(--color-border-hover); /* #D4D4D0 */
}

/* Saved tag */
.tag-pill.saved {
  background: var(--color-primary-light); /* #E8F4FD */
  color: var(--color-primary); /* #2383E2 */
  border-color: var(--color-primary);
}

.tag-pill.saved:hover {
  background: var(--color-primary);
  color: white;
}

/* Save icon */
.tag-pill .save-icon {
  margin-left: 4px;
  font-size: 10px;
  opacity: 0;
  transition: opacity 150ms ease;
}

.tag-pill:hover .save-icon {
  opacity: 1;
}

.tag-pill.saved .save-icon {
  opacity: 1;
}
```

**Command Bar Section:**
```css
.saved-tags-section {
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.saved-tags-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  letter-spacing: 0.5px;
}

.saved-tag-item {
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  border-radius: 4px;
  transition: background 100ms ease;
}

.saved-tag-item:hover {
  background: var(--color-bg-tertiary);
}

.saved-tag-item .count {
  font-size: 11px;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}
```

### Animations

**Save Animation:**
```css
@keyframes tag-save {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.tag-pill.saving {
  animation: tag-save 300ms ease;
}
```

**Tag Count Update:**
```css
@keyframes count-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.saved-tag-item .count.updating {
  animation: count-pulse 500ms ease;
}
```

---

## Edge Cases & Considerations

### 1. Tag Normalization
- **Problem:** Tags might have inconsistent casing ("NLP" vs "nlp")
- **Solution:** Normalize to lowercase in backend, display original case in UI
- Store both: `tag_normalized` (for querying) and `tag_display` (for UI)

### 2. Tag Limit
- **Problem:** User saves 100+ tags, Command Bar becomes cluttered
- **Solution:** 
  - Show top 10 by default
  - "Show all" opens modal with search/sort
  - Suggest removing unused tags (< 3 items)

### 3. Tag Deletion
- **Problem:** What if a tag no longer exists in any content?
- **Solution:** 
  - Show count as (0) in saved tags list
  - Suggest removal with "Clean up unused tags" button
  - Keep saved tags even if count is 0 (user might want to track future items)

### 4. Multi-User Sync
- **Problem:** User has multiple devices
- **Solution:** 
  - Store saved tags in backend (not just localStorage)
  - Sync on app load and after save/unsave
  - Show sync status indicator

### 5. Tag Conflicts with Filters
- **Problem:** User selects tag "Workshop" but Type filter is "Blog"
- **Solution:** 
  - Show "No results" with suggestion to clear conflicting filters
  - Highlight conflicting filters in orange
  - "Clear conflicts" button

### 6. Performance with Many Tags
- **Problem:** Querying items with 50+ tags is slow
- **Solution:** 
  - Index `tags` column (GIN index for array in Postgres)
  - Cache tag counts in Redis
  - Lazy load tag counts (show saved tags first, load counts async)

---

## Acceptance Criteria

### Detail View
- [ ] Tags appear as pills below title/description
- [ ] Unsaved tags: gray background, star outline on hover
- [ ] Saved tags: blue background, filled star icon
- [ ] Click to save/unsave with 300ms animation
- [ ] Visual feedback (pulse) on save/unsave
- [ ] Works on mobile (touch-friendly, min 44px tap target)

### Command Bar
- [ ] "🏷️ Saved Tags" section appears below search
- [ ] Shows top 10 saved tags sorted by count
- [ ] Each tag shows item count in badge
- [ ] "Show all" link if > 10 tags
- [ ] Collapsible section (state persists)
- [ ] Click tag → filters Library view
- [ ] Keyboard navigation (↑/↓ arrows, Enter to select)

### Saved Tags Modal
- [ ] Opens on "Show all" click
- [ ] Shows all saved tags with search box
- [ ] Multi-select with checkboxes
- [ ] Sort by: Name, Count, Recently added
- [ ] Delete individual tags with × icon
- [ ] "Clear all" and "Select all" buttons
- [ ] "Apply" button to filter by selected tags
- [ ] Keyboard shortcuts (Esc to close, ⌘A to select all)

### Filtering
- [ ] Active tag filters appear in filter bar
- [ ] OR logic for multiple tags
- [ ] AND logic with other filters (type, status, etc.)
- [ ] Clear individual tags with × icon
- [ ] "Clear all filters" button
- [ ] Filter count updates in real-time
- [ ] URL reflects active tag filters (shareable links)

### Backend
- [ ] POST /api/user/tags/save endpoint
- [ ] GET /api/user/tags/saved endpoint
- [ ] GET /api/search?tags=... endpoint
- [ ] Database table `user_saved_tags` created
- [ ] GIN index on `items.tags` column
- [ ] Tag counts cached in Redis (5min TTL)

### Performance
- [ ] Save/unsave responds in < 200ms
- [ ] Tag counts load in < 500ms
- [ ] Search with tags returns in < 1s
- [ ] UI remains responsive with 50+ saved tags

### Accessibility
- [ ] All interactive elements keyboard-navigable
- [ ] ARIA labels on save icons ("Save tag", "Unsave tag")
- [ ] Screen reader announces save/unsave actions
- [ ] Focus states visible on all pills and buttons
- [ ] Color contrast meets WCAG AA (4.5:1)

---

## Implementation Phases

### Phase 1: Core Functionality (MVP)
- [ ] TagPill component with save/unsave
- [ ] Backend API endpoints
- [ ] Database schema
- [ ] SavedTagsContext for state management
- [ ] Basic Command Bar integration (list only)
- [ ] Simple filtering (single tag)

### Phase 2: Enhanced UX
- [ ] SavedTagsModal with search/sort
- [ ] Multi-tag filtering (OR logic)
- [ ] Tag count badges
- [ ] Save animations
- [ ] Collapsible Command Bar section

### Phase 3: Polish & Optimization
- [ ] Tag normalization
- [ ] Unused tag cleanup
- [ ] Performance optimizations (caching, indexing)
- [ ] URL state for filters
- [ ] Keyboard shortcuts
- [ ] Mobile optimizations

---

## Metrics to Track

- **Adoption:** % of users who save at least 1 tag
- **Engagement:** Average # of saved tags per user
- **Usage:** # of searches using tag filters per day
- **Retention:** % of users who return to use saved tags
- **Performance:** p95 latency for tag-based searches

---

## Related Work

- **F-005:** Search Bar Integration (tags should work with search)
- **F-004:** Blog View Enhancement (tags appear in detail view)
- **UX Research:** Command Bar design (visual_design_improvements.md)
