# F-007: Filter by Sender with Human-Readable Names

## Problem
Users want to filter content by sender (newsletter, company, person), but email addresses like `newsletter@aiweekly.co` are not user-friendly. The UI should show recognizable names like "AI Weekly" while using email addresses internally for filtering accuracy.

## Goal
- Add a "Sender" filter to the Command Bar and Filter Bar
- Display **human-readable sender names** (e.g., "AI Weekly", "O'Reilly Media")
- Use **email addresses** internally for filtering and API queries
- Handle sender name extraction and normalization automatically
- Support multi-sender filtering

---

## User Flow

### 1. Sender Filter in Command Bar

**Command Bar (⌘K):**
```
┌──────────────────────────────────────────────────────┐
│  🔍  Search commands, content, or type a query...   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  FILTERS                                             │
│  ├─ sender:ai-weekly                                │
│  ├─ sender:oreilly                                  │
│  ├─ sender:techcrunch                               │
│  └─ sender:product-hunt                             │
│                                                      │
│  📧 TOP SENDERS                             [▼]     │
│  ├─ AI Weekly (45)                                  │
│  ├─ O'Reilly Media (32)                             │
│  ├─ TechCrunch (28)                                 │
│  ├─ Product Hunt (19)                               │
│  ├─ MIT Technology Review (15)                      │
│  └─ Show all (12 more) →                           │
└──────────────────────────────────────────────────────┘
```

### 2. Sender Filter in Filter Bar

