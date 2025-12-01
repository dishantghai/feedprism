# LAMATIC-007: Documentation & README Update

**Story ID:** LAMATIC-007  
**Type:** Documentation  
**Priority:** P2  
**Estimate:** 20 minutes  
**Status:** To Do  
**Depends On:** LAMATIC-006 (Testing Complete)

---

## Overview

Update project documentation to reflect the Lamatic integration with bridge architecture.

---

## Documentation Tasks

### 1. Update Main README

Add a new section "Lamatic Integration" to the project README:

```markdown
## Lamatic Integration

FeedPrism integrates with Lamatic.ai for real-time email processing orchestration.

### Architecture

```
Gmail → Lamatic Flow → Bridge Service (port 8001) → FeedPrism → Qdrant
```

### Running the Bridge Service

\`\`\`bash
cd lamatic_bridge
pip install -r requirements.txt
python main.py
\`\`\`

Visit `http://localhost:8001/health` to verify.

### ngrok for Local Development

\`\`\`bash
ngrok http 8001
\`\`\`

Use the HTTPS URL in the Lamatic flow configuration.

### Environment Variables

Create `lamatic_bridge/.env`:
\`\`\`
FEEDPRISM_URL=http://localhost:8000
QDRANT_HOST=localhost
QDRANT_PORT=6333
BRIDGE_PORT=8001
\`\`\`
```

### 2. Create Architecture Diagram

Create `docs/lamatic-architecture.md` with:
- System diagram (Lamatic → Bridge → FeedPrism → Qdrant)
- Data flow explanation
- Why bridge architecture was chosen

### 3. Update Docker Compose

If using Docker, add bridge service to `docker-compose.yml`.

### 4. Add Troubleshooting Section

Common issues:
- Bridge not reachable from Lamatic
- Idempotency check not working
- Gmail trigger not firing

---

## Deliverables

- [ ] Updated project README with Lamatic section
- [ ] Architecture diagram in `docs/`
- [ ] Updated `docker-compose.yml` (if applicable)
- [ ] Troubleshooting guide

---

## Completion Criteria

- [ ] Documentation is clear and comprehensive
- [ ] New developer can set up Lamatic integration from docs
- [ ] All stories (LAMATIC-000 to LAMATIC-007) are marked complete
