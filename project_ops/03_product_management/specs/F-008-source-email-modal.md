# F-008: Source Email Modal Viewer

**Status:** ✅ Complete (Nov 30, 2025)

## Problem
Users can see extracted content (events, courses, blogs) but have no way to view the **original source email** that the content was extracted from. This breaks the provenance chain and reduces trust in the extraction accuracy. Users cannot verify details, see full context, or access information that wasn't extracted.

## Goal
- Add a **"View Source Email"** action to all content views (cards, detail pages)
- Open the complete source email in a **modal popup** with proper formatting
- Show email metadata (sender, subject, date, recipients)
- Render HTML emails with images and styling preserved
- Support plain text emails as fallback
- Maintain email privacy (no external tracking pixels loaded)
- Enable quick navigation between source email and extracted content

---

## User Flow

### 1. Triggering the Modal

**From Content Card:**
```
┌────────────────────────────────────────────────────┐
│  📅 Advanced NLP Workshop 2024                    │
│  Dec 15, 2024 • 10:00 AM - 4:00 PM                │
│                                                    │
│  📧 AI Weekly Newsletter                           │
│  #NLP #Workshop #HandsOn                           │
│                                                    │
│  [View Details]  [📧 View Source Email]           │
│                   ↑ Click here                     │
└────────────────────────────────────────────────────┘
```

**From Detail View:**
```
┌────────────────────────────────────────────────────┐
│  📅 Advanced NLP Workshop 2024                    │
│  ──────────────────────────────────────────────   │
│                                                    │
│  [Full event details...]                          │
│                                                    │
│  ─────────────────────────────────────────────    │
│  → View Original Email                             │
│     ↑ Click here                                   │
└────────────────────────────────────────────────────┘
```

**From Canonical Items (Multiple Sources):**
```
┌────────────────────────────────────────────────────┐
│  📧 Seen in 3 sources                    [Expand] │
│  ├─ AI Weekly (Nov 28) [View Email]               │
│  ├─ O'Reilly (Nov 27) [View Email]                │
│  └─ TechCrunch (Nov 26) [View Email]              │
└────────────────────────────────────────────────────┘
```

### 2. Email Modal Display

**Modal Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│  ✕                                                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  From: AI Weekly <newsletter@aiweekly.co>              │  │
│  │  To: dishant@example.com                               │  │
│  │  Subject: The Rise of Agents, new models from...      │  │
│  │  Date: Nov 28, 2024 at 9:41 AM                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  [Rendered HTML Email Content]                        │  │
│  │                                                        │  │
│  │  - Preserves original formatting                      │  │
│  │  - Shows images (with privacy controls)               │  │
│  │  - Links are clickable                                │  │
│  │  - Responsive to modal width                          │  │
│  │                                                        │  │
│  │  [Full email body scrolls here...]                    │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [Open in Gmail]  [Copy Email Link]  [Download .eml]  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 3. Modal Interactions

**Actions:**
- **Close:** Click ✕, press Esc, click outside modal
- **Open in Gmail:** Deep link to email in Gmail web/app
- **Copy Email Link:** Copy Gmail link to clipboard
- **Download .eml:** Download email as .eml file for offline viewing
- **Scroll:** Email body scrolls independently
- **Links:** External links open in new tab with `rel="noopener"`

---

## Implementation Details

### Frontend Components

#### 1. EmailModal Component
```tsx
// src/components/EmailModal/EmailModal.tsx
interface EmailModalProps {
  emailId: string;              // Gmail message ID
  isOpen: boolean;
  onClose: () => void;
  itemTitle?: string;           // Optional: show which item triggered modal
}

interface EmailData {
  id: string;
  threadId: string;
  from: string;                 // "AI Weekly <newsletter@aiweekly.co>"
  to: string[];
  cc?: string[];
  subject: string;
  date: string;                 // ISO 8601
  bodyHtml?: string;            // HTML body
  bodyText?: string;            // Plain text fallback
  attachments?: Attachment[];
  gmailLink: string;            // https://mail.google.com/mail/u/0/#inbox/...
}

// Features:
// - Fetch email on mount
// - Loading skeleton while fetching
// - Error state if email not found
// - Sanitize HTML to prevent XSS
// - Block external tracking pixels (optional)
// - Responsive modal (max-width: 900px)
// - Keyboard shortcuts (Esc to close)
```

