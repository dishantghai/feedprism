# F-012: Duplicate Content Viewer with Source Tracking

## Problem

Users receive the same content (events, courses, blogs) from multiple newsletters, but currently have no visibility into:
- Which content items are duplicates across different sources
- How many newsletters mentioned the same item
- Which specific newsletters/sources covered the same content
- The ability to see all source variations of duplicate content

This creates information overload and makes it hard to understand content popularity and reach. The backend already has deduplication capabilities (canonical IDs, grouping API), but there's no UI to surface this valuable information.

## Goal

Create a comprehensive duplicate content viewing experience that:
- [ ] Shows duplicate badges on content cards ("Seen in 3 sources")
- [ ] Displays expandable source lists for duplicate items
- [ ] Allows users to click any source to view the original email in a modal
- [ ] Provides visual indicators of content popularity based on source count
- [ ] Integrates seamlessly with existing search and filtering
- [ ] Demonstrates the power of Qdrant's Grouping API for deduplication

---

## User Flow

### 1. Discovering Duplicates

**Content Card with Duplicate Badge:**
```
┌────────────────────────────────────────────────────┐
│  📅 NeurIPS 2025 Conference                       │
│  Dec 10-16, 2025 • Vancouver, Canada              │
│                                                    │
│  📊 Seen in 3 sources                    [Expand] │
│  ├─ 📧 AI Weekly (Nov 28) [View Email]            │
│  ├─ 📧 ML News (Nov 27) [View Email]              │
│  └─ 📧 Tech Digest (Nov 26) [View Email]          │
│                                                    │
│  #AI #Conference #MachineLearning                  │
│  [View Details]                                    │
└────────────────────────────────────────────────────┘
```

**Single Source (No Duplicates):**
```
┌────────────────────────────────────────────────────┐
│  📚 Advanced Python Course                        │
│  Self-paced • Beginner to Advanced                │
│                                                    │
│  📧 Python Weekly                                  │
│  #Python #Programming #Course                      │
│                                                    │
│  [View Details]  [📧 View Source Email]           │
└────────────────────────────────────────────────────┘
```

### 2. Expanding Source List

**Collapsed State:**
```
📊 Seen in 5 sources                          [Expand ▼]
```

**Expanded State:**
```
📊 Seen in 5 sources                        [Collapse ▲]
├─ 📧 AI Weekly (Nov 28, 2024)         [View Email]
├─ 📧 ML News (Nov 27, 2024)           [View Email]
├─ 📧 Tech Digest (Nov 26, 2024)       [View Email]
├─ 📧 Data Science Daily (Nov 25)      [View Email]
└─ 📧 Research Roundup (Nov 24)        [View Email]
```

### 3. Viewing Source Email

When user clicks "View Email" on any source:
- Opens the **Email Modal** (from F-008) with the specific source email
- Modal header shows which source is being viewed
- User can navigate between different source emails without closing modal

**Modal Header Enhancement:**
```
┌──────────────────────────────────────────────────────────────┐
│  ✕                                                           │
│  Source 2 of 5: ML News                        [◀ Prev Next ▶]│
│  ┌────────────────────────────────────────────────────────┐  │
│  │  From: ML News <newsletter@mlnews.com>                 │  │
│  │  Subject: NeurIPS 2025 - Early Bird Registration...   │  │
│  │  Date: Nov 27, 2024 at 2:15 PM                         │  │
│  └────────────────────────────────────────────────────────┘  │
│  [Email body...]                                             │
└──────────────────────────────────────────────────────────────┘
```

### 4. Visual Popularity Indicators

**Duplicate Count Badge Styling:**
```css
/* 1 source (default) - no badge */

/* 2-3 sources (moderate) - blue badge */
📊 Seen in 2 sources

/* 4-5 sources (popular) - purple badge */
📊 Seen in 4 sources

/* 6+ sources (viral) - gradient badge with animation */
🔥 Seen in 8 sources
```

---

## Implementation Details

### Frontend Components

#### 1. DuplicateSourceBadge Component

**File:** `src/components/DuplicateSourceBadge/DuplicateSourceBadge.tsx`

