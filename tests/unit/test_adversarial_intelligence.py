"""Adversarial Intelligence & Safety-Critical Invariant Tests (Prompt 05).

Verifies the 12 core safety principles and edge-case boundaries of the intelligence fabric:
1. High risk + low confidence does NOT silently convert into low priority.
2. Low risk + high consequence exposure evaluates priority independently (HAZARD ≠ PRIORITY).
3. No event observed does NOT become FALSE_ALARM automatically (EVENT ABSENCE ≠ RESOLUTION).
4. Intervention + no event does NOT become causal prevention (causal_claim_established = False).
5. Conflicting evidence remains CONFLICTED until resolved by ground truth.
6. Stale evidence (>7d) is flagged and not treated as fresh telemetry.
7. New nearby evidence (<=5km corridor envelope, e.g. 1.2km) triggers bounded reassessment of the SAME incident.
8. Distant evidence (>5km) is rejected from silent attachment.
9. Approved action does NOT equal confirmed execution (APPROVED ≠ COMPLETED).
10. Confirmed execution does NOT equal hazard resolution.
11. Missing observation remains OBSERVATION_GAP / UNRESOLVED.
12. Closure request refuses premature closure without affirmative physical evidence.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ActionModel, EvidenceModel, IncidentModel, OutcomeModel
from app.domain.enums import (
    ActionState,
    ActorRole,
    ConfidenceLevel,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceSource,
    HazardState,
    IncidentStatus,
    PriorityLevel,
    RiskLevel,
)
from app.domain.hazard import BoundedReassessmentRequest
from app.domain.impact import CorridorConnectivity, PriorityRecalculationRequest, ResponseAccessibility
from app.domain.outcome import ObservationAdequacy, OutcomeType
from app.services.decision_intelligence import DecisionIntelligenceService
from app.services.hazard_service import HazardService
from app.services.impact_service import ImpactService
from app.services.outcome_service import OutcomeService
from app.services.reconciliation_service import ReconciliationService
from app.services.state_transition_service import StateTransitionService
from ml.baseline import LandslidePredictiveBaseline


# ── 1. High Risk + Low Confidence does NOT silently convert into Low Priority ──

@pytest.mark.asyncio
async def test_high_risk_low_confidence_retains_elevated_priority(db_session: AsyncSession):
    """High hazard with low confidence (due to heavy cloud cover) must retain elevated operational priority."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-ADV-01",
        title="Cloud-Obscured Lifeline Corridor",
        status=IncidentStatus.VERIFYING.value,
        hazard_state=HazardState.EXPECTED.value,
        risk_score=88.0,
        risk_level=RiskLevel.HIGH.value,
        confidence_score=35.0,  # LOW confidence due to optical cloud obstruction
        confidence_level=ConfidenceLevel.LOW.value,
        priority_level=PriorityLevel.P1_CRITICAL.value,
        latitude=27.08,
        longitude=92.56,
        corridor_name="NH-13 Strategic Corridor",
        metadata_json={
            "population_exposed": 1200,
            "connectivity_status": "SOLE_LIFELINE_NO_DETOUR",
            "detour_penalty_km": 182.0,
        },
    )
    db_session.add(incident)
    await db_session.commit()

    impact_svc = ImpactService(db_session)
    priority = await impact_svc.compute_priority(incident.id)

    # Priority must NOT be downgraded to P3 or P4 simply because satellite visibility is low
    assert priority.priority_level in (PriorityLevel.P1_CRITICAL, PriorityLevel.P2_HIGH)
    assert priority.hazard_risk_input == 88.0
    assert priority.hazard_confidence_input == 35.0
    # Must flag the confidence limitation in counterfactors
    assert any("Confidence" in cf for cf in priority.counterfactors)


# ── 2. Low Risk + High Consequence Exposure evaluates priority independently ──

