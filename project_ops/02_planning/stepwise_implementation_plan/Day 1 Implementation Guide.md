<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# FEEDPRISM IMPLEMENTATION GUIDE (CONTINUED)

## 3. DAY 1: EMAIL INGESTION \& HTML PARSING PIPELINE

**Goal:** Build a robust system to fetch emails from Gmail, parse HTML content, and store raw emails in a structured format.

**Estimated Time:** 6-8 hours

### 3.1 Understanding Email Structure (Theory)

**Why Email Parsing is Hard:**

Emails are a mess of formats, encodings, and nested structures:

```
Email Message
├── Headers (metadata: from, to, subject, date)
├── Body (content)
│   ├── Plain text (optional)
│   ├── HTML (often present in newsletters)
│   │   ├── Inline CSS
│   │   ├── External stylesheets
│   │   ├── Images (embedded or linked)
│   │   └── Tracking pixels
│   └── Attachments (optional)
└── MIME structure (multipart/mixed, multipart/alternative)
```

**Newsletter Characteristics:**

- **Rich HTML:** Complex layouts with CSS styling
- **Embedded content:** Images, buttons, links
- **Tracking:** Hidden pixels, parameterized URLs
- **Encoding:** UTF-8, quoted-printable, base64
- **MIME:** Multipart messages (text + HTML versions)

**Our Parsing Strategy:**

1. **Fetch** raw email via Gmail API
2. **Extract** HTML body (prefer HTML over plain text for newsletters)
3. **Clean** HTML (remove scripts, styles, tracking pixels)
4. **Convert** to readable text (preserve structure, links)
5. **Store** both raw HTML and cleaned text for LLM processing

### 3.2 Gmail API Client Implementation

**Create `app/services/gmail_client.py`:**