```tsx
interface Source {
  email_id: string;
  sender: string;
  sender_email: string;
  subject: string;
  received_at: string;
}

interface DuplicateSourceBadgeProps {
  sources: Source[];
  itemTitle: string;  // For modal context
}

export function DuplicateSourceBadge({ sources, itemTitle }: DuplicateSourceBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  if (sources.length <= 1) {
    // Single source - show simple email link
    return (
      <div className="source-single">
        <EmailIcon />
        <span>{sources[0]?.sender || 'Unknown'}</span>
        <ViewSourceEmailButton emailId={sources[0].email_id} />
      </div>
    );
  }
  
  // Multiple sources - show duplicate badge
  const badgeVariant = getBadgeVariant(sources.length);
  
  return (
    <div className="duplicate-badge-container">
      <button 
        className={`duplicate-badge ${badgeVariant}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <BadgeIcon variant={badgeVariant} />
        <span>Seen in {sources.length} sources</span>
        <ExpandIcon isExpanded={isExpanded} />
      </button>
      
      {isExpanded && (
        <div className="source-list">
          {sources.map((source, index) => (
            <SourceListItem
              key={source.email_id}
              source={source}
              index={index}
              onViewEmail={() => setSelectedEmailId(source.email_id)}
            />
          ))}
        </div>
      )}
      
      {selectedEmailId && (
        <EmailModal
          emailId={selectedEmailId}
          isOpen={true}
          onClose={() => setSelectedEmailId(null)}
          itemTitle={itemTitle}
          // Navigation between sources
          sources={sources}
          currentSourceIndex={sources.findIndex(s => s.email_id === selectedEmailId)}
          onNavigateSource={(newIndex) => setSelectedEmailId(sources[newIndex].email_id)}
        />
      )}
    </div>
  );
}

function getBadgeVariant(count: number): 'moderate' | 'popular' | 'viral' {
  if (count >= 6) return 'viral';
  if (count >= 4) return 'popular';
  return 'moderate';
}
```

#### 2. SourceListItem Component

```tsx
interface SourceListItemProps {
  source: Source;
  index: number;
  onViewEmail: () => void;
}

function SourceListItem({ source, index, onViewEmail }: SourceListItemProps) {
  const formattedDate = formatRelativeDate(source.received_at);
  
  return (
    <div className="source-list-item">
      <div className="source-info">
        <EmailIcon className="source-icon" />
        <div className="source-details">
          <span className="source-sender">{source.sender}</span>
          <span className="source-date">{formattedDate}</span>
        </div>
      </div>
      <button 
        className="view-email-btn"
        onClick={onViewEmail}
      >
        View Email
      </button>
    </div>
  );
}
```

#### 3. Enhanced EmailModal with Source Navigation

**Extend existing EmailModal from F-008:**

```tsx
interface EmailModalProps {
  emailId: string;
  isOpen: boolean;
  onClose: () => void;
  itemTitle?: string;
  
  // NEW: Source navigation
  sources?: Source[];
  currentSourceIndex?: number;
  onNavigateSource?: (newIndex: number) => void;
}

