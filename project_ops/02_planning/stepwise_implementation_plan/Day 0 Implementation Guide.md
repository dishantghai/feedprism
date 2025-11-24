
# FEEDPRISM: COMPLETE TECHNICAL IMPLEMENTATION GUIDE

## Memory Over Models Hackathon | 7-Day Build Plan


***

## 📋 TABLE OF CONTENTS

1. **Executive Summary \& Architecture Overview**
2. **Day 0: Environment Setup \& Gmail API Configuration**
3. **Day 1: Email Ingestion \& HTML Parsing Pipeline**
4. **Day 2: LLM-Based Extraction System (Events, Courses, Blogs)**
5. **Day 3: Vector Database Setup \& Hybrid Search**
6. **Day 4: Actionable Items \& Email Tagging**
7. **Day 5: Metrics, Benchmarking \& Evaluation**
8. **Day 6: Frontend Demo \& Integration**
9. **Day 7: Dockerization, Deployment \& Final Polish**
10. **Appendix: Spayce Integration Guide**

***

## 1. EXECUTIVE SUMMARY \& ARCHITECTURE OVERVIEW

### 1.1 What You're Building

**FeedPrism** transforms your unstructured email chaos into a structured, searchable knowledge base. It automatically:

- **Ingests** content-rich emails (newsletters, events, courses)
- **Extracts** structured data (events, courses, blogs, actionable items)
- **Indexes** everything with hybrid search (semantic + keyword)
- **Enables** natural language queries with time-aware filtering
- **Tracks** performance metrics (Precision@k, MRR)


### 1.2 Technical Stack (Optimized for Your Budget)

```
┌─────────────────────────────────────────────────────────────┐
│                     FEEDPRISM ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │   Gmail API  │──────│  Email Store │                   │
│  │  (OAuth 2.0) │      │   (JSON DB)  │                   │
│  └──────────────┘      └──────────────┘                   │
│         │                      │                            │
│         ▼                      ▼                            │
│  ┌────────────────────────────────────┐                   │
│  │      HTML Parsing & Cleaning       │                   │
│  │  (BeautifulSoup4 + html2text)      │                   │
│  └────────────────────────────────────┘                   │
│         │                                                   │
│         ▼                                                   │
│  ┌────────────────────────────────────┐                   │
│  │     LLM Extraction Engine          │                   │
│  │   (GPT-4o-mini Structured Output)  │                   │
│  │                                     │                   │
│  │  • Event Extraction                │                   │
│  │  • Course Extraction               │                   │
│  │  • Blog Extraction                 │                   │
│  │  • Actionable Items                │                   │
│  │  • Email Tagging                   │                   │
│  └────────────────────────────────────┘                   │
│         │                                                   │
│         ▼                                                   │
│  ┌────────────────────────────────────┐                   │
│  │      Embedding Generation          │                   │
│  │  (all-MiniLM-L6-v2 - Local/Free)   │                   │
│  └────────────────────────────────────┘                   │
│         │                                                   │
│         ▼                                                   │
│  ┌────────────────────────────────────┐                   │
│  │     Qdrant Vector Database         │                   │
│  │   (Hybrid: Dense + BM25 Sparse)    │                   │
│  │                                     │                   │
│  │  • Dense: 384-dim semantic         │                   │
│  │  • Sparse: BM25 keyword matching   │                   │
│  │  • RRF Fusion                      │                   │
│  │  • Rich Payload Storage            │                   │
│  └────────────────────────────────────┘                   │
│         │                                                   │
│         ▼                                                   │
│  ┌────────────────────────────────────┐                   │
│  │       FastAPI Backend              │                   │
│  │                                     │                   │
│  │  • POST /ingest (Gmail sync)       │                   │
│  │  • POST /search (hybrid query)     │                   │
│  │  • GET /metrics (evaluation)       │                   │
│  │  • GET /extract (manual test)      │                   │
│  └────────────────────────────────────┘                   │
│         │                                                   │
│         ▼                                                   │
│  ┌────────────────────────────────────┐                   │
│  │     HTML/CSS/JS Frontend           │                   │
│  │                                     │                   │
│  │  • Search Interface                │                   │
│  │  • Time Filters (upcoming/past)    │                   │
│  │  • Source Traceability             │                   │
│  │  • Metrics Dashboard               │                   │
│  └────────────────────────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```


### 1.3 Cost Breakdown (Under \$30 Budget)

| Service | Plan | Cost | Usage |
| :-- | :-- | :-- | :-- |
| **OpenAI GPT-4o-mini** | Pay-as-you-go | ~\$5-10 | 200 emails × 3 extractions = ~\$0.15/email |
| **Qdrant** | Local Docker | \$0 | Free, unlimited |
| **Sentence-Transformers** | Open-source | \$0 | Local CPU/GPU |
| **Gmail API** | Free tier | \$0 | Unlimited (within quotas) |
| **Total** | - | **~\$10-15** | Leaves \$15-20 buffer |

**Budget Optimization Tips:**

- Use local Qdrant Docker (not cloud) → saves \$25/month
- Batch LLM calls → reduce API costs by 30%
- Cache embeddings → avoid recomputation
- Use `temperature=0` for consistent, cost-effective extraction


### 1.4 Why This Stack?

| Component | Alternative Considered | Why This Choice |
| :-- | :-- | :-- |
| **Embeddings: all-MiniLM-L6-v2** | OpenAI text-embedding-3-small | **FREE, 384-dim, 0.5s latency, runs locally, no API costs** |
| **LLM: GPT-4o-mini** | Llama 3.2 (local) | **Best quality-to-cost (\$0.15 vs \$0.60 per 1M tokens), structured output support, 8K context** |
| **Vector DB: Qdrant (Docker)** | Qdrant Cloud, Pinecone | **Free, local, no limits, hybrid search built-in, 1GB RAM sufficient for 10K emails** |
| **Backend: FastAPI** | Flask, Django | **Async by default, auto-docs, type safety, Pydantic validation, 3x faster than Flask** |
| **Frontend: HTML/CSS/JS** | Streamlit, Gradio | **Full control, no framework lock-in, easy Spayce integration, professional UI** |


***

## 2. DAY 0: ENVIRONMENT SETUP \& GMAIL API CONFIGURATION

**Goal:** Get your development environment ready, authenticate with Gmail API, and set up project structure.

**Estimated Time:** 3-4 hours

### 2.1 System Requirements

- **OS:** macOS (your current setup)
- **Python:** 3.10+ (check with `python3 --version`)
- **RAM:** 8GB minimum (16GB recommended)
- **Storage:** 2GB free space
- **GPU:** Optional (CPU works fine for embeddings)


### 2.2 Project Structure Setup

```bash
# Create project directory
mkdir feedprism
cd feedprism

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # Activates virtual environment

# Verify activation (should show feedprism/venv/bin/python)
which python
```

**Create the following structure:**

```
feedprism/
├── venv/                      # Virtual environment (git-ignored)
├── .env                       # Environment variables (git-ignored)
├── .env.example               # Template for other developers
├── .gitignore                 # Git ignore file
├── requirements.txt           # Python dependencies
├── README.md                  # Project documentation
├── docker-compose.yml         # Docker orchestration
├── Dockerfile                 # Docker image definition
├── app/
│   ├── __init__.py
│   ├── main.py               # FastAPI application entry
│   ├── config.py             # Configuration management
│   ├── models/               # Pydantic models
│   │   ├── __init__.py
│   │   ├── email.py         # Email data models
│   │   ├── extraction.py    # Extraction schemas
│   │   └── search.py        # Search request/response
│   ├── services/             # Business logic
│   │   ├── __init__.py
│   │   ├── gmail_client.py  # Gmail API integration
│   │   ├── parser.py        # HTML email parser
│   │   ├── extractor.py     # LLM extraction pipeline
│   │   ├── embedder.py      # Embedding generation
│   │   └── search.py        # Hybrid search logic
│   ├── database/             # Vector DB integration
│   │   ├── __init__.py
│   │   └── qdrant_client.py # Qdrant operations
│   ├── utils/                # Utilities
│   │   ├── __init__.py
│   │   ├── metrics.py       # Precision@k, MRR
│   │   └── helpers.py       # Common functions
│   └── static/               # Frontend assets
│       ├── index.html
│       ├── styles.css
│       └── app.js
├── data/
│   ├── raw_emails/           # Downloaded emails (JSON)
│   ├── extracted/            # Extracted entities (JSON)
│   ├── benchmark/            # Manual labels for evaluation
│   │   └── queries.json
│   └── logs/                 # Application logs
├── notebooks/                # Jupyter notebooks for exploration
│   └── exploration.ipynb
├── tests/                    # Unit tests
│   ├── __init__.py
│   ├── test_parser.py
│   ├── test_extractor.py
│   └── test_search.py
└── scripts/                  # Utility scripts
    ├── setup_gmail.py       # Gmail OAuth helper
    ├── ingest_emails.py     # Batch email ingestion
    └── evaluate.py          # Run benchmark evaluation
```

