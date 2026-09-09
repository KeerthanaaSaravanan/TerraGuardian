"""State transition service enforcing server-side lifecycle rules and authority boundaries."""

from __future__ import annotations

import uuid
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import IncidentModel
from app.domain.enums import ActorRole, AuditEventType, IncidentStatus
from app.domain.incident import is_valid_transition
from app.services.audit_service import AuditService
from app.services.exceptions import (
    InvalidTransitionError,
    PreconditionFailedError,
    UnauthorizedAuthorityError,
)
from app.services.incident_service import IncidentService


class StateTransitionService:
    """Authoritative server-side state machine engine."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.incident_service = IncidentService(session)
        self.audit_service = AuditService(session)

    async def transition(
        self,
        incident_id: uuid.UUID,
        target_status: IncidentStatus,
        actor_role: ActorRole,
        actor_name: str,
        reason: Optional[str] = None,
        authority_order_code: Optional[str] = None,
        context_payload: Optional[dict[str, Any]] = None,
    ) -> IncidentModel:
        """Execute and audit a validated state transition."""
        incident = await self.incident_service.get_by_id(incident_id)
        current_status = IncidentStatus(incident.status)

        # 1. State Machine Validity Check
        if not is_valid_transition(current_status, target_status):
            raise InvalidTransitionError(
                current_state=current_status.value,
                target_state=target_status.value,
                reason="Direct state jump is not permitted by the canonical state machine.",
            )

        # 2. Authority Boundary Guards
        if target_status == IncidentStatus.AUTHORIZED:
            if actor_role == ActorRole.SYSTEM_AI:
                raise UnauthorizedAuthorityError(
                    "AI/System actors cannot authorize safety-critical disaster orders. "
                    "Mandatory sign-off by a designated human official (Magistrate/DDMA) is required."
                )
            if not authority_order_code:
                raise PreconditionFailedError(
                    "Authorization requires an official disaster order reference code."
                )

        # 3. Precondition for RESOLVED
        if target_status == IncidentStatus.RESOLVED and current_status != IncidentStatus.MONITORING and current_status != IncidentStatus.REASSESSING:
            raise InvalidTransitionError(
                current_state=current_status.value,
                target_state=target_status.value,
                reason="Incidents can only transition to RESOLVED from MONITORING or REASSESSING after hazard mitigation.",
            )

        # 4. Mutate State
        previous_status_val = incident.status
        incident.status = target_status.value
        await self.session.flush()

        # 5. Append Audit Event
        payload = context_payload or {}
        if authority_order_code:
            payload["authority_order_code"] = authority_order_code

        await self.audit_service.record_event(
            incident_id=incident.id,
            event_type=AuditEventType.STATE_CHANGED,
            actor_role=actor_role,
            actor_name=actor_name,
            previous_state=previous_status_val,
            new_state=target_status.value,
            reason=reason or f"Transitioned to {target_status.value}",
            payload=payload,
        )

        return incident
