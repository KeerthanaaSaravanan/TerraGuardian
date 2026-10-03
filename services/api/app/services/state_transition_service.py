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
    DomainError,
    InvalidTransitionError,
    PreconditionFailedError,
    UnauthorizedAuthorityError,
)
from app.services.incident_service import IncidentService


CLOSURE_EVIDENCE_MAX_FRESHNESS_SECONDS: int = 21600  # 6.0 hours (Mandatory Project Policy)
REOPENING_MAX_EVIDENCE_AGE_SECONDS: int = 86400  # 24 hours (Mandatory Reopening Freshness Policy)


def is_material_evidence_change(
    source: str,
    raw_data: Optional[dict[str, Any]] = None,
    details: Optional[str] = None,
) -> tuple[bool, str]:
    """Authoritative evaluator determining whether incoming evidence represents a material physical hazard change."""
    data = raw_data or {}
    text = (details or "").lower()

    # Explicit flag
    if data.get("is_material") is True or data.get("reopening_trigger") is True:
        return True, "Explicit materiality trigger flag in evidence payload."

    # 1. Rainfall / Precipitation surge (>= 35.0 mm)
    rainfall_keys = ["rainfall_mm", "precipitation_mm", "rainfall_24h_mm", "accumulated_rain_mm"]
    if str(source).upper() in ("WEATHER", "IMD_RADAR", "RAIN_GAUGE"):
        rainfall_keys.append("value")
    for k in rainfall_keys:
        val = data.get(k)
        if val is not None:
            try:
                num = float(val)
                if num >= 35.0:
                    return True, f"Significant rainfall surge detected: {num:.1f} mm (threshold: 35.0 mm)."
            except (ValueError, TypeError):
                pass

    # 2. Soil moisture / saturation (>= 0.65 or >= 65%)
    sm_keys = ["soil_moisture", "saturation_ratio", "soil_saturation"]
    if "SOIL" in str(source).upper():
        sm_keys.append("value")
    for k in sm_keys:
        val = data.get(k)
        if val is not None:
            try:
                num = float(val)
                if num > 1.0:
                    num = num / 100.0
                if num >= 0.65:
                    return True, f"Critical soil moisture saturation detected: {num * 100.0:.1f}% (threshold: 65.0%)."
            except (ValueError, TypeError):
                pass

    # 3. Satellite InSAR / ground deformation rate (>= 15.0 mm/yr or displacement >= 10.0 mm)
    insar_keys = [
        "deformation_velocity_mm_yr",
        "displacement_rate_mm_yr",
        "los_velocity_mm_yr",
        "velocity_mm_yr",
        "displacement_mm",
    ]
    for k in insar_keys:
        val = data.get(k)
        if val is not None:
            try:
                num = abs(float(val))
                if num >= 15.0 or (k == "displacement_mm" and num >= 10.0):
                    return True, f"Critical satellite InSAR deformation rate: {num:.1f} mm (threshold: 15.0 mm/yr / 10.0 mm)."
            except (ValueError, TypeError):
                pass

    # 4. Sensor tiltmeter / inclinometer rate (>= 5.0 mm/day)
    tilt_keys = ["tilt_rate_mm_day", "tilt_rate_deg_day"]
    for k in tilt_keys:
        val = data.get(k)
        if val is not None:
            try:
                num = abs(float(val))
                if num >= 5.0:
                    return True, f"Sensor tilt rate exceeded safety envelope: {num:.1f} (threshold: 5.0)."
            except (ValueError, TypeError):
                pass

    # 5. Field observation physical destabilization keywords
    hazard_keywords = [
        "tension crack", "crack", "scarp", "slump", "subsidence", "debris",
        "rockfall", "toe bulge", "heave", "fissure", "slope breach", "rupture"
    ]
    matched_kw = [kw for kw in hazard_keywords if kw in text]
    if matched_kw:
        return True, f"Field report identified physical destabilization markers: {', '.join(matched_kw)}."

    return False, "Evidence parameters do not exceed physical materiality thresholds for hazard reopening."


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
            reason_text = "Direct state jump is not permitted by the canonical state machine."
            if target_status == IncidentStatus.RESOLVED:
                reason_text = "Closure blocked: " + reason_text
            raise InvalidTransitionError(
                current_state=current_status.value,
                target_state=target_status.value,
                reason=reason_text,
            )

        # 2. Authority Boundary & Transition Precondition Guards
        from app.domain.permissions import OperationalPermission, has_permission

        if target_status == IncidentStatus.VERIFIED:
            if actor_role in (ActorRole.SYSTEM_AI, "SYSTEM_AI"):
                raise UnauthorizedAuthorityError(
                    "AI/System actors cannot verify incident ground reality. "
                    "Verification requires a human domain specialist (e.g. GEOTECHNICAL_ENGINEER, OPERATOR)."
                )

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

        if target_status == IncidentStatus.REOPENED:
            if actor_role in (ActorRole.SYSTEM_AI, "SYSTEM_AI"):
                raise UnauthorizedAuthorityError(
                    "AI/System actors cannot authorize reopening a reviewed incident. "
                    "Reopening requires human official or authoritative verification."
                )
            if not reason:
                raise PreconditionFailedError(
                    "Reopening an incident requires a documented justification or reason."
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
        event_type = AuditEventType.STATE_CHANGED
        if target_status == IncidentStatus.REVIEWED:
            event_type = AuditEventType.INCIDENT_REVIEWED
        elif target_status == IncidentStatus.REOPENED:
            event_type = AuditEventType.INCIDENT_REOPENED
        elif target_status == IncidentStatus.RESOLVED:
            event_type = AuditEventType.RESOLUTION_RECORDED

        await self.audit_service.record_event(
            incident_id=incident.id,
            event_type=event_type,
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

    async def evaluate_reopening_eligibility(
        self,
        incident_id: uuid.UUID,
        source: EvidenceSource | str,
        interpretation: EvidenceInterpretation | str = EvidenceInterpretation.UNVERIFIED,
        freshness_seconds: Optional[int] = None,
        observed_at: Optional[datetime] = None,
        raw_data: Optional[dict[str, Any]] = None,
        details: Optional[str] = None,
        original_reference: Optional[str] = None,
    ) -> dict[str, Any]:
        """Evaluate whether incoming evidence meets the strict criteria for reopening a closed/reviewed incident.

        Mandatory 5-point Reopening Guardrails:
        1. Linkage: Associated directly with the closed/reviewed incident twin.
        2. Freshness: Evidence age <= 86,400s (24 hours) or observed after incident resolution.
        3. Credibility: Authoritative source (FIELD, SATELLITE, WEATHER, SENSOR, AUTHORITATIVE, or verified CITIZEN).
        4. Materiality: Demonstrable physical hazard change (rainfall >= 35mm, soil >= 0.65, InSAR >= 15mm/yr, crack/slump).
        5. Non-duplication: Not a duplicate of existing telemetry or field evidence.
        """
        incident = await self.incident_service.get_by_id(incident_id)
        current_status = IncidentStatus(incident.status)

        rejection_reasons: list[str] = []

        # 1. State check: Must be in RESOLVED or REVIEWED
        if current_status not in (IncidentStatus.RESOLVED, IncidentStatus.REVIEWED):
            rejection_reasons.append(
                f"Incident is in state '{current_status.value}'. Reopening evaluation only applies to RESOLVED or REVIEWED incidents."
            )

        # 2. Source Credibility check
        source_val = source.value if hasattr(source, "value") else str(source).upper()
        interp_val = interpretation.value if hasattr(interpretation, "value") else str(interpretation).upper()

        credible_sources = {
            EvidenceSource.FIELD.value,
            EvidenceSource.SATELLITE.value,
            EvidenceSource.WEATHER.value,
            EvidenceSource.SENSOR.value,
            "FIELD", "SATELLITE", "WEATHER", "SENSOR", "AUTHORITATIVE",
        }

        is_credible = False
        if source_val in credible_sources:
            is_credible = True
        elif source_val in (EvidenceSource.CITIZEN.value, "CITIZEN"):
            if interp_val in (EvidenceInterpretation.VERIFIED.value, "VERIFIED"):
                is_credible = True
            else:
                rejection_reasons.append(
                    "Unverified citizen evidence cannot reopen a closed or reviewed incident. Field or authoritative verification is mandatory."
                )
        else:
            rejection_reasons.append(
                f"Evidence source '{source_val}' is not recognized as a credible authoritative source for incident reopening."
            )

        # 3. Freshness check (<= 86,400s / 24h)
        now_utc = datetime.utcnow()
        calculated_age = freshness_seconds
        if calculated_age is None and observed_at is not None:
            obs_cmp = observed_at.replace(tzinfo=None) if observed_at.tzinfo else observed_at
            calculated_age = max(0, int((now_utc - obs_cmp).total_seconds()))

        is_fresh = False
        if calculated_age is not None:
            if 0 <= calculated_age <= REOPENING_MAX_EVIDENCE_AGE_SECONDS:
                is_fresh = True
            else:
                rejection_reasons.append(
                    f"Stale evidence rejected: Evidence age {calculated_age}s exceeds maximum allowable reopening threshold of {REOPENING_MAX_EVIDENCE_AGE_SECONDS}s (24h)."
                )
        else:
            rejection_reasons.append("Evidence lacks timestamp or freshness information for temporal validation.")

        # 4. Non-duplication check
        evidence_result = await self.session.execute(
            select(EvidenceModel).where(EvidenceModel.incident_id == incident_id)
        )
        existing_evidence = evidence_result.scalars().all()

        is_duplicate = False
        if original_reference:
            if any(e.original_reference == original_reference for e in existing_evidence):
                is_duplicate = True
                rejection_reasons.append(f"Duplicate evidence: original_reference '{original_reference}' already recorded for this incident.")

        if not is_duplicate and observed_at is not None:
            obs_cmp = observed_at.replace(tzinfo=None) if observed_at.tzinfo else observed_at
            for e in existing_evidence:
                e_obs = e.observed_at.replace(tzinfo=None) if (e.observed_at and e.observed_at.tzinfo) else e.observed_at
                if e.source == source_val and e_obs and abs((e_obs - obs_cmp).total_seconds()) < 1.0 and e.details == details:
                    is_duplicate = True
                    rejection_reasons.append("Duplicate evidence: identical observation already exists for this incident.")
                    break

        # 5. Materiality check
        is_material, mat_reason = is_material_evidence_change(source_val, raw_data, details)
        if not is_material:
            rejection_reasons.append(f"Materiality threshold not met: {mat_reason}")

        eligible = (
            len(rejection_reasons) == 0
            and is_credible
            and is_fresh
            and not is_duplicate
            and is_material
        )

        return {
            "eligible": eligible,
            "incident_id": incident_id,
            "current_status": current_status.value,
            "source_credible": is_credible,
            "fresh": is_fresh,
            "freshness_seconds": calculated_age,
            "non_duplicate": not is_duplicate,
            "material": is_material,
            "materiality_reason": mat_reason,
            "rejection_reasons": rejection_reasons,
        }

    async def reopen_incident(
        self,
        incident_id: uuid.UUID,
        triggering_evidence_id: Optional[uuid.UUID],
        actor_role: ActorRole,
        actor_name: str,
        reason: str,
        context_payload: Optional[dict[str, Any]] = None,
    ) -> IncidentModel:
        """Reopen a RESOLVED or REVIEWED incident twin upon receipt of fresh credible material evidence.

        PRESERVES INCIDENT TWIN IDENTITY:
        The incident retains its unique ID, incident code (e.g. TG-2048), history,
        and associated physical context. It does not spawn a disconnected duplicate.
        """
        incident = await self.incident_service.get_by_id(incident_id)
        current_status = IncidentStatus(incident.status)

        if current_status not in (IncidentStatus.RESOLVED, IncidentStatus.REVIEWED):
            raise DomainError(
                f"Incident {incident.code} cannot be reopened from state '{current_status.value}'. "
                "Only RESOLVED or REVIEWED incidents are eligible for reopening."
            )

        if actor_role in (ActorRole.SYSTEM_AI, "SYSTEM_AI"):
            raise UnauthorizedAuthorityError(
                "System AI cannot independently authorize reopening an incident. Human official or verified operational authority required."
            )

        # Update metadata to track reopening provenance
        meta = dict(incident.metadata_json or {})
        reopening_history = list(meta.get("reopening_history", []))
        reopening_entry = {
            "reopened_at": datetime.utcnow().isoformat(),
            "reopened_by": actor_name,
            "reopened_role": actor_role.value if hasattr(actor_role, "value") else str(actor_role),
            "previous_status": current_status.value,
            "reason": reason,
            "triggering_evidence_id": str(triggering_evidence_id) if triggering_evidence_id else None,
        }
        reopening_history.append(reopening_entry)
        meta["reopening_history"] = reopening_history
        meta["is_reopened"] = True
        meta["last_reopened_at"] = reopening_entry["reopened_at"]
        incident.metadata_json = meta
        await self.session.flush()

        if current_status == IncidentStatus.REVIEWED:
            # Transition: REVIEWED -> REOPENED
            incident = await self.transition(
                incident_id=incident_id,
                target_status=IncidentStatus.REOPENED,
                actor_role=actor_role,
                actor_name=actor_name,
                reason=reason,
                context_payload={"reopening_entry": reopening_entry, **(context_payload or {})},
            )
            # Transition: REOPENED -> REASSESSING
            incident = await self.transition(
                incident_id=incident_id,
                target_status=IncidentStatus.REASSESSING,
                actor_role=actor_role,
                actor_name=actor_name,
                reason="Progression to REASSESSING for fresh geotechnical hazard evaluation.",
                context_payload={"reopening_entry": reopening_entry, **(context_payload or {})},
            )
        elif current_status == IncidentStatus.RESOLVED:
            # Transition: RESOLVED -> REASSESSING directly
            incident = await self.transition(
                incident_id=incident_id,
                target_status=IncidentStatus.REASSESSING,
                actor_role=actor_role,
                actor_name=actor_name,
                reason=reason,
                context_payload={"reopening_entry": reopening_entry, **(context_payload or {})},
            )

        return incident

    # Backward compatibility alias
    transition_incident = transition

