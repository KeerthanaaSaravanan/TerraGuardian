"""Vercel Serverless Function catch-all for TerraGuardian AI FastAPI Backend."""

import os
import sys
from pathlib import Path

# Add services/api and repository root to sys.path so app and its submodules can be resolved
api_dir = Path(__file__).resolve().parent
root_dir = api_dir.parent if api_dir.name != "TerraGuardian" else api_dir
services_api_dir = root_dir / "services" / "api"

for p in [str(services_api_dir), str(root_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Serverless environment fallbacks
if os.environ.get("VERCEL"):
    if not os.environ.get("DATABASE_URL"):
        os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:////tmp/terraguardian.db")
    if not os.environ.get("ENVIRONMENT"):
        os.environ.setdefault("ENVIRONMENT", "production")

from app.main import app

# Export app under all standard ASGI entrypoint names
handler = app
application = app
