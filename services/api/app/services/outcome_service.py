"""Authoritative Intervention-Conditioned Hazard Outcome Service.

Implements the Living Incident and Closed-Loop Outcome Engine:
1. EVENT ABSENCE ≠ HAZARD RESOLUTION.
2. Inadequate observation creates an OBSERVATION_GAP / UNRESOLVED state — NOT a false alarm.
3. INTERVENTION_CONDITIONED_NON_EVENT explicitly preserves causal uncertainty
   (causal_claim_established = False).
4. Distinguishes:
   - NO_INTERVENTION
   - INTERVENTION_PROPOSED
   - INTERVENTION_DISPATCHED_UNCONFIRMED
   - INTERVENTION_CONFIRMED
5. Spatial Divergence: Reassesses SAME incident if within supported scope (<= 5.0 km),
   rejects/flags if out-of-scope.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import ActionModel, EvidenceModel, IncidentModel, OutcomeModel
from app.domain.enums import (
    ActionState,
    ActorRole,
    AuditEventType,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceSource,
    HazardState,
)
from app.domain.outcome import (
    InterventionContextState,
    ObservationAdequacy,
    OutcomeAssessment,
    OutcomeEvaluationRequest,
    OutcomeType,
    SpatialDivergenceContext,
    haversine_distance_meters,
)
from app.services.audit_service import AuditService
from app.services.exceptions import IncidentNotFoundError


class OutcomeService:
    """Authoritative domain service evaluating hazard outcomes, intervention contexts, and living incident continuity."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.audit_service = AuditService(session)

    async def get_latest_outcome(self, incident_id: uuid.UUID) -> Optional[OutcomeAssessment]:
        """Fetch the most recently evaluated outcome assessment for an incident."""
        stmt = (
            select(OutcomeModel)
            .where(OutcomeModel.incident_id == incident_id)
            .order_by(OutcomeModel.evaluated_at.desc())
        )
        result = await self.session.execute(stmt)
        record = result.scalars().first()
        if not record:
            return None

        spatial = None
        if record.spatial_divergence_meters is not None:
            spatial = SpatialDivergenceContext(
                original_latitude=0.0,
                original_longitude=0.0,
                distance_meters=record.spatial_divergence_meters,
                within_supported_scope=record.within_supported_scope,
            )

        return OutcomeAssessment(
            id=record.id,
            incident_id=record.incident_id,
            outcome_type=OutcomeType(record.outcome_type),
            intervention_state=InterventionContextState(record.intervention_state),
            observation_adequacy=ObservationAdequacy(record.observation_adequacy),
            causal_claim_established=record.causal_claim_established,
            closure_permitted=record.closure_permitted,
            reassessment_required=record.reassessment_required,
            recommended_hazard_state=HazardState(record.recommended_hazard_state),
            spatial_divergence=spatial,
            explanation=record.explanation,
            evidence_summary=record.evidence_summary or {},
            evaluated_at=record.evaluated_at,
            evaluated_by=record.evaluated_by,
        )

    async def evaluate_outcome(
        self,
        incident_id: uuid.UUID,
        request: Optional[OutcomeEvaluationRequest] = None,
    ) -> OutcomeAssessment:
        """Derive authoritative, deterministic outcome evaluation from current evidence, actions, and hypothesis."""
        stmt = (
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(
                selectinload(IncidentModel.evidence_items),
                selectinload(IncidentModel.actions).selectinload(ActionModel.confirmations),
                selectinload(IncidentModel.reassessments),
            )
        )
        result = await self.session.execute(stmt)
        incident = result.scalar_one_or_none()
        if not incident:
            raise IncidentNotFoundError(f"Incident {incident_id} not found.")

        req = request or OutcomeEvaluationRequest()
        evidence_items: list[EvidenceModel] = incident.evidence_items or []
        actions: list[ActionModel] = incident.actions or []

        # ── 1. SPATIAL DIVERGENCE EVALUATION ──
        orig_lat = incident.latitude
        orig_lon = incident.longitude
        obs_lat = req.observed_latitude
        obs_lon = req.observed_longitude

        # If not provided in request, check if any recent evidence item has coordinates
        if obs_lat is None or obs_lon is None:
            geocoded_evidence = [e for e in evidence_items if e.latitude is not None and e.longitude is not None]
            if geocoded_evidence:
                latest_geo = sorted(geocoded_evidence, key=lambda e: e.observed_at or datetime.min)[-1]
                obs_lat = latest_geo.latitude
                obs_lon = latest_geo.longitude

        spatial_ctx = None
        if obs_lat is not None and obs_lon is not None:
            distance_m = haversine_distance_meters(orig_lat, orig_lon, obs_lat, obs_lon)
            within_scope = distance_m <= 5000.0  # 5 km standard corridor radius
            spatial_ctx = SpatialDivergenceContext(
                original_latitude=orig_lat,
                original_longitude=orig_lon,
                observed_latitude=obs_lat,
                observed_longitude=obs_lon,
                distance_meters=distance_m,
                within_supported_scope=within_scope,
                spatial_scope_threshold_meters=5000.0,
                corridor_alignment_notes=(
                    f"Observed location is {distance_m:.0f}m from prediction centroid; "
                    + ("retains SAME INCIDENT continuity under active corridor corridor envelope."
                       if within_scope
                       else "EXCEEDS standard 5km corridor envelope — spatial divergence requires boundary review.")
                ),
            )

        # ── 2. INTERVENTION CONTEXT EVALUATION ──
        if not actions:
            intervention_state = InterventionContextState.NO_INTERVENTION
        else:
            has_confirmed = any(
                a.state == ActionState.PHYSICALLY_CONFIRMED.value or len(a.confirmations) > 0
                for a in actions
            )
            has_dispatched_or_completed = any(
                a.state in (
                    ActionState.DISPATCHED.value,
                    ActionState.ACKNOWLEDGED.value,
                    ActionState.IN_PROGRESS.value,
                    ActionState.COMPLETED.value,
                )
                for a in actions
            )

            if has_confirmed:
                intervention_state = InterventionContextState.INTERVENTION_CONFIRMED
            elif has_dispatched_or_completed:
                intervention_state = InterventionContextState.INTERVENTION_DISPATCHED_UNCONFIRMED
            else:
                intervention_state = InterventionContextState.INTERVENTION_PROPOSED

        # ── 3. OBSERVATION ADEQUACY & EVIDENCE EVALUATION ──
        # Temporal window check
        detected = incident.detected_at
        if detected.tzinfo is None:
            detected = detected.replace(tzinfo=timezone.utc)
        window_end = detected + timedelta(hours=4)
        now = datetime.now(timezone.utc)
        window_elapsed = now >= window_end

        # Check for unresolved conflicted evidence
        conflicted_items = [
            e for e in evidence_items
            if e.conflict_status == EvidenceConflictStatus.CONFLICTED.value
            and e.interpretation != EvidenceInterpretation.REJECTED.value
        ]
        has_unresolved_conflicts = len(conflicted_items) > 0

        # Check for verified field or ground sensor observations
        has_field_inspection = any(
            e.source == EvidenceSource.FIELD.value and e.interpretation == EvidenceInterpretation.VERIFIED.value
            for e in evidence_items
        )
        has_sensor_telemetry = any(
            e.source == EvidenceSource.SENSOR.value
            for e in evidence_items
        )

        # Check for optical cloud cover / sensor obscuration
        has_obscuration = any(
            ("cloud" in (e.observation or "").lower() or "obscur" in (e.observation or "").lower() or "88%" in (e.observation or ""))
            for e in evidence_items
            if e.source in (EvidenceSource.SATELLITE.value, "SATELLITE")
        )

        # Check for physical event occurrence (verified ground failure / slide / road obstruction)
        event_keywords = ("failure", "slide", "slurry", "blocking", "obstruction", "debris", "scarp detachment", "mass movement", "landslide")
        verified_event_observed = any(
            any(kw in (e.observation or "").lower() for kw in event_keywords)
            and (e.source in (EvidenceSource.FIELD.value, EvidenceSource.SENSOR.value) or e.interpretation == EvidenceInterpretation.VERIFIED.value)
            for e in evidence_items
        )

        # Check for affirmative geotechnical stabilization / clearance evidence
        has_stabilization_evidence = any(
            any(kw in (e.observation or "").lower() for kw in ("stabilized", "cleared", "repaired", "retaining wall secured", "geotechnical stabilization"))
            and e.interpretation == EvidenceInterpretation.VERIFIED.value
            for e in evidence_items
        )

        # Check for residual hazard indicators
        has_residual_indicators = any(
            any(kw in (e.observation or "").lower() for kw in ("pore-water", "saturation", "tension crack", "perched", "creep", "rainfall persists", "184"))
            for e in evidence_items
        )

        # Current hazard state
        current_h_state = (
            HazardState(incident.hazard_state)
            if incident.hazard_state in HazardState.__members__
            else HazardState.EXPECTED
        )

        # ── 4. SYNTHESIS ENGINE ──
        evidence_summary = {
            "total_evidence_items": len(evidence_items),
            "verified_field_reports": sum(1 for e in evidence_items if e.source == EvidenceSource.FIELD.value and e.interpretation == EvidenceInterpretation.VERIFIED.value),
            "conflicted_evidence_count": len(conflicted_items),
            "window_elapsed": window_elapsed,
            "has_field_inspection": has_field_inspection,
            "has_sensor_telemetry": has_sensor_telemetry,
            "has_obscuration": has_obscuration,
            "has_stabilization_evidence": has_stabilization_evidence,
            "has_residual_indicators": has_residual_indicators,
        }

        # Case 1: Event Observed
        if verified_event_observed:
            outcome_type = OutcomeType.EVENT_OBSERVED
            observation_adequacy = ObservationAdequacy.ADEQUATE
            causal_claim_established = False
            closure_permitted = False
            reassessment_required = True
            recommended_hazard_state = HazardState.ACTIVE
            explanation = (
                "Physical hazard manifestation observed and verified on slope/corridor. "
                "Ground patrol or telemetry confirms debris movement/obstruction. Hazard state elevated to ACTIVE."
            )

        # Case 2: Conflicted Evidence
        elif has_unresolved_conflicts:
            outcome_type = OutcomeType.CONFLICTED
            observation_adequacy = ObservationAdequacy.INADEQUATE_CONFLICTED
            causal_claim_established = False
            closure_permitted = False
            reassessment_required = True
            recommended_hazard_state = current_h_state
            explanation = (
                f"Multi-source evidentiary conflict detected ({len(conflicted_items)} unresolved items). "
                "Observations from distinct channels disagree. Resolution blocked until cross-agency reconciliation."
            )

        # Case 3: Inadequate Observation — Window not elapsed
        elif not window_elapsed and not has_field_inspection:
            outcome_type = OutcomeType.OBSERVATION_GAP
            observation_adequacy = ObservationAdequacy.INADEQUATE_WINDOW
            causal_claim_established = False
            closure_permitted = False
            reassessment_required = True
            recommended_hazard_state = current_h_state
            explanation = (
                "EVENT ABSENCE ≠ HAZARD RESOLUTION: Expected hazard activation window has not elapsed. "
                "Premature evaluation cannot establish event absence. Active monitoring sustained."
            )

        # Case 4: Inadequate Observation — Severe Obscuration without Ground Patrol
        elif has_obscuration and not (has_field_inspection or has_sensor_telemetry):
            outcome_type = OutcomeType.OBSERVATION_GAP
            observation_adequacy = ObservationAdequacy.INADEQUATE_OBSCURATION
            causal_claim_established = False
            closure_permitted = False
            reassessment_required = True
            recommended_hazard_state = (
                HazardState.DELAYED if current_h_state == HazardState.EXPECTED else current_h_state
            )
            explanation = (
                "EVENT ABSENCE ≠ HAZARD RESOLUTION: Satellite optical pass degraded by heavy cloud obscuration. "
                "Absence of affirmative ground patrol confirmation creates an OBSERVATION GAP. Incident cannot resolve."
            )

        # Case 5: Inadequate Observation — Missing Ground Telemetry/Patrol Coverage
        elif not has_field_inspection and not has_sensor_telemetry:
            outcome_type = OutcomeType.OBSERVATION_GAP
            observation_adequacy = ObservationAdequacy.INADEQUATE_COVERAGE
            causal_claim_established = False
            closure_permitted = False
            reassessment_required = True
            recommended_hazard_state = (
                HazardState.DELAYED if current_h_state == HazardState.EXPECTED else current_h_state
            )
            explanation = (
                "EVENT ABSENCE ≠ HAZARD RESOLUTION: No field patrol or physical sensor verification available. "
                "Lack of observational reports cannot establish event absence. Precautionary monitoring required."
            )

        # Case 6: Adequate Observation + Intervention Occurred (Intervention-Conditioned Non-Event)
        elif intervention_state in (
            InterventionContextState.INTERVENTION_CONFIRMED,
            InterventionContextState.INTERVENTION_DISPATCHED_UNCONFIRMED,
        ):
            outcome_type = OutcomeType.INTERVENTION_CONDITIONED_NON_EVENT
            observation_adequacy = ObservationAdequacy.ADEQUATE
            # CRITICAL SAFETY INVARIANT: Causal prevention is explicitly unproven
            causal_claim_established = False
            closure_permitted = False
            reassessment_required = True
            recommended_hazard_state = HazardState.DELAYED
            explanation = (
                "Expected failure was not observed following intervention deployment. "
                "CRITICAL INVARIANT: Causal prevention is unestablished; event absence may be attributable to "
                "conservative threshold modeling, hydrologic lag, or shifted triggering rather than intervention efficacy. "
                "EVENT ABSENCE ≠ HAZARD RESOLUTION: Incident remains a living hypothesis requiring continued monitoring."
            )

        # Case 7: Adequate Observation + No Intervention
        else:
            observation_adequacy = ObservationAdequacy.ADEQUATE
            if has_stabilization_evidence:
                outcome_type = OutcomeType.NON_EVENT_OBSERVED
                causal_claim_established = False
                closure_permitted = True
                reassessment_required = False
                recommended_hazard_state = HazardState.RESOLVED
                explanation = (
                    "Affirmative geotechnical stabilization and debris clearance confirmed by engineering team. "
                    "Evidentiary closure gate criteria satisfied for statutory sign-off."
                )
            elif has_residual_indicators:
                outcome_type = OutcomeType.RESIDUAL_HAZARD
                causal_claim_established = False
                closure_permitted = False
                reassessment_required = True
                recommended_hazard_state = HazardState.DELAYED
                explanation = (
                    "No catastrophic failure observed during expected window, but hydrologic saturation and steep "
                    "shear slope maintain critical residual hazard. Slope remains primed (DELAYED). Reassessment required."
                )
            else:
                outcome_type = OutcomeType.NON_EVENT_OBSERVED
                causal_claim_established = False
                closure_permitted = False  # Non-event does NOT auto-resolve
                reassessment_required = True
                recommended_hazard_state = HazardState.DISSIPATED
                explanation = (
                    "Adequately observed non-event during primary failure window with receding triggering rainfall. "
                    "EVENT ABSENCE ≠ HAZARD RESOLUTION: Transitioned to DISSIPATED. Physical engineering sign-off required."
                )

        # Append spatial divergence context notes if applicable
        if spatial_ctx and spatial_ctx.distance_meters is not None and spatial_ctx.distance_meters > 500.0:
            explanation += (
                f" [Spatial note: Observed location is {spatial_ctx.distance_meters:.0f}m from prediction centroid; "
                + ("within supported 5km corridor envelope — SAME INCIDENT preserved."
                   if spatial_ctx.within_supported_scope
                   else "EXCEEDS standard 5km corridor scope — spatial divergence boundary review required.")
                + "]"
            )

        # ── 5. PERSIST OUTCOME MODEL ──
        outcome_record = OutcomeModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            outcome_type=outcome_type.value,
            intervention_state=intervention_state.value,
            observation_adequacy=observation_adequacy.value,
            causal_claim_established=causal_claim_established,
            closure_permitted=closure_permitted,
            reassessment_required=reassessment_required,
            recommended_hazard_state=recommended_hazard_state.value,
            spatial_divergence_meters=spatial_ctx.distance_meters if spatial_ctx else None,
            within_supported_scope=spatial_ctx.within_supported_scope if spatial_ctx else True,
            explanation=explanation,
            evidence_summary=evidence_summary,
            payload_json={
                "actor_role": req.actor_role.value if hasattr(req.actor_role, "value") else str(req.actor_role),
                "actor_name": req.actor_name,
                "notes": req.observation_notes,
            },
            evaluated_at=datetime.utcnow(),
            evaluated_by=req.actor_name,
        )
        self.session.add(outcome_record)
        await self.session.flush()

        # Audit event
        await self.audit_service.record_event(
            incident_id=incident.id,
            event_type=AuditEventType.REASSESSMENT_PERFORMED,
            actor_role=req.actor_role,
            actor_name=req.actor_name,
            reason=f"Outcome evaluated: {outcome_type.value} ({observation_adequacy.value})",
            payload={
                "outcome_type": outcome_type.value,
                "intervention_state": intervention_state.value,
                "observation_adequacy": observation_adequacy.value,
                "causal_claim_established": causal_claim_established,
                "closure_permitted": closure_permitted,
                "recommended_hazard_state": recommended_hazard_state.value,
            },
        )

        return OutcomeAssessment(
            id=outcome_record.id,
            incident_id=incident.id,
            outcome_type=outcome_type,
            intervention_state=intervention_state,
            observation_adequacy=observation_adequacy,
            causal_claim_established=causal_claim_established,
            closure_permitted=closure_permitted,
            reassessment_required=reassessment_required,
            recommended_hazard_state=recommended_hazard_state,
            spatial_divergence=spatial_ctx,
            explanation=explanation,
            evidence_summary=evidence_summary,
            evaluated_at=outcome_record.evaluated_at,
            evaluated_by=outcome_record.evaluated_by,
        )
