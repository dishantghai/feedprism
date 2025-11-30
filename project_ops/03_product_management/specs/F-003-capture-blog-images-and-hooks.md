# F-003: Capture Blog Images and Hooks from Emails

**Priority: P0**
**Status:** ✅ Complete (Nov 30, 2025)

## Problem

Blog cards in the feed often show **no images** and **weak/missing hooks**, making them less engaging than Event and Course cards. This happens because:

1. **Images are lost during HTML parsing** — The `EmailParser` converts HTML to plain text with `ignore_images = True`, stripping all `<img>` tags before the LLM sees the content
2. **LLM has no image URLs to extract** — Without image URLs in the text, the LLM cannot populate `image_url`
3. **Hooks are inconsistently extracted** — The prompt asks for hooks but doesn't emphasize their importance or provide enough guidance
4. **Payload doesn't include all fields** — `pipeline.py` doesn't store `hook`, `image_url`, `author_title`, or `key_points` in Qdrant

The result: Blog cards appear as plain text boxes while Events get date badges and Courses get provider headers.

## Goal

- [x] Blog images are extracted and displayed in feed cards
- [x] Compelling hooks are consistently captured for engagement
- [x] All blog fields from `ExtractedBlog` model are stored in Qdrant
- [ ] Re-extracted blogs show rich content comparable to Events/Courses (requires I-001)

## Analysis

### Current Data Flow

```
Email HTML → EmailParser → Plain Text → LLM Extractor → ExtractedBlog → Qdrant Payload → Frontend
```

### Root Causes

#### 1. Image URLs Stripped by Parser

**File:** `feedprism_main/app/services/parser.py`

```python
# Line 53 - Images are ignored!
self.html2text_converter.ignore_images = True
```

The LLM receives text like:

```
Check out our latest article on AI trends...
Read more: https://example.com/article
```

But the original HTML had:

```html
<img src="https://cdn.example.com/ai-trends-hero.jpg" alt="AI Trends">
<p>Check out our latest article on AI trends...</p>
<a href="https://example.com/article">Read more</a>
```

**Solution:** Extract image URLs from HTML before conversion and pass them to the LLM.

#### 2. Qdrant Payload Missing Fields

**File:** `feedprism_main/app/routers/pipeline.py` (lines 412-428)

Current blog payload:

```python
payload = {
    "title": blog.title,
    "description": blog.description,
    "author": blog.author,
    "published_date": blog.published_date,
    "url": blog.url,
    "category": blog.category,
    "reading_time": blog.reading_time,
    "tags": blog.tags,
    "source": blog.source,
    # ... source fields
}
```

**Missing fields:**

- `hook` — The compelling teaser
- `image_url` — Article thumbnail
- `author_title` — Author credentials
- `key_points` — Main takeaways

#### 3. LLM Prompt Needs Stronger Hook Guidance

**File:** `feedprism_main/app/services/extractor.py` (lines 259-320)

Current prompt mentions hooks but doesn't emphasize:

- Hook is CRITICAL for engagement
- Where to find hooks in email text
- Examples of good hooks
- Fallback: generate a hook from the content if not explicit

### Frontend Already Ready

The `BlogCard` component (updated in F-002) already handles:

- `image_url` — Displays h-48 featured image
- `hook` — Shows in `line-clamp-4` preview
- `key_points` — Shows up to 3 bullet points
- `author_title` — Displays next to author name

**No frontend changes needed** — just need backend to populate these fields.

## Implementation Plan

### Step 1: Extract Images from HTML Before Parsing

**File:** `feedprism_main/app/services/parser.py`

Add method to extract image URLs:

```python
def _extract_images(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
    """Extract content images from HTML (not tracking pixels)."""
    images = []
    for img in soup.find_all('img', src=True):
        src = img.get('src', '')
        alt = img.get('alt', '')
        width = img.get('width', '')
        height = img.get('height', '')
      
        # Skip tracking pixels (1x1) and tiny images
        if width == '1' or height == '1':
            continue
        if width and height and int(width) < 50 and int(height) < 50:
            continue
          
        # Skip common tracking/icon patterns
        if any(x in src.lower() for x in ['tracking', 'pixel', 'beacon', 'spacer', 'icon']):
            continue
          
        images.append({
            'src': src,
            'alt': alt
        })
  
    return images
```

Update `parse_html_email()` return to include images:

```python
return {
    'clean_html': clean_html,
    'text': text,
    'links': links,
    'images': images,  # NEW
    'title': title
}
```

