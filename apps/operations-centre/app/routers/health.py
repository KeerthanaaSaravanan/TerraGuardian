"""Health check endpoint."""

import logging
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.config import settings
from app.db.session import get_session_factory

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
    version: str
    environment: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Verify backend and database operational readiness."""
    db_status = "ok"
    overall_status = "ok"
    try:
        factory = get_session_factory()
        async with factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        db_status = "unavailable"
        overall_status = "degraded"

    return HealthResponse(
        status=overall_status,
        service="terraguardian-api",
        database=db_status,
        version="0.0.1",
        environment=settings.environment,
    )

