# FeedPrism Visual Design Improvements

## Overview
This document outlines specific visual design improvements for the FeedPrism dashboard, inspired by **Notion's clean minimalism** and **Arc Browser's spatial organization**. The design maintains the hackathon-critical Prism visualization while delivering a modern, distraction-free experience.

---

## Design Philosophy

### Notion Inspiration:
- **Clean typography** with generous whitespace
- **Subtle borders** instead of heavy shadows
- **Inline editing** feel with hover-to-reveal actions
- **Block-based** content organization
- **Muted color palette** with strategic accent colors

### Arc Browser Inspiration:
- **Collapsible sidebar** with spatial organization
- **Command palette** (⌘K) as primary navigation
- **Spaces/Folders** concept for content grouping
- **Pinned items** at top, flow items below
- **Minimal chrome** - content takes center stage
- **Smooth animations** and micro-interactions

---

## 1. Layout Architecture

### Design Principles:
- Content-first with minimal UI chrome
- Collapsible sections for progressive disclosure
- Spatial hierarchy inspired by Arc's sidebar
- Notion-like blocks for content cards

### Master Layout Structure:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  ┌─────────────┐  ┌────────────────────────────────────────────────────┐ │
│  │             │  │                                                    │ │
│  │  SIDEBAR    │  │  MAIN CONTENT AREA                                 │ │
│  │  (Arc-style)│  │                                                    │ │
│  │             │  │  ┌──────────────────────────────────────────────┐  │ │
│  │  ┌───────┐  │  │  │ 🔷 PRISM OVERVIEW (Collapsible)              │  │ │
│  │  │ 🔷    │  │  │  │    Recent Unread • Hackathon Visualization   │  │ │
│  │  │FeedPrism│ │  │  │    [Prism Flow Diagram with Categories]     │  │ │
│  │  └───────┘  │  │  │    Events(15) Courses(8) Blogs(22) Actions(6)│  │ │
│  │             │  │  └──────────────────────────────────────────────┘  │ │
│  │  ⌘K Search  │  │                                                    │ │
│  │             │  │  ┌──────────────────────────────────────────────┐  │ │
│  │  ──────────  │  │  │ COMMAND BAR (Notion-style)                  │  │ │
│  │             │  │  │ 🔍 Search your feed...              ⌘K      │  │ │
│  │  📍 PINNED  │  │  └──────────────────────────────────────────────┘  │ │
│  │  ├─ 🏠 Home │  │                                                    │ │
│  │  ├─ ⚡Actions│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  └─ 📊Metrics│  │  │ FILTER BAR                                   │  │ │
│  │             │  │  │ [Type ▾] [Status ▾] [Sender ▾] [Date ▾]      │  │ │
│  │  ──────────  │  │  │                          Sort: Relevance ▾  │  │ │
│  │             │  │  └──────────────────────────────────────────────┘  │ │
│  │  📂 SPACES  │  │                                                    │ │
│  │  ├─ 📅Events│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  ├─ 📚Courses│ │  │ INTELLIGENT FEED (Notion-style blocks)       │  │ │
│  │  ├─ 📝Blogs │  │  │                                              │  │ │
│  │  └─ 🏷️Themes│  │  │  ┌────────────────────────────────────────┐  │  │ │
│  │             │  │  │  │ 📨 AI Weekly #145           9:41 AM   │  │  │ │
│  │  ──────────  │  │  │  │ The Rise of Agents...                │  │  │ │
│  │             │  │  │  │ ─────────────────────────────────────  │  │  │ │
│  │  📥 Raw     │  │  │  │ 📅 Webinar: Agentic Workflows [Reg]   │  │  │ │
│  │     Inbox   │  │  │  │ 📝 Blog: Understanding AutoGPT        │  │  │ │
│  │             │  │  │  │ ⚡ Action: Register (Due Tomorrow)    │  │  │ │
│  │  ──────────  │  │  │  └────────────────────────────────────────┘  │  │ │
│  │             │  │  │                                              │  │ │
│  │  ⚙️ Settings│  │  │  ┌────────────────────────────────────────┐  │  │ │
│  │  👤 Account │  │  │  │ 📨 O'Reilly Data News        8:30 AM  │  │  │ │
│  │             │  │  │  │ Summary: Analysis of new age...       │  │  │ │
│  └─────────────┘  │  │  └────────────────────────────────────────┘  │  │ │
│                   │  │                                              │  │ │
│                   │  └──────────────────────────────────────────────┘  │ │
│                   └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Prism Overview Section (Hackathon Visualization)

