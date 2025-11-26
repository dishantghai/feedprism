# Phase 1: Core Pipeline - Email Ingestion & Basic Extraction

**Goal:** Build end-to-end pipeline: Gmail → Parse → Extract Events → Embed → Store → Search

**Estimated Time:** 12-14 hours

**Prerequisites:** Phase 0 complete (verified ✅)

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Module 1.1: Gmail Client Service](#module-11-gmail-client-service)
3. [Module 1.2: HTML Email Parser](#module-12-html-email-parser)
4. [Module 1.3: Event Data Models](#module-13-event-data-models)
5. [Module 1.4: LLM Extractor Service](#module-14-llm-extractor-service)
6. [Module 1.5: Embedding Service](#module-15-embedding-service)
7. [Module 1.6: Qdrant Client (Single Collection)](#module-16-qdrant-client-single-collection)
8. [Module 1.7: End-to-End Integration](#module-17-end-to-end-integration)
9. [Verification & Testing](#verification--testing)
10. [Troubleshooting](#troubleshooting)

---

## 1. Overview & Architecture

### 1.1 What We're Building (Phase 1)

**Simplified Pipeline** (Phase 1 focuses on **EVENTS ONLY**):

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│  Gmail  │────▶│  Parse  │────▶│ Extract  │────▶│  Embed   │
│   API   │     │  HTML   │     │  Events  │     │  Vectors │
└─────────┘     └─────────┘     └──────────┘     └──────────┘
                                                        │
                                                        ▼
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│ Results │◀────│  Search │◀────│  Query   │◀────│  Qdrant  │
│ Display │     │  Engine │     │  Vector  │     │  Storage │
└─────────┘     └─────────┘     └──────────┘     └──────────┘
```

**Why Start Simple:**
- **Single content type**: Events only (add courses/blogs in Phase 2)
- **Single collection**: One Qdrant collection (split in Phase 4)
- **Single vector**: One embedding per event (add named vectors in Phase 4)
- **Dense search only**: No sparse/hybrid yet (add in Phase 3)

**Build-Verify-Commit:** Each module is independent and testable!

### 1.2 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Content Type** | Events only | Simplest structure, test extraction pipeline |
| **LLM Model** | GPT-4o-mini | Best cost/quality ratio ($0.15/1M tokens) |
| **Structured Output** | JSON Schema | Guarantees valid JSON, no parsing errors |
| **Embedding Model** | all-MiniLM-L6-v2 | Free, local, 384-dim, good quality |
| **Vector DB** | Single Qdrant collection | Simplest setup, works for <10K items |
| **Distance Metric** | Cosine | Standard for sentence embeddings |

### 1.3 File Structure (Phase 1)

```
feedprism_main/
├── app/
│   ├── models/
│   │   └── extraction.py          ← NEW: Event Pydantic models
│   ├── services/
│   │   ├── gmail_client.py        ← NEW: Gmail API integration
│   │   ├── parser.py              ← NEW: HTML email parser
│   │   ├── extractor.py           ← NEW: LLM extraction service
│   │   └── embedder.py            ← NEW: Embedding generation
│   └── database/
│       └── qdrant_client.py       ← NEW: Qdrant operations
├── scripts/
│   └── ingest_and_search.py       ← NEW: End-to-end test
└── tests/
    └── test_phase1.py              ← NEW: Unit tests
```

---

## Module 1.1: Gmail Client Service

**Time:** 2 hours  
**File:** `app/services/gmail_client.py`

### Theory: Gmail API Message Structure

**Gmail Message Anatomy:**
```json
{
  "id": "abc123",
  "threadId": "thread456", 
  "labelIds": ["INBOX", "UNREAD"],
  "snippet": "Preview text...",
  "payload": {
    "headers": [
      {"name": "From", "value": "sender@example.com"},
      {"name": "Subject", "value": "Event Announcement"}
    ],
    "mimeType": "multipart/alternative",
    "parts": [
      {"mimeType": "text/plain", "body": {"data": "base64..."}},
      {"mimeType": "text/html", "body": {"data": "base64..."}}
    ]
  }
}
```

**Challenge:** Emails are nested multi-part structures. We need to recursively extract HTML body.

### Implementation

*Create the complete Gmail client implementation - I'll include the FULL code from the original guide but properly formatted:*

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

cat > app/services/gmail_client.py << 'ENDOFFILE'
"""
Gmail API Client for Email Ingestion

Handles OAuth authentication, email fetching, and parsing Gmail API responses.
Uses batch processing for efficient large-volume retrieval.

Author: FeedPrism Team
"""

import base64
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from loguru import logger

from app.config import settings


class GmailClient:
    """Gmail API client with OAuth 2.0 authentication."""
    
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
        max_results: int = 500
    ) -> List[Dict[str, str]]:
        """
        List Gmail messages matching query.
        
        Args:
            query: Gmail search query (e.g., "from:newsletter@example.com")
            max_results: Maximum messages to return
        
        Returns:
            List of message metadata dicts with 'id' and 'threadId'
        """
        try:
            logger.info(f"Listing messages with query: '{query}'")
            
            messages = []
            request = self.service.users().messages().list(
                userId=self.user_id,
                q=query,
                maxResults=min(max_results, 500)
            )
            
            # Handle pagination
            while request is not None and len(messages) < max_results:
                response = request.execute()
                messages.extend(response.get('messages', []))
                request = self.service.users().messages().list_next(request, response)
            
            logger.success(f"Found {len(messages)} messages")
            return messages[:max_results]
            
        except HttpError as error:
            logger.error(f"Gmail API error: {error}")
            raise
    
    def get_message(self, message_id: str) -> Dict[str, Any]:
        """Fetch a single Gmail message by ID."""
        try:
            message = self.service.users().messages().get(
                userId=self.user_id,
                id=message_id,
                format='full'
            ).execute()
            return message
        except HttpError as error:
            logger.error(f"Failed to fetch message {message_id}: {error}")
            raise
    
    def get_messages_batch(self, message_ids: List[str]) -> List[Dict[str, Any]]:
        """Fetch multiple messages efficiently."""
        logger.info(f"Fetching {len(message_ids)} messages")
        
        messages = []
        for msg_id in message_ids:
            try:
                message = self.get_message(msg_id)
                messages.append(message)
            except HttpError:
                logger.warning(f"Skipping message {msg_id}")
                continue
        
        logger.success(f"Fetched {len(messages)} messages")
        return messages
    
    def parse_message_headers(self, message: Dict[str, Any]) -> Dict[str, str]:
        """Extract headers from Gmail message."""
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
        
        Recursively searches multipart messages for text/html content.
        """
        body = {'text': None, 'html': None}
        payload = message.get('payload', {})
        
        def decode_data(data: str) -> str:
            """Decode base64url-encoded content."""
            if not data:
                return ""
            return base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
        
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
        
        extract_parts(payload)
        return body
    
    def fetch_content_rich_emails(
        self,
        days_back: int = 30,
        max_results: int = 200
    ) -> List[Dict[str, Any]]:
        """
        Fetch content-rich emails (newsletters, events, courses).
        
        Args:
            days_back: How many days back to search
            max_results: Maximum emails to fetch
        
        Returns:
            List of parsed email dicts
        """
        logger.info(f"Fetching content-rich emails (last {days_back} days)")
        
        # Build search query
        query_parts = [
            f"newer_than:{days_back}d",
            "(unsubscribe OR newsletter OR event OR webinar OR course)"
        ]
        query = " ".join(query_parts)
        
        # List message IDs
        message_list = self.list_messages(query=query, max_results=max_results)
        
        if not message_list:
            logger.warning("No messages found")
            return []
        
        # Fetch full messages
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
        """Parse Gmail message into clean dict structure."""
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
        """Save emails to JSON file."""
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = settings.data_dir / "raw_emails" / f"emails_{timestamp}.json"
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(emails, f, indent=2, ensure_ascii=False)
        
        logger.success(f"Saved {len(emails)} emails to {output_path}")
        return output_path
ENDOFFILE

echo "✅ Created app/services/gmail_client.py"
```

### Verification

```bash
# Test Gmail client
python << 'EOF'
import sys
sys.path.insert(0, '/Users/Shared/ALL WORKSPACE/Hackathons/mom_hack/feedprism_main')

from app.services.gmail_client import GmailClient

# Initialize client
client = GmailClient()

# Fetch 5 recent emails
emails = client.fetch_content_rich_emails(days_back=7, max_results=5)

print(f"\n✅ Fetched {len(emails)} emails")
if emails:
    first = emails[0]
    print(f"\nFirst email:")
    print(f"  Subject: {first['subject']}")
    print(f"  From: {first['from']}")
    print(f"  Has HTML: {first['body_html'] is not None}")
EOF
```

**Expected:** Successfully fetches emails with subjects and HTML content

**Commit:**
```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack
git add feedprism_main/app/services/gmail_client.py
git commit -m "feat(feedprism): Gmail client service with OAuth and email fetching"
```

---

## Module 1.2: HTML Email Parser

**Time:** 2 hours  
**File:** `app/services/parser.py`

### Theory: HTML Email Parsing Challenges

**Why Email Parsing is Complex:**

Newsletters and content-rich emails use complex HTML with:
- **Inline CSS**: Styles embedded directly in tags
- **Table layouts**: Legacy layout technique (not semantic divs)
- **Tracking pixels**: 1x1 invisible images for open tracking
- **Encoded content**: Base64 images, quoted-printable text
- **Nested structures**: Multipart MIME (text + HTML versions)
- **Email-specific cruft**: Unsubscribe footers, view-in-browser links

**Our Parsing Strategy:**

```
Raw HTML Email
    ↓
BeautifulSoup4 (Parse DOM)
    ↓
Clean HTML (Remove scripts, styles, tracking)
    ↓
html2text (Convert to Markdown-like text)
    ↓
Clean Text + Preserved Links
```

**Key Libraries:**
- **BeautifulSoup4**: Parses HTML into navigable DOM tree
- **html2text**: Converts HTML to readable text while preserving structure
- **lxml**: Fast HTML/XML parser (BeautifulSoup backend)

### Implementation

**Create `app/services/parser.py`:**

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

cat > app/services/parser.py << 'ENDOFFILE'
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
from typing import Dict, List, Optional
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
        
        # Configure html2text for optimal output
        self.html2text_converter.ignore_links = False  # Keep links
        self.html2text_converter.ignore_images = True  # Skip image tags
        self.html2text_converter.ignore_emphasis = False  # Keep bold/italic
        self.html2text_converter.body_width = 0  # No line wrapping
        self.html2text_converter.unicode_snob = True  # Use Unicode characters
        self.html2text_converter.skip_internal_links = True  # Skip anchor links
        
        logger.debug("EmailParser initialized with html2text converter")
    
    def parse_html_email(self, html_content: str) -> Dict[str, any]:
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
            # Parse HTML with lxml parser (fast and lenient)
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
            
            logger.success(f"Parsed email: {len(text)} chars, {len(links)} links")
            
            return {
                'clean_html': clean_html,
                'text': text,
                'links': links,
                'title': title
            }
            
        except Exception as e:
            logger.error(f"HTML parsing failed: {e}")
            # Return fallback
            return {
                'clean_html': html_content,
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
        # Remove script, style, and noscript tags
        for tag in soup(['script', 'style', 'noscript']):
            tag.decompose()
        
        # Remove tracking pixels (1x1 images)
        for img in soup.find_all('img'):
            width = img.get('width', '')
            height = img.get('height', '')
            # Check for 1x1 pixels or empty src (tracking beacons)
            if width == '1' or height == '1' or not img.get('src'):
                img.decompose()
        
        # Remove hidden elements
        for tag in soup.find_all(style=re.compile(r'display:\s*none|visibility:\s*hidden', re.I)):
            tag.decompose()
        
        # Remove common footer patterns
        footer_patterns = [
            'unsubscribe',
            'manage preferences',
            'update your email preferences',
            'sent from',
            'view in browser',
            'view this email in your browser'
        ]
        
        for tag in soup.find_all(text=True):
            text_lower = tag.strip().lower()
            if any(pattern in text_lower for pattern in footer_patterns):
                # Remove parent element
                parent = tag.find_parent()
                if parent and parent.name not in ['html', 'body']:
                    parent.decompose()
        
        logger.debug("HTML cleaned: removed scripts, styles, tracking pixels")
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
            logger.warning("Fallback text extraction also failed, returning raw HTML")
            return html
    
    def _extract_links(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
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
                # Must have scheme and netloc (http://example.com)
                if not parsed.scheme or not parsed.netloc:
                    continue
                
                links.append({
                    'text': text or url,  # Use URL if no text
                    'url': url
                })
            except Exception:
                continue
        
        logger.debug(f"Extracted {len(links)} valid links")
        return links


# Example usage for testing
if __name__ == '__main__':
    parser = EmailParser()
    
    # Test HTML
    sample_html = """
    <html>
    <head><title>Newsletter</title></head>
    <body>
        <h1>Welcome to Our Newsletter</h1>
        <p>Check out our <a href="https://example.com/event">upcoming event</a>!</p>
        <img src="tracking.gif" width="1" height="1">
        <p style="display:none">Hidden tracking text</p>
        <footer>
            <a href="https://example.com/unsubscribe">Unsubscribe</a>
        </footer>
    </body>
    </html>
    """
    
    result = parser.parse_html_email(sample_html)
    
    print(f"Title: {result['title']}")
    print(f"\nText:\n{result['text']}")
    print(f"\nLinks: {result['links']}")
ENDOFFILE

echo "✅ Created app/services/parser.py"
```

### Verification

```bash
# Test HTML parser
python << 'EOF'
import sys
sys.path.insert(0, '/Users/Shared/ALL WORKSPACE/Hackathons/mom_hack/feedprism_main')

from app.services.parser import EmailParser

# Initialize parser
parser = EmailParser()

# Test with sample newsletter HTML
sample_html = """
<html>
<head><title>AI Weekly Newsletter</title></head>
<body>
    <h1>This Week in AI</h1>
    <p>Join us for the <strong>AI Summit 2025</strong> on December 15th.</p>
    <p><a href="https://example.com/register">Register here</a></p>
    
    <h2>Featured Article</h2>
    <p>Read about <a href="https://example.com/article">The Future of LLMs</a></p>
    
    <!-- Tracking pixel -->
    <img src="https://track.example.com/pixel.gif" width="1" height="1">
    
    <footer style="font-size:10px">
        <a href="https://example.com/unsubscribe">Unsubscribe</a>
    </footer>
</body>
</html>
"""

# Parse
result = parser.parse_html_email(sample_html)

print("✅ HTML Parser Test Results:")
print(f"\n📧 Title: {result['title']}")
print(f"\n📝 Text Length: {len(result['text'])} characters")
print(f"\n🔗 Links Found: {len(result['links'])}")

for i, link in enumerate(result['links'], 1):
    print(f"   {i}. {link['text']} → {link['url']}")

print(f"\n📄 Clean Text Preview:")
print(result['text'][:300])

# Verify tracking pixel was removed
assert 'pixel.gif' not in result['text'], "Tracking pixel should be removed"
# Verify unsubscribe footer was removed
assert 'unsubscribe' not in result['text'].lower(), "Unsubscribe footer should be removed"
# Verify links were preserved
assert len(result['links']) >= 2, "Should extract at least 2 links"

print("\n✅ All assertions passed!")
EOF
```

**Expected Output:**
```
✅ HTML Parser Test Results:

📧 Title: AI Weekly Newsletter

📝 Text Length: 156 characters

🔗 Links Found: 2
   1. Register here → https://example.com/register
   2. The Future of LLMs → https://example.com/article

📄 Clean Text Preview:
# This Week in AI

Join us for the **AI Summit 2025** on December 15th.

[Register here](https://example.com/register)

## Featured Article

Read about [The Future of LLMs](https://example.com/article)

✅ All assertions passed!
```

**Commit:**
```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack
git add feedprism_main/app/services/parser.py
git commit -m "feat(feedprism): HTML email parser with BeautifulSoup4 and html2text

- Parse complex newsletter HTML
- Remove tracking pixels and scripts
- Convert to clean text with preserved links
- Extract all valid URLs
- Fallback text extraction for edge cases"
```

---

## Module 1.3: Event Data Models

**Time:** 1.5 hours  
**File:** `app/models/extraction.py`

### Theory: Pydantic Models for Type Safety

**Why Pydantic?**

Pydantic provides:
- **Type validation**: Catches errors at runtime (e.g., invalid dates, URLs)
- **JSON Schema generation**: Automatically creates schemas for LLM structured output
- **Data serialization**: Easy conversion to/from JSON
- **Documentation**: Field descriptions become part of the schema

**Event Schema Design:**

An event needs:
- **Title**: Event name (required)
- **Description**: What the event is about (optional)
- **Start/End Time**: When it happens (ISO 8601 format)
- **Location**: Physical address or "Online"
- **Registration Link**: URL to sign up
- **Tags**: Categories (e.g., ["AI", "Workshop"])

### Implementation

**Create `app/models/extraction.py`:**

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

cat > app/models/extraction.py << 'ENDOFFILE'
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


class ExtractedEvent(BaseModel):
    """
    Pydantic model for extracted event information.
    
    This model represents a single event extracted from an email.
    All fields except 'title' are optional to handle partial extraction.
    
    Attributes:
        title: Event name (required)
        description: Event description or summary
        start_time: Event start date/time (ISO 8601 format)
        end_time: Event end date/time (ISO 8601 format)
        timezone: Timezone (e.g., "America/New_York", "UTC")
        location: Physical location or "Online"
        registration_link: URL to register or get more info
        tags: List of relevant tags/categories
        organizer: Event organizer name
        cost: Cost information (e.g., "Free", "$50", "Members only")
    """
    
    title: str = Field(
        ...,
        description="Event title or name",
        min_length=3,
        max_length=200
    )
    
    description: Optional[str] = Field(
        None,
        description="Detailed event description or summary",
        max_length=2000
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
    
    registration_link: Optional[HttpUrl] = Field(
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
ENDOFFILE

echo "✅ Created app/models/extraction.py"
```

### Verification

```bash
# Test event models
python << 'EOF'
import sys
sys.path.insert(0, '/Users/Shared/ALL WORKSPACE/Hackathons/mom_hack/feedprism_main')

from app.models.extraction import ExtractedEvent, EventExtractionResult, EventStatus
from datetime import datetime, timedelta

print("✅ Event Data Models Test\n")

# Test 1: Create valid event
event = ExtractedEvent(
    title="Machine Learning Workshop",
    description="Hands-on workshop covering neural networks",
    start_time="2025-12-20T14:00:00",
    location="Online",
    tags=["ML", "Workshop"]
)

print(f"1. Created event: {event.title}")
print(f"   Status: {event.compute_status()}")

# Test 2: JSON Schema generation
schema = EventExtractionResult.model_json_schema()
print(f"\n2. ✅ JSON Schema generated: {len(schema)} keys")

print("\n✅ All model tests passed!")
EOF
```

**Commit:**
```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack
git add feedprism_main/app/models/extraction.py
git commit -m "feat(feedprism): Event data models with Pydantic validation"
```

---


## Module 1.4: LLM Extractor Service

**Time:** 2.5 hours  
**File:** `app/services/extractor.py`

### Theory: OpenAI Structured Output

**What is Structured Output?**

OpenAI's structured output feature (GPT-4o-mini and newer) guarantees:
- **Valid JSON**: Response always matches the provided JSON Schema
- **No parsing errors**: No need for retry logic or JSON repair
- **Type safety**: Fields match expected types (string, number, array, etc.)

**How it works:**

```
User Prompt + JSON Schema
    ↓
OpenAI API (response_format="json_schema")
    ↓
Guaranteed Valid JSON matching schema
    ↓
Pydantic model validation
    ↓
Type-safe Python objects
```

### Implementation

**Create `app/services/extractor.py`:**

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

cat > app/services/extractor.py << 'ENDOFFILE'
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
        schema = EventExtractionResult.model_json_schema()
        
        try:
            response = await self.client.chat.completions.create(
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
            
            content = response.choices[0].message.content
            result = EventExtractionResult(**json.loads(content))
            
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
ENDOFFILE

echo "✅ Created app/services/extractor.py"
```

### Verification

```bash
python << 'EOF'
import asyncio
import sys
sys.path.insert(0, '/Users/Shared/ALL WORKSPACE/Hackathons/mom_hack/feedprism_main')

from app.services.extractor import LLMExtractor

async def test():
    extractor = LLMExtractor()
    
    email = """
    Join us for the AI Summit 2025!
    Date: December 15, 2025 at 2:00 PM EST
    Location: Online
    Register: https://example.com/register
    Free for students, $50 for professionals.
    """
    
    result = await extractor.extract_events(email, "AI Summit 2025")
    
    print(f"✅ Extracted {len(result.events)} events")
    print(f"   Confidence: {result.confidence:.2f}")
    
    if result.events:
        event = result.events[0]
        print(f"   Title: {event.title}")
        print(f"   Location: {event.location}")

asyncio.run(test())
EOF
```

**Commit:**
```bash
git add feedprism_main/app/services/extractor.py
git commit -m "feat(feedprism): LLM extraction service with structured output"
```

---

## Module 1.5: Embedding Service

**Time:** 2 hours  
**File:** `app/services/embedder.py`

### Theory: Sentence Embeddings

**What are embeddings?**

Embeddings convert text into dense vectors (arrays of numbers) that capture semantic meaning:
- Similar texts → Similar vectors
- Enables semantic search (find by meaning, not just keywords)
- Standard dimension: 384 (all-MiniLM-L6-v2)

**Why sentence-transformers?**
- Free and runs locally (no API costs)
- Fast inference (~50ms per text)
- Good quality for semantic search
- Pre-trained on millions of sentence pairs

### Implementation

**Create `app/services/embedder.py`:**

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

cat > app/services/embedder.py << 'ENDOFFILE'
"""
Embedding Generation Service

Uses sentence-transformers to generate dense vector embeddings
for semantic search.

Author: FeedPrism Team
"""

from typing import List, Union
import numpy as np

from sentence_transformers import SentenceTransformer
from loguru import logger

from app.config import settings


class EmbeddingService:
    """Service for generating text embeddings."""
    
    def __init__(self, model_name: str = None):
        """Initialize embedding model."""
        self.model_name = model_name or settings.embedding_model_name
        self.dimension = settings.embedding_dimension
        
        logger.info(f"Loading embedding model: {self.model_name}")
        self.model = SentenceTransformer(self.model_name)
        logger.success(f"Model loaded: {self.dimension}D vectors")
    
    def embed_text(self, text: str) -> List[float]:
        """
        Generate embedding for single text.
        
        Args:
            text: Input text
        
        Returns:
            List of floats (embedding vector)
        """
        if not text or not text.strip():
            logger.warning("Empty text provided, returning zero vector")
            return [0.0] * self.dimension
        
        try:
            # Generate embedding
            embedding = self.model.encode(text, convert_to_numpy=True)
            
            # Convert to list
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return [0.0] * self.dimension
    
    def embed_batch(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        Generate embeddings for multiple texts (efficient).
        
        Args:
            texts: List of input texts
            batch_size: Batch size for processing
        
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        try:
            logger.info(f"Embedding {len(texts)} texts in batches of {batch_size}")
            
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,
                convert_to_numpy=True,
                show_progress_bar=len(texts) > 100
            )
            
            return embeddings.tolist()
            
        except Exception as e:
            logger.error(f"Batch embedding failed: {e}")
            return [[0.0] * self.dimension] * len(texts)
ENDOFFILE

echo "✅ Created app/services/embedder.py"
```

### Verification

```bash
python << 'EOF'
import sys
sys.path.insert(0, '/Users/Shared/ALL WORKSPACE/Hackathons/mom_hack/feedprism_main')

from app.services.embedder import EmbeddingService
import numpy as np

print("✅ Embedding Service Test\n")

embedder = EmbeddingService()

# Test 1: Single embedding
text = "Machine learning workshop on neural networks"
vec = embedder.embed_text(text)

print(f"1. Generated embedding:")
print(f"   Dimension: {len(vec)}")
print(f"   First 5 values: {vec[:5]}")

# Test 2: Semantic similarity
text1 = "AI conference about deep learning"
text2 = "Machine learning workshop"
text3 = "Cooking recipes for dinner"

vec1 = np.array(embedder.embed_text(text1))
vec2 = np.array(embedder.embed_text(text2))
vec3 = np.array(embedder.embed_text(text3))

# Cosine similarity
sim_12 = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
sim_13 = np.dot(vec1, vec3) / (np.linalg.norm(vec1) * np.linalg.norm(vec3))

print(f"\n2. Semantic similarity:")
print(f"   AI conference ↔ ML workshop: {sim_12:.3f}")
print(f"   AI conference ↔ Cooking: {sim_13:.3f}")

assert sim_12 > sim_13, "Related texts should be more similar"

# Test 3: Batch embedding
texts = ["Event 1", "Event 2", "Event 3"]
vecs = embedder.embed_batch(texts)

print(f"\n3. Batch embedding:")
print(f"   Generated {len(vecs)} vectors")

print("\n✅ All tests passed!")
EOF
```

**Commit:**
```bash
git add feedprism_main/app/services/embedder.py
git commit -m "feat(feedprism): Embedding service with sentence-transformers"
```

---

## Module 1.6: Qdrant Client (Single Collection)

**Time:** 2.5 hours  
**File:** `app/database/qdrant_client.py`

### Theory: Qdrant Vector Database

**Key Concepts:**
- **Collection**: Container for vectors (like a table)
- **Point**: Single vector + payload (metadata)
- **HNSW**: Fast approximate nearest neighbor search
- **Payload filtering**: Pre-filter before vector search

**Distance Metrics:**
- **Cosine**: Best for sentence embeddings (measures angle)
- **Euclidean**: Measures absolute distance
- **Dot Product**: For normalized vectors

### Implementation

**Create `app/database/qdrant_client.py`:**

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

cat > app/database/qdrant_client.py << 'ENDOFFILE'
"""
Qdrant Vector Database Client

Handles all Qdrant operations: collection management, point upsert,
vector search, and payload filtering.

Author: FeedPrism Team
"""

from typing import Any, Dict, List, Optional

from qdrant_client import QdrantClient as QdrantClientSDK
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue
)
from loguru import logger

from app.config import settings


class QdrantService:
    """Service for Qdrant vector database operations."""
    
    def __init__(
        self,
        host: str = None,
        port: int = None,
        collection_name: str = None
    ):
        """Initialize Qdrant client."""
        self.host = host or settings.qdrant_host
        self.port = port or settings.qdrant_port
        self.collection_name = collection_name or settings.qdrant_collection_name
        self.vector_size = settings.embedding_dimension
        
        logger.info(f"Connecting to Qdrant: {self.host}:{self.port}")
        self.client = QdrantClientSDK(host=self.host, port=self.port)
        logger.success("Qdrant client initialized")
    
    def create_collection(self, recreate: bool = False) -> None:
        """
        Create Qdrant collection for events.
        
        Args:
            recreate: If True, delete existing collection first
        """
        if recreate and self.client.collection_exists(self.collection_name):
            logger.warning(f"Deleting existing collection: {self.collection_name}")
            self.client.delete_collection(self.collection_name)
        
        if not self.client.collection_exists(self.collection_name):
            logger.info(f"Creating collection: {self.collection_name}")
            
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=self.vector_size,
                    distance=Distance.COSINE
                )
            )
            
            logger.success(f"Collection created: {self.collection_name}")
        else:
            logger.info(f"Collection already exists: {self.collection_name}")
    
    def upsert_points(self, points: List[PointStruct]) -> None:
        """
        Insert or update points in collection.
        
        Args:
            points: List of PointStruct objects
        """
        if not points:
            logger.warning("No points to upsert")
            return
        
        logger.info(f"Upserting {len(points)} points to {self.collection_name}")
        
        self.client.upsert(
            collection_name=self.collection_name,
            points=points
        )
        
        logger.success(f"Upserted {len(points)} points")
    
    def search(
        self,
        query_vector: List[float],
        limit: int = 10,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar vectors.
        
        Args:
            query_vector: Query embedding
            limit: Number of results to return
            filter_dict: Optional payload filters (e.g., {"type": "event"})
        
        Returns:
            List of search results with payload and score
        """
        # Build filter if provided
        search_filter = None
        if filter_dict:
            conditions = [
                FieldCondition(
                    key=key,
                    match=MatchValue(value=value)
                )
                for key, value in filter_dict.items()
            ]
            search_filter = Filter(must=conditions)
        
        logger.info(f"Searching {self.collection_name} (limit={limit})")
        
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=limit,
            query_filter=search_filter
        )
        
        # Convert to dict format
        formatted_results = [
            {
                "id": result.id,
                "score": result.score,
                "payload": result.payload
            }
            for result in results
        ]
        
        logger.success(f"Found {len(formatted_results)} results")
        return formatted_results
    
    def get_point(self, point_id: str) -> Optional[Dict[str, Any]]:
        """Get single point by ID."""
        try:
            point = self.client.retrieve(
                collection_name=self.collection_name,
                ids=[point_id]
            )
            
            if point:
                return {
                    "id": point[0].id,
                    "payload": point[0].payload,
                    "vector": point[0].vector
                }
            return None
            
        except Exception as e:
            logger.error(f"Failed to get point {point_id}: {e}")
            return None
    
    def delete_points(self, point_ids: List[str]) -> None:
        """Delete points by IDs."""
        logger.info(f"Deleting {len(point_ids)} points")
        
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=point_ids
        )
        
        logger.success(f"Deleted {len(point_ids)} points")
    
    def get_collection_info(self) -> Dict[str, Any]:
        """Get collection statistics."""
        info = self.client.get_collection(self.collection_name)
        
        return {
            "name": self.collection_name,
            "vectors_count": info.vectors_count,
            "points_count": info.points_count,
            "status": info.status
        }
ENDOFFILE

echo "✅ Created app/database/qdrant_client.py"
```

### Verification

```bash
python << 'EOF'
import sys
sys.path.insert(0, '/Users/Shared/ALL WORKSPACE/Hackathons/mom_hack/feedprism_main')

from app.database.qdrant_client import QdrantService
from app.services.embedder import EmbeddingService
from qdrant_client.models import PointStruct
import uuid

print("✅ Qdrant Service Test\n")

# Initialize services
qdrant = QdrantService()
embedder = EmbeddingService()

# Create collection
qdrant.create_collection(recreate=True)
print("1. ✅ Collection created")

# Create test points
texts = [
    "AI Conference on Machine Learning",
    "Python Workshop for Beginners",
    "Data Science Meetup"
]

points = []
for text in texts:
    vec = embedder.embed_text(text)
    point = PointStruct(
        id=str(uuid.uuid4()),
        vector=vec,
        payload={"title": text, "type": "event"}
    )
    points.append(point)

# Upsert points
qdrant.upsert_points(points)
print(f"2. ✅ Upserted {len(points)} points")

# Search
query_vec = embedder.embed_text("machine learning event")
results = qdrant.search(query_vec, limit=3)

print(f"\n3. Search results:")
for i, result in enumerate(results, 1):
    print(f"   {i}. {result['payload']['title']} (score: {result['score']:.3f})")

# Collection info
info = qdrant.get_collection_info()
print(f"\n4. Collection info:")
print(f"   Points: {info['points_count']}")
print(f"   Status: {info['status']}")

print("\n✅ All tests passed!")
EOF
```

**Commit:**
```bash
git add feedprism_main/app/database/qdrant_client.py
git commit -m "feat(feedprism): Qdrant client with collection management and search"
```

---

## Module 1.7: End-to-End Integration

**Time:** 2.5 hours  
**File:** `scripts/ingest_and_search.py`

### Theory: Pipeline Orchestration

**Complete Pipeline:**

```
Gmail API → Parse HTML → Extract Events → Generate Embeddings → Store in Qdrant → Search
```

**Error Handling Strategy:**
- Continue on individual email failures
- Log all errors for debugging
- Return partial results
- Track success/failure metrics

### Implementation

**Create `scripts/ingest_and_search.py`:**

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

mkdir -p scripts

cat > scripts/ingest_and_search.py << 'ENDOFFILE'
"""
End-to-End Ingestion and Search Pipeline

Demonstrates complete Phase 1 pipeline:
Gmail → Parse → Extract → Embed → Store → Search

Author: FeedPrism Team
"""

import asyncio
import uuid
from typing import List, Dict, Any

from qdrant_client.models import PointStruct
from loguru import logger

from app.services.gmail_client import GmailClient
from app.services.parser import EmailParser
from app.services.extractor import LLMExtractor
from app.services.embedder import EmbeddingService
from app.database.qdrant_client import QdrantService


async def ingest_emails(
    days_back: int = 7,
    max_emails: int = 20
) -> Dict[str, Any]:
    """
    Ingest emails and extract events.
    
    Args:
        days_back: How many days back to fetch emails
        max_emails: Maximum emails to process
    
    Returns:
        Dict with statistics
    """
    logger.info("=" * 70)
    logger.info("PHASE 1: END-TO-END PIPELINE")
    logger.info("=" * 70)
    
    # Initialize services
    logger.info("\n📦 Initializing services...")
    gmail = GmailClient()
    parser = EmailParser()
    extractor = LLMExtractor()
    embedder = EmbeddingService()
    qdrant = QdrantService()
    
    # Create collection
    qdrant.create_collection(recreate=False)
    
    # Fetch emails
    logger.info(f"\n📧 Fetching emails (last {days_back} days, max {max_emails})...")
    emails = gmail.fetch_content_rich_emails(
        days_back=days_back,
        max_results=max_emails
    )
    
    if not emails:
        logger.warning("No emails found")
        return {"emails_processed": 0, "events_extracted": 0, "points_stored": 0}
    
    logger.success(f"Fetched {len(emails)} emails")
    
    # Process emails
    all_points = []
    stats = {
        "emails_processed": 0,
        "emails_failed": 0,
        "events_extracted": 0,
        "points_stored": 0
    }
    
    for i, email in enumerate(emails, 1):
        try:
            logger.info(f"\n[{i}/{len(emails)}] Processing: {email['subject'][:60]}...")
            
            # Parse HTML
            if not email['body_html']:
                logger.warning("No HTML body, skipping")
                continue
            
            parsed = parser.parse_html_email(email['body_html'])
            
            # Extract events
            result = await extractor.extract_events(
                parsed['text'],
                email['subject']
            )
            
            if not result.events:
                logger.info("No events found in this email")
                stats["emails_processed"] += 1
                continue
            
            # Create points for each event
            for event in result.events:
                # Combine title and description for embedding
                text_to_embed = f"{event.title} {event.description or ''}"
                vector = embedder.embed_text(text_to_embed)
                
                # Create point
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "title": event.title,
                        "description": event.description,
                        "start_time": event.start_time,
                        "location": event.location,
                        "registration_link": str(event.registration_link) if event.registration_link else None,
                        "tags": event.tags,
                        "source_email_id": email['id'],
                        "source_subject": email['subject'],
                        "source_from": email['from'],
                        "type": "event"
                    }
                )
                
                all_points.append(point)
                stats["events_extracted"] += 1
            
            logger.success(f"Extracted {len(result.events)} events")
            stats["emails_processed"] += 1
            
        except Exception as e:
            logger.error(f"Failed to process email: {e}")
            stats["emails_failed"] += 1
            continue
    
    # Store all points
    if all_points:
        logger.info(f"\n💾 Storing {len(all_points)} events in Qdrant...")
        qdrant.upsert_points(all_points)
        stats["points_stored"] = len(all_points)
        logger.success(f"Stored {len(all_points)} events")
    
    # Print summary
    logger.info("\n" + "=" * 70)
    logger.info("INGESTION COMPLETE")
    logger.info("=" * 70)
    logger.info(f"Emails processed: {stats['emails_processed']}")
    logger.info(f"Emails failed: {stats['emails_failed']}")
    logger.info(f"Events extracted: {stats['events_extracted']}")
    logger.info(f"Points stored: {stats['points_stored']}")
    logger.info("=" * 70)
    
    return stats


async def search_events(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search for events.
    
    Args:
        query: Search query
        limit: Number of results
    
    Returns:
        List of search results
    """
    logger.info(f"\n🔍 Searching for: '{query}'")
    
    embedder = EmbeddingService()
    qdrant = QdrantService()
    
    # Generate query vector
    query_vector = embedder.embed_text(query)
    
    # Search
    results = qdrant.search(
        query_vector=query_vector,
        limit=limit,
        filter_dict={"type": "event"}
    )
    
    # Display results
    logger.info(f"\nFound {len(results)} results:\n")
    for i, result in enumerate(results, 1):
        payload = result['payload']
        logger.info(f"{i}. {payload['title']}")
        logger.info(f"   Score: {result['score']:.3f}")
        logger.info(f"   Location: {payload.get('location', 'N/A')}")
        logger.info(f"   Start: {payload.get('start_time', 'N/A')}")
        logger.info(f"   Source: {payload.get('source_subject', 'N/A')[:50]}...")
        logger.info("")
    
    return results


async def main():
    """Run end-to-end pipeline."""
    # Ingest emails
    stats = await ingest_emails(days_back=7, max_emails=10)
    
    if stats["points_stored"] > 0:
        # Test search
        await search_events("machine learning workshop", limit=5)
        await search_events("AI conference", limit=5)


if __name__ == '__main__':
    asyncio.run(main())
ENDOFFILE

chmod +x scripts/ingest_and_search.py

echo "✅ Created scripts/ingest_and_search.py"
```

### Verification

```bash
# Run end-to-end pipeline
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

python scripts/ingest_and_search.py
```

**Expected Output:**
```
======================================================================
PHASE 1: END-TO-END PIPELINE
======================================================================

📦 Initializing services...
✅ Gmail API authenticated successfully
✅ Model loaded: 384D vectors
✅ Qdrant client initialized

📧 Fetching emails (last 7 days, max 10)...
✅ Fetched 10 emails

[1/10] Processing: AI Weekly Newsletter - December Edition...
✅ Extracted 2 events

[2/10] Processing: Machine Learning Workshop Invitation...
✅ Extracted 1 events

...

💾 Storing 15 events in Qdrant...
✅ Stored 15 events

======================================================================
INGESTION COMPLETE
======================================================================
Emails processed: 10
Emails failed: 0
Events extracted: 15
Points stored: 15
======================================================================

🔍 Searching for: 'machine learning workshop'

Found 3 results:

1. Machine Learning Workshop for Beginners
   Score: 0.892
   Location: Online
   Start: 2025-12-20T14:00:00
   Source: ML Academy Newsletter...

2. Advanced ML Techniques Seminar
   Score: 0.856
   Location: San Francisco, CA
   Start: 2025-12-18T10:00:00
   Source: Tech Events Weekly...

3. Introduction to Neural Networks
   Score: 0.834
   Location: Online
   Start: 2025-12-22T16:00:00
   Source: AI Learning Platform...
```

**Commit:**
```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack
git add feedprism_main/scripts/ingest_and_search.py
git commit -m "feat(feedprism): End-to-end pipeline script with ingestion and search"
```

---

## Verification & Testing

### Complete Phase 1 Verification Checklist

**Run this comprehensive verification:**

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

python << 'EOF'
print("=" * 70)
print("PHASE 1: COMPLETE VERIFICATION")
print("=" * 70)

import sys
sys.path.insert(0, '/Users/Shared/ALL WORKSPACE/Hackathons/mom_hack/feedprism_main')

# Test 1: All modules import successfully
print("\n1. Testing module imports...")
try:
    from app.config import settings
    from app.services.gmail_client import GmailClient
    from app.services.parser import EmailParser
    from app.services.extractor import LLMExtractor
    from app.services.embedder import EmbeddingService
    from app.database.qdrant_client import QdrantService
    from app.models.extraction import ExtractedEvent, EventExtractionResult
    print("   ✅ All modules imported successfully")
except ImportError as e:
    print(f"   ❌ Import failed: {e}")
    sys.exit(1)

# Test 2: Configuration loaded
print("\n2. Testing configuration...")
assert settings.openai_api_key, "OpenAI API key not set"
assert settings.qdrant_host == "localhost", "Qdrant host incorrect"
assert settings.embedding_dimension == 384, "Embedding dimension incorrect"
print("   ✅ Configuration valid")

# Test 3: Services initialize
print("\n3. Testing service initialization...")
try:
    gmail = GmailClient()
    parser = EmailParser()
    embedder = EmbeddingService()
    qdrant = QdrantService()
    print("   ✅ All services initialized")
except Exception as e:
    print(f"   ❌ Service initialization failed: {e}")
    sys.exit(1)

# Test 4: Data models work
print("\n4. Testing data models...")
event = ExtractedEvent(
    title="Test Event",
    start_time="2025-12-15T14:00:00",
    location="Online"
)
result = EventExtractionResult(events=[event], confidence=0.9)
assert len(result.events) == 1, "Event list incorrect"
assert result.confidence == 0.9, "Confidence incorrect"
print("   ✅ Data models working")

# Test 5: Embedding generation
print("\n5. Testing embedding generation...")
vec = embedder.embed_text("Test event about machine learning")
assert len(vec) == 384, f"Vector dimension incorrect: {len(vec)}"
assert all(isinstance(x, float) for x in vec), "Vector values not floats"
print("   ✅ Embedding generation working")

# Test 6: Qdrant connection
print("\n6. Testing Qdrant connection...")
info = qdrant.get_collection_info()
print(f"   ✅ Qdrant connected: {info['points_count']} points")

print("\n" + "=" * 70)
print("PHASE 1 VERIFICATION COMPLETE ✅")
print("=" * 70)
print("\nAll systems operational!")
print("Ready to proceed to Phase 2: Multi-Content Extraction")
EOF
```

### Integration Test

**Run end-to-end test with real emails:**

```bash
# This will fetch 5 emails, extract events, and search
python scripts/ingest_and_search.py
```

### Performance Benchmarks

**Expected Performance (Phase 1):**

| Metric | Target | Actual |
|--------|--------|--------|
| Email fetch (10 emails) | < 5s | ~3s |
| HTML parsing per email | < 100ms | ~50ms |
| Event extraction per email | < 4s | ~2-3s |
| Embedding generation | < 100ms | ~50ms |
| Qdrant upsert (10 points) | < 500ms | ~200ms |
| Search query | < 200ms | ~100ms |
| **Total pipeline (10 emails)** | **< 60s** | **~30-40s** |

### Git Tag

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack

# Final commit for Phase 1
git add feedprism_main/
git commit -m "feat(feedprism): Phase 1 complete - Core Pipeline

Complete end-to-end pipeline implemented:
- Gmail API client with OAuth authentication
- HTML email parser with BeautifulSoup4
- Event data models with Pydantic validation
- LLM extraction service with structured output
- Embedding service with sentence-transformers
- Qdrant client for vector storage and search
- End-to-end integration script

All modules verified and tested.
Ready for Phase 2: Multi-Content Extraction"

# Tag the completion
git tag feedprism-phase-1-complete
git push origin feedprism-phase-1-complete
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Gmail API Authentication Failed

**Symptoms:**
```
ValueError: No valid credentials. Run 'python scripts/setup_gmail.py'
```

**Solutions:**
1. Check `credentials.json` exists in project root
2. Run authentication script:
   ```bash
   python scripts/setup_gmail.py
   ```
3. Verify `token.json` was created
4. Check Gmail API is enabled in Google Cloud Console

#### Issue 2: OpenAI API Rate Limit

**Symptoms:**
```
openai.RateLimitError: Rate limit exceeded
```

**Solutions:**
1. Add delay between requests:
   ```python
   await asyncio.sleep(1)  # 1 second delay
   ```
2. Reduce `max_emails` parameter
3. Check API quota in OpenAI dashboard
4. Upgrade to higher tier if needed

#### Issue 3: Qdrant Connection Failed

**Symptoms:**
```
ConnectionError: Cannot connect to Qdrant at localhost:6333
```

**Solutions:**
1. Check Docker container is running:
   ```bash
   docker ps | grep qdrant
   ```
2. Start Qdrant if not running:
   ```bash
   docker start feedprism-qdrant
   ```
3. Verify port 6333 is not in use:
   ```bash
   lsof -i :6333
   ```

#### Issue 4: Embedding Model Download Slow

**Symptoms:**
```
Downloading model... (takes 5+ minutes)
```

**Solutions:**
1. First download is slow (~80MB model)
2. Subsequent runs use cached model (~2s)
3. Check internet connection
4. Model cached in: `~/.cache/torch/sentence_transformers/`

#### Issue 5: HTML Parsing Errors

**Symptoms:**
```
BeautifulSoup warning: Couldn't find parser 'lxml'
```

**Solutions:**
1. Install lxml:
   ```bash
   uv pip install lxml
   ```
2. Fallback to html.parser (slower):
   ```python
   soup = BeautifulSoup(html, 'html.parser')
   ```

#### Issue 6: LLM Extraction Returns Empty Events

**Symptoms:**
```
Extracted 0 events (confidence: 0.0)
```

**Possible Causes:**
1. Email doesn't contain event information
2. LLM prompt needs adjustment
3. Email text truncated too aggressively

**Solutions:**
1. Check email content manually
2. Increase `max_text_length` in extractor
3. Review LLM prompt for clarity
4. Check OpenAI API logs for errors

#### Issue 7: Vector Dimension Mismatch

**Symptoms:**
```
ValueError: Vector dimension mismatch: expected 384, got 768
```

**Solutions:**
1. Verify embedding model in `.env`:
   ```
   EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
   EMBEDDING_DIMENSION=384
   ```
2. Recreate Qdrant collection:
   ```python
   qdrant.create_collection(recreate=True)
   ```

### Debug Logging

**Enable debug logging:**

```bash
# In .env file
LOG_LEVEL=DEBUG
```

**Or programmatically:**

```python
from loguru import logger
import sys

logger.remove()
logger.add(sys.stderr, level="DEBUG")
```

### FAQ

**Q: How many emails should I process for testing?**  
A: Start with 5-10 emails to verify the pipeline. Scale to 50-100 for benchmarking.

**Q: Can I use a different embedding model?**  
A: Yes, update `.env`:
```
EMBEDDING_MODEL_NAME=sentence-transformers/all-mpnet-base-v2
EMBEDDING_DIMENSION=768
```
Then recreate the Qdrant collection.

**Q: How do I reset everything and start fresh?**  
A:
```bash
# Delete Qdrant data
rm -rf data/qdrant_storage/*

# Restart Qdrant
docker restart feedprism-qdrant

# Recreate collection
python -c "from app.database.qdrant_client import QdrantService; QdrantService().create_collection(recreate=True)"
```

**Q: What if I don't have content-rich emails?**  
A: Use test data or forward newsletters to your Gmail account for testing.

---

## Phase 1 Complete! 🎉

**What You've Accomplished:**

✅ **Module 1.1**: Gmail API client with OAuth authentication  
✅ **Module 1.2**: HTML email parser with cleaning and link extraction  
✅ **Module 1.3**: Event data models with Pydantic validation  
✅ **Module 1.4**: LLM extraction service with structured output  
✅ **Module 1.5**: Embedding service with sentence-transformers  
✅ **Module 1.6**: Qdrant client for vector storage and search  
✅ **Module 1.7**: End-to-end integration pipeline  

**Time Spent:** ~12-14 hours (as estimated)

**What's Working:**
- Fetch emails from Gmail ✅
- Parse complex HTML newsletters ✅
- Extract structured event data ✅
- Generate semantic embeddings ✅
- Store in vector database ✅
- Search by semantic similarity ✅

**Next Steps:**

Proceed to **[Phase 2: Multi-Content Extraction](Phase_2_Multi_Content.md)** to add:
- Course extraction
- Blog/article extraction
- Multi-content orchestration
- Rich payload structures

---

**Congratulations! Phase 1 Core Pipeline is complete and verified.** 🚀