#### 2. ViewSourceEmailButton Component
```tsx
// src/components/ViewSourceEmailButton.tsx
interface ViewSourceEmailButtonProps {
  emailId: string;
  variant?: 'button' | 'link';  // Button in cards, link in detail view
  label?: string;               // Custom label (default: "View Source Email")
  icon?: boolean;               // Show 📧 icon
}

// Renders:
// - Button variant: [📧 View Source Email]
// - Link variant: → View Original Email
// - Opens EmailModal on click
```

#### 3. SourceEmailsList Component
```tsx
// src/components/SourceEmailsList.tsx
interface SourceEmailsListProps {
  sources: Array<{
    emailId: string;
    sender: string;
    date: string;
  }>;
  expanded: boolean;
  onToggleExpand: () => void;
}

// For canonical items with multiple sources
// Shows list of source emails with "View Email" buttons
```

### Backend API

#### 1. Get Email by ID
```http
GET /api/emails/{email_id}

Response:
{
  "id": "18c5f2a3b4d5e6f7",
  "thread_id": "18c5f2a3b4d5e6f7",
  "from": "AI Weekly <newsletter@aiweekly.co>",
  "to": ["dishant@example.com"],
  "cc": [],
  "subject": "The Rise of Agents, new models from...",
  "date": "2024-11-28T09:41:00Z",
  "body_html": "<html>...",
  "body_text": "Plain text version...",
  "attachments": [
    {
      "filename": "image.png",
      "mime_type": "image/png",
      "size": 12345,
      "url": "/api/emails/18c5f2a3b4d5e6f7/attachments/0"
    }
  ],
  "gmail_link": "https://mail.google.com/mail/u/0/#inbox/18c5f2a3b4d5e6f7",
  "labels": ["INBOX", "UNREAD"]
}
```

#### 2. Get Email Attachment
```http
GET /api/emails/{email_id}/attachments/{attachment_id}

Response: Binary file (image, PDF, etc.)
Headers:
  Content-Type: image/png
  Content-Disposition: inline; filename="image.png"
```

### Backend Service

