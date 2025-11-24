# FeedPrism: Pre-Implementation Plan

**Status:** Master Context Document Complete  
**Next Phase:** Implementation Planning  
**Deadline:** November 30, 2025 (12 PM IST)  
**Days Remaining:** 6 days

---

## 🎯 Immediate Next Steps (Pre-Implementation)

### 1. Implementation Planning 📋
**Goal:** Create detailed technical implementation plan

**Actions:**
- Break down 7-day execution plan into daily tasks with specific deliverables
- Define tech stack specifics:
  - **Backend:** Python/FastAPI or Node.js/Express?
  - **Frontend:** React/Next.js or simple HTML/CSS/JS?
  - **Embedding Model:** OpenAI, Cohere, or open-source (sentence-transformers)?
  - **Qdrant:** Cloud (easy) or self-hosted Docker (control)?
- Create API specifications (OpenAPI/Swagger format)
- Design database schema (Qdrant collections + payload structure)
- Define error handling and retry strategies

**Output:** `implementation_plan.md` or `technical_spec.md`

**Time Estimate:** 2-3 hours

---

### 2. Benchmark Dataset Creation 📊
**Goal:** Prepare evaluation dataset before building

**Actions:**
- Collect 50-200 sample emails:
  - Newsletters (AI/ML Weekly, DataCamp, O'Reilly)
  - Event invitations (conference announcements)
  - Course announcements (Coursera, Udemy)
- Manually label 20-40 test queries with expected results
- Create ground truth for:
  - Content type classification (Event/Course/Blog)
  - Actionable item extraction (RSVPs, deadlines)
  - Temporal classification (upcoming/past)
  - Deduplication (identify known duplicates)

**Output:** `benchmark_dataset/` folder structure:
```
benchmark_dataset/
├── emails/
│   ├── raw_emails.json
│   └── labeled_emails.json
├── queries/
│   └── test_queries.json
└── ground_truth/
    ├── content_types.json
    ├── actionable_items.json
    └── duplicates.json
```

**Time Estimate:** 3-4 hours

---

### 3. Repository Setup 🛠️
**Goal:** Initialize project structure

**Actions:**
```bash
# Create project structure
feedprism/
├── backend/
│   ├── api/              # FastAPI routes
│   ├── extractors/       # Email parsing, content extraction
│   ├── models/           # Data models, schemas
│   ├── services/         # Qdrant, embedding services
│   └── utils/            # Helpers, config
├── frontend/
│   ├── public/
│   └── src/
├── tests/
│   ├── unit/
│   └── integration/
├── benchmark/            # Evaluation scripts
├── docs/
│   ├── api_spec.md
│   └── architecture.md
├── .env.example
├── .gitignore
├── README.md
├── requirements.txt      # Python dependencies
└── docker-compose.yml    # Qdrant + app
```

**Setup Commands:**
```bash
# Initialize Git
git init
git add .
git commit -m "Initial commit: FeedPrism project structure"

# Python environment with uv (fast package installer)
# Install uv if not already installed: curl -LsSf https://astral.sh/uv/install.sh | sh
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt

# Environment variables
cp .env.example .env
# Edit .env with API keys (OPENAI_API_KEY, GMAIL_CREDENTIALS, etc.)
```

**Output:** Working repository with proper structure

**Time Estimate:** 1 hour

---

### 4. Proof of Concept (PoC) 🧪
**Goal:** Validate core assumptions quickly (2-hour sprint)

#### Prerequisites & Setup Steps

Before running the PoC, complete these setup steps:

##### Step 1: Install Required Tools
```bash
# Install uv (fast Python package installer)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Verify installation
uv --version
```

##### Step 2: Create Project Directory
```bash
mkdir feedprism-poc
cd feedprism-poc
```

##### Step 3: Initialize Python Environment
```bash
# Create virtual environment with uv
uv venv

# Activate virtual environment
source .venv/bin/activate  # On macOS/Linux
# OR
.venv\Scripts\activate     # On Windows
```

##### Step 4: Install Dependencies
```bash
# Create requirements.txt
cat > requirements.txt << EOF
openai==1.3.0
qdrant-client==1.7.0
google-auth-oauthlib==1.1.0
google-auth-httplib2==0.1.1
google-api-python-client==2.108.0
beautifulsoup4==4.12.2
EOF

# Install with uv (much faster than pip)
uv pip install -r requirements.txt
```

##### Step 5: Set Up Gmail API Credentials

**5a. Enable Gmail API:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable Gmail API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

**5b. Create OAuth Credentials:**
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Desktop app" as application type
4. Download credentials as `credentials.json`
5. Place `credentials.json` in project root

**5c. Generate Token:**
```bash
# Run this Python script to generate token.json
python << EOF
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
creds = flow.run_local_server(port=0)

with open('token.json', 'w') as token:
    token.write(creds.to_json())

print("✅ token.json created successfully!")
EOF
```

##### Step 6: Set Up OpenAI API Key
```bash
# Create .env file
cat > .env << EOF
OPENAI_API_KEY=your_openai_api_key_here
EOF

# Load environment variables
export $(cat .env | xargs)  # On macOS/Linux
# OR manually set: export OPENAI_API_KEY=sk-...
```

**Get OpenAI API Key:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new API key
3. Copy and paste into `.env` file

##### Step 7: (Optional) Set Up Qdrant Cloud

For production, use Qdrant Cloud. For PoC, we'll use in-memory mode (no setup needed).

**If you want to use Qdrant Cloud:**
1. Sign up at [Qdrant Cloud](https://cloud.qdrant.io/)
2. Create a cluster
3. Get API key and URL
4. Add to `.env`:
   ```bash
   QDRANT_URL=https://your-cluster.qdrant.io
   QDRANT_API_KEY=your_api_key
   ```

##### Step 8: Verify Setup
```bash
# Test imports
python -c "import openai; import qdrant_client; from googleapiclient.discovery import build; print('✅ All imports successful!')"

# Check credentials
ls -la credentials.json token.json

# Verify environment
echo $OPENAI_API_KEY | head -c 10  # Should show sk-...
```

**Setup Complete!** You're now ready to run the PoC.

---

#### PoC Implementation

**PoC Script (`poc.py`):**
```python
"""
FeedPrism PoC: Validate core pipeline
- Fetch email via Gmail API
- Extract event using LLM
- Embed and store in Qdrant
- Search and retrieve
"""

import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import openai
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# 1. Fetch 1 email from Gmail
def fetch_sample_email():
    creds = Credentials.from_authorized_user_file('token.json')
    service = build('gmail', 'v1', credentials=creds)
    results = service.users().messages().list(userId='me', maxResults=1).execute()
    msg_id = results['messages'][0]['id']
    msg = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
    return msg

# 2. Extract event using LLM
def extract_event(email_html):
    prompt = f"""
    Extract event details from this email in JSON format:
    {{
      "title": "...",
      "date": "...",
      "location": "...",
      "description": "..."
    }}
    
    Email:
    {email_html}
    """
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

# 3. Embed and store in Qdrant
def store_in_qdrant(event_data):
    client = QdrantClient(":memory:")  # In-memory for PoC
    
    # Create collection
    client.create_collection(
        collection_name="events",
        vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
    )
    
    # Get embedding
    embedding = openai.Embedding.create(
        input=event_data['title'] + " " + event_data['description'],
        model="text-embedding-ada-002"
    )['data'][0]['embedding']
    
    # Upsert
    client.upsert(
        collection_name="events",
        points=[
            PointStruct(
                id=1,
                vector=embedding,
                payload=event_data
            )
        ]
    )
    return client

# 4. Search
def search_events(client, query):
    query_embedding = openai.Embedding.create(
        input=query,
        model="text-embedding-ada-002"
    )['data'][0]['embedding']
    
    results = client.search(
        collection_name="events",
        query_vector=query_embedding,
        limit=5
    )
    return results

# Run PoC
if __name__ == "__main__":
    print("🚀 FeedPrism PoC Starting...")
    
    # email = fetch_sample_email()  # Uncomment when Gmail API ready
    # For now, use sample
    sample_email = "<html>Join us for AI Summit 2024 on Dec 15...</html>"
    
    event = extract_event(sample_email)
    print(f"✅ Extracted event: {event}")
    
    client = store_in_qdrant(event)
    print("✅ Stored in Qdrant")
    
    results = search_events(client, "upcoming AI events")
    print(f"✅ Search results: {results}")
    
    print("🎉 PoC Complete! Ready to build.")
```

**Success Criteria:**
- [ ] Gmail API fetches email successfully
- [ ] LLM extracts structured event data
- [ ] Qdrant stores and retrieves vector
- [ ] Search returns relevant results
- [ ] Total time < 2 hours

**Output:** Working `poc.py` script

**Time Estimate:** 2 hours

---

## 🚀 Implementation Phase (Days 1-7)

### Day 1-2: Foundation (Nov 25-26)
**Focus:** Data pipeline + storage

**Tasks:**
- [ ] Gmail API integration
  - [ ] OAuth setup (credentials.json, token.json)
  - [ ] Fetch emails from specific labels/senders
  - [ ] Handle pagination (fetch 50-200 emails)
- [ ] HTML parsing
  - [ ] BeautifulSoup for HTML → text
  - [ ] Extract links, images, metadata
  - [ ] Handle inline styles, embedded content
- [ ] Qdrant setup
  - [ ] Define collection schema
  - [ ] Create payload structure (type, tags, date, source_id, status, actions)
  - [ ] Test CRUD operations
- [ ] Basic embedding pipeline
  - [ ] OpenAI embedding API integration
  - [ ] Batch processing for efficiency
  - [ ] Error handling and retries

**Deliverables:**
- Working email fetcher
- Clean text extraction from HTML
- Qdrant collection with 50+ emails stored

**Time:** 12-16 hours

---

### Day 3-4: Core Features (Nov 27-28)
**Focus:** Extraction + retrieval

**Tasks:**
- [ ] Content extraction (LLM-based)
  - [ ] Event extraction (title, date, location, link)
  - [ ] Course extraction (title, provider, link)
  - [ ] Blog extraction (title, author, link)
  - [ ] Multi-content email handling
- [ ] Hybrid search implementation
  - [ ] Dense vector search (semantic)
  - [ ] Lexical search (BM25 or keyword)
  - [ ] Fusion algorithm (RRF or weighted)
- [ ] Payload filtering
  - [ ] Filter by type (event/course/blog)
  - [ ] Filter by status (upcoming/past)
  - [ ] Filter by sender
  - [ ] Filter by date range
- [ ] Deduplication logic
  - [ ] Vector similarity threshold (>0.92)
  - [ ] Canonical item assignment
  - [ ] Multi-source tracking

**Deliverables:**
- Extraction accuracy ≥85% (manual review of 50 samples)
- Hybrid search working
- Deduplication reduces duplicates by ≥30%

**Time:** 12-16 hours

---

### Day 5: Advanced Features (Nov 29)
**Focus:** Differentiation

**Tasks:**
- [ ] Actionable item extraction
  - [ ] Identify RSVPs, registrations, deadlines
  - [ ] Extract action type, deadline, link
  - [ ] Store in payload
- [ ] Email tagging/classification
  - [ ] Tag all emails (content-rich, transactional, personal, promotional)
  - [ ] Multi-class classifier
  - [ ] Filtering by email tag
- [ ] Theme suggestions (optional)
  - [ ] Analyze email patterns
  - [ ] Suggest themes (AI/ML Events, Data Science Courses)
  - [ ] User configuration interface
- [ ] Reranking
  - [ ] Cross-encoder or LLM-based reranking
  - [ ] Boost precision@10

**Deliverables:**
- Actionable items extracted (≥80% accuracy)
- Email tagging working
- Reranking improves precision@10 by ≥10%

**Time:** 8-10 hours

---

### Day 6: Demo & Metrics (Nov 29 evening)
**Focus:** Presentation

**Tasks:**
- [ ] Simple frontend UI
  - [ ] Search bar
  - [ ] Filter controls (type, status, sender)
  - [ ] Result cards (title, description, type badge, date, source link)
  - [ ] Before/after view
- [ ] Metrics dashboard
  - [ ] Precision@10, MRR, latency
  - [ ] Deduplication rate
  - [ ] Live metrics display
- [ ] Demo flow
  - [ ] Script: "Messy inbox → organized library"
  - [ ] Show search, filters, source links
  - [ ] Highlight deduplication
- [ ] README documentation
  - [ ] Setup instructions
  - [ ] Architecture overview
  - [ ] HNSW parameters explained
  - [ ] Benchmark results table

**Deliverables:**
- Working demo UI
- Metrics dashboard
- Polished README

**Time:** 8-10 hours

---

### Day 7: Polish & Submission (Nov 30)
**Focus:** Final touches

**Tasks:**
- [ ] Demo video (60-90s)
  - [ ] Record screen capture
  - [ ] Voiceover explaining value prop
  - [ ] Show before/after, metrics
- [ ] Final testing
  - [ ] Test all features end-to-end
  - [ ] Fix critical bugs
  - [ ] Verify metrics accuracy
- [ ] Submission prep
  - [ ] GitHub repository public
  - [ ] README complete
  - [ ] Demo video uploaded
  - [ ] Submit to hackathon platform

**Deliverables:**
- Demo video
- Submission complete

**Deadline:** Nov 30, 12 PM IST

**Time:** 4-6 hours

---

## 📝 Documentation Needs

### Before Implementation:
1. **API Specification** (`docs/api_spec.md`)
   - Endpoint definitions
   - Request/response schemas
   - Authentication

2. **Data Models** (`docs/data_models.md`)
   - Qdrant payload schema
   - Email structure
   - Content item structure

3. **Architecture Diagram** (`docs/architecture.md`)
   - System components
   - Data flow
   - Integration points

### During Implementation:
1. **README.md**
   - Project overview
   - Setup instructions
   - Usage examples
   - Features list

2. **Technical Deep-Dive** (in README or separate doc)
   - HNSW parameters (m, ef_construct)
   - Quantization choices (scalar, product)
   - Scaling considerations

3. **Benchmark Results** (`docs/benchmarks.md`)
   - Metrics tables
   - Ablation studies (dense vs hybrid vs hybrid+rerank)
   - Performance analysis

---

## 🤔 Key Decisions to Make

### 1. Scope for Hackathon

**Decision:** What to include in MVP?

**Options:**
- **Minimal:** Events only, basic search, no dedup
- **Balanced:** Events + Courses, hybrid search, dedup ✅ **Recommended**
- **Full:** All features (events/courses/blogs, actions, tagging, themes)

**Recommendation:** Balanced scope
- **Why:** Demonstrates core value without overextending
- **Risk:** Full scope may not finish in 7 days

---

### 2. Tech Stack

**Backend:**
- **Python + FastAPI** ✅ **Recommended**
  - Pros: Easier for ML, rich ecosystem, fast development
  - Cons: Slightly slower than Node.js
- **Node.js + Express**
  - Pros: Faster for web, JavaScript everywhere
  - Cons: Harder for ML integration

**Frontend:**
- **Simple HTML/CSS/JS** ✅ **Recommended for Hackathon**
  - Pros: Fast to build, no build step
  - Cons: Less polished
- **React/Next.js**
  - Pros: Professional UI
  - Cons: More setup time

**Embedding Model:**
- **OpenAI (text-embedding-ada-002)** ✅ **Recommended**
  - Pros: High quality, easy API
  - Cons: Costs ~$0.10 per 1M tokens
- **Open-source (sentence-transformers)**
  - Pros: Free, local
  - Cons: Lower quality, slower

**Qdrant:**
- **Qdrant Cloud** ✅ **Recommended**
  - Pros: Zero setup, managed
  - Cons: Requires internet, potential costs
- **Docker (self-hosted)**
  - Pros: Full control, free
  - Cons: Setup time, local only

---

### 3. Demo Strategy

**Live Demo:**
- **Pros:** Shows real-time capability
- **Cons:** Risky (API failures, network issues)

**Pre-recorded Video:** ✅ **Recommended**
- **Pros:** Polished, no risk, can edit
- **Cons:** Less impressive than live

**Data:**
- **Real Emails:** Authentic, relatable
- **Synthetic Data:** Clean, controlled ✅ **Recommended for Demo**

---

### 4. Lamatic Integration

**Decision:** Use Lamatic for workflow orchestration?

**Options:**
- **Yes:** Sponsor bonus, shows advanced orchestration
- **No:** Simpler, faster to build ✅ **Recommended**

**Recommendation:** Skip Lamatic for hackathon
- **Why:** Focus on core Qdrant features
- **Alternative:** Mention Lamatic in "Future Work" section

---

## 🎬 Recommended Immediate Action

**Start with a 2-hour PoC sprint** (see Section 4 above)

**If PoC succeeds in <2 hours:**
- ✅ Proceed with full implementation
- ✅ Use chosen tech stack
- ✅ Follow 7-day plan

**If PoC takes >2 hours:**
- ⚠️ Reduce scope (events only)
- ⚠️ Simplify extraction (rule-based instead of LLM)
- ⚠️ Defer advanced features

---

## 📅 Timeline Recommendation

| Date | Day | Focus | Hours | Deliverable |
|------|-----|-------|-------|-------------|
| **Nov 24** | 0 | PoC + Decisions | 2-3 | Working PoC script |
| **Nov 25** | 1 | Foundation | 8 | Gmail API + Qdrant setup |
| **Nov 26** | 2 | Foundation | 8 | 50+ emails stored |
| **Nov 27** | 3 | Core Features | 8 | Extraction + Search working |
| **Nov 28** | 4 | Core Features | 8 | Dedup + Filters working |
| **Nov 29** | 5-6 | Advanced + Demo | 12 | UI + Metrics + README |
| **Nov 30** | 7 | Polish + Submit | 4 | Video + Submission |

**Total Estimated Hours:** 50-60 hours  
**Actual Available:** 6 days × 10 hours/day = 60 hours  
**Buffer:** Minimal—stay focused!

---

## ✅ Success Criteria

### Minimum Viable Demo:
- [ ] Fetch 50+ emails from Gmail
- [ ] Extract 20+ events/courses
- [ ] Hybrid search works
- [ ] Deduplication reduces duplicates by ≥30%
- [ ] Precision@10 ≥ 0.75
- [ ] Demo UI functional
- [ ] README complete
- [ ] Demo video recorded

### Stretch Goals:
- [ ] Actionable item extraction
- [ ] Email tagging
- [ ] Theme suggestions
- [ ] Calendar export (.ics)
- [ ] Precision@10 ≥ 0.85

---

## 🚨 Risk Mitigation

### Risk 1: Gmail API Rate Limits
- **Mitigation:** Cache emails locally, use batch fetching

### Risk 2: LLM Extraction Failures
- **Mitigation:** Implement fallback to rule-based extraction

### Risk 3: Qdrant Setup Issues
- **Mitigation:** Use Qdrant Cloud (managed service)

### Risk 4: Time Overrun
- **Mitigation:** Cut scope to events-only if behind schedule

### Risk 5: Demo Day Failures
- **Mitigation:** Pre-record video, have backup static dataset

---

## 📞 Next Action

**Choose one to start:**

1. **Run PoC** (2 hours) → Validate assumptions
2. **Make Tech Decisions** (30 min) → Lock in stack
3. **Create Benchmark Dataset** (3 hours) → Prepare evaluation
4. **Setup Repository** (1 hour) → Initialize structure

**Recommended:** Start with **PoC** to validate core assumptions before committing to full build.