**Create directories:**

```bash
mkdir -p app/{models,services,database,utils,static}
mkdir -p data/{raw_emails,extracted,benchmark,logs}
mkdir -p notebooks tests scripts
touch app/__init__.py app/models/__init__.py app/services/__init__.py
touch app/database/__init__.py app/utils/__init__.py tests/__init__.py
```


### 2.3 Install Python Dependencies

**Create `requirements.txt`:**

```txt
# FastAPI and server
fastapi==0.115.0
uvicorn[standard]==0.30.0
python-multipart==0.0.9
pydantic==2.9.0
pydantic-settings==2.5.0

# Gmail API
google-api-python-client==2.149.0
google-auth-httplib2==0.2.0
google-auth-oauthlib==1.2.1

# Email parsing
beautifulsoup4==4.12.3
html2text==2024.2.26
lxml==5.3.0

# OpenAI
openai==1.51.0

# Embeddings (local)
sentence-transformers==3.2.0
torch==2.5.0  # CPU version, or add torchvision/torchaudio for GPU

# Vector database
qdrant-client==1.11.3

# Utilities
python-dotenv==1.0.1
httpx==0.27.2
aiofiles==24.1.0
python-dateutil==2.9.0

# Logging and monitoring
loguru==0.7.2

# Development (optional)
pytest==8.3.3
pytest-asyncio==0.24.0
jupyter==1.1.1
ipython==8.28.0
```

**Install dependencies:**

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Expected installation time:** 5-10 minutes (downloads ~2GB for PyTorch)

### 2.4 Gmail API Setup (Critical!)

**Theory: Why OAuth 2.0?**

Gmail API uses OAuth 2.0 for security. Instead of storing your password, you get a **token** that allows limited access (read-only in our case). The flow:

1. **Create Google Cloud Project** → Container for your API credentials
2. **Enable Gmail API** → Permission to access Gmail
3. **Create OAuth Client ID** → Your app's identity
4. **Download credentials.json** → Your app's secret key
5. **Run OAuth flow** → User (you) authorizes access
6. **Get token.json** → Reusable access token (expires after 7 days, auto-refreshes)

**Step-by-Step Gmail API Configuration:**

**A. Create Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name: `FeedPrism` (or any name)
4. Click **"Create"**
5. Wait 10-15 seconds for project creation

**B. Enable Gmail API**

1. In the Cloud Console, ensure `FeedPrism` project is selected (top bar)
2. Go to **"APIs \& Services"** → **"Library"** (left sidebar)
3. Search for **"Gmail API"**
4. Click **"Gmail API"** card
5. Click **"Enable"** button
6. Wait for confirmation (green checkmark)

**C. Configure OAuth Consent Screen**

1. Go to **"APIs \& Services"** → **"OAuth consent screen"** (left sidebar)
2. Select **"External"** (allows any Gmail account)
3. Click **"Create"**
4. Fill in:
    - **App name:** `FeedPrism`
    - **User support email:** Your Gmail address
    - **Developer contact:** Your Gmail address
5. Click **"Save and Continue"**
6. **Scopes:** Click **"Add or Remove Scopes"**
    - Search for `gmail.readonly`
    - Check `https://www.googleapis.com/auth/gmail.readonly`
    - Click **"Update"**
    - Click **"Save and Continue"**
7. **Test users:** Click **"Add Users"**
    - Enter your Gmail address
    - Click **"Add"**
    - Click **"Save and Continue"**
8. Review summary, click **"Back to Dashboard"**

**D. Create OAuth Client ID Credentials**

1. Go to **"APIs \& Services"** → **"Credentials"** (left sidebar)
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Desktop app"**
4. Name: `FeedPrism Desktop Client`
5. Click **"Create"**
6. You'll see a dialog with **Client ID** and **Client Secret**
7. Click **"Download JSON"**
8. **IMPORTANT:** Rename downloaded file to `credentials.json`
9. Move `credentials.json` to your `feedprism/` project root

**Your `credentials.json` structure (DO NOT share this file!):**