export function EmailModal({ 
  emailId, 
  isOpen, 
  onClose, 
  itemTitle,
  sources,
  currentSourceIndex,
  onNavigateSource 
}: EmailModalProps) {
  const hasMultipleSources = sources && sources.length > 1;
  const canNavigatePrev = hasMultipleSources && currentSourceIndex! > 0;
  const canNavigateNext = hasMultipleSources && currentSourceIndex! < sources!.length - 1;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="email-modal">
        {/* Close button */}
        <button className="close-btn" onClick={onClose}>✕</button>
        
        {/* Source navigation header (if multiple sources) */}
        {hasMultipleSources && (
          <div className="source-navigation">
            <span className="source-counter">
              Source {currentSourceIndex! + 1} of {sources!.length}: {sources![currentSourceIndex!].sender}
            </span>
            <div className="nav-buttons">
              <button 
                onClick={() => onNavigateSource!(currentSourceIndex! - 1)}
                disabled={!canNavigatePrev}
              >
                ◀ Prev
              </button>
              <button 
                onClick={() => onNavigateSource!(currentSourceIndex! + 1)}
                disabled={!canNavigateNext}
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
        
        {/* Email content (existing implementation) */}
        <EmailContent emailId={emailId} />
      </div>
    </Modal>
  );
}
```

### Backend API

#### 1. Enhanced Search Response with Sources

**Endpoint:** `GET /api/search`

**Current Response:**
```json
{
  "results": [
    {
      "id": "item-123",
      "title": "NeurIPS 2025",
      "email_id": "email-456",
      "sender": "AI Weekly",
      ...
    }
  ]
}
```

**Enhanced Response (with deduplication):**
```json
{
  "results": [
    {
      "id": "item-123",
      "title": "NeurIPS 2025",
      "canonical_item_id": "abc123def456",
      "is_duplicate": true,
      "source_count": 3,
      "sources": [
        {
          "email_id": "email-456",
          "sender": "AI Weekly",
          "sender_email": "newsletter@aiweekly.co",
          "subject": "NeurIPS 2025 - Early Registration Open",
          "received_at": "2024-11-28T09:41:00Z"
        },
        {
          "email_id": "email-789",
          "sender": "ML News",
          "sender_email": "news@mlnews.com",
          "subject": "Top ML Conferences 2025",
          "received_at": "2024-11-27T14:15:00Z"
        },
        {
          "email_id": "email-012",
          "sender": "Tech Digest",
          "sender_email": "digest@techdigest.io",
          "subject": "This Week in AI",
          "received_at": "2024-11-26T08:30:00Z"
        }
      ],
      ...
    }
  ]
}
```

#### 2. Update Search Service to Use Grouping API

**File:** `app/services/search.py`

```python
from app.database.qdrant_client import QdrantService
from app.services.deduplicator import DeduplicationService

class SearchService:
    def __init__(self):
        self.qdrant = QdrantService()
        self.deduplicator = DeduplicationService()
    
    async def search(
        self,
        query: str,
        content_type: str,
        limit: int = 20
    ) -> List[Dict]:
        """
        Search with automatic deduplication using Grouping API.
        Returns canonical items with all source information.
        """
        # Generate query vector
        query_vec = self.embedder.embed_text(query)
        
        # Use Grouping API for deduplication
        results = self.qdrant.search_with_grouping(
            content_type=content_type,
            query_vector=query_vec,
            limit=limit
        )
        
        # Format results with source tracking
        formatted_results = []
        for result in results:
            # Get all sources for this canonical item
            sources = self._get_sources_for_canonical_item(
                result['payload']['canonical_item_id'],
                content_type
            )
            
            formatted_results.append({
                'id': result['id'],
                'score': result['score'],
                **result['payload'],
                'is_duplicate': len(sources) > 1,
                'source_count': len(sources),
                'sources': sources
            })
        
        return formatted_results
    
    def _get_sources_for_canonical_item(
        self,
        canonical_id: str,
        content_type: str
    ) -> List[Dict]:
        """
        Get all source emails for a canonical item.
        """
        collection = self.qdrant.get_collection_name(content_type)
        
        # Scroll through collection to find all items with this canonical_id
        results = self.qdrant.client.scroll(
            collection_name=collection,
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="canonical_item_id",
                        match=models.MatchValue(value=canonical_id)
                    )
                ]
            ),
            limit=10,
            with_payload=True
        )
        
        sources = []
        for point in results[0]:
            payload = point.payload
            sources.append({
                'email_id': payload['source_email_id'],
                'sender': payload['sender'],
                'sender_email': payload['sender_email'],
                'subject': payload['source_subject'],
                'received_at': payload['received_at']
            })
        
        # Sort by received_at (most recent first)
        sources.sort(key=lambda x: x['received_at'], reverse=True)
        
        return sources
```

### Database Schema

**No changes needed** - existing Qdrant payload already has:
- `canonical_item_id` (from deduplicator)
- `source_email_id`
- `sender`, `sender_email`
- `source_subject`
- `received_at`

### TypeScript Types

**File:** `src/types/index.ts`

```typescript
// Add to existing types

export interface Source {
  email_id: string;
  sender: string;
  sender_email: string;
  subject: string;
  received_at: string;
}

export interface FeedItem {
  // ... existing fields ...
  
  // NEW: Deduplication fields
  canonical_item_id?: string;
  is_duplicate?: boolean;
  source_count?: number;
  sources?: Source[];
}
```

---

## UX Specifications

### Visual Design

#### Duplicate Badge Variants

```css
/* Base badge */
.duplicate-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms ease;
  border: 1px solid transparent;
}

