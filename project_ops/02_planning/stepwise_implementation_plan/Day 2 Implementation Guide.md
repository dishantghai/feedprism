<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# FEEDPRISM IMPLEMENTATION GUIDE (CONTINUED)

## 4. DAY 2: LLM-BASED EXTRACTION SYSTEM

**Goal:** Build a robust LLM-powered extraction pipeline that transforms unstructured email text into structured JSON data for Events, Courses, Blogs, Actionable Items, and Email Tags.

**Estimated Time:** 8-10 hours

### 4.1 Understanding LLM Structured Output (Theory)

**Why Structured Output Matters:**

Traditional LLM responses are freeform text. For a production system, we need:

- **Predictable format** (JSON schemas)
- **Type safety** (validated data types)
- **Guaranteed fields** (no missing attributes)
- **Parseable output** (no markdown wrappers or text noise)

**OpenAI Structured Outputs Feature:**

Since August 2024, OpenAI supports JSON mode with strict schema enforcement via **JSON Schema**. This uses **constrained decoding** to ensure 100% valid JSON that matches your schema.

**How it works:**

```
User Prompt → LLM → JSON Schema Constraint → Valid JSON Output
```

**Benefits over prompt engineering:**

- ❌ Old way: "Please output JSON..." → often returns markdown fences or invalid JSON
- ✅ New way: `response_format={"type": "json_schema", ...}` → guaranteed valid JSON

**Cost Optimization:**

GPT-4o-mini pricing (as of Nov 2025):

- Input: \$0.150 per 1M tokens
- Output: \$0.600 per 1M tokens

**Typical extraction costs:**

- Average email: 1,500 tokens input, 300 tokens output
- Cost per email: ~\$0.0004 (less than 1 cent!)
- 200 emails: ~\$0.08 total

**Pro tip:** Use `temperature=0.0` for deterministic, cost-effective extraction (no creative variation needed).

### 4.2 Pydantic Data Models

**Create `app/models/extraction.py`:**