```json
{
  "installed": {
    "client_id": "123456789-abcdefg.apps.googleusercontent.com",
    "project_id": "feedprism-123456",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "GOCSPX-abc123def456",
    "redirect_uris": ["http://localhost"]
  }
}
```

**E. Test Gmail Authentication**

Create `scripts/setup_gmail.py`:

```python
"""
Gmail OAuth 2.0 Authentication Helper

This script performs the OAuth flow to authenticate with Gmail API.
On first run, it opens a browser for user consent. Subsequent runs
use the cached token.json file for automatic authentication.

Theory:
- OAuth 2.0 is a delegation protocol (user authorizes app without sharing password)
- Scopes define permissions (we only request 'gmail.readonly')
- Access tokens expire (7 days), refresh tokens are long-lived
- token.json stores both access and refresh tokens

Usage:
    python scripts/setup_gmail.py
"""

import os
import sys
from pathlib import Path

# Add project root to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Define the scope for Gmail API (read-only access)
# See: https://developers.google.com/gmail/api/auth/scopes
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def authenticate_gmail():
    """
    Perform Gmail OAuth 2.0 authentication flow.
    
    Returns:
        Resource: Authenticated Gmail API service object
        
    Raises:
        FileNotFoundError: If credentials.json is missing
        HttpError: If API request fails
    """
    creds = None
    token_path = Path('token.json')
    creds_path = Path('credentials.json')
    
    # Check if credentials.json exists
    if not creds_path.exists():
        print("❌ ERROR: credentials.json not found!")
        print("Please download it from Google Cloud Console:")
        print("1. Go to https://console.cloud.google.com/")
        print("2. Navigate to 'APIs & Services' > 'Credentials'")
        print("3. Download OAuth 2.0 Client ID JSON")
        print("4. Save as 'credentials.json' in project root")
        sys.exit(1)
    
    # Load existing token if available
    if token_path.exists():
        print("📂 Loading existing token...")
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    
    # If no valid credentials available, initiate OAuth flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Refreshing expired token...")
            creds.refresh(Request())
        else:
            print("🔐 Starting OAuth flow...")
            print("A browser window will open for authentication.")
            print("Please sign in with your Gmail account and authorize access.")
            
            flow = InstalledAppFlow.from_client_secrets_file(
                str(creds_path), SCOPES
            )
            # Run local server on port 0 (random available port)
            creds = flow.run_local_server(port=0)
        
        # Save credentials for future runs
        print("💾 Saving token for future use...")
        with open(token_path, 'w') as token_file:
            token_file.write(creds.to_json())
    
    print("✅ Authentication successful!")
    return creds

def test_gmail_connection(creds):
    """
    Test Gmail API connection by fetching labels.
    
    Args:
        creds: Authenticated credentials
        
    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        # Build Gmail API service
        service = build('gmail', 'v1', credentials=creds)
        
        # Test API call: fetch user's labels
        print("\n📧 Testing Gmail API connection...")
        results = service.users().labels().list(userId='me').execute()
        labels = results.get('labels', [])
        
        if not labels:
            print("⚠️  No labels found (unusual but not an error)")
            return True
        
        print(f"✅ Found {len(labels)} Gmail labels:")
        for label in labels[:5]:  # Show first 5 labels
            print(f"   - {label['name']}")
        
        if len(labels) > 5:
            print(f"   ... and {len(labels) - 5} more")
        
        return True
        
    except HttpError as error:
        print(f"❌ API Error: {error}")
        return False

def main():
    """Main execution function."""
    print("=" * 60)
    print("FeedPrism Gmail API Setup")
    print("=" * 60)
    
    # Authenticate
    creds = authenticate_gmail()
    
    # Test connection
    if test_gmail_connection(creds):
        print("\n✨ Setup complete! You can now use Gmail API.")
        print(f"📁 Token saved to: {Path('token.json').absolute()}")
    else:
        print("\n❌ Setup failed. Please check your credentials.")
        sys.exit(1)

if __name__ == '__main__':
    main()
```

**Run the authentication script:**

```bash
python scripts/setup_gmail.py
```

**Expected flow:**

