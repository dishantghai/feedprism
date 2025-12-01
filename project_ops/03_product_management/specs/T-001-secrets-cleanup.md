# T-001: Git History Secrets Cleanup (Tech Debt)

**Status:** 🔲 Not Started  
**Priority:** P1 - High (Post-Hackathon)  
**Type:** Tech Debt / Security  
**Created:** December 1, 2025  
**Target:** After Hackathon Submission

---

## Problem Statement

The `.env` files containing sensitive API keys were accidentally committed to the git repository before `.gitignore` was properly configured. While the files are now gitignored, the secrets remain in git history and could be exposed.

### Affected Files
- `.env` (root)
- `junk/feedprism-poc/.env`

### Exposed Secrets (Potentially)
- `OPENAI_API_KEY`
- `QDRANT_API_KEY`
- Any other API keys or credentials

---

## Risk Assessment

| Risk | Severity | Likelihood |
|------|----------|------------|
| API key abuse | High | Medium |
| Unauthorized API charges | High | Medium |
| Data access via Qdrant | Medium | Low |

**Current Mitigation:** Repository is private (if applicable)

---

## Required Actions

### Phase 1: Immediate (Before Production)

1. **Remove from Git Tracking**
   ```bash
   git rm --cached .env
   git rm --cached junk/feedprism-poc/.env
   git commit -m "chore: Remove .env files from git tracking"
   ```

2. **Rotate All Exposed Keys**
   - [ ] OpenAI API Key - Regenerate at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - [ ] Qdrant API Key - Generate new key
   - [ ] Any other exposed credentials

3. **Update All Environments**
   - [ ] Local development `.env`
   - [ ] GCP VM `.env`
   - [ ] Any CI/CD secrets

### Phase 2: Git History Cleanup

**Option A: BFG Repo-Cleaner (Recommended)**
```bash
# Install BFG
brew install bfg

# Clone a fresh copy
git clone --mirror https://github.com/dishantghai/feedprism.git

# Remove .env files from history
bfg --delete-files .env feedprism.git

# Clean up
cd feedprism.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (⚠️ destructive - coordinate with team)
git push --force
```

**Option B: git filter-branch**
```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env junk/feedprism-poc/.env' \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

### Phase 3: Prevention

1. **Pre-commit Hook**
   ```bash
   # .git/hooks/pre-commit
   if git diff --cached --name-only | grep -qE '\.env$'; then
     echo "ERROR: Attempting to commit .env file!"
     exit 1
   fi
   ```

2. **GitHub Secret Scanning**
   - Enable in repository settings
   - Alerts on committed secrets

3. **Use Environment Variables**
   - GCP Secret Manager for production
   - Never commit secrets to repo

---

## Verification Checklist

- [ ] `.env` files removed from git tracking
- [ ] All API keys rotated
- [ ] New keys updated in all environments
- [ ] Git history cleaned (optional but recommended)
- [ ] Pre-commit hook installed
- [ ] Team notified of force push (if applicable)
- [ ] Verify app still works with new keys

---

## Timeline

| Task | When | Duration |
|------|------|----------|
| Remove from tracking | Immediate | 5 min |
| Rotate keys | Post-hackathon | 30 min |
| Update environments | Post-hackathon | 15 min |
| Git history cleanup | Post-hackathon | 1 hour |
| Prevention setup | Post-hackathon | 30 min |

---

## References

- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [GCP Secret Manager](https://cloud.google.com/secret-manager)
