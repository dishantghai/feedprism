"""
LLM-based Content Extraction Service

Uses OpenAI's structured output to extract events from email text.
Guarantees valid JSON output matching the Pydantic schema.

Author: FeedPrism Team
"""

import json
from typing import Optional

from openai import AsyncOpenAI
from loguru import logger

from app.config import settings
from app.models.extraction import EventExtractionResult


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
    
    def _build_prompt(self, email_text: str, email_subject: str) -> str:
        """Build extraction prompt."""
        truncated = email_text[:3000]
        if len(email_text) > 3000:
            truncated += "\n\n[... truncated ...]"
        
        return f"""Extract all event information from this email.

Email Subject: {email_subject}

Email Content:
{truncated}

Instructions:
1. Find all events, webinars, conferences, meetups, or workshops
2. Extract: title, description, start_time (ISO 8601), end_time, timezone, location, registration_link, tags, organizer, cost
3. Use null for missing information
4. Return confidence score (0.0-1.0)
5. If no events found, return empty array with confidence 0.0
"""