```python
# app/services/gmail_service.py
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import base64
import html

class GmailService:
    def __init__(self, credentials: Credentials):
        self.service = build('gmail', 'v1', credentials=credentials)
    
    def get_email(self, message_id: str) -> dict:
        """
        Fetch email by Gmail message ID.
        Returns structured email data.
        """
        # Get message
        message = self.service.users().messages().get(
            userId='me',
            id=message_id,
            format='full'
        ).execute()
        
        # Parse headers
        headers = {h['name']: h['value'] for h in message['payload']['headers']}
        
        # Extract body
        body_html, body_text = self._extract_body(message['payload'])
        
        # Get attachments
        attachments = self._extract_attachments(message['payload'], message_id)
        
        return {
            'id': message['id'],
            'thread_id': message['threadId'],
            'from': headers.get('From', ''),
            'to': headers.get('To', '').split(', '),
            'cc': headers.get('Cc', '').split(', ') if headers.get('Cc') else [],
            'subject': headers.get('Subject', '(No Subject)'),
            'date': headers.get('Date', ''),
            'body_html': self._sanitize_html(body_html) if body_html else None,
            'body_text': body_text,
            'attachments': attachments,
            'gmail_link': f"https://mail.google.com/mail/u/0/#inbox/{message['id']}",
            'labels': message.get('labelIds', [])
        }
    
    def _extract_body(self, payload: dict) -> tuple[str, str]:
        """
        Extract HTML and plain text body from email payload.
        Handles multipart messages.
        """
        body_html = None
        body_text = None
        
        if 'parts' in payload:
            for part in payload['parts']:
                mime_type = part['mimeType']
                
                if mime_type == 'text/html' and 'data' in part['body']:
                    body_html = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                elif mime_type == 'text/plain' and 'data' in part['body']:
                    body_text = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                
                # Recursively check nested parts
                if 'parts' in part:
                    nested_html, nested_text = self._extract_body(part)
                    body_html = body_html or nested_html
                    body_text = body_text or nested_text
        
        elif 'body' in payload and 'data' in payload['body']:
            data = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')
            if payload['mimeType'] == 'text/html':
                body_html = data
            else:
                body_text = data
        
        return body_html, body_text
    
    def _sanitize_html(self, html_content: str) -> str:
        """
        Sanitize HTML to prevent XSS attacks.
        - Remove <script> tags
        - Remove event handlers (onclick, onerror, etc.)
        - Optionally block external images (tracking pixels)
        """
        import bleach
        
        allowed_tags = [
            'a', 'abbr', 'acronym', 'b', 'blockquote', 'br', 'code', 'div',
            'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li',
            'ol', 'p', 'pre', 'span', 'strong', 'table', 'tbody', 'td', 'th',
            'thead', 'tr', 'ul', 'font', 'center'
        ]
        
        allowed_attrs = {
            '*': ['class', 'style'],
            'a': ['href', 'title', 'target'],
            'img': ['src', 'alt', 'width', 'height'],
            'table': ['border', 'cellpadding', 'cellspacing', 'width'],
            'td': ['colspan', 'rowspan', 'width'],
            'th': ['colspan', 'rowspan', 'width']
        }
        
        # Sanitize
        clean_html = bleach.clean(
            html_content,
            tags=allowed_tags,
            attributes=allowed_attrs,
            strip=True
        )
        
        # Optional: Block external images (privacy)
        # Replace external image URLs with placeholder
        # clean_html = re.sub(r'<img src="http', '<img data-blocked-src="http', clean_html)
        
        return clean_html
    
    def _extract_attachments(self, payload: dict, message_id: str) -> list:
        """
        Extract attachment metadata from email payload.
        """
        attachments = []
        
        if 'parts' in payload:
            for i, part in enumerate(payload['parts']):
                if part.get('filename'):
                    attachments.append({
                        'filename': part['filename'],
                        'mime_type': part['mimeType'],
                        'size': part['body'].get('size', 0),
                        'attachment_id': part['body'].get('attachmentId'),
                        'url': f"/api/emails/{message_id}/attachments/{i}"
                    })
        
        return attachments
    
    def get_attachment(self, message_id: str, attachment_id: str) -> bytes:
        """
        Download email attachment.
        """
        attachment = self.service.users().messages().attachments().get(
            userId='me',
            messageId=message_id,
            id=attachment_id
        ).execute()
        
        data = base64.urlsafe_b64decode(attachment['data'])
        return data
```

### Database Schema

```sql
-- Items table already has source_email_id
-- No schema changes needed, just use existing column

-- Example query to get item with source email
SELECT 
  i.*,
  i.source_email_id as email_id
FROM items i
WHERE i.id = $1;
```

### State Management

```tsx
// src/contexts/EmailModalContext.tsx
interface EmailModalContextType {
  openEmailModal: (emailId: string, itemTitle?: string) => void;
  closeEmailModal: () => void;
  isOpen: boolean;
  currentEmailId: string | null;
  currentItemTitle: string | null;
}

// Global context to manage modal state
// Allows opening modal from anywhere in the app
```

---

## UX Specifications

### Visual Design

**Modal Container:**
```css
.email-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 200ms ease;
}

.email-modal {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  max-width: 900px;
  width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 200ms ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Email Header:**
```css
.email-header {
  padding: 24px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.email-meta-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 14px;
}

.email-meta-label {
  font-weight: 500;
  color: var(--color-text-secondary);
  min-width: 60px;
}

.email-meta-value {
  color: var(--color-text-primary);
  flex: 1;
}

.email-subject {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-top: 12px;
}
```

**Email Body:**
```css
.email-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  font-size: 14px;
  line-height: 1.6;
}

/* Sanitized HTML rendering */
.email-body-html {
  /* Reset email styles to prevent breaking modal */
  max-width: 100%;
  overflow-x: auto;
}

.email-body-html img {
  max-width: 100%;
  height: auto;
}