### Step 2: Pass Images to LLM in Prompt

**File:** `feedprism_main/app/services/extractor.py`

Update `_build_blog_prompt()` to include image URLs:

```python
def _build_blog_prompt(self, email_text: str, email_subject: str, images: List[Dict] = None) -> str:
    # ... existing prompt ...
  
    # Add image context
    if images:
        image_section = "\n\n=== IMAGES FOUND IN EMAIL ===\n"
        for img in images[:10]:  # Limit to 10
            image_section += f"- {img['src']}"
            if img.get('alt'):
                image_section += f" (alt: {img['alt']})"
            image_section += "\n"
        prompt += image_section
        prompt += "\nUse these URLs for image_url field when they match article content.\n"
  
    return prompt
```

Update `extract_blogs()` signature:

```python
async def extract_blogs(
    self,
    email_text: str,
    email_subject: str = "",
    images: List[Dict] = None  # NEW
) -> BlogExtractionResult:
```

### Step 3: Enhance Hook Extraction in Prompt

**File:** `feedprism_main/app/services/extractor.py`

Strengthen hook guidance in `_build_blog_prompt()`:

```python
=== HOOK EXTRACTION (CRITICAL) ===
The hook is the MOST IMPORTANT field for engagement. It's the teaser that makes someone click.

FIND THE HOOK in:
1. Opening sentence that teases the content
2. Pull quotes or highlighted text
3. "Why X matters...", "How to...", "The secret to..."
4. Statistics or surprising facts ("90% of developers...")
5. Questions that pique curiosity ("What if you could...?")

If no explicit hook exists, CREATE ONE from the article's main value proposition.

GOOD HOOKS:
- "The counterintuitive approach that helped Stripe scale to millions of requests"
- "Why your RAG pipeline is probably broken (and how to fix it)"
- "3 lessons from building AI products that nobody talks about"

BAD HOOKS (avoid):
- "This is an article about AI" (too generic)
- "Read this article" (not compelling)
- Just repeating the title
```

### Step 4: Update Pipeline to Store All Fields

**File:** `feedprism_main/app/routers/pipeline.py`

Update blog payload (around line 412):

```python
payload = {
    "title": blog.title,
    "hook": blog.hook,  # ADD
    "description": blog.description,
    "image_url": blog.image_url,  # ADD
    "author": blog.author,
    "author_title": blog.author_title,  # ADD
    "published_date": blog.published_date,
    "url": blog.url,
    "category": blog.category,
    "reading_time": blog.reading_time,
    "tags": blog.tags,
    "source": blog.source,
    "key_points": blog.key_points,  # ADD
    # ... source fields unchanged
}
```

### Step 5: Update Orchestrator to Pass Images

**File:** `feedprism_main/app/services/orchestrator.py`

Update `extract_all()` to accept and pass images:

```python
async def extract_all(
    self,
    email_text: str,
    email_subject: str = "",
    images: List[Dict] = None  # NEW
) -> Dict[str, List]:
    # ...
    blogs_task = self.extractor.extract_blogs(email_text, email_subject, images)
    # ...
```

### Step 6: Update Pipeline Router to Extract and Pass Images

**File:** `feedprism_main/app/routers/pipeline.py`

In `_extraction_stream()`, update parsing section:

```python
# Parse HTML and extract images
if body.get("html"):
    parsed = parser.parse_html_email(body["html"])
    text_content = parsed.get("text", "")
    images = parsed.get("images", [])  # NEW
else:
    text_content = body.get("text") or ""
    images = []

# Pass images to orchestrator
extracted = await orchestrator.extract_all(text_content, subject, images)
```

## Testing

1. **Re-run extraction** on existing emails
2. **Check Qdrant payloads** for `hook`, `image_url`, `key_points`
3. **Verify frontend** displays images and hooks correctly
4. **Compare before/after** blog card appearance

## Files to Modify

| File                             | Changes                                                |
| -------------------------------- | ------------------------------------------------------ |
| `app/services/parser.py`       | Add `_extract_images()`, update return dict          |
| `app/services/extractor.py`    | Update `extract_blogs()` signature, enhance prompt   |
| `app/services/orchestrator.py` | Pass images through to extractor                       |
| `app/routers/pipeline.py`      | Extract images, pass to orchestrator, store all fields |

## Notes

- Image extraction should filter aggressively to avoid tracking pixels
- Some newsletters use CDN URLs that may expire — we store the URL as-is
- Hook generation fallback ensures every blog has engagement text
- Existing data will need re-extraction to populate new fields (see I-001)
