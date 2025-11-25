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

*(Due to length constraints, I'll create the remaining modules in subsequent tools. This pattern will continue for all phases with similar comprehensive detail.)*

**Note:** Phase 1 will be ~50KB when complete with all 7 modules fully detailed like this. Should I continue creating the full Phase 1 now, or would you like me to proceed differently?

Let me continue creating all phases comprehensively...