### Purpose:
This collapsible section showcases the core FeedPrism concept - transforming raw email feeds through a "prism" into organized categories. **Critical for hackathon demo.**

### Design Specifications:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ▼ Recent Unread (Last 3 Days)                              [Collapse ▲]  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────┐         ┌──────────────────────────┐  │
│  │                                 │         │                          │  │
│  │  📨 AI Weekly | The Rise of...  │         │   📅 Events (15)    →    │  │
│  │  📨 AI Weekly | New models...   │    🔷   │   📚 Courses (8)    →    │  │
│  │  📨 O'Reilly | Summary: Ana...  │  ═════► │   📝 Blogs (22)     →    │  │
│  │  📨 TechCrunch | Blog: Under... │  PRISM  │   ⚡ Actions (6)    →    │  │
│  │  📨 Product Hunt | Action:...   │         │                          │  │
│  │                                 │         │                          │  │
│  │  RAW EMAIL FEED                 │         │   ORGANIZED KNOWLEDGE    │  │
│  └─────────────────────────────────┘         └──────────────────────────┘  │
│                                                                            │
│  ────────────────────────────────────────────────────────────────────────  │
│  💡 FeedPrism extracted 51 items from 23 emails • Last sync: 2 min ago    │
└────────────────────────────────────────────────────────────────────────────┘
```

### Prism Visualization Styling:

**Left Panel (Raw Feed):**
- Background: `#f8fafc` (very light gray)
- Border: `1px solid #e2e8f0`
- Border-radius: `12px`
- Email items: Truncated with sender icon + subject preview
- Subtle stacking effect (3-5 visible items)

**Center Prism Element:**
- SVG prism icon with subtle gradient
- Animated light rays emanating to categories (CSS animation)
- Colors: Soft rainbow spectrum (not harsh)
- Pulse animation on hover

**Right Panel (Categories):**
- Each category as a clickable row
- Icon + Label + Count + Arrow
- Hover: Background highlight + slide arrow right
- Colors match category semantic colors

### Collapse Behavior:
- **Expanded (default on first visit):** Full visualization visible
- **Collapsed:** Single line showing "Recent: 23 unread → 51 items extracted"
- **Animation:** Smooth 300ms ease-out transition
- **Persistence:** Remember user's preference in localStorage

---

## 3. Color Palette (Notion + Arc Inspired)

### Light Mode - Primary Colors:
- **Sidebar Background**: `#FBFBFA` (Notion warm white)
- **Sidebar Hover**: `#F1F1EF` (Notion hover gray)
- **Main Background**: `#FFFFFF` (Pure white)
- **Card Background**: `#FFFFFF` (White)
- **Card Border**: `#E8E8E6` (Notion border)
- **Primary Accent**: `#2383E2` (Notion blue)
- **Text Primary**: `#37352F` (Notion dark)
- **Text Secondary**: `#787774` (Notion gray)
- **Text Tertiary**: `#B4B4B0` (Notion light gray)

### Arc-Inspired Sidebar (Dark Variant):
- **Sidebar Background**: `#1C1C1E` (Arc dark)
- **Sidebar Hover**: `#2C2C2E` (Arc hover)
- **Sidebar Active**: `#3A3A3C` (Arc active)
- **Sidebar Text**: `#FFFFFF` (White)
- **Sidebar Text Muted**: `#8E8E93` (Arc gray)
- **Pinned Section**: `#FFD60A` accent dot

### Semantic Colors (Content Types):
- **Events**: `#EB5757` (Notion red) / `#FDECEA` (light bg)
- **Courses**: `#0F7B6C` (Notion teal) / `#DBEDEA` (light bg)
- **Blogs**: `#9065B0` (Notion purple) / `#EDE4F3` (light bg)
- **Actions**: `#D9730D` (Notion orange) / `#FAEBDD` (light bg)

### Status Colors:
- **Upcoming**: `#448361` (Notion green)
- **Past**: `#787774` (Notion gray)
- **Urgent**: `#E03E3E` (Notion red bold)
- **Success**: `#448361` (Green)

### Prism Gradient (for visualization):
```css
--prism-gradient: linear-gradient(
  135deg,
  #EB5757 0%,    /* Events - Red */
  #D9730D 25%,   /* Actions - Orange */
  #0F7B6C 50%,   /* Courses - Teal */
  #9065B0 75%,   /* Blogs - Purple */
  #2383E2 100%   /* Primary - Blue */
);
```

