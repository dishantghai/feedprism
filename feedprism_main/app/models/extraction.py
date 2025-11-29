"""
Data Models for Content Extraction

Pydantic models for structured extraction of events, courses, and blogs
from email content. These models serve dual purposes:
1. Type-safe data validation in Python
2. JSON Schema generation for LLM structured output

Theory:
- Pydantic validates data at runtime (catches bad LLM outputs)
- Field descriptions become LLM prompts via JSON Schema
- Optional fields allow partial extraction (LLM can return null)
- HttpUrl type validates URL format automatically

Author: FeedPrism Team
Date: Nov 2025
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, HttpUrl, field_validator
from loguru import logger


class EventStatus(str, Enum):
    """Event temporal status."""
    UPCOMING = "upcoming"
    PAST = "past"
    UNKNOWN = "unknown"


class EventType(str, Enum):
    """Type of event."""
    WEBINAR = "webinar"
    CONFERENCE = "conference"
    WORKSHOP = "workshop"
    MEETUP = "meetup"
    TALK = "talk"
    HACKATHON = "hackathon"
    OTHER = "other"


class ExtractedEvent(BaseModel):
    """
    Pydantic model for extracted event information.
    
    This model represents a single event extracted from an email.
    All fields except 'title' are optional to handle partial extraction.
    """
    
    title: str = Field(
        ...,
        description="Event title or name",
        min_length=3,
        max_length=200
    )
    
    hook: Optional[str] = Field(
        None,
        description="A compelling 1-2 sentence summary that captures why someone should attend",
        max_length=300
    )
    
    description: Optional[str] = Field(
        None,
        description="Detailed event description",
        max_length=2000
    )
    
    event_type: Optional[EventType] = Field(
        None,
        description="Type of event (webinar, conference, workshop, meetup, talk, hackathon, other)"
    )
    
    image_url: Optional[str] = Field(
        None,
        description="URL of event banner, poster, or thumbnail image if found in the email"
    )
    
    start_time: Optional[str] = Field(
        None,
        description="Event start date and time in ISO 8601 format (e.g., '2025-12-15T14:00:00')"
    )
    
    end_time: Optional[str] = Field(
        None,
        description="Event end date and time in ISO 8601 format"
    )
    
    timezone: Optional[str] = Field(
        None,
        description="Timezone (e.g., 'America/New_York', 'UTC', 'PST')"
    )
    
    location: Optional[str] = Field(
        None,
        description="Event location (physical address or 'Online' for virtual events)"
    )
    
    registration_link: Optional[str] = Field(
        None,
        description="URL to register for the event or get more information"
    )
    
    tags: List[str] = Field(
        default_factory=list,
        description="Relevant tags or categories (e.g., ['AI', 'Workshop', 'Free'])"
    )
    
    organizer: Optional[str] = Field(
        None,
        description="Event organizer or host name"
    )
    
    cost: Optional[str] = Field(
        None,
        description="Cost information (e.g., 'Free', '$50', 'Members only')"
    )
    
    is_free: Optional[bool] = Field(
        None,
        description="Whether the event is free to attend"
    )

    model_config = {
        "extra": "forbid"
    }
    
    @field_validator('start_time', 'end_time')
    @classmethod
    def validate_iso_format(cls, v: Optional[str]) -> Optional[str]:
        """Validate that datetime strings are in ISO 8601 format."""
        if v is None:
            return v
        
        try:
            # Try parsing as ISO 8601
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            logger.warning(f"Invalid datetime format: {v}, expected ISO 8601")
            # Return as-is (LLM might use different format)
            return v
    
    def compute_status(self) -> EventStatus:
        """
        Compute event status (upcoming/past/unknown) based on start_time.
        
        Returns:
            EventStatus enum value
        """
        if not self.start_time:
            return EventStatus.UNKNOWN
        
        try:
            start_dt = datetime.fromisoformat(self.start_time.replace('Z', '+00:00'))
            now = datetime.now(start_dt.tzinfo)
            
            if start_dt > now:
                return EventStatus.UPCOMING
            else:
                return EventStatus.PAST
        except Exception:
            return EventStatus.UNKNOWN


class EventExtractionResult(BaseModel):
    """
    Result of event extraction from email.
    
    Contains a list of extracted events and a confidence score.
    Used as the response schema for LLM structured output.
    
    Attributes:
        events: List of extracted events
        confidence: Extraction confidence (0.0 = no confidence, 1.0 = high confidence)
    """
    
    events: List[ExtractedEvent] = Field(
        default_factory=list,
        description="List of events extracted from the email"
    )
    
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score for the extraction (0.0 to 1.0)"
    )

    model_config = {
        "extra": "forbid"
    }


###############################################################################
# Course Extraction Models
###############################################################################

class CourseLevel(str, Enum):
    """Course difficulty level."""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    ALL_LEVELS = "all_levels"


class ExtractedCourse(BaseModel):
    """Pydantic model for extracted course information."""
    
    title: str = Field(..., description="Course title")
    
    hook: Optional[str] = Field(
        None, 
        description="A compelling 1-2 sentence summary of what you'll learn and why it matters",
        max_length=300
    )
    
    description: Optional[str] = Field(None, description="Detailed course description")
    
    image_url: Optional[str] = Field(
        None,
        description="URL of course thumbnail or banner image if found in the email"
    )
    
    provider: Optional[str] = Field(None, description="Course provider (e.g., Coursera, Udemy, Company name)")
    instructor: Optional[str] = Field(None, description="Instructor name")
    level: Optional[CourseLevel] = Field(None, description="Course difficulty level")
    duration: Optional[str] = Field(None, description="Course duration (e.g., '6 weeks', '20 hours')")
    cost: Optional[str] = Field(None, description="Cost information (e.g., 'Free', '$49', 'Subscription')")
    is_free: Optional[bool] = Field(None, description="Whether the course is free")
    enrollment_link: Optional[str] = Field(None, description="Course enrollment URL")
    tags: List[str] = Field(default_factory=list, description="Relevant tags/topics")
    start_date: Optional[str] = Field(None, description="Course start date (if fixed schedule)")
    certificate_offered: Optional[bool] = Field(None, description="Whether a certificate is offered")
    what_you_learn: Optional[List[str]] = Field(
        default_factory=list,
        description="Key learning outcomes or skills (max 5 bullet points)"
    )


class CourseExtractionResult(BaseModel):
    """Result of course extraction from email."""
    
    courses: List[ExtractedCourse] = Field(default_factory=list, description="List of extracted courses")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence (0.0 - 1.0)")


###############################################################################
# Blog Extraction Models
###############################################################################

class ExtractedBlog(BaseModel):
    """Pydantic model for extracted blog/article information."""
    
    title: str = Field(..., description="Blog post title")
    
    hook: Optional[str] = Field(
        None, 
        description="The compelling opening line or teaser that makes readers want to click - extract this from the email if present",
        max_length=400
    )
    
    description: Optional[str] = Field(None, description="Article summary or key takeaways")
    
    image_url: Optional[str] = Field(
        None,
        description="URL of article thumbnail, hero image, or author avatar if found in the email"
    )
    
    author: Optional[str] = Field(None, description="Author name")
    author_title: Optional[str] = Field(None, description="Author's role or credentials (e.g., 'CTO at Stripe', 'AI Researcher')")
    published_date: Optional[str] = Field(None, description="Publication date (ISO 8601)")
    url: Optional[str] = Field(None, description="Article URL")
    category: Optional[str] = Field(None, description="Content category (e.g., 'AI', 'Web Dev', 'Career')")
    reading_time: Optional[str] = Field(None, description="Estimated reading time (e.g., '5 min read')")
    tags: List[str] = Field(default_factory=list, description="Article tags/topics")
    source: Optional[str] = Field(None, description="Publication source (blog name, newsletter name)")
    key_points: Optional[List[str]] = Field(
        default_factory=list,
        description="Key takeaways or main points from the article (max 3-5 bullet points)"
    )


class BlogExtractionResult(BaseModel):
    """Result of blog extraction from email."""
    
    blogs: List[ExtractedBlog] = Field(default_factory=list, description="List of extracted blogs/articles")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Extraction confidence")
