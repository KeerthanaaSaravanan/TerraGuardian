"""Vercel Serverless Function for /api/v1/health."""

import os
import sys
from pathlib import Path

v1_dir = Path(__file__).resolve().parent
api_dir = v1_dir.parent
root_dir = api_dir.parent if api_dir.name != "TerraGuardian" else api_dir
services_api_dir = root_dir / "services" / "api"
zip_path = services_api_dir / "app_bundle.zip"

for p in [str(services_api_dir), str(zip_path), str(root_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

if os.environ.get("VERCEL") and not os.environ.get("DATABASE_URL"):
    os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:////tmp/terraguardian.db")

from app.main import app

handler = app
