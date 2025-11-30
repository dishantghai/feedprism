# F-010: Search Bar Integration

**Status:** ✅ Complete (Nov 30, 2025)

## Problem
The current UI has a Command Bar (⌘K) for quick navigation and filter selections, but there is no dedicated Search Bar placed below it. Users must type queries directly into the Command Bar, which mixes navigation with search and does not preserve the selected filters.

## Goal
- Add a persistent Search Bar component directly **below** the Command Bar.
- The Search Bar must **inherit** any active filter selections (type, status, sender, date range) from the Command Bar so that searches are scoped accordingly.
- Keep the UI clean and consistent with the Notion/Arc design language.

## Approach (optional)
- Create a `SearchBar` React component (`src/components/SearchBar.tsx`).
- Expose a prop `activeFilters` that receives the current filter state from the Command Bar context.
- On input change, debounce (300 ms) and fire a `/search` API request with both `query` and `filters`.
- Update the UI to render the Search Bar right under the Command Bar in the layout file (`src/layout/MainLayout.tsx`).
- Add CSS token `--search-bar-height: 48px;` and style with subtle border and focus ring.

## Acceptance Criteria
- Search Bar appears directly below the Command Bar on all screen sizes.
- When a filter is selected in the Command Bar, the Search Bar query automatically includes that filter (e.g., searching “AI” while `Type=Event` returns only events).
- Debounced search results update the Library view without full page reload.
- Component passes WCAG AA contrast and is keyboard‑navigable.
