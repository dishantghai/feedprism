# F-002: Fix Blog View

**Status:** ✅ Complete (Nov 30, 2025)

## Problem

- The Blog View Does not Show the Images from the Blog
- The Blog View in the Recent Extractions Section does not Show Enough Content For Someone to get intreseted in it and Read. It should be a Little Bigger in Size for Image and Detials to Properly be Visible.

## Goal

- [x] Blog View becomes a Little Bigger.
- [x] Image is Properly Shown from the Source Blog.
- [x] More Content from Blog captured for Greater Hook and Engagement.

## Implementation

Updated `frontend/src/components/feed/ExtractedItemCard.tsx` - `BlogCard` component:

**Full-size card changes:**
- Added prominent featured image (h-48) with hover zoom effect
- Category badge overlaid on image when present
- Larger title (text-lg vs text-base)
- More description lines (line-clamp-4 vs line-clamp-3)
- More key points shown (3 vs 2)
- Better spacing (p-5 vs p-4)
- Stronger hover shadow (shadow-lg)

**Compact card changes:**
- Larger thumbnail (w-14 h-14 vs w-10 h-10)
- Title allows 2 lines (line-clamp-2)
- Added reading time display
- Gradient placeholder icon when no image

## Notes

Images depend on `image_url` being populated by the LLM extraction. If blogs still don't show images, the extraction prompts may need adjustment to better capture image URLs from email HTML.