---

## 4. Typography (Notion-Inspired)

### Font Family:
```css
/* Notion uses system fonts for performance */
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 
                sans-serif;
--font-mono: 'SFMono-Regular', Menlo, Consolas, 'PT Mono', 'Liberation Mono', 
             Courier, monospace;

/* Alternative: Use Inter for slightly more modern feel */
--font-primary-alt: 'Inter', var(--font-primary);
```

### Type Scale (Notion-style):
| Element | Size | Weight | Line Height | Color |
|---------|------|--------|-------------|-------|
| Page Title | 40px | 700 | 1.2 | `#37352F` |
| Section Header | 24px | 600 | 1.3 | `#37352F` |
| Card Title | 16px | 600 | 1.4 | `#37352F` |
| Body Text | 16px | 400 | 1.5 | `#37352F` |
| Secondary Text | 14px | 400 | 1.5 | `#787774` |
| Caption/Meta | 12px | 400 | 1.4 | `#B4B4B0` |
| Badge/Tag | 12px | 500 | 1.0 | varies |

### Typography Principles:
- **No uppercase** except for very small labels
- **Generous line-height** for readability
- **Subtle weight differences** (400 vs 600, not 400 vs 800)
- **Muted colors** for secondary information

---

## 5. Component Specifications

### 5.1 Arc-Style Sidebar

```
┌─────────────────────────┐
│                         │
│  ┌───────────────────┐  │
│  │  🔷 FeedPrism     │  │  ← Logo area (compact)
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ 🔍 Search...  ⌘K  │  │  ← Command trigger
│  └───────────────────┘  │
│                         │
│  ─────────────────────  │  ← Subtle divider
│                         │
│  📍 PINNED              │  ← Section label (tiny, muted)
│  ├─ 🏠 Home             │
│  ├─ ⚡ Actions    (6)   │  ← Badge for pending
│  └─ 📊 Metrics          │
│                         │
│  ─────────────────────  │
│                         │
│  📂 SPACES              │
│  ├─ 📅 Events    (15)   │
│  ├─ 📚 Courses   (8)    │
│  ├─ 📝 Blogs     (22)   │
│  └─ 🏷️ Themes          │
│                         │
│  ─────────────────────  │
│                         │
│  📥 Raw Inbox           │  ← Secondary nav
│                         │
│  ─────────────────────  │
│                         │
│  ⚙️ Settings            │  ← Bottom pinned
│  👤 dishant@...         │  ← User avatar + email
│                         │
└─────────────────────────┘
```

**Sidebar Specifications:**
- Width: `240px` (collapsible to `60px` icon-only)
- Background: `#FBFBFA` (light) or `#1C1C1E` (dark variant)
- Border-right: `1px solid #E8E8E6`
- Padding: `12px`

**Nav Items:**
- Height: `32px`
- Padding: `6px 12px`
- Border-radius: `6px`
- Font: `14px`, weight `400`
- Icon: `18px`, margin-right `10px`
- Hover: Background `#F1F1EF`
- Active: Background `#E8E8E6`, font-weight `500`

**Section Labels:**
- Font: `11px`, weight `500`, color `#B4B4B0`
- Letter-spacing: `0.5px`
- Margin: `16px 0 8px 12px`

**Badges (counts):**
- Font: `11px`, weight `500`
- Background: `#F1F1EF`
- Padding: `2px 6px`
- Border-radius: `4px`
- Float right

### 5.2 Command Bar (Notion-style Search)

```
┌──────────────────────────────────────────────────────────────────┐
│  🔍  Search your feed...                                    ⌘K  │
└──────────────────────────────────────────────────────────────────┘
```

**Specifications:**
- Height: `40px`
- Background: `#F7F6F3` (Notion search bg)
- Border: `none` (borderless like Notion)
- Border-radius: `8px`
- Padding: `8px 12px`
- Font: `14px`, color `#787774` (placeholder)
- Icon: `16px`, color `#B4B4B0`
- Shortcut badge: `10px`, color `#B4B4B0`, background `#E8E8E6`

**Focus State:**
- Background: `#FFFFFF`
- Border: `1px solid #2383E2`
- Box-shadow: `0 0 0 3px rgba(35, 131, 226, 0.1)`

**Command Palette (on ⌘K):**
```
┌──────────────────────────────────────────────────────────────────┐
│  🔍  Search commands, content, or type a query...               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RECENT                                                          │
│  ├─ 📅 NLP Workshop 2024                                        │
│  ├─ 📚 Deep Learning Specialization                             │
│  └─ 📝 Understanding AutoGPT                                    │
│                                                                  │
│  QUICK ACTIONS                                                   │
│  ├─ ⚡ View pending actions                                      │
│  ├─ 📊 Open metrics dashboard                                   │
│  └─ 🔄 Sync emails now                                          │
│                                                                  │
│  FILTERS                                                         │
│  ├─ type:event                                                   │
│  ├─ status:upcoming                                              │
│  └─ sender:ai-weekly                                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 Filter Bar (Notion-style)

```
┌──────────────────────────────────────────────────────────────────┐
│  [+ Add filter]  Type: All ▾   Status: Any ▾   Sender: Any ▾    │
│                                                                  │
│                                          Sort: Relevance ▾      │
└──────────────────────────────────────────────────────────────────┘
```

**Filter Chips (Notion-style):**
- Height: `28px`
- Background: `transparent`
- Border: `1px solid #E8E8E6`
- Border-radius: `4px`
- Padding: `4px 8px`
- Font: `13px`, color `#37352F`
- Hover: Background `#F7F6F3`
- Active: Background `#E8F4FD`, border `#2383E2`, color `#2383E2`

**Add Filter Button:**
- Style: Ghost button with `+` icon
- Color: `#787774`
- Hover: Color `#37352F`

### 5.4 Feed Cards (Notion Block-style)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  🔴 AI Weekly                                    9:41 AM   │  │
│  │  ──────────────────────────────────────────────────────    │  │
│  │                                                            │  │
│  │  The Rise of Agents, new models from...                    │  │
│  │                                                            │  │
│  │  Summary: Analysis of new agentic models and their         │  │
│  │  applications in workflow automation.                      │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  📅  Webinar: Agentic Workflows        Nov 15        │  │  │
│  │  │      ─────────────────────────────────────────────   │  │  │
│  │  │      [Register]                                      │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  📝  Blog: Understanding AutoGPT                     │  │  │
│  │  │      ─────────────────────────────────────────────   │  │  │
│  │  │      [Read Summary]                                  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  ⚡  Action: Register for Webinar                    │  │  │
│  │  │      Due Tomorrow  ●                                 │  │  │
│  │  │      ─────────────────────────────────────────────   │  │  │
│  │  │      [Go to Action]                                  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ─────────────────────────────────────────────────────     │  │
│  │  → View Original Email                                     │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Card Container:**
- Background: `#FFFFFF`
- Border: `1px solid #E8E8E6`
- Border-radius: `8px`
- Padding: `16px 20px`
- Margin-bottom: `8px`
- Hover: Border `#D4D4D0`, subtle lift

**Card Header:**
- Sender icon: `20px` colored circle with initial or logo
- Sender name: `14px`, weight `600`, color `#37352F`
- Timestamp: `12px`, color `#B4B4B0`, float right
- Divider: `1px solid #E8E8E6`, margin `8px 0`

**Email Subject:**
- Font: `15px`, weight `500`, color `#37352F`
- Truncate with ellipsis if > 1 line

**Summary:**
- Font: `14px`, weight `400`, color `#787774`
- Max 2 lines, then truncate

**Extracted Items (Nested Blocks):**
- Background: `#F7F6F3`
- Border-radius: `6px`
- Padding: `12px`
- Margin: `8px 0`
- Icon: `16px`, colored by type
- Title: `14px`, weight `500`
- Meta (date/status): `12px`, color `#787774`
- Action button: Ghost style, `12px`, color `#2383E2`

**Urgency Indicator:**
- Due Tomorrow: Orange dot `●` + text color `#D9730D`
- Overdue: Red dot `●` + text color `#E03E3E`
- Upcoming: Green dot `●` + text color `#448361`

**Footer:**
- Divider: `1px solid #E8E8E6`
- "View Original Email": `13px`, color `#787774`, hover `#2383E2`
- Arrow icon `→` before text

### 5.5 Metrics Panel (Hackathon Dashboard)