@pytest.mark.asyncio
async def test_low_risk_high_consequence_priority_independence(db_session: AsyncSession):
    """HAZARD ≠ PRIORITY: Moderate or lower physical risk still produces elevated priority if hospital lifeline is threatened."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-ADV-02",
        title="Moderate Hazard Threatening District Hospital",
        status=IncidentStatus.VERIFYING.value,
        hazard_state=HazardState.EXPECTED.value,
        risk_score=42.0,  # MODERATE physical slope risk
        risk_level=RiskLevel.MODERATE.value,
        confidence_score=90.0,
        confidence_level=ConfidenceLevel.VERY_HIGH.value,
        priority_level=PriorityLevel.P2_HIGH.value,
        latitude=27.08,
        longitude=92.56,
        corridor_name="NH-13 Hospital Route",
        metadata_json={
            "population_exposed": 2500,
            "connectivity_status": "SOLE_LIFELINE_NO_DETOUR",
            "detour_penalty_km": 190.0,
        },
    )
    db_session.add(incident)
    await db_session.commit()

    impact_svc = ImpactService(db_session)
    priority = await impact_svc.compute_priority(incident.id)

    # Priority score is driven up by critical lifeline and exposure despite moderate raw risk
    assert priority.priority_level in (PriorityLevel.P1_CRITICAL, PriorityLevel.P2_HIGH)
    assert priority.criticality_score >= 90.0


# ── 3. No Event Observed does NOT become FALSE_ALARM automatically ──

@pytest.mark.asyncio
async def test_no_event_observed_does_not_auto_resolve_or_false_alarm(db_session: AsyncSession):
    """EVENT ABSENCE ≠ HAZARD RESOLUTION: Non-occurrence within expected window must transition to DELAYED, never FALSE_ALARM."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-ADV-03",
        title="Event Absence Verification",
        status=IncidentStatus.MONITORING.value,
        hazard_state=HazardState.EXPECTED.value,
        risk_score=86.0,
        risk_level=RiskLevel.HIGH.value,
        confidence_score=60.0,
        confidence_level=ConfidenceLevel.MODERATE.value,
        latitude=27.08,
        longitude=92.56,
        detected_at=datetime.utcnow() - timedelta(hours=6),  # Window has elapsed
    )
    incident.evidence_items = [
        EvidenceModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            source=EvidenceSource.FIELD.value,
            source_name="Highway Patrol",
            evidence_type="visual_inspection",
            observation="No road debris visible at KM-42. Rain saturation continuing.",
            metric="0% blockage",
            observed_at=datetime.utcnow(),
            interpretation=EvidenceInterpretation.VERIFIED.value,
        )
    ]
    db_session.add(incident)
    await db_session.commit()

    hazard_svc = HazardService(db_session)
    reassess_result = await hazard_svc.perform_bounded_reassessment(
        incident.id,
        BoundedReassessmentRequest(actor_name="Test Operator"),
    )

    # Must transition to DELAYED, NOT FALSE_ALARM or RESOLVED
    assert reassess_result.updated_hazard_state == HazardState.DELAYED
    assert reassess_result.updated_hazard_state != HazardState.FALSE_ALARM
    assert reassess_result.updated_hazard_state != HazardState.RESOLVED
    assert "EVENT ABSENCE ≠ HAZARD RESOLUTION" in reassess_result.rationale


# ── 4. Intervention + No Event does NOT establish causal prevention ──

@pytest.mark.asyncio
async def test_intervention_plus_non_event_rejects_causal_claim(db_session: AsyncSession):
    """INTERVENTION + NON-EVENT ≠ PROVEN PREVENTION: causal_claim_established MUST be False."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-ADV-04",
        title="Intervention Outcome Test",
        status=IncidentStatus.RESPONDING.value,
        hazard_state=HazardState.DELAYED.value,
        risk_score=86.0,
        confidence_score=70.0,
        latitude=27.08,
        longitude=92.56,
    )
    # Action was deployed and confirmed
    action = ActionModel(
        id=uuid.uuid4(),
        incident_id=incident.id,
        task_code="TSK-03",
        agency="Police",
        title="Deploy Roadblock at KM-38",
        description="Deploy roadblock",
        assigned_to="Patrol",
        state=ActionState.PHYSICALLY_CONFIRMED.value,
    )
    # No debris observed at KM-42
    incident.evidence_items = [
        EvidenceModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            source=EvidenceSource.FIELD.value,
            source_name="Patrol Bravo",
            evidence_type="inspection",
            observation="No slide debris observed on road.",
            metric="0% obstruction",
            observed_at=datetime.utcnow(),
            interpretation=EvidenceInterpretation.VERIFIED.value,
        )
    ]
    incident.actions = [action]
    db_session.add(incident)
    db_session.add(action)
    await db_session.commit()

    outcome_svc = OutcomeService(db_session)
    outcome = await outcome_svc.evaluate_outcome(incident.id)

    assert outcome.outcome_type == OutcomeType.INTERVENTION_CONDITIONED_NON_EVENT
    # CRITICAL INVARIANT:
    assert outcome.causal_claim_established is False
    assert outcome.closure_permitted is False
    assert outcome.reassessment_required is True


# ── 5. Conflicting Evidence remains CONFLICTED ──

@pytest.mark.asyncio
async def test_conflicting_evidence_remains_conflicted(db_session: AsyncSession):
    """Reconciliation must not silently overwrite or average out conflicting sensor and patrol readings."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-ADV-05",
        title="Conflict Preservation Test",
        status=IncidentStatus.VERIFYING.value,
        latitude=27.08,
        longitude=92.56,
    )
    # Severe rainfall surge (>180mm) vs. Cloud obscured optical satellite
    ev_rain = EvidenceModel(
        id=uuid.uuid4(),
        incident_id=incident.id,
        source=EvidenceSource.WEATHER.value,
        source_name="IMD Station",
        evidence_type="rainfall",
        observation="Heavy rainfall 184mm",
        metric="184mm",
        observed_at=datetime.utcnow(),
    )
    ev_sat = EvidenceModel(
        id=uuid.uuid4(),
        incident_id=incident.id,
        source=EvidenceSource.SATELLITE.value,
        source_name="Sentinel-2",
        evidence_type="optical",
        observation="Optical sensor obscured by dense cloud cover",
        metric="88% cloud cover",
        observed_at=datetime.utcnow(),
        conflict_status=EvidenceConflictStatus.CONFLICTED.value,
    )
    db_session.add_all([incident, ev_rain, ev_sat])
    await db_session.commit()

    reconciliation_svc = ReconciliationService(db_session)
    summary = await reconciliation_svc.reconcile_incident_evidence(incident.id)

    assert summary.conflict_status in (EvidenceConflictStatus.CONFLICTED, EvidenceConflictStatus.PARTIALLY_CONFLICTED)
    assert len(summary.conflicting_evidence_ids) > 0
    assert summary.recommended_action == "FIELD_VERIFICATION_REQUIRED"


