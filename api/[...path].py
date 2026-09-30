"""Vercel Serverless Function catch-all for TerraGuardian AI FastAPI Backend."""

import os
import sys
from pathlib import Path

# Add services/api to sys.path so app and its submodules can be resolved
api_dir = Path(__file__).resolve().parent
root_dir = api_dir.parent
services_api_dir = root_dir / "services" / "api"

for p in [str(services_api_dir), str(root_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

if os.environ.get("VERCEL") and not os.environ.get("DATABASE_URL"):
    os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:////tmp/terraguardian.db")

from app.main import app

# Export app for Vercel Python Serverless Runtime
handler = app
