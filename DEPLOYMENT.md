# FeedPrism Deployment Guide (Google Cloud VM)

> **Complete Step-by-Step Guide** for deploying FeedPrism on a GCP VM with:
> - Docker Compose orchestration
> - Qdrant with API key security for external access (Lamatic integration)
> - SSH from browser and local machine
> - GitHub access via Personal Access Token

**Last Updated:** December 1, 2025

---

## Command Location Legend

Throughout this guide, commands are prefixed with icons to indicate WHERE to run them:

| Icon | Location | Description |
|------|----------|-------------|
| 🖥️ **LOCAL** | Your local machine | macOS Terminal, Windows PowerShell, etc. |
| 🌐 **VM** | GCP VM (via SSH) | After SSH-ing into the VM (browser or local SSH) |
| 🐳 **CONTAINER** | Inside Docker container | Using `docker-compose exec` |
| 🌍 **BROWSER** | Web browser | GCP Console, testing URLs |

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Prepare Your Secrets](#2-prepare-your-secrets)
3. [Create GCP VM via Console](#3-create-gcp-vm-via-google-cloud-console)
4. [SSH Access Setup](#4-ssh-access-setup)
5. [Install Docker & Docker Compose](#5-install-docker--docker-compose)
6. [Clone Repository](#6-clone-repository-using-github-access-token)
7. [Configure Environment](#7-configure-environment)
8. [Configure Firewall for Qdrant](#8-configure-firewall-for-external-qdrant-access)
9. [Deploy with Docker Compose](#9-deploy-with-docker-compose)
10. [Verify Deployment](#10-verify-deployment)
11. [Connect Lamatic to Qdrant](#11-connect-lamatic-to-qdrant)
12. [Maintenance & Updates](#12-maintenance--updates)
13. [Troubleshooting](#13-troubleshooting)
14. [Cost Estimate](#14-cost-estimate)

---

## 1. Prerequisites

Before starting, ensure you have:

| Item | Description | How to Get |
|------|-------------|------------|
| **GCP Account** | With billing enabled or free trial | [cloud.google.com](https://cloud.google.com) - $300 free credit for 90 days |
| **GitHub Access Token** | Personal Access Token with `repo` scope | GitHub → Settings → Developer settings → Personal access tokens |
| **OpenAI API Key** | For LLM extraction | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Local Terminal** | For local SSH (optional) | macOS Terminal / Windows PowerShell |

---

## 2. Prepare Your Secrets

Before deployment, have these ready in a secure note:

```
# Save these somewhere secure - you'll need them during setup

GITHUB_USERNAME=your-github-username
GITHUB_ACCESS_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx

# Generate a secure random key for Qdrant (32+ characters)
QDRANT_API_KEY=your-super-secure-qdrant-api-key-here-min-32-chars
```

**To generate a secure Qdrant API key:**

🖥️ **LOCAL**
```bash
openssl rand -hex 32
# Output: e.g., a1b2c3d4e5f6...64 character hex string
```

---

## 3. Create GCP VM via Google Cloud Console

### Step 3.1: Open Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project **spayce-app** from the dropdown (top-left)
   - If not visible, click the dropdown and search for it

### Step 3.2: Navigate to Compute Engine

1. Click the **Navigation Menu** (☰) in the top-left
2. Go to **Compute Engine** → **VM instances**
3. If prompted, click **Enable** to enable the Compute Engine API (takes ~1 minute)

### Step 3.3: Create the VM

Click **+ CREATE INSTANCE** at the top

**Fill in these settings:**

| Setting | Value |
|---------|-------|
| **Name** | `feedprism-demo` |
| **Region** | `us-central1 (Iowa)` |
| **Zone** | `us-central1-a` |
| **Machine type** | Series: **E2**, Type: **e2-medium** (2 vCPU, 4GB RAM) |

**Boot disk (click "Change"):**

| Setting | Value |
|---------|-------|
| **Operating system** | Ubuntu |
| **Version** | Ubuntu 22.04 LTS (x86/64) |
| **Size** | 30 GB |
| **Boot disk type** | Balanced persistent disk |

Click **Select** to confirm boot disk.

**Firewall:**

- ✅ Check **Allow HTTP traffic**
- ✅ Check **Allow HTTPS traffic**

**Click CREATE** - VM creation takes ~30 seconds.

### Step 3.4: Note Your External IP

Once created, you'll see the VM in the list. Note the **External IP** (e.g., `34.123.45.67`).

**Save this IP - you'll use it throughout the guide.**

---

## 4. SSH Access Setup

### Option A: SSH from Browser (Quickest)

🌍 **BROWSER** (GCP Console)
1. In the VM instances list, find `feedprism-demo`
2. Click **SSH** button in the row
3. A browser window opens with terminal access

**You're now connected! Skip to [Step 5](#5-install-docker--docker-compose).**

---

### Option B: SSH from Local Machine (Recommended for Long Sessions)

This is more stable and allows copy-paste more easily.

#### Step 4.1: Install Google Cloud CLI (if not installed)

🖥️ **LOCAL** (macOS)
```bash
# Install via Homebrew
brew install google-cloud-sdk

# Or download directly
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

🖥️ **LOCAL** (Verify)
```bash
gcloud --version
# Should show: Google Cloud SDK x.x.x
```

#### Step 4.2: Authenticate with GCP

🖥️ **LOCAL**
```bash
# Login to your Google account
gcloud auth login
# This opens a browser - complete the OAuth flow

# Set your project
gcloud config set project spayce-app

# Verify
gcloud config get-value project
# Output: spayce-app
```

#### Step 4.3: SSH into the VM

🖥️ **LOCAL**
```bash
# First time SSH - this creates SSH keys automatically
gcloud compute ssh feedprism-demo --zone=us-central1-a

# You may see:
# "This will create a new SSH key pair..."
# Press Enter to accept default location, then Enter again for no passphrase (or set one)
```

**You're now connected to the VM!**

#### Step 4.4: Direct SSH (Optional - after first connection)

After the first `gcloud compute ssh`, you can SSH directly:

🖥️ **LOCAL**
```bash
# Get the external IP
gcloud compute instances describe feedprism-demo \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'

# SSH directly (your username is your local username)
ssh your-username@EXTERNAL_IP
```

---

## 5. Install Docker & Docker Compose

**All commands in this section run on the VM (after SSH).**

### Step 5.1: Update System Packages

🌐 **VM**
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 5.2: Install Docker

🌐 **VM**
```bash
# Download and run Docker install script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group (avoids needing sudo)
sudo usermod -aG docker $USER

# Clean up
rm get-docker.sh
```

### Step 5.3: Install Docker Compose

🌐 **VM**
```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
# Output: Docker Compose version v2.x.x
```

### Step 5.4: Apply Group Changes

**IMPORTANT:** Log out and back in to apply the docker group:

🌐 **VM**
```bash
exit
```

Then SSH back in:
- 🌍 **Browser SSH:** Close the window, click SSH again in GCP Console
- 🖥️ **Local SSH:** Run `gcloud compute ssh feedprism-demo --zone=us-central1-a` again

### Step 5.5: Verify Docker Works

🌐 **VM**
```bash
docker run hello-world
# Should print "Hello from Docker!" message
```

---

## 6. Clone Repository Using GitHub Access Token

**All commands in this section run on the VM (after SSH).**

### Step 6.1: Clone with Access Token

🌐 **VM**
```bash
# Navigate to home directory
cd ~

# Clone using your access token (replace placeholders)
git clone https://YOUR_GITHUB_USERNAME:YOUR_ACCESS_TOKEN@github.com/dishantghai/feedprism.git

# Example with real values:
# git clone https://dishantghai:ghp_abc123xyz@github.com/dishantghai/feedprism.git
```

### Step 6.2: Navigate to Project

🌐 **VM**
```bash
cd feedprism
ls -la
# You should see: docker-compose.yml, feedprism_main/, frontend/, etc.
```

### Step 6.3: Configure Git (for future commits)

🌐 **VM**
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

---

## 7. Configure Environment

**All commands in this section run on the VM (after SSH).**

### Step 7.1: Create Root .env File

This file is read by Docker Compose:

🌐 **VM**
```bash
cat > .env << 'EOF'
# OpenAI API Key (Required)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Qdrant Configuration
QDRANT_HOST=qdrant
QDRANT_PORT=6333
QDRANT_API_KEY=your-secure-qdrant-api-key-here-min-32-chars

# Demo Mode (for hackathon - no Gmail login required)
DEMO_MODE=true
DEMO_USER_NAME=Demo User
DEMO_USER_EMAIL=demo@feedprism.app

# Logging
LOG_LEVEL=INFO
EOF
```

**Now edit the file with your actual keys:**

🌐 **VM**
```bash
nano .env
# Replace placeholder values with your real keys
# Ctrl+O to save, Ctrl+X to exit
```

### Step 7.2: Create Backend .env File

🌐 **VM**
```bash
cat > feedprism_main/.env << 'EOF'
# OpenAI API Key
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Qdrant Configuration
QDRANT_HOST=qdrant
QDRANT_PORT=6333
QDRANT_API_KEY=your-secure-qdrant-api-key-here-min-32-chars

# Demo Mode
DEMO_MODE=true
DEMO_USER_NAME=Demo User
DEMO_USER_EMAIL=demo@feedprism.app

# Logging
LOG_LEVEL=INFO
EOF
```

**Edit with your real keys:**

🌐 **VM**
```bash
nano feedprism_main/.env
# Replace placeholder values
# Ctrl+O to save, Ctrl+X to exit
```

### Step 7.3: Verify .env Files

🌐 **VM**
```bash
# Check root .env (should show your keys, not placeholders)
cat .env | grep -v "^#" | grep -v "^$"

# Check backend .env
cat feedprism_main/.env | grep -v "^#" | grep -v "^$"
```

---

## 8. Configure Firewall for External Qdrant Access

To allow Lamatic (or other external services) to connect to Qdrant, we need to open port 6333.

### Step 8.1: Create Firewall Rule via Console

🌍 **BROWSER** (GCP Console)
1. In GCP Console, go to **VPC Network** → **Firewall**
2. Click **+ CREATE FIREWALL RULE**

| Setting | Value |
|---------|-------|
| **Name** | `allow-qdrant` |
| **Network** | default |
| **Priority** | 1000 |
| **Direction** | Ingress |
| **Action** | Allow |
| **Targets** | Specified target tags |
| **Target tags** | `qdrant-server` |
| **Source filter** | IPv4 ranges |
| **Source IPv4 ranges** | `0.0.0.0/0` (or restrict to Lamatic's IP range for better security) |
| **Protocols and ports** | Specified: **tcp:6333,6334** |

Click **CREATE**.

### Step 8.2: Add Network Tag to VM

🌍 **BROWSER** (GCP Console)
1. Go to **Compute Engine** → **VM instances**
2. Click on `feedprism-demo`
3. Click **EDIT** at the top
4. Scroll to **Network tags**
5. Add: `qdrant-server`
6. Click **SAVE**

**Alternative: Via gcloud CLI:**

🖥️ **LOCAL**
```bash
# Add the network tag
gcloud compute instances add-tags feedprism-demo \
  --zone=us-central1-a \
  --tags=qdrant-server
```

---

## 9. Deploy with Docker Compose

**All commands in this section run on the VM (after SSH).**

### Step 9.1: Update docker-compose.yml for Qdrant Security

First, let's update the docker-compose.yml to add Qdrant API key:

🌐 **VM**
```bash
cd ~/feedprism

# View current docker-compose.yml
cat docker-compose.yml
```

**Edit the file:**

🌐 **VM**
```bash
nano docker-compose.yml
```

**Replace the entire content with:**

```yaml
version: '3.8'

services:
  # Qdrant Vector Database (with API key authentication)
  qdrant:
    image: qdrant/qdrant:latest
    container_name: feedprism-qdrant
    ports:
      - "6333:6333"  # REST API
      - "6334:6334"  # gRPC
    environment:
      - QDRANT__SERVICE__API_KEY=${QDRANT_API_KEY}
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # FastAPI Backend
  backend:
    build:
      context: ./feedprism_main
      dockerfile: Dockerfile
    container_name: feedprism-backend
    ports:
      - "8000:8000"
    environment:
      - QDRANT_HOST=qdrant
      - QDRANT_PORT=6333
      - QDRANT_API_KEY=${QDRANT_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DEMO_MODE=${DEMO_MODE:-true}
      - DEMO_USER_NAME=${DEMO_USER_NAME:-Demo User}
      - DEMO_USER_EMAIL=${DEMO_USER_EMAIL:-demo@feedprism.app}
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
    volumes:
      - ./feedprism_main/data:/app/data
    depends_on:
      qdrant:
        condition: service_healthy
    restart: unless-stopped

  # React Frontend (with nginx)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: feedprism-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  qdrant_data:
```

**Save: Ctrl+O, Enter, Ctrl+X**

### Step 9.2: Build and Start Services

🌐 **VM**
```bash
# Build all containers (this takes 3-5 minutes first time)
docker-compose build

# Start all services in detached mode
docker-compose up -d

# Watch the logs (Ctrl+C to exit logs, containers keep running)
docker-compose logs -f
```

### Step 9.3: Check Service Status

🌐 **VM**
```bash
docker-compose ps
```

**Expected output:**
```
NAME                  STATUS                   PORTS
feedprism-backend     Up X minutes             0.0.0.0:8000->8000/tcp
feedprism-frontend    Up X minutes             0.0.0.0:80->80/tcp
feedprism-qdrant      Up X minutes (healthy)   0.0.0.0:6333->6333/tcp, 0.0.0.0:6334->6334/tcp
```

---

## 10. Verify Deployment

### Step 10.1: Test Qdrant Health

🌐 **VM**
```bash
# From VM (internal - no API key needed)
curl http://localhost:6333/health
# Output: {"status":"ok"}

# Test with API key (as external client would)
curl -H "api-key: YOUR_QDRANT_API_KEY" http://localhost:6333/collections
# Output: {"result":{"collections":[]},"status":"ok","time":...}
```

### Step 10.2: Test Backend API

🌐 **VM**
```bash
curl http://localhost:8000/
# Output: {"name":"FeedPrism API","version":"1.0.0",...}

curl http://localhost:8000/api/demo/status
# Output: {"demo_mode":true}
```

### Step 10.3: Test Frontend

🌍 **BROWSER**

Open in browser: `http://YOUR_EXTERNAL_IP`

You should see the FeedPrism app with the demo banner!

### Step 10.4: Test External Qdrant Access

🖥️ **LOCAL** (from your local machine, NOT the VM)
```bash
# Replace with your actual values
curl -H "api-key: YOUR_QDRANT_API_KEY" http://YOUR_EXTERNAL_IP:6333/collections
# Output: {"result":{"collections":[]},"status":"ok","time":...}
```

If this works, Lamatic can connect to your Qdrant!

---

## 11. Connect Lamatic to Qdrant

### Lamatic Connection Settings

Use these settings in Lamatic's Qdrant integration:

| Setting | Value |
|---------|-------|
| **Host/URL** | `http://YOUR_EXTERNAL_IP:6333` |
| **API Key** | Your `QDRANT_API_KEY` from .env |
| **Collection** | `feedprism_emails` (or your preferred name) |

### Lamatic Headers

When making requests from Lamatic, include:

```
api-key: YOUR_QDRANT_API_KEY
```

### Test from Lamatic

1. In Lamatic, create a new Qdrant connection
2. Enter the host URL and API key
3. Test the connection - should succeed

### Create Collection for Lamatic (if needed)

If Lamatic needs to write to a specific collection:

🌐 **VM**
```bash
curl -X PUT "http://localhost:6333/collections/lamatic_data" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'
```

---

## 12. Maintenance & Updates

**All commands in this section run on the VM (after SSH).**

### Pull Latest Code and Redeploy

🌐 **VM**
```bash
cd ~/feedprism

# Pull latest changes
git pull origin main

# Rebuild and restart (only rebuilds changed containers)
docker-compose up -d --build
```

### View Logs

🌐 **VM**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f qdrant
docker-compose logs -f frontend
```

### Restart Services

🌐 **VM**
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop Everything

🌐 **VM**
```bash
docker-compose down
# Data persists in Docker volumes
```

### Stop and Remove All Data (⚠️ Destructive)

🌐 **VM**
```bash
docker-compose down -v
# This removes the qdrant_data volume!
```

### Check Disk Usage

🌐 **VM**
```bash
df -h
docker system df
```

### Clean Up Docker (if disk is full)

🌐 **VM**
```bash
# Remove unused images, containers, volumes
docker system prune -a --volumes
```

---

## 13. Troubleshooting

### Container Won't Start

🌐 **VM**
```bash
# Check logs for errors
docker-compose logs backend
docker-compose logs qdrant

# Common issues:
# - Missing environment variables → Check .env file
# - Port already in use → Check with: sudo lsof -i :8000
```

### Qdrant Connection Refused

🌐 **VM**
```bash
# Check if Qdrant is running
docker-compose ps qdrant

# Check Qdrant logs
docker-compose logs qdrant
```

🐳 **CONTAINER** (test from inside backend container)
```bash
docker-compose exec backend curl http://qdrant:6333/health
```

### External Qdrant Access Denied

🖥️ **LOCAL**
```bash
# Verify firewall rule exists
gcloud compute firewall-rules list --filter="name=allow-qdrant"

# Verify VM has the tag
gcloud compute instances describe feedprism-demo \
  --zone=us-central1-a \
  --format='get(tags.items)'
# Should include: qdrant-server
```

🌐 **VM**
```bash
# Test from VM with API key
curl -H "api-key: YOUR_QDRANT_API_KEY" http://localhost:6333/collections
```

### Frontend Can't Reach Backend

🌐 **VM**
```bash
# Check nginx logs
docker-compose logs frontend
```

🐳 **CONTAINER** (test from inside frontend container)
```bash
# Test backend from frontend container
docker-compose exec frontend curl http://backend:8000/

# Check nginx config
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

### Out of Memory

🌐 **VM**
```bash
# Check memory usage
free -h

# Check Docker memory
docker stats --no-stream
```

🖥️ **LOCAL** (upgrade VM - requires restart)
```bash
gcloud compute instances stop feedprism-demo --zone=us-central1-a
gcloud compute instances set-machine-type feedprism-demo \
  --zone=us-central1-a \
  --machine-type=e2-standard-2
gcloud compute instances start feedprism-demo --zone=us-central1-a
```

### Permission Denied (Docker)

🌐 **VM**
```bash
# Re-add user to docker group
sudo usermod -aG docker $USER

# Log out and back in
exit
# Then SSH back in
```

### Build Fails - No Space

🌐 **VM**
```bash
# Check disk
df -h

# Clean Docker
docker system prune -a
```

🌍 **BROWSER** (GCP Console)

If boot disk is full, resize in GCP Console → Compute Engine → Disks

---

## 14. Cost Estimate

| Resource | Specification | Monthly Cost |
|----------|---------------|--------------|
| VM (e2-medium) | 2 vCPU, 4GB RAM | ~$25 |
| Boot Disk | 30GB SSD | ~$3 |
| Network Egress | ~10GB | ~$1 |
| Static IP (if reserved) | Optional | ~$3 |
| **Total** | | **~$29-32/month** |

**Free Tier:** GCP offers $300 credit for 90 days - this covers ~10 months of this setup.

---

## Quick Reference

### URLs

| Service | URL |
|---------|-----|
| **FeedPrism App** | `http://YOUR_EXTERNAL_IP` |
| **Backend API** | `http://YOUR_EXTERNAL_IP:8000` |
| **Qdrant API** | `http://YOUR_EXTERNAL_IP:6333` |
| **Qdrant Dashboard** | `http://YOUR_EXTERNAL_IP:6333/dashboard` |

### SSH Commands

🖥️ **LOCAL**
```bash
gcloud compute ssh feedprism-demo --zone=us-central1-a
```

🌍 **BROWSER** - Click "SSH" button in GCP Console VM instances list

### Docker Commands

🌐 **VM**
```bash
cd ~/feedprism

docker-compose up -d        # Start
docker-compose down         # Stop
docker-compose restart      # Restart
docker-compose logs -f      # View logs
docker-compose ps           # Check status
docker-compose up -d --build # Rebuild and restart
```

### Share with Judges

```
🚀 FeedPrism Demo

App URL: http://YOUR_EXTERNAL_IP
API Docs: http://YOUR_EXTERNAL_IP:8000/docs

The app is in demo mode with pre-loaded newsletter data.
No login required - just explore!
```

---

## Security Notes

⚠️ **For Production (Post-Hackathon):**

1. **Add HTTPS** with Let's Encrypt (free SSL)
2. **Restrict Qdrant access** to specific IPs instead of `0.0.0.0/0`
3. **Use Secret Manager** for API keys instead of .env files
4. **Enable Cloud Armor** for DDoS protection
5. **Set up monitoring** with Cloud Logging

For hackathon demo, the current setup is sufficient.