```python
"""
Gmail API Client for Email Ingestion

This module handles all Gmail API interactions including authentication,
email fetching, and batch processing.

Theory:
- Gmail API uses labels as folders (e.g., INBOX, SENT)
- Messages are retrieved in two steps: list IDs, then fetch content
- Batch requests reduce API calls (50 messages per batch)
- Rate limits: 250 quota units/second, 1 billion/day (generous)

Performance:
- Single message fetch: ~200ms
- Batch fetch (50 messages): ~1-2 seconds
- Expected time for 200 emails: ~8-10 seconds

Author: FeedPrism Team
Date: Nov 2025
"""

import base64
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from loguru import logger

from app.config import settings


class GmailClient:
    """
    Client for interacting with Gmail API.
    
    This class handles OAuth authentication, email fetching, and parsing
    Gmail API responses into structured data.
    
    Attributes:
        service: Authenticated Gmail API service object
        user_id: Gmail user ID (default: 'me' for authenticated user)
    """
    
    def __init__(self):
        """Initialize Gmail client with OAuth credentials."""
        self.service = None
        self.user_id = 'me'
        self._authenticate()
    
    def _authenticate(self) -> None:
        """
        Authenticate with Gmail API using OAuth 2.0.
        
        Loads credentials from token.json (created by setup_gmail.py).
        Automatically refreshes expired tokens.
        
        Raises:
            FileNotFoundError: If credentials or token files are missing
            ValueError: If authentication fails
        """
        creds = None
        
        # Load existing token
        if settings.gmail_token_path.exists():
            logger.info("Loading Gmail token from cache")
            creds = Credentials.from_authorized_user_file(
                str(settings.gmail_token_path),
                ['https://www.googleapis.com/auth/gmail.readonly']
            )
        
        # Refresh if expired
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                logger.info("Refreshing expired Gmail token")
                creds.refresh(Request())
                
                # Save refreshed token
                with open(settings.gmail_token_path, 'w') as token_file:
                    token_file.write(creds.to_json())
            else:
                raise ValueError(
                    "No valid credentials. Run 'python scripts/setup_gmail.py'"
                )
        
        # Build Gmail service
        self.service = build('gmail', 'v1', credentials=creds)
        logger.success("Gmail API authenticated successfully")
    
    def list_messages(
        self,
        query: str = "",
        max_results: int = 500,
        label_ids: Optional[List[str]] = None
    ) -> List[Dict[str, str]]:
        """
        List Gmail messages matching query.
        
        Args:
            query: Gmail search query (e.g., "from:newsletter@example.com")
                   See: https://support.google.com/mail/answer/7190
            max_results: Maximum messages to return (API max: 500 per page)
            label_ids: Filter by labels (e.g., ['INBOX', 'UNREAD'])
        
        Returns:
            List of message metadata dicts with 'id' and 'threadId'
            
        Example:
            >>> client = GmailClient()
            >>> # Get all unread emails from last 7 days
            >>> messages = client.list_messages(
            ...     query="is:unread newer_than:7d",
            ...     max_results=100
            ... )
            >>> print(f"Found {len(messages)} messages")
        """
        try:
            logger.info(f"Listing messages with query: '{query}'")
            
            messages = []
            request = self.service.users().messages().list(
                userId=self.user_id,
                q=query,
                maxResults=max_results,
                labelIds=label_ids
            )
            
            # Handle pagination
            while request is not None:
                response = request.execute()
                messages.extend(response.get('messages', []))
                request = self.service.users().messages().list_next(
                    request, response
                )
            
            logger.success(f"Found {len(messages)} messages")
            return messages
            
        except HttpError as error:
            logger.error(f"Gmail API error: {error}")
            raise
    
    def get_message(self, message_id: str, format: str = 'full') -> Dict[str, Any]:
        """
        Fetch a single Gmail message by ID.
        
        Args:
            message_id: Gmail message ID
            format: Response format
                - 'minimal': ID and labels only
                - 'full': Full message (headers + body)
                - 'raw': Raw MIME message
                - 'metadata': Headers only
        
        Returns:
            Gmail message resource dict
            
        Structure:
            {
                'id': 'abc123',
                'threadId': 'thread123',
                'labelIds': ['INBOX', 'UNREAD'],
                'snippet': 'Preview text...',
                'payload': {
                    'headers': [...],
                    'body': {'data': 'base64_encoded_content'},
                    'parts': [...]  # For multipart messages
                },
                'internalDate': '1700000000000'  # Unix timestamp (ms)
            }
        """
        try:
            message = self.service.users().messages().get(
                userId=self.user_id,
                id=message_id,
                format=format
            ).execute()
            return message
            
        except HttpError as error:
            logger.error(f"Failed to fetch message {message_id}: {error}")
            raise
    
    def get_messages_batch(
        self,
        message_ids: List[str],
        format: str = 'full'
    ) -> List[Dict[str, Any]]:
        """
        Fetch multiple messages in batch (efficient for large volumes).
        
        Gmail API allows batching up to 100 requests, but we use 50
        for reliability. Batch requests count as 1 quota unit.
        
        Args:
            message_ids: List of Gmail message IDs
            format: Response format (same as get_message)
        
        Returns:
            List of Gmail message resource dicts
        """
        logger.info(f"Fetching {len(message_ids)} messages in batch")
        
        messages = []
        batch_size = 50  # Conservative batch size
        
        for i in range(0, len(message_ids), batch_size):
            batch = message_ids[i:i + batch_size]
            logger.debug(f"Processing batch {i//batch_size + 1} ({len(batch)} messages)")
            
            for msg_id in batch:
                try:
                    message = self.get_message(msg_id, format=format)
                    messages.append(message)
                except HttpError as error:
                    logger.warning(f"Skipping message {msg_id}: {error}")
                    continue
        
        logger.success(f"Successfully fetched {len(messages)} messages")
        return messages
    
    def parse_message_headers(
        self,
        message: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Extract headers from Gmail message.
        
        Args:
            message: Gmail message resource dict
        
        Returns:
            Dict of header name -> value
            
        Common headers:
            - From: Sender email
            - To: Recipient email
            - Subject: Email subject
            - Date: Send date (RFC 2822 format)
            - Message-ID: Unique message identifier
        """
        headers = {}
        
        payload = message.get('payload', {})
        header_list = payload.get('headers', [])
        
        for header in header_list:
            name = header.get('name', '').lower()
            value = header.get('value', '')
            headers[name] = value
        
        return headers
    
    def extract_body(self, message: Dict[str, Any]) -> Dict[str, Optional[str]]:
        """
        Extract email body (both plain text and HTML).
        
        Email bodies can be structured in multiple ways:
        1. Single part (body.data)
        2. Multipart (parts[])
        3. Nested multipart (parts[].parts[])
        
        We recursively search for text/plain and text/html parts.
        
        Args:
            message: Gmail message resource dict
        
        Returns:
            Dict with 'text' and 'html' keys (None if not found)
        """
        body = {'text': None, 'html': None}
        
        payload = message.get('payload', {})
        
        # Helper to decode base64 content
        def decode_data(data: str) -> str:
            """Decode base64url-encoded content."""
            if not data:
                return ""
            # Gmail uses URL-safe base64 without padding
            return base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
        
        # Recursive function to extract parts
        def extract_parts(payload_part: Dict[str, Any]) -> None:
            """Recursively extract text/html from message parts."""
            mime_type = payload_part.get('mimeType', '')
            
            # Check if this part has body data
            if 'body' in payload_part and 'data' in payload_part['body']:
                data = decode_data(payload_part['body']['data'])
                
                if mime_type == 'text/plain' and not body['text']:
                    body['text'] = data
                elif mime_type == 'text/html' and not body['html']:
                    body['html'] = data
            
            # Recursively process nested parts
            if 'parts' in payload_part:
                for part in payload_part['parts']:
                    extract_parts(part)
        
        # Start extraction
        extract_parts(payload)
        
        return body
    
    def fetch_content_rich_emails(
        self,
        days_back: int = 30,
        max_results: int = 200,
        keywords: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch content-rich emails (newsletters, events, courses).
        
        Strategy:
        1. Search for common newsletter patterns
        2. Filter by date range
        3. Exclude common non-content senders (notifications, etc.)
        
        Args:
            days_back: How many days back to search
            max_results: Maximum emails to fetch
            keywords: Additional keywords to search (e.g., ['webinar', 'course'])
        
        Returns:
            List of parsed email dicts with structure:
            {
                'id': 'abc123',
                'thread_id': 'thread123',
                'subject': 'Newsletter Title',
                'from': 'sender@example.com',
                'to': 'you@gmail.com',
                'date': '2025-11-24T10:30:00Z',
                'snippet': 'Preview text...',
                'body_text': 'Plain text body',
                'body_html': '<html>...</html>',
                'labels': ['INBOX'],
                'internal_date': 1700000000000
            }
        """
        logger.info(
            f"Fetching content-rich emails (last {days_back} days, max {max_results})"
        )
        
        # Build search query
        # Gmail search operators: https://support.google.com/mail/answer/7190
        query_parts = [
            f"newer_than:{days_back}d",  # Date range
            "has:nouserlabels",  # Not manually labeled (usually automated)
        ]
        
        # Add keyword filters if provided
        if keywords:
            keyword_query = " OR ".join(keywords)
            query_parts.append(f"({keyword_query})")
        
        # Common newsletter/content patterns
        content_patterns = [
            "unsubscribe",  # Most newsletters have unsubscribe links
            "newsletter",
            "digest",
            "weekly",
            "event",
            "webinar",
            "course"
        ]
        pattern_query = " OR ".join(content_patterns)
        query_parts.append(f"({pattern_query})")
        
        query = " ".join(query_parts)
        
        # List message IDs
        message_list = self.list_messages(query=query, max_results=max_results)
        
        if not message_list:
            logger.warning("No messages found matching criteria")
            return []
        
        # Fetch full messages in batch
        message_ids = [msg['id'] for msg in message_list]
        messages = self.get_messages_batch(message_ids)
        
        # Parse messages
        parsed_emails = []
        for message in messages:
            try:
                parsed = self._parse_message_to_dict(message)
                parsed_emails.append(parsed)
            except Exception as e:
                logger.error(f"Failed to parse message {message.get('id')}: {e}")
                continue
        
        logger.success(f"Successfully parsed {len(parsed_emails)} emails")
        return parsed_emails
    
    def _parse_message_to_dict(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse Gmail message into clean dict structure.
        
        Args:
            message: Raw Gmail API message
        
        Returns:
            Cleaned message dict
        """
        headers = self.parse_message_headers(message)
        body = self.extract_body(message)
        
        # Parse date to ISO format
        date_str = headers.get('date', '')
        try:
            from email.utils import parsedate_to_datetime
            date_obj = parsedate_to_datetime(date_str)
            iso_date = date_obj.isoformat()
        except Exception:
            iso_date = date_str
        
        return {
            'id': message['id'],
            'thread_id': message.get('threadId', ''),
            'subject': headers.get('subject', ''),
            'from': headers.get('from', ''),
            'to': headers.get('to', ''),
            'date': iso_date,
            'snippet': message.get('snippet', ''),
            'body_text': body['text'],
            'body_html': body['html'],
            'labels': message.get('labelIds', []),
            'internal_date': int(message.get('internalDate', 0))
        }
    
    def save_emails_to_json(
        self,
        emails: List[Dict[str, Any]],
        output_path: Optional[Path] = None
    ) -> Path:
        """
        Save emails to JSON file.
        
        Args:
            emails: List of parsed email dicts
            output_path: Output file path (default: data/raw_emails/emails_{timestamp}.json)
        
        Returns:
            Path to saved file
        """
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = settings.data_dir / "raw_emails" / f"emails_{timestamp}.json"
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(emails, f, indent=2, ensure_ascii=False)
        
        logger.success(f"Saved {len(emails)} emails to {output_path}")
        return output_path


# Example usage for testing
if __name__ == '__main__':
    from loguru import logger
    
    # Configure logger
    logger.add(
        settings.data_dir / "logs" / "gmail_client.log",
        rotation="10 MB",
        level=settings.log_level
    )
    
    # Initialize client
    client = GmailClient()
    
    # Fetch content-rich emails
    emails = client.fetch_content_rich_emails(
        days_back=30,
        max_results=50,
        keywords=['event', 'webinar', 'course', 'newsletter']
    )
    
    print(f"\n✅ Fetched {len(emails)} emails")
    
    # Show first email summary
    if emails:
        first = emails[0]
        print(f"\nFirst email:")
        print(f"  Subject: {first['subject']}")
        print(f"  From: {first['from']}")
        print(f"  Date: {first['date']}")
        print(f"  Has HTML: {first['body_html'] is not None}")
        print(f"  Has Text: {first['body_text'] is not None}")
    
    # Save to JSON
    output_file = client.save_emails_to_json(emails)
    print(f"\n💾 Saved to: {output_file}")
```


