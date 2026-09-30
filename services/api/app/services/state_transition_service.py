"""State transition service enforcing server-side lifecycle rules and authority boundaries."""

from __future__ import annotations

import uuid
from datetime import datetime
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
        from app.domain.permissions import OperationalPermission, has_permission

        if target_status == IncidentStatus.AUTHORIZED:
            if actor_role in (ActorRole.SYSTEM_AI, "SYSTEM_AI"):
                raise UnauthorizedAuthorityError(
                    "AI/System actors cannot authorize safety-critical disaster orders. "
                    "Statutory authorization authority (AUTHORIZE_ACTION) by a human official is mandatory."
                )
            if not has_permission(actor_role, OperationalPermission.AUTHORIZE_ACTION):
                raise UnauthorizedAuthorityError(
                    "Transition to AUTHORIZED requires statutory authorization authority (AUTHORIZE_ACTION). "
                    f"Actor role '{actor_role.value if hasattr(actor_role, 'value') else actor_role}' is unauthorized."
                )
            if not authority_order_code:
                raise PreconditionFailedError(
                    "Authorization requires an official disaster order reference code."
                )

        if target_status == IncidentStatus.REVIEWED:
            if not has_permission(actor_role, OperationalPermission.REVIEW):
                raise UnauthorizedAuthorityError(
                    "Transition to REVIEWED requires REVIEW permission. "
                    f"Actor role '{actor_role.value if hasattr(actor_role, 'value') else actor_role}' is unauthorized."
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

            # 3b. Mandatory AUTHORIZATION_OFFICER actor
            if not has_permission(actor_role, OperationalPermission.AUTHORIZE_ACTION):
                raise UnauthorizedAuthorityError(
                    "Closure to RESOLVED requires an AUTHORIZATION_OFFICER (Magistrate/DDMA). "
                    f"Actor role '{actor_role.value if hasattr(actor_role, 'value') else actor_role}' is insufficient."
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

        # 4. Mutate State & Produce Structured Closure Assessment if target is RESOLVED
        previous_status_val = incident.status
        incident.status = target_status.value

        payload = context_payload or {}
        if authority_order_code:
            payload["authority_order_code"] = authority_order_code

        if target_status == IncidentStatus.RESOLVED:
            closure_assessment_data = {
                "closure_status": "RESOLVED",
                "authorized_by": actor_name,
                "authorized_role": actor_role.value if hasattr(actor_role, "value") else str(actor_role),
                "authority_order_code": authority_order_code,
                "closed_at": datetime.utcnow().isoformat(),
                "outcome": latest_outcome.outcome_type.value if latest_outcome else "RESOLVED_CONTROLLED",
                "remaining_uncertainty": (
                    "Superficial stabilization and debris clearance confirmed; deep sub-surface pore-water dissipation "
                    "and shear boundary relaxation remain uninstrumented."
                ),
                "residual_hazard": (
                    "RESIDUAL_MONITORING: Operational closure does NOT imply geotechnical hazard extinction. "
                    "Slope remains susceptible to extreme hydrologic recharge."
                ),
                "follow_up_requirements": [
                    "Periodic slope scarp visual inspection by PWD/BRO maintenance patrol",
                    "Continuous rain gauge monitoring during subsequent monsoon surges",
                    "Annual post-monsoon geotechnical slope stability audit",
                ],
                "critical_semantic_notice": "OPERATIONAL INCIDENT CLOSURE ≠ GEOTECHNICAL HAZARD EXTINCTION",
            }
            payload["closure_assessment"] = closure_assessment_data

            meta = dict(incident.metadata_json or {})
            meta["closure_assessment"] = closure_assessment_data
            incident.metadata_json = meta

        await self.session.flush()

        # 5. Append Audit Event
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


    async def evaluate_closure_gate(
        self,
        incident_id: uuid.UUID,
        actor_role: Optional[ActorRole] = None,
        authority_order_code: Optional[str] = None,
    ) -> dict[str, Any]:
        """Inspect and report on all 9 operational closure preconditions without mutating state.
        
        CRITICAL SEMANTIC PRINCIPLE:
        OPERATIONAL INCIDENT CLOSURE ≠ GEOTECHNICAL HAZARD EXTINCTION.
        A closed incident means operational response requirements have been satisfied;
        it does NOT establish slope stability or geological hazard elimination.
        """
        from app.domain.permissions import OperationalPermission, has_permission
        from app.services.outcome_service import OutcomeService

        incident = await self.incident_service.get_by_id(incident_id)
        current_status = IncidentStatus(incident.status)
        unmet_conditions: list[str] = []

        # 1. State check
        state_is_reassessing = current_status == IncidentStatus.REASSESSING
        if not state_is_reassessing:
            unmet_conditions.append(
                f"Incident is currently in state '{current_status.value}'. "
                "Operational closure can only be evaluated from REASSESSING."
            )

        # 2. Authority role check
        role_authorized = False
        if actor_role is not None:
            if actor_role in (ActorRole.SYSTEM_AI, "SYSTEM_AI"):
                unmet_conditions.append("AI/System actors have ZERO authorization authority for incident closure.")
            elif has_permission(actor_role, OperationalPermission.AUTHORIZE_ACTION):
                role_authorized = True
            else:
                unmet_conditions.append(
                    f"Actor role '{actor_role.value if hasattr(actor_role, 'value') else actor_role}' is not authorized. "
                    "Closure requires statutory sign-off by AUTHORIZATION_OFFICER."
                )
        else:
            unmet_conditions.append("Actor identity and role required for closure evaluation.")

        # 3. Order code check
        order_code_provided = bool(authority_order_code and authority_order_code.strip())
        if not order_code_provided:
            unmet_conditions.append("Statutory resolution order code is missing or empty.")

        # 4. Dispatched actions confirmation check
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
        all_actions_confirmed = len(unconfirmed) == 0
        if not all_actions_confirmed:
            codes = ", ".join(f"{a.task_code} ({a.state})" for a in unconfirmed)
            unmet_conditions.append(f"Incomplete action execution: {len(unconfirmed)} action(s) are not PHYSICALLY_CONFIRMED: {codes}.")

        # 5. Conflicted evidence check
        evidence_result = await self.session.execute(
            select(EvidenceModel).where(EvidenceModel.incident_id == incident_id)
        )
        all_evidence = evidence_result.scalars().all()
        conflicted = [
            e for e in all_evidence
            if e.conflict_status == EvidenceConflictStatus.CONFLICTED.value
            and e.interpretation != EvidenceInterpretation.REJECTED.value
        ]
        no_conflicted = len(conflicted) == 0
        if not no_conflicted:
            unmet_conditions.append(f"Unresolved evidence conflict: {len(conflicted)} conflicting evidence items pending reconciliation.")

        # 6. Verified field evidence presence check
        verified_field = [
            e for e in all_evidence
            if e.source == EvidenceSource.FIELD.value
            and e.interpretation == EvidenceInterpretation.VERIFIED.value
        ]
        has_verified_field = len(verified_field) > 0
        if not has_verified_field:
            unmet_conditions.append("Missing verified fresh field evidence: At least one FIELD evidence item with interpretation VERIFIED is required.")

        # 7. Field evidence freshness check (<= 21,600s / 6 hours)
        fresh_verified_field = [
            e for e in verified_field
            if e.freshness_seconds is not None
            and 0 <= e.freshness_seconds <= CLOSURE_EVIDENCE_MAX_FRESHNESS_SECONDS
        ]
        field_evidence_fresh = len(fresh_verified_field) > 0
        min_age = min((e.freshness_seconds for e in verified_field if e.freshness_seconds is not None), default=None)
        if has_verified_field and not field_evidence_fresh:
            age_str = f"{min_age:.0f}s" if min_age is not None else "UNKNOWN"
            unmet_conditions.append(
                f"Stale field evidence: Age is {age_str} (exceeds policy limit of {CLOSURE_EVIDENCE_MAX_FRESHNESS_SECONDS}s / 6.0h). "
                "Fresh ground patrol verification is mandatory."
            )

        # 8. Outcome Engine validation
        outcome_svc = OutcomeService(self.session)
        latest_outcome = await outcome_svc.get_latest_outcome(incident_id)
        outcome_permits = False
        outcome_type_str = None
        outcome_not_stale = False

        if not latest_outcome:
            unmet_conditions.append("Outcome Engine: No authoritative outcome evaluation exists for this incident.")
        else:
            outcome_type_str = latest_outcome.outcome_type.value
            outcome_permits = latest_outcome.closure_permitted
            if not outcome_permits:
                unmet_conditions.append(
                    f"Outcome Engine rejects closure: Current outcome is '{outcome_type_str}'. "
                    "EVENT ABSENCE ≠ HAZARD RESOLUTION. Verified geotechnical clearance is required."
                )

            latest_eval_time = (
                latest_outcome.evaluated_at.replace(tzinfo=None)
                if latest_outcome.evaluated_at.tzinfo
                else latest_outcome.evaluated_at
            )
            has_newer_evidence = any(
                (e.received_at.replace(tzinfo=None) if e.received_at.tzinfo else e.received_at) > latest_eval_time
                for e in all_evidence
            )
            outcome_not_stale = not has_newer_evidence
            if has_newer_evidence:
                unmet_conditions.append("Outcome Engine: Subsequent evidence has arrived since the last evaluation. Reassessment required.")

        closure_permitted = (
            state_is_reassessing
            and role_authorized
            and order_code_provided
            and all_actions_confirmed
            and no_conflicted
            and has_verified_field
            and field_evidence_fresh
            and outcome_permits
            and outcome_not_stale
        )

        residual_hazard_detected = (
            incident.risk_score >= 60.0
            or (latest_outcome is not None and latest_outcome.outcome_type.value == "RESIDUAL_HAZARD")
        )

        return {
            "incident_id": incident.id,
            "current_status": current_status.value,
            "closure_permitted": closure_permitted,
            "unmet_conditions": unmet_conditions,
            "critical_semantic_notice": "OPERATIONAL INCIDENT CLOSURE ≠ GEOTECHNICAL HAZARD EXTINCTION",
            "residual_hazard_detected": residual_hazard_detected,
            "gate_checks": {
                "state_is_reassessing": state_is_reassessing,
                "actor_role_authorized": role_authorized,
                "authority_order_code_provided": order_code_provided,
                "all_actions_physically_confirmed": all_actions_confirmed,
                "unconfirmed_actions_count": len(unconfirmed),
                "unconfirmed_actions_list": [a.task_code for a in unconfirmed],
                "no_unresolved_conflicted_evidence": no_conflicted,
                "conflicted_evidence_count": len(conflicted),
                "has_verified_field_evidence": has_verified_field,
                "field_evidence_fresh": field_evidence_fresh,
                "field_evidence_age_seconds": min_age,
                "outcome_permits_closure": outcome_permits,
                "current_outcome_type": outcome_type_str,
                "outcome_not_stale": outcome_not_stale,
            },
        }

    # Backward compatibility alias
    transition_incident = transition
