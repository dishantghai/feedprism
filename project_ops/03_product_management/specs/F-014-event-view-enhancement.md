# F-014: Event View Enhancement

**Status:** ✅ Complete (Nov 30, 2025)

## Problem
The current Event views (both in Recent Extractions and Detail View) are sparse and unengaging. They lack sufficient content context, are too small to be noticeable, and fail to provide a direct link to the original source email. This makes it difficult for users to decide if an event is worth attending without digging deeper.

## Goal
- **Enhance Visibility:** Make Event cards in Recent Extractions larger and more visually distinct.
- **Enrich Content:** Display more details upfront, including description snippets, location, and clear timing.
- **Improve Engagement:** Add clear calls-to-action (CTAs) and better visual hierarchy.
- **Provenance:** Provide a direct link to the original source email from both views.

## User Flow & UI Design

### 1. Enhanced Event Card (Recent Extractions)
**Current:** Small card, title only, minimal date.
**New Design:**
- **Layout:** Wider/Taller card (min-height: 180px).
- **Date Badge:** Prominent visual date indicator (e.g., "DEC 15" in a square badge).
- **Content:**
  - **Title:** Bold, 2 lines max.
  - **Meta:** Time & Location with icons (🕒 10:00 AM • 📍 Online).
  - **Description:** 2-3 lines of text preview to give context.
  - **Actions Row:**
    - **Primary:** "Register" / "RSVP" button (accent color).
    - **Secondary:** "View Source" icon/link.

```text
┌────────────────────────────────────────────────────┐
│  ┌──────┐  **Advanced NLP Workshop 2024**          │
│  │ DEC  │  🕒 10:00 AM - 4:00 PM  📍 Online        │
│  │  15  │                                          │
│  └──────┘  Join us for a deep dive into the lat... │
│            transformers and LLM architectures.     │
│                                                    │
│  [ Register ↗ ]   [📧 View Source]      [#NLP]     │
└────────────────────────────────────────────────────┘
```

### 2. Rich Event Detail View
**Current:** Plain text, limited info.
**New Design:**
- **Header:** Large title, full date/time/location, "Add to Calendar" button.
- **Body:** Full description text (preserving formatting where possible).
- **Sidebar/Meta:**
  - **Registration Link:** Primary CTA button ("Register Now").
  - **Source:** "View Original Email" link (opens F-008 Modal).
  - **Organizer:** Extracted from sender (e.g., "AI Weekly").

```text
┌────────────────────────────────────────────────────┐
│  🔙 Back                                           │
│                                                    │
│  DEC 15 • 10:00 AM                                 │
│  # Advanced NLP Workshop 2024                      │
│                                                    │
│  [ Add to Calendar ]  [ Register ↗ ]               │
│                                                    │
│  **About this Event**                              │
│  Full description goes here...                     │
│                                                    │
│  ────────────────────────────────────────────────  │
│  📍 Location: Zoom (Link sent upon registration)   │
│  📧 Source: AI Weekly [View Original Email]        │
└────────────────────────────────────────────────────┘
```

## Implementation Details

### Frontend
- **Component:** Update `EventCard.tsx` to support the "Expanded" variant.
- **Styling:** Use CSS Grid for the Date Badge layout.
- **Integration:**
  - Connect "View Source" to the `EmailModal` (F-008).
  - **Primary Action:** Add a "Register" button that opens the `registration_url` in a new tab.
  - Implement "Add to Calendar" (generate .ics or Google Calendar link).

### Backend
- Ensure the extraction model populates the `description` field with sufficient length (currently might be too short).
- Return `source_email_id` to enable the modal link.
- Extract `registration_url` if available (fallback to source link).

## Acceptance Criteria
- [ ] Event Card in Recent Extractions is larger and shows description snippet.
- [ ] Date and Time are visually distinct and easy to scan.
- [ ] **Primary Action (Register/RSVP) is visible and clickable directly on the card.**
- [ ] "View Source Email" link is present and functional in both Card and Detail views.
- [ ] Detail view shows full description and primary CTAs (Register, Calendar).
- [ ] UI is responsive and looks "premium" (consistent with Arc/Notion aesthetic).