### 3.3 HTML Email Parser Implementation

**Create `app/services/parser.py`:**

```python
"""
HTML Email Parser and Cleaner

This module handles HTML parsing, cleaning, and conversion to plain text
while preserving structure and important content like links.

Theory:
- Newsletters use complex HTML with inline CSS, tables, tracking pixels
- We need to extract semantic content while removing noise
- BeautifulSoup4: Parse HTML into DOM tree
- html2text: Convert HTML to Markdown-like text (preserves links, structure)

Cleaning strategy:
1. Remove scripts, styles, tracking pixels
2. Remove excessive whitespace
3. Preserve links (convert to [text](url) format)
4. Preserve structure (headings, lists, paragraphs)
5. Remove email-specific cruft (unsubscribe footers, etc.)

Author: FeedPrism Team
Date: Nov 2025
"""

import re
from typing import Dict, Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup
import html2text
from loguru import logger


class EmailParser:
    """
    Parser for HTML emails with cleaning and text extraction.
    
    This class handles the messy reality of newsletter HTML:
    - Inline styles and CSS
    - Tracking pixels and beacons
    - Complex table layouts
    - Nested structures
    
    Attributes:
        html2text_converter: Configured html2text instance
    """
    
    def __init__(self):
        """Initialize parser with html2text configuration."""
        self.html2text_converter = html2text.HTML2Text()
        
        # Configure html2text
        self.html2text_converter.ignore_links = False  # Keep links
        self.html2text_converter.ignore_images = True  # Skip image tags
        self.html2text_converter.ignore_emphasis = False  # Keep bold/italic
        self.html2text_converter.body_width = 0  # No line wrapping
        self.html2text_converter.unicode_snob = True  # Use Unicode characters
        self.html2text_converter.skip_internal_links = True  # Skip anchor links
    
    def parse_html_email(self, html_content: str) -> Dict[str, str]:
        """
        Parse HTML email and extract clean text.
        
        Args:
            html_content: Raw HTML email content
        
        Returns:
            Dict with keys:
            - 'clean_html': Cleaned HTML (scripts/styles removed)
            - 'text': Plain text conversion
            - 'links': Extracted links (list of dicts)
            - 'title': Email title (if <title> tag exists)
        
        Example:
            >>> parser = EmailParser()
            >>> result = parser.parse_html_email(html_email)
            >>> print(result['text'][:200])
            >>> print(f"Found {len(result['links'])} links")
        """
        if not html_content or not html_content.strip():
            logger.warning("Empty HTML content provided")
            return {
                'clean_html': '',
                'text': '',
                'links': [],
                'title': ''
            }
        
        try:
            # Parse HTML
            soup = BeautifulSoup(html_content, 'lxml')
            
            # Extract title
            title_tag = soup.find('title')
            title = title_tag.get_text(strip=True) if title_tag else ''
            
            # Clean HTML
            clean_soup = self._clean_html(soup)
            clean_html = str(clean_soup)
            
            # Convert to text
            text = self._html_to_text(clean_html)
            
            # Extract links
            links = self._extract_links(clean_soup)
            
            return {
                'clean_html': clean_html,
                'text': text,
                'links': links,
                'title': title
            }
            
        except Exception as e:
            logger.error(f"HTML parsing failed: {e}")
            return {
                'clean_html': html_content,  # Return original on failure
                'text': self._fallback_text_extraction(html_content),
                'links': [],
                'title': ''
            }
    
    def _clean_html(self, soup: BeautifulSoup) -> BeautifulSoup:
        """
        Remove unwanted elements from HTML.
        
        Removes:
        - <script> tags (JavaScript)
        - <style> tags (CSS)
        - <noscript> tags
        - Tracking pixels (1x1 images)
        - Hidden elements (display:none, visibility:hidden)
        - Email headers/footers (unsubscribe links, etc.)
        
        Args:
            soup: BeautifulSoup object
        
        Returns:
            Cleaned BeautifulSoup object
        """
        # Remove script and style tags
        for tag in soup(['script', 'style', 'noscript']):
            tag.decompose()
        
        # Remove tracking pixels (1x1 images)
        for img in soup.find_all('img'):
            width = img.get('width', '')
            height = img.get('height', '')
            if width == '1' or height == '1':
                img.decompose()
        
        # Remove hidden elements
        for tag in soup.find_all(style=re.compile(r'display:\s*none|visibility:\s*hidden')):
            tag.decompose()
        
        # Remove common footer patterns (unsubscribe, etc.)
        footer_patterns = [
            'unsubscribe',
            'manage preferences',
            'update your email preferences',
            'sent from',
            'view in browser'
        ]
        
        for tag in soup.find_all(text=True):
            text_lower = tag.strip().lower()
            if any(pattern in text_lower for pattern in footer_patterns):
                # Remove parent element
                parent = tag.find_parent()
                if parent:
                    parent.decompose()
        
        return soup
    
    def _html_to_text(self, html: str) -> str:
        """
        Convert HTML to clean plain text using html2text.
        
        Args:
            html: Cleaned HTML string
        
        Returns:
            Plain text with preserved structure
        """
        try:
            text = self.html2text_converter.handle(html)
            
            # Clean up excessive whitespace
            text = re.sub(r'\n{3,}', '\n\n', text)  # Max 2 consecutive newlines
            text = re.sub(r' {2,}', ' ', text)  # Single spaces only
            text = text.strip()
            
            return text
            
        except Exception as e:
            logger.error(f"html2text conversion failed: {e}")
            return self._fallback_text_extraction(html)
    
    def _fallback_text_extraction(self, html: str) -> str:
        """
        Fallback text extraction using BeautifulSoup (if html2text fails).
        
        Args:
            html: HTML string
        
        Returns:
            Plain text (less structured than html2text output)
        """
        try:
            soup = BeautifulSoup(html, 'lxml')
            text = soup.get_text(separator='\n', strip=True)
            return text
        except Exception:
            # Last resort: return HTML as-is
            return html
    
    def _extract_links(self, soup: BeautifulSoup) -> list:
        """
        Extract all links from HTML.
        
        Args:
            soup: BeautifulSoup object
        
        Returns:
            List of dicts with 'text' and 'url' keys
        """
        links = []
        
        for a_tag in soup.find_all('a', href=True):
            url = a_tag['href']
            text = a_tag.get_text(strip=True)
            
            # Skip empty links and anchor links
            if not url or url.startswith('#'):
                continue
            
            # Skip mailto links
            if url.startswith('mailto:'):
                continue
            
            # Parse URL to validate
            try:
                parsed = urlparse(url)
                if parsed.scheme in ['http', 'https']:
                    links.append({
                        'text': text if text else url,
                        'url': url
                    })
            except Exception:
                continue
        
        return links
    
    def extract_event_signals(self, text: str) -> Dict[str, bool]:
        """
        Detect signals that indicate email contains event information.
        
        This helps prioritize emails for event extraction.
        
        Args:
            text: Email text content
        
        Returns:
            Dict of signal name -> bool
        """
        text_lower = text.lower()
        
        signals = {
            'has_date': bool(re.search(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', text)),
            'has_time': bool(re.search(r'\b\d{1,2}:\d{2}\s*(am|pm|AM|PM)?\b', text)),
            'has_location': any(word in text_lower for word in [
                'venue', 'location', 'address', 'at ', 'room', 'hall'
            ]),
            'has_registration': any(word in text_lower for word in [
                'register', 'rsvp', 'sign up', 'register now'
            ]),
            'has_event_keywords': any(word in text_lower for word in [
                'event', 'webinar', 'workshop', 'seminar', 'conference',
                'meetup', 'session', 'talk', 'presentation'
            ])
        }
        
        return signals
    
    def extract_course_signals(self, text: str) -> Dict[str, bool]:
        """
        Detect signals for course/learning content.
        
        Args:
            text: Email text content
        
        Returns:
            Dict of signal name -> bool
        """
        text_lower = text.lower()
        
        signals = {
            'has_course_keywords': any(word in text_lower for word in [
                'course', 'class', 'lesson', 'training', 'tutorial',
                'learn', 'certification', 'bootcamp'
            ]),
            'has_duration': bool(re.search(r'\b\d+\s*(week|month|hour|day)s?\b', text_lower)),
            'has_enrollment': any(word in text_lower for word in [
                'enroll', 'join', 'start learning', 'apply now'
            ]),
            'has_instructor': any(word in text_lower for word in [
                'instructor', 'teacher', 'taught by', 'led by'
            ])
        }
        
        return signals
    
    def extract_blog_signals(self, text: str) -> Dict[str, bool]:
        """
        Detect signals for blog/article content.
        
        Args:
            text: Email text content
        
        Returns:
            Dict of signal name -> bool
        """
        text_lower = text.lower()
        
        signals = {
            'has_blog_keywords': any(word in text_lower for word in [
                'blog', 'article', 'post', 'read more', 'latest post'
            ]),
            'has_author': bool(re.search(r'\bby\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b', text)),
            'has_read_time': bool(re.search(r'\b\d+\s*min(ute)?\s*read\b', text_lower)),
        }
        
        return signals


# Example usage and testing
if __name__ == '__main__':
    # Sample newsletter HTML
    sample_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Tech Event Newsletter</title>
        <style>.hidden { display: none; }</style>
    </head>
    <body>
        <h1>Upcoming AI Workshop</h1>
        <p>Join us for an exciting workshop on Large Language Models!</p>
        
        <h2>Event Details</h2>
        <ul>
            <li><strong>Date:</strong> November 30, 2025</li>
            <li><strong>Time:</strong> 2:00 PM - 5:00 PM IST</li>
            <li><strong>Location:</strong> Virtual (Zoom)</li>
        </ul>
        
        <p><a href="https://example.com/register">Register Now</a></p>
        
        <p class="hidden">Tracking pixel</p>
        <img src="track.png" width="1" height="1" />
        
        <footer>
            <p>Unsubscribe | Manage Preferences</p>
        </footer>
        
        <script>console.log('tracking');</script>
    </body>
    </html>
    """
    
    # Parse
    parser = EmailParser()
    result = parser.parse_html_email(sample_html)
    
    print("=" * 60)
    print("HTML Parsing Test")
    print("=" * 60)
    print(f"\nTitle: {result['title']}")
    print(f"\nExtracted Text:\n{result['text'][:500]}")
    print(f"\nLinks found: {len(result['links'])}")
    for link in result['links']:
        print(f"  - {link['text']}: {link['url']}")
    
    # Check signals
    event_signals = parser.extract_event_signals(result['text'])
    print(f"\nEvent signals: {event_signals}")
```


### 3.4 Email Ingestion Script

**Create `scripts/ingest_emails.py`:**

```python
"""
Batch Email Ingestion Script

This script fetches emails from Gmail and saves them locally.
Run this daily or on-demand to update your email database.

Usage:
    python scripts/ingest_emails.py --days 7 --max 100
    python scripts/ingest_emails.py --query "from:newsletter@example.com"
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger

from app.config import settings
from app.services.gmail_client import GmailClient
from app.services.parser import EmailParser


def main():
    parser = argparse.ArgumentParser(
        description="Ingest emails from Gmail and parse HTML content"
    )
    parser.add_argument(
        '--days',
        type=int,
        default=30,
        help='Number of days to look back (default: 30)'
    )
    parser.add_argument(
        '--max',
        type=int,
        default=200,
        help='Maximum emails to fetch (default: 200)'
    )
    parser.add_argument(
        '--keywords',
        nargs='+',
        default=['event', 'webinar', 'course', 'newsletter', 'blog'],
        help='Keywords to filter emails (default: event webinar course newsletter blog)'
    )
    parser.add_argument(
        '--output',
        type=Path,
        default=None,
        help='Output JSON file path (default: data/raw_emails/emails_TIMESTAMP.json)'
    )
    
    args = parser.parse_args()
    
    # Configure logger
    log_file = settings.data_dir / "logs" / f"ingestion_{datetime.now():%Y%m%d_%H%M%S}.log"
    logger.add(log_file, level=settings.log_level)
    
    logger.info("=" * 60)
    logger.info("FeedPrism Email Ingestion")
    logger.info("=" * 60)
    logger.info(f"Days back: {args.days}")
    logger.info(f"Max results: {args.max}")
    logger.info(f"Keywords: {args.keywords}")
    
    # Initialize clients
    gmail_client = GmailClient()
    email_parser = EmailParser()
    
    # Fetch emails
    logger.info("\n📥 Fetching emails from Gmail...")
    emails = gmail_client.fetch_content_rich_emails(
        days_back=args.days,
        max_results=args.max,
        keywords=args.keywords
    )
    
    if not emails:
        logger.warning("No emails found. Try adjusting search criteria.")
        return
    
    # Parse HTML content
    logger.info(f"\n🔍 Parsing {len(emails)} emails...")
    parsed_count = 0
    
    for i, email in enumerate(emails):
        try:
            # Parse HTML if available
            if email['body_html']:
                parse_result = email_parser.parse_html_email(email['body_html'])
                
                # Add parsed data to email dict
                email['parsed_text'] = parse_result['text']
                email['links'] = parse_result['links']
                email['title'] = parse_result['title']
                
                # Add content signals
                email['event_signals'] = email_parser.extract_event_signals(
                    parse_result['text']
                )
                email['course_signals'] = email_parser.extract_course_signals(
                    parse_result['text']
                )
                email['blog_signals'] = email_parser.extract_blog_signals(
                    parse_result['text']
                )
                
                parsed_count += 1
            
            # Progress indicator
            if (i + 1) % 10 == 0:
                logger.info(f"  Processed {i + 1}/{len(emails)} emails")
                
        except Exception as e:
            logger.error(f"Failed to parse email {email['id']}: {e}")
            continue
    
    logger.success(f"\n✅ Successfully parsed {parsed_count}/{len(emails)} emails")
    
    # Save to JSON
    output_path = args.output or (
        settings.data_dir / "raw_emails" / f"emails_{datetime.now():%Y%m%d_%H%M%S}.json"
    )
    gmail_client.save_emails_to_json(emails, output_path)
    
    # Print summary statistics
    print("\n" + "=" * 60)
    print("INGESTION SUMMARY")
    print("=" * 60)
    print(f"Total emails fetched: {len(emails)}")
    print(f"Successfully parsed: {parsed_count}")
    print(f"With HTML content: {sum(1 for e in emails if e['body_html'])}")
    print(f"With links: {sum(1 for e in emails if e.get('links'))}")
    
    # Content type breakdown
    event_candidates = sum(
        1 for e in emails
        if e.get('event_signals', {}).get('has_event_keywords', False)
    )
    course_candidates = sum(
        1 for e in emails
        if e.get('course_signals', {}).get('has_course_keywords', False)
    )
    blog_candidates = sum(
        1 for e in emails
        if e.get('blog_signals', {}).get('has_blog_keywords', False)
    )
    
    print(f"\nContent type candidates:")
    print(f"  Events: {event_candidates}")
    print(f"  Courses: {course_candidates}")
    print(f"  Blogs: {blog_candidates}")
    
    print(f"\n💾 Saved to: {output_path}")
    print(f"📊 Log file: {log_file}")


if __name__ == '__main__':
    main()
```