```python
"""
Pydantic Models for Extraction Pipeline

These models define the structure of extracted data. They serve dual purposes:
1. Type validation for Python code
2. JSON Schema generation for OpenAI structured outputs

Theory:
- Pydantic v2 has built-in JSON Schema generation
- Field descriptions become schema descriptions (LLM hints)
- Optional fields allow partial extraction
- Nested models enable complex structures

Author: FeedPrism Team
Date: Nov 2025
"""

from datetime import datetime
from typing import List, Optional
from enum import Enum

from pydantic import BaseModel, Field, HttpUrl, field_validator


# ============================================================================
# ENUMS (Controlled Vocabularies)
# ============================================================================

class EventType(str, Enum):
    """Types of events we extract."""
    WEBINAR = "webinar"
    CONFERENCE = "conference"
    WORKSHOP = "workshop"
    MEETUP = "meetup"
    SEMINAR = "seminar"
    HACKATHON = "hackathon"
    NETWORKING = "networking"
    OTHER = "other"


class CourseLevel(str, Enum):
    """Course difficulty levels."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    ALL_LEVELS = "all_levels"


class ContentCategory(str, Enum):
    """Blog/article content categories."""
    TECHNOLOGY = "technology"
    BUSINESS = "business"
    SCIENCE = "science"
    EDUCATION = "education"
    HEALTH = "health"
    LIFESTYLE = "lifestyle"
    NEWS = "news"
    OTHER = "other"


class ActionPriority(str, Enum):
    """Priority levels for actionable items."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ============================================================================
# EVENT EXTRACTION
# ============================================================================

class EventLocation(BaseModel):
    """
    Event location information.
    
    Supports both physical and virtual events.
    """
    type: str = Field(
        ...,
        description="Location type: 'physical', 'virtual', or 'hybrid'"
    )
    venue: Optional[str] = Field(
        None,
        description="Venue name (e.g., 'Stanford Auditorium', 'Zoom', 'Google Meet')"
    )
    address: Optional[str] = Field(
        None,
        description="Full physical address if applicable"
    )
    city: Optional[str] = Field(
        None,
        description="City name"
    )
    country: Optional[str] = Field(
        None,
        description="Country name"
    )
    link: Optional[HttpUrl] = Field(
        None,
        description="Link to virtual event (Zoom, Meet, etc.)"
    )


class ExtractedEvent(BaseModel):
    """
    Structured event data extracted from emails.
    
    This model represents a single event with all relevant details.
    LLMs are guided to fill these fields based on email content.
    """
    title: str = Field(
        ...,
        description="Clear, concise event title"
    )
    description: Optional[str] = Field(
        None,
        description="Detailed event description (2-3 sentences)"
    )
    event_type: EventType = Field(
        ...,
        description="Type of event (webinar, conference, workshop, etc.)"
    )
    start_date: Optional[str] = Field(
        None,
        description="Event start date in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"
    )
    end_date: Optional[str] = Field(
        None,
        description="Event end date in ISO 8601 format (optional)"
    )
    location: Optional[EventLocation] = Field(
        None,
        description="Event location details (physical, virtual, or hybrid)"
    )
    organizer: Optional[str] = Field(
        None,
        description="Event organizer name or organization"
    )
    speakers: Optional[List[str]] = Field(
        default_factory=list,
        description="List of speaker names"
    )
    registration_link: Optional[HttpUrl] = Field(
        None,
        description="URL for event registration"
    )
    registration_deadline: Optional[str] = Field(
        None,
        description="Registration deadline in ISO 8601 format"
    )
    cost: Optional[str] = Field(
        None,
        description="Event cost (e.g., 'Free', '$50', '₹500')"
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Relevant tags/keywords (e.g., ['AI', 'Machine Learning', 'Python'])"
    )
    
    @field_validator('start_date', 'end_date', 'registration_deadline')
    @classmethod
    def validate_date_format(cls, v):
        """Validate date strings are ISO 8601 format."""
        if v is None:
            return v
        try:
            # Try parsing to validate format
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            # Return as-is if validation fails (LLM will learn from examples)
            return v


class EventExtractionResult(BaseModel):
    """
    Complete result from event extraction.
    
    Supports multiple events per email (e.g., newsletter with event listings).
    """
    events: List[ExtractedEvent] = Field(
        default_factory=list,
        description="List of extracted events (can be empty if no events found)"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score for extraction quality (0.0 to 1.0)"
    )
    notes: Optional[str] = Field(
        None,
        description="Any extraction notes or ambiguities"
    )


# ============================================================================
# COURSE EXTRACTION
# ============================================================================

class ExtractedCourse(BaseModel):
    """
    Structured course/learning content data.
    """
    title: str = Field(
        ...,
        description="Course title"
    )
    description: Optional[str] = Field(
        None,
        description="Course description (2-3 sentences)"
    )
    provider: Optional[str] = Field(
        None,
        description="Course provider (e.g., 'Coursera', 'Udemy', 'Stanford Online')"
    )
    instructor: Optional[str] = Field(
        None,
        description="Instructor name(s)"
    )
    level: Optional[CourseLevel] = Field(
        None,
        description="Course difficulty level"
    )
    duration: Optional[str] = Field(
        None,
        description="Course duration (e.g., '6 weeks', '20 hours', '3 months')"
    )
    start_date: Optional[str] = Field(
        None,
        description="Course start date in ISO 8601 format"
    )
    enrollment_deadline: Optional[str] = Field(
        None,
        description="Last date to enroll in ISO 8601 format"
    )
    cost: Optional[str] = Field(
        None,
        description="Course cost (e.g., 'Free', '$99', 'Free with certificate for $49')"
    )
    certification: Optional[bool] = Field(
        None,
        description="Whether course offers certification"
    )
    link: Optional[HttpUrl] = Field(
        None,
        description="Course enrollment or information link"
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Relevant tags (e.g., ['Python', 'Data Science', 'Beginner'])"
    )


class CourseExtractionResult(BaseModel):
    """Complete result from course extraction."""
    courses: List[ExtractedCourse] = Field(
        default_factory=list,
        description="List of extracted courses"
    )
    confidence: float = Field(..., ge=0.0, le=1.0)
    notes: Optional[str] = None


# ============================================================================
# BLOG/ARTICLE EXTRACTION
# ============================================================================

class ExtractedBlog(BaseModel):
    """
    Structured blog post/article data.
    """
    title: str = Field(
        ...,
        description="Article title"
    )
    summary: Optional[str] = Field(
        None,
        description="Brief article summary (2-3 sentences)"
    )
    author: Optional[str] = Field(
        None,
        description="Article author name"
    )
    publication: Optional[str] = Field(
        None,
        description="Publication name (e.g., 'TechCrunch', 'Medium', company blog)"
    )
    published_date: Optional[str] = Field(
        None,
        description="Publication date in ISO 8601 format"
    )
    read_time: Optional[str] = Field(
        None,
        description="Estimated read time (e.g., '5 min read')"
    )
    category: Optional[ContentCategory] = Field(
        None,
        description="Article category"
    )
    link: Optional[HttpUrl] = Field(
        None,
        description="Article URL"
    )
    tags: List[str] = Field(
        default_factory=list,
        description="Relevant tags"
    )


class BlogExtractionResult(BaseModel):
    """Complete result from blog extraction."""
    blogs: List[ExtractedBlog] = Field(
        default_factory=list,
        description="List of extracted blog posts"
    )
    confidence: float = Field(..., ge=0.0, le=1.0)
    notes: Optional[str] = None


# ============================================================================
# ACTIONABLE ITEMS EXTRACTION
# ============================================================================

class ActionableItem(BaseModel):
    """
    An actionable item extracted from email.
    
    Examples:
    - "Register for workshop by Nov 30"
    - "Download whitepaper"
    - "RSVP to event"
    - "Complete survey"
    """
    action: str = Field(
        ...,
        description="Clear action description (verb + object)"
    )
    deadline: Optional[str] = Field(
        None,
        description="Action deadline in ISO 8601 format (if mentioned)"
    )
    priority: ActionPriority = Field(
        default=ActionPriority.MEDIUM,
        description="Action priority level"
    )
    link: Optional[HttpUrl] = Field(
        None,
        description="Link to perform action (registration, download, etc.)"
    )
    context: Optional[str] = Field(
        None,
        description="Additional context about the action"
    )


class ActionableItemsResult(BaseModel):
    """Complete result from actionable items extraction."""
    items: List[ActionableItem] = Field(
        default_factory=list,
        description="List of actionable items"
    )
    confidence: float = Field(..., ge=0.0, le=1.0)
    notes: Optional[str] = None


# ============================================================================
# EMAIL TAGGING
# ============================================================================

class EmailTags(BaseModel):
    """
    AI-generated tags for entire email.
    
    These are high-level categorizations and topics, not extracted entities.
    """
    primary_category: str = Field(
        ...,
        description="Primary email category (e.g., 'Technology News', 'Event Invitation', 'Course Offer')"
    )
    topics: List[str] = Field(
        ...,
        description="Main topics discussed (3-5 tags, e.g., ['AI', 'Machine Learning', 'GPT-4'])"
    )
    sender_type: str = Field(
        ...,
        description="Type of sender (e.g., 'Newsletter', 'Organization', 'Individual', 'Marketing')"
    )
    intent: str = Field(
        ...,
        description="Email intent (e.g., 'Inform', 'Promote', 'Invite', 'Educate')"
    )
    audience_level: str = Field(
        ...,
        description="Target audience level (e.g., 'Beginner', 'Professional', 'Expert', 'General')"
    )
    confidence: float = Field(..., ge=0.0, le=1.0)


# ============================================================================
# UNIFIED EXTRACTION MODEL (ALL CONTENT TYPES)
# ============================================================================

class UnifiedExtraction(BaseModel):
    """
    Complete extraction result for a single email.
    
    This is the master model returned by the extraction pipeline.
    Contains all extracted content types.
    """
    email_id: str = Field(
        ...,
        description="Original email ID (from Gmail)"
    )
    events: List[ExtractedEvent] = Field(default_factory=list)
    courses: List[ExtractedCourse] = Field(default_factory=list)
    blogs: List[ExtractedBlog] = Field(default_factory=list)
    actionable_items: List[ActionableItem] = Field(default_factory=list)
    tags: Optional[EmailTags] = None
    extracted_at: datetime = Field(
        default_factory=datetime.now,
        description="Timestamp when extraction was performed"
    )


# ============================================================================
# HELPER: GENERATE JSON SCHEMA FOR OPENAI
# ============================================================================

def get_json_schema(model: type[BaseModel]) -> dict:
    """
    Generate JSON Schema from Pydantic model for OpenAI structured outputs.
    
    Args:
        model: Pydantic model class
    
    Returns:
        JSON Schema dict compatible with OpenAI API
    
    Example:
        >>> schema = get_json_schema(EventExtractionResult)
        >>> # Use in OpenAI API call:
        >>> response = client.chat.completions.create(
        ...     model="gpt-4o-mini",
        ...     messages=[...],
        ...     response_format={
        ...         "type": "json_schema",
        ...         "json_schema": {
        ...             "name": "event_extraction",
        ...             "schema": schema
        ...         }
        ...     }
        ... )
    """
    return model.model_json_schema()


# Test schema generation
if __name__ == '__main__':
    import json
    
    # Generate schemas for all models
    models = [
        EventExtractionResult,
        CourseExtractionResult,
        BlogExtractionResult,
        ActionableItemsResult,
        EmailTags
    ]
    
    print("=" * 60)
    print("JSON SCHEMAS FOR OPENAI STRUCTURED OUTPUTS")
    print("=" * 60)
    
    for model in models:
        print(f"\n{model.__name__}:")
        schema = get_json_schema(model)
        print(json.dumps(schema, indent=2)[:500] + "...")
```


