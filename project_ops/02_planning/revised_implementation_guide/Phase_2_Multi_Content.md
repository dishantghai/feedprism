# Phase 2: Multi-Content Extraction - Events, Courses & Blogs

**Goal:** Expand extraction pipeline to handle multiple content types (Events, Courses, Blogs) while maintaining working single-pipeline architecture.

**Estimated Time:** 8-10 hours

**Prerequisites:** Phase 1 complete (verified ✅)

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Module 2.1: Course Data Models](#module-21-course-data-models)
3. [Module 2.2: Blog Data Models](#module-22-blog-data-models)
4. [Module 2.3: Course Extraction](#module-23-course-extraction)
5. [Module 2.4: Blog Extraction](#module-24-blog-extraction)
6. [Module 2.5: Multi-Content Orchestrator](#module-25-multi-content-orchestrator)
7. [Module 2.6: Rich Payload Structure](#module-26-rich-payload-structure)
8. [Module 2.7: Updated Ingestion Pipeline](#module-27-updated-ingestion-pipeline)
9. [Verification & Testing](#verification--testing)
10. [Troubleshooting](#troubleshooting)

---

## 1. Overview & Architecture

### 1.1 What We're Building (Phase 2)

**Expanding from Events-Only to Multi-Content:**

```
Phase 1 (Events):          Phase 2 (Multi-Content):
                          
 Email → Extract Events     Email → Extract Events ────┐
      → Embed                          → Courses    ├─→ Store
      → Store                          → Blogs   ────┘
                                       → Embed All
```

**Strategy:**
- Add Courses and Blogs as NEW content types
- Keep Events extraction working (don't break it!)
- Use SAME LLM extraction pattern (JSON Schema)
- Store all in SINGLE collection with `content_type` field
- (Phase 4 will split into separate collections)

### 1.2 Content Type Definitions

| Content Type | Examples | Key Fields |
|--------------|----------|------------|
| **Events** | Webinars, conferences, meetups | title, start_date, location, registration_link |
| **Courses** | Online classes, workshops | title, provider, level, duration, cost, link |
| **Blogs** | Articles, newsletters, posts | title, author, published_date, url, category |

### 1.3 File Structure (Phase 2)

```
feedprism_main/
├── app/
│   ├── models/
│   │   └── extraction.py          ← UPDATE: Add Course & Blog models
│   ├── services/
│   │   ├── extractor.py           ← UPDATE: Add course & blog extraction
│   │   └── orchestrator.py        ← NEW: Multi-content orchestration
│   └── database/
│       └── qdrant_client.py       ← UPDATE: Handle content_type field
└── scripts/
    └── ingest_multi_content.py    ← NEW: Test multi-content ingestion
```

---

## Module 2.1: Course Data Models

**Time:** 1.5 hours  
**File:** `app/models/extraction.py` (extend existing)

### Theory: Course Schema Design

**What makes a course:**
- Title & description
- Provider (Coursera, Udemy, university, etc.)
- Level (beginner, intermediate, advanced)
- Duration (hours, weeks)
- Cost (free, paid, amount)
- Enrollment link

### Implementation

**Extend `app/models/extraction.py`:**

```python
# Add to existing file after Event models

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl


class CourseLevel(str, Enum):
    """Course difficulty level."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    ALL_LEVELS = "all_levels"


class ExtractedCourse(BaseModel):
    """Pydantic model for extracted course information."""
    
    title: str = Field(..., description="Course title")
    description: Optional[str] = Field(None, description="Detailed course description")
    provider: Optional[str] = Field(None, description="Course provider (e.g., Coursera, Udemy)")
    instructor: Optional[str] = Field(None, description="Instructor name")
    level: Optional[CourseLevel] = Field(None, description="Course difficulty level")
    duration: Optional[str] = Field(None, description="Course duration (e.g., '6 weeks', '20 hours')")
    cost: Optional[str] = Field(None, description="Cost information (e.g., 'Free', '$49', 'Subscription')")
    enrollment_link: Optional[HttpUrl] = Field(None, description="Course enrollment URL")
    tags: List[str] = Field(default_factory=list, description="Relevant tags/topics")
    start_date: Optional[str] = Field(None, description="Course start date (if fixed schedule)")
    certificate_offered: Optional[bool] = Field(None, description="Whether a certificate is offered")


class CourseExtractionResult(BaseModel):
    """Result of course extraction from email."""
    
    courses: List[ExtractedCourse] = Field(default_factory=list, description="List of extracted courses")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence (0.0 - 1.0)")
```

### Verification

```bash
python << 'EOF'
import sys
sys.path.insert(0, '/Users/Shared/ALL WORKSPACE/Hackathons/mom_hack/feedprism_main')

from app.models.extraction import ExtractedCourse, CourseLevel

# Test model
course = ExtractedCourse(
    title="Machine Learning Fundamentals",
    provider="Coursera",
    level=CourseLevel.BEGINNER,
    duration="6 weeks",
    cost="Free"
)

print(f"✅ Course model created: {course.title}")
print(f"   Schema valid: {course.model_dump()}")
EOF
```

**Commit:**
```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack
git add feedprism_main/app/models/extraction.py
git commit -m "feat(feedprism): add Course data models with Pydantic schema"
```

---

## Module 2.2: Blog Data Models

**Time:** 1 hour  
**File:** `app/models/extraction.py` (extend existing)

### Implementation

**Add Blog models to `app/models/extraction.py`:**

```python
class ExtractedBlog(BaseModel):
    """Pydantic model for extracted blog/article information."""
    
    title: str = Field(..., description="Blog post title")
    description: Optional[str] = Field(None, description="Article summary or excerpt")
    author: Optional[str] = Field(None, description="Author name")
    published_date: Optional[str] = Field(None, description="Publication date (ISO 8601)")
    url: Optional[HttpUrl] = Field(None, description="Article URL")
    category: Optional[str] = Field(None, description="Content category (e.g., 'AI', 'Web Dev')")
    reading_time: Optional[str] = Field(None, description="Estimated reading time")
    tags: List[str] = Field(default_factory=list, description="Article tags/topics")
    source: Optional[str] = Field(None, description="Publication source (blog name, newsletter)")


class BlogExtractionResult(BaseModel):
    """Result of blog extraction from email."""
    
    blogs: List[ExtractedBlog] = Field(default_factory=list, description="List of extracted blogs/articles")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence")
```

**Commit:**
```bash
git add feedprism_main/app/models/extraction.py
git commit -m "feat(feedprism): add Blog data models"
```

---

## Module 2.3: Course Extraction

**Time:** 2 hours  
**File:** `app/services/extractor.py` (extend existing)

### Implementation

**Add to `LLMExtractor` class in `app/services/extractor.py`:**

```python
async def extract_courses(self, email_text: str, email_subject: str = "") -> CourseExtractionResult:
    """
    Extract course information from email.
    
    Args:
        email_text: Parsed email content
        email_subject: Email subject line
    
    Returns:
        CourseExtractionResult with extracted courses
    """
    prompt = f"""Extract all course and learning opportunity information from this email.

Email Subject: {email_subject}

Email Content:
{email_text[:3000]}

Instructions:
1. Find all courses, classes, training programs, or learning opportunities
2. Extract: title, description, provider, instructor, level, duration, cost, enrollment_link, tags
3. If information is missing, use null
4. For 'cost', indicate if free or provide price
5. Return JSON with 'courses' array and 'confidence' (0.0-1.0)
"""
    
    schema = CourseExtractionResult.model_json_schema()
    
    response = await self.client.chat.completions.create(
        model=self.model,
        messages=[
            {"role": "system", "content": "You are an expert at extracting course and learning opportunity data from emails."},
            {"role": "user", "content": prompt}
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "course_extraction",
                "strict": True,
                "schema": schema
            }
        },
        temperature=self.temperature,
        max_tokens=self.max_tokens
    )
    
    content = response.choices[0].message.content
    result = CourseExtractionResult(**json.loads(content))
    
    logger.info(f"✅ Extracted {len(result.courses)} courses (confidence: {result.confidence})")
    return result
```

**Verification:**
```bash
python << 'EOF'
import asyncio
import sys
sys.path.insert(0, '/Users/Shared/ALL WORKSPACE/Hackathons/mom_hack/feedprism_main')

from app.services.gmail_client import GmailClient
from app.services.parser import EmailParser
from app.services.extractor import LLMExtractor

async def test():
    gmail = GmailClient()
    parser = EmailParser()
    extractor = LLMExtractor()
    
    emails = gmail.fetch_content_rich_emails(days_back=7, max_results=3)
    
    for email in emails:
        if 'course' in email['subject'].lower():
            parsed = parser.parse_html_email(email['body_html'] or "")
            result = await extractor.extract_courses(parsed['text'], email['subject'])
            print(f"\n✅ {email['subject']}")
            for course in result.courses:
                print(f"   - {course.title} ({course.provider})")

asyncio.run(test())
EOF
```

**Commit:**
```bash
git add feedprism_main/app/services/extractor.py
git commit -m "feat(feedprism): add course extraction to LLM service"
```

---

## Module 2.4: Blog Extraction

**Time:** 1.5 hours  
**File:** `app/services/extractor.py` (extend existing)

### Implementation

**Add to `LLMExtractor` class:**

```python
async def extract_blogs(self, email_text: str, email_subject: str = "") -> BlogExtractionResult:
    """Extract blog/article information from email."""
    
    prompt = f"""Extract all blog posts, articles, and newsletter content from this email.

Email Subject: {email_subject}
Email Content: {email_text[:3000]}

Instructions:
1. Find all blog posts, articles, or featured content
2. Extract: title, description, author, published_date, url, category, reading_time, tags, source
3. Return JSON with 'blogs' array and 'confidence'
"""
    
    schema = BlogExtractionResult.model_json_schema()
    
    response = await self.client.chat.completions.create(
        model=self.model,
        messages=[
            {"role": "system", "content": "You are an expert at extracting blog and article information from emails."},
            {"role": "user", "content": prompt}
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "blog_extraction",
                "strict": True,
                "schema": schema
            }
        },
        temperature=self.temperature
    )
    
    content = response.choices[0].message.content
    result = BlogExtractionResult(**json.loads(content))
    
    logger.info(f"✅ Extracted {len(result.blogs)} blogs (confidence: {result.confidence})")
    return result
```

**Commit:**
```bash
git add feedprism_main/app/services/extractor.py
git commit -m "feat(feedprism): add blog extraction to LLM service"
```

---

## Module 2.5: Multi-Content Orchestrator

**Time:** 2 hours  
**File:** `app/services/orchestrator.py` (NEW)

### Theory: Orchestration Pattern

**Why an orchestrator?**
- Runs all extractions in parallel (faster!)
- Aggregates results
- Handles errors gracefully
- Single entry point for "extract everything"

### Implementation

```python
"""Multi-content extraction orchestrator."""

from typing import Dict, List
import asyncio
from loguru import logger

from app.services.extractor import LLMExtractor
from app.models.extraction import (
    ExtractedEvent,
    ExtractedCourse,
    ExtractedBlog
)


class ExtractionOrchestrator:
    """Orchestrates multi-content type extraction from emails."""
    
    def __init__(self):
        self.extractor = LLMExtractor()
    
    async def extract_all(
        self,
        email_text: str,
        email_subject: str = ""
    ) -> Dict[str, List]:
        """
        Extract all content types from email in parallel.
        
        Args:
            email_text: Parsed email content
            email_subject: Email subject
        
        Returns:
            Dict with 'events', 'courses', 'blogs' keys
        """
        logger.info("Starting multi-content extraction")
        
        # Run all extractions in parallel
        events_task = self.extractor.extract_events(email_text, email_subject)
        courses_task = self.extractor.extract_courses(email_text, email_subject)
        blogs_task = self.extractor.extract_blogs(email_text, email_subject)
        
        # Await all results
        events_result, courses_result, blogs_result = await asyncio.gather(
            events_task,
            courses_task,
            blogs_task,
            return_exceptions=True
        )
        
        # Handle exceptions
        events = events_result.events if not isinstance(events_result, Exception) else []
        courses = courses_result.courses if not isinstance(courses_result, Exception) else []
        blogs = blogs_result.blogs if not isinstance(blogs_result, Exception) else []
        
        total = len(events) + len(courses) + len(blogs)
        logger.success(f"Extracted {total} items: {len(events)} events, {len(courses)} courses, {len(blogs)} blogs")
        
        return {
            'events': events,
            'courses': courses,
            'blogs': blogs
        }
```

**Verification:**
```bash
python << 'EOF'
import asyncio
import sys
sys.path.insert(0, '/Users/Shared/ALL WORKSPACE/Hackathons/mom_hack/feedprism_main')

from app.services.orchestrator import ExtractionOrchestrator

async def test():
    orchestrator = ExtractionOrchestrator()
    
    sample_text = """
    Upcoming AI Summit on Dec 15th. Register at example.com/summit
    
    New Course: Machine Learning Basics starting next week. 
    Enroll at example.com/course
    
    Featured Article: "The Future of AI" by John Doe.
    Read more at example.com/article
    """
    
    result = await orchestrator.extract_all(sample_text, "Newsletter Digest")
    
    print(f"✅ Extraction complete:")
    print(f"   Events: {len(result['events'])}")
    print(f"   Courses: {len(result['courses'])}")
    print(f"   Blogs: {len(result['blogs'])}")

asyncio.run(test())
EOF
```

**Commit:**
```bash
git add feedprism_main/app/services/orchestrator.py
git commit -m "feat(feedprism): add multi-content extraction orchestrator"
```

---

## Module 2.6: Rich Payload Structure

**Time:** 1 hour  
**File:** `app/database/qdrant_client.py` (update)

### Theory: Payload Design

**What to store in payload:**
```json
{
  "content_type": "event|course|blog",
  "title": "Item title",
  "description": "Description",
  "source_email_id": "gmail_message_id",
  "source_subject": "Email subject",
  "extracted_at": "2025-11-25T10:30:00Z",
  "tags": ["tag1", "tag2"],
  
  // Type-specific fields
  "event_fields": {...},
  "course_fields": {...},
  "blog_fields": {...}
}
```

### Implementation Note

Update Qdrant upsert logic to include `content_type` field in payload. This allows filtering by type:

```python
# In qdrant_client.py upsert method
payload = {
    "content_type": "event",  # or "course", "blog"
    "title": item.title,
    # ... other fields
}
```

**Commit:**
```bash
git add feedprism_main/app/database/qdrant_client.py
git commit -m "feat(feedprism): add content_type to Qdrant payload structure"
```

---

## Module 2.7: Updated Ingestion Pipeline

**Time:** 1 hour  
**File:** `scripts/ingest_multi_content.py` (NEW)

### Implementation

Create end-to-end test script for multi-content ingestion:

```python
"""Multi-content ingestion script."""

import asyncio
import uuid
from qdrant_client.models import PointStruct

from app.services.gmail_client import GmailClient
from app.services.parser import EmailParser
from app.services.orchestrator import ExtractionOrchestrator
from app.services.embedder import EmbeddingService
from app.database.qdrant_client import QdrantService

async def main():
    # Initialize services
    gmail = GmailClient()
    parser = EmailParser()
    orchestrator = ExtractionOrchestrator()
    embedder = EmbeddingService()
    qdrant = QdrantService()
    
    # Fetch emails
    emails = gmail.fetch_content_rich_emails(days_back=7, max_results=10)
    
    all_points = []
    
    for email in emails:
        # Parse
        parsed = parser.parse_html_email(email['body_html'] or "")
        
        # Extract all content types
        result = await orchestrator.extract_all(parsed['text'], email['subject'])
        
        # Process events
        for event in result['events']:
            text = f"{event.title} {event.description or ''}"
            vector = embedder.embed_text(text)
            
            point = PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "content_type": "event",
                    "title": event.title,
                    "description": event.description,
                    "source_email_id": email['id']
                }
            )
            all_points.append(point)
        
        # Process courses (similar pattern)
        for course in result['courses']:
            text = f"{course.title} {course.description or ''}"
            vector = embedder.embed_text(text)
            point = PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={"content_type": "course", "title": course.title, "source_email_id": email['id']}
            )
            all_points.append(point)
        
        # Process blogs (similar pattern)
        for blog in result['blogs']:
            text = f"{blog.title} {blog.description or ''}"
            vector = embedder.embed_text(text)
            point = PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={"content_type": "blog", "title": blog.title, "source_email_id": email['id']}
            )
            all_points.append(point)
    
    # Store all
    if all_points:
        qdrant.upsert_points(all_points)
        print(f"✅ Stored {len(all_points)} items in Qdrant")
    
    # Test filtering by content type
    query_vec = embedder.embed_text("machine learning course")
    results = qdrant.search(query_vec, limit=5, filter_dict={"content_type": "course"})
    
    print(f"\n🔍 Search results (courses only):")
    for r in results:
        print(f"   - {r['payload']['title']}")

if __name__ == '__main__':
    asyncio.run(main())
```

**Commit:**
```bash
git add feedprism_main/scripts/ingest_multi_content.py
git commit -m "feat(feedprism): multi-content ingestion pipeline script"
```

---

## Verification & Testing

### Complete Phase 2 Verification

```bash
python << 'EOF'
print("=" * 70)
print("PHASE 2: MULTI-CONTENT EXTRACTION - VERIFICATION")
print("=" * 70)

# Import checks
try:
    from app.models.extraction import ExtractedCourse, ExtractedBlog
    from app.services.orchestrator import ExtractionOrchestrator
    print("\n✅ All modules imported successfully")
except ImportError as e:
    print(f"\n❌ Import error: {e}")
    exit(1)

# Model checks
course = ExtractedCourse(title="Test", provider="Test Provider")
blog = ExtractedBlog(title="Test Article")
print("✅ Course and Blog models working")

# Orchestrator check
orchestrator = ExtractionOrchestrator()
print("✅ Orchestrator initialized")

print("\n" + "=" * 70)
print("VERIFICATION COMPLETE: All checks passed!")
print("=" * 70)
print("\n✅ Phase 2 complete!")
print("\n📌 Next Step: Proceed to Phase 3 (Hybrid Search)")
EOF
```

### Git Commit Checkpoint

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack
git add feedprism_main/
git commit -m "feat(feedprism): Phase 2 complete - Multi-content extraction

- Course data models and extraction
- Blog data models and extraction
- Multi-content orchestrator for parallel extraction
- Rich payload structure with content_type field
- Updated ingestion pipeline for all content types

All content types verified and working"
git tag feedprism-phase-2-complete
```

---

## Troubleshooting

### Common Issues

**Issue: "LLM returns empty courses/blogs list"**

**Solution:**
- Check email content has relevant information
- Lower confidence threshold if needed
- Verify JSON Schema is correct
- Check OpenAI API key and model access

**Issue: "Payload too large for Qdrant"**

**Solution:**
```bash
# Truncate long descriptions
payload["description"] = description[:500] if description else None
```

---

## Phase 2 Complete! 🎉

**What You've Accomplished:**
- ✅ Course data models and extraction
- ✅ Blog data models and extraction
- ✅ Multi-content orchestrator
- ✅ Rich payload structure
- ✅ Updated ingestion pipeline

**Time Spent:** ~8-10 hours

**Next Step:** **[Phase 3: Hybrid Search](Phase_3_Hybrid_Search.md)**

---