```
┌────────────────────────────────────────────────────────────────┐
│  📊 Retrieval Metrics                              [Refresh]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Precision   │  │     MRR      │  │   Latency    │         │
│  │    @10       │  │              │  │     p95      │         │
│  │              │  │              │  │              │         │
│  │    0.82      │  │    0.68      │  │    650ms     │         │
│  │    ━━━━━━━   │  │    ━━━━━━    │  │    ━━━━━     │         │
│  │    ✓ Good    │  │    ✓ Good    │  │   ℹ Normal   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │  Dedup Rate  │  │    Items     │                           │
│  │              │  │   Indexed    │                           │
│  │              │  │              │                           │
│  │     34%      │  │     847      │                           │
│  │    ━━━━      │  │    ━━━━━━━   │                           │
│  │   ℹ Normal   │  │              │                           │
│  └──────────────┘  └──────────────┘                           │
│                                                                │
│  ─────────────────────────────────────────────────────────    │
│  Last sync: 2 min ago • Next: in 13 min                       │
└────────────────────────────────────────────────────────────────┘
```

**Panel Specifications:**
- Background: `#FFFFFF`
- Border: `1px solid #E8E8E6`
- Border-radius: `8px`
- Padding: `16px`
- Position: Can be sidebar panel or floating widget

**Metric Cards:**
- Background: `#F7F6F3`
- Border-radius: `6px`
- Padding: `12px`
- Min-width: `100px`

**Metric Values:**
- Value: `24px`, weight `600`, color `#37352F`
- Label: `11px`, weight `500`, color `#787774`
- Progress bar: `4px` height, colored by status
- Status: `11px`, with icon

**Status Colors:**
- Good (✓): `#448361`
- Normal (ℹ): `#787774`
- Warning (⚠): `#D9730D`
- Poor (✗): `#E03E3E`

### 5.6 Empty States & Loading

**Empty State:**
```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                         📭                                     │
│                                                                │
│              No items match your filters                       │
│                                                                │
│         Try adjusting your search or filters,                  │
│         or sync your inbox to fetch new emails.                │
│                                                                │
│                    [Clear Filters]                             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Loading Skeleton (Notion-style):**
```
┌────────────────────────────────────────────────────────────────┐
│  ┌────┐  ████████████████████                    ████          │
│  └────┘  ──────────────────────────────────────────────        │
│                                                                │
│          ████████████████████████████████████                  │
│          ████████████████████████                              │
│                                                                │
│          ┌──────────────────────────────────────────────────┐  │
│          │  ████████████████████████████                    │  │
│          └──────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

- Skeleton color: `#E8E8E6`
- Animation: Subtle shimmer (left to right)
- Duration: `1.5s` infinite

---

## 6. Iconography (Notion + Lucide)

### Recommended Icon Set: Lucide Icons
Lucide provides clean, consistent icons that match Notion's aesthetic.

### Icon Mapping:
| Element | Icon | Size | Color |
|---------|------|------|-------|
| Events | `calendar` | 16px | `#EB5757` |
| Courses | `graduation-cap` | 16px | `#0F7B6C` |
| Blogs | `file-text` | 16px | `#9065B0` |
| Actions | `zap` | 16px | `#D9730D` |
| Search | `search` | 16px | `#B4B4B0` |
| Filter | `filter` | 14px | `#787774` |
| Settings | `settings` | 18px | `#787774` |
| User | `user` | 18px | `#787774` |
| Expand | `chevron-down` | 14px | `#B4B4B0` |
| Collapse | `chevron-up` | 14px | `#B4B4B0` |
| External Link | `external-link` | 12px | `#787774` |
| Sync | `refresh-cw` | 16px | `#2383E2` |
| Home | `home` | 18px | `#787774` |
| Inbox | `inbox` | 18px | `#787774` |
| Metrics | `bar-chart-2` | 18px | `#787774` |

### Icon Principles:
- **Stroke width**: `1.5px` (Notion uses thin strokes)
- **No fill**: Outline icons only
- **Consistent sizing**: Match text line-height
- **Muted by default**: Color only for semantic meaning

---

## 7. Spacing System (8px Grid)

### Base Unit: 8px

```css
--space-0: 0px;
--space-1: 4px;    /* Tight: icon gaps */
--space-2: 8px;    /* Compact: inline elements */
--space-3: 12px;   /* Default: padding */
--space-4: 16px;   /* Comfortable: card padding */
--space-5: 20px;   /* Generous: section gaps */
--space-6: 24px;   /* Large: major sections */
--space-8: 32px;   /* XL: page margins */
--space-10: 40px;  /* 2XL: hero spacing */
--space-12: 48px;  /* 3XL: major breaks */
```