.email-body-html table {
  max-width: 100%;
  border-collapse: collapse;
}

/* Plain text fallback */
.email-body-text {
  white-space: pre-wrap;
  font-family: var(--font-mono);
  color: var(--color-text-primary);
}
```

**Email Footer (Actions):**
```css
.email-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.email-action-btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.email-action-btn.primary {
  background: var(--color-primary);
  color: white;
  border: none;
}

.email-action-btn.secondary {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.email-action-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
```

**Close Button:**
```css
.email-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-bg-tertiary);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 150ms ease;
}

.email-modal-close:hover {
  background: var(--color-bg-secondary);
}

.email-modal-close svg {
  width: 16px;
  height: 16px;
  color: var(--color-text-secondary);
}
```

### Loading State

```tsx
// Skeleton while email loads
<div className="email-modal-skeleton">
  <div className="skeleton-header">
    <div className="skeleton-line" style={{ width: '40%' }} />
    <div className="skeleton-line" style={{ width: '60%' }} />
    <div className="skeleton-line" style={{ width: '80%' }} />
  </div>
  <div className="skeleton-body">
    <div className="skeleton-line" style={{ width: '100%' }} />
    <div className="skeleton-line" style={{ width: '95%' }} />
    <div className="skeleton-line" style={{ width: '90%' }} />
    {/* ... more lines */}
  </div>
</div>
```

### Error State

```tsx
// If email not found or error fetching
<div className="email-modal-error">
  <div className="error-icon">⚠️</div>
  <h3>Unable to load email</h3>
  <p>This email may have been deleted or is no longer accessible.</p>
  <button onClick={onClose}>Close</button>
