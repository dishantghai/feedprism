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