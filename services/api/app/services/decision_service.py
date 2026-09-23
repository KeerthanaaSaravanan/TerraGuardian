"""Authoritative Decision service managing statutory human magistrate sign-offs and determinations."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import DecisionModel
from app.domain.enums import ActorRole, AuditEventType
from app.services.audit_service import AuditService
from app.services.exceptions import (
    DomainError,
    IncidentNotFoundError,
    PreconditionFailedError,
    UnauthorizedAuthorityError,
)
from app.services.incident_service import IncidentService


class DecisionService:
    """Service managing statutory determinations enacted by designated human officials."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.incident_service = IncidentService(session)
        self.audit_service = AuditService(session)

    async def get_decision(self, decision_id: uuid.UUID) -> DecisionModel:
        """Fetch a statutory decision by ID."""
        stmt = select(DecisionModel).where(DecisionModel.id == decision_id)
        result = await self.session.execute(stmt)
        decision = result.scalar_one_or_none()
        if not decision:
            raise DomainError(f"Decision with ID {decision_id} not found.")
        return decision

    async def list_decisions_for_incident(self, incident_id: uuid.UUID) -> list[DecisionModel]:
        """Fetch all statutory determinations enacted for an incident."""
        await self.incident_service.get_by_id(incident_id)
        stmt = (
            select(DecisionModel)
            .where(DecisionModel.incident_id == incident_id)
            .order_by(DecisionModel.enacted_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_decision(
        self,
        incident_id: uuid.UUID,
        decision_type: str,
        action_directive: str,
        order_code: str,
        rationale: str,
        proposed_measures: Optional[list[str]] = None,
        signer_role: ActorRole = ActorRole.AUTHORIZED_DECISION_MAKER,
        signer_name: str = "P. Tsering, IAS",
    ) -> DecisionModel:
        """Enact and audit a statutory human determination for an incident.
        
        INVARIANT:
        AI RECOMMENDS → HUMAN AUTHORIZES.
        Only AUTHORIZED_DECISION_MAKER (Magistrate / DDMA Chairperson) can enact statutory orders.
        """
        await self.incident_service.get_by_id(incident_id)

        # 1. Authority Guard
        if signer_role != ActorRole.AUTHORIZED_DECISION_MAKER:
            raise UnauthorizedAuthorityError(
                f"Statutory determination sign-off requires AUTHORIZED_DECISION_MAKER role. "
                f"Actor role '{signer_role.value}' is unauthorized."
            )

        # 2. Strict Input Validation
        if not order_code or not order_code.strip():
            raise PreconditionFailedError("Statutory decision requires an official order_code reference.")
        if not action_directive or not action_directive.strip():
            raise PreconditionFailedError("Statutory decision requires a non-empty action_directive.")
        if not rationale or not rationale.strip():
            raise PreconditionFailedError("Statutory decision requires a non-empty rationale.")
        if not signer_name or not signer_name.strip():
            raise PreconditionFailedError("Statutory decision requires a valid signer_name.")

        clean_order_code = order_code.strip()

        # 3. Idempotency Check: if order_code already enacted for this incident, return existing
        stmt = select(DecisionModel).where(
            DecisionModel.incident_id == incident_id,
            DecisionModel.order_code == clean_order_code,
        )
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        # 4. Enact Decision
        now = datetime.utcnow()
        clean_measures = [m.strip() for m in (proposed_measures or []) if m and m.strip()]

        decision = DecisionModel(
            id=uuid.uuid4(),
            incident_id=incident_id,
            decision_type=decision_type.upper().strip(),
            action_directive=action_directive.strip(),
            signer_name=signer_name.strip(),
            signer_role=signer_role.value,
            order_code=clean_order_code,
            rationale=rationale.strip(),
            proposed_measures=clean_measures,
            enacted_at=now,
        )
        self.session.add(decision)
        await self.session.flush()

        # 5. Append Audit Event
        await self.audit_service.record_event(
            incident_id=incident_id,
            event_type=AuditEventType.DECISION_MADE,
            actor_role=signer_role,
            actor_name=signer_name.strip(),
            previous_state=None,
            new_state=decision.decision_type,
            reason=f"Statutory order {clean_order_code} enacted: {action_directive.strip()}",
            payload={
                "decision_id": str(decision.id),
                "order_code": clean_order_code,
                "decision_type": decision.decision_type,
                "proposed_measures": clean_measures,
            },
        )

        return decision
