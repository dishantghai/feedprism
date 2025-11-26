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