### 4.3 LLM Extraction Service

**Create `app/services/extractor.py`:**

```python
"""
LLM-Based Extraction Service

This module handles all LLM interactions for structured data extraction.
Uses OpenAI GPT-4o-mini with JSON Schema-constrained outputs.

Key Features:
- Structured outputs (guaranteed valid JSON)
- Batch processing with rate limiting
- Cost tracking
- Retry logic with exponential backoff
- Detailed logging

Theory:
- Prompt engineering guides LLM to find relevant information
- JSON Schema constrains output format
- Temperature=0 ensures deterministic results
- Few-shot examples improve accuracy (optional)

Author: FeedPrism Team
Date: Nov 2025
"""

import asyncio
import json
from typing import Any, Dict, List, Optional
from datetime import datetime

import openai
from openai import AsyncOpenAI
from loguru import logger
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

from app.config import settings
from app.models.extraction import (
    EventExtractionResult,
    CourseExtractionResult,
    BlogExtractionResult,
    ActionableItemsResult,
    EmailTags,
    UnifiedExtraction,
    get_json_schema
)


class LLMExtractor:
    """
    LLM-powered extraction service using OpenAI structured outputs.
    
    This class orchestrates all extraction tasks:
    - Event extraction
    - Course extraction
    - Blog extraction
    - Actionable items extraction
    - Email tagging
    
    Attributes:
        client: AsyncOpenAI client for parallel requests
        model: LLM model name (gpt-4o-mini)
        temperature: LLM temperature (0 = deterministic)
        max_tokens: Maximum tokens per response
        total_cost: Running total of API costs (USD)
    """
    
    def __init__(self):
        """Initialize extractor with OpenAI client."""
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.llm_model
        self.temperature = settings.llm_temperature
        self.max_tokens = settings.llm_max_tokens
        
        # Cost tracking
        self.total_cost = 0.0
        self.input_tokens = 0
        self.output_tokens = 0
    
    # ========================================================================
    # EVENT EXTRACTION
    # ========================================================================
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(openai.APIError)
    )
    async def extract_events(
        self,
        email_text: str,
        email_subject: str = ""
    ) -> EventExtractionResult:
        """
        Extract events from email text using LLM.
        
        Args:
            email_text: Parsed email text (plain text or cleaned HTML)
            email_subject: Email subject line (provides context)
        
        Returns:
            EventExtractionResult with extracted events
        
        Cost:
            ~$0.0003-0.0005 per email (GPT-4o-mini)
        """
        # Build prompt
        prompt = self._build_event_extraction_prompt(email_text, email_subject)
        
        # Get JSON schema
        schema = get_json_schema(EventExtractionResult)
        
        try:
            # Call OpenAI with structured output
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting structured event information from emails. Extract all events mentioned, even if details are incomplete."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "event_extraction",
                        "strict": True,
                        "schema": schema
                    }
                },
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            # Parse response
            content = response.choices[0].message.content
            result_dict = json.loads(content)
            result = EventExtractionResult(**result_dict)
            
            # Track costs
            self._track_usage(response.usage)
            
            logger.debug(f"Extracted {len(result.events)} events")
            return result
            
        except openai.APIError as e:
            logger.error(f"OpenAI API error during event extraction: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}\nContent: {content}")
            # Return empty result on parse failure
            return EventExtractionResult(events=[], confidence=0.0)
        except Exception as e:
            logger.error(f"Unexpected error during event extraction: {e}")
            return EventExtractionResult(events=[], confidence=0.0)
    
    def _build_event_extraction_prompt(
        self,
        email_text: str,
        email_subject: str
    ) -> str:
        """
        Build prompt for event extraction.
        
        Prompt engineering tips:
        - Clear task description
        - Input format specification
        - Output expectations
        - Edge case handling
        - Examples (few-shot learning)
        """
        prompt = f"""Extract all event information from the following email.

**Email Subject:** {email_subject}

**Email Content:**
{email_text[:4000]}  # Truncate to fit context window

**Instructions:**
1. Find all events mentioned in the email (webinars, conferences, workshops, meetups, etc.)
2. For each event, extract:
   - Title (required)
   - Description (summary in 2-3 sentences)
   - Event type (webinar, conference, workshop, meetup, seminar, hackathon, networking, other)
   - Dates (start_date, end_date in ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
   - Location (physical venue with address, virtual link, or hybrid)
   - Organizer name
   - Speakers (if mentioned)
   - Registration link (URL)
   - Registration deadline (if mentioned)
   - Cost (e.g., "Free", "$50", "₹500")
   - Relevant tags (keywords like "AI", "Python", "Networking")

3. If multiple events are mentioned, extract all of them
4. If information is missing, leave fields as null (don't guess)
5. For virtual events, include the platform (Zoom, Google Meet, etc.) in venue field
6. Convert all dates to ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
7. Set confidence score (0.0 to 1.0) based on information completeness

**Output:**
Return a JSON object with 'events' array, 'confidence' score, and optional 'notes'.
"""
        return prompt
    
    # ========================================================================
    # COURSE EXTRACTION
    # ========================================================================
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(openai.APIError)
    )
    async def extract_courses(
        self,
        email_text: str,
        email_subject: str = ""
    ) -> CourseExtractionResult:
        """Extract courses from email text."""
        prompt = self._build_course_extraction_prompt(email_text, email_subject)
        schema = get_json_schema(CourseExtractionResult)
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting structured course information from emails. Extract all courses, classes, or learning opportunities mentioned."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
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
            result_dict = json.loads(content)
            result = CourseExtractionResult(**result_dict)
            
            self._track_usage(response.usage)
            logger.debug(f"Extracted {len(result.courses)} courses")
            return result
            
        except Exception as e:
            logger.error(f"Error during course extraction: {e}")
            return CourseExtractionResult(courses=[], confidence=0.0)
    
    def _build_course_extraction_prompt(
        self,
        email_text: str,
        email_subject: str
    ) -> str:
        """Build prompt for course extraction."""
        prompt = f"""Extract all course and learning opportunity information from the following email.

**Email Subject:** {email_subject}

**Email Content:**
{email_text[:4000]}

**Instructions:**
1. Find all courses, classes, training programs, bootcamps, certifications mentioned
2. For each course, extract:
   - Title (required)
   - Description (2-3 sentences)
   - Provider (e.g., Coursera, Udemy, Stanford Online)
   - Instructor name(s)
   - Level (beginner, intermediate, advanced, all_levels)
   - Duration (e.g., "6 weeks", "20 hours", "3 months")
   - Start date (ISO 8601 format)
   - Enrollment deadline (ISO 8601 format)
   - Cost (e.g., "Free", "$99", "Free with $49 certificate")
   - Whether it offers certification (true/false)
   - Enrollment link (URL)
   - Relevant tags (e.g., "Python", "Data Science", "Beginner")

3. Extract all courses mentioned in the email
4. Leave fields null if information not provided
5. Set confidence score (0.0 to 1.0)

**Output:**
Return JSON with 'courses' array, 'confidence', and optional 'notes'.
"""
        return prompt
    
    # ========================================================================
    # BLOG EXTRACTION
    # ========================================================================
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(openai.APIError)
    )
    async def extract_blogs(
        self,
        email_text: str,
        email_subject: str = ""
    ) -> BlogExtractionResult:
        """Extract blog posts/articles from email text."""
        prompt = self._build_blog_extraction_prompt(email_text, email_subject)
        schema = get_json_schema(BlogExtractionResult)
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting structured blog and article information from emails. Extract all blog posts, articles, or written content mentioned."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "blog_extraction",
                        "strict": True,
                        "schema": schema
                    }
                },
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            content = response.choices[0].message.content
            result_dict = json.loads(content)
            result = BlogExtractionResult(**result_dict)
            
            self._track_usage(response.usage)
            logger.debug(f"Extracted {len(result.blogs)} blog posts")
            return result
            
        except Exception as e:
            logger.error(f"Error during blog extraction: {e}")
            return BlogExtractionResult(blogs=[], confidence=0.0)
    
    def _build_blog_extraction_prompt(
        self,
        email_text: str,
        email_subject: str
    ) -> str:
        """Build prompt for blog extraction."""
        prompt = f"""Extract all blog post and article information from the following email.

**Email Subject:** {email_subject}

**Email Content:**
{email_text[:4000]}

**Instructions:**
1. Find all blog posts, articles, or written content mentioned
2. For each blog/article, extract:
   - Title (required)
   - Summary (2-3 sentences)
   - Author name
   - Publication (e.g., "TechCrunch", "Medium", company blog)
   - Published date (ISO 8601 format)
   - Read time (e.g., "5 min read")
   - Category (technology, business, science, education, health, lifestyle, news, other)
   - Article link (URL)
   - Relevant tags

3. Extract all articles mentioned
4. Leave fields null if not provided
5. Set confidence score (0.0 to 1.0)

**Output:**
Return JSON with 'blogs' array, 'confidence', and optional 'notes'.
"""
        return prompt
    
    # ========================================================================
    # ACTIONABLE ITEMS EXTRACTION
    # ========================================================================
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(openai.APIError)
    )
    async def extract_actionable_items(
        self,
        email_text: str,
        email_subject: str = ""
    ) -> ActionableItemsResult:
        """Extract actionable items (CTAs) from email."""
        prompt = self._build_actionable_items_prompt(email_text, email_subject)
        schema = get_json_schema(ActionableItemsResult)
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at identifying actionable items and calls-to-action in emails. Extract all actions the recipient is asked to take."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "actionable_items",
                        "strict": True,
                        "schema": schema
                    }
                },
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            content = response.choices[0].message.content
            result_dict = json.loads(content)
            result = ActionableItemsResult(**result_dict)
            
            self._track_usage(response.usage)
            logger.debug(f"Extracted {len(result.items)} actionable items")
            return result
            
        except Exception as e:
            logger.error(f"Error during actionable items extraction: {e}")
            return ActionableItemsResult(items=[], confidence=0.0)
    
    def _build_actionable_items_prompt(
        self,
        email_text: str,
        email_subject: str
    ) -> str:
        """Build prompt for actionable items extraction."""
        prompt = f"""Extract all actionable items (calls-to-action) from the following email.

**Email Subject:** {email_subject}

**Email Content:**
{email_text[:4000]}

**Instructions:**
1. Find all actions the recipient is asked to take:
   - Register for events
   - Enroll in courses
   - Download resources
   - Complete surveys
   - RSVP
   - Apply for opportunities
   - Schedule meetings
   - Respond to invitations
   - Any other explicit CTAs

2. For each actionable item, extract:
   - Action (clear verb + object, e.g., "Register for AI workshop")
   - Deadline (ISO 8601 format if mentioned)
   - Priority (high, medium, low - infer from urgency language)
   - Link (URL to perform action)
   - Context (additional context about why/what)

3. Prioritize based on:
   - HIGH: Urgent deadlines, limited spots, time-sensitive
   - MEDIUM: No explicit urgency but clear CTA
   - LOW: Passive suggestions, "learn more" links

4. Extract all actionable items found
5. Set confidence score (0.0 to 1.0)

**Output:**
Return JSON with 'items' array, 'confidence', and optional 'notes'.
"""
        return prompt
    
    # ========================================================================
    # EMAIL TAGGING
    # ========================================================================
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(openai.APIError)
    )
    async def tag_email(
        self,
        email_text: str,
        email_subject: str = "",
        email_from: str = ""
    ) -> EmailTags:
        """Generate AI tags for entire email."""
        prompt = self._build_tagging_prompt(email_text, email_subject, email_from)
        schema = get_json_schema(EmailTags)
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at categorizing and tagging emails. Provide high-level categorizations and topic tags."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "email_tags",
                        "strict": True,
                        "schema": schema
                    }
                },
                temperature=self.temperature,
                max_tokens=500  # Tags are shorter
            )
            
            content = response.choices[0].message.content
            result_dict = json.loads(content)
            result = EmailTags(**result_dict)
            
            self._track_usage(response.usage)
            logger.debug(f"Generated {len(result.topics)} topic tags")
            return result
            
        except Exception as e:
            logger.error(f"Error during email tagging: {e}")
            # Return minimal tags on failure
            return EmailTags(
                primary_category="Unknown",
                topics=[],
                sender_type="Unknown",
                intent="Unknown",
                audience_level="General",
                confidence=0.0
            )
    
    def _build_tagging_prompt(
        self,
        email_text: str,
        email_subject: str,
        email_from: str
    ) -> str:
        """Build prompt for email tagging."""
        prompt = f"""Analyze and categorize the following email.

**From:** {email_from}
**Subject:** {email_subject}

**Email Content:**
{email_text[:3000]}

**Instructions:**
1. Determine the primary category (e.g., "Technology News", "Event Invitation", "Course Offer", "Product Update", "Newsletter Digest")

2. Extract 3-5 main topics discussed (specific keywords/themes)
   Examples: ["AI", "Machine Learning", "GPT-4"], ["Startup Funding", "Venture Capital"], ["Python", "Web Development"]

3. Classify sender type:
   - Newsletter (automated content digest)
   - Organization (company, institution)
   - Individual (personal email)
   - Marketing (promotional content)
   - Notification (automated alerts)

4. Identify primary intent:
   - Inform (share news/updates)
   - Promote (sell/advertise)
   - Invite (event/meeting invitation)
   - Educate (teach/explain)
   - Engage (build community)

5. Determine audience level:
   - Beginner (introductory content)
   - Professional (working professionals)
   - Expert (advanced/technical)
   - General (broad audience)

6. Set confidence score (0.0 to 1.0)

**Output:**
Return JSON with all tagging fields.
"""
        return prompt
    
    # ========================================================================
    # UNIFIED EXTRACTION (ALL TYPES)
    # ========================================================================
    
    async def extract_all(
        self,
        email_id: str,
        email_text: str,
        email_subject: str = "",
        email_from: str = ""
    ) -> UnifiedExtraction:
        """
        Perform all extractions in parallel for a single email.
        
        This is the main entry point for the extraction pipeline.
        It runs all extraction tasks concurrently to minimize latency.
        
        Args:
            email_id: Gmail email ID
            email_text: Parsed email text
            email_subject: Email subject line
            email_from: Sender email address
        
        Returns:
            UnifiedExtraction with all extracted content
        
        Cost:
            ~$0.001-0.002 per email (all extractions combined)
        """
        logger.info(f"Starting unified extraction for email {email_id}")
        
        # Run all extractions in parallel
        results = await asyncio.gather(
            self.extract_events(email_text, email_subject),
            self.extract_courses(email_text, email_subject),
            self.extract_blogs(email_text, email_subject),
            self.extract_actionable_items(email_text, email_subject),
            self.tag_email(email_text, email_subject, email_from),
            return_exceptions=True  # Don't fail if one extraction fails
        )
        
        # Unpack results (handle exceptions)
        events_result = results[0] if not isinstance(results[0], Exception) else EventExtractionResult(events=[], confidence=0.0)
        courses_result = results[1] if not isinstance(results[1], Exception) else CourseExtractionResult(courses=[], confidence=0.0)
        blogs_result = results[2] if not isinstance(results[2], Exception) else BlogExtractionResult(blogs=[], confidence=0.0)
        actions_result = results[3] if not isinstance(results[3], Exception) else ActionableItemsResult(items=[], confidence=0.0)
        tags_result = results[4] if not isinstance(results[4], Exception) else None
        
        # Build unified result
        unified = UnifiedExtraction(
            email_id=email_id,
            events=events_result.events,
            courses=courses_result.courses,
            blogs=blogs_result.blogs,
            actionable_items=actions_result.items,
            tags=tags_result
        )
        
        logger.success(
            f"Extraction complete for {email_id}: "
            f"{len(unified.events)} events, "
            f"{len(unified.courses)} courses, "
            f"{len(unified.blogs)} blogs, "
            f"{len(unified.actionable_items)} actions"
        )
        
        return unified
    
    # ========================================================================
    # BATCH PROCESSING
    # ========================================================================
    
    async def extract_batch(
        self,
        emails: List[Dict[str, Any]],
        max_concurrent: int = 5
    ) -> List[UnifiedExtraction]:
        """
        Process multiple emails in parallel batches.
        
        Args:
            emails: List of email dicts (from gmail_client)
            max_concurrent: Maximum concurrent API calls (rate limiting)
        
        Returns:
            List of UnifiedExtraction results
        
        Note:
            OpenAI has rate limits (3,500 RPM for tier 1).
            We batch requests to stay within limits and reduce costs.
        """
        logger.info(f"Starting batch extraction for {len(emails)} emails")
        
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def extract_with_semaphore(email: Dict[str, Any]) -> UnifiedExtraction:
            """Wrapper to limit concurrency."""
            async with semaphore:
                return await self.extract_all(
                    email_id=email['id'],
                    email_text=email.get('parsed_text', email.get('body_text', '')),
                    email_subject=email.get('subject', ''),
                    email_from=email.get('from', '')
                )
        
        # Process all emails
        results = await asyncio.gather(
            *[extract_with_semaphore(email) for email in emails],
            return_exceptions=True
        )
        
        # Filter out exceptions
        valid_results = [r for r in results if not isinstance(r, Exception)]
        
        logger.success(
            f"Batch extraction complete: {len(valid_results)}/{len(emails)} successful"
        )
        logger.info(f"Total cost: ${self.total_cost:.4f}")
        
        return valid_results
    
    # ========================================================================
    # COST TRACKING
    # ========================================================================
    
    def _track_usage(self, usage: Any) -> None:
        """
        Track token usage and costs.
        
        GPT-4o-mini pricing (Nov 2025):
        - Input: $0.150 per 1M tokens
        - Output: $0.600 per 1M tokens
        """
        input_tokens = usage.prompt_tokens
        output_tokens = usage.completion_tokens
        
        # Calculate cost
        input_cost = (input_tokens / 1_000_000) * 0.150
        output_cost = (output_tokens / 1_000_000) * 0.600
        total_cost = input_cost + output_cost
        
        # Update totals
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens
        self.total_cost += total_cost
        
        logger.debug(
            f"API call: {input_tokens} in + {output_tokens} out = ${total_cost:.6f}"
        )
    
    def get_cost_summary(self) -> Dict[str, Any]:
        """
        Get cost summary for all extractions.
        
        Returns:
            Dict with token usage and costs
        """
        return {
            'input_tokens': self.input_tokens,
            'output_tokens': self.output_tokens,
            'total_tokens': self.input_tokens + self.output_tokens,
            'input_cost_usd': (self.input_tokens / 1_000_000) * 0.150,
            'output_cost_usd': (self.output_tokens / 1_000_000) * 0.600,
            'total_cost_usd': self.total_cost
        }


# Test extraction
if __name__ == '__main__':
    import asyncio
    
    # Sample email text
    sample_text = """
    Join us for an exciting AI Workshop!
    
    Event: Large Language Models Workshop
    Date: November 30, 2025
    Time: 2:00 PM - 5:00 PM IST
    Location: Virtual (Zoom)
    
    Learn about the latest advances in LLMs, including GPT-4, Claude, and Llama.
    Our expert speakers will cover:
    - LLM architecture and training
    - Prompt engineering best practices
    - Building production LLM applications
    
    Registration is free but required. Register by November 28.
    
    Register now: https://example.com/register
    
    Also check out our new course: "Deep Learning Fundamentals" starting December 5!
    """
    
    async def test():
        extractor = LLMExtractor()
        
        # Test unified extraction
        result = await extractor.extract_all(
            email_id="test123",
            email_text=sample_text,
            email_subject="AI Workshop - Register Now!",
            email_from="events@example.com"
        )
        
        print("=" * 60)
        print("EXTRACTION TEST RESULTS")
        print("=" * 60)
        print(f"\nEvents: {len(result.events)}")
        for event in result.events:
            print(f"  - {event.title}")
            print(f"    Date: {event.start_date}")
            print(f"    Type: {event.event_type}")
        
        print(f"\nCourses: {len(result.courses)}")
        for course in result.courses:
            print(f"  - {course.title}")
        
        print(f"\nActionable Items: {len(result.actionable_items)}")
        for item in result.actionable_items:
            print(f"  - {item.action} (Priority: {item.priority})")
        
        if result.tags:
            print(f"\nTags:")
            print(f"  Category: {result.tags.primary_category}")
            print(f"  Topics: {result.tags.topics}")
        
        # Cost summary
        cost = extractor.get_cost_summary()
        print(f"\nCost: ${cost['total_cost_usd']:.6f}")
        print(f"Tokens: {cost['total_tokens']}")
    
    asyncio.run(test())
```


