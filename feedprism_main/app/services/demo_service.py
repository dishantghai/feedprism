"""
Demo Mode Service

Manages demo-specific data and collections:
- Separate demo collections for extracted items
- Pre-defined demo emails that reset on refresh
- Auto-cleanup of demo extracted items
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import uuid
from loguru import logger

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue
)

from app.config import settings


# Pre-defined demo emails (simulating newsletter content)
DEMO_EMAILS = [
    {
        "id": "demo-email-001",
        "subject": "Last Week in AI #226 - Gemini 3, Claude 4, and AI Agents",
        "sender": "Last Week in AI",
        "sender_email": "newsletter@lastweekin.ai",
        "snippet": "This week: Google announces Gemini 3 with breakthrough reasoning capabilities, Anthropic releases Claude 4 with 1M context window, OpenAI demos autonomous AI agents...",
        "body": """
        <h1>Last Week in AI #226</h1>
        <p>Welcome to this week's roundup of AI news!</p>
        
        <h2>🎯 Top Stories</h2>
        <ul>
            <li><strong>Google Gemini 3</strong> - Breakthrough in multi-modal reasoning</li>
            <li><strong>Claude 4 Released</strong> - 1M token context window</li>
            <li><strong>AI Agents Demo</strong> - OpenAI shows autonomous coding agents</li>
        </ul>
        
        <h2>📅 Upcoming Events</h2>
        <p><strong>AI Summit 2025</strong> - January 15-17, San Francisco. Register at aisummit.com</p>
        <p><strong>NeurIPS Workshop</strong> - December 10, Virtual. Free registration.</p>
        
        <h2>📚 New Courses</h2>
        <p><strong>Deep Learning Specialization Update</strong> by Andrew Ng on Coursera. New modules on transformers and LLMs.</p>
        
        <h2>📖 Must-Read Articles</h2>
        <p><a href="https://example.com/gemini3">Inside Gemini 3's Architecture</a> - Technical deep dive</p>
        <p><a href="https://example.com/agents">The Rise of AI Agents</a> - What it means for developers</p>
        """,
        "received_at": datetime.now().isoformat(),
        "labels": ["newsletters", "ai"]
    },
    {
        "id": "demo-email-002",
        "subject": "Coursera Weekly: New Machine Learning Courses",
        "sender": "Coursera",
        "sender_email": "newsletter@coursera.org",
        "snippet": "New courses: Advanced TensorFlow, MLOps Fundamentals, and Generative AI with LangChain. Plus 50% off annual subscription...",
        "body": """
        <h1>New Courses This Week</h1>
        
        <h2>🎓 Featured Courses</h2>
        
        <div class="course">
            <h3>Advanced TensorFlow for Production</h3>
            <p>Instructor: Laurence Moroney (Google)</p>
            <p>Duration: 6 weeks | Level: Intermediate</p>
            <p>Learn to deploy TensorFlow models at scale.</p>
            <a href="https://coursera.org/tensorflow-advanced">Enroll Now - Free</a>
        </div>
        
        <div class="course">
            <h3>MLOps Fundamentals</h3>
            <p>Instructor: Robert Crowe (Google Cloud)</p>
            <p>Duration: 4 weeks | Level: Intermediate</p>
            <p>Master the ML lifecycle from development to production.</p>
            <a href="https://coursera.org/mlops">Enroll Now - $49</a>
        </div>
        
        <div class="course">
            <h3>Generative AI with LangChain</h3>
            <p>Instructor: Harrison Chase (LangChain)</p>
            <p>Duration: 3 weeks | Level: Beginner</p>
            <p>Build powerful LLM applications with LangChain.</p>
            <a href="https://coursera.org/langchain">Enroll Now - Free</a>
        </div>
        """,
        "received_at": (datetime.now() - timedelta(hours=2)).isoformat(),
        "labels": ["newsletters", "courses"]
    },
    {
        "id": "demo-email-003",
        "subject": "Tech Events This Week - AI Summit, React Conf, DevOps Days",
        "sender": "Eventbrite Digest",
        "sender_email": "digest@eventbrite.com",
        "snippet": "Don't miss these upcoming tech events: AI Summit 2025 in SF, React Conf in Miami, DevOps Days in NYC...",
        "body": """
        <h1>Upcoming Tech Events</h1>
        
        <div class="event">
            <h2>🤖 AI Summit 2025</h2>
            <p><strong>Date:</strong> January 15-17, 2025</p>
            <p><strong>Location:</strong> Moscone Center, San Francisco</p>
            <p><strong>Price:</strong> $599 Early Bird</p>
            <p>The premier AI conference featuring talks from OpenAI, Google, and Anthropic.</p>
            <a href="https://aisummit.com/register">Register Now</a>
        </div>
        
        <div class="event">
            <h2>⚛️ React Conf 2025</h2>
            <p><strong>Date:</strong> February 20-21, 2025</p>
            <p><strong>Location:</strong> Miami Beach Convention Center</p>
            <p><strong>Price:</strong> $399</p>
            <p>Learn about React 19, Server Components, and the future of React.</p>
            <a href="https://reactconf.com">Get Tickets</a>
        </div>
        
        <div class="event">
            <h2>🔧 DevOps Days NYC</h2>
            <p><strong>Date:</strong> March 5-6, 2025</p>
            <p><strong>Location:</strong> New York Marriott Marquis</p>
            <p><strong>Price:</strong> $299</p>
            <p>Two days of DevOps best practices, tools, and networking.</p>
            <a href="https://devopsdays.org/nyc">Register</a>
        </div>
        """,
        "received_at": (datetime.now() - timedelta(hours=4)).isoformat(),
        "labels": ["newsletters", "events"]
    },
    {
        "id": "demo-email-004",
        "subject": "The Pragmatic Engineer: How Big Tech Does Code Reviews",
        "sender": "Gergely Orosz",
        "sender_email": "gergely@pragmaticengineer.com",
        "snippet": "A deep dive into code review practices at Google, Meta, and Amazon. Plus: why smaller PRs get merged faster...",
        "body": """
        <h1>How Big Tech Does Code Reviews</h1>
        <p>By Gergely Orosz</p>
        
        <p>I talked to engineers at Google, Meta, Amazon, and Microsoft about their code review practices. Here's what I learned:</p>
        
        <h2>Key Insights</h2>
        <ul>
            <li><strong>Google:</strong> Readability reviews are mandatory. Every engineer must pass a readability review in each language they use.</li>
            <li><strong>Meta:</strong> "Ship fast, fix fast" culture. Reviews are quick but thorough.</li>
            <li><strong>Amazon:</strong> Focus on operational excellence. Reviews check for error handling and monitoring.</li>
        </ul>
        
        <h2>Best Practices</h2>
        <ol>
            <li>Keep PRs under 400 lines</li>
            <li>Review within 24 hours</li>
            <li>Use automated checks for style</li>
            <li>Focus on logic, not formatting</li>
        </ol>
        
        <p><a href="https://pragmaticengineer.com/code-reviews">Read the full article →</a></p>
        """,
        "received_at": (datetime.now() - timedelta(hours=6)).isoformat(),
        "labels": ["newsletters", "engineering"]
    },
    {
        "id": "demo-email-005",
        "subject": "Python Weekly: FastAPI 0.110, Django 5.0, and Async Patterns",
        "sender": "Python Weekly",
        "sender_email": "rahul@pythonweekly.com",
        "snippet": "This week: FastAPI 0.110 with Pydantic v2, Django 5.0 released, new async patterns for high-performance Python...",
        "body": """
        <h1>Python Weekly Newsletter</h1>
        
        <h2>📦 New Releases</h2>
        <ul>
            <li><strong>FastAPI 0.110</strong> - Full Pydantic v2 support, 40% faster validation</li>
            <li><strong>Django 5.0</strong> - Async views, improved admin, Python 3.10+ required</li>
            <li><strong>Polars 0.20</strong> - New lazy evaluation engine, 2x faster groupby</li>
        </ul>
        
        <h2>📚 Tutorials</h2>
        <p><a href="https://example.com/async-python">Mastering Async Python</a> - Complete guide to asyncio</p>
        <p><a href="https://example.com/fastapi-best">FastAPI Best Practices</a> - Production-ready patterns</p>
        
        <h2>🎓 Courses</h2>
        <p><strong>Advanced Python Concurrency</strong> on Udemy - Learn threading, multiprocessing, and asyncio. $19.99</p>
        
        <h2>📅 Events</h2>
        <p><strong>PyCon US 2025</strong> - May 14-22, Pittsburgh. Early bird tickets available!</p>
        """,
        "received_at": (datetime.now() - timedelta(hours=8)).isoformat(),
        "labels": ["newsletters", "python"]
    },
    {
        "id": "demo-email-006",
        "subject": "Hacker Newsletter: Top Stories from Hacker News",
        "sender": "Hacker Newsletter",
        "sender_email": "kale@hackernewsletter.com",
        "snippet": "This week's top stories: Why SQLite is taking over, The death of microservices, Building a startup in 2025...",
        "body": """
        <h1>Hacker Newsletter #650</h1>
        
        <h2>🔥 Top Stories</h2>
        
        <h3>1. Why SQLite is Taking Over</h3>
        <p>SQLite is now the most deployed database in the world. Here's why it's becoming the default choice for new projects.</p>
        <a href="https://example.com/sqlite">Read more (1,234 points)</a>
        
        <h3>2. The Death of Microservices</h3>
        <p>After a decade of microservices hype, companies are returning to monoliths. What went wrong?</p>
        <a href="https://example.com/monolith">Read more (987 points)</a>
        
        <h3>3. Building a Startup in 2025</h3>
        <p>The landscape has changed. AI tools, remote work, and new funding models are reshaping how we build companies.</p>
        <a href="https://example.com/startup-2025">Read more (756 points)</a>
        
        <h2>💼 Jobs</h2>
        <p>Senior Engineer at Stripe (Remote) - $200-300k</p>
        <p>Founding Engineer at AI Startup (SF) - $150-250k + equity</p>
        """,
        "received_at": (datetime.now() - timedelta(hours=10)).isoformat(),
        "labels": ["newsletters", "tech"]
    }
]


class DemoService:
    """
    Service for managing demo mode data.
    
    Provides:
    - Pre-defined demo emails for extraction
    - Separate demo collection management
    - Auto-reset functionality
    """
    
    # Demo collection names (separate from production)
    DEMO_COLLECTIONS = {
        "events": "feedprism_demo_events",
        "courses": "feedprism_demo_courses",
        "blogs": "feedprism_demo_blogs"
    }
    
    def __init__(self):
        """Initialize demo service with Qdrant client."""
        self.client = QdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port
        )
        self.vector_size = settings.embedding_dimension
        self._extracted_ids: set = set()  # Track extracted demo items
        logger.info("DemoService initialized")
    
    def get_demo_emails(self) -> List[Dict[str, Any]]:
        """
        Get pre-defined demo emails for extraction.
        
        Returns:
            List of demo email dictionaries
        """
        return DEMO_EMAILS.copy()
    
    def get_unprocessed_demo_emails(self) -> List[Dict[str, Any]]:
        """
        Get demo emails that haven't been extracted yet.
        
        Returns:
            List of unprocessed demo emails
        """
        return [
            email for email in DEMO_EMAILS
            if email["id"] not in self._extracted_ids
        ]
    
    def mark_as_extracted(self, email_ids: List[str]) -> None:
        """
        Mark demo emails as extracted.
        
        Args:
            email_ids: List of email IDs that were extracted
        """
        for email_id in email_ids:
            self._extracted_ids.add(email_id)
        logger.info(f"Marked {len(email_ids)} demo emails as extracted")
    
    def reset_demo_state(self) -> Dict[str, Any]:
        """
        Reset demo state - clear extracted items and mark all emails as unprocessed.
        
        Returns:
            Status of reset operation
        """
        # Clear extracted tracking
        extracted_count = len(self._extracted_ids)
        self._extracted_ids.clear()
        
        # Delete all points from demo collections
        deleted_items = 0
        for content_type, collection_name in self.DEMO_COLLECTIONS.items():
            try:
                if self.client.collection_exists(collection_name):
                    # Get count before deletion
                    info = self.client.get_collection(collection_name)
                    count = info.points_count
                    
                    # Delete collection and recreate
                    self.client.delete_collection(collection_name)
                    self._create_demo_collection(collection_name)
                    
                    deleted_items += count
                    logger.info(f"Reset demo collection {collection_name}: deleted {count} items")
            except Exception as e:
                logger.error(f"Error resetting {collection_name}: {e}")
        
        logger.success(f"Demo state reset: {extracted_count} emails unmarked, {deleted_items} items deleted")
        
        return {
            "success": True,
            "emails_reset": extracted_count,
            "items_deleted": deleted_items,
            "demo_emails_available": len(DEMO_EMAILS)
        }
    
    def _create_demo_collection(self, collection_name: str) -> None:
        """Create a demo collection with same schema as production."""
        if not self.client.collection_exists(collection_name):
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config={
                    "title": VectorParams(size=self.vector_size, distance=Distance.COSINE),
                    "description": VectorParams(size=self.vector_size, distance=Distance.COSINE),
                    "full_text": VectorParams(size=self.vector_size, distance=Distance.COSINE)
                }
            )
            logger.info(f"Created demo collection: {collection_name}")
    
    def ensure_demo_collections(self) -> None:
        """Ensure all demo collections exist."""
        for collection_name in self.DEMO_COLLECTIONS.values():
            self._create_demo_collection(collection_name)
    
    def get_demo_collection_name(self, content_type: str) -> str:
        """Get demo collection name for content type."""
        return self.DEMO_COLLECTIONS.get(content_type)
    
    def get_demo_stats(self) -> Dict[str, Any]:
        """
        Get demo mode statistics.
        
        Returns:
            Dict with demo stats
        """
        stats = {
            "total_demo_emails": len(DEMO_EMAILS),
            "extracted_emails": len(self._extracted_ids),
            "unprocessed_emails": len(DEMO_EMAILS) - len(self._extracted_ids),
            "collections": {}
        }
        
        for content_type, collection_name in self.DEMO_COLLECTIONS.items():
            try:
                if self.client.collection_exists(collection_name):
                    info = self.client.get_collection(collection_name)
                    stats["collections"][content_type] = info.points_count
                else:
                    stats["collections"][content_type] = 0
            except Exception:
                stats["collections"][content_type] = 0
        
        return stats
    
    def get_demo_feed_items(self) -> List[Dict[str, Any]]:
        """
        Get pre-defined demo feed items (events, courses, blogs).
        These are shown in the feed when demo mode is active.
        Items are spread across different source emails.
        
        Returns:
            List of demo feed items
        """
        now = datetime.now()
        
        # Pre-defined demo extracted items - spread across different emails
        demo_items = [
            # ===== EVENTS (5 items from 3 different emails) =====
            {
                "id": "demo-event-001",
                "item_type": "event",
                "title": "AI Summit 2025",
                "description": "The premier AI conference featuring talks from OpenAI, Google, Anthropic, and Meta. Three days of cutting-edge AI research, demos, and networking.",
                "hook": "Join 5000+ AI practitioners for the biggest AI event of the year",
                "start_time": (now + timedelta(days=45)).isoformat(),
                "end_time": (now + timedelta(days=47)).isoformat(),
                "location": "Moscone Center, San Francisco",
                "organizer": "AI Summit Inc.",
                "event_type": "conference",
                "cost": "$599 Early Bird",
                "is_free": False,
                "url": "https://aisummit.com/register",
                "tags": ["AI", "Machine Learning", "Conference", "Networking"],
                "image_url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",
                "source_email_id": "demo-email-001",
                "source_subject": "Last Week in AI #226",
                "source_sender": "Last Week in AI",
                "source_sender_email": "newsletter@lastweekin.ai",
                "source_received_at": now.isoformat()
            },
            {
                "id": "demo-event-002",
                "item_type": "event",
                "title": "React Conf 2025",
                "description": "Learn about React 19, Server Components, and the future of React directly from the React team at Meta.",
                "hook": "The official React conference is back!",
                "start_time": (now + timedelta(days=80)).isoformat(),
                "end_time": (now + timedelta(days=81)).isoformat(),
                "location": "Miami Beach Convention Center",
                "organizer": "Meta",
                "event_type": "conference",
                "cost": "$399",
                "is_free": False,
                "url": "https://reactconf.com",
                "tags": ["React", "JavaScript", "Frontend", "Web Development"],
                "image_url": "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
                "source_email_id": "demo-email-003",
                "source_subject": "Tech Events This Week",
                "source_sender": "Eventbrite Digest",
                "source_sender_email": "digest@eventbrite.com",
                "source_received_at": (now - timedelta(hours=4)).isoformat()
            },
            {
                "id": "demo-event-003",
                "item_type": "event",
                "title": "PyCon US 2025",
                "description": "The largest annual gathering for the Python community. Talks, tutorials, sprints, and more.",
                "hook": "Connect with Python developers from around the world",
                "start_time": (now + timedelta(days=165)).isoformat(),
                "end_time": (now + timedelta(days=173)).isoformat(),
                "location": "Pittsburgh, PA",
                "organizer": "Python Software Foundation",
                "event_type": "conference",
                "cost": "$400",
                "is_free": False,
                "url": "https://pycon.org",
                "tags": ["Python", "Programming", "Open Source"],
                "image_url": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400",
                "source_email_id": "demo-email-005",
                "source_subject": "Python Weekly",
                "source_sender": "Python Weekly",
                "source_sender_email": "rahul@pythonweekly.com",
                "source_received_at": (now - timedelta(hours=8)).isoformat()
            },
            {
                "id": "demo-event-004",
                "item_type": "event",
                "title": "DevOps Days NYC",
                "description": "Two days of DevOps best practices, tools, and networking with industry leaders.",
                "hook": "Level up your DevOps game in the Big Apple",
                "start_time": (now + timedelta(days=95)).isoformat(),
                "end_time": (now + timedelta(days=96)).isoformat(),
                "location": "New York Marriott Marquis",
                "organizer": "DevOps Days",
                "event_type": "conference",
                "cost": "$299",
                "is_free": False,
                "url": "https://devopsdays.org/nyc",
                "tags": ["DevOps", "CI/CD", "Infrastructure", "Cloud"],
                "image_url": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400",
                "source_email_id": "demo-email-003",
                "source_subject": "Tech Events This Week",
                "source_sender": "Eventbrite Digest",
                "source_sender_email": "digest@eventbrite.com",
                "source_received_at": (now - timedelta(hours=4)).isoformat()
            },
            {
                "id": "demo-event-005",
                "item_type": "event",
                "title": "NeurIPS Workshop on LLMs",
                "description": "Virtual workshop on large language models, featuring papers on scaling, alignment, and applications.",
                "hook": "Free virtual workshop from top AI researchers",
                "start_time": (now + timedelta(days=10)).isoformat(),
                "end_time": (now + timedelta(days=10)).isoformat(),
                "location": "Virtual",
                "organizer": "NeurIPS",
                "event_type": "workshop",
                "cost": "Free",
                "is_free": True,
                "url": "https://neurips.cc/workshops",
                "tags": ["NeurIPS", "LLM", "Research", "Virtual"],
                "image_url": "https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=400",
                "source_email_id": "demo-email-001",
                "source_subject": "Last Week in AI #226",
                "source_sender": "Last Week in AI",
                "source_sender_email": "newsletter@lastweekin.ai",
                "source_received_at": now.isoformat()
            },
            
            # ===== COURSES (6 items from 3 different emails) =====
            {
                "id": "demo-course-001",
                "item_type": "course",
                "title": "Advanced TensorFlow for Production",
                "description": "Learn to deploy TensorFlow models at scale. Covers TF Serving, TFX pipelines, and cloud deployment.",
                "hook": "Take your ML models from notebook to production",
                "provider": "Coursera",
                "instructor": "Laurence Moroney",
                "level": "intermediate",
                "duration": "6 weeks",
                "is_free": True,
                "certificate_offered": True,
                "url": "https://coursera.org/tensorflow-advanced",
                "tags": ["TensorFlow", "Machine Learning", "MLOps", "Production"],
                "image_url": "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400",
                "what_you_learn": ["TF Serving", "TFX Pipelines", "Cloud Deployment", "Model Optimization"],
                "source_email_id": "demo-email-002",
                "source_subject": "Coursera Weekly: New ML Courses",
                "source_sender": "Coursera",
                "source_sender_email": "newsletter@coursera.org",
                "source_received_at": (now - timedelta(hours=2)).isoformat()
            },
            {
                "id": "demo-course-002",
                "item_type": "course",
                "title": "Generative AI with LangChain",
                "description": "Build powerful LLM applications with LangChain. Learn chains, agents, memory, and RAG patterns.",
                "hook": "Master the most popular LLM framework",
                "provider": "Coursera",
                "instructor": "Harrison Chase",
                "level": "beginner",
                "duration": "3 weeks",
                "is_free": True,
                "certificate_offered": True,
                "url": "https://coursera.org/langchain",
                "tags": ["LangChain", "LLM", "Generative AI", "RAG"],
                "image_url": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
                "what_you_learn": ["LangChain Basics", "Chains & Agents", "RAG Patterns", "Memory Systems"],
                "source_email_id": "demo-email-001",
                "source_subject": "Last Week in AI #226",
                "source_sender": "Last Week in AI",
                "source_sender_email": "newsletter@lastweekin.ai",
                "source_received_at": now.isoformat()
            },
            {
                "id": "demo-course-003",
                "item_type": "course",
                "title": "MLOps Fundamentals",
                "description": "Master the ML lifecycle from development to production. CI/CD for ML, monitoring, and versioning.",
                "hook": "Bridge the gap between ML and DevOps",
                "provider": "Coursera",
                "instructor": "Robert Crowe",
                "level": "intermediate",
                "duration": "4 weeks",
                "is_free": False,
                "cost": "$49",
                "certificate_offered": True,
                "url": "https://coursera.org/mlops",
                "tags": ["MLOps", "DevOps", "Machine Learning", "CI/CD"],
                "image_url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400",
                "what_you_learn": ["ML Pipelines", "Model Versioning", "Monitoring", "A/B Testing"],
                "source_email_id": "demo-email-002",
                "source_subject": "Coursera Weekly: New ML Courses",
                "source_sender": "Coursera",
                "source_sender_email": "newsletter@coursera.org",
                "source_received_at": (now - timedelta(hours=2)).isoformat()
            },
            {
                "id": "demo-course-004",
                "item_type": "course",
                "title": "Python for Data Science",
                "description": "Comprehensive Python course covering pandas, numpy, matplotlib, and scikit-learn for data analysis.",
                "hook": "Start your data science journey with Python",
                "provider": "DataCamp",
                "instructor": "Hugo Bowne-Anderson",
                "level": "beginner",
                "duration": "4 weeks",
                "is_free": False,
                "cost": "$29/month",
                "certificate_offered": True,
                "url": "https://datacamp.com/python-ds",
                "tags": ["Python", "Data Science", "Pandas", "NumPy"],
                "image_url": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400",
                "what_you_learn": ["Pandas DataFrames", "NumPy Arrays", "Data Visualization", "Basic ML"],
                "source_email_id": "demo-email-005",
                "source_subject": "Python Weekly",
                "source_sender": "Python Weekly",
                "source_sender_email": "rahul@pythonweekly.com",
                "source_received_at": (now - timedelta(hours=8)).isoformat()
            },
            {
                "id": "demo-course-005",
                "item_type": "course",
                "title": "System Design Interview Prep",
                "description": "Learn to design scalable systems like Netflix, Uber, and Twitter. Perfect for senior engineer interviews.",
                "hook": "Ace your system design interviews",
                "provider": "Educative",
                "instructor": "Alex Xu",
                "level": "advanced",
                "duration": "8 weeks",
                "is_free": False,
                "cost": "$79",
                "certificate_offered": False,
                "url": "https://educative.io/system-design",
                "tags": ["System Design", "Interview", "Architecture", "Scalability"],
                "image_url": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400",
                "what_you_learn": ["Load Balancing", "Database Sharding", "Caching", "Microservices"],
                "source_email_id": "demo-email-004",
                "source_subject": "The Pragmatic Engineer",
                "source_sender": "Gergely Orosz",
                "source_sender_email": "gergely@pragmaticengineer.com",
                "source_received_at": (now - timedelta(hours=6)).isoformat()
            },
            {
                "id": "demo-course-006",
                "item_type": "course",
                "title": "React 19 Deep Dive",
                "description": "Master React 19 features including Server Components, Actions, and the new compiler.",
                "hook": "Stay ahead with the latest React features",
                "provider": "Frontend Masters",
                "instructor": "Brian Holt",
                "level": "intermediate",
                "duration": "2 weeks",
                "is_free": False,
                "cost": "$39/month",
                "certificate_offered": True,
                "url": "https://frontendmasters.com/react19",
                "tags": ["React", "JavaScript", "Frontend", "Server Components"],
                "image_url": "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=400",
                "what_you_learn": ["Server Components", "React Actions", "Suspense", "New Compiler"],
                "source_email_id": "demo-email-003",
                "source_subject": "Tech Events This Week",
                "source_sender": "Eventbrite Digest",
                "source_sender_email": "digest@eventbrite.com",
                "source_received_at": (now - timedelta(hours=4)).isoformat()
            },
            
            # ===== BLOGS (7 items from 5 different emails) =====
            {
                "id": "demo-blog-001",
                "item_type": "blog",
                "title": "How Big Tech Does Code Reviews",
                "description": "A deep dive into code review practices at Google, Meta, Amazon, and Microsoft. Learn what makes their reviews effective.",
                "hook": "Inside the code review culture of tech giants",
                "author": "Gergely Orosz",
                "author_title": "Author of The Pragmatic Engineer",
                "source": "The Pragmatic Engineer",
                "category": "Engineering",
                "reading_time": "12 min",
                "published_date": (now - timedelta(days=2)).isoformat(),
                "url": "https://pragmaticengineer.com/code-reviews",
                "tags": ["Code Review", "Engineering Culture", "Best Practices"],
                "image_url": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400",
                "key_points": ["Keep PRs under 400 lines", "Review within 24 hours", "Focus on logic, not formatting"],
                "source_email_id": "demo-email-004",
                "source_subject": "The Pragmatic Engineer",
                "source_sender": "Gergely Orosz",
                "source_sender_email": "gergely@pragmaticengineer.com",
                "source_received_at": (now - timedelta(hours=6)).isoformat()
            },
            {
                "id": "demo-blog-002",
                "item_type": "blog",
                "title": "Why SQLite is Taking Over",
                "description": "SQLite is now the most deployed database in the world. Here's why it's becoming the default choice for new projects.",
                "hook": "The humble database that powers billions of devices",
                "author": "Kale Davis",
                "source": "Hacker Newsletter",
                "category": "Technology",
                "reading_time": "8 min",
                "published_date": (now - timedelta(days=1)).isoformat(),
                "url": "https://example.com/sqlite",
                "tags": ["SQLite", "Database", "Architecture"],
                "image_url": "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400",
                "key_points": ["Zero configuration", "Serverless", "Cross-platform", "ACID compliant"],
                "source_email_id": "demo-email-006",
                "source_subject": "Hacker Newsletter",
                "source_sender": "Hacker Newsletter",
                "source_sender_email": "kale@hackernewsletter.com",
                "source_received_at": (now - timedelta(hours=10)).isoformat()
            },
            {
                "id": "demo-blog-003",
                "item_type": "blog",
                "title": "Inside Gemini 3's Architecture",
                "description": "Technical deep dive into Google's latest multimodal AI model. Exploring the innovations that make it special.",
                "hook": "The architecture behind Google's most capable AI",
                "author": "Last Week in AI",
                "source": "Last Week in AI",
                "category": "AI Research",
                "reading_time": "15 min",
                "published_date": now.isoformat(),
                "url": "https://example.com/gemini3",
                "tags": ["Gemini", "Google", "AI Architecture", "Multimodal"],
                "image_url": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400",
                "key_points": ["Mixture of Experts", "1M context window", "Native multimodality"],
                "source_email_id": "demo-email-001",
                "source_subject": "Last Week in AI #226",
                "source_sender": "Last Week in AI",
                "source_sender_email": "newsletter@lastweekin.ai",
                "source_received_at": now.isoformat()
            },
            {
                "id": "demo-blog-004",
                "item_type": "blog",
                "title": "The Rise of AI Agents",
                "description": "What autonomous AI agents mean for developers. From coding assistants to fully autonomous systems.",
                "hook": "Are AI agents the next paradigm shift?",
                "author": "Last Week in AI",
                "source": "Last Week in AI",
                "category": "AI Trends",
                "reading_time": "10 min",
                "published_date": now.isoformat(),
                "url": "https://example.com/agents",
                "tags": ["AI Agents", "Automation", "Future of Work"],
                "image_url": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400",
                "key_points": ["Tool use capabilities", "Multi-step reasoning", "Human-in-the-loop"],
                "source_email_id": "demo-email-001",
                "source_subject": "Last Week in AI #226",
                "source_sender": "Last Week in AI",
                "source_sender_email": "newsletter@lastweekin.ai",
                "source_received_at": now.isoformat()
            },
            {
                "id": "demo-blog-005",
                "item_type": "blog",
                "title": "Salary Negotiation for Engineers",
                "description": "Practical tips for negotiating your compensation package. Real examples from FAANG and startups.",
                "hook": "Don't leave money on the table",
                "author": "Gergely Orosz",
                "author_title": "Author of The Pragmatic Engineer",
                "source": "The Pragmatic Engineer",
                "category": "Career",
                "reading_time": "18 min",
                "published_date": (now - timedelta(days=3)).isoformat(),
                "url": "https://pragmaticengineer.com/salary",
                "tags": ["Career", "Salary", "Negotiation", "FAANG"],
                "image_url": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400",
                "key_points": ["Research market rates", "Never give first number", "Negotiate total comp"],
                "source_email_id": "demo-email-004",
                "source_subject": "The Pragmatic Engineer",
                "source_sender": "Gergely Orosz",
                "source_sender_email": "gergely@pragmaticengineer.com",
                "source_received_at": (now - timedelta(hours=6)).isoformat()
            },
            {
                "id": "demo-blog-006",
                "item_type": "blog",
                "title": "Python 3.13 Performance Improvements",
                "description": "Benchmarks and analysis of the new JIT compiler and other performance enhancements in Python 3.13.",
                "hook": "Python is getting faster, finally",
                "author": "Rahul Dave",
                "source": "Python Weekly",
                "category": "Python",
                "reading_time": "7 min",
                "published_date": (now - timedelta(days=1)).isoformat(),
                "url": "https://example.com/python313",
                "tags": ["Python", "Performance", "JIT", "Programming"],
                "image_url": "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400",
                "key_points": ["JIT compiler", "10-15% faster", "No code changes needed"],
                "source_email_id": "demo-email-005",
                "source_subject": "Python Weekly",
                "source_sender": "Python Weekly",
                "source_sender_email": "rahul@pythonweekly.com",
                "source_received_at": (now - timedelta(hours=8)).isoformat()
            },
            {
                "id": "demo-blog-007",
                "item_type": "blog",
                "title": "The State of JavaScript 2024",
                "description": "Survey results from 30,000 developers on frameworks, tools, and trends in the JavaScript ecosystem.",
                "hook": "What JS developers are actually using",
                "author": "Kale Davis",
                "source": "Hacker Newsletter",
                "category": "JavaScript",
                "reading_time": "11 min",
                "published_date": (now - timedelta(days=2)).isoformat(),
                "url": "https://stateofjs.com/2024",
                "tags": ["JavaScript", "Survey", "Frameworks", "Trends"],
                "image_url": "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400",
                "key_points": ["React still dominates", "Vite adoption soaring", "TypeScript is standard"],
                "source_email_id": "demo-email-006",
                "source_subject": "Hacker Newsletter",
                "source_sender": "Hacker Newsletter",
                "source_sender_email": "kale@hackernewsletter.com",
                "source_received_at": (now - timedelta(hours=10)).isoformat()
            }
        ]
        
        return demo_items


# Singleton instance
_demo_service: Optional[DemoService] = None


def get_demo_service() -> DemoService:
    """Get or create demo service singleton."""
    global _demo_service
    if _demo_service is None:
        _demo_service = DemoService()
    return _demo_service