### Application (Notion-style):
| Element | Spacing |
|---------|---------|
| Card internal padding | `16px` |
| Card margin-bottom | `8px` |
| Section gap | `24px` |
| Sidebar item height | `32px` |
| Sidebar item padding | `6px 12px` |
| Filter chip gap | `8px` |
| Nested block margin | `8px` |
| Page margin (desktop) | `48px` |
| Page margin (mobile) | `16px` |

---

## 8. Borders & Dividers (Notion-style)

### Border Specifications:
```css
--border-default: 1px solid #E8E8E6;
--border-hover: 1px solid #D4D4D0;
--border-focus: 1px solid #2383E2;
--border-subtle: 1px solid #F1F1EF;
```

### Divider Styles:
- **Section divider**: `1px solid #E8E8E6`, full width
- **Inline divider**: `1px solid #F1F1EF`, with `16px` margin
- **Card divider**: `1px solid #E8E8E6`, `8px` margin top/bottom

### Border Radius:
```css
--radius-sm: 4px;   /* Buttons, chips */
--radius-md: 6px;   /* Cards, inputs */
--radius-lg: 8px;   /* Panels, modals */
--radius-full: 9999px; /* Avatars, pills */
```

---

## 9. Shadows & Elevation (Minimal)

Notion uses very subtle shadows. Arc uses almost none.

```css
/* Notion-style: Borders over shadows */
--shadow-none: none;
--shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06);
--shadow-dropdown: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-modal: 0 8px 24px rgba(0, 0, 0, 0.12);
```

### Usage:
| Element | Shadow |
|---------|--------|
| Cards at rest | `none` (use border) |
| Cards on hover | `--shadow-subtle` |
| Dropdowns | `--shadow-dropdown` |
| Command palette | `--shadow-modal` |
| Tooltips | `--shadow-card` |

---

## 10. Animations & Micro-interactions

### Timing Functions:
```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### Duration Scale:
```css
--duration-fast: 100ms;    /* Hover states */
--duration-normal: 200ms;  /* Transitions */
--duration-slow: 300ms;    /* Expand/collapse */
--duration-slower: 500ms;  /* Page transitions */
```

### Key Animations:

**Hover Effects (Notion-style - subtle):**
```css
.card {
  transition: border-color var(--duration-fast) var(--ease-default);
}
.card:hover {
  border-color: #D4D4D0;
}

.nav-item {
  transition: background-color var(--duration-fast) var(--ease-default);
}
.nav-item:hover {
  background-color: #F1F1EF;
}
```

**Collapse/Expand (Prism Section):**
```css
.collapsible-content {
  transition: height var(--duration-slow) var(--ease-out),
              opacity var(--duration-normal) var(--ease-default);
}
```

**Command Palette (Arc-style):**
```css
.command-palette {
  animation: slideUp var(--duration-normal) var(--ease-spring);
}
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

**Loading Shimmer:**
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    #E8E8E6 25%,
    #F1F1EF 50%,
    #E8E8E6 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### Interaction Principles:
- **Subtle over flashy**: Barely noticeable transitions
- **Fast feedback**: Hover states < 100ms
- **Smooth reveals**: Expand/collapse with easing
- **No bounce**: Avoid playful animations (not Notion's style)

---

## 11. Responsive Breakpoints

```css
--breakpoint-sm: 640px;   /* Mobile */
--breakpoint-md: 768px;   /* Tablet */
--breakpoint-lg: 1024px;  /* Desktop */
--breakpoint-xl: 1280px;  /* Large Desktop */
--breakpoint-2xl: 1536px; /* Wide Desktop */
```

### Responsive Behavior:

**Mobile (< 768px):**
- Sidebar: Hidden, accessible via hamburger menu (slide-in drawer)
- Prism Overview: Collapsed by default, expandable
- Feed: Single column, full width
- Command bar: Sticky at top
- Metrics: Hidden in sidebar drawer

**Tablet (768px - 1024px):**
- Sidebar: Collapsed to icons only (`60px`)
- Prism Overview: Visible, slightly condensed
- Feed: Single column with more padding
- Hover to expand sidebar

**Desktop (1024px - 1280px):**
- Sidebar: Full width (`240px`)
- Prism Overview: Full visualization
- Feed: Single column, comfortable width
- All panels visible

**Wide Desktop (> 1280px):**
- Sidebar: Full width (`240px`)
- Main content: Max-width `900px`, centered
- Optional: Metrics panel as right sidebar

---

## 12. Accessibility (WCAG AA)

### Color Contrast:
All color combinations meet WCAG AA (4.5:1 for text, 3:1 for UI):

| Foreground | Background | Ratio | Pass |
|------------|------------|-------|------|
| `#37352F` | `#FFFFFF` | 12.6:1 | ✓ |
| `#787774` | `#FFFFFF` | 4.9:1 | ✓ |
| `#2383E2` | `#FFFFFF` | 4.5:1 | ✓ |
| `#EB5757` | `#FDECEA` | 4.6:1 | ✓ |

### Focus States (Notion-style):
```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #2383E2;
  border-radius: 4px;
}

/* For dark backgrounds */
.dark :focus-visible {
  box-shadow: 0 0 0 2px #1C1C1E, 0 0 0 4px #2383E2;
}
```

### Keyboard Navigation:
| Key | Action |
|-----|--------|
| `Tab` | Move focus forward |
| `Shift+Tab` | Move focus backward |
| `Enter/Space` | Activate button/link |
| `Escape` | Close modal/dropdown |
| `⌘K` | Open command palette |
| `↑/↓` | Navigate list items |
| `J/K` | Navigate feed items (vim-style) |

### Screen Reader Support:
- All icons have `aria-label`
- Live regions for dynamic content updates
- Proper heading hierarchy (h1 → h2 → h3)
- Descriptive link text (not "click here")

---

## 13. Dark Mode (Arc-Inspired)

### Dark Mode Colors:
```css
/* Dark mode overrides */
[data-theme="dark"] {
  --color-bg-main: #1C1C1E;
  --color-bg-card: #2C2C2E;
  --color-bg-sidebar: #1C1C1E;
  --color-bg-elevated: #3A3A3C;
  
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #8E8E93;
  --color-text-tertiary: #636366;
  
  --color-border: #3A3A3C;
  --color-border-subtle: #2C2C2E;
  
  --color-primary: #0A84FF;  /* iOS blue for dark mode */
}
```

### Dark Mode Semantic Colors:
- **Events**: `#FF6961` (softer red)
- **Courses**: `#4ECDC4` (brighter teal)
- **Blogs**: `#BB86FC` (material purple)
- **Actions**: `#FFB347` (softer orange)

### Implementation:
- Use CSS custom properties for all colors
- Toggle via `data-theme` attribute on `<html>`
- Respect `prefers-color-scheme` media query
- Persist preference in localStorage

---

## 14. Design Tokens (Complete)

```css
:root {
  /* ===== COLORS ===== */
  /* Background */
  --color-bg-main: #FFFFFF;
  --color-bg-secondary: #FBFBFA;
  --color-bg-tertiary: #F7F6F3;
  --color-bg-card: #FFFFFF;
  --color-bg-sidebar: #FBFBFA;
  
  /* Text */
  --color-text-primary: #37352F;
  --color-text-secondary: #787774;
  --color-text-tertiary: #B4B4B0;
  --color-text-inverse: #FFFFFF;
  
  /* Brand */
  --color-primary: #2383E2;
  --color-primary-hover: #1A6BC2;
  --color-primary-light: #E8F4FD;
  
  /* Semantic - Content Types */
  --color-event: #EB5757;
  --color-event-bg: #FDECEA;
  --color-course: #0F7B6C;
  --color-course-bg: #DBEDEA;
  --color-blog: #9065B0;
  --color-blog-bg: #EDE4F3;
  --color-action: #D9730D;
  --color-action-bg: #FAEBDD;
  
  /* Status */
  --color-success: #448361;
  --color-warning: #D9730D;
  --color-error: #E03E3E;
  --color-info: #2383E2;
  
  /* Borders */
  --color-border: #E8E8E6;
  --color-border-hover: #D4D4D0;
  --color-border-focus: #2383E2;
  
  /* ===== TYPOGRAPHY ===== */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  --font-mono: 'SFMono-Regular', Menlo, Consolas, monospace;
  
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 14px;
  --text-md: 16px;
  --text-lg: 20px;
  --text-xl: 24px;
  --text-2xl: 32px;
  --text-3xl: 40px;
  
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;
  
  /* ===== SPACING ===== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  
  /* ===== BORDERS ===== */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
  
  --border-width: 1px;
  
  /* ===== SHADOWS ===== */
  --shadow-none: none;
  --shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06);
  --shadow-dropdown: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-modal: 0 8px 24px rgba(0, 0, 0, 0.12);
  
  /* ===== ANIMATION ===== */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  
  /* ===== LAYOUT ===== */
  --sidebar-width: 240px;
  --sidebar-collapsed: 60px;
  --content-max-width: 900px;
  --header-height: 48px;
}
```

---

## 15. Key Improvements Summary

### From Original Design to Notion + Arc Style:

| Aspect | Before | After |
|--------|--------|-------|
| **Shadows** | Heavy drop shadows | Subtle borders, minimal shadows |
| **Colors** | Saturated, gradient-heavy | Muted, warm neutrals |
| **Typography** | Mixed weights | Consistent, subtle hierarchy |
| **Spacing** | Inconsistent | 8px grid system |
| **Sidebar** | Static | Arc-style with pinned/spaces |
| **Search** | Basic input | Command palette (⌘K) |
| **Cards** | Floating with shadows | Block-style with borders |
| **Animations** | Bouncy/playful | Subtle, professional |
| **Prism Section** | N/A | Collapsible hackathon showcase |

### Design Principles Applied:
1. **Content-first**: Minimal chrome, maximum content visibility
2. **Progressive disclosure**: Collapsible sections, hover-to-reveal
3. **Spatial organization**: Arc-style pinned + spaces hierarchy
4. **Subtle interactions**: Notion-like hover states
5. **Consistent tokens**: Single source of truth for all values
6. **Accessibility-first**: WCAG AA, keyboard navigation, screen readers

---

## 16. Implementation Roadmap

### Phase 1: Foundation (Day 1-2)
- [ ] Set up design tokens as CSS variables
- [ ] Implement base layout (sidebar + main)
- [ ] Build Prism Overview section (collapsible)
- [ ] Create basic card component

### Phase 2: Core Components (Day 3-4)
- [ ] Arc-style sidebar with sections
- [ ] Command bar with ⌘K trigger
- [ ] Filter bar with Notion-style chips
- [ ] Feed cards with extracted items

### Phase 3: Polish (Day 5-6)
- [ ] Micro-interactions and hover states
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Metrics panel

### Phase 4: Refinement (Day 7)
- [ ] Responsive breakpoints
- [ ] Accessibility audit
- [ ] Dark mode (stretch)
- [ ] Performance optimization

---

## 17. Reference Links

### Design Inspiration:
- [Notion Design System](https://www.notion.so)
- [Arc Browser](https://arc.net)
- [Linear App](https://linear.app) (similar aesthetic)
- [Raycast](https://raycast.com) (command palette reference)

### Icon Libraries:
- [Lucide Icons](https://lucide.dev) (recommended)
- [Heroicons](https://heroicons.com)

### Color Tools:
- [Realtime Colors](https://realtimecolors.com)
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## Appendix: Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│  FEEDPRISM DESIGN QUICK REFERENCE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  COLORS                                                     │
│  ───────                                                    │
│  Primary:    #2383E2    Text:      #37352F                 │
│  Events:     #EB5757    Secondary: #787774                 │
│  Courses:    #0F7B6C    Tertiary:  #B4B4B0                 │
│  Blogs:      #9065B0    Border:    #E8E8E6                 │
│  Actions:    #D9730D    Background:#FFFFFF                 │
│                                                             │
│  TYPOGRAPHY                                                 │
│  ──────────                                                 │
│  Font:       System (-apple-system, etc.)                  │
│  Sizes:      11/12/14/16/20/24/32/40px                     │
│  Weights:    400 (normal) / 500 (medium) / 600 (semi)      │
│                                                             │
│  SPACING                                                    │
│  ────────                                                   │
│  Base:       8px grid                                       │
│  Card:       16px padding                                   │
│  Section:    24px gap                                       │
│  Page:       48px margin                                    │
│                                                             │
│  RADIUS                                                     │
│  ───────                                                    │
│  Small:      4px (chips, buttons)                          │
│  Medium:     6px (cards, inputs)                           │
│  Large:      8px (panels, modals)                          │
│                                                             │
│  ANIMATION                                                  │
│  ──────────                                                 │
│  Fast:       100ms (hover)                                  │
│  Normal:     200ms (transitions)                            │
│  Slow:       300ms (expand/collapse)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
