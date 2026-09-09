"""Incident Twin domain service for retrieval and queries."""

from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import IncidentModel
from app.domain.enums import IncidentStatus
from app.services.audit_service import AuditService
from app.services.exceptions import IncidentNotFoundError


class IncidentService:
    """Service managing authoritative Incident Twin records."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.audit_service = AuditService(session)

    async def get_by_id(self, incident_id: uuid.UUID) -> IncidentModel:
        """Fetch incident by primary UUID."""
        stmt = (
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(
                selectinload(IncidentModel.evidence_items),
                selectinload(IncidentModel.decisions),
                selectinload(IncidentModel.actions),
            )
        )
        result = await self.session.execute(stmt)
        incident = result.scalar_one_or_none()
        if not incident:
            raise IncidentNotFoundError(f"Incident with ID {incident_id} not found.")
        return incident

    async def get_by_code(self, code: str) -> Optional[IncidentModel]:
        """Fetch incident by operational code (e.g., TG-2048)."""
        stmt = (
            select(IncidentModel)
            .where(IncidentModel.code == code)
            .options(
                selectinload(IncidentModel.evidence_items),
                selectinload(IncidentModel.decisions),
                selectinload(IncidentModel.actions),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_incidents(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[IncidentStatus] = None,
    ) -> tuple[list[IncidentModel], int]:
        """List incidents with pagination and optional status filter."""
        stmt = select(IncidentModel)
        if status:
            stmt = stmt.where(IncidentModel.status == status.value if hasattr(status, "value") else str(status))

        # Total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.session.execute(count_stmt)).scalar() or 0

        # Items
        items_stmt = (
            stmt.order_by(IncidentModel.updated_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.session.execute(items_stmt)
        items = list(result.scalars().all())

        return items, total
