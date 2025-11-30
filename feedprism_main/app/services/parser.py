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
            - 'images': Extracted content images (list of dicts with src, alt)
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
                'images': [],
                'title': ''
            }
        
        try:
            # Parse HTML with lxml parser (fast and lenient)
            soup = BeautifulSoup(html_content, 'lxml')
            
            # Extract title
            title_tag = soup.find('title')
            title = title_tag.get_text(strip=True) if title_tag else ''
            
            # Extract images BEFORE cleaning (cleaning removes tracking pixels)
            images = self._extract_images(soup)
            
            # Clean HTML
            clean_soup = self._clean_html(soup)
            clean_html = str(clean_soup)
            
            # Convert to text
            text = self._html_to_text(clean_html)
            
            # Extract links
            links = self._extract_links(clean_soup)
            
            logger.success(f"Parsed email: {len(text)} chars, {len(links)} links, {len(images)} images")
            
            return {
                'clean_html': clean_html,
                'text': text,
                'links': links,
                'images': images,
                'title': title
            }
            
        except Exception as e:
            logger.error(f"HTML parsing failed: {e}")
            # Return fallback
            return {
                'clean_html': html_content,
                'text': self._fallback_text_extraction(html_content),
                'links': [],
                'images': [],
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
            logger.warning("Fallback text extraction also failed, returning raw HTML")
            return html
    
    def _extract_images(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """
        Extract content images from HTML (filtering out tracking pixels).
        
        Args:
            soup: BeautifulSoup object
        
        Returns:
            List of dicts with 'src' and 'alt' keys
        """
        images = []
        
        for img in soup.find_all('img', src=True):
            src = img.get('src', '')
            alt = img.get('alt', '')
            width = img.get('width', '')
            height = img.get('height', '')
            
            # Skip empty src
            if not src:
                continue
            
            # Skip tracking pixels (1x1)
            if width == '1' or height == '1':
                continue
            
            # Skip tiny images (likely icons)
            try:
                if width and height:
                    w = int(str(width).replace('px', ''))
                    h = int(str(height).replace('px', ''))
                    if w < 50 and h < 50:
                        continue
            except (ValueError, TypeError):
                pass
            
            # Skip common tracking/icon patterns in URL
            skip_patterns = [
                'tracking', 'pixel', 'beacon', 'spacer', 'icon',
                'logo', 'avatar', 'emoji', 'button', 'arrow',
                'social', 'facebook', 'twitter', 'linkedin', 'instagram',
                '1x1', 'blank', 'transparent', 'gif'
            ]
            src_lower = src.lower()
            if any(pattern in src_lower for pattern in skip_patterns):
                continue
            
            # Skip data URIs (inline images, usually small)
            if src.startswith('data:'):
                continue
            
            # Validate URL has proper scheme
            try:
                parsed = urlparse(src)
                if not parsed.scheme or parsed.scheme not in ['http', 'https']:
                    continue
            except Exception:
                continue
            
            images.append({
                'src': src,
                'alt': alt
            })
        
        # Deduplicate by src
        seen = set()
        unique_images = []
        for img in images:
            if img['src'] not in seen:
                seen.add(img['src'])
                unique_images.append(img)
        
        logger.debug(f"Extracted {len(unique_images)} content images")
        return unique_images
    
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
                if not parsed.scheme or not parsed.netloc:
                    continue
                
                links.append({
                    'text': text or url,
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
        <p>Check out our <a href=\"https://example.com/event\">upcoming event</a>!</p>
        <img src=\"tracking.gif\" width=\"1\" height=\"1\">
        <p style=\"display:none\">Hidden tracking text</p>
        <footer>
            <a href=\"https://example.com/unsubscribe\">Unsubscribe</a>
        </footer>
    </body>
    </html>
    """
    
    result = parser.parse_html_email(sample_html)
    
    print(f"Title: {result['title']}")
    print(f"\nText:\n{result['text']}")
    print(f"\nLinks: {result['links']}")
