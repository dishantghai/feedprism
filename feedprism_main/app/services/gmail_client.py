'''
Gmail API Client for Email Ingestion

Handles OAuth authentication, email fetching, and parsing Gmail API responses.
Uses batch processing for efficient large-volume retrieval.

Author: FeedPrism Team
'''

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
    
    def get_message(self, message_id: str, retries: int = 3) -> Dict[str, Any]:
        """Fetch a single Gmail message by ID with retry logic."""
        import time
        
        for attempt in range(retries):
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
            except Exception as e:
                # SSL errors, connection errors - retry
                if attempt < retries - 1:
                    wait_time = (attempt + 1) * 2  # 2s, 4s, 6s
                    logger.warning(f"Retry {attempt + 1}/{retries} for {message_id}: {e}")
                    time.sleep(wait_time)
                else:
                    raise
    
    def get_messages_batch(self, message_ids: List[str]) -> List[Dict[str, Any]]:
        """Fetch multiple messages with progress logging and error resilience."""
        import time
        
        total = len(message_ids)
        logger.info(f"Fetching {total} messages...")
        
        messages = []
        failed_count = 0
        
        for i, msg_id in enumerate(message_ids):
            try:
                message = self.get_message(msg_id)
                messages.append(message)
                # Log progress every 10 messages
                if (i + 1) % 10 == 0:
                    logger.info(f"Fetched {i + 1}/{total} messages")
                # Small delay to avoid rate limiting
                time.sleep(0.1)
            except HttpError as e:
                logger.warning(f"Skipping message {msg_id}: {e}")
                failed_count += 1
                continue
            except Exception as e:
                logger.warning(f"Skipping {msg_id} after retries: {e}")
                failed_count += 1
                continue
        
        if failed_count > 0:
            logger.warning(f"Failed to fetch {failed_count}/{total} messages")
        logger.success(f"Fetched {len(messages)}/{total} messages")
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
        max_results: int = 50  # Reduced default for faster response
    ) -> List[Dict[str, Any]]:
        """
        Fetch content-rich emails (newsletters, events, courses).
        
        Args:
            days_back: How many days back to search
            max_results: Maximum emails to fetch (keep low for speed)
        
        Returns:
            List of parsed email dicts
        """
        logger.info(f"Fetching content-rich emails (last {days_back} days, max {max_results})")
        
        # Build search query - more specific to reduce results
        query_parts = [
            f"newer_than:{days_back}d",
            "category:promotions OR category:updates OR (subject:(newsletter OR webinar OR event OR course))"
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
