# F-009: Source Icon Overlay

## Problem
Content items are extracted from emails (currently Gmail only), but there's no visual indicator showing the **source platform**. Users cannot quickly identify that content came from Gmail vs other potential sources (Outlook, Apple Mail, etc. in the future). This reduces trust and makes it harder to understand the provenance of extracted content.

## Goal
- Add a **Gmail icon overlay** to content items that were extracted from Gmail
- Display the icon in multiple locations: content cards, detail views, source email lists
- Design the system to be **extensible** for future email sources (Outlook, Apple Mail, etc.)
- Keep the icon subtle but recognizable
- Maintain visual consistency across all views

---

## Visual Design

### Icon Placement Examples

#### 1. Content Card (Top-Right Corner)
```
┌────────────────────────────────────────────────────┐
│  📅 Advanced NLP Workshop 2024          [Gmail]   │ ← Icon here
│  Dec 15, 2024 • 10:00 AM - 4:00 PM                │
│                                                    │
│  📧 AI Weekly Newsletter                           │
│  #NLP #Workshop #HandsOn                           │
│                                                    │
│  [View Details]  [View Source Email]              │
└────────────────────────────────────────────────────┘
```

#### 2. Detail View (Next to Title)
```
┌────────────────────────────────────────────────────┐
│  📅 Advanced NLP Workshop 2024  [Gmail]           │ ← Icon here
│  ──────────────────────────────────────────────   │
│                                                    │
│  Dec 15, 2024 • 10:00 AM - 4:00 PM                │
│  Location: Online                                  │
│  ...                                               │
└────────────────────────────────────────────────────┘
```

#### 3. Source Email List (Before Sender Name)
```
┌────────────────────────────────────────────────────┐
│  📧 Seen in 3 sources                    [Expand] │
│  ├─ [Gmail] AI Weekly (Nov 28) [View Email]      │ ← Icon here
│  ├─ [Gmail] O'Reilly (Nov 27) [View Email]       │ ← Icon here
│  └─ [Gmail] TechCrunch (Nov 26) [View Email]     │ ← Icon here
└────────────────────────────────────────────────────┘
```

#### 4. Email Modal Header
```
┌──────────────────────────────────────────────────────────────┐
│  ✕                                                  [Gmail]  │ ← Icon here
│  ┌────────────────────────────────────────────────────────┐  │
│  │  From: AI Weekly <newsletter@aiweekly.co>              │  │
│  │  To: dishant@example.com                               │  │
│  │  Subject: The Rise of Agents...                        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

#### 5. Feed View (Prism Overview)
```
┌────────────────────────────────────────────────────┐
│  📨 AI Weekly | The Rise of...            [Gmail] │ ← Icon here
│  📨 O'Reilly | Summary: Ana...            [Gmail] │ ← Icon here
│  📨 TechCrunch | Blog: Under...           [Gmail] │ ← Icon here
└────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Frontend Components

#### 1. SourceIcon Component
```tsx
// src/components/SourceIcon/SourceIcon.tsx
type EmailSource = 'gmail' | 'outlook' | 'apple_mail' | 'other';

interface SourceIconProps {
  source: EmailSource;
  size?: 'sm' | 'md' | 'lg';      // 16px, 20px, 24px
  variant?: 'badge' | 'inline';    // Badge (with bg) or inline icon
  showLabel?: boolean;             // Show "Gmail" text next to icon
  className?: string;
}

const SourceIcon: React.FC<SourceIconProps> = ({
  source,
  size = 'md',
  variant = 'badge',
  showLabel = false,
  className
}) => {
  const iconConfig = {
    gmail: {
      icon: GmailIcon,           // SVG component
      color: '#EA4335',          // Gmail red
      label: 'Gmail'
    },
    outlook: {
      icon: OutlookIcon,
      color: '#0078D4',          // Outlook blue
      label: 'Outlook'
    },
    apple_mail: {
      icon: AppleMailIcon,
      color: '#007AFF',          // Apple blue
      label: 'Mail'
    },
    other: {
      icon: EmailIcon,
      color: '#787774',          // Neutral gray
      label: 'Email'
    }
  };

  const config = iconConfig[source];
  const Icon = config.icon;

  const sizeMap = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <div 
      className={`source-icon source-icon-${variant} source-icon-${size} ${className}`}
      title={config.label}
    >
      <Icon 
        size={sizeMap[size]} 
        color={config.color}
      />
      {showLabel && <span className="source-label">{config.label}</span>}
    </div>
  );
};

export default SourceIcon;
```

#### 2. Gmail Icon SVG
```tsx
// src/components/SourceIcon/icons/GmailIcon.tsx
interface GmailIconProps {
  size?: number;
  color?: string;
}

const GmailIcon: React.FC<GmailIconProps> = ({ 
  size = 20, 
  color = '#EA4335' 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Simplified Gmail logo */}
    <path 
      d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.69 2.28 24 3.434 24 5.457z" 
      fill={color}
    />
  </svg>
);

export default GmailIcon;
```