**Filter Bar:**
```
┌──────────────────────────────────────────────────────┐
│  [Type: All ▾]  [Status: Any ▾]  [Sender: Any ▾]    │
│                                                      │
│  Sender dropdown:                                    │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🔍 Search senders...                           │ │
│  ├────────────────────────────────────────────────┤ │
│  │ ✓ AI Weekly (45)                               │ │
│  │   O'Reilly Media (32)                          │ │
│  │   TechCrunch (28)                              │ │
│  │   Product Hunt (19)                            │ │
│  │   ─────────────────────                        │ │
│  │   Show all senders →                           │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 3. Active Sender Filter

**Library View with Active Sender Filter:**
```
┌──────────────────────────────────────────────────────┐
│  Active Filters:                                     │
│  [Type: All ▾]  [📧 AI Weekly ×]  [📧 O'Reilly ×]   │
│                                                      │
│  Showing 77 items from AI Weekly, O'Reilly Media     │
└──────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Frontend Components

#### 1. SenderFilter Component
```tsx
// src/components/Filters/SenderFilter.tsx
interface Sender {
  email: string;              // "newsletter@aiweekly.co"
  displayName: string;        // "AI Weekly"
  normalizedName: string;     // "ai-weekly" (for search)
  count: number;              // # of items from this sender
  avatar?: string;            // Optional logo/icon URL
}

interface SenderFilterProps {
  senders: Sender[];
  selectedSenders: string[];  // Array of email addresses
  onToggleSender: (email: string) => void;
  onClearAll: () => void;
}

// Features:
// - Search box to filter sender list
// - Multi-select with checkboxes
// - Show top 10 by default, "Show all" for full list
// - Display name + count badge
// - Clear all button
```

#### 2. SenderPill Component
```tsx
// src/components/SenderPill.tsx
interface SenderPillProps {
  displayName: string;        // "AI Weekly"
  email: string;              // "newsletter@aiweekly.co"
  onRemove: (email: string) => void;
  avatar?: string;
}

// Renders as: [📧 AI Weekly ×]
// Click × to remove filter
```

### Backend API

#### 1. Get All Senders
```http
GET /api/senders

Response:
{
  "senders": [
    {
      "email": "newsletter@aiweekly.co",
      "display_name": "AI Weekly",
      "normalized_name": "ai-weekly",
      "count": 45,
      "avatar": "https://..."
    },
    {
      "email": "newsletters@oreilly.com",
      "display_name": "O'Reilly Media",
      "normalized_name": "oreilly-media",
      "count": 32,
      "avatar": null
    },
    ...
  ],
  "total": 17
}
```

#### 2. Filter by Sender(s)
```http
GET /api/search?senders=newsletter@aiweekly.co,newsletters@oreilly.com&type=event

Response:
{
  "items": [...],
  "total": 77,
  "filters_applied": {
    "senders": [
      {
        "email": "newsletter@aiweekly.co",
        "display_name": "AI Weekly"
      },
      {
        "email": "newsletters@oreilly.com",
        "display_name": "O'Reilly Media"
      }
    ],
    "type": "event"
  }
}
```

### Database Schema

```sql
-- Add sender_display_name to items table
ALTER TABLE items 
ADD COLUMN sender_email VARCHAR(255),
ADD COLUMN sender_display_name VARCHAR(255),
ADD COLUMN sender_normalized_name VARCHAR(255);

-- Index for fast filtering
CREATE INDEX idx_items_sender_email ON items(sender_email);
CREATE INDEX idx_items_sender_normalized ON items(sender_normalized_name);

-- Query to get all senders with counts
SELECT 
  sender_email,
  sender_display_name,
  sender_normalized_name,
  COUNT(*) as count
FROM items
WHERE sender_email IS NOT NULL
GROUP BY sender_email, sender_display_name, sender_normalized_name
ORDER BY count DESC;
```

### Sender Name Extraction Logic

**Backend Service:**
```python
# app/services/sender_extractor.py
import re
from email.utils import parseaddr

def extract_sender_info(from_header: str) -> dict:
    """
    Extract display name and email from email From header.
    
    Examples:
    - "AI Weekly <newsletter@aiweekly.co>" 
      → display_name: "AI Weekly", email: "newsletter@aiweekly.co"
    
    - "newsletter@aiweekly.co" 
      → display_name: "AI Weekly", email: "newsletter@aiweekly.co"
    
    - "O'Reilly Media Newsletters <newsletters@oreilly.com>"
      → display_name: "O'Reilly Media", email: "newsletters@oreilly.com"
    """
    # Parse email header
    display_name, email = parseaddr(from_header)
    
    # If no display name, extract from email domain
    if not display_name or display_name == email:
        display_name = extract_name_from_email(email)
    
    # Normalize for search
    normalized_name = normalize_sender_name(display_name)
    
    return {
        "email": email.lower(),
        "display_name": clean_display_name(display_name),
        "normalized_name": normalized_name
    }

def extract_name_from_email(email: str) -> str:
    """
    Extract readable name from email address.
    
    Examples:
    - "newsletter@aiweekly.co" → "AI Weekly"
    - "hello@techcrunch.com" → "TechCrunch"
    - "noreply@producthunt.com" → "Product Hunt"
    """
    # Get domain without TLD
    domain = email.split('@')[1].split('.')[0]
    
    # Known mappings (can be extended)
    DOMAIN_MAPPINGS = {
        'aiweekly': 'AI Weekly',
        'oreilly': "O'Reilly Media",
        'techcrunch': 'TechCrunch',
        'producthunt': 'Product Hunt',
        'mittr': 'MIT Technology Review',
        # ... more mappings
    }
    
    if domain in DOMAIN_MAPPINGS:
        return DOMAIN_MAPPINGS[domain]
    
    # Fallback: capitalize domain
    return domain.replace('-', ' ').replace('_', ' ').title()

def clean_display_name(name: str) -> str:
    """
    Clean up display name (remove extra quotes, whitespace, etc.)
    """
    name = name.strip().strip('"').strip("'")
    name = re.sub(r'\s+', ' ', name)  # Normalize whitespace
    return name

def normalize_sender_name(name: str) -> str:
    """
    Normalize for search (lowercase, no special chars, hyphenated)
    
    Examples:
    - "AI Weekly" → "ai-weekly"
    - "O'Reilly Media" → "oreilly-media"
    """
    name = name.lower()
    name = re.sub(r"[^\w\s-]", '', name)  # Remove special chars
    name = re.sub(r'\s+', '-', name)      # Replace spaces with hyphens
    return name
```

### State Management

```tsx
// src/contexts/FiltersContext.tsx
interface FiltersContextType {
  // ... existing filters
  selectedSenders: string[];  // Array of email addresses
  availableSenders: Sender[];
  toggleSender: (email: string) => void;
  clearSenders: () => void;
  loadSenders: () => Promise<void>;
}

// URL state: ?senders=newsletter@aiweekly.co,newsletters@oreilly.com
```

---

## UX Specifications

### Visual Design

**Sender Filter Dropdown:**
```css
.sender-filter-dropdown {
  width: 320px;
  max-height: 400px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-dropdown);
  overflow-y: auto;
}

.sender-search-box {
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
}

.sender-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 100ms ease;
}

.sender-item:hover {
  background: var(--color-bg-tertiary);
}

.sender-item.selected {
  background: var(--color-primary-light);
}

.sender-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.sender-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sender-display-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.sender-email {
  font-size: 11px;
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}

.sender-count {
  font-size: 11px;
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}
```

**Sender Pill (Active Filter):**
```css
.sender-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 12px;
  padding: 4px 8px 4px 12px;
  font-size: 13px;
  font-weight: 500;
}

.sender-pill .icon {
  font-size: 14px;
}

.sender-pill .remove-btn {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: background 100ms ease;
}

.sender-pill .remove-btn:hover {
  background: var(--color-primary);
  color: white;
}
```

### Sender Avatar Fallback

**When no avatar URL:**
```tsx
// Show first letter of display name in colored circle
const getAvatarColor = (email: string) => {
  const colors = [
    '#EB5757', '#F2994A', '#F2C94C', '#219653', 
    '#27AE60', '#6FCF97', '#2F80ED', '#2D9CDB',
    '#56CCF2', '#9B51E0', '#BB6BD9'
  ];
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Render:
<div 
  className="sender-avatar" 
  style={{ backgroundColor: getAvatarColor(sender.email) }}
>
  {sender.displayName[0].toUpperCase()}
</div>
```

---

## Edge Cases & Considerations

### 1. Duplicate Sender Names
- **Problem:** "Newsletter" from different companies
- **Solution:** Show email on hover, use email as unique identifier internally

### 2. Missing Display Names
- **Problem:** Email has no display name in From header
- **Solution:** Extract from domain using `DOMAIN_MAPPINGS` or capitalize domain

### 3. Sender Name Changes
- **Problem:** Newsletter rebrands (e.g., "AI Weekly" → "AI Insights")
- **Solution:** 
  - Store sender info per email, not per item
  - Update display name when new emails arrive
  - Keep historical data consistent

### 4. Multiple Emails from Same Sender
- **Problem:** O'Reilly uses multiple email addresses
- **Solution:** 
  - Group by normalized name in UI
  - Store all email variants
  - "Merge senders" feature (future)

### 5. Search Performance
- **Problem:** Searching through 100+ senders
- **Solution:** 
  - Client-side search (fast for < 1000 senders)
  - Debounce search input (300ms)
  - Index `sender_normalized_name` for backend search

### 6. Sender Filter + Tag Filter
- **Problem:** User selects sender + tag, gets no results
- **Solution:** 
  - Show "No results" with suggestion
  - "Try removing filters" button
  - Show count preview before applying filter

---

## Acceptance Criteria

### Sender Extraction
- [ ] Display names extracted from email From header
- [ ] Fallback to domain-based name if no display name
- [ ] Email addresses normalized to lowercase
- [ ] Sender info stored in database on ingestion
- [ ] `DOMAIN_MAPPINGS` covers top 20 newsletters

### UI Components
- [ ] Sender filter dropdown in Filter Bar
- [ ] Search box to filter sender list
- [ ] Multi-select with checkboxes
- [ ] Display name + email (on hover) + count badge
- [ ] Avatar (logo or first letter with color)
- [ ] "Show all" link if > 10 senders
- [ ] Selected senders appear as pills in filter bar
- [ ] Click × to remove sender filter

### Command Bar Integration
- [ ] "📧 Top Senders" section in Command Bar
- [ ] Shows top 10 senders by count
- [ ] Click sender → filters Library view
- [ ] Keyboard navigation (↑/↓ arrows)

### Filtering Logic
- [ ] Single sender: Show items from that sender
- [ ] Multiple senders: OR logic (items from ANY selected sender)
- [ ] Combined with other filters: AND logic
- [ ] URL reflects active sender filters
- [ ] Filter count updates in real-time

### Backend
- [ ] GET /api/senders endpoint
- [ ] Sender info included in search results
- [ ] Database columns: sender_email, sender_display_name, sender_normalized_name
- [ ] Indexes on sender columns
- [ ] Sender extraction runs on email ingestion

### Performance
- [ ] Sender list loads in < 500ms
- [ ] Search with sender filter returns in < 1s
- [ ] Client-side sender search responds instantly

### Accessibility
- [ ] Dropdown keyboard-navigable (↑/↓, Enter, Esc)
- [ ] ARIA labels on checkboxes and buttons
- [ ] Screen reader announces selected senders
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA

---

## Implementation Phases

### Phase 1: Core Functionality
- [ ] Sender extraction logic in backend
- [ ] Database schema updates
- [ ] GET /api/senders endpoint
- [ ] SenderFilter component (basic dropdown)
- [ ] Single sender filtering

### Phase 2: Enhanced UX
- [ ] Multi-sender filtering (OR logic)
- [ ] Sender search box
- [ ] Avatar fallback (first letter + color)
- [ ] Sender pills in filter bar
- [ ] Command Bar integration

### Phase 3: Polish
- [ ] Logo/avatar URLs (optional)
- [ ] Domain mappings for top newsletters
- [ ] Sender grouping (future: merge duplicates)
- [ ] Performance optimizations
- [ ] Mobile responsive design

---

## Metrics to Track

- **Usage:** % of searches using sender filter
- **Adoption:** % of users who filter by sender at least once
- **Top Senders:** Most filtered senders (validate domain mappings)
- **Performance:** p95 latency for sender-filtered searches

---

## Related Work

- **F-005:** Search Bar Integration (sender filter works with search)
- **F-006:** Saved Tags Filtering (similar multi-select pattern)
- **Phase 1:** Email ingestion (sender extraction happens here)
