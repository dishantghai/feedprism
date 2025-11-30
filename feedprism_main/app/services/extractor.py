"""
LLM-based Content Extraction Service

Uses OpenAI's structured output to extract events from email text.
Guarantees valid JSON output matching the Pydantic schema.

Author: FeedPrism Team
"""

import json
from typing import Dict, List, Optional

from openai import AsyncOpenAI
from loguru import logger

from app.config import settings
from app.models.extraction import (
    EventExtractionResult,
    CourseExtractionResult,
    BlogExtractionResult
)


class LLMExtractor:
    """LLM-based extractor for structured content from emails."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        self.client = AsyncOpenAI(api_key=api_key or settings.openai_api_key)
        self.model = model or settings.llm_model
        self.temperature = settings.llm_temperature
        self.max_tokens = settings.llm_max_tokens
        
        logger.info(f"LLMExtractor initialized: model={self.model}")
    
    async def extract_events(
        self,
        email_text: str,
        email_subject: str = ""
    ) -> EventExtractionResult:
        """Extract event information from email text."""
        logger.info(f"Extracting events from: '{email_subject[:50]}...'")
        
        prompt = self._build_prompt(email_text, email_subject)
        try:
            response = await self.client.beta.chat.completions.parse(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting event information from emails."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format=EventExtractionResult,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            result = response.choices[0].message.parsed
            
            logger.success(f"Extracted {len(result.events)} events (confidence: {result.confidence:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Extraction failed: {e}")
            return EventExtractionResult(events=[], confidence=0.0)
    
    async def extract_courses(
        self,
        email_text: str,
        email_subject: str = ""
    ) -> CourseExtractionResult:
        """Extract course information from email text."""
        logger.info(f"Extracting courses from: '{email_subject[:50]}...'")
        
        prompt = self._build_course_prompt(email_text, email_subject)
        try:
            response = await self.client.beta.chat.completions.parse(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting course and learning opportunity data from emails."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format=CourseExtractionResult,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            result = response.choices[0].message.parsed
            
            logger.success(f"Extracted {len(result.courses)} courses (confidence: {result.confidence:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Course extraction failed: {e}")
            return CourseExtractionResult(courses=[], confidence=0.0)
    
    async def extract_blogs(
        self,
        email_text: str,
        email_subject: str = "",
        images: List[Dict[str, str]] = None
    ) -> BlogExtractionResult:
        """Extract blog/article information from email text.
        
        Args:
            email_text: Parsed email content
            email_subject: Email subject line
            images: List of image dicts with 'src' and 'alt' keys extracted from HTML
        """
        logger.info(f"Extracting blogs from: '{email_subject[:50]}...'")
        
        prompt = self._build_blog_prompt(email_text, email_subject, images)
        try:
            response = await self.client.beta.chat.completions.parse(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting blog and article information from emails."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format=BlogExtractionResult,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            result = response.choices[0].message.parsed
            
            logger.success(f"Extracted {len(result.blogs)} blogs (confidence: {result.confidence:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Blog extraction failed: {e}")
            return BlogExtractionResult(blogs=[], confidence=0.0)
    
    def _build_prompt(self, email_text: str, email_subject: str) -> str:
        """Build event extraction prompt."""
        truncated = email_text[:4000]
        if len(email_text) > 4000:
            truncated += "\n\n[... truncated ...]"
        
        return f"""Extract TIME-BOUND EVENTS from this email.

=== WHAT IS AN EVENT? ===
An EVENT is a scheduled gathering that happens at a SPECIFIC DATE AND TIME where people attend together.

EXTRACT AS EVENTS:
✓ Webinars (live online sessions with a specific time)
✓ Conferences (multi-day industry gatherings)
✓ Meetups (community gatherings, networking events)
✓ Workshops (hands-on sessions at a specific time)
✓ Talks/Presentations (speaker sessions)
✓ Hackathons (time-bound coding competitions)
✓ AMAs, Q&A sessions, office hours
✓ Product launches, demo days

DO NOT EXTRACT AS EVENTS:
✗ Online courses (even if they have a start date - those go in courses)
✗ Articles or blog posts (those go in blogs)
✗ Self-paced tutorials
✗ Podcast episodes
✗ Pre-recorded videos

Email Subject: {email_subject}

Email Content:
{truncated}

