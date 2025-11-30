# F-004: Blog View Enhancement

## Problem
The current Blog view in the Recent Extraction screen displays a small thumbnail and a truncated description. Users cannot see the blog image clearly, and the limited copy reduces engagement and click‑through rates.

## Goal
- Increase the visual prominence of blog images so they are fully visible.
- Expand the description area to show a richer summary (up to 3 lines).
- Add a compelling hook (e.g., a short tagline or question) to encourage users to read the full blog.
- Maintain the overall card layout consistency with events and courses.

## Approach (optional)
- Redesign the blog card to use a larger image container (minimum 200 px height) with a subtle border radius.
- Use a two‑line description with ellipsis after the third line.
- Insert a “Hook” field above the description, styled as a bold, italic tagline.
- Update the CSS design tokens (`--card-image-height`, `--card-description-lines`).
- Ensure the new layout is responsive: image scales down on mobile, hook hides on very small screens.

## Notes (optional)
- Hook examples: “🚀 Discover the latest AI breakthrough!”, “💡 Did you know this trick can double your productivity?”
- Track engagement metrics (click‑through, time‑on‑card) to validate the improvement.
- Coordination with the backend: ensure the API returns `image_url`, `hook_text`, and an extended `description` field.

---

**Acceptance Criteria**
- Blog cards display a larger image (≥200 px height) with a smooth fade‑in.
- Hook text appears in a distinct style and is optional.
- Description shows up to three lines; overflow is truncated with an ellipsis.
- No layout break on screens < 600 px; image scales proportionally.
- Updated UI passes accessibility contrast checks.
## Blog Detail View Enhancements

**Problem:** The Blog Detail page currently shows only title and text; no image, no hook, layout is plain and not engaging.

**Goal:**
- Show the same large image used in the card (≥200 px) at the top of the detail view.
- Display the hook prominently under the title, styled as bold italic.
- Keep the description full length, with proper line spacing.
- Add a “Read more” CTA button linking to the original source.
- Ensure responsive design and accessibility.

**Approach:**
- Extend the backend payload to include `image_url` and `hook_text` for the detail endpoint.
- Update the detail component to render an image container with `object-fit: cover`.
- Place the hook element below the title, using the `--hook-style` token.
- Add a sticky CTA button at the bottom of the view.
- Apply the same design tokens (`--card-image-height`, `--hook-style`) for consistency.

**Acceptance Criteria:**
- Image displayed at ≥200 px height, with fade‑in animation.
- Hook text appears in bold italic, optional if missing.
- CTA button is visible and keyboard‑focusable.
- Layout passes WCAG AA contrast and mobile breakpoints.
