"""Vercel Serverless Function entrypoint for TerraGuardian AI FastAPI Backend."""

import os
import sys
from pathlib import Path

# Add api directory (containing app/) and services/api to sys.path
api_dir = Path(__file__).resolve().parent
for candidate in [api_dir, api_dir.parent / "services" / "api", api_dir.parent, api_dir.parent.parent.parent / "services" / "api"]:
    if candidate.exists() and str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

# Set default SQLite path in /tmp if running in serverless without DATABASE_URL
if os.environ.get("VERCEL") and not os.environ.get("DATABASE_URL"):
    os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:////tmp/terraguardian.db")

from app.main import app

# Export app for Vercel Python Serverless Runtime
handler = app
