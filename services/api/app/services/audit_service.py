"""Audit service for append-oriented domain record keeping."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditEventModel
from app.domain.enums import ActorRole, AuditEventType


class AuditService:
    """Service handling append-only audit trail operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def record_event(
        self,
        incident_id: uuid.UUID,
        event_type: AuditEventType,
        actor_role: ActorRole,
        actor_name: str,
        actor_id: str | None = None,
        previous_state: str | None = None,
        new_state: str | None = None,
        reason: str | None = None,
        payload: dict[str, Any] | None = None,
        created_at: datetime | None = None,
    ) -> AuditEventModel:
        """Record an append-oriented relational database audit event."""
        event = AuditEventModel(
            id=uuid.uuid4(),
            incident_id=incident_id,
            event_type=event_type.value if hasattr(event_type, "value") else str(event_type),
            actor_role=actor_role.value if hasattr(actor_role, "value") else str(actor_role),
            actor_name=actor_name,
            actor_id=actor_id,
            previous_state=previous_state,
            new_state=new_state,
            reason=reason,
            payload=payload or {},
            created_at=created_at or datetime.utcnow(),
        )
        self.session.add(event)
        await self.session.flush()
        return event

    async def get_incident_timeline(self, incident_id: uuid.UUID) -> list[AuditEventModel]:
        """Fetch all chronological audit events for an incident."""
        stmt = (
            select(AuditEventModel)
            .where(AuditEventModel.incident_id == incident_id)
            .order_by(AuditEventModel.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
