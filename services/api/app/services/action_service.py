"""Authoritative Action service managing task states and ground confirmation evidence."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ActionConfirmationModel, ActionModel
from app.domain.action import can_confirm_action, is_valid_action_transition
from app.domain.enums import ActionState, ActorRole, AuditEventType
from app.services.audit_service import AuditService
from app.services.exceptions import (
    ActionNotFoundError,
    DomainError,
    InvalidTransitionError,
    PreconditionFailedError,
    UnauthorizedAuthorityError,
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

    async def create_action(
        self,
        incident_id: uuid.UUID,
        task_code: str,
        agency: str,
        title: str,
        description: str,
        assigned_to: str,
        is_action_gap_trigger: bool = False,
        actor_role: ActorRole = ActorRole.OPERATOR,
        actor_name: str = "Duty Dispatcher",
    ) -> ActionModel:
        """Create and persist a new operational response task."""
        await self.incident_service.get_by_id(incident_id)

        # Idempotency check: return existing if task_code matches within incident
        stmt = select(ActionModel).where(
            ActionModel.incident_id == incident_id,
            ActionModel.task_code == task_code,
        )
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        action = ActionModel(
            id=uuid.uuid4(),
            incident_id=incident_id,
            task_code=task_code,
            agency=agency,
            title=title,
            description=description,
            assigned_to=assigned_to,
            is_action_gap_trigger=is_action_gap_trigger,
            state=ActionState.PROPOSED.value,
        )
        self.session.add(action)
        await self.session.flush()

        await self.audit_service.record_event(
            incident_id=incident_id,
            event_type=AuditEventType.ACTION_UPDATED,
            actor_role=actor_role,
            actor_name=actor_name,
            previous_state=None,
            new_state=ActionState.PROPOSED.value,
            reason=f"Action {task_code} proposed: {title}",
            payload={"action_id": str(action.id), "task_code": task_code, "agency": agency},
        )
        return action

    async def update_action_state(
        self,
        action_id: uuid.UUID,
        target_state: ActionState,
        actor_role: ActorRole,
        actor_name: str,
        reason: Optional[str] = None,
        incident_id: Optional[uuid.UUID] = None,
    ) -> ActionModel:
        """Execute and audit a validated action state transition.
        
        Pattern: request → domain validation → state transition → persistence → audit event.
        """
        action = await self.get_action(action_id)
        current_state = ActionState(action.state)

        # 0a. Cross-Incident Ownership Guard
        if incident_id is not None and incident_id != action.incident_id:
            raise DomainError(
                f"Cross-incident action transition mismatch: Action '{action_id}' belongs to incident '{action.incident_id}', not '{incident_id}'."
            )

        # 0b. Explicit Confirmation Bypass Guard
        # PHYSICALLY_CONFIRMED is a protected terminal state reachable ONLY through confirm_action().
        if target_state == ActionState.PHYSICALLY_CONFIRMED:
            raise InvalidTransitionError(
                current_state=current_state.value,
                target_state=target_state.value,
                reason=(
                    "PHYSICALLY_CONFIRMED cannot be set via state transition. "
                    "Use POST /actions/{action_id}/confirmations with accepted field evidence."
                ),
            )

        # 0c. Server-Side Authority & RBAC Rules (Evaluated BEFORE idempotency to prevent unauthorized bypasses)
        if target_state == ActionState.APPROVED:
            if actor_role not in (ActorRole.OPERATOR, ActorRole.AUTHORIZED_DECISION_MAKER):
                raise UnauthorizedAuthorityError(
                    f"Action approval (APPROVED) requires OPERATOR or AUTHORIZED_DECISION_MAKER authority. "
                    f"Actor role '{actor_role.value}' is unauthorized."
                )
        elif target_state == ActionState.DISPATCHED:
            if actor_role not in (ActorRole.OPERATOR, ActorRole.AUTHORIZED_DECISION_MAKER):
                raise UnauthorizedAuthorityError(
                    f"Action dispatch requires OPERATOR or AUTHORIZED_DECISION_MAKER authority. "
                    f"Actor role '{actor_role.value}' is unauthorized."
                )
        elif target_state in (ActionState.ACKNOWLEDGED, ActionState.IN_PROGRESS, ActionState.COMPLETED):
            if actor_role in (ActorRole.PUBLIC_CITIZEN, ActorRole.SYSTEM_AI):
                raise UnauthorizedAuthorityError(
                    "Public citizens and AI actors are not authorized to mutate operational response tasks."
                )

        # 0d. Idempotency Check: authorized repeated identical state change is a safe no-op
        if current_state == target_state:
            return action

        # 1. Transition Validity Check
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
        audit_event_type = (
            AuditEventType.ACTION_DISPATCHED
            if target_state == ActionState.DISPATCHED
            else AuditEventType.ACTION_UPDATED
        )
        await self.audit_service.record_event(
            incident_id=action.incident_id,
            event_type=audit_event_type,
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
        incident_id: Optional[uuid.UUID] = None,
    ) -> ActionConfirmationModel:
        """Record accepted confirmation evidence and transition action to PHYSICALLY_CONFIRMED.
        
        APPROVED ≠ COMPLETED
        COMPLETED ≠ PHYSICALLY_CONFIRMED
        """
        action = await self.get_action(action_id)
        current_state = ActionState(action.state)

        # 0a. Cross-Incident Ownership Guard
        if incident_id is not None and incident_id != action.incident_id:
            raise DomainError(
                f"Cross-incident confirmation mismatch: Action '{action_id}' belongs to incident '{action.incident_id}', not '{incident_id}'."
            )

        # 0b. Idempotency & Conflicting Replay Check
        if current_state == ActionState.PHYSICALLY_CONFIRMED:
            stmt = (
                select(ActionConfirmationModel)
                .where(ActionConfirmationModel.action_id == action.id)
                .order_by(ActionConfirmationModel.confirmed_at.desc())
            )
            res = await self.session.execute(stmt)
            existing_conf = res.scalar_one_or_none()
            if existing_conf:
                same_location = existing_conf.location_confirmed.strip().lower() == location_confirmed.strip().lower()
                same_officer = existing_conf.confirming_officer.strip().lower() == confirming_officer.strip().lower()
                if same_location and same_officer:
                    return existing_conf
                raise DomainError(
                    "Conflicting confirmation replay: Action is already physically confirmed with differing location or officer."
                )

        # 1. State Validity: Only dispatched/active/completed actions can be confirmed
        if not can_confirm_action(current_state):
            raise InvalidTransitionError(
                current_state=current_state.value,
                target_state=ActionState.PHYSICALLY_CONFIRMED.value,
                reason=(
                    f"Action in state '{current_state.value}' cannot be confirmed. "
                    "Only dispatched, acknowledged, in-progress, or completed actions can receive physical ground confirmation."
                ),
            )

        # 2. Mandatory Evidence Validation
        if not location_confirmed or len(location_confirmed.strip()) < 3:
            raise PreconditionFailedError("Physical confirmation requires a valid location_confirmed (min 3 characters).")
        if not confirmation_notes or len(confirmation_notes.strip()) < 5:
            raise PreconditionFailedError("Physical confirmation requires detailed confirmation_notes (min 5 characters).")
        if not confirming_officer or not confirming_officer.strip():
            raise PreconditionFailedError("Physical confirmation requires a valid confirming_officer name.")

        now = datetime.utcnow()
        action.state = ActionState.PHYSICALLY_CONFIRMED.value
        action.confirmed_at = now

        # 3. Create Confirmation Record
        confirmation = ActionConfirmationModel(
            id=uuid.uuid4(),
            action_id=action.id,
            incident_id=action.incident_id,
            confirming_officer=confirming_officer.strip(),
            confirming_agency=confirming_agency.strip() if confirming_agency else "West Kameng Field Unit",
            communication_channel=communication_channel,
            location_confirmed=location_confirmed.strip(),
            confirmed_at=now,
            confirmation_notes=confirmation_notes.strip(),
            evidence_photo_url=evidence_photo_url,
        )
        self.session.add(confirmation)
        await self.session.flush()

        # 4. Record Audit Event
        await self.audit_service.record_event(
            incident_id=action.incident_id,
            event_type=AuditEventType.ACTION_CONFIRMED,
            actor_role=ActorRole.FIELD_VERIFIER,
            actor_name=confirming_officer.strip(),
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
