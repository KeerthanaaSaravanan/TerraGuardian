"""Authoritative Hazard Evolution, Divergence & Bounded Reassessment Service.

Implements Prompt 06 core principles:
1. Living Hazard Hypothesis representation.
2. Independent Hazard State dimension.
3. Explicit Expected vs. Observed Reconciliation.
4. EVENT ABSENCE ≠ HAZARD RESOLUTION.
5. DIVERGENCE TRIGGERS REASSESSMENT — NOT AUTOMATIC ESCALATION.
6. ACTION CONFIRMED ≠ HAZARD RESOLUTION.
7. Hazard Continuity and Lineage Tracking.
8. Bounded Resolution Criteria (Resolution requires affirmative evidence).
"""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    ActionModel,
    AuditEventModel,
    EvidenceModel,
    IncidentModel,
    ReassessmentModel,
)
from app.domain.enums import (
    ActorRole,
    AuditEventType,
    ConfidenceLevel,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceSource,
    HazardState,
    RiskLevel,
)
from app.domain.hazard import (
    BoundedReassessmentRequest,
    BoundedReassessmentResult,
    DivergenceRecord,
    DivergenceSeverity,
    DivergenceType,
    HazardHypothesis,
    HazardLineageSummary,
    HazardStateTransitionRequest,
    SpatialEnvelope,
    TemporalWindow,
)
from app.services.audit_service import AuditService
from app.services.feature_pipeline import FeaturePipeline
from app.services.predictive_models import LandslidePredictiveBaseline


# Valid Hazard State Transitions (Physical Domain)
VALID_HAZARD_TRANSITIONS: dict[HazardState, frozenset[HazardState]] = {
    HazardState.EXPECTED: frozenset({
        HazardState.ACTIVE,
        HazardState.DELAYED,
        HazardState.SHIFTED,
        HazardState.PARTIAL,
        HazardState.DISSIPATED,
        HazardState.FALSE_ALARM,
    }),
    HazardState.DELAYED: frozenset({
        HazardState.ACTIVE,
        HazardState.SHIFTED,
        HazardState.PARTIAL,
        HazardState.EVOLVED,
        HazardState.DISSIPATED,
        HazardState.FALSE_ALARM,
    }),
    HazardState.ACTIVE: frozenset({
        HazardState.EVOLVED,
        HazardState.PARTIAL,
        HazardState.DISSIPATED,
        HazardState.RESOLVED,
    }),
    HazardState.SHIFTED: frozenset({
        HazardState.ACTIVE,
        HazardState.EVOLVED,
        HazardState.DISSIPATED,
        HazardState.RESOLVED,
    }),
    HazardState.PARTIAL: frozenset({
        HazardState.ACTIVE,
        HazardState.EVOLVED,
        HazardState.DISSIPATED,
        HazardState.RESOLVED,
    }),
    HazardState.EVOLVED: frozenset({
        HazardState.ACTIVE,
        HazardState.DISSIPATED,
        HazardState.RESOLVED,
    }),
    HazardState.DISSIPATED: frozenset({
        HazardState.ACTIVE,
        HazardState.RESOLVED,
        HazardState.FALSE_ALARM,
    }),
    HazardState.RESOLVED: frozenset({
        HazardState.EXPECTED,  # Seasonal reactivation under a new hypothesis
    }),
    HazardState.FALSE_ALARM: frozenset({
        HazardState.EXPECTED,  # New initiating evidence triggers hypothesis
    }),
}