</div>
```

---

## Edge Cases & Considerations

### 1. Email Not Found
- **Problem:** Email deleted from Gmail after extraction
- **Solution:** Show error state with message, offer to remove item

### 2. Large Emails
- **Problem:** Email with 10MB+ HTML body
- **Solution:** 
  - Truncate body after 500KB
  - Show "View full email in Gmail" button
  - Lazy load images

### 3. External Images (Tracking Pixels)
- **Problem:** Opening email loads tracking pixels
- **Solution:** 
  - Option 1: Block external images by default, "Load images" button
  - Option 2: Proxy images through backend
  - Option 3: Allow images (user privacy trade-off)

### 4. Malicious HTML/Scripts
- **Problem:** Email contains XSS attacks
- **Solution:** 
  - Sanitize HTML with `bleach` library
  - Remove all `<script>` tags
  - Remove event handlers (`onclick`, `onerror`, etc.)
  - Use CSP headers

### 5. Gmail API Rate Limits
- **Problem:** Too many email fetches hit rate limit
- **Solution:** 
  - Cache email data in backend (Redis, 1 hour TTL)
  - Show cached version if available
  - Rate limit frontend requests (max 10/min per user)

### 6. Multiple Source Emails (Canonical Items)
- **Problem:** Item extracted from 3 different emails
- **Solution:** 
  - Show all source emails in list
  - Each has "View Email" button
  - Modal shows which source is being viewed

### 7. Mobile View
- **Problem:** Modal too large on mobile
- **Solution:** 
  - Full-screen modal on mobile (< 768px)
  - Swipe down to close
  - Simplified header (fewer meta fields)

### 8. Keyboard Navigation
- **Problem:** Users expect keyboard shortcuts
- **Solution:** 
  - `Esc` to close
  - `Tab` to navigate actions
  - `Enter` on "Open in Gmail" button
  - Focus trap within modal

---

## Acceptance Criteria

### UI Components
- [ ] "View Source Email" button appears on all content cards
- [ ] "View Original Email" link appears in detail views
- [ ] "View Email" buttons appear in source emails list (canonical items)
- [ ] Modal opens with smooth animation (200ms)
- [ ] Modal closes on ✕ click, Esc key, outside click

### Email Display
- [ ] Email header shows: From, To, Subject, Date
- [ ] HTML emails render with formatting preserved
- [ ] Plain text emails render with monospace font
- [ ] Images load (with privacy controls)
- [ ] Links are clickable and open in new tab
- [ ] Email body scrolls independently
- [ ] Responsive to modal width (max 900px)

### Actions
- [ ] "Open in Gmail" button deep links to Gmail
- [ ] "Copy Email Link" copies Gmail URL to clipboard
- [ ] "Download .eml" downloads email file (optional)
- [ ] All actions work on desktop and mobile

### Backend
- [ ] GET /api/emails/{email_id} endpoint
- [ ] GET /api/emails/{email_id}/attachments/{id} endpoint
- [ ] HTML sanitization prevents XSS
- [ ] Email data cached (1 hour TTL)
- [ ] Rate limiting (10 requests/min per user)

### Loading & Error States
- [ ] Skeleton loader while fetching email
- [ ] Error state if email not found
- [ ] Error state if API fails
- [ ] Retry button on error

### Performance
- [ ] Email loads in < 2s (p95)
- [ ] Modal opens instantly (cached data)
- [ ] No layout shift when images load
- [ ] Smooth scrolling in email body

### Accessibility
- [ ] Modal keyboard-navigable (Tab, Esc)
- [ ] Focus trapped within modal
- [ ] ARIA labels on all buttons
- [ ] Screen reader announces modal open/close
- [ ] Color contrast meets WCAG AA

### Privacy & Security
- [ ] HTML sanitized (no scripts, no event handlers)
- [ ] External images blocked by default (optional)
- [ ] CSP headers prevent inline scripts
- [ ] No email content logged or stored permanently

---

## Implementation Phases

### Phase 1: Core Functionality
- [ ] EmailModal component (basic HTML rendering)
- [ ] ViewSourceEmailButton component
- [ ] GET /api/emails/{email_id} endpoint
- [ ] Gmail API integration
- [ ] HTML sanitization
- [ ] Loading and error states

### Phase 2: Enhanced UX
- [ ] Email header with full metadata
- [ ] "Open in Gmail" deep link
- [ ] "Copy Email Link" action
- [ ] Keyboard shortcuts (Esc to close)
- [ ] Click outside to close
- [ ] Smooth animations

### Phase 3: Polish & Optimization
- [ ] Email caching (Redis)
- [ ] Rate limiting
- [ ] External image blocking (privacy)
- [ ] Attachment preview (optional)
- [ ] Download .eml file (optional)
- [ ] Mobile full-screen modal
- [ ] Performance optimizations

---

## Metrics to Track

- **Usage:** % of users who view source emails
- **Frequency:** Average # of source emails viewed per session
- **Engagement:** Time spent viewing source emails
- **Errors:** % of email fetch failures
- **Performance:** p95 latency for email loading

---

## Related Work

- **F-004:** Blog View Enhancement (source email link in detail view)
- **F-006:** Saved Tags Filtering (tags visible in source email)
- **Phase 1:** Email ingestion (stores source_email_id)
- **UX Research:** Provenance flow (primary_ux_research_dia.md)

---

## Security Considerations

### XSS Prevention
```python
# Backend sanitization
import bleach

def sanitize_html(html: str) -> str:
    allowed_tags = ['p', 'br', 'a', 'img', 'div', 'span', 'strong', 'em', ...]
    allowed_attrs = {
        'a': ['href', 'title'],
        'img': ['src', 'alt', 'width', 'height'],
        ...
    }
    return bleach.clean(html, tags=allowed_tags, attributes=allowed_attrs, strip=True)
```

### CSP Headers
```python
# FastAPI response headers
@app.get("/api/emails/{email_id}")
async def get_email(email_id: str):
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'none'; "
        "img-src 'self' data: https:; "
        "style-src 'self' 'unsafe-inline';"
    )
    return email_data
```

### Privacy Controls
```tsx
// Frontend: Block external images by default
const [showImages, setShowImages] = useState(false);

// Replace external image URLs
const processedHtml = showImages 
  ? emailHtml 
  : emailHtml.replace(
      /<img src="http/g, 
      '<img data-blocked-src="http'
    );

// Show "Load images" button
{!showImages && (
  <button onClick={() => setShowImages(true)}>
    Load external images
  </button>
)}
```