### 4.4 Batch Extraction Script

**Create `scripts/extract_content.py`:**

```python
"""
Batch Content Extraction Script

This script processes ingested emails and extracts structured content
using the LLM extraction pipeline.

Usage:
    python scripts/extract_content.py data/raw_emails/emails_20251124.json
    python scripts/extract_content.py data/raw_emails/emails_20251124.json --max 50
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger

from app.config import settings
from app.services.extractor import LLMExtractor


async def main():
    parser = argparse.ArgumentParser(
        description="Extract structured content from ingested emails"
    )
    parser.add_argument(
        'input_file',
        type=Path,
        help='Input JSON file with ingested emails'
    )
    parser.add_argument(
        '--max',
        type=int,
        default=None,
        help='Maximum emails to process (default: all)'
    )
    parser.add_argument(
        '--output',
        type=Path,
        default=None,
        help='Output JSON file (default: data/extracted/extracted_TIMESTAMP.json)'
    )
    parser.add_argument(
        '--concurrent',
        type=int,
        default=5,
        help='Maximum concurrent API calls (default: 5)'
    )
    
    args = parser.parse_args()
    
    # Validate input file
    if not args.input_file.exists():
        print(f"❌ Input file not found: {args.input_file}")
        sys.exit(1)
    
    # Configure logger
    log_file = settings.data_dir / "logs" / f"extraction_{datetime.now():%Y%m%d_%H%M%S}.log"
    logger.add(log_file, level=settings.log_level)
    
    logger.info("=" * 60)
    logger.info("FeedPrism Content Extraction")
    logger.info("=" * 60)
    logger.info(f"Input file: {args.input_file}")
    logger.info(f"Max concurrent: {args.concurrent}")
    
    # Load emails
    logger.info("\n📂 Loading emails...")
    with open(args.input_file, 'r') as f:
        emails = json.load(f)
    
    # Limit if requested
    if args.max:
        emails = emails[:args.max]
    
    logger.info(f"Loaded {len(emails)} emails")
    
    # Initialize extractor
    extractor = LLMExtractor()
    
    # Process emails
    logger.info(f"\n🤖 Extracting content from {len(emails)} emails...")
    start_time = datetime.now()
    
    results = await extractor.extract_batch(
        emails,
        max_concurrent=args.concurrent
    )
    
    elapsed = (datetime.now() - start_time).total_seconds()
    
    logger.success(f"\n✅ Extracted content from {len(results)} emails in {elapsed:.1f}s")
    
    # Convert to serializable dicts
    output_data = []
    for result in results:
        result_dict = result.model_dump(mode='json')
        output_data.append(result_dict)
    
    # Save results
    output_path = args.output or (
        settings.data_dir / "extracted" / f"extracted_{datetime.now():%Y%m%d_%H%M%S}.json"
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False, default=str)
    
    logger.success(f"💾 Saved to: {output_path}")
    
    # Cost summary
    cost = extractor.get_cost_summary()
    
    print("\n" + "=" * 60)
    print("EXTRACTION SUMMARY")
    print("=" * 60)
    print(f"Emails processed: {len(results)}")
    print(f"Processing time: {elapsed:.1f}s")
    print(f"Average time per email: {elapsed/len(results):.2f}s")
    
    # Count extracted entities
    total_events = sum(len(r.events) for r in results)
    total_courses = sum(len(r.courses) for r in results)
    total_blogs = sum(len(r.blogs) for r in results)
    total_actions = sum(len(r.actionable_items) for r in results)
    
    print(f"\nExtracted entities:")
    print(f"  Events: {total_events}")
    print(f"  Courses: {total_courses}")
    print(f"  Blogs: {total_blogs}")
    print(f"  Actionable items: {total_actions}")
    print(f"  Total: {total_events + total_courses + total_blogs + total_actions}")
    
    print(f"\nAPI Usage:")
    print(f"  Input tokens: {cost['input_tokens']:,}")
    print(f"  Output tokens: {cost['output_tokens']:,}")
    print(f"  Total tokens: {cost['total_tokens']:,}")
    print(f"  Total cost: ${cost['total_cost_usd']:.4f}")
    print(f"  Cost per email: ${cost['total_cost_usd']/len(results):.6f}")
    
    print(f"\n📊 Log file: {log_file}")


if __name__ == '__main__':
    asyncio.run(main())
```