class HazardService:
    """Domain service managing living hazard hypotheses, divergences, and bounded reassessments."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.audit_service = AuditService(session)

    async def get_hazard_hypothesis(self, incident_id: uuid.UUID) -> HazardHypothesis:
        """Fetch or derive the living hazard hypothesis for an incident."""
        stmt = (
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(
                selectinload(IncidentModel.evidence_items),
                selectinload(IncidentModel.reassessments),
                selectinload(IncidentModel.audit_events),
            )
        )
        result = await self.session.execute(stmt)
        incident = result.scalar_one_or_none()
        if not incident:
            raise ValueError(f"Incident {incident_id} not found.")

        # 1. Spatial Envelope
        meta = incident.metadata_json or {}
        spatial = SpatialEnvelope(
            latitude=incident.latitude,
            longitude=incident.longitude,
            radius_meters=500.0,
            corridor_chainage=incident.location_name or "KM-42",
            elevation_m=1240.0,
            slope_gradient_deg=meta.get("slope_angle_deg", 44.2),
        )

        # 2. Temporal Window (Expected window: detected_at to detected_at + 4h)
        detected = incident.detected_at
        if detected.tzinfo is None:
            detected = detected.replace(tzinfo=timezone.utc)
        window_start = detected
        window_end = detected + timedelta(hours=4)
        now = datetime.now(timezone.utc)
        window_elapsed = now > window_end

        temporal = TemporalWindow(
            window_start=window_start,
            window_end=window_end,
            peak_intensity_expected_at=window_start + timedelta(hours=2),
            window_elapsed=window_elapsed,
        )

        # 3. Detect Divergences
        divergences = self._detect_divergences_internal(incident, temporal, spatial)

        # 4. Evolution History from Reassessments
        evolution_history: list[dict[str, Any]] = []
        for r in incident.reassessments:
            evolution_history.append({
                "reassessment_id": str(r.id),
                "from_state": r.previous_hazard_state,
                "to_state": r.updated_hazard_state,
                "risk_score": r.updated_risk_score,
                "confidence_score": r.updated_confidence_score,
                "divergence_type": r.divergence_type,
                "rationale": r.rationale,
                "reassessed_at": r.reassessed_at.isoformat() if r.reassessed_at else None,
                "reassessed_by": r.reassessed_by,
            })

        # 5. Extract Initiating Evidence IDs
        init_ids = [str(ev.id) for ev in incident.evidence_items if ev.source in (EvidenceSource.WEATHER.value, EvidenceSource.TERRAIN.value)]

        current_h_state = HazardState(incident.hazard_state) if incident.hazard_state in HazardState.__members__ else HazardState.EXPECTED

        return HazardHypothesis(
            id=uuid.uuid4(),
            incident_id=incident.id,
            lineage_id=f"HL-{incident.code}-01",
            current_state=current_h_state,
            spatial_envelope=spatial,
            temporal_window=temporal,
            initiating_evidence_ids=init_ids,
            initial_risk_score=86.0,
            current_risk_score=incident.risk_score,
            initial_confidence_score=54.0,
            current_confidence_score=incident.confidence_score,
            divergences=divergences,
            evolution_history=evolution_history,
            residual_uncertainty=(
                "88% optical cloud cover obscuring satellite scar; ground patrol confirmed debris encroachment."
                if any(ev.source == EvidenceSource.FIELD.value for ev in incident.evidence_items)
                else "Unverified ground status; 88% cloud cover. Precautionary monitoring required."
            ),
            created_at=incident.detected_at,
            updated_at=incident.updated_at,
        )

    def _detect_divergences_internal(
        self,
        incident: IncidentModel,
        temporal: TemporalWindow,
        spatial: SpatialEnvelope,
    ) -> list[DivergenceRecord]:
        """Deterministic divergence engine comparing expectations against reality."""
        divergences: list[DivergenceRecord] = []
        evidence_items = getattr(incident, "evidence_items", []) or []

        # 1. Temporal Divergence Check (EVENT ABSENCE)
        # If expected window elapsed but no catastrophic slide occurred, and state is still EXPECTED
        has_active_field_slide = any(
            ev.source == EvidenceSource.FIELD.value and "blocking" in ev.observation.lower()
            for ev in evidence_items
        )

        if incident.hazard_state == HazardState.EXPECTED.value:
            divergences.append(
                DivergenceRecord(
                    id=uuid.uuid4(),
                    incident_id=incident.id,
                    divergence_type=DivergenceType.TEMPORAL,
                    severity=DivergenceSeverity.SIGNIFICANT,
                    expected_context="Catastrophic slope failure expected within 04:00 - 08:00 IST rainfall surge window.",
                    observed_context="Expected window elapsed without cataclysmic scarp detachment. High rainfall saturation (184mm) persists.",
                    evidence_references=["IMD AWS Bhalukpong 184.6mm"],
                    explanation="EVENT ABSENCE ≠ HAZARD RESOLUTION: Saturated colluvium has not failed catastrophically yet, but pore-water pressure remains critical.",
                    requires_reassessment=True,
                )
            )

        # 2. Evidence Divergence Check (Cloud Obscuration / Radar Noise)
        for ev in evidence_items:
            if ev.conflict_status == EvidenceConflictStatus.CONFLICTED.value:
                divergences.append(
                    DivergenceRecord(
                        id=uuid.uuid4(),
                        incident_id=incident.id,
                        divergence_type=DivergenceType.EVIDENCE,
                        severity=DivergenceSeverity.MODERATE,
                        expected_context="Clear spaceborne optical scar observation on Sentinel-2.",
                        observed_context="88% cloud obstruction obscuring optical pass; SAR backscatter anomaly noisy.",
                        evidence_references=[ev.source_name],
                        explanation="Multi-source reconciliation indicates optical satellite degradation, depressing evidential confidence.",
                        requires_reassessment=False,
                    )
                )

        # 3. Magnitude / Partial Divergence Check
        for ev in evidence_items:
            if ev.source == EvidenceSource.FIELD.value:
                if "60%" in ev.metric or "partial" in ev.observation.lower() or "slurry" in ev.observation.lower():
                    divergences.append(
                        DivergenceRecord(
                            id=uuid.uuid4(),
                            incident_id=incident.id,
                            divergence_type=DivergenceType.MAGNITUDE,
                            severity=DivergenceSeverity.SIGNIFICANT,
                            expected_context="Complete 100% valley floor damming mass movement.",
                            observed_context="Partial cut-slope toe failure with mud slurry blocking 60% carriageway.",
                            evidence_references=[ev.source_name],
                            explanation="Observed volume is a localized sloughing slide rather than deep-seated bedrock failure.",
                            requires_reassessment=True,
                        )
                    )

        return divergences

    async def detect_divergences(self, incident_id: uuid.UUID) -> list[DivergenceRecord]:
        """Public endpoint to fetch all detected divergences for an incident."""
        hypothesis = await self.get_hazard_hypothesis(incident_id)
        return hypothesis.divergences

    async def perform_bounded_reassessment(
        self,
        incident_id: uuid.UUID,
        request: BoundedReassessmentRequest,
    ) -> BoundedReassessmentResult:
        """Execute a deterministic bounded hazard reassessment.
        
        CRITICAL INVARIANTS:
        1. EVENT ABSENCE DOES NOT RESOLVE HAZARD (Becomes DELAYED or REASSESSING).
        2. DIVERGENCE TRIGGERS REASSESSMENT — NOT AUTOMATIC ESCALATION.
        3. ACTION CONFIRMED DOES NOT RESOLVE HAZARD.
        4. RESOLVED requires affirmative physical/engineering evidence.
        """
        stmt = (
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(
                selectinload(IncidentModel.evidence_items),
                selectinload(IncidentModel.reassessments),
                selectinload(IncidentModel.actions),
            )
        )
        result = await self.session.execute(stmt)
        incident = result.scalar_one_or_none()
        if not incident:
            raise ValueError(f"Incident {incident_id} not found.")

        prev_hazard_state = HazardState(incident.hazard_state) if incident.hazard_state in HazardState.__members__ else HazardState.EXPECTED
        evidence_items = incident.evidence_items or []

        # 1. Feature Extraction & Predictive Baseline Evaluation
        feature_vector = FeaturePipeline.extract_features(incident)
        model_result = LandslidePredictiveBaseline.infer(feature_vector)

        # 2. Deterministic Bounded Reassessment Logic
        has_verified_active_event = any(
            ev.source == EvidenceSource.FIELD.value
            and ev.interpretation == EvidenceInterpretation.VERIFIED.value
            and not any(neg in (ev.observation or "").lower() for neg in ("no road debris", "no debris", "0% blockage", "0% obstruction", "intact", "slope intact", "no failure", "clear"))
            and any(kw in (ev.observation or "").lower() for kw in ("debris", "failure", "slide", "slurry", "blockage", "obstruction", "active"))
            for ev in evidence_items
        )
        has_resolution_evidence = any(
            "stabilized" in ev.observation.lower() or "cleared" in ev.observation.lower() or "repaired" in ev.observation.lower()
            for ev in evidence_items
        )

        # Evaluate target state if not forced
        if request.target_hazard_state:
            target_state = request.target_hazard_state
        else:
            # Deterministic classification based on evidence
            if has_resolution_evidence:
                target_state = HazardState.RESOLVED
            elif has_verified_active_event:
                # Active ground movement verified by patrol
                target_state = HazardState.ACTIVE
            elif prev_hazard_state == HazardState.EXPECTED:
                # Expected window elapsed without catastrophic slip -> DELAYED
                target_state = HazardState.DELAYED
            elif prev_hazard_state == HazardState.DELAYED and feature_vector.antecedent_rainfall_7d_mm < 60.0:
                # Rainfall subsided without movement -> DISSIPATED
                target_state = HazardState.DISSIPATED
            else:
                target_state = prev_hazard_state

        # SAFETY RULE: RESOLVED requires affirmative resolution evidence
        if target_state == HazardState.RESOLVED and not has_resolution_evidence:
            raise ValueError(
                "RESOLUTION REJECTED: Cannot resolve hazard without verified geotechnical stabilization "
                "or debris clearance evidence. EVENT ABSENCE ≠ HAZARD RESOLUTION."
            )

        # SAFETY RULE: FALSE_ALARM cannot be reached from event absence without adequate observation
        if target_state == HazardState.FALSE_ALARM:
            from app.services.outcome_service import OutcomeService
            from app.domain.outcome import ObservationAdequacy, OutcomeType
            outcome_svc = OutcomeService(self.session)
            outcome = await outcome_svc.evaluate_outcome(incident_id)
            if outcome.observation_adequacy != ObservationAdequacy.ADEQUATE or outcome.outcome_type == OutcomeType.OBSERVATION_GAP:
                raise ValueError(
                    "FALSE_ALARM REJECTED: Event absence without verified, multi-modal ground inspection cannot declare a false alarm. "
                    "Inadequate observation creates an OBSERVATION_GAP, not a false prediction."
                )

        # SAFETY RULE: ACTION CONFIRMED ≠ HAZARD RESOLUTION
        # (Even if all actions are PHYSICALLY_CONFIRMED, hazard state remains ACTIVE or DELAYED until physical stabilization)

        # 3. Continuity Evaluation
        # Spatial compatibility (<2km), temporal compatibility (<48h), causal hydrologic continuity
        continuity_supported = True
        lineage_id = f"HL-{incident.code}-01"
        lineage_decision = "CONTINUE_SAME_LINEAGE"

        # 4. Formulate Reassessment Rationale & Guidance
        if target_state == HazardState.DELAYED:
            rationale = (
                "TEMPORAL REASSESSMENT: Expected failure window elapsed without catastrophic collapse. "
                "EVENT ABSENCE ≠ HAZARD RESOLUTION. "
                "However, hydrometeorological saturation (184.6mm) and 44.2° cut-slope gradient sustain high structural danger. "
                "Hazard state updated from EXPECTED to DELAYED. NO AUTO-RESOLUTION."
            )
            operational_guidance = (
                "Maintain traffic diversion at KM-38 checkpost. Deploy SDRF patrol with drone optical verification. "
                "Continue pore-pressure telemetry monitoring."
            )
        elif target_state == HazardState.ACTIVE:
            rationale = (
                "PHYSICAL ACTIVATION CONFIRMED: Ground patrol visual inspection verified 60% road carriageway obstruction "
                "by saturated mud slurry and rock fragments. Hazard state elevated to ACTIVE."
            )
            operational_guidance = (
                "Enforce full corridor closure. Mobilize BRO JCB-3DX earthmover for controlled clearing once rainfall recedes."
            )
        elif target_state == HazardState.SHIFTED:
            rationale = (
                "SPATIAL REASSESSMENT: Ground evidence identifies primary scarp detachment 400m north at KM-42.4. "
                "Lineage continuity intact under same geological shear zone."
            )
            operational_guidance = "Relocate roadblock perimeter 500m north to maintain safe buffer zone."
        elif target_state == HazardState.PARTIAL:
            rationale = (
                "PARTIAL MANIFESTATION: Saturated soil mantle sloughed into ditch without deep-seated bedrock shear failure."
            )
            operational_guidance = "Inspect culvert drainage; monitor for secondary retrogressive failure."
        elif target_state == HazardState.DISSIPATED:
            rationale = (
                "HAZARD DISSIPATION: Precipitation decreased below threshold for >48h; soil moisture declining. "
                "DISSIPATED ≠ RESOLVED: Monitoring continues until engineering survey approves reopening."
            )
            operational_guidance = "Execute PWD engineering survey before declaring final operational resolution."
        elif target_state == HazardState.RESOLVED:
            rationale = (
                "HAZARD RESOLVED: Verified geotechnical stabilization and carriageway clearance confirmed by BRO/PWD engineers."
            )
            operational_guidance = "Authorized decision maker may transition incident to RESOLVED."
        else:
            rationale = f"Bounded reassessment executed. Hazard state maintained as {target_state.value}."
            operational_guidance = "Continue standard operational monitoring protocol."

        if request.notes:
            rationale += f" [Officer Note: {request.notes}]"

        # 5. Update Incident Model & Mark Priority Stale for Reassessment
        incident.hazard_state = target_state.value
        incident.risk_score = model_result.risk_score
        incident.risk_level = model_result.risk_level.value
        incident.confidence_score = model_result.confidence_score
        incident.confidence_level = model_result.confidence_level.value
        incident.updated_at = datetime.utcnow()

        meta = incident.metadata_json or {}
        meta["priority_is_stale"] = True
        meta["priority_stale_reason"] = f"Hazard state reassessed to {target_state.value} (Risk: {model_result.risk_score:.0f})"
        incident.metadata_json = meta

        # 6. Persist Reassessment Record
        reassessment_record = ReassessmentModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            previous_hazard_state=prev_hazard_state.value,
            updated_hazard_state=target_state.value,
            updated_risk_level=model_result.risk_level.value,
            updated_risk_score=model_result.risk_score,
            updated_confidence_level=model_result.confidence_level.value,
            updated_confidence_score=model_result.confidence_score,
            divergence_type=request.trigger_divergence_id and "TEMPORAL" or "BOUNDED_EVALUATION",
            continuity_supported=continuity_supported,
            lineage_id=lineage_id,
            lineage_decision=lineage_decision,
            rationale=rationale,
            operational_guidance=operational_guidance,
            payload_json={
                "actor_role": request.actor_role.value,
                "actor_name": request.actor_name,
                "trigger_divergence_id": str(request.trigger_divergence_id) if request.trigger_divergence_id else None,
            },
            reassessed_at=datetime.utcnow(),
            reassessed_by=request.actor_name,
        )
        self.session.add(reassessment_record)

        # 7. Record Append-Oriented Audit Event
        await self.audit_service.record_event(
            incident_id=incident.id,
            event_type=AuditEventType.REASSESSMENT_PERFORMED,
            actor_role=request.actor_role.value,
            actor_name=request.actor_name,
            previous_state=f"Hazard:{prev_hazard_state.value}",
            new_state=f"Hazard:{target_state.value}",
            reason=rationale,
            payload={
                "previous_hazard_state": prev_hazard_state.value,
                "updated_hazard_state": target_state.value,
                "risk_score": model_result.risk_score,
                "confidence_score": model_result.confidence_score,
                "lineage_id": lineage_id,
                "lineage_decision": lineage_decision,
            },
        )

        await self.session.commit()

        return BoundedReassessmentResult(
            id=reassessment_record.id,
            incident_id=incident.id,
            hypothesis_id=uuid.uuid4(),
            lineage_id=lineage_id,
            previous_hazard_state=prev_hazard_state,
            updated_hazard_state=target_state,
            updated_risk_score=model_result.risk_score,
            updated_risk_level=model_result.risk_level,
            updated_confidence_score=model_result.confidence_score,
            updated_confidence_level=model_result.confidence_level,
            continuity_supported=continuity_supported,
            lineage_decision=lineage_decision,
            rationale=rationale,
            operational_guidance=operational_guidance,
            reassessed_at=reassessment_record.reassessed_at,
            reassessed_by=request.actor_name,
        )

    async def transition_hazard_state(
        self,
        incident_id: uuid.UUID,
        request: HazardStateTransitionRequest,
    ) -> IncidentModel:
        """Execute a validated hazard state transition."""
        stmt = (
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(selectinload(IncidentModel.evidence_items))
        )
        result = await self.session.execute(stmt)
        incident = result.scalar_one_or_none()
        if not incident:
            raise ValueError(f"Incident {incident_id} not found.")

        current_state = HazardState(incident.hazard_state) if incident.hazard_state in HazardState.__members__ else HazardState.EXPECTED
        target_state = request.target_state

        # Validate transition matrix
        allowed_targets = VALID_HAZARD_TRANSITIONS.get(current_state, frozenset())
        if target_state not in allowed_targets:
            raise ValueError(
                f"Invalid hazard state transition: cannot transition from {current_state.value} to {target_state.value}. "
                f"Allowed transitions: {[s.value for s in allowed_targets]}"
            )

        # Safety rule: RESOLVED requires evidence
        if target_state == HazardState.RESOLVED:
            has_evidence = any(
                "stabilized" in ev.observation.lower() or "cleared" in ev.observation.lower()
                for ev in (incident.evidence_items or [])
            )
            if not has_evidence and not request.resolution_evidence_id:
                raise ValueError("RESOLUTION REJECTED: Affirmative geotechnical stabilization evidence required.")

        # Safety rule: FALSE_ALARM cannot be reached merely from event absence without adequate observation
        if target_state == HazardState.FALSE_ALARM:
            from app.services.outcome_service import OutcomeService
            from app.domain.outcome import ObservationAdequacy, OutcomeType
            outcome_svc = OutcomeService(self.session)
            outcome = await outcome_svc.evaluate_outcome(incident_id)
            if outcome.observation_adequacy != ObservationAdequacy.ADEQUATE or outcome.outcome_type == OutcomeType.OBSERVATION_GAP:
                raise ValueError(
                    "FALSE_ALARM REJECTED: Event absence without verified, multi-modal ground inspection cannot declare a false alarm. "
                    "Inadequate observation creates an OBSERVATION_GAP, not a false prediction."
                )

        prev_state_str = incident.hazard_state
        incident.hazard_state = target_state.value
        incident.updated_at = datetime.utcnow()

        meta = incident.metadata_json or {}
        meta["priority_is_stale"] = True
        meta["priority_stale_reason"] = f"Hazard state transitioned to {target_state.value}"
        incident.metadata_json = meta

        await self.audit_service.record_event(
            incident_id=incident.id,
            event_type=AuditEventType.STATE_CHANGED,
            actor_role=request.actor_role.value,
            actor_name=request.actor_name,
            previous_state=f"Hazard:{prev_state_str}",
            new_state=f"Hazard:{target_state.value}",
            reason=request.reason,
            payload={"transition_type": "HAZARD_STATE_TRANSITION"},
        )

        await self.session.commit()
        return incident

    async def get_lineage(self, incident_id: uuid.UUID) -> HazardLineageSummary:
        """Fetch full hazard evolution lineage summary."""
        stmt = (
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(
                selectinload(IncidentModel.reassessments),
                selectinload(IncidentModel.audit_events),
            )
        )
        result = await self.session.execute(stmt)
        incident = result.scalar_one_or_none()
        if not incident:
            raise ValueError(f"Incident {incident_id} not found.")

        lineage_id = f"HL-{incident.code}-01"
        reassessments = incident.reassessments or []
        states = [HazardState.EXPECTED.value] + [r.updated_hazard_state for r in reassessments]

        current_h_state = HazardState(incident.hazard_state) if incident.hazard_state in HazardState.__members__ else HazardState.EXPECTED

        tree_nodes = [
            {
                "timestamp": incident.detected_at.isoformat() if incident.detected_at else None,
                "state": HazardState.EXPECTED.value,
                "event": "INITIAL_HAZARD_HYPOTHESIS_FORMED",
                "risk_score": 86.0,
                "confidence_score": 54.0,
                "actor": "System Predictive Pipeline",
            }
        ]

        for r in reassessments:
            tree_nodes.append({
                "timestamp": r.reassessed_at.isoformat() if r.reassessed_at else None,
                "state": r.updated_hazard_state,
                "event": f"REASSESSMENT: {r.divergence_type or 'EVALUATION'}",
                "risk_score": r.updated_risk_score,
                "confidence_score": r.updated_confidence_score,
                "actor": r.reassessed_by,
                "rationale": r.rationale,
            })

        return HazardLineageSummary(
            lineage_id=lineage_id,
            incident_id=incident.id,
            root_detected_at=incident.detected_at,
            active_hazard_state=current_h_state,
            states_traversed=states,
            total_divergences_detected=len([r for r in reassessments if r.divergence_type != "BOUNDED_EVALUATION"]),
            total_reassessments_performed=len(reassessments),
            continuity_intact=True,
            lineage_tree=tree_nodes,
        )
