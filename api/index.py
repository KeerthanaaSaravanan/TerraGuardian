"""Vercel Serverless Function entrypoint for TerraGuardian AI FastAPI Backend."""

import os
import sys
from pathlib import Path

# Robustly find repository root and services/api
current = Path(__file__).resolve().parent
root_dir = current
for parent in [current, *current.parents]:
    if (parent / "services" / "api").exists() or (parent / "package.json").exists():
        root_dir = parent
        break

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

# Export app under all standard ASGI entrypoint names for Vercel
handler = app
application = app
