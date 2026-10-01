"""Forwarder for Vercel functions if invoked from apps/operations-centre workspace."""

import os
import sys
from pathlib import Path

current = Path(__file__).resolve().parent
for parent in [current, *current.parents]:
    if (parent / "services" / "api").exists():
        services_api_dir = parent / "services" / "api"
        if str(services_api_dir) not in sys.path:
            sys.path.insert(0, str(services_api_dir))
        if str(parent) not in sys.path:
            sys.path.insert(0, str(parent))
        break

if os.environ.get("VERCEL"):
    if not os.environ.get("DATABASE_URL"):
        os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:////tmp/terraguardian.db")
    if not os.environ.get("ENVIRONMENT"):
        os.environ.setdefault("ENVIRONMENT", "production")

from app.main import app

handler = app
application = app