/* Moderate (2-3 sources) */
.duplicate-badge.moderate {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.duplicate-badge.moderate:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Popular (4-5 sources) */
.duplicate-badge.popular {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
}

.duplicate-badge.popular:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

/* Viral (6+ sources) */
.duplicate-badge.viral {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  color: white;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(245, 158, 11, 0);
  }
}

.duplicate-badge.viral:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
}
```

#### Source List

```css
.source-list {
  margin-top: 12px;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.source-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  transition: background 150ms ease;
}

.source-list-item:hover {
  background: var(--color-bg-tertiary);
}

.source-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.source-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-secondary);
}

.source-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.source-sender {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.source-date {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.view-email-btn {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 150ms ease;
}

.view-email-btn:hover {
  background: var(--color-primary);
  color: white;
  transform: translateY(-1px);
}
```

#### Source Navigation in Modal

```css
.source-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border);
}

.source-counter {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.nav-buttons {
  display: flex;
  gap: 8px;
}

.nav-buttons button {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 150ms ease;
}

.nav-buttons button:hover:not(:disabled) {
  background: var(--color-bg-secondary);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.nav-buttons button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Loading States

```tsx
// Skeleton for duplicate badge
<div className="duplicate-badge-skeleton">
  <div className="skeleton-icon" />
  <div className="skeleton-text" style={{ width: '120px' }} />
</div>

// Skeleton for source list
<div className="source-list-skeleton">
  {[1, 2, 3].map(i => (
    <div key={i} className="source-list-item-skeleton">
      <div className="skeleton-circle" />
      <div className="skeleton-text" style={{ width: '150px' }} />
      <div className="skeleton-button" />
    </div>
  ))}
</div>
```

### Empty States

```tsx
// No duplicates found
<div className="no-duplicates">
  <span className="single-source-badge">
    📧 Single source
  </span>
</div>
```

---

## Edge Cases & Considerations

### 1. Source Count Mismatch
- **Problem:** Backend says 5 sources, but only 3 are returned
- **Solution:** Show "Seen in 5+ sources" if list is truncated, add "Load more" button

### 2. Deleted Source Emails
- **Problem:** Source email deleted from Gmail after extraction
- **Solution:** Show source in list but disable "View Email" button with tooltip "Email no longer available"

### 3. Very High Source Count (20+ sources)
- **Problem:** Too many sources to display
- **Solution:** 
  - Show first 5 sources by default
  - Add "Show all 23 sources" button
  - Paginate source list in modal

### 4. Source Navigation Performance
- **Problem:** Loading each email when navigating between sources
- **Solution:** 
  - Prefetch adjacent source emails
  - Cache email data in modal state
  - Show loading spinner during transition

### 5. Mobile View
- **Problem:** Source list too wide on mobile
- **Solution:** 
  - Stack source info vertically
  - Full-width "View Email" buttons
  - Swipe gestures for source navigation in modal

### 6. Keyboard Navigation
- **Problem:** Users expect keyboard shortcuts
- **Solution:** 
  - `←` / `→` to navigate between sources in modal
  - `Esc` to close modal
  - `Tab` to navigate source list

---

## Acceptance Criteria

### UI Components
- [ ] Duplicate badge appears on items with 2+ sources
- [ ] Badge variant changes based on source count (moderate/popular/viral)
- [ ] Badge is clickable and expands/collapses source list
- [ ] Source list shows all sources with sender, date, and "View Email" button
- [ ] Single-source items show simple email link (no badge)

### Source List
- [ ] Sources sorted by received_at (most recent first)
- [ ] Each source shows sender name and relative date
- [ ] "View Email" button opens EmailModal with correct email
- [ ] Smooth expand/collapse animation (200ms)
- [ ] List is scrollable if > 5 sources

### Email Modal Integration
- [ ] Modal opens with selected source email
- [ ] Source navigation header shows "Source X of Y"
- [ ] Prev/Next buttons navigate between sources
- [ ] Buttons disabled at boundaries (first/last source)
- [ ] Keyboard shortcuts work (←/→ for navigation)
- [ ] Modal closes on Esc or outside click

### Backend
- [ ] Search API returns `sources` array for each item
- [ ] Grouping API used for deduplication
- [ ] Sources include all required fields (email_id, sender, subject, date)
- [ ] Sources sorted by received_at descending
- [ ] Performance: Search with grouping < 500ms (p95)

### Visual Polish
- [ ] Badge colors match design (blue/purple/gradient)
- [ ] Viral badge has pulse animation
- [ ] Hover effects on all interactive elements
- [ ] Smooth transitions and animations
- [ ] Responsive design (mobile, tablet, desktop)

### Performance
- [ ] Badge renders without layout shift
- [ ] Source list expands smoothly (no jank)
- [ ] Email modal opens in < 300ms
- [ ] Source navigation feels instant (< 100ms)
- [ ] No memory leaks when opening/closing modal repeatedly

### Accessibility
- [ ] Badge has proper ARIA labels
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces source count
- [ ] Focus management in modal
- [ ] Color contrast meets WCAG AA

---

## Implementation Phases

### Phase 1: Backend Deduplication (2 hours)
- [ ] Update search service to use Grouping API
- [ ] Add `_get_sources_for_canonical_item` method
- [ ] Update API response to include `sources` array
- [ ] Test with existing data

### Phase 2: Core UI Components (3 hours)
- [ ] Create `DuplicateSourceBadge` component
- [ ] Create `SourceListItem` component
- [ ] Add expand/collapse functionality
- [ ] Implement badge variants (moderate/popular/viral)
- [ ] Add to content cards

### Phase 3: Email Modal Integration (2 hours)
- [ ] Extend EmailModal with source navigation
- [ ] Add Prev/Next buttons
- [ ] Implement keyboard shortcuts
- [ ] Connect to DuplicateSourceBadge

### Phase 4: Visual Polish (2 hours)
- [ ] Add animations (pulse, expand/collapse)
- [ ] Implement hover effects
- [ ] Mobile responsive design
- [ ] Loading and empty states
- [ ] Accessibility improvements

### Phase 5: Testing & Optimization (1 hour)
- [ ] Test with various source counts (1, 2, 5, 10+)
- [ ] Performance testing (search, modal)
- [ ] Cross-browser testing
- [ ] Mobile testing
- [ ] Edge case handling

---

## Metrics to Track

- **Duplicate Discovery:** % of users who expand duplicate badges
- **Source Exploration:** Average # of sources viewed per session
- **Email Modal Usage:** % of source views that open email modal
- **Source Navigation:** Average # of source navigations per modal session
- **Deduplication Rate:** % of search results that are duplicates
- **Performance:** p95 latency for search with grouping

---

## Related Work

- **F-008:** Source Email Modal (base modal implementation)
- **Phase 4:** Qdrant Grouping API (backend deduplication)
- **Deduplicator Service:** `app/services/deduplicator.py`
- **UX Research:** Deduplication flow in `primary_ux_research_dia.md`

---

## Demo Script

**For Hackathon Presentation:**

1. **Show the problem:**
   - "Here's a typical search result - notice how 'NeurIPS 2025' appears multiple times from different newsletters"
   - "This creates noise and makes it hard to see what's actually important"

2. **Reveal the solution:**
   - "With FeedPrism's deduplication, we use Qdrant's Grouping API to automatically detect duplicates"
   - "See this badge? 'Seen in 5 sources' - this tells us this event is popular across multiple newsletters"

3. **Demonstrate source tracking:**
   - "Click to expand and see all the sources"
   - "Each source shows which newsletter mentioned it and when"
   - "Click 'View Email' to see the original email from any source"

4. **Show source navigation:**
   - "In the modal, you can navigate between all 5 sources"
   - "Use the Prev/Next buttons or keyboard arrows"
   - "This gives you complete provenance - you can verify the information from multiple sources"

5. **Highlight the tech:**
   - "This is powered by Qdrant's Grouping API with canonical item IDs"
   - "We compute deterministic hashes for deduplication"
   - "Vector similarity ensures we catch near-duplicates too"
   - "All sources are tracked and searchable"

---

## Success Criteria

This feature is successful if:
- ✅ Users can clearly see which content is duplicated
- ✅ Source count provides social proof of content importance
- ✅ Users can easily view all source emails for verification
- ✅ Deduplication reduces visual clutter in search results
- ✅ Demonstrates advanced Qdrant features for hackathon judges
- ✅ Performance remains fast (< 500ms search with grouping)
