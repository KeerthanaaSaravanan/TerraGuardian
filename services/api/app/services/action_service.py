"""Authoritative Action service managing task states and ground confirmation evidence."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ActionConfirmationModel, ActionModel
from app.domain.action import is_valid_action_transition
from app.domain.enums import ActionState, ActorRole, AuditEventType
from app.services.audit_service import AuditService
from app.services.exceptions import (
    ActionNotFoundError,
    DomainError,
    InvalidTransitionError,
    PreconditionFailedError,
)
from app.services.incident_service import IncidentService


class ActionService:
    """Service managing operational action states and accepted confirmation evidence."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.incident_service = IncidentService(session)
        self.audit_service = AuditService(session)

    async def get_action(self, action_id: uuid.UUID) -> ActionModel:
        """Fetch an action by ID."""
        stmt = select(ActionModel).where(ActionModel.id == action_id)
        result = await self.session.execute(stmt)
        action = result.scalar_one_or_none()
        if not action:
            raise ActionNotFoundError(f"Action with ID {action_id} not found.")
        return action

    async def list_actions_for_incident(self, incident_id: uuid.UUID) -> list[ActionModel]:
        """Fetch all operational tasks for an incident."""
        await self.incident_service.get_by_id(incident_id)
        stmt = (
            select(ActionModel)
            .where(ActionModel.incident_id == incident_id)
            .order_by(ActionModel.task_code.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_action_state(
        self,
        action_id: uuid.UUID,
        target_state: ActionState,
        actor_role: ActorRole,
        actor_name: str,
        reason: Optional[str] = None,
    ) -> ActionModel:
        """Execute and audit a validated action state transition.
        
        Pattern: request → domain validation → state transition → persistence → audit event.
        """
        action = await self.get_action(action_id)
        current_state = ActionState(action.state)

        # 0. Explicit Confirmation Bypass Guard
        # PHYSICALLY_CONFIRMED is a protected terminal state reachable ONLY through confirm_action().
        # Calling update_action_state() with this target is a protocol violation.
        if target_state == ActionState.PHYSICALLY_CONFIRMED:
            raise InvalidTransitionError(
                current_state=current_state.value,
                target_state=target_state.value,
                reason=(
                    "PHYSICALLY_CONFIRMED cannot be set via state transition. "
                    "Use POST /actions/{action_id}/confirmations with accepted field evidence."
                ),
            )

        # 1. Transition Validity
        if not is_valid_action_transition(current_state, target_state):
            raise InvalidTransitionError(
                current_state=current_state.value,
                target_state=target_state.value,
                reason=f"Action cannot transition from '{current_state.value}' to '{target_state.value}'.",
            )

        # 2. Mutate State & Timestamp
        previous_state_val = action.state
        action.state = target_state.value
        now = datetime.utcnow()

        if target_state == ActionState.DISPATCHED:
            action.dispatched_at = now
        elif target_state == ActionState.ACKNOWLEDGED:
            action.acknowledged_at = now
        elif target_state == ActionState.COMPLETED:
            action.completed_at = now

        await self.session.flush()

        # 3. Append Audit Event
        await self.audit_service.record_event(
            incident_id=action.incident_id,
            event_type=AuditEventType.ACTION_UPDATED,
            actor_role=actor_role,
            actor_name=actor_name,
            previous_state=previous_state_val,
            new_state=target_state.value,
            reason=reason or f"Action {action.task_code} transitioned to {target_state.value}",
            payload={"action_id": str(action.id), "task_code": action.task_code},
        )

        return action

    async def confirm_action(
        self,
        action_id: uuid.UUID,
        confirming_officer: str,
        confirming_agency: str,
        location_confirmed: str,
        confirmation_notes: str,
        communication_channel: str = "TETRA_RADIO",
        evidence_photo_url: Optional[str] = None,
        is_simulated: bool = False,
    ) -> ActionConfirmationModel:
        """Record accepted confirmation evidence and transition action to PHYSICALLY_CONFIRMED.
        
        APPROVED ≠ COMPLETED
        COMPLETED ≠ PHYSICALLY_CONFIRMED
        """
        action = await self.get_action(action_id)
        current_state = ActionState(action.state)

        # Transition action state
        if not is_valid_action_transition(current_state, ActionState.PHYSICALLY_CONFIRMED):
            raise InvalidTransitionError(
                current_state=current_state.value,
                target_state=ActionState.PHYSICALLY_CONFIRMED.value,
                reason=f"Action in state '{current_state.value}' cannot be confirmed.",
            )

        now = datetime.utcnow()
        action.state = ActionState.PHYSICALLY_CONFIRMED.value
        action.confirmed_at = now

        # Create confirmation record
        confirmation = ActionConfirmationModel(
            id=uuid.uuid4(),
            action_id=action.id,
            incident_id=action.incident_id,
            confirming_officer=confirming_officer,
            confirming_agency=confirming_agency,
            communication_channel=communication_channel,
            location_confirmed=location_confirmed,
            confirmed_at=now,
            confirmation_notes=confirmation_notes,
            evidence_photo_url=evidence_photo_url,
        )
        self.session.add(confirmation)
        await self.session.flush()

        # Record audit event
        await self.audit_service.record_event(
            incident_id=action.incident_id,
            event_type=AuditEventType.ACTION_CONFIRMED,
            actor_role=ActorRole.FIELD_VERIFIER,
            actor_name=confirming_officer,
            previous_state=current_state.value,
            new_state=ActionState.PHYSICALLY_CONFIRMED.value,
            reason=f"Accepted confirmation evidence for {action.task_code} from {confirming_officer} ({confirming_agency})",
            payload={
                "action_id": str(action.id),
                "task_code": action.task_code,
                "channel": communication_channel,
                "location": location_confirmed,
                "is_simulated": is_simulated,
            },
        )

        return confirmation
