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


class VercelPathAdapter:
    """Ensure incoming paths forwarded from Vercel rewrites match FastAPI route definitions."""
    def __init__(self, inner_app):
        self.inner_app = inner_app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            orig_uri = (
                headers.get(b"x-forwarded-uri")
                or headers.get(b"x-original-url")
                or headers.get(b"x-real-path")
                or headers.get(b"x-matched-path")
            )
            if orig_uri:
                raw_path = orig_uri.decode("utf-8").split("?")[0]
                if raw_path.startswith("/api"):
                    scope["path"] = raw_path

        await self.inner_app(scope, receive, send)


handler = VercelPathAdapter(app)
