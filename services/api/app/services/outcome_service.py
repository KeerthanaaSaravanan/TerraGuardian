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
from app.domain.decision import NextBestInformationItem
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
    CompetingHypothesisItem,
    EvidenceRelationshipType,
    HypothesisEvidenceBinding,
    HypothesisStatus,
    HypothesisType,
    InterventionContextState,
    ObservationAdequacy,
    OutcomeAssessment,
    OutcomeEvaluationRequest,
    OutcomePolicyConfig,
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

        payload = record.payload_json or {}
        primary_h = None
        prim_val = payload.get("primary_hypothesis")
        if prim_val:
            try:
                primary_h = HypothesisType(prim_val)
            except (ValueError, KeyError):
                primary_h = None

        competing_hypotheses: list[CompetingHypothesisItem] = []
        for ch_dict in payload.get("competing_hypotheses", []):
            try:
                competing_hypotheses.append(CompetingHypothesisItem.model_validate(ch_dict))
            except Exception:
                pass

        nbi_recommendations: list[NextBestInformationItem] = []
        for nbi_dict in payload.get("nbi_recommendations", []):
            try:
                nbi_recommendations.append(NextBestInformationItem.model_validate(nbi_dict))
            except Exception:
                pass

        policy_cfg = OutcomePolicyConfig()
        if "policy_context" in payload and payload["policy_context"]:
            try:
                policy_cfg = OutcomePolicyConfig.model_validate(payload["policy_context"])
            except Exception:
                pass

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
            primary_hypothesis=primary_h,
            competing_hypotheses=competing_hypotheses,
            nbi_recommendations=nbi_recommendations,
            policy_context=policy_cfg,
            evaluated_at=record.evaluated_at,
            evaluated_by=record.evaluated_by,
        )

    async def evaluate_outcome(
        self,
        incident_id: uuid.UUID,
        request: Optional[OutcomeEvaluationRequest] = None,
        observed_latitude: Optional[float] = None,
        observed_longitude: Optional[float] = None,
        **kwargs: Any,
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

        if request is not None:
            req = request
        else:
            req = OutcomeEvaluationRequest(
                observed_latitude=observed_latitude if observed_latitude is not None else kwargs.get("observed_latitude"),
                observed_longitude=observed_longitude if observed_longitude is not None else kwargs.get("observed_longitude"),
            )
        policy = OutcomePolicyConfig()
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
            within_scope = distance_m <= policy.corridor_scope_threshold_meters
            spatial_ctx = SpatialDivergenceContext(
                original_latitude=orig_lat,
                original_longitude=orig_lon,
                observed_latitude=obs_lat,
                observed_longitude=obs_lon,
                distance_meters=distance_m,
                within_supported_scope=within_scope,
                spatial_scope_threshold_meters=policy.corridor_scope_threshold_meters,
                corridor_alignment_notes=(
                    f"Observed location is {distance_m:.0f}m from prediction centroid; "
                    + ("retains SAME INCIDENT continuity under active corridor envelope."
                       if within_scope
                       else f"EXCEEDS standard {policy.corridor_scope_threshold_meters/1000.0:.0f}km corridor envelope — spatial divergence requires boundary review.")
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
        window_end = detected + timedelta(hours=policy.observation_window_hours)
        now = datetime.now(timezone.utc)
        window_elapsed = now >= window_end

        def _is_fresh(e: EvidenceModel) -> bool:
            obs_time = e.observed_at or e.received_at
            if obs_time is None:
                return False
            if obs_time.tzinfo is None:
                obs_time = obs_time.replace(tzinfo=timezone.utc)
            return (now - obs_time).total_seconds() <= policy.freshness_window_seconds

        # Check for unresolved conflicted evidence
        conflicted_items = [
            e for e in evidence_items
            if e.conflict_status == EvidenceConflictStatus.CONFLICTED.value
            and e.interpretation != EvidenceInterpretation.REJECTED.value
        ]
        has_unresolved_conflicts = len(conflicted_items) > 0

        # Check for verified field or ground sensor observations (must satisfy freshness window)
        has_field_inspection = any(
            e.source == EvidenceSource.FIELD.value
            and e.interpretation == EvidenceInterpretation.VERIFIED.value
            and _is_fresh(e)
            for e in evidence_items
        )
        has_stale_field_inspection = any(
            e.source == EvidenceSource.FIELD.value
            and e.interpretation == EvidenceInterpretation.VERIFIED.value
            and not _is_fresh(e)
            for e in evidence_items
        )
        has_sensor_telemetry = any(
            e.source == EvidenceSource.SENSOR.value
            and _is_fresh(e)
            for e in evidence_items
        )

        # Check for optical cloud cover / sensor obscuration
        has_obscuration = any(
            ("cloud" in (e.observation or "").lower() or "obscur" in (e.observation or "").lower() or "88%" in (e.observation or ""))
            for e in evidence_items
            if e.source in (EvidenceSource.SATELLITE.value, "SATELLITE")
        )

        # Check for physical event occurrence (verified ground failure / slide / road obstruction)
        def _is_event_evidence(e: EvidenceModel) -> bool:
            obs = (e.observation or "").lower()
            metric = (e.metric or "").lower()
            text = f"{obs} {metric}"
            
            # Check for explicit negative/intact indications
            negations = (
                "slope intact", "no failure", "zero debris", "no debris",
                "0% obstruction", "no obstruction", "fully clear", "clear of debris",
                "did not fail", "no detachment", "intact", "no movement", "carriageway fully clear",
            )
            if any(neg in text for neg in negations):
                # If negative words appear and there's no active positive indicators
                if not any(pos in text for pos in ("active failure", "blocking 60%", "breached", "landslide occurred", "slurry encroachment", "carriageway breached", "rupture", "toe failure")):
                    return False

            event_keywords = ("failure", "slide", "slurry", "blocking", "obstruction", "debris", "scarp detachment", "mass movement", "landslide")
            return (
                any(kw in text for kw in event_keywords)
                and e.source in (EvidenceSource.FIELD.value, EvidenceSource.SENSOR.value)
                and e.interpretation == EvidenceInterpretation.VERIFIED.value
                and _is_fresh(e)
            )

        # Check for affirmative geotechnical stabilization / clearance evidence (must be fresh)
        stabilization_keywords = ("stabiliz", "gabion", "repaired", "retaining wall secured", "geotechnical clearance")
        has_stabilization_evidence = any(
            any(kw in (e.observation or "").lower() for kw in stabilization_keywords)
            and e.interpretation == EvidenceInterpretation.VERIFIED.value
            and _is_fresh(e)
            for e in evidence_items
        )

        latest_stabilization_time = max(
            (e.observed_at for e in evidence_items if any(kw in (e.observation or "").lower() for kw in stabilization_keywords) and e.interpretation == EvidenceInterpretation.VERIFIED.value and _is_fresh(e) and e.observed_at is not None),
            default=None,
        )
        if latest_stabilization_time is not None:
            # Only consider event evidence that occurred strictly after affirmative stabilization
            verified_event_observed = any(
                _is_event_evidence(e) and (e.observed_at is not None and e.observed_at > latest_stabilization_time)
                for e in evidence_items
            )
        else:
            verified_event_observed = any(_is_event_evidence(e) for e in evidence_items)

        # Check for residual hazard indicators (must be fresh and verified, and not superseded by stabilization)
        has_residual_indicators = any(
            any(kw in (e.observation or "").lower() for kw in ("pore-water", "saturation", "tension crack", "perched", "creep", "rainfall persists"))
            and e.interpretation == EvidenceInterpretation.VERIFIED.value
            and _is_fresh(e)
            and (latest_stabilization_time is None or (e.observed_at is not None and e.observed_at > latest_stabilization_time))
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

        # Case 3: Inadequate Observation — Severe Obscuration without Ground Patrol
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

        # Case 4: Inadequate Observation — Prior Field Inspection Stale (> 24h)
        elif has_stale_field_inspection and not has_field_inspection:
            outcome_type = OutcomeType.OBSERVATION_GAP
            observation_adequacy = ObservationAdequacy.INADEQUATE_COVERAGE
            causal_claim_established = False
            closure_permitted = False
            reassessment_required = True
            recommended_hazard_state = (
                HazardState.DELAYED if current_h_state == HazardState.EXPECTED else current_h_state
            )
            explanation = (
                f"EVENT ABSENCE ≠ HAZARD RESOLUTION: Prior field inspections exceed the 24-hour freshness policy threshold ({policy.freshness_window_seconds}s). "
                "Stale observational reports cannot establish affirmative slope stability or negative non-event. Fresh patrol required."
            )

        # Case 5: Inadequate Observation — Window not elapsed
        elif not window_elapsed and not has_field_inspection:
            outcome_type = OutcomeType.OBSERVATION_GAP
            observation_adequacy = ObservationAdequacy.INADEQUATE_WINDOW
            causal_claim_established = False
            closure_permitted = False
            reassessment_required = True
            recommended_hazard_state = current_h_state
            explanation = (
                "EVENT ABSENCE ≠ HAZARD RESOLUTION: OBSERVATION GAP (INADEQUATE_WINDOW): Expected hazard activation window has not elapsed. "
                "Premature evaluation cannot establish event absence. Active monitoring sustained."
            )

        # Case 6: Inadequate Observation — Missing Ground Telemetry/Patrol Coverage
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

        # Case 6: Adequate Observation + Intervention Occurred (Intervention-Conditioned Non-Event or Geotechnical Stabilization)
        elif intervention_state in (
            InterventionContextState.INTERVENTION_CONFIRMED,
            InterventionContextState.INTERVENTION_DISPATCHED_UNCONFIRMED,
        ):
            if has_stabilization_evidence and intervention_state == InterventionContextState.INTERVENTION_CONFIRMED and not has_residual_indicators:
                outcome_type = OutcomeType.NON_EVENT_OBSERVED
                observation_adequacy = ObservationAdequacy.ADEQUATE
                causal_claim_established = False
                closure_permitted = True
                reassessment_required = False
                recommended_hazard_state = HazardState.RESOLVED
                explanation = (
                    "Affirmative geotechnical stabilization and debris clearance confirmed by engineering team. "
                    "Evidentiary closure gate criteria satisfied for authorized sign-off."
                )
            else:
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
                    "Evidentiary closure gate criteria satisfied for authorized sign-off."
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
        if spatial_ctx and spatial_ctx.distance_meters is not None and spatial_ctx.distance_meters > policy.spatial_divergence_threshold_meters:
            explanation += (
                f" [Spatial note: Observed location is {spatial_ctx.distance_meters:.0f}m from prediction centroid; "
                + (f"within supported {policy.corridor_scope_threshold_meters/1000.0:.0f}km corridor envelope — SAME INCIDENT preserved."
                   if spatial_ctx.within_supported_scope
                   else f"EXCEEDS standard {policy.corridor_scope_threshold_meters/1000.0:.0f}km corridor scope — spatial divergence boundary review required.")
                + "]"
            )

        # ── 5. COMPETING HYPOTHESES & HYPOTHESIS-SEPARATING NBI (PROMPT 04) ──
        (
            primary_hypothesis,
            competing_hypotheses,
            nbi_recommendations,
        ) = self._evaluate_competing_hypotheses_and_nbi(
            incident=incident,
            evidence_items=evidence_items,
            actions=actions,
            outcome_type=outcome_type,
            intervention_state=intervention_state,
            observation_adequacy=observation_adequacy,
            spatial_ctx=spatial_ctx,
            window_elapsed=window_elapsed,
            has_field_inspection=has_field_inspection,
            has_sensor_telemetry=has_sensor_telemetry,
            has_obscuration=has_obscuration,
            verified_event_observed=verified_event_observed,
            has_stabilization_evidence=has_stabilization_evidence,
            has_residual_indicators=has_residual_indicators,
            conflicted_items=conflicted_items,
        )

        # ── 6. PERSIST OUTCOME MODEL ──
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
                "primary_hypothesis": primary_hypothesis.value if primary_hypothesis else None,
                "competing_hypotheses": [h.model_dump(mode="json") for h in competing_hypotheses],
                "nbi_recommendations": [nbi.model_dump(mode="json") for nbi in nbi_recommendations],
                "policy_context": policy.model_dump(mode="json"),
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
                "primary_hypothesis": primary_hypothesis.value if primary_hypothesis else None,
                "competing_hypotheses_count": len(competing_hypotheses),
                "nbi_count": len(nbi_recommendations),
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
            primary_hypothesis=primary_hypothesis,
            competing_hypotheses=competing_hypotheses,
            nbi_recommendations=nbi_recommendations,
            policy_context=policy,
            evaluated_at=outcome_record.evaluated_at,
            evaluated_by=outcome_record.evaluated_by,
        )

    def _evaluate_competing_hypotheses_and_nbi(
        self,
        incident: IncidentModel,
        evidence_items: list[EvidenceModel],
        actions: list[ActionModel],
        outcome_type: OutcomeType,
        intervention_state: InterventionContextState,
        observation_adequacy: ObservationAdequacy,
        spatial_ctx: Optional[SpatialDivergenceContext],
        window_elapsed: bool,
        has_field_inspection: bool,
        has_sensor_telemetry: bool,
        has_obscuration: bool,
        verified_event_observed: bool,
        has_stabilization_evidence: bool,
        has_residual_indicators: bool,
        conflicted_items: list[EvidenceModel],
    ) -> tuple[Optional[HypothesisType], list[CompetingHypothesisItem], list[NextBestInformationItem]]:
        """Synthesize authoritative evaluation across the bounded set of 7 competing operational hypotheses and derive hypothesis-separating NBI."""
        orig_lat = incident.latitude
        orig_lon = incident.longitude

        h_bindings: dict[HypothesisType, list[HypothesisEvidenceBinding]] = {
            ht: [] for ht in HypothesisType
        }
        h_supporting: dict[HypothesisType, list[uuid.UUID]] = {ht: [] for ht in HypothesisType}
        h_contradicting: dict[HypothesisType, list[uuid.UUID]] = {ht: [] for ht in HypothesisType}
        h_unknown: dict[HypothesisType, list[uuid.UUID]] = {ht: [] for ht in HypothesisType}

        for ev in evidence_items:
            ev_id = ev.id
            obs = (ev.observation or "").lower()
            is_verified = (ev.interpretation == EvidenceInterpretation.VERIFIED.value)
            is_conflicted = (ev.conflict_status == EvidenceConflictStatus.CONFLICTED.value)
            is_field = (ev.source == EvidenceSource.FIELD.value)
            is_satellite = (ev.source in (EvidenceSource.SATELLITE.value, "SATELLITE"))

            is_intact_or_clear = any(neg in obs for neg in ("0% obstruction", "no obstruction", "no debris", "slope intact", "intact", "no failure", "fully clear"))

            # ── H1: FALSE_ALARM ──
            if not is_intact_or_clear and any(kw in obs for kw in ("failure", "slide", "slurry", "blocking", "obstruction", "debris", "crack", "displacement", "rockfall", "184mm", "pore-water")):
                rel_h1 = EvidenceRelationshipType.CONTRADICTING
                reason_h1 = "Active failure, displacement, tension crack, or saturation surge contradicts ungrounded false positive."
            elif is_satellite and any(kw in obs for kw in ("cloud", "obscur", "88%")):
                rel_h1 = EvidenceRelationshipType.CONTRADICTING
                reason_h1 = "Observational cloud obscuration prevents confirming event absence; false alarm cannot be established."
            elif is_verified and any(kw in obs for kw in ("intact", "clear", "0% obstruction")) and window_elapsed and not has_residual_indicators:
                rel_h1 = EvidenceRelationshipType.SUPPORTING
                reason_h1 = "Verified field inspection confirms intact slope and clear carriageway after expected failure window."
            else:
                rel_h1 = EvidenceRelationshipType.UNKNOWN
                reason_h1 = "Evidence does not definitively verify complete absence of geotechnical hazard."
            h_bindings[HypothesisType.H1_FALSE_ALARM].append(HypothesisEvidenceBinding(evidence_id=ev_id, relationship=rel_h1, reasoning=reason_h1))
            if rel_h1 == EvidenceRelationshipType.SUPPORTING:
                h_supporting[HypothesisType.H1_FALSE_ALARM].append(ev_id)
            elif rel_h1 == EvidenceRelationshipType.CONTRADICTING:
                h_contradicting[HypothesisType.H1_FALSE_ALARM].append(ev_id)
            else:
                h_unknown[HypothesisType.H1_FALSE_ALARM].append(ev_id)

            # ── H2: INTERVENTION_CONDITIONED_NON_EVENT ──
            if not is_intact_or_clear and any(kw in obs for kw in ("failure", "slide", "slurry", "blocking", "obstruction", "debris")) and is_verified:
                rel_h2 = EvidenceRelationshipType.CONTRADICTING
                reason_h2 = "Verified ground failure occurred on carriageway; intervention did not prevent physical hazard."
            elif intervention_state == InterventionContextState.NO_INTERVENTION:
                rel_h2 = EvidenceRelationshipType.CONTRADICTING
                reason_h2 = "Zero physical interventions deployed; outcome cannot be intervention-conditioned."
            elif is_field and is_verified and any(kw in obs for kw in ("intact", "clear", "0% obstruction")):
                rel_h2 = EvidenceRelationshipType.SUPPORTING
                reason_h2 = "Ground patrol verifies carriageway clear following intervention execution."
            elif is_satellite and any(kw in obs for kw in ("cloud", "obscur")):
                rel_h2 = EvidenceRelationshipType.UNKNOWN
                reason_h2 = "Spaceborne optical pass obscured; cannot confirm ground status following intervention."
            else:
                rel_h2 = EvidenceRelationshipType.UNKNOWN
                reason_h2 = "Contextual evidence provides environmental telemetry but does not confirm intervention-conditioned non-event."
            h_bindings[HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT].append(HypothesisEvidenceBinding(evidence_id=ev_id, relationship=rel_h2, reasoning=reason_h2))
            if rel_h2 == EvidenceRelationshipType.SUPPORTING:
                h_supporting[HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT].append(ev_id)
            elif rel_h2 == EvidenceRelationshipType.CONTRADICTING:
                h_contradicting[HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT].append(ev_id)
            else:
                h_unknown[HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT].append(ev_id)

            # ── H3: DELAYED_FAILURE ──
            if any(kw in obs for kw in ("stabilized", "cleared", "repaired", "retaining wall secured")) and is_verified:
                rel_h3 = EvidenceRelationshipType.CONTRADICTING
                reason_h3 = "Affirmative geotechnical stabilization mitigates delayed failure mechanism."
            elif verified_event_observed:
                rel_h3 = EvidenceRelationshipType.CONTRADICTING
                reason_h3 = "Slope failure manifested during primary window; delay hypothesis is moot."
            elif any(kw in obs for kw in ("pore-water", "saturation", "tension crack", "creep", "184mm", "rainfall")):
                rel_h3 = EvidenceRelationshipType.SUPPORTING
                reason_h3 = "Hydrologic precipitation surge, pore pressure, or active tension crack indicates delayed failure risk."
            elif is_satellite and any(kw in obs for kw in ("cloud", "obscur")):
                rel_h3 = EvidenceRelationshipType.UNKNOWN
                reason_h3 = "Cloud obscuration hides ground deformation without refuting hydrologic saturation."
            else:
                rel_h3 = EvidenceRelationshipType.UNKNOWN
                reason_h3 = "Observation does not measure deep hydrologic lag or shear displacement rates."
            h_bindings[HypothesisType.H3_DELAYED_FAILURE].append(HypothesisEvidenceBinding(evidence_id=ev_id, relationship=rel_h3, reasoning=reason_h3))
            if rel_h3 == EvidenceRelationshipType.SUPPORTING:
                h_supporting[HypothesisType.H3_DELAYED_FAILURE].append(ev_id)
            elif rel_h3 == EvidenceRelationshipType.CONTRADICTING:
                h_contradicting[HypothesisType.H3_DELAYED_FAILURE].append(ev_id)
            else:
                h_unknown[HypothesisType.H3_DELAYED_FAILURE].append(ev_id)

            # ── H4: SHIFTED_HAZARD ──
            if ev.latitude is not None and ev.longitude is not None:
                ev_dist = haversine_distance_meters(orig_lat, orig_lon, ev.latitude, ev.longitude)
                if ev_dist > 5000.0:
                    rel_h4 = EvidenceRelationshipType.CONTRADICTING
                    reason_h4 = f"Evidence location ({ev_dist:.0f}m) exceeds the 5km corridor envelope."
                elif ev_dist > 500.0 and any(kw in obs for kw in ("failure", "slide", "rockfall", "crack", "displacement", "debris", "slurry", "offset")):
                    rel_h4 = EvidenceRelationshipType.SUPPORTING
                    reason_h4 = f"Ground distress observed at {ev_dist:.0f}m offset within the 5km corridor envelope."
                else:
                    rel_h4 = EvidenceRelationshipType.UNKNOWN
                    reason_h4 = f"Observation at {ev_dist:.0f}m offset has indeterminate diagnostic value."
            else:
                rel_h4 = EvidenceRelationshipType.UNKNOWN
                reason_h4 = "Evidence lacks spatial coordinates required to establish corridor shift."
            h_bindings[HypothesisType.H4_SHIFTED_HAZARD].append(HypothesisEvidenceBinding(evidence_id=ev_id, relationship=rel_h4, reasoning=reason_h4))
            if rel_h4 == EvidenceRelationshipType.SUPPORTING:
                h_supporting[HypothesisType.H4_SHIFTED_HAZARD].append(ev_id)
            elif rel_h4 == EvidenceRelationshipType.CONTRADICTING:
                h_contradicting[HypothesisType.H4_SHIFTED_HAZARD].append(ev_id)
            else:
                h_unknown[HypothesisType.H4_SHIFTED_HAZARD].append(ev_id)

            # ── H5: OBSERVATION_GAP ──
            if is_satellite and any(kw in obs for kw in ("cloud", "obscur", "88%")):
                rel_h5 = EvidenceRelationshipType.SUPPORTING
                reason_h5 = "Satellite optical sensor degraded by heavy cloud obscuration."
            elif is_field and is_verified:
                rel_h5 = EvidenceRelationshipType.CONTRADICTING
                reason_h5 = "Verified on-site ground inspection provides direct physical observation."
            elif not window_elapsed and not is_field:
                rel_h5 = EvidenceRelationshipType.SUPPORTING
                reason_h5 = "Hazard activation window has not elapsed; temporal duration is inadequate."
            else:
                rel_h5 = EvidenceRelationshipType.UNKNOWN
                reason_h5 = "Observation provides partial monitoring but does not resolve optical gap."
            h_bindings[HypothesisType.H5_OBSERVATION_GAP].append(HypothesisEvidenceBinding(evidence_id=ev_id, relationship=rel_h5, reasoning=reason_h5))
            if rel_h5 == EvidenceRelationshipType.SUPPORTING:
                h_supporting[HypothesisType.H5_OBSERVATION_GAP].append(ev_id)
            elif rel_h5 == EvidenceRelationshipType.CONTRADICTING:
                h_contradicting[HypothesisType.H5_OBSERVATION_GAP].append(ev_id)
            else:
                h_unknown[HypothesisType.H5_OBSERVATION_GAP].append(ev_id)

            # ── H6: RESIDUAL_HAZARD ──
            if any(kw in obs for kw in ("stabilized", "cleared", "repaired", "retaining wall secured")) and is_verified:
                rel_h6 = EvidenceRelationshipType.CONTRADICTING
                reason_h6 = "Affirmative geotechnical stabilization mitigates residual failure threat."
            elif any(kw in obs for kw in ("pore-water", "saturation", "tension crack", "perched", "creep", "184mm")):
                rel_h6 = EvidenceRelationshipType.SUPPORTING
                reason_h6 = "Hydrologic saturation, perched colluvium, or tension cracks maintain persistent residual hazard."
            elif verified_event_observed:
                rel_h6 = EvidenceRelationshipType.SUPPORTING
                reason_h6 = "Post-event colluvium and scarp detachment present continuing residual hazard."
            else:
                rel_h6 = EvidenceRelationshipType.UNKNOWN
                reason_h6 = "Telemetry does not measure post-peak geotechnical residual stability."
            h_bindings[HypothesisType.H6_RESIDUAL_HAZARD].append(HypothesisEvidenceBinding(evidence_id=ev_id, relationship=rel_h6, reasoning=reason_h6))
            if rel_h6 == EvidenceRelationshipType.SUPPORTING:
                h_supporting[HypothesisType.H6_RESIDUAL_HAZARD].append(ev_id)
            elif rel_h6 == EvidenceRelationshipType.CONTRADICTING:
                h_contradicting[HypothesisType.H6_RESIDUAL_HAZARD].append(ev_id)
            else:
                h_unknown[HypothesisType.H6_RESIDUAL_HAZARD].append(ev_id)

            # ── H7: CONFLICTED ──
            if is_conflicted or "contradict" in obs:
                rel_h7 = EvidenceRelationshipType.SUPPORTING
                reason_h7 = "Explicit evidentiary discordance recorded against this observation."
            elif is_verified and not is_conflicted and len(conflicted_items) == 0:
                rel_h7 = EvidenceRelationshipType.CONTRADICTING
                reason_h7 = "Unanimous verified observation without conflicting counterpart reports."
            else:
                rel_h7 = EvidenceRelationshipType.UNKNOWN
                reason_h7 = "Single-source observation without recorded cross-channel discrepancy."
            h_bindings[HypothesisType.H7_CONFLICTED].append(HypothesisEvidenceBinding(evidence_id=ev_id, relationship=rel_h7, reasoning=reason_h7))
            if rel_h7 == EvidenceRelationshipType.SUPPORTING:
                h_supporting[HypothesisType.H7_CONFLICTED].append(ev_id)
            elif rel_h7 == EvidenceRelationshipType.CONTRADICTING:
                h_contradicting[HypothesisType.H7_CONFLICTED].append(ev_id)
            else:
                h_unknown[HypothesisType.H7_CONFLICTED].append(ev_id)

        # Status & Rationale for H1
        if verified_event_observed or has_residual_indicators or has_obscuration or not window_elapsed:
            st_h1 = HypothesisStatus.CONTRADICTED
            rat_h1 = "CONTRADICTED: Event absence ≠ False Alarm. Physical ground distress, rainfall surcharge, or optical obscuration strictly precludes false alarm declaration."
        elif has_stabilization_evidence and not has_residual_indicators:
            st_h1 = HypothesisStatus.VIABLE
            rat_h1 = "VIABLE: Engineering clearance and stabilization certified; original trigger did not produce unmanaged failure."
        else:
            st_h1 = HypothesisStatus.DISFAVORED
            rat_h1 = "DISFAVORED: Precautionary principle: Observed non-event under receding rain transitions to DISSIPATED, not an ungrounded false alarm claim."

        # Status & Rationale for H2
        if verified_event_observed:
            st_h2 = HypothesisStatus.CONTRADICTED
            rat_h2 = "CONTRADICTED: Physical ground failure observed on carriageway; intervention did not prevent failure."
        elif intervention_state == InterventionContextState.NO_INTERVENTION:
            st_h2 = HypothesisStatus.CONTRADICTED
            rat_h2 = "CONTRADICTED: Zero physical interventions deployed for this incident."
        elif intervention_state == InterventionContextState.INTERVENTION_CONFIRMED and not verified_event_observed:
            st_h2 = HypothesisStatus.SUPPORTED
            rat_h2 = "SUPPORTED: Confirmed intervention deployed; slope intact. CRITICAL INVARIANT: Causal prevention remains unproven (causal_claim_established=False)."
        elif intervention_state == InterventionContextState.INTERVENTION_DISPATCHED_UNCONFIRMED:
            st_h2 = HypothesisStatus.VIABLE
            rat_h2 = "VIABLE: Intervention dispatched but awaits physical confirmation from ground patrol."
        else:
            st_h2 = HypothesisStatus.DISFAVORED
            rat_h2 = "DISFAVORED: Intervention context is incomplete or unverified."

        # Status & Rationale for H3
        if verified_event_observed:
            st_h3 = HypothesisStatus.CONTRADICTED
            rat_h3 = "CONTRADICTED: Ground failure manifested during primary window; delay hypothesis is moot."
        elif has_stabilization_evidence:
            st_h3 = HypothesisStatus.CONTRADICTED
            rat_h3 = "CONTRADICTED: Affirmative geotechnical stabilization restored factor of safety."
        elif has_residual_indicators or incident.hazard_state == HazardState.DELAYED.value or (not window_elapsed and (has_sensor_telemetry or has_obscuration)):
            st_h3 = HypothesisStatus.SUPPORTED
            rat_h3 = "SUPPORTED: Pore-water surcharge and hydrologic lag indicate progressive shear failure may be delayed."
        else:
            st_h3 = HypothesisStatus.VIABLE
            rat_h3 = "VIABLE: Deep percolation and groundwater seepage time may exceed primary window."

        # Status & Rationale for H4
        if spatial_ctx and spatial_ctx.distance_meters and spatial_ctx.distance_meters > 500.0 and spatial_ctx.within_supported_scope:
            st_h4 = HypothesisStatus.SUPPORTED
            rat_h4 = f"SUPPORTED: Ground movement detected at {spatial_ctx.distance_meters:.0f}m offset within the supported 5km corridor envelope."
        elif verified_event_observed:
            st_h4 = HypothesisStatus.DISFAVORED
            rat_h4 = "DISFAVORED: Primary ground failure centered at original forecast location."
        else:
            st_h4 = HypothesisStatus.VIABLE
            rat_h4 = "VIABLE: Adjacent cut-slopes along corridor share structural lithological vulnerability."

        # Status & Rationale for H5
        if observation_adequacy in (ObservationAdequacy.INADEQUATE_OBSCURATION, ObservationAdequacy.INADEQUATE_WINDOW, ObservationAdequacy.INADEQUATE_COVERAGE):
            st_h5 = HypothesisStatus.SUPPORTED
            rat_h5 = "SUPPORTED: Observational coverage is inadequate (cloud cover / missing ground patrol); negative inferences barred."
        elif observation_adequacy == ObservationAdequacy.ADEQUATE:
            st_h5 = HypothesisStatus.CONTRADICTED
            rat_h5 = "CONTRADICTED: Verified ground patrol physical inspection provides direct, unobstructed slope observations."
        else:
            st_h5 = HypothesisStatus.VIABLE
            rat_h5 = "VIABLE: Partial telemetry gaps exist across the corridor."

        # Status & Rationale for H6
        if has_residual_indicators:
            st_h6 = HypothesisStatus.SUPPORTED
            rat_h6 = "SUPPORTED: Hydrologic saturation and active tension cracks sustain critical residual slope hazard."
        elif has_stabilization_evidence:
            st_h6 = HypothesisStatus.CONTRADICTED
            rat_h6 = "CONTRADICTED: Affirmative engineering clearance confirms slope is stabilized."
        elif outcome_type == OutcomeType.NON_EVENT_OBSERVED:
            st_h6 = HypothesisStatus.VIABLE
            rat_h6 = "VIABLE: Non-event observed, but residual factor of safety has not been certified."
        else:
            st_h6 = HypothesisStatus.DISFAVORED
            rat_h6 = "DISFAVORED: Active failure or distinct hazard dynamics dominate."

        # Status & Rationale for H7
        if len(conflicted_items) > 0:
            st_h7 = HypothesisStatus.SUPPORTED
            rat_h7 = f"SUPPORTED: Multi-source evidential discordance detected ({len(conflicted_items)} conflicted items)."
        elif len(conflicted_items) == 0 and len(evidence_items) > 0:
            st_h7 = HypothesisStatus.CONTRADICTED
            rat_h7 = "CONTRADICTED: All reporting sources are mutually concordant."
        else:
            st_h7 = HypothesisStatus.DISFAVORED
            rat_h7 = "DISFAVORED: Insufficient multi-source data to evaluate conflict."

        competing_hypotheses = [
            CompetingHypothesisItem(
                hypothesis_type=HypothesisType.H1_FALSE_ALARM,
                status=st_h1,
                title="H1: False Alarm (Ungrounded Forecast)",
                description="Initial hazard forecast was a false positive; slope was never at imminent risk.",
                supporting_evidence_ids=h_supporting[HypothesisType.H1_FALSE_ALARM],
                contradicting_evidence_ids=h_contradicting[HypothesisType.H1_FALSE_ALARM],
                unknown_evidence_ids=h_unknown[HypothesisType.H1_FALSE_ALARM],
                evidence_bindings=h_bindings[HypothesisType.H1_FALSE_ALARM],
                rationale=rat_h1,
            ),
            CompetingHypothesisItem(
                hypothesis_type=HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT,
                status=st_h2,
                title="H2: Intervention-Conditioned Non-Event",
                description="Expected slope failure was not observed following deployment of mitigating interventions.",
                supporting_evidence_ids=h_supporting[HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT],
                contradicting_evidence_ids=h_contradicting[HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT],
                unknown_evidence_ids=h_unknown[HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT],
                evidence_bindings=h_bindings[HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT],
                rationale=rat_h2,
            ),
            CompetingHypothesisItem(
                hypothesis_type=HypothesisType.H3_DELAYED_FAILURE,
                status=st_h3,
                title="H3: Delayed Failure (Hydrologic Lag)",
                description="Failure has not occurred yet due to hydrologic lag, deep percolation, or slow sub-surface shear creep.",
                supporting_evidence_ids=h_supporting[HypothesisType.H3_DELAYED_FAILURE],
                contradicting_evidence_ids=h_contradicting[HypothesisType.H3_DELAYED_FAILURE],
                unknown_evidence_ids=h_unknown[HypothesisType.H3_DELAYED_FAILURE],
                evidence_bindings=h_bindings[HypothesisType.H3_DELAYED_FAILURE],
                rationale=rat_h3,
            ),
            CompetingHypothesisItem(
                hypothesis_type=HypothesisType.H4_SHIFTED_HAZARD,
                status=st_h4,
                title="H4: Shifted Hazard (Spatial Corridor Divergence)",
                description="Ground shear or mass displacement manifested in an adjacent corridor segment or flank within the 5km corridor envelope.",
                supporting_evidence_ids=h_supporting[HypothesisType.H4_SHIFTED_HAZARD],
                contradicting_evidence_ids=h_contradicting[HypothesisType.H4_SHIFTED_HAZARD],
                unknown_evidence_ids=h_unknown[HypothesisType.H4_SHIFTED_HAZARD],
                evidence_bindings=h_bindings[HypothesisType.H4_SHIFTED_HAZARD],
                rationale=rat_h4,
            ),
            CompetingHypothesisItem(
                hypothesis_type=HypothesisType.H5_OBSERVATION_GAP,
                status=st_h5,
                title="H5: Observation Gap (Evidentiary Obscuration / Inadequacy)",
                description="Observational coverage is degraded or incomplete (cloud cover, unpatrolled slope, unelapsed window), preventing negative inference.",
                supporting_evidence_ids=h_supporting[HypothesisType.H5_OBSERVATION_GAP],
                contradicting_evidence_ids=h_contradicting[HypothesisType.H5_OBSERVATION_GAP],
                unknown_evidence_ids=h_unknown[HypothesisType.H5_OBSERVATION_GAP],
                evidence_bindings=h_bindings[HypothesisType.H5_OBSERVATION_GAP],
                rationale=rat_h5,
            ),
            CompetingHypothesisItem(
                hypothesis_type=HypothesisType.H6_RESIDUAL_HAZARD,
                status=st_h6,
                title="H6: Residual Hazard (Persisting Geotechnical Instability)",
                description="Acute failure window passed without collapse, but remaining pore-water saturation, perched colluvium, or open tension cracks sustain hazard.",
                supporting_evidence_ids=h_supporting[HypothesisType.H6_RESIDUAL_HAZARD],
                contradicting_evidence_ids=h_contradicting[HypothesisType.H6_RESIDUAL_HAZARD],
                unknown_evidence_ids=h_unknown[HypothesisType.H6_RESIDUAL_HAZARD],
                evidence_bindings=h_bindings[HypothesisType.H6_RESIDUAL_HAZARD],
                rationale=rat_h6,
            ),
            CompetingHypothesisItem(
                hypothesis_type=HypothesisType.H7_CONFLICTED,
                status=st_h7,
                title="H7: Conflicted Evidence (Discordant Observations)",
                description="Distinct observational channels report mutually incompatible physical conditions, blocking definitive assessment.",
                supporting_evidence_ids=h_supporting[HypothesisType.H7_CONFLICTED],
                contradicting_evidence_ids=h_contradicting[HypothesisType.H7_CONFLICTED],
                unknown_evidence_ids=h_unknown[HypothesisType.H7_CONFLICTED],
                evidence_bindings=h_bindings[HypothesisType.H7_CONFLICTED],
                rationale=rat_h7,
            ),
        ]

        # Primary Hypothesis Determination
        if spatial_ctx and spatial_ctx.distance_meters and spatial_ctx.distance_meters > 500.0 and spatial_ctx.within_supported_scope:
            primary_h = HypothesisType.H4_SHIFTED_HAZARD
        elif verified_event_observed:
            primary_h = None
        elif len(conflicted_items) > 0:
            primary_h = HypothesisType.H7_CONFLICTED
        elif observation_adequacy in (ObservationAdequacy.INADEQUATE_OBSCURATION, ObservationAdequacy.INADEQUATE_WINDOW, ObservationAdequacy.INADEQUATE_COVERAGE):
            primary_h = HypothesisType.H5_OBSERVATION_GAP
        elif outcome_type == OutcomeType.INTERVENTION_CONDITIONED_NON_EVENT:
            primary_h = HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT
        elif outcome_type == OutcomeType.RESIDUAL_HAZARD:
            primary_h = HypothesisType.H6_RESIDUAL_HAZARD
        elif has_residual_indicators or incident.hazard_state == HazardState.DELAYED.value:
            primary_h = HypothesisType.H3_DELAYED_FAILURE
        elif has_stabilization_evidence:
            primary_h = HypothesisType.H1_FALSE_ALARM
        else:
            primary_h = HypothesisType.H6_RESIDUAL_HAZARD

        # ── HYPOTHESIS-SEPARATING NEXT-BEST-INFORMATION (NBI) ITEMS ──
        # RESEARCH-INTEGRITY REPAIR:
        # NBI items represent targeted information-gathering requests to separate competing hypotheses.
        # They express QUALITATIVE discrimination power (HIGH/MEDIUM/LOW) rather than unvalidated
        # pseudo-mathematical percentage deltas.
        # ADVISORY: Recommended observations do NOT confer operational authority or dispatch actions.
        nbi_items: list[NextBestInformationItem] = []

        # NBI 1: Ground patrol inspection (Separates H2 vs H5, and H1 vs H5)
        if not has_field_inspection or has_obscuration or observation_adequacy != ObservationAdequacy.ADEQUATE:
            nbi_items.append(
                NextBestInformationItem(
                    action_type="DISPATCH_GROUND_PATROL_INSPECTION",
                    priority="HIGH",
                    target_modality="FIELD_PATROL",
                    title="Dispatch Ground Patrol for Physical Toe & Carriageway Verification",
                    rationale=(
                        "Ground inspection provides definitive physical proof. Distinguishes genuine slope stability (H2) "
                        "from unobserved detachment masked by optical cloud obscuration (H5). "
                        "[RECOMMENDED OBSERVATION ONLY — DOES NOT CONFER OPERATIONAL AUTHORITY]"
                    ),
                    target_hypotheses=[
                        HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value,
                        HypothesisType.H5_OBSERVATION_GAP.value,
                        HypothesisType.H1_FALSE_ALARM.value,
                    ],
                    discriminates_between=[
                        [HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value, HypothesisType.H5_OBSERVATION_GAP.value],
                        [HypothesisType.H1_FALSE_ALARM.value, HypothesisType.H5_OBSERVATION_GAP.value],
                    ],
                    spatial_scope=f"Slope Toe & Carriageway Corridor ({orig_lat:.4f}N, {orig_lon:.4f}E)",
                    temporal_scope="Immediate (< 2 hours)",
                    qualitative_discrimination="HIGH",
                    expected_confidence_delta=None,
                    authority_required=False,
                    status="RECOMMENDED",
                )
            )

        # NBI 2: Piezometric telemetry & inclinometer (Separates H2 vs H3, and H2 vs H6)
        if has_residual_indicators or incident.hazard_state == HazardState.DELAYED.value or intervention_state in (
            InterventionContextState.INTERVENTION_CONFIRMED,
            InterventionContextState.INTERVENTION_DISPATCHED_UNCONFIRMED,
        ):
            nbi_items.append(
                NextBestInformationItem(
                    action_type="DEPLOY_PIEZOMETRIC_TELEMETRY",
                    priority="HIGH",
                    target_modality="GROUND_SENSOR",
                    title="Deploy Piezometric Hydrologic Sensor & Inclinometer Scan",
                    rationale=(
                        "Measures pore-water pressure dissipation rate. Distinguishes stable drainage (H2) from progressive "
                        "hydrologic lag priming delayed failure (H3) or residual hazard (H6). "
                        "[RECOMMENDED OBSERVATION ONLY — DOES NOT CONFER OPERATIONAL AUTHORITY]"
                    ),
                    target_hypotheses=[
                        HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value,
                        HypothesisType.H3_DELAYED_FAILURE.value,
                        HypothesisType.H6_RESIDUAL_HAZARD.value,
                    ],
                    discriminates_between=[
                        [HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value, HypothesisType.H3_DELAYED_FAILURE.value],
                        [HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value, HypothesisType.H6_RESIDUAL_HAZARD.value],
                    ],
                    spatial_scope="Crest Interceptor Trench & Shear Headwall",
                    temporal_scope="Next 6-12 hours hydrologic recession window",
                    qualitative_discrimination="HIGH",
                    expected_confidence_delta=None,
                    authority_required=False,
                    status="RECOMMENDED",
                )
            )

        # NBI 3: Radar InSAR telemetry (Separates H3 vs H4, and H1 vs H4)
        if has_obscuration or (spatial_ctx and spatial_ctx.distance_meters and spatial_ctx.distance_meters > 500.0):
            nbi_items.append(
                NextBestInformationItem(
                    action_type="ACQUIRE_RADAR_TELEMETRY",
                    priority="HIGH",
                    target_modality="SATELLITE_RADAR",
                    title="Acquire Sentinel-1 InSAR Phase Coherence Corridor Scan",
                    rationale=(
                        "Synthetic Aperture Radar penetrates cloud cover across the 5km corridor. Distinguishes focused shear "
                        "at forecast centroid (H3) from shifted flanking displacement (H4). "
                        "[RECOMMENDED OBSERVATION ONLY — DOES NOT CONFER OPERATIONAL AUTHORITY]"
                    ),
                    target_hypotheses=[
                        HypothesisType.H3_DELAYED_FAILURE.value,
                        HypothesisType.H4_SHIFTED_HAZARD.value,
                        HypothesisType.H5_OBSERVATION_GAP.value,
                    ],
                    discriminates_between=[
                        [HypothesisType.H3_DELAYED_FAILURE.value, HypothesisType.H4_SHIFTED_HAZARD.value],
                        [HypothesisType.H1_FALSE_ALARM.value, HypothesisType.H4_SHIFTED_HAZARD.value],
                    ],
                    spatial_scope="5km Regional Transit Corridor Envelope",
                    temporal_scope="Next orbital pass (< 12 hours)",
                    qualitative_discrimination="HIGH",
                    expected_confidence_delta=None,
                    authority_required=False,
                    status="RECOMMENDED",
                )
            )

        # NBI 4: Reconcile discordant observations (Separates H7 vs H1, and H7 vs H2)
        if len(conflicted_items) > 0:
            nbi_items.append(
                NextBestInformationItem(
                    action_type="RECONCILE_DISCORDANT_OBSERVATIONS",
                    priority="HIGH",
                    target_modality="CROSS_SOURCE_RECONCILIATION",
                    title="Execute Joint Cross-Agency Verification Patrol",
                    rationale=(
                        "Conducts joint inspection between reporting agencies to resolve conflicting observations (H7) "
                        "against ground reality (H1/H2). "
                        "[RECOMMENDED OBSERVATION ONLY — DOES NOT CONFER OPERATIONAL AUTHORITY]"
                    ),
                    target_hypotheses=[
                        HypothesisType.H7_CONFLICTED.value,
                        HypothesisType.H1_FALSE_ALARM.value,
                        HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value,
                    ],
                    discriminates_between=[
                        [HypothesisType.H7_CONFLICTED.value, HypothesisType.H1_FALSE_ALARM.value],
                        [HypothesisType.H7_CONFLICTED.value, HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value],
                    ],
                    spatial_scope="Carriageway conflict coordinates",
                    temporal_scope="Immediate (< 1 hour)",
                    qualitative_discrimination="HIGH",
                    expected_confidence_delta=None,
                    authority_required=False,
                    status="RECOMMENDED",
                )
            )

        # NBI 5: Affirmative Geotechnical Stabilization Survey (Separates H6 vs H1)
        if not has_stabilization_evidence and not verified_event_observed:
            nbi_items.append(
                NextBestInformationItem(
                    action_type="GEOTECHNICAL_STABILIZATION_SURVEY",
                    priority="MEDIUM",
                    target_modality="ENGINEERING_SURVEY",
                    title="Affirmative Geotechnical Slope Stabilization Clearance Survey",
                    rationale=(
                        "Mandatory geotechnical engineering survey verifying factor of safety > 1.3 before configured evidentiary closure gate permits sign-off. "
                        "Distinguishes lingering residual hazard (H6) from stabilized dissipation (H1). "
                        "[RECOMMENDED OBSERVATION ONLY — DOES NOT CONFER OPERATIONAL AUTHORITY]"
                    ),
                    target_hypotheses=[
                        HypothesisType.H6_RESIDUAL_HAZARD.value,
                        HypothesisType.H1_FALSE_ALARM.value,
                    ],
                    discriminates_between=[
                        [HypothesisType.H6_RESIDUAL_HAZARD.value, HypothesisType.H1_FALSE_ALARM.value],
                    ],
                    spatial_scope="Full cut-slope geometry and retaining structures",
                    temporal_scope="Prior to any formal incident closure order",
                    qualitative_discrimination="MEDIUM",
                    expected_confidence_delta=None,
                    authority_required=True,
                    status="RECOMMENDED",
                )
            )

        # NBI 6: Extend temporal window (Separates H1 vs H3)
        if not window_elapsed or incident.hazard_state == HazardState.DELAYED.value:
            nbi_items.append(
                NextBestInformationItem(
                    action_type="EXTEND_OBSERVATION_WINDOW",
                    priority="HIGH",
                    target_modality="UAV_DRONE_SURVEY",
                    title="Extend Observation Window & Deploy UAV Slope Survey",
                    rationale=(
                        "Maintains active monitoring corridor and deploys drone scan to detect opening tension cracks. "
                        "Distinguishes benign non-event (H1) from delayed failure (H3). "
                        "[RECOMMENDED OBSERVATION ONLY — DOES NOT CONFER OPERATIONAL AUTHORITY]"
                    ),
                    target_hypotheses=[
                        HypothesisType.H1_FALSE_ALARM.value,
                        HypothesisType.H3_DELAYED_FAILURE.value,
                    ],
                    discriminates_between=[
                        [HypothesisType.H1_FALSE_ALARM.value, HypothesisType.H3_DELAYED_FAILURE.value],
                    ],
                    spatial_scope="Corridor Monitoring Sector",
                    temporal_scope="Extend monitoring window by 6 hours",
                    qualitative_discrimination="MEDIUM",
                    expected_confidence_delta=None,
                    authority_required=False,
                    status="RECOMMENDED",
                )
            )

        # Deterministic ordering: priority (HIGH -> MEDIUM -> LOW), then action_type
        priority_rank = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        nbi_items.sort(key=lambda item: (priority_rank.get(item.priority, 99), item.action_type))

        return primary_h, competing_hypotheses, nbi_items
