# FeedPrism Deployment Guide (Google Cloud VM)

## Quick Deploy (15 minutes)

### Prerequisites
- Google Cloud account with billing enabled (or $300 free credit)
- Domain name (optional - can use VM's external IP)

---

## Step 1: Create GCP VM

```bash
# Create a VM (e2-medium: 2 vCPU, 4GB RAM - ~$25/month)
gcloud compute instances create feedprism-demo \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --tags=http-server,https-server

# Allow HTTP/HTTPS traffic
gcloud compute firewall-rules create allow-http \
  --allow tcp:80,tcp:443,tcp:8000 \
  --target-tags=http-server
```

---

## Step 2: SSH into VM and Install Docker

```bash
# SSH into the VM
gcloud compute ssh feedprism-demo --zone=us-central1-a

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for group changes
exit
```

---

## Step 3: Clone and Configure

```bash
# SSH back in
gcloud compute ssh feedprism-demo --zone=us-central1-a

# Clone your repo
git clone https://github.com/YOUR_USERNAME/feedprism.git
cd feedprism

# Create .env file
cat > .env << 'EOF'
OPENAI_API_KEY=sk-your-openai-api-key
QDRANT_HOST=qdrant
QDRANT_PORT=6333
DEMO_MODE=true
EOF

# Copy Gmail credentials (if using real Gmail integration)
# scp credentials.json token.json to the VM
```

---

## Step 4: Deploy

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## Step 5: Access Your App

Get your VM's external IP:
```bash
gcloud compute instances describe feedprism-demo \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

Open in browser: `http://YOUR_EXTERNAL_IP`

---

## Optional: Add HTTPS with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate (replace with your domain)
sudo certbot --nginx -d feedprism.yourdomain.com
```

---

## Useful Commands

```bash
# Restart services
docker-compose restart

# View backend logs
docker-compose logs -f backend

# Stop everything
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Check Qdrant health
curl http://localhost:6333/health
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Missing OPENAI_API_KEY
# - credentials.json not found (set DEMO_MODE=true)
```

### Frontend can't reach backend
```bash
# Check if backend is running
curl http://localhost:8000/

# Check nginx config
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

### Out of memory (PyTorch is heavy)
```bash
# Upgrade to e2-standard-2 (2 vCPU, 8GB RAM)
gcloud compute instances set-machine-type feedprism-demo \
  --zone=us-central1-a \
  --machine-type=e2-standard-2
```

---

## Cost Estimate

| Resource | Monthly Cost |
|----------|-------------|
| e2-medium VM | ~$25 |
| 30GB SSD | ~$3 |
| Network egress | ~$1 |
| **Total** | **~$29/month** |

*First 90 days free with $300 GCP credit*