### Backend API Updates

#### Add Source Field to Items
```python
# app/models/extraction.py
class ExtractedItem(BaseModel):
    # ... existing fields
    source_platform: str = "gmail"  # Default to gmail
    source_email_id: str
    source_link: str  # Gmail link or other platform link
```

#### Database Schema
```sql
-- Add source_platform column to items table
ALTER TABLE items 
ADD COLUMN source_platform VARCHAR(50) DEFAULT 'gmail';

-- Index for filtering by source
CREATE INDEX idx_items_source_platform ON items(source_platform);

-- Update existing rows
UPDATE items SET source_platform = 'gmail' WHERE source_platform IS NULL;
```

### Data Model

```typescript
// src/types/item.ts
interface Item {
  id: string;
  title: string;
  type: 'event' | 'course' | 'blog' | 'action';
  // ... other fields
  
  // Source information
  source_platform: 'gmail' | 'outlook' | 'apple_mail' | 'other';
  source_email_id: string;
  source_sender: string;
  source_link: string;
}
```

---

## UX Specifications

### Visual Styles

#### Badge Variant (Default)
```css
.source-icon-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 2px 6px;
  transition: all 150ms ease;
}

.source-icon-badge:hover {
  background: var(--color-bg-tertiary);
  border-color: var(--color-border-hover);
}

.source-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-left: 4px;
}
```

#### Inline Variant (Icon Only)
```css
.source-icon-inline {
  display: inline-flex;
  align-items: center;
  opacity: 0.8;
  transition: opacity 150ms ease;
}

.source-icon-inline:hover {
  opacity: 1;
}
```

#### Size Variants
```css
.source-icon-sm {
  /* 16px icon */
}

.source-icon-md {
  /* 20px icon (default) */
}

.source-icon-lg {
  /* 24px icon */
}
```

### Placement Guidelines

| Location | Variant | Size | Show Label | Position |
|----------|---------|------|------------|----------|
| Content Card | Badge | sm | No | Top-right corner |
| Detail View | Badge | md | Yes | Next to title |
| Source Email List | Inline | sm | No | Before sender name |
| Email Modal | Badge | md | Yes | Top-right of header |
| Feed View | Inline | sm | No | After sender name |
| Filter Dropdown | Inline | sm | No | Before sender avatar |

### Color Palette

```css
:root {
  /* Gmail */
  --source-gmail-color: #EA4335;
  --source-gmail-bg: #FDECEA;
  
  /* Outlook (future) */
  --source-outlook-color: #0078D4;
  --source-outlook-bg: #E8F4FD;
  
  /* Apple Mail (future) */
  --source-apple-color: #007AFF;
  --source-apple-bg: #E8F4FD;
  
  /* Other/Unknown */
  --source-other-color: #787774;
  --source-other-bg: #F7F6F3;
}
```

---

## Usage Examples

### In Content Card Component
```tsx
// src/components/ContentCard.tsx
import SourceIcon from './SourceIcon/SourceIcon';

const ContentCard: React.FC<{ item: Item }> = ({ item }) => (
  <div className="content-card">
    <div className="card-header">
      <TypeBadge type={item.type} />
      <SourceIcon 
        source={item.source_platform} 
        size="sm" 
        variant="badge"
      />
    </div>
    <h3>{item.title}</h3>
    {/* ... rest of card */}
  </div>
);
```

### In Detail View
```tsx
// src/components/DetailView.tsx
const DetailView: React.FC<{ item: Item }> = ({ item }) => (
  <div className="detail-view">
    <div className="detail-header">
      <h1>{item.title}</h1>
      <SourceIcon 
        source={item.source_platform} 
        size="md" 
        variant="badge"
        showLabel={true}
      />
    </div>
    {/* ... rest of detail */}
  </div>
);
```

### In Source Email List
```tsx
// src/components/SourceEmailsList.tsx
const SourceEmailsList: React.FC<{ sources: Source[] }> = ({ sources }) => (
  <div className="source-emails-list">
    {sources.map(source => (
      <div key={source.emailId} className="source-item">
        <SourceIcon 
          source={source.platform} 
          size="sm" 
          variant="inline"
        />
        <span className="sender">{source.sender}</span>
        <span className="date">{source.date}</span>
        <button>View Email</button>
      </div>
    ))}
  </div>
);
```

---

## Future Extensibility

### Supporting Multiple Email Sources

When adding support for Outlook, Apple Mail, etc.:

1. **Add new icon SVG component**
   ```tsx
   // src/components/SourceIcon/icons/OutlookIcon.tsx
   const OutlookIcon: React.FC<IconProps> = ({ size, color }) => (
     <svg>{/* Outlook logo */}</svg>
   );
   ```

