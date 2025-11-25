# Phase 0: Foundation - Complete Setup Guide

**Goal:** Set up development environment, authenticate Gmail API, configure Qdrant, and establish project structure.

**Estimated Time:** 3-4 hours

**Prerequisites:** Python 3.10+, Docker installed, Gmail account

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Project Structure Setup](#2-project-structure-setup)
3. [Python Environment](#3-python-environment)
4. [Gmail API Setup](#4-gmail-api-setup)
5. [Qdrant Docker Setup](#5-qdrant-docker-setup)
6. [Configuration Management](#6-configuration-management)
7. [Verification Checklist](#7-verification-checklist)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. System Requirements

### 1.1 Verify Your System

```bash
# Check Python version (need 3.10+)
python3 --version
# Should show: Python 3.10.x or higher

# Check Docker installation
docker --version
# Should show: Docker version 20.x.x or higher

# Check available disk space (need ~5GB)
df -h
# Should show at least 5GB free on your main drive

# Check RAM
sysctl hw.memsize
# Should show at least 8GB (8589934592 bytes)
```

**Minimum Requirements:**
- **OS:** macOS 10.15+ (Catalina or later)
- **Python:** 3.10 or higher
- **RAM:** 8GB (16GB recommended)
- **Storage:** 5GB free space
- **Docker:** 20.10+ with Docker Desktop running
- **Internet:** Broadband connection for API calls

### 1.2 Install Missing Tools

**If Python 3.10+ is missing:**
```bash
# Install using Homebrew
brew install python@3.11

# Verify installation
python3.11 --version
```

**If Docker is missing:**
```bash
# Install Docker Desktop from official site
open https://www.docker.com/products/docker-desktop

# Or use Homebrew
brew install --cask docker

# Launch Docker Desktop
open -a Docker

# Wait for Docker to start (Docker icon in menu bar should show "running")
```

---

## 2. Project Structure Setup

### 2.1 Create Project Directory

```bash
# Navigate to hackathon workspace
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack

# Create main implementation directory
mkdir -p feedprism_main

# Navigate into it
cd feedprism_main

# Note: Git repository already exists at parent level (mom_hack/)
# We'll create .gitignore for feedprism_main specific files

# Create .gitignore (critical!)
cat > .gitignore << 'EOF'
# Python
venv/
.venv/
__pycache__/
*.py[cod]
*$py.class
*.so
.Python

# Environment files (NEVER commit these!)
.env
credentials.json
token.json

# Data directories
data/raw_emails/
data/extracted/
data/logs/
data/qdrant_storage/
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
EOF

echo "✅ Created .gitignore"
```

### 2.2 Create Directory Structure

```bash
# Create all directories at once
mkdir -p \
  app/{models,services,database,utils,static} \
  data/{raw_emails,extracted,benchmark,logs,qdrant_storage} \
  tests \
  scripts \
  docs

# Create __init__.py files for Python modules
touch app/__init__.py
touch app/models/__init__.py
touch app/services/__init__.py
touch app/database/__init__.py
touch app/utils/__init__.py
touch tests/__init__.py

# Verify structure
tree -L 2 -I '__pycache__|*.pyc'
```

**Expected Structure:**
```
feedprism_main/
├── app/
│   ├── __init__.py
│   ├── models/
│   ├── services/
│   ├── database/
│   ├── utils/
│   └── static/
├── data/
│   ├── raw_emails/
│   ├── extracted/
│   ├── benchmark/
│   ├── logs/
│   └── qdrant_storage/
├── tests/
├── scripts/
├── docs/
└── .gitignore
```

### 2.3 Git Status Check

```bash
# Check current git status (repo already exists at mom_hack level)
git status

# You should see feedprism_main/ as a new directory
# All files inside will be tracked

# Stage feedprism_main files
git add feedprism_main/

# Check what will be committed
git status

echo "✅ Files staged for commit (will commit at Phase 0 completion)"
```

---

## 3. Python Environment

### 3.1 Create Virtual Environment

```bash
# Navigate to project root
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack

# Create virtual environment (if not exists)
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# You should see (.venv) in your terminal prompt
# Example: (.venv) user@macbook feedprism_main %

# Verify Python path points to venv
which python
# Should show: /Users/Shared/ALL WORKSPACE/Hackathons/mom_hack/.venv/bin/python
```

**Activation Command Reference:**
```bash
# macOS/Linux:
source .venv/bin/activate

# Windows (if needed):
.venv\Scripts\activate

# Deactivate (when done):
deactivate
```

### 3.2 Install Dependencies

**Create `requirements.txt`:**

```bash
cd feedprism_main

cat > requirements.txt << 'EOF'
# ============================================================================
# FeedPrism Dependencies
# Python 3.10+ required
# ============================================================================

# FastAPI and Web Server
# ----------------------
fastapi==0.115.0                    # Modern async web framework
uvicorn[standard]==0.30.0           # ASGI server
python-multipart==0.0.9             # Form data parsing
pydantic==2.9.0                     # Data validation
pydantic-settings==2.5.0            # Settings management

# Gmail API Integration
# ---------------------
google-api-python-client==2.149.0   # Google API client
google-auth-httplib2==0.2.0         # OAuth HTTP adapter
google-auth-oauthlib==1.2.1         # OAuth flow

# HTML Email Parsing
# ------------------
beautifulsoup4==4.12.3              # HTML parsing
html2text==2024.2.26                # HTML to markdown conversion
lxml==5.3.0                         # Fast XML/HTML parser

# OpenAI LLM Integration
# ----------------------
openai==1.51.0                      # OpenAI API client (GPT-4o-mini)

# Embedding Generation (Local)
# ----------------------------
sentence-transformers==3.2.0        # Sentence embeddings
torch==2.5.0                        # PyTorch (CPU version)
# Note: For GPU support, install: torch torchvision torchaudio

# Vector Database
# ---------------
qdrant-client==1.11.3               # Qdrant Python client

# Utility Libraries
# -----------------
python-dotenv==1.0.1                # Environment variable management
httpx==0.27.2                       # Async HTTP client
aiofiles==24.1.0                    # Async file I/O
python-dateutil==2.9.0              # Date parsing utilities

# Logging and Monitoring
# ----------------------
loguru==0.7.2                       # Beautiful logging

# Development Tools (Optional but Recommended)
# --------------------------------------------
pytest==8.3.3                       # Testing framework
pytest-asyncio==0.24.0              # Async test support
ipython==8.28.0                     # Enhanced Python shell
jupyter==1.1.1                      # Jupyter notebooks
black==24.10.0                      # Code formatter
ruff==0.7.4                         # Fast linter

# Additional Libraries for Phase 4-5
# ----------------------------------
tenacity==9.0.0                     # Retry logic
numpy==2.1.0                        # Numerical operations
pandas==2.2.0                       # Data analysis (for benchmarking)
EOF

echo "✅ Created requirements.txt"
```

**Install all dependencies:**

```bash
# Upgrade pip first
pip install --upgrade pip

# Install all requirements
pip install -r requirements.txt

# This will take 5-10 minutes (downloads ~2GB for PyTorch)
# You'll see progress bars for each package

# Verify installations
python -c "import fastapi, openai, qdrant_client, sentence_transformers; print('✅ All critical imports successful')"
```

**Expected Output:**
```
✅ All critical imports successful
```

### 3.3 Verify Sentence Transformers Model

```bash
# Test loading the embedding model
python << 'EOF'
from sentence_transformers import SentenceTransformer
import time

print("Loading embedding model...")
start = time.time()

# This downloads the model (~80MB) on first run
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

end = time.time()
print(f"✅ Model loaded in {end-start:.2f} seconds")

# Test embedding
test_vec = model.encode("Test sentence")
print(f"✅ Generated embedding: dimension={len(test_vec)}")

# Should output: dimension=384
EOF
```

**First Run:** Downloads model (~80MB), takes ~30 seconds  
**Subsequent Runs:** Loads from cache, takes ~2 seconds

---

## 4. Gmail API Setup

### 4.1 Understanding OAuth 2.0 (Theory)

**What is OAuth 2.0?**

OAuth 2.0 is a delegation protocol that allows applications to access user data without requiring passwords.

**How it works:**
```
┌──────────┐                                           ┌──────────┐
│  User    │                                           │  Gmail   │
│ (You)    │                                           │  Server  │
└────┬─────┘                                           └────┬─────┘
     │                                                      │
     │  1. Start OAuth Flow                                │
     ├─────────────────────────────────────────────────────▶
     │                                                      │
     │  2. Sign in with Google                             │
     │  3. Grant permissions                               │
     │                                                      │
     │  4. Authorization Code                              │
     ◀─────────────────────────────────────────────────────┤
     │                                                      │
┌────▼─────┐                                           ┌───▼──────┐
│  OAuth   │  5. Exchange code for tokens              │  Token   │
│  Client  ├──────────────────────────────────────────▶  Server  │
└────┬─────┘                                           └────┬─────┘
     │                                                      │
     │  6. Access Token + Refresh Token                    │
     ◀──────────────────────────────────────────────────────
     │                                                      │
     │  7. Use Access Token to read emails                 │
     ├─────────────────────────────────────────────────────▶
     │                                                      │
     │  8. Email data                                      │
     ◀─────────────────────────────────────────────────────┤
     │                                                      │
```

**Key Concepts:**
- **Client ID & Secret:** Your app's identity (from Google Cloud Console)
- **Scopes:** Permissions requested (we only need `gmail.readonly`)
- **Access Token:** Short-lived token (~1 hour) for API access
- **Refresh Token:** Long-lived token to get new access tokens
- **token.json:** Stores both tokens (NEVER commit to git!)

### 4.2 Create Google Cloud Project

**Step-by-Step:**

1. **Open Google Cloud Console:**
   ```bash
   open https://console.cloud.google.com/
   ```

2. **Create New Project:**
   - Click "Select a project" dropdown (top bar)
   - Click "New Project"
   - **Project Name:** `FeedPrism`
   - **Organization:** Leave as default  
   - **Location:** Leave as default
   - Click "**CREATE**"
   - Wait ~10 seconds for project creation

3. **Verify Project Selected:**
   - Top bar should show "FeedPrism" as active project
   - If not, click dropdown and select it

### 4.3 Enable Gmail API

1. **Navigate to API Library:**
   ```bash
   # Or click: APIs & Services > Library (left sidebar)
   open https://console.cloud.google.com/apis/library
   ```

2. **Search and Enable:**
   - Search bar: type "**Gmail API**"
   - Click "**Gmail API**" card
   - Click "**ENABLE**" button
   - Wait for green checkmark (~5 seconds)
   - You'll see "API enabled" banner

### 4.4 Configure OAuth Consent Screen

This tells users what your app does when they authorize access.

1. **Navigate to OAuth Consent:**
   ```bash
   open https://console.cloud.google.com/apis/credentials/consent
   ```

2. **Select User Type:**
   - Choose "**External**" (allows any Gmail account)
   - Click "**CREATE**"

3. **App Information:**
   - **App name:** `FeedPrism`
   - **User support email:** Your Gmail address 
   - **Developer contact:** Your Gmail address
   - Leave other fields blank
   - Click "**SAVE AND CONTINUE**"

4. **Scopes:**
   - Click "**ADD OR REMOVE SCOPES**"
   - In search box, type: `gmail.readonly`
   - Check the box for: `https://www.googleapis.com/auth/gmail readonly`
   - Click "**UPDATE**"
   - Click "**SAVE AND CONTINUE**"

5. **Test Users:**
   - Click "**ADD USERS**"
   - Enter your Gmail address
   - Click "**ADD**"
   - Click "**SAVE AND CONTINUE**"

6. **Summary:**
   - Review settings
   - Click "**BACK TO DASHBOARD**"

### 4.5 Create OAuth Credentials

1. **Navigate to Credentials:**
   ```bash
   open https://console.cloud.google.com/apis/credentials
   ```

2. **Create OAuth Client ID:**
   - Click "**+ CREATE CREDENTIALS**" (top)
   - Select "**OAuth client ID**"
   - **Application type:** Desktop app
   - **Name:** `FeedPrism Desktop Client`
   - Click "**CREATE**"

3. **Download Credentials:**
   - Dialog shows Client ID and Secret
   - Click "**DOWNLOAD JSON**"
   - File downloads as: `client_secret_XXXXX.json`
   - **IMPORTANT:** Rename to `credentials.json`

4. **Move Credentials to Project:**
   ```bash
   # Move downloaded file to project root
   mv ~/Downloads/client_secret_*.json /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/project_ops/gmail_token_generation/credentials.json
   
   #Create symlink in feedprism_main for easy access
   cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main
   ln -s ../project_ops/gmail_token_generation/credentials.json credentials.json
   
   echo "✅ Credentials file ready"
   ```

**Your `credentials.json` structure (DO NOT SHARE):**
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

### 4.6 Generate OAuth Token

**Create authentication script:**

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

cat > scripts/setup_gmail.py << 'EOF'
#!/usr/bin/env python3
"""
Gmail OAuth 2.0 Authentication Script

This script performs the OAuth flow to generate token.json for Gmail API access.
Run this ONCE to authenticate, then token.json will be reused automatically.

Usage:
    python scripts/setup_gmail.py
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Gmail readonly scope (cannot send/delete emails)
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def main():
    """Authenticate with Gmail API."""
    print("=" * 60)
    print("FeedPrism - Gmail API Authentication")
    print("=" * 60)
    
    # Paths
    creds_path = Path('credentials.json')
    token_path = Path('token.json')
    
    # Check credentials.json exists
    if not creds_path.exists():
        print("\n❌ ERROR: credentials.json not found!")
        print("Please download it from Google Cloud Console:")
        print("1. Go to https://console.cloud.google.com/apis/credentials")
        print("2. Download OAuth 2.0 Client ID JSON")
        print("3. Save as 'credentials.json' in project root")
        sys.exit(1)
    
    creds = None
    
    # Load existing token if available
    if token_path.exists():
        print("\n📂 Loading existing token...")
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    
    # If no valid credentials, start OAuth flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("\n🔄 Refreshing expired token...")
            creds.refresh(Request())
        else:
            print("\n🔐 Starting OAuth flow...")
            print("A browser window will open for authentication.")
            print("Please sign in with your Gmail account.")
            
            flow = InstalledAppFlow.from_client_secrets_file(
                str(creds_path), SCOPES
            )
            # Run local server on random port
            creds = flow.run_local_server(port=0)
        
        # Save credentials for future use
        print("\n💾 Saving token for future use...")
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    
    print("\n✅ Authentication successful!")
    
    # Test Gmail connection
    print("\n📧 Testing Gmail API connection...")
    try:
        service = build('gmail', 'v1', credentials=creds)
        
        # Fetch labels as connection test
        results = service.users().labels().list(userId='me').execute()
        labels = results.get('labels', [])
        
        if not labels:
            print("⚠️  No labels found (unusual but not an error)")
        else:
            print(f"\n✅ Successfully connected to Gmail!")
            print(f"Found {len(labels)} labels:")
            for label in labels[:5]:
                print(f"   - {label['name']}")
            if len(labels) > 5:
                print(f"   ... and {len(labels) - 5} more")
        
        print(f"\n✨ Setup complete!")
        print(f"📁 Token saved to: {token_path.absolute()}")
        print(f"\nYou can now use Gmail API in your application.")
        
    except HttpError as error:
        print(f"\n❌ Gmail API Error: {error}")
        sys.exit(1)

if __name__ == '__main__':
    main()
EOF

chmod +x scripts/setup_gmail.py
```

**Run authentication:**

```bash
python scripts/setup_gmail.py
```

**Expected Flow:**

1. **Browser Opens:** Google sign-in page
2. **Select Account:** Choose your Gmail account
3. **Warning Screen:** "Google hasn't verified this app"
   - Click "**Advanced**"
   - Click "**Go to FeedPrism (unsafe)**" (it's YOUR app, so it's safe!)
4. **Grant Permissions:**
   - Review: "FeedPrism wants to read your Gmail messages"
   - Click "**Allow**"
5. **Success:** Browser shows "The authentication flow has completed"
6. **Terminal Output:**
   ```
   ✅ Authentication successful!
   📧 Testing Gmail API connection...
   ✅ Successfully connected to Gmail!
   Found 15 labels:
      - INBOX
      - SENT
      - DRAFT
      ... and 12 more
   ✨ Setup complete!
   📁 Token saved to: /path/to/token.json
   ```

**Verification:**
```bash
# Check token.json exists
ls -lh token.json
# Should show: -rw-r--r--  1 user  staff   735B Nov 25 14:00 token.json

# NEVER commit this file!
git status
# token.json should NOT appear (because it's in .gitignore)
```

---

## 5. Qdrant Docker Setup

### 5.1 Understanding Qdrant (Theory)

**What is Qdrant?**

Qdrant is a vector database optimized for similarity search and vector embeddings.

**Key Concepts:**
- **Collection:** Namespace for vectors (like a table in SQL)
- **Point:** Single vector + payload (metadata)
- **Vector:** Dense array of floats (e.g., 384 dimensions)
- **Payload:** JSON metadata attached to vector
- **HNSW:** Hierarchical Navigable Small World graph (fast search algorithm)
- **Distance Metric:** How to measure similarity (Cosine, Euclidean, Dot Product)

**Why Qdrant for FeedPrism?**
1. **Hybrid Search:** Built-in sparse + dense vector support
2. **Payload Filtering:** Pre-filter before vector search (fast!)
3. **Grouping API:** Native deduplication
4. **Discovery API:** Recommendation engine
5. **Scroll API:** Efficient batch retrieval
6. **Free & Local:** No cloud costs, full control

### 5.2 Pull Qdrant Docker Image

```bash
# Pull latest Qdrant image (~150MB)
docker pull qdrant/qdrant:latest

# Verify image
docker images | grep qdrant
# Should show: qdrant/qdrant   latest   ...   150MB
```

### 5.3 Run Qdrant Container

```bash
# Create persistent storage directory
mkdir -p /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main/data/qdrant_storage

# Run Qdrant in detached mode
docker run -d \
  --name feedprism-qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v "$(pwd)/data/qdrant_storage:/qdrant/storage" \
  qdrant/qdrant:latest

# Check container status
docker ps | grep qdrant
# Should show RUNNING status
```

**Port Explanation:**
- **6333:** REST API port (we'll use this)
- **6334:** gRPC port (for high-performance clients)

**Storage Explanation:**
- `-v "$(pwd)/data/qdrant_storage:/qdrant/storage"` creates a volume
- Data persists even if container is stopped/removed
- Located in your project at: `feedprism_main/data/qdrant_storage/`

### 5.4 Verify Qdrant Running

**Test 1: Health Check**
```bash
curl http://localhost:6333/collections

# Expected output:
# {"result":{"collections":[]},"status":"ok","time":0.000...}
```

**Test 2: Python Client**
```bash
python << 'EOF'
from qdrant_client import QdrantClient

# Connect to local Qdrant
client = QdrantClient(host="localhost", port=6333)

# Get collections (should be empty initially)
collections = client.get_collections()
print(f"✅ Qdrant connection successful!")
print(f"Collections: {collections.collections}")
print(f"Status: Connected to Qdrant at localhost:6333")
EOF
```

**Expected Output:**
```
✅ Qdrant connection successful!
Collections: []
Status: Connected to Qdrant at localhost:6333
```

### 5.5 Qdrant Web UI (Optional)

Qdrant provides a built-in web dashboard for visualization.

```bash
# Open Qdrant dashboard in browser
open http://localhost:6333/dashboard

# You'll see:
# - Collections list (empty for now)
# - Cluster info
# - Metrics
```

**Useful for:**
- Visualizing collections and points
- Debugging search queries
- Monitoring performance metrics

---

## 6. Configuration Management

### 6.1 Create Environment Variables File

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

cat > .env << 'EOF'
# ============================================================================
# FeedPrism Environment Configuration
# CRITICAL: NEVER commit this file to git!
# ============================================================================

# OpenAI API Key (get from: https://platform.openai.com/api-keys)
OPENAI_API_KEY=your_openai_api_key_here

# Gmail API Paths (relative to project root)
GMAIL_CREDENTIALS_PATH=credentials.json
GMAIL_TOKEN_PATH=token.json

# Qdrant Configuration
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION_NAME=feedprism_emails

# Embedding Model
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# LLM Configuration
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.0
LLM_MAX_TOKENS=2000

# Application Settings
LOG_LEVEL=INFO
DATA_DIR=data
EOF

echo "✅ Created .env file"
```

**Add your OpenAI API key:**

```bash
# Get your API key from: https://platform.openai.com/api-keys
# Then edit .env:
nano .env

# Replace:
# OPENAI_API_KEY=your_openai_api_key_here
# With:
# OPENAI_API_KEY=sk-proj-abc123...

# Save: Ctrl+O, Enter, Ctrl+X
```

**Create `.env.example` template:**

```bash
cat > .env.example << 'EOF'
# FeedPrism Environment Configuration Template
# Copy this file to .env and fill in your values

OPENAI_API_KEY=your_openai_api_key_here
GMAIL_CREDENTIALS_PATH=credentials.json
GMAIL_TOKEN_PATH=token.json
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION_NAME=feedprism_emails
EMBEDDING_MODEL_NAME=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.0
LLM_MAX_TOKENS=2000
LOG_LEVEL=INFO
DATA_DIR=data
EOF
```

### 6.2 Create Configuration Module

```bash
cat > app/config.py << 'EOF'
"""
Application Configuration Management

This module loads environment variables and provides type-safe access
to configuration values throughout the application.

Using Pydantic Settings for:
- Type validation (catches config errors at startup)
- Environment variable loading (.env file)
- Default values
- Immutability (frozen=True)

Usage:
    from app.config import settings
    api_key = settings.openai_api_key
"""

from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All settings are loaded from .env file or environment variables.
    Settings are immutable (frozen) to prevent accidental modification.
    
    Attributes:
        openai_api_key: OpenAI API key for LLM access
        gmail_credentials_path: Path to Gmail OAuth credentials
        gmail_token_path: Path to cached Gmail token
        qdrant_host: Qdrant server hostname
        qdrant_port: Qdrant server port
        qdrant_collection_name: Default collection name
        embedding_model_name: Sentence transformers model ID
        embedding_dimension: Embedding vector dimension
        llm_model: OpenAI model name
        llm_temperature: LLM temperature (0 = deterministic)
        llm_max_tokens: Maximum tokens per LLM response
        log_level: Logging verbosity level
        data_dir: Root directory for data storage
    """
    
    # OpenAI Configuration
    openai_api_key: str = Field(
        ...,
        description="OpenAI API key (required)",
        min_length=20
    )
    
    # Gmail Configuration
    gmail_credentials_path: Path = Field(
        default=Path("credentials.json"),
        description="Path to Gmail OAuth credentials file"
    )
    gmail_token_path: Path = Field(
        default=Path("token.json"),
        description="Path to Gmail OAuth token file"
    )
    
    # Qdrant Configuration
    qdrant_host: str = Field(
        default="localhost",
        description="Qdrant server hostname"
    )
    qdrant_port: int = Field(
        default=6333,
        ge=1,
        le=65535,
        description="Qdrant server port"
    )
    qdrant_collection_name: str = Field(
        default="feedprism_emails",
        description="Default Qdrant collection name"
    )
    
    # Embedding Configuration
    embedding_model_name: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        description="Sentence transformers model identifier"
    )
    embedding_dimension: int = Field(
        default=384,
        gt=0,
        description="Embedding vector dimension"
    )
    
    # LLM Configuration
    llm_model: str = Field(
        default="gpt-4o-mini",
        description="OpenAI model name"
    )
    llm_temperature: float = Field(
        default=0.0,
        ge=0.0,
        le=2.0,
        description="LLM temperature (0 = deterministic, 2 = very random)"
    )
    llm_max_tokens: int = Field(
        default=2000,
        gt=0,
        description="Maximum tokens per LLM response"
    )
    
    # Application Configuration
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO",
        description="Logging level"
    )
    data_dir: Path = Field(
        default=Path("data"),
        description="Root directory for data storage"
    )
    
    # Pydantic Settings Configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        frozen=True,  # Immutable settings
        extra="forbid"  # Reject unknown environment variables
    )
    
    @field_validator('gmail_credentials_path', 'gmail_token_path')
    @classmethod
    def validate_paths_exist(cls, v: Path) -> Path:
        """Validate that credential files exist (token.json may not exist yet)."""
        if v.name == 'credentials.json' and not v.exists():
            raise FileNotFoundError(
                f"Gmail credentials not found: {v}\n"
                f"Please download from Google Cloud Console"
            )
        return v


# Create global settings instance
try:
    settings = Settings()
except Exception as e:
    print(f"❌ Configuration Error: {e}")
    print(f"\nPlease check your .env file and ensure:")
    print(f"  1. OPENAI_API_KEY is set")
    print(f"  2. credentials.json exists")
    print(f"  3. All required variables are defined")
    raise

# Create data directories on import
settings.data_dir.mkdir(exist_ok=True)
(settings.data_dir / "raw_emails").mkdir(exist_ok=True)
(settings.data_dir / "extracted").mkdir(exist_ok=True)
(settings.data_dir / "benchmark").mkdir(exist_ok=True)
(settings.data_dir / "logs").mkdir(exist_ok=True)

# Log configuration (only in non-production)
if settings.log_level == "DEBUG":
    print(f"✅ Configuration loaded:")
    print(f"   - Qdrant: {settings.qdrant_host}:{settings.qdrant_port}")
    print(f"   - LLM: {settings.llm_model}")
    print(f"   - Embeddings: {settings.embedding_model_name} ({settings.embedding_dimension}D)")
    print(f"   - Data dir: {settings.data_dir.absolute()}")
EOF
```

**Test configuration:**

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

python << 'EOF'
from app.config import settings

print("✅ Configuration loaded successfully!")
print(f"\nSettings:")
print(f"  Qdrant: {settings.qdrant_host}:{settings.qdrant_port}")
print(f"  LLM: {settings.llm_model}")
print(f"  Embeddings: {settings.embedding_model_name}")
print(f"  OpenAI key: {settings.openai_api_key[:10]}...") 
print(f"  Data dir: {settings.data_dir}")
EOF
```

---

## 7. Verification Checklist

### 7.1 Complete Verification

Run this comprehensive verification script:

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack/feedprism_main

python << 'EOF'
"""
Phase 0 Verification Script

This script verifies that all Phase 0 setup is complete and working.
"""

import sys
from pathlib import Path

print("=" * 70)
print("PHASE 0: FOUNDATION - VERIFICATION")
print("=" * 70)

checks_passed = 0
checks_total = 0

def check(name, condition, fix_hint=""):
    """Run a check and display result."""
    global checks_passed, checks_total
    checks_total += 1
    
    status = "✅" if condition else "❌"
    print(f"\n{status} {name}")
    
    if condition:
        checks_passed += 1
    elif fix_hint:
        print(f"   Fix: {fix_hint}")

# Check 1: Python Version
print("\n[1/10] Python Version")
import sys
version_ok = sys.version_info >= (3, 10)
check(
    f"Python {sys.version_info.major}.{sys.version_info.minor}",
    version_ok,
    "Install Python 3.10+ (brew install python@3.11)"
)

# Check 2: Virtual Environment
print("\n[2/10] Virtual Environment")
in_venv = sys.prefix != sys.base_prefix
check(
    "Virtual environment active",
    in_venv,
    "Run: source .venv/bin/activate"
)

# Check 3: Required Packages
print("\n[3/10] Python Packages")
try:
    import fastapi
    import openai
    import qdrant_client
    import sentence_transformers
    from google.oauth2.credentials import Credentials
    check("All required packages installed", True)
except ImportError as e:
    check("All required packages installed", False, f"Run: pip install -r requirements.txt (Missing: {e.name})")

# Check 4: Gmail Credentials
print("\n[4/10] Gmail API Credentials")
creds_exist = Path("credentials.json").exists()
check(
    "credentials.json exists",
    creds_exist,
    "Download from Google Cloud Console"
)

# Check 5: Gmail Token
print("\n[5/10] Gmail API Token")
token_exist = Path("token.json").exists()
check(
    "token.json exists",
    token_exist,
    "Run: python scripts/setup_gmail.py"
)

# Check 6: Environment Variables
print("\n[6/10] Environment Configuration")
env_exists = Path(".env").exists()
check(
    ".env file exists",
    env_exists,
    "Create .env file with required variables"
)

# Check 7: Configuration Loading
print("\n[7/10] Configuration Module")
try:
    from app.config import settings
    config_ok = True
    check("Configuration loads without errors", True)
except Exception as e:
    check("Configuration loads without errors", False, str(e))

# Check 8: Qdrant Connection
print("\n[8/10] Qdrant Database")
try:
    from qdrant_client import QdrantClient
    client = QdrantClient(host="localhost", port=6333)
    collections = client.get_collections()
    check("Qdrant connection successful", True)
except Exception as e:
    check("Qdrant connection successful", False, "Start Qdrant: docker run -d --name feedprism-qdrant -p 6333:6333 qdrant/qdrant")

# Check 9: Embedding Model
print("\n[9/10] Embedding Model")
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    vec = model.encode("test")
    check(f"Embedding model loaded ({len(vec)}D vectors)", len(vec) == 384)
except Exception as e:
    check("Embedding model loaded", False, str(e))

# Check 10: Data Directories
print("\n[10/10] Project Structure")
required_dirs = [
    Path("app"),
    Path("data/raw_emails"),
    Path("data/extracted"),
    Path("data/logs"),
    Path("scripts"),
    Path("tests")
]
all_exist = all(d.exists() for d in required_dirs)
check(
    "All required directories exist",
    all_exist,
    "Re-run directory creation commands"
)

# Summary
print("\n" + "=" * 70)
print(f"VERIFICATION COMPLETE: {checks_passed}/{checks_total} checks passed")
print("=" * 70)

if checks_passed == checks_total:
    print("\n✅ ALL CHECKS PASSED! Phase 0 is complete.")
    print("\n📌 Next Step: Proceed to Phase 1 (Core Pipeline)")
    print("   File: revised_implementation_guide/Phase_1_Core_Pipeline.md")
    sys.exit(0)
else:
    print(f"\n⚠️  {checks_total - checks_passed} check(s) failed.")
    print("\nPlease fix the issues above before proceeding to Phase 1.")
    sys.exit(1)
EOF
```

**Expected Output:**
```
======================================================================
PHASE 0: FOUNDATION - VERIFICATION
======================================================================

[1/10] Python Version
✅ Python 3.11

[2/10] Virtual Environment
✅ Virtual environment active

[3/10] Python Packages
✅ All required packages installed

[4/10] Gmail API Credentials
✅ credentials.json exists

[5/10] Gmail API Token
✅ token.json exists

[6/10] Environment Configuration
✅ .env file exists

[7/10] Configuration Module
✅ Configuration loads without errors

[8/10] Qdrant Database
✅ Qdrant connection successful

[9/10] Embedding Model
✅ Embedding model loaded (384D vectors)

[10/10] Project Structure
✅ All required directories exist

======================================================================
VERIFICATION COMPLETE: 10/10 checks passed
======================================================================

✅ ALL CHECKS PASSED! Phase 0 is complete.

📌 Next Step: Proceed to Phase 1 (Core Pipeline)
   File: revised_implementation_guide/Phase_1_Core_Pipeline.md
```

### 7.2 Git Commit Checkpoint

```bash
# Navigate to repository root
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack

# Stage all changes in feedprism_main
git add feedprism_main/

# Commit Phase 0
git commit -m "feat(feedprism): Phase 0 foundation complete

- Created feedprism_main project structure
- Environment configuration with Pydantic Settings
- Gmail API OAuth 2.0 authentication
- Qdrant Docker container running
- All dependencies installed
- Verification script confirms 10/10 checks passed

Ready for Phase 1: Core Pipeline"

# Tag this checkpoint (optional but recommended)
git tag feedprism-phase-0-complete

echo "✅ Phase 0 committed and tagged"
```

---

## 8. Troubleshooting

### 8.1 Common Issues

**Issue: "No module named 'fastapi'"**

**Solution:**
```bash
# Ensure virtual environment is activated
source .venv/bin/activate

# Re-install dependencies
pip install -r requirements.txt
```

---

**Issue: "credentials.json not found"**

**Solution:**
```bash
# Check if file exists
ls -lh credentials.json

# If missing, download from Google Cloud Console
open https://console.cloud.google.com/apis/credentials

# Move to correct location
mv ~/Downloads/client_secret_*.json credentials.json
```

---

**Issue: "Connection refused" (Qdrant)**

**Solution:**
```bash
# Check if Docker is running
docker ps

# If no containers, Docker Desktop may not be running
open -a Docker

# Wait 30 seconds, then check again
docker ps

# Restart Qdrant container
docker restart feedprism-qdrant

# Test connection
curl http://localhost:6333/collections
```

---

**Issue: "OpenAI API key invalid"**

**Solution:**
```bash
# Verify API key in .env
cat .env | grep OPENAI_API_KEY

# Key should start with: sk-proj-...
# If wrong, regenerate at: https://platform.openai.com/api-keys

# Update .env with new key
nano .env
```

---

**Issue: "OAuth flow opens wrong browser"**

**Solution:**
```bash
# Set default browser temporarily
export BROWSER=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome

# Re-run setup
python scripts/setup_gmail.py
```

---

### 8.2 Docker Commands Reference

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Stop Qdrant
docker stop feedprism-qdrant

# Start Qdrant
docker start feedprism-qdrant

# Restart Qdrant
docker restart feedprism-qdrant

# View Qdrant logs
docker logs feedprism-qdrant

# Remove Qdrant container (data persists in volume)
docker rm -f feedprism-qdrant

# Remove Qdrant AND data (DESTRUCTIVE!)
docker rm -f feedprism-qdrant
rm -rf data/qdrant_storage
```

---

### 8.3 Clean Slate (Start Over)

If you need to completely reset Phase 0:

```bash
cd /Users/Shared/ALL\ WORKSPACE/Hackathons/mom_hack

# Deactivate venv
deactivate

# Remove project directory
rm -rf feedprism_main

# Re-create from scratch
mkdir feedprism_main
cd feedprism_main

# Follow Phase 0 guide from Section 2
```

---

## Phase 0 Complete! 🎉

**What You've Accomplished:**
- ✅ Project structure established
- ✅ Python environment configured
- ✅ All dependencies installed
- ✅ Gmail API authenticated
- ✅ Qdrant running and connected
- ✅ Configuration management in place
- ✅ Git repository initialized with checkpoint

**Time Spent:** ~3-4 hours

**Next Step:** **[Phase 1: Core Pipeline](Phase_1_Core_Pipeline.md)**

**Estimated Time:** 12-14 hours

---

**Pro Tips for Phase 1:**
1. Read the entire guide before coding
2. Test each module independently
3. Commit after each working module
4. Keep Qdrant dashboard open for debugging
5. Use `git status` frequently to track changes

**You're on track! Keep going! 🚀**
