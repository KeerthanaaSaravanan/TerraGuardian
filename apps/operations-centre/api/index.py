"""Vercel Serverless Function entrypoint for TerraGuardian AI FastAPI Backend."""

import os
import sys
from pathlib import Path

# Add operations-centre and services/api to sys.path
api_dir = Path(__file__).resolve().parent
ops_centre_dir = api_dir.parent

for p in [str(ops_centre_dir), str(ops_centre_dir / "app")]:
    if p not in sys.path:
        sys.path.insert(0, p)

for parent in [ops_centre_dir, *ops_centre_dir.parents]:
    services_api_dir = parent / "services" / "api"
    if services_api_dir.exists():
        if str(services_api_dir) not in sys.path:
            sys.path.insert(0, str(services_api_dir))
        break

# Serverless environment fallbacks
if os.environ.get("VERCEL"):
    if not os.environ.get("DATABASE_URL"):
        os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:////tmp/terraguardian.db")
    if not os.environ.get("ENVIRONMENT"):
        os.environ.setdefault("ENVIRONMENT", "production")

from app.main import app

handler = app
application = app