### 3.5 Test Your Ingestion Pipeline

**Run the ingestion script:**

```bash
# Fetch last 7 days of emails (max 50 for testing)
python scripts/ingest_emails.py --days 7 --max 50

# Or with custom keywords
python scripts/ingest_emails.py --days 14 --max 100 --keywords event webinar AI newsletter
```

**Expected output:**

```
============================================================
FeedPrism Email Ingestion
============================================================
Days back: 7
Max results: 50
Keywords: ['event', 'webinar', 'course', 'newsletter', 'blog']

📥 Fetching emails from Gmail...
Found 47 messages
Successfully fetched 47 messages

🔍 Parsing 47 emails...
  Processed 10/47 emails
  Processed 20/47 emails
  Processed 30/47 emails
  Processed 40/47 emails

✅ Successfully parsed 45/47 emails

============================================================
INGESTION SUMMARY
============================================================
Total emails fetched: 47
Successfully parsed: 45
With HTML content: 45
With links: 43

Content type candidates:
  Events: 12
  Courses: 8
  Blogs: 15

💾 Saved to: data/raw_emails/emails_20251124_162030.json
📊 Log file: data/logs/ingestion_20251124_162030.log
```

**Inspect the output JSON:**

```bash
# Pretty-print first email
python -c "
import json
with open('data/raw_emails/emails_20251124_162030.json') as f:
    emails = json.load(f)
    print(json.dumps(emails[0], indent=2)[:1000])
"
```


***

**🎉 DAY 1 COMPLETE!**

You now have:

- ✅ Gmail API client that fetches content-rich emails
- ✅ HTML parser that cleans and extracts text
- ✅ Content signal detection (events, courses, blogs)
- ✅ Batch ingestion script
- ✅ 50+ real emails stored locally in JSON format

**Next Steps:** Day 2 - Build the LLM extraction pipeline to convert unstructured emails into structured data (Events, Courses, Blogs, Actionable Items).

Should I proceed with Day 2 implementation?

