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


CLOSURE_EVIDENCE_MAX_FRESHNESS_SECONDS: int = 21600  # 6.0 hours (Mandatory Project Policy)


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
            reason = "Direct state jump is not permitted by the canonical state machine."
            if target_status == IncidentStatus.RESOLVED:
                reason = "Closure blocked: " + reason
            raise InvalidTransitionError(
                current_state=current_status.value,
                target_state=target_status.value,
                reason=reason,
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
            # 3a. Source-state restriction: MUST be REASSESSING (no direct jump from MONITORING)
            if current_status != IncidentStatus.REASSESSING:
                raise InvalidTransitionError(
                    current_state=current_status.value,
                    target_state=target_status.value,
                    reason="Closure blocked: Incidents can only be RESOLVED from REASSESSING following outcome assessment and hazard reassessment. Direct closure from MONITORING or operational states is forbidden.",
                )

            # 3b. Mandatory AUTHORIZED_DECISION_MAKER actor
            if actor_role != ActorRole.AUTHORIZED_DECISION_MAKER:
                raise UnauthorizedAuthorityError(
                    "Closure to RESOLVED requires an AUTHORIZED_DECISION_MAKER (Magistrate/DDMA). "
                    f"Actor role '{actor_role.value}' is insufficient."
                )

            # 3c. Order code required
            if not authority_order_code:
                raise PreconditionFailedError(
                    "Closure requires an official resolution order reference code (e.g. ORD-CLOSURE-xxx)."
                )

            # 3d. All dispatched actions must be PHYSICALLY_CONFIRMED
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

            # 3e. No unresolved CONFLICTED evidence
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

            # 3f. At least one FRESH VERIFIED FIELD evidence required (freshness <= 21,600s / 6 hours, non-negative)
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

            fresh_verified_field = [
                e for e in verified_field
                if e.freshness_seconds is not None
                and 0 <= e.freshness_seconds <= CLOSURE_EVIDENCE_MAX_FRESHNESS_SECONDS
            ]
            if not fresh_verified_field:
                min_age = min((e.freshness_seconds for e in verified_field if e.freshness_seconds is not None), default=None)
                age_str = f"{min_age}s" if min_age is not None else "UNKNOWN"
                raise PreconditionFailedError(
                    f"Closure blocked: Verified FIELD evidence is stale, negative, or has unknown freshness (age: {age_str}, "
                    f"max allowable: {CLOSURE_EVIDENCE_MAX_FRESHNESS_SECONDS}s / 6.0h). "
                    "A fresh ground patrol verification report is mandatory before an incident can be resolved."
                )

            # 3g. Outcome Engine Closure Verification
            # An authoritative outcome assessment MUST exist, MUST permit closure,
            # and CANNOT be stale relative to subsequent evidence arrivals.
            from app.services.outcome_service import OutcomeService
            outcome_svc = OutcomeService(self.session)
            latest_outcome = await outcome_svc.get_latest_outcome(incident_id)
            if not latest_outcome:
                raise PreconditionFailedError(
                    "Closure blocked by Outcome Engine: No authoritative outcome evaluation has been performed. "
                    "An incident cannot be closed without an evaluated outcome permitting closure."
                )
            if not latest_outcome.closure_permitted:
                raise PreconditionFailedError(
                    f"Closure blocked by Outcome Engine: Current outcome is '{latest_outcome.outcome_type.value}'. "
                    "EVENT ABSENCE ≠ HAZARD RESOLUTION. Incident cannot be closed without verified geotechnical stabilization clearance."
                )

            latest_eval_time = (
                latest_outcome.evaluated_at.replace(tzinfo=None)
                if latest_outcome.evaluated_at.tzinfo
                else latest_outcome.evaluated_at
            )
            stale_eval = any(
                (e.received_at.replace(tzinfo=None) if e.received_at.tzinfo else e.received_at) > latest_eval_time
                for e in all_evidence
            )
            if stale_eval:
                raise PreconditionFailedError(
                    "Closure blocked by Outcome Engine: New evidence has been received since the last outcome evaluation. "
                    "Reassessment is mandatory before closure can be authorized."
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

    # Backward compatibility alias
    transition_incident = transition