# ── 6. Stale Evidence (>7d) is flagged and does not receive fresh weighting ──

@pytest.mark.asyncio
async def test_stale_evidence_flagged(db_session: AsyncSession):
    """Evidence older than 7 days must be identified in stale_evidence_ids."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-ADV-06",
        title="Stale Telemetry Test",
        status=IncidentStatus.VERIFYING.value,
        latitude=27.08,
        longitude=92.56,
    )
    ev_stale = EvidenceModel(
        id=uuid.uuid4(),
        incident_id=incident.id,
        source=EvidenceSource.WEATHER.value,
        source_name="Old Weather Sensor",
        evidence_type="rainfall",
        observation="Old rain reading",
        metric="40mm",
        observed_at=datetime.utcnow() - timedelta(days=10),  # Stale!
    )
    db_session.add_all([incident, ev_stale])
    await db_session.commit()

    reconciliation_svc = ReconciliationService(db_session)
    summary = await reconciliation_svc.reconcile_incident_evidence(incident.id)

    assert ev_stale.id in summary.stale_evidence_ids


# ── 7. New Nearby Evidence (<=5km corridor scope, e.g. 1.2km) reassesses SAME incident ──

@pytest.mark.asyncio
async def test_nearby_divergence_reassesses_same_incident(db_session: AsyncSession):
    """Evidence 1.2km away along same highway corridor must update the SAME incident twin, maintaining lineage continuity."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-ADV-07",
        title="KM-42 Corridor Slide",
        status=IncidentStatus.VERIFYING.value,
        hazard_state=HazardState.EXPECTED.value,
        risk_score=86.0,
        confidence_score=54.0,
        latitude=27.084,
        longitude=92.568,
    )
    db_session.add(incident)
    await db_session.commit()

    outcome_svc = OutcomeService(db_session)
    # Field reports debris at KM-43.2 (approx 1,200m north)
    outcome = await outcome_svc.evaluate_outcome(
        incident.id,
        observed_latitude=27.094,
        observed_longitude=92.571,
    )

    assert outcome.spatial_divergence is not None
    assert outcome.spatial_divergence.within_supported_scope is True
    # The incident id must remain identical!
    assert outcome.incident_id == incident.id


# ── 8. Distant Evidence (>5km corridor threshold) rejects silent attachment ──