### 4.5 Test Extraction Pipeline

**Run extraction on your ingested emails:**

```bash
# Extract from the ingested emails (use the actual filename from Day 1)
python scripts/extract_content.py data/raw_emails/emails_20251124_162030.json --max 10 --concurrent 3
```

**Expected output:**

```
============================================================
FeedPrism Content Extraction
============================================================
Input file: data/raw_emails/emails_20251124_162030.json
Max concurrent: 3

📂 Loading emails...
Loaded 10 emails

🤖 Extracting content from 10 emails...
✅ Extracted content from 10 emails in 15.3s

💾 Saved to: data/extracted/extracted_20251124_170000.json

============================================================
EXTRACTION SUMMARY
============================================================
Emails processed: 10
Processing time: 15.3s
Average time per email: 1.53s

Extracted entities:
  Events: 12
  Courses: 5
  Blogs: 8
  Actionable items: 15
  Total: 40

API Usage:
  Input tokens: 15,234
  Output tokens: 2,156
  Total tokens: 17,390
  Total cost: $0.0036
  Cost per email: $0.000360

📊 Log file: data/logs/extraction_20251124_170000.log
```

**Inspect extracted data:**

```bash
# View first extracted result
python -c "
import json
with open('data/extracted/extracted_20251124_170000.json') as f:
    data = json.load(f)
    print(json.dumps(data[0], indent=2)[:2000])
"
```


***

**🎉 DAY 2 COMPLETE!**

You now have:

- ✅ Pydantic models for all content types (Events, Courses, Blogs, Actions, Tags)
- ✅ LLM extraction service with structured outputs (GPT-4o-mini)
- ✅ Parallel batch processing with rate limiting
- ✅ Cost tracking (\$0.0004 per email)
- ✅ 40+ extracted entities from 10 emails
- ✅ JSON output ready for vector database indexing

**Cost check:** Processing 200 emails will cost ~\$0.08-0.10 (well under budget!)

**Next Steps:** Day 3 - Set up Qdrant vector database and implement hybrid search (dense embeddings + BM25 sparse vectors).

Should I proceed with Day 3?

