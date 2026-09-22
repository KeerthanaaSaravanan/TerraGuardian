"""State transition service enforcing server-side lifecycle rules and authority boundaries."""

from __future__ import annotations

import uuid
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ActionModel, EvidenceModel, IncidentModel
from app.domain.enums import (
    ActionState,
    ActorRole,
    AuditEventType,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceSource,
    IncidentStatus,
)
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

        # 3. Evidentiary Closure Gate (RESOLVED preconditions)
        if target_status == IncidentStatus.RESOLVED:
            # 3a. Source-state restriction
            if current_status not in (IncidentStatus.MONITORING, IncidentStatus.REASSESSING):
                raise InvalidTransitionError(
                    current_state=current_status.value,
                    target_state=target_status.value,
                    reason="Incidents can only be RESOLVED from MONITORING or REASSESSING after hazard mitigation.",
                )

            # 3b. Mandatory AUTHORIZED_DECISION_MAKER actor
            if actor_role != ActorRole.AUTHORIZED_DECISION_MAKER:
                raise UnauthorizedAuthorityError(
                    "Closure to RESOLVED requires an AUTHORIZED_DECISION_MAKER (Magistrate/DDMA). "
                    f"Actor role '{actor_role.value}' is insufficient."
                )

            # 3c. All dispatched actions must be PHYSICALLY_CONFIRMED
            active_states = {
                ActionState.DISPATCHED.value,
                ActionState.ACKNOWLEDGED.value,
                ActionState.IN_PROGRESS.value,
                ActionState.COMPLETED.value,
            }
            actions_result = await self.session.execute(
                select(ActionModel).where(ActionModel.incident_id == incident_id)
            )
            all_actions = actions_result.scalars().all()
            unconfirmed = [a for a in all_actions if a.state in active_states]
            if unconfirmed:
                codes = ", ".join(a.task_code for a in unconfirmed)
                raise PreconditionFailedError(
                    f"Closure blocked: {len(unconfirmed)} action(s) are not yet PHYSICALLY_CONFIRMED: {codes}. "
                    "All dispatched actions must be confirmed by field personnel before an incident can be resolved."
                )

            # 3d. No unresolved CONFLICTED evidence
            evidence_result = await self.session.execute(
                select(EvidenceModel).where(EvidenceModel.incident_id == incident_id)
            )
            all_evidence = evidence_result.scalars().all()
            conflicted = [
                e for e in all_evidence
                if e.conflict_status == EvidenceConflictStatus.CONFLICTED.value
                and e.interpretation != EvidenceInterpretation.REJECTED.value
            ]
            if conflicted:
                raise PreconditionFailedError(
                    f"Closure blocked: {len(conflicted)} evidence item(s) have unresolved conflicts. "
                    "Reconcile all conflicting evidence before resolving the incident."
                )

            # 3e. At least one VERIFIED FIELD evidence required
            verified_field = [
                e for e in all_evidence
                if e.source == EvidenceSource.FIELD.value
                and e.interpretation == EvidenceInterpretation.VERIFIED.value
            ]
            if not verified_field:
                raise PreconditionFailedError(
                    "Closure blocked: At least one FIELD evidence item with interpretation VERIFIED is required "
                    "before an incident can be resolved. Submit and verify field patrol evidence first."
                )

            # 3f. Outcome Engine Closure Verification
            # An unmitigated outcome (OBSERVATION_GAP, RESIDUAL_HAZARD, INTERVENTION_CONDITIONED_NON_EVENT)
            # strictly forbids closure without verified stabilization.
            from app.services.outcome_service import OutcomeService
            outcome_svc = OutcomeService(self.session)
            latest_outcome = await outcome_svc.get_latest_outcome(incident_id)
            if latest_outcome and not latest_outcome.closure_permitted:
                raise PreconditionFailedError(
                    f"Closure blocked by Outcome Engine: Current outcome is '{latest_outcome.outcome_type.value}'. "
                    "EVENT ABSENCE ≠ HAZARD RESOLUTION. Incident cannot be closed without verified geotechnical stabilization."
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