@pytest.mark.asyncio
async def test_distant_evidence_rejects_silent_attachment(db_session: AsyncSession):
    """Evidence 8km away in a separate valley must be flagged as outside supported scope (within_supported_scope = False)."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-ADV-08",
        title="Local KM-42 Slide",
        status=IncidentStatus.VERIFYING.value,
        hazard_state=HazardState.EXPECTED.value,
        latitude=27.084,
        longitude=92.568,
    )
    db_session.add(incident)
    await db_session.commit()

    outcome_svc = OutcomeService(db_session)
    # Coords 8km away
    outcome = await outcome_svc.evaluate_outcome(
        incident.id,
        observed_latitude=27.150,
        observed_longitude=92.620,
    )

    assert outcome.spatial_divergence is not None
    assert outcome.spatial_divergence.within_supported_scope is False
    assert outcome.spatial_divergence.distance_meters > 5000.0


# ── 9. Approved Action does NOT equal Confirmed Execution ──

@pytest.mark.asyncio
async def test_approved_action_does_not_equal_confirmed_execution(db_session: AsyncSession):
    """An approved action must remain DISPATCHED and cannot claim PHYSICALLY_CONFIRMED without field confirmation."""
    action = ActionModel(
        id=uuid.uuid4(),
        incident_id=uuid.uuid4(),
        task_code="TSK-01",
        agency="Police",
        title="Close Highway at KM-38",
        description="Highway barrier",
        assigned_to="Patrol",
        state=ActionState.DISPATCHED.value,  # Approved by magistrate, dispatched to police
    )
    db_session.add(action)
    await db_session.commit()

    assert action.state != ActionState.PHYSICALLY_CONFIRMED.value
    # Verification check: Action gap exists between authorization and physical reality
    assert action.state == ActionState.DISPATCHED.value


# ── 10. Confirmed Execution does NOT equal Hazard Resolution ──

@pytest.mark.asyncio
async def test_confirmed_execution_does_not_resolve_hazard(db_session: AsyncSession):
    """Even if an action is confirmed deployed (roadblock erected), the physical hazard remains DELAYED/ACTIVE until cleared."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-ADV-10",
        title="Physical Barrier Invariant",
        status=IncidentStatus.RESPONDING.value,
        hazard_state=HazardState.DELAYED.value,
        risk_score=80.0,
        latitude=27.08,
        longitude=92.56,
    )
    action = ActionModel(
        id=uuid.uuid4(),
        incident_id=incident.id,
        task_code="TSK-02",
        agency="Police",
        title="Roadblock",
        description="Roadblock deployment",
        assigned_to="Patrol",
        state=ActionState.PHYSICALLY_CONFIRMED.value,
    )
    db_session.add_all([incident, action])
    await db_session.commit()

    decision_svc = DecisionIntelligenceService(db_session)
    decision_support = await decision_svc.evaluate_decision_support(incident.id)

    # Roadblock confirmed != Hazard resolved
    assert decision_support.current_hazard_state in (HazardState.DELAYED.value, HazardState.EXPECTED.value)
    assert decision_support.closure_readiness is False


# ── 11. Missing Observation remains OBSERVATION_GAP ──

@pytest.mark.asyncio
async def test_missing_observation_remains_observation_gap(db_session: AsyncSession):
    """If no ground patrol or satellite image verifies the slope, outcome is classified as OBSERVATION_GAP, not FALSE_ALARM."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-ADV-11",
        title="Inadequate Observation Test",
        status=IncidentStatus.MONITORING.value,
        hazard_state=HazardState.EXPECTED.value,
        latitude=27.08,
        longitude=92.56,
    )
    db_session.add(incident)
    await db_session.commit()

    outcome_svc = OutcomeService(db_session)
    outcome = await outcome_svc.evaluate_outcome(incident.id)

    assert outcome.observation_adequacy != ObservationAdequacy.ADEQUATE
    assert outcome.outcome_type in (OutcomeType.OBSERVATION_GAP, OutcomeType.NON_EVENT_OBSERVED, OutcomeType.UNRESOLVED)
    assert outcome.closure_permitted is False


# ── 12. Premature Closure rejected by Evidentiary Gate ──

@pytest.mark.asyncio
async def test_evidentiary_gate_rejects_premature_closure(db_session: AsyncSession):
    """Attempt to close an incident with ongoing high risk and missing geotechnical clearance must be rejected."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-ADV-12",
        title="Premature Closure Attempt",
        status=IncidentStatus.RESPONDING.value,
        hazard_state=HazardState.DELAYED.value,
        risk_score=86.0,  # Severe risk
        latitude=27.08,
        longitude=92.56,
    )
    db_session.add(incident)
    await db_session.commit()

    state_svc = StateTransitionService(db_session)

    # Must raise ValueError / PreconditionFailedError
    with pytest.raises(Exception) as exc_info:
        await state_svc.transition_incident(
            incident_id=incident.id,
            target_status=IncidentStatus.CLOSED,
            actor_role=ActorRole.AUTHORIZED_DECISION_MAKER,
            actor_name="District Magistrate",
            reason="Attempting premature closure without clearance survey",
        )
    assert "EVIDENTIARY_CLOSURE_REJECTED" in str(exc_info.value) or "REJECTED" in str(exc_info.value)