=== EXTRACTION INSTRUCTIONS ===
For each event found, extract:
- title: Event name
- hook: 1-2 sentence compelling reason to attend
- description: What the event is about
- event_type: webinar | conference | workshop | meetup | talk | hackathon | other
- start_time: ISO 8601 format (REQUIRED for events - if no date, it's probably not an event)
- end_time: ISO 8601 format if available
- timezone: Event timezone
- location: Physical address OR "Online"
- registration_link: URL to register/RSVP
- organizer: Host/organizer name
- cost: Price or "Free"
- is_free: true/false
- image_url: Event banner/poster URL if found
- tags: Relevant categories

KEY: If there's no specific date/time, it's probably NOT an event.
Return confidence 0.0 and empty array if no events found.
"""
    
    def _build_course_prompt(self, email_text: str, email_subject: str) -> str:
        """Build course extraction prompt."""
        truncated = email_text[:4000]
        if len(email_text) > 4000:
            truncated += "\n\n[... truncated ...]"
        
        return f"""Extract STRUCTURED LEARNING COURSES from this email.

=== WHAT IS A COURSE? ===
A COURSE is a STRUCTURED EDUCATIONAL PROGRAM with a curriculum designed to teach specific skills over time.

EXTRACT AS COURSES:
✓ Online courses (Coursera, Udemy, edX, LinkedIn Learning, etc.)
✓ Bootcamps (intensive training programs)
✓ Certification programs
✓ Multi-session training series
✓ Cohort-based courses (with structured curriculum)
✓ Self-paced video courses
✓ Masterclasses

DO NOT EXTRACT AS COURSES:
✗ Single webinars or talks (those are events - one-time sessions)
✗ Meetups (those are events - networking gatherings)
✗ Blog posts or tutorials (those are blogs - articles to read)
✗ Podcast episodes
✗ Conference sessions

=== KEY DIFFERENTIATOR ===
- If it's a SINGLE SESSION at a specific time → EVENT (not course)
- If it's STRUCTURED LEARNING with multiple lessons/modules → COURSE
- If it's an ARTICLE to read → BLOG (not course)

Email Subject: {email_subject}

Email Content:
{truncated}

=== EXTRACTION INSTRUCTIONS ===
For each course found, extract:
- title: Course name
- hook: 1-2 sentence pitch about what you'll learn
- description: What the course covers
- provider: Platform (Coursera, Udemy, etc.) or company offering it
- instructor: Teacher name if mentioned
- level: beginner | intermediate | advanced | all_levels
- duration: Course length (e.g., "6 weeks", "20 hours")
- cost: Price or "Free"
- is_free: true/false
- enrollment_link: URL to enroll
- start_date: If cohort-based, when it starts
- certificate_offered: true/false
- what_you_learn: 3-5 key skills/outcomes
- image_url: Course thumbnail if found
- tags: Topics covered

Return confidence 0.0 and empty array if no courses found.
"""
    
    def _build_blog_prompt(
        self,
        email_text: str,
        email_subject: str,
        images: List[Dict[str, str]] = None
    ) -> str:
        """Build blog extraction prompt with image context."""
        truncated = email_text[:4000]
        if len(email_text) > 4000:
            truncated += "\n\n[... truncated ...]"
        
        # Build image context section
        image_section = ""
        if images and len(images) > 0:
            image_section = "\n\n=== IMAGES FOUND IN EMAIL ===\n"
            for img in images[:10]:  # Limit to 10 images
                image_section += f"- {img['src']}"
                if img.get('alt'):
                    image_section += f" (alt: {img['alt']})"
                image_section += "\n"
            image_section += "\nUse these URLs for the image_url field when they match article content.\n"
        
        return f"""Extract ARTICLES AND BLOG POSTS from this email.

=== WHAT IS A BLOG/ARTICLE? ===
A BLOG is written content (article, essay, tutorial, guide) that you READ. It's passive consumption, not active participation.

EXTRACT AS BLOGS:
✓ Blog posts and articles
✓ Newsletter featured content/essays
✓ Written tutorials and guides
✓ Opinion pieces and essays
✓ Research summaries
✓ Industry news and analysis
✓ Case studies
✓ Podcast show notes (the written summary)

DO NOT EXTRACT AS BLOGS:
✗ Events, webinars, meetups (those are events - you attend them)
✗ Online courses (those are courses - structured learning)
✗ Product announcements without article content
✗ Job postings
✗ Pure promotional content without informational value

=== KEY DIFFERENTIATOR ===
- If you ATTEND it at a time → EVENT
- If you ENROLL and learn over time → COURSE  
- If you READ it → BLOG

Email Subject: {email_subject}

Email Content:
{truncated}
{image_section}
=== HOOK EXTRACTION (CRITICAL FOR ENGAGEMENT) ===
The hook is the MOST IMPORTANT field. It's the teaser that makes someone click and read.

FIND THE HOOK in:
1. Opening sentence that teases the content
2. Pull quotes or highlighted text
3. "Why X matters...", "How to...", "The secret to..."
4. Statistics or surprising facts ("90% of developers...")
5. Questions that pique curiosity ("What if you could...?")

If no explicit hook exists in the email, CREATE ONE from the article's main value proposition.

GOOD HOOKS (compelling, specific):
- "The counterintuitive approach that helped Stripe scale to millions of requests"
- "Why your RAG pipeline is probably broken (and how to fix it)"
- "3 lessons from building AI products that nobody talks about"

BAD HOOKS (avoid these):
- "This is an article about AI" (too generic)
- "Read this article" (not compelling)
- Just repeating the title (no added value)

=== EXTRACTION INSTRUCTIONS ===
For each article/blog found, extract:
- title: Article headline
- hook: Compelling teaser (REQUIRED - create one if not explicit)
- description: Brief summary of article content
- author: Writer's name
- author_title: Their role if mentioned (e.g., "CTO at Stripe")
- published_date: Publication date (ISO 8601)
- url: Link to full article (REQUIRED - if no link, might not be a real article)
- category: Topic category (AI, Career, Startup, Engineering, etc.)
- reading_time: Estimated read time if mentioned
- source: Publication/newsletter name
- key_points: 3-5 main takeaways from the article
- image_url: Article thumbnail/hero image URL from the images list above
- tags: Relevant topics

Return confidence 0.0 and empty array if no articles found.
"""