2. **Update iconConfig in SourceIcon component**
   ```tsx
   const iconConfig = {
     gmail: { ... },
     outlook: { 
       icon: OutlookIcon,
       color: '#0078D4',
       label: 'Outlook'
     },
     // ... more sources
   };
   ```

3. **Update backend to detect source**
   ```python
   def detect_email_source(email_headers: dict) -> str:
       # Check X-Mailer or Received headers
       if 'gmail' in email_headers.get('Received', '').lower():
           return 'gmail'
       elif 'outlook' in email_headers.get('X-Mailer', '').lower():
           return 'outlook'
       # ... more detection logic
       return 'other'
   ```

4. **No frontend changes needed** - SourceIcon component automatically handles new sources

---

## Edge Cases & Considerations

### 1. Unknown Source
- **Problem:** Email source cannot be determined
- **Solution:** Use generic email icon with gray color

### 2. Multiple Sources (Canonical Items)
- **Problem:** Same item from Gmail and Outlook
- **Solution:** Show both icons, or show "Multiple sources" badge

### 3. Icon Accessibility
- **Problem:** Color-blind users can't distinguish sources
- **Solution:** 
  - Always include `title` attribute with source name
  - Optionally show label text on hover
  - Use distinct icon shapes (not just colors)

### 4. Icon Loading Performance
- **Problem:** SVG icons slow down page load
- **Solution:** 
  - Inline SVGs (no HTTP requests)
  - Use React.memo for icon components
  - Consider icon sprite sheet for many icons

### 5. Mobile View
- **Problem:** Icons too small on mobile
- **Solution:** 
  - Increase size on mobile (sm → md)
  - Show label on tap/long-press
  - Ensure 44px minimum tap target

---

## Acceptance Criteria

### Visual Design
- [ ] Gmail icon displays in all specified locations
- [ ] Icon uses official Gmail red color (#EA4335)
- [ ] Badge variant has subtle background and border
- [ ] Inline variant is icon-only, no background
- [ ] Icon sizes: 16px (sm), 20px (md), 24px (lg)
- [ ] Hover state shows tooltip with source name

### Component Implementation
- [ ] SourceIcon component created with all variants
- [ ] GmailIcon SVG component created
- [ ] Component accepts source, size, variant, showLabel props
- [ ] Component is extensible for future sources

### Integration
- [ ] Icon appears on content cards (top-right)
- [ ] Icon appears in detail view (next to title)
- [ ] Icon appears in source email list (before sender)
- [ ] Icon appears in email modal (header)
- [ ] Icon appears in feed view (after sender)

### Backend
- [ ] source_platform field added to items table
- [ ] All existing items updated with 'gmail' source
- [ ] API returns source_platform in item responses

### Accessibility
- [ ] Icon has title attribute (e.g., "Gmail")
- [ ] Icon has proper ARIA label
- [ ] Color contrast meets WCAG AA (icon + background)
- [ ] Icon visible in high contrast mode

### Performance
- [ ] SVG icons inline (no HTTP requests)
- [ ] Icon components memoized
- [ ] No layout shift when icons load

### Future Extensibility
- [ ] Code structure supports adding new sources
- [ ] Documentation for adding new source icons
- [ ] iconConfig easily extendable

---

## Implementation Phases

### Phase 1: Core Implementation
- [ ] Create SourceIcon component
- [ ] Create GmailIcon SVG
- [ ] Add source_platform to database
- [ ] Update API to return source_platform
- [ ] Add icon to content cards

### Phase 2: Full Integration
- [ ] Add icon to detail view
- [ ] Add icon to source email list
- [ ] Add icon to email modal
- [ ] Add icon to feed view
- [ ] Add hover tooltips

### Phase 3: Polish & Extensibility
- [ ] Add Outlook/Apple Mail icons (placeholder)
- [ ] Add source detection logic (future)
- [ ] Performance optimizations
- [ ] Mobile responsive adjustments
- [ ] Accessibility audit

---

## Metrics to Track

- **Visibility:** % of users who notice source icons
- **Understanding:** % of users who understand icon meaning (user testing)
- **Clicks:** Click-through rate on source icons (if clickable)

---

## Related Work

- **F-008:** Source Email Modal (icon appears in modal header)
- **F-007:** Filter by Sender (icon appears in sender dropdown)
- **F-004:** Blog View Enhancement (icon appears in blog cards)
- **UX Research:** Provenance flow (visual_design_improvements.md)

---

## Design Reference

**Gmail Brand Colors:**
- Primary: `#EA4335` (Red)
- Secondary: `#4285F4` (Blue)
- Tertiary: `#34A853` (Green)
- Quaternary: `#FBBC04` (Yellow)

**Icon Style:**
- Simplified Gmail envelope logo
- Flat design (no gradients)
- Single color or multi-color (use single for consistency)
- 24x24px artboard (scales to 16px, 20px, 24px)

**Tooltip Text:**
- "From Gmail" (not just "Gmail")
- Shows on hover, 200ms delay
- Positioned above icon
- Dark background, white text
