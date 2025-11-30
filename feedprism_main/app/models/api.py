"""
API Response Models

Pydantic models for API responses used by the frontend.
"""

from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# =============================================================================
# Base Models
# =============================================================================

class ExtractedItemBase(BaseModel):
    """Base model for extracted items (events, courses, blogs)."""
    id: str
    title: str
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    url: Optional[str] = None
    extracted_at: Optional[str] = None


class ExtractedEvent(ExtractedItemBase):
    """Event extracted from email."""
    type: Literal["event"] = "event"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    organizer: Optional[str] = None
    cost: Optional[str] = None
    registration_link: Optional[str] = None


class ExtractedCourse(ExtractedItemBase):
    """Course extracted from email."""
    type: Literal["course"] = "course"
    provider: Optional[str] = None
    instructor: Optional[str] = None
    level: Optional[str] = None
    duration: Optional[str] = None
    cost: Optional[str] = None
    enrollment_link: Optional[str] = None
    start_date: Optional[str] = None


class ExtractedBlog(ExtractedItemBase):
    """Blog/article extracted from email."""
    type: Literal["blog"] = "blog"
    author: Optional[str] = None
    published_date: Optional[str] = None
    source: Optional[str] = None
    reading_time: Optional[str] = None
    category: Optional[str] = None


# Union type for any extracted item
ExtractedItem = ExtractedEvent | ExtractedCourse | ExtractedBlog


# =============================================================================
# Email Models
# =============================================================================

class EmailSummary(BaseModel):
    """Summary of a raw email for the Prism visualization."""
    id: str
    subject: str
    sender: str
    sender_email: str
    received_at: str
    snippet: Optional[str] = None
    extracted_count: int = 0


class EmailDetail(EmailSummary):
    """Full email details with extracted items."""
    body_preview: Optional[str] = None
    body_html: Optional[str] = None  # Full HTML body for modal view
    body_text: Optional[str] = None  # Plain text fallback
    gmail_link: Optional[str] = None  # Deep link to Gmail
    extracted_items: List[ExtractedItem] = Field(default_factory=list)


# =============================================================================
# Feed Models
# =============================================================================

class FeedItem(BaseModel):
    """A feed item combining email context with extracted content."""
    id: str
    email_id: str
    email_subject: str
    sender: str
    sender_email: str
    received_at: str
    item_type: Literal["event", "course", "blog"]
    title: str
    hook: Optional[str] = None        # Compelling summary/teaser
    description: Optional[str] = None
    image_url: Optional[str] = None   # Thumbnail/banner image
    tags: List[str] = Field(default_factory=list)
    url: Optional[str] = None
    is_free: Optional[bool] = None
    
    # Event-specific fields
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    timezone: Optional[str] = None
    location: Optional[str] = None
    organizer: Optional[str] = None
    event_type: Optional[str] = None  # webinar, conference, workshop, etc.
    cost: Optional[str] = None
    
    # Course-specific fields
    provider: Optional[str] = None
    instructor: Optional[str] = None
    level: Optional[str] = None
    duration: Optional[str] = None
    certificate_offered: Optional[bool] = None
    what_you_learn: List[str] = Field(default_factory=list)
    
    # Blog-specific fields
    author: Optional[str] = None
    author_title: Optional[str] = None
    source: Optional[str] = None
    category: Optional[str] = None
    reading_time: Optional[str] = None
    published_date: Optional[str] = None
    key_points: List[str] = Field(default_factory=list)
    
    # Metadata
    score: Optional[float] = None
    extracted_at: Optional[str] = None


class FeedResponse(BaseModel):
    """Paginated feed response."""
    items: List[FeedItem]
    total: int
    page: int
    page_size: int
    has_more: bool


# =============================================================================
# Search Models
# =============================================================================

class SearchRequest(BaseModel):
    """Search request with filters."""
    query: str = ""
    types: List[Literal["event", "course", "blog"]] = Field(
        default_factory=lambda: ["event", "course", "blog"]
    )
    tags: List[str] = Field(default_factory=list)
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=100)


class SearchResponse(BaseModel):
    """Search results response."""
    results: List[FeedItem]
    total: int
    query: str


# =============================================================================
# Metrics Models
# =============================================================================

class CategoryCount(BaseModel):
    """Count for a single category."""
    type: str
    count: int
    icon: str


class MetricsResponse(BaseModel):
    """Metrics for the dashboard."""
    total_emails_processed: int
    total_items_extracted: int
    categories: List[CategoryCount]
    top_tags: dict
    last_sync: Optional[str] = None
    
    # Quality metrics (for hackathon)
    precision: Optional[float] = None
    mrr: Optional[float] = None
    avg_latency_ms: Optional[float] = None
    dedup_rate: Optional[float] = None


class PrismStats(BaseModel):
    """Stats for the Prism Overview section."""
    recent_emails: List[EmailSummary]
    category_counts: List[CategoryCount]
    total_extracted: int
    last_sync: Optional[str] = None
