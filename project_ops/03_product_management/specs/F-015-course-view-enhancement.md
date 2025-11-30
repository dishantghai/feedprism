# F-015: Course View Enhancement

## Problem
The current Course views are minimal and don't provide enough context for users to decide if a course is worth enrolling in. They lack key details like instructor info, duration, skill level, and clear enrollment CTAs. Users can't quickly assess course value without clicking through to external sites.

## Goal
- **Enhance Visibility:** Make Course cards more visually distinct with provider branding
- **Enrich Content:** Display instructor, duration, level, cost, and description upfront
- **Improve Engagement:** Add clear CTAs (Enroll, Save for Later) and progress indicators
- **Provenance:** Provide a direct link to the original source email

## User Flow & UI Design

### 1. Enhanced Course Card (Recent Extractions)

**Current:** Small card, title only, minimal info.

**New Design:**
```text
┌────────────────────────────────────────────────────────────┐
│  ┌──────────┐  **Advanced Machine Learning with PyTorch** │
│  │ Coursera │  👤 Andrew Ng • 📚 Intermediate             │
│  │   Logo   │  ⏱️ 6 weeks • 💰 Free (Certificate $49)     │
│  └──────────┘                                              │
│                                                            │
│  Master deep learning fundamentals and build production-  │
│  ready models using PyTorch and modern architecttic...    │
│                                                            │
│  [ Enroll Now ↗ ]  [📧 Source]     #AI #DeepLearning      │
└────────────────────────────────────────────────────────────┘
```

### 2. Key Visual Elements

**Provider Badge:**
- Left side badge showing course provider (Coursera, Udemy, edX, etc.)
- Provider-specific colors/branding
- Fallback to graduation cap icon

**Meta Row:**
- 👤 Instructor name
- 📚 Skill level (Beginner/Intermediate/Advanced)
- ⏱️ Duration (weeks/hours)
- 💰 Cost (Free, $X, or "Free with certificate $X")

**Description:**
- 2-3 lines of course description/hook
- What you'll learn highlights

**Action Buttons:**
- **Primary:** "Enroll Now" (accent color, opens enrollment link)
- **Secondary:** "View Source" (opens EmailModal)

### 3. Rich Course Detail View

**Current:** Plain text, limited info.

**New Design:**
```text
┌────────────────────────────────────────────────────────────┐
│  🔙 Back                                                   │
│                                                            │
│  [Coursera Logo]  COURSERA                                 │
│                                                            │
│  # Advanced Machine Learning with PyTorch                  │
│                                                            │
│  👤 Andrew Ng, Stanford University                         │
│  📚 Intermediate • ⏱️ 6 weeks (4-6 hrs/week)              │
│  💰 Free to audit • Certificate: $49                       │
│                                                            │
│  [ Enroll Now ↗ ]  [ Save for Later ]                      │
│                                                            │
│  **About this Course**                                     │
│  Full description goes here...                             │
│                                                            │
│  **What You'll Learn**                                     │
│  • Deep learning fundamentals                              │
│  • PyTorch model building                                  │
│  • Production deployment                                   │
│                                                            │
│  ────────────────────────────────────────────────          │
│  📧 Source: AI Weekly [View Original Email]                │
│  🏷️ Tags: #AI #DeepLearning #PyTorch                       │
└────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Frontend

**Component Updates:**
- Update `CourseCard` in `ExtractedItemCard.tsx`
- Add provider logo/badge component
- Add skill level indicator with color coding
- Integrate EmailModal for "View Source"

**Provider Branding:**
```typescript
const providerConfig: Record<string, { color: string; bgColor: string }> = {
  'coursera': { color: '#0056D2', bgColor: '#E8F0FE' },
  'udemy': { color: '#A435F0', bgColor: '#F3E8FF' },
  'edx': { color: '#02262B', bgColor: '#E0F2F1' },
  'linkedin': { color: '#0A66C2', bgColor: '#E8F4FD' },
  'udacity': { color: '#02B3E4', bgColor: '#E0F7FA' },
  'default': { color: '#059669', bgColor: '#D1FAE5' }
};
```

**Level Indicators:**
```typescript
const levelConfig: Record<string, { color: string; label: string }> = {
  'beginner': { color: 'text-green-600', label: 'Beginner' },
  'intermediate': { color: 'text-yellow-600', label: 'Intermediate' },
  'advanced': { color: 'text-red-600', label: 'Advanced' },
  'all': { color: 'text-blue-600', label: 'All Levels' }
};
```

### Backend

- Ensure extraction captures: `provider`, `instructor`, `level`, `duration`, `cost`
- Parse cost to identify free vs paid courses
- Extract "What You'll Learn" bullet points if available

## Acceptance Criteria

- [ ] Course Card shows provider badge with branding
- [ ] Instructor name displayed prominently
- [ ] Skill level shown with color indicator
- [ ] Duration and cost clearly visible
- [ ] Description preview (2-3 lines)
- [ ] **"Enroll Now" button is prominent and clickable**
- [ ] "View Source" link opens EmailModal
- [ ] Tags displayed at bottom
- [ ] Detail view shows full course info
- [ ] UI is responsive and consistent with Event card style

## Priority

**P2** - Enhancement (after core features complete)

## Related Work

- **F-014:** Event View Enhancement (similar pattern)
- **F-008:** Source Email Modal (integration)
- **F-004:** Blog View Enhancement (similar pattern)