1. Script opens browser → Google sign-in page
2. Select your Gmail account
3. See warning: "Google hasn't verified this app" (normal for test apps)
4. Click **"Advanced"** → **"Go to FeedPrism (unsafe)"** (it's your own app, so safe!)
5. Review permissions → Click **"Allow"**
6. Browser shows "The authentication flow has completed"
7. Terminal shows:

```
✅ Authentication successful!
📧 Testing Gmail API connection...
✅ Found 15 Gmail labels:
   - INBOX
   - SENT
   - DRAFT
   ... and 12 more
✨ Setup complete! You can now use Gmail API.
```


**Troubleshooting:**


| Error | Solution |
| :-- | :-- |
| `credentials.json not found` | Download from Google Cloud Console, rename correctly |
| `Redirect URI mismatch` | Ensure OAuth Client type is **"Desktop app"** (not Web) |
| `Access blocked: Authorization Error` | Add your Gmail to **Test users** in OAuth consent screen |
| `Invalid grant` | Delete `token.json`, run script again to re-authenticate |

### 2.5 Environment Variables Setup

**Create `.env` file (store secrets here, NEVER commit to git):**

```bash
# OpenAI API Key (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-abc123def456...

# Gmail credentials paths
GMAIL_CREDENTIALS_PATH=credentials.json
GMAIL_TOKEN_PATH=token.json

# Qdrant configuration
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION_NAME=feedprism_emails

# Embedding model
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# LLM configuration
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.0
LLM_MAX_TOKENS=2000

# Application settings
LOG_LEVEL=INFO
DATA_DIR=data
```

**Create `.env.example` (template for other developers):**

```bash
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Gmail credentials
GMAIL_CREDENTIALS_PATH=credentials.json
GMAIL_TOKEN_PATH=token.json

# Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION_NAME=feedprism_emails

# Models
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.0
LLM_MAX_TOKENS=2000

# App
LOG_LEVEL=INFO
DATA_DIR=data
```

**Create `.gitignore`:**

```
# Python
venv/
__pycache__/
*.py[cod]
*$py.class
*.so
.Python

# Environment
.env
credentials.json
token.json

# Data
data/raw_emails/
data/extracted/
data/logs/
*.log

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Jupyter
.ipynb_checkpoints/
```


### 2.6 Configuration Management

**Create `app/config.py`:**

```python
"""
Configuration management using Pydantic Settings.

This module loads environment variables and provides type-safe access
to configuration values throughout the application.

Theory:
- Pydantic validates types at load time (catches config errors early)
- Settings can be overridden by environment variables
- Secrets are loaded from .env file (never hardcoded)
- Config is immutable (frozen=True prevents accidental changes)

Usage:
    from app.config import settings
    api_key = settings.openai_api_key
"""

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Attributes:
        openai_api_key: OpenAI API key for LLM access
        gmail_credentials_path: Path to Gmail OAuth credentials
        gmail_token_path: Path to cached Gmail token
        qdrant_host: Qdrant server hostname
        qdrant_port: Qdrant server port
        qdrant_collection_name: Collection name for emails
        embedding_model_name: Sentence-transformers model ID
        embedding_dimension: Embedding vector dimension
        llm_model: OpenAI model name
        llm_temperature: LLM temperature (0 = deterministic)
        llm_max_tokens: Maximum tokens per LLM response
        log_level: Logging verbosity
        data_dir: Directory for data storage
    """
    
    # OpenAI
    openai_api_key: str = Field(..., description="OpenAI API key")
    
    # Gmail
    gmail_credentials_path: Path = Field(
        default=Path("credentials.json"),
        description="Path to Gmail OAuth credentials"
    )
    gmail_token_path: Path = Field(
        default=Path("token.json"),
        description="Path to Gmail OAuth token"
    )
    
    # Qdrant
    qdrant_host: str = Field(default="localhost", description="Qdrant host")
    qdrant_port: int = Field(default=6333, description="Qdrant port")
    qdrant_collection_name: str = Field(
        default="feedprism_emails",
        description="Qdrant collection name"
    )
    
    # Embeddings
    embedding_model_name: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        description="Sentence-transformers model"
    )
    embedding_dimension: int = Field(
        default=384,
        description="Embedding vector dimension"
    )
    
    # LLM
    llm_model: str = Field(default="gpt-4o-mini", description="OpenAI model")
    llm_temperature: float = Field(
        default=0.0,
        ge=0.0,
        le=2.0,
        description="LLM temperature"
    )
    llm_max_tokens: int = Field(
        default=2000,
        gt=0,
        description="Max tokens per response"
    )
    
    # Application
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO",
        description="Logging level"
    )
    data_dir: Path = Field(default=Path("data"), description="Data directory")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        frozen=True  # Immutable configuration
    )


# Create global settings instance
settings = Settings()

# Validate paths on load
if not settings.gmail_credentials_path.exists():
    raise FileNotFoundError(
        f"Gmail credentials not found: {settings.gmail_credentials_path}"
    )

# Create data directories
settings.data_dir.mkdir(exist_ok=True)
(settings.data_dir / "raw_emails").mkdir(exist_ok=True)
(settings.data_dir / "extracted").mkdir(exist_ok=True)
(settings.data_dir / "benchmark").mkdir(exist_ok=True)
(settings.data_dir / "logs").mkdir(exist_ok=True)
```


### 2.7 Start Qdrant Docker Container

**Pull and run Qdrant:**

```bash
# Pull latest Qdrant image
docker pull qdrant/qdrant:latest

# Run Qdrant container (detached mode)
docker run -d \
  --name feedprism-qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/data/qdrant_storage:/qdrant/storage \
  qdrant/qdrant:latest
```

**Verify Qdrant is running:**

```bash
# Check container status
docker ps | grep feedprism-qdrant

# Test Qdrant API (should return version info)
curl http://localhost:6333/

# Expected output:
# {"title":"qdrant - vector search engine","version":"1.11.3"}
```

**Access Qdrant Web UI:**

Open browser → `http://localhost:6333/dashboard`

You should see the Qdrant dashboard (empty for now).

### 2.8 Verify Complete Setup

**Create `scripts/verify_setup.py`:**

```python
"""Verify all components are configured correctly."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
import openai

def check_env_vars():
    """Check critical environment variables."""
    print("🔍 Checking environment variables...")
    try:
        assert settings.openai_api_key.startswith('sk-'), "Invalid OpenAI API key"
        print("  ✅ OpenAI API key configured")
        
        assert settings.gmail_credentials_path.exists(), "credentials.json missing"
        print("  ✅ Gmail credentials found")
        
        assert settings.gmail_token_path.exists(), "token.json missing (run setup_gmail.py)"
        print("  ✅ Gmail token found")
        
        return True
    except AssertionError as e:
        print(f"  ❌ {e}")
        return False

def check_qdrant():
    """Check Qdrant connection."""
    print("\n🔍 Checking Qdrant connection...")
    try:
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        collections = client.get_collections()
        print(f"  ✅ Qdrant connected ({len(collections.collections)} collections)")
        return True
    except Exception as e:
        print(f"  ❌ Qdrant error: {e}")
        print("     Run: docker run -d -p 6333:6333 qdrant/qdrant")
        return False

def check_embedding_model():
    """Check embedding model download."""
    print("\n🔍 Checking embedding model...")
    try:
        model = SentenceTransformer(settings.embedding_model_name)
        test_embedding = model.encode("test")
        assert len(test_embedding) == settings.embedding_dimension
        print(f"  ✅ Embedding model loaded ({settings.embedding_dimension}d)")
        return True
    except Exception as e:
        print(f"  ❌ Embedding model error: {e}")
        return False

def check_openai():
    """Check OpenAI API access."""
    print("\n🔍 Checking OpenAI API...")
    try:
        client = openai.OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=5
        )
        print(f"  ✅ OpenAI API accessible (model: {response.model})")
        return True
    except Exception as e:
        print(f"  ❌ OpenAI error: {e}")
        return False

def main():
    print("=" * 60)
    print("FeedPrism Setup Verification")
    print("=" * 60)
    
    results = [
        check_env_vars(),
        check_qdrant(),
        check_embedding_model(),
        check_openai()
    ]
    
    print("\n" + "=" * 60)
    if all(results):
        print("✨ All checks passed! Ready to build.")
    else:
        print("❌ Some checks failed. Fix issues above.")
        sys.exit(1)

if __name__ == '__main__':
    main()
```

**Run verification:**

```bash
python scripts/verify_setup.py
```

**Expected output:**

```
============================================================
FeedPrism Setup Verification
============================================================
🔍 Checking environment variables...
  ✅ OpenAI API key configured
  ✅ Gmail credentials found
  ✅ Gmail token found

🔍 Checking Qdrant connection...
  ✅ Qdrant connected (0 collections)

🔍 Checking embedding model...
  ✅ Embedding model loaded (384d)

🔍 Checking OpenAI API...
  ✅ OpenAI API accessible (model: gpt-4o-mini)

============================================================
✨ All checks passed! Ready to build.
```


***

**🎉 DAY 0 COMPLETE!**

You now have:

- ✅ Python environment with all dependencies
- ✅ Gmail API authenticated (token.json cached)
- ✅ Qdrant vector database running
- ✅ Project structure ready
- ✅ Configuration management system
- ✅ All services verified and working

**Next:** Day 1 - Build the email ingestion pipeline.(Email Ingestion \& HTML Parsing Pipeline) with full theory, code, and explanations.

***

<span style="display:none">[^1][^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^2][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^3][^30][^31][^32][^33][^34][^35][^36][^37][^38][^39][^4][^40][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://thepythoncode.com/article/use-gmail-api-in-python

[^2]: https://github.com/zhanymkanov/fastapi-best-practices

[^3]: https://community.latenode.com/t/ways-to-speed-up-azure-openai-gpt-4o-mini-custom-model-for-json-output-generation/28091

[^4]: https://developers.google.com/workspace/gmail/api/quickstart/python

[^5]: https://webandcrafts.com/blog/fastapi-scalable-microservices

[^6]: https://stackoverflow.com/questions/78847255/issue-with-json-extraction-gpt-3-5-turbo-vs-gpt-4-o-mini-module

[^7]: https://github.com/knr83/gmail-reader-quickstart

[^8]: https://www.youtube.com/watch?v=kmJz8w5ij8Y

[^9]: https://news.ycombinator.com/item?id=41173223

[^10]: https://www.youtube.com/watch?v=rVNA4lJu0kQ

[^11]: https://qdrant.tech/course/essentials/day-3/hybrid-search-demo/

[^12]: https://dataloop.ai/library/model/sentence-transformers_all-minilm-l6-v2/

[^13]: https://community.latenode.com/t/converting-gmail-html-emails-to-plain-text-using-python-and-imap4-ssl/13561

[^14]: https://qdrant.tech/documentation/tutorials-and-examples/cloud-inference-hybrid-search/

[^15]: https://milvus.io/ai-quick-reference/how-can-i-use-a-sentence-transformer-for-semantic-search-in-an-application-for-instance-indexing-documents-and-querying-them-by-similarity

[^16]: https://www.peterbe.com/plog/html2plaintext

[^17]: https://qdrant.tech/articles/bm42/

[^18]: https://www.atlantis-press.com/article/126004096.pdf

[^19]: http://beckerfuffle.com/blog/2013/02/14/working-with-email-content

[^20]: https://qdrant.tech/articles/hybrid-search/

[^21]: https://sparkco.ai/blog/deep-dive-into-retrieval-evaluation-metrics-2025

[^22]: https://oluwadamilolaadegunwa.wordpress.com/2025/06/19/project-title-using-pydantic-and-gpt-4o-for-structured-calendar-event-extraction-in-python-exercise-107/

[^23]: https://parsio.io

[^24]: https://www.pinecone.io/learn/offline-evaluation/

[^25]: http://blog.pamelafox.org/2024/11/entity-extraction-using-openai.html

[^26]: https://www.infrrd.ai/blog/automated-email-data-extraction

[^27]: https://github.com/plurch/ir_evaluation

[^28]: https://platform.openai.com/docs/guides/structured-outputs

[^29]: https://mailparser.io

[^30]: https://weaviate.io/blog/retrieval-evaluation-metrics

[^31]: https://seenode.com/blog/deploy-fastapi-docker-and-uvicorn/

[^32]: https://towardsdatascience.com/extracting-structured-data-with-langextract-a-deep-dive-into-llm-orchestrated-workflows/

[^33]: https://qdrant.tech/blog/comparing-qdrant-vs-pinecone-vector-databases/

[^34]: https://fastapi.tiangolo.com/deployment/docker/

[^35]: https://nanonets.com/blog/table-extraction-using-llms-unlocking-structured-data-from-documents/

[^36]: https://qdrant.tech/pricing/

[^37]: https://www.zestminds.com/blog/fastapi-requirements-setup-guide-2025/

[^38]: https://www.reddit.com/r/PromptEngineering/comments/1jn9f1a/extracting_structured_data_from_long_text/

[^39]: https://www.reddit.com/r/RooCode/comments/1o8nbur/local_vs_cloud_qdrant_index_storage/

[^40]: https://betterstack.com/community/guides/scaling-python/fastapi-docker-best-practices/

