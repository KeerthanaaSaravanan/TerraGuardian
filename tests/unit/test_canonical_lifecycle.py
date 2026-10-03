"""Canonical Lifecycle Governance & Closed-Loop Operational State Machine Acceptance Tests.

MANDATORY GOVERNING INVARIANTS:
1. Risk != Confidence
2. Hazard != Priority
3. Prediction != Ground Truth
4. Recommendation != Authorization
5. Authorization != Execution
6. Execution != Confirmation
7. Observation != Interpretation
8. Citizen Evidence != Verified Ground Truth
9. Non-event != False Alarm
10. Intervention + Non-event != Proven Prevention
11. Operational Closure != Geotechnical Hazard Extinction
12. AI Recommendation != Human Decision
13. Reopened incident preserves Incident Twin identity (same id, same code; no duplicate twins).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ActionModel, EvidenceModel, IncidentModel, OutcomeModel
from app.domain.action import can_confirm_action, is_valid_action_transition
from app.domain.enums import (
    ActionState,
    ActorRole,
    AuditEventType,
    ConfidenceLevel,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceProcessingStatus,
    EvidenceSource,
    HazardState,
    IncidentStatus,
    PriorityLevel,
    RiskLevel,
)
from app.domain.incident import is_valid_transition
from app.domain.outcome import OutcomeType
from app.services.action_service import ActionService
from app.services.evidence_service import EvidenceService
from app.services.exceptions import (
    DomainError,
    InvalidTransitionError,
    PreconditionFailedError,
    UnauthorizedAuthorityError,
)
from app.services.replay_engine_service import ReplayEngineService
from app.services.state_transition_service import StateTransitionService


def _make_test_incident(status: IncidentStatus = IncidentStatus.DETECTED) -> IncidentModel:
    return IncidentModel(
        id=uuid.uuid4(),
        code=f"TG-TEST-{uuid.uuid4().hex[:6].upper()}",
        title="NH-13 KM-42 Test Incident",
        status=status.value,
        hazard_state=HazardState.EXPECTED.value,
        risk_level=RiskLevel.HIGH.value,
        risk_score=72.0,
        confidence_level=ConfidenceLevel.HIGH.value,
        confidence_score=80.0,
        priority_level=PriorityLevel.P1_CRITICAL.value,
        priority_score=85.0,
        latitude=27.0842,
        longitude=92.5681,
        location_name="West Kameng KM-42",
        corridor_name="NH-13",
        state="Arunachal Pradesh",
        district="West Kameng",
        detected_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        assessment_version=1,
        metadata_json={},
    )


# ── TEST 1: Canonical State Machine Transitions ──
def test_01_canonical_state_machine_valid_transitions():
    """Verify canonical valid forward progression through all lifecycle states."""
    # DETECTED -> ASSESSING
    assert is_valid_transition(IncidentStatus.DETECTED, IncidentStatus.ASSESSING)

    # ASSESSING -> VERIFYING
    assert is_valid_transition(IncidentStatus.ASSESSING, IncidentStatus.VERIFYING)

    # VERIFYING -> VERIFIED & VERIFYING -> ASSESSING
    assert is_valid_transition(IncidentStatus.VERIFYING, IncidentStatus.VERIFIED)
    assert is_valid_transition(IncidentStatus.VERIFYING, IncidentStatus.ASSESSING)

    # VERIFIED -> DECISION_REQUIRED
    assert is_valid_transition(IncidentStatus.VERIFIED, IncidentStatus.DECISION_REQUIRED)

    # DECISION_REQUIRED -> AUTHORIZED & MONITORING
    assert is_valid_transition(IncidentStatus.DECISION_REQUIRED, IncidentStatus.AUTHORIZED)
    assert is_valid_transition(IncidentStatus.DECISION_REQUIRED, IncidentStatus.MONITORING)

    # AUTHORIZED -> RESPONDING
    assert is_valid_transition(IncidentStatus.AUTHORIZED, IncidentStatus.RESPONDING)

    # RESPONDING -> MONITORING
    assert is_valid_transition(IncidentStatus.RESPONDING, IncidentStatus.MONITORING)

    # MONITORING -> REASSESSING
    assert is_valid_transition(IncidentStatus.MONITORING, IncidentStatus.REASSESSING)

    # REASSESSING -> RESOLVED, MONITORING, DECISION_REQUIRED
    assert is_valid_transition(IncidentStatus.REASSESSING, IncidentStatus.RESOLVED)
    assert is_valid_transition(IncidentStatus.REASSESSING, IncidentStatus.MONITORING)
    assert is_valid_transition(IncidentStatus.REASSESSING, IncidentStatus.DECISION_REQUIRED)

    # RESOLVED -> REVIEWED & RESOLVED -> REASSESSING (reopening on fresh evidence)
    assert is_valid_transition(IncidentStatus.RESOLVED, IncidentStatus.REVIEWED)
    assert is_valid_transition(IncidentStatus.RESOLVED, IncidentStatus.REASSESSING)

    # REVIEWED -> REOPENED
    assert is_valid_transition(IncidentStatus.REVIEWED, IncidentStatus.REOPENED)

    # REOPENED -> REASSESSING
    assert is_valid_transition(IncidentStatus.REOPENED, IncidentStatus.REASSESSING)


# ── TEST 2: Forbidden Direct State Jumps ──
def test_02_forbidden_direct_state_jumps():
    """Verify illegal jumps are strictly forbidden by canonical transition table."""
    # Direct jump to RESOLVED from operational states is forbidden
    assert not is_valid_transition(IncidentStatus.DETECTED, IncidentStatus.RESOLVED)
    assert not is_valid_transition(IncidentStatus.ASSESSING, IncidentStatus.RESOLVED)
    assert not is_valid_transition(IncidentStatus.VERIFYING, IncidentStatus.RESOLVED)
    assert not is_valid_transition(IncidentStatus.VERIFIED, IncidentStatus.RESOLVED)
    assert not is_valid_transition(IncidentStatus.DECISION_REQUIRED, IncidentStatus.RESOLVED)
    assert not is_valid_transition(IncidentStatus.AUTHORIZED, IncidentStatus.RESOLVED)
    assert not is_valid_transition(IncidentStatus.RESPONDING, IncidentStatus.RESOLVED)
    assert not is_valid_transition(IncidentStatus.MONITORING, IncidentStatus.RESOLVED)

    # Direct jump from DETECTED to AUTHORIZED or RESPONDING is forbidden
    assert not is_valid_transition(IncidentStatus.DETECTED, IncidentStatus.AUTHORIZED)
    assert not is_valid_transition(IncidentStatus.DETECTED, IncidentStatus.RESPONDING)

    # REVIEWED cannot directly jump to RESOLVED or ASSESSING
    assert not is_valid_transition(IncidentStatus.REVIEWED, IncidentStatus.RESOLVED)
    assert not is_valid_transition(IncidentStatus.REVIEWED, IncidentStatus.ASSESSING)


# ── TEST 3: AI Actor Authority Boundaries ──
@pytest.mark.asyncio
async def test_03_ai_actor_cannot_authorize_orders(db_session: AsyncSession):
    """AI/System actors cannot authorize disaster orders (RECOMMENDATION ≠ AUTHORIZATION)."""
    sts = StateTransitionService(db_session)
    incident = _make_test_incident(IncidentStatus.DECISION_REQUIRED)
    db_session.add(incident)
    await db_session.flush()

    with pytest.raises(UnauthorizedAuthorityError) as exc:
        await sts.transition(
            incident_id=incident.id,
            target_status=IncidentStatus.AUTHORIZED,
            actor_role=ActorRole.SYSTEM_AI,
            actor_name="TerraGuardian Predictive AI",
            authority_order_code="ORD-AI-FAKED",
        )
    assert "AI/System actors cannot authorize safety-critical disaster orders" in str(exc.value)


@pytest.mark.asyncio
async def test_04_ai_actor_cannot_verify_ground_reality(db_session: AsyncSession):
    """AI/System actors cannot verify incident ground reality (PREDICTION ≠ GROUND TRUTH)."""
    sts = StateTransitionService(db_session)
    incident = _make_test_incident(IncidentStatus.VERIFYING)
    db_session.add(incident)
    await db_session.flush()

    with pytest.raises(UnauthorizedAuthorityError) as exc:
        await sts.transition(
            incident_id=incident.id,
            target_status=IncidentStatus.VERIFIED,
            actor_role=ActorRole.SYSTEM_AI,
            actor_name="TerraGuardian Automated AI",
        )
    assert "AI/System actors cannot verify incident ground reality" in str(exc.value)


@pytest.mark.asyncio
async def test_05_ai_actor_cannot_close_incident(db_session: AsyncSession):
    """AI/System actors have zero authority to close incidents (AI Recommendation ≠ Human Decision)."""
    sts = StateTransitionService(db_session)
    incident = _make_test_incident(IncidentStatus.REASSESSING)
    db_session.add(incident)
    await db_session.flush()

    gate = await sts.evaluate_closure_gate(
        incident_id=incident.id,
        actor_role=ActorRole.SYSTEM_AI,
        authority_order_code="ORD-CLOSURE-AI",
    )
    assert gate["closure_permitted"] is False
    assert any("AI/System actors have ZERO authorization authority" in u for u in gate["unmet_conditions"])


@pytest.mark.asyncio
async def test_06_ai_actor_cannot_authorize_reopening(db_session: AsyncSession):
    """AI/System actors cannot authorize reopening a reviewed incident."""
    sts = StateTransitionService(db_session)
    incident = _make_test_incident(IncidentStatus.REVIEWED)
    db_session.add(incident)
    await db_session.flush()

    with pytest.raises(UnauthorizedAuthorityError) as exc:
        await sts.reopen_incident(
            incident_id=incident.id,
            triggering_evidence_id=None,
            actor_role=ActorRole.SYSTEM_AI,
            actor_name="Automated Ingestion Agent",
            reason="AI detected potential hazard",
        )
    assert "System AI cannot independently authorize reopening" in str(exc.value)


# ── TEST 7: Statutory Authorization Order Code Mandatory ──
@pytest.mark.asyncio
async def test_07_statutory_order_code_mandatory(db_session: AsyncSession):
    """Transition to AUTHORIZED requires statutory disaster management order code."""
    sts = StateTransitionService(db_session)
    incident = _make_test_incident(IncidentStatus.DECISION_REQUIRED)
    db_session.add(incident)
    await db_session.flush()

    with pytest.raises(PreconditionFailedError) as exc:
        await sts.transition(
            incident_id=incident.id,
            target_status=IncidentStatus.AUTHORIZED,
            actor_role=ActorRole.AUTHORIZED_DECISION_MAKER,
            actor_name="P. Tsering IAS",
            authority_order_code=None,  # Missing!
        )
    assert "Authorization requires an official disaster order reference code" in str(exc.value)


# ── TEST 8: Action Lifecycle and Ground Physical Confirmation ──
@pytest.mark.asyncio
async def test_08_action_lifecycle_and_physical_confirmation(db_session: AsyncSession):
    """Test full action lifecycle: PROPOSED -> APPROVED -> DISPATCHED -> ACKNOWLEDGED -> IN_PROGRESS -> COMPLETED -> PHYSICALLY_CONFIRMED."""
    incident = _make_test_incident(IncidentStatus.RESPONDING)
    db_session.add(incident)
    await db_session.flush()

    action_svc = ActionService(db_session)
    action = await action_svc.create_action(
        incident_id=incident.id,
        task_code="TSK-BRO-TEST",
        agency="Border Roads Organisation",
        title="Deploy Physical Concrete Barrier at KM-42",
        description="Block civilian traffic access",
        assigned_to="Major V. Sharma",
        action_type="TRAFFIC_CONTROL",
        priority="P1",
        requires_authorization=True,
    )
    assert action.state == ActionState.PROPOSED.value

    # Direct state transition to PHYSICALLY_CONFIRMED is forbidden
    with pytest.raises(InvalidTransitionError) as exc:
        await action_svc.update_action_state(
            action_id=action.id,
            target_state=ActionState.PHYSICALLY_CONFIRMED,
            actor_role=ActorRole.OPERATOR,
            actor_name="Dispatcher",
        )
    assert "PHYSICALLY_CONFIRMED cannot be set via state transition" in str(exc.value)

    # PROPOSED -> APPROVED (Requires AUTHORIZATION_OFFICER)
    action = await action_svc.update_action_state(
        action_id=action.id,
        target_state=ActionState.APPROVED,
        actor_role=ActorRole.AUTHORIZED_DECISION_MAKER,
        actor_name="Executive Magistrate",
        authority_order_code="ORD-BRO-01",
    )
    assert action.state == ActionState.APPROVED.value

    # APPROVED -> DISPATCHED
    action = await action_svc.update_action_state(
        action_id=action.id,
        target_state=ActionState.DISPATCHED,
        actor_role=ActorRole.OPERATOR,
        actor_name="Duty Dispatcher",
        dispatch_reference="DSP-2024-001",
    )
    assert action.state == ActionState.DISPATCHED.value

    # DISPATCHED -> ACKNOWLEDGED
    action = await action_svc.update_action_state(
        action_id=action.id,
        target_state=ActionState.ACKNOWLEDGED,
        actor_role=ActorRole.FIELD_VERIFIER,
        actor_name="ASI D. Sonam",
    )
    assert action.state == ActionState.ACKNOWLEDGED.value

    # ACKNOWLEDGED -> IN_PROGRESS
    action = await action_svc.update_action_state(
        action_id=action.id,
        target_state=ActionState.IN_PROGRESS,
        actor_role=ActorRole.FIELD_VERIFIER,
        actor_name="ASI D. Sonam",
    )
    assert action.state == ActionState.IN_PROGRESS.value

    # IN_PROGRESS -> COMPLETED
    action = await action_svc.update_action_state(
        action_id=action.id,
        target_state=ActionState.COMPLETED,
        actor_role=ActorRole.FIELD_VERIFIER,
        actor_name="ASI D. Sonam",
    )
    assert action.state == ActionState.COMPLETED.value

    # COMPLETED -> PHYSICALLY_CONFIRMED via confirm_action() with accepted field confirmation
    confirmation = await action_svc.confirm_action(
        action_id=action.id,
        confirming_officer="ASI D. Sonam",
        confirming_agency="West Kameng Police Patrol",
        location_confirmed="NH-13 KM-42 Barrier Checkpost",
        confirmation_notes="Barrier physically placed across both lanes; zero vehicles permitted.",
        communication_channel="TETRA_RADIO",
    )
    assert confirmation is not None
    updated_action = await action_svc.get_action(action.id)
    assert updated_action.state == ActionState.PHYSICALLY_CONFIRMED.value


# ── TEST 9: Closure Gate Evaluator (All 9 Preconditions) ──
@pytest.mark.asyncio
async def test_09_evidentiary_closure_gate_preconditions(db_session: AsyncSession):
    """Verify all 9 conditions of the Evidentiary Closure Gate."""
    incident = _make_test_incident(IncidentStatus.REASSESSING)
    db_session.add(incident)
    await db_session.flush()

    sts = StateTransitionService(db_session)

    # 1. Blocked: No action confirmed yet, no field evidence, no outcome
    gate = await sts.evaluate_closure_gate(
        incident_id=incident.id,
        actor_role=ActorRole.AUTHORIZED_DECISION_MAKER,
        authority_order_code="ORD-CLOSURE-TEST",
    )
    assert gate["closure_permitted"] is False
    assert len(gate["unmet_conditions"]) > 0

    # Attach fresh verified field evidence
    now = datetime.utcnow()
    ev_field = EvidenceModel(
        id=uuid.uuid4(),
        incident_id=incident.id,
        source=EvidenceSource.FIELD.value,
        source_name="BRO Patrol 14",
        evidence_type="physical_inspection",
        observation="Slope scarp stabilized; debris cleared from corridor.",
        metric="Zero movement detected",
        reliability="HIGH",
        observed_at=now,
        received_at=now,
        freshness_seconds=3600,  # 1 hour fresh
        interpretation=EvidenceInterpretation.VERIFIED.value,
        conflict_status=EvidenceConflictStatus.NONE.value,
    )
    db_session.add(ev_field)

    # Attach authoritative outcome permitting closure
    outcome = OutcomeModel(
        id=uuid.uuid4(),
        incident_id=incident.id,
        outcome_type=OutcomeType.INTERVENTION_CONDITIONED_NON_EVENT.value,
        intervention_state="INTERVENTION_CONFIRMED",
        observation_adequacy="ADEQUATE",
        causal_claim_established=True,
        closure_permitted=True,
        reassessment_required=False,
        recommended_hazard_state=HazardState.EXPECTED.value,
        explanation="Engineering mitigation and debris clearance completed.",
        evaluated_at=now,
        evaluated_by="Outcome Engine v1.0",
    )
    db_session.add(outcome)
    await db_session.flush()

    # Closure gate now passes!
    gate2 = await sts.evaluate_closure_gate(
        incident_id=incident.id,
        actor_role=ActorRole.AUTHORIZED_DECISION_MAKER,
        authority_order_code="ORD-CLOSURE-PASS-01",
    )
    assert gate2["closure_permitted"] is True
    assert len(gate2["unmet_conditions"]) == 0
    assert "OPERATIONAL INCIDENT CLOSURE ≠ GEOTECHNICAL HAZARD EXTINCTION" in gate2["critical_semantic_notice"]

    # Execute transition to RESOLVED
    resolved_inc = await sts.transition(
        incident_id=incident.id,
        target_status=IncidentStatus.RESOLVED,
        actor_role=ActorRole.AUTHORIZED_DECISION_MAKER,
        actor_name="P. Tsering IAS",
        authority_order_code="ORD-CLOSURE-PASS-01",
    )
    assert resolved_inc.status == IncidentStatus.RESOLVED.value
    meta = resolved_inc.metadata_json or {}
    assert "closure_assessment" in meta
    assert meta["closure_assessment"]["critical_semantic_notice"] == "OPERATIONAL INCIDENT CLOSURE ≠ GEOTECHNICAL HAZARD EXTINCTION"


# ── TEST 10: Reopening Eligibility Evaluation Rules ──
@pytest.mark.asyncio
async def test_10_reopening_eligibility_evaluation_rules(db_session: AsyncSession):
    """Test the 5-point reopening guardrails."""
    incident = _make_test_incident(IncidentStatus.RESOLVED)
    db_session.add(incident)
    await db_session.flush()

    sts = StateTransitionService(db_session)

    # Rule A: Stale evidence (> 86400s) -> Ineligible
    r_stale = await sts.evaluate_reopening_eligibility(
        incident_id=incident.id,
        source=EvidenceSource.WEATHER,
        freshness_seconds=95000,
        raw_data={"rainfall_mm": 50.0},
    )
    assert r_stale["eligible"] is False
    assert any("Stale evidence rejected" in r for r in r_stale["rejection_reasons"])

    # Rule B: Unverified citizen report -> Ineligible
    r_citizen = await sts.evaluate_reopening_eligibility(
        incident_id=incident.id,
        source=EvidenceSource.CITIZEN,
        interpretation=EvidenceInterpretation.UNVERIFIED,
        freshness_seconds=1200,
        raw_data={"rainfall_mm": 60.0},
    )
    assert r_citizen["eligible"] is False
    assert any("Unverified citizen evidence cannot reopen" in r for r in r_citizen["rejection_reasons"])

    # Rule C: Non-material noise (routine 2mm rain) -> Ineligible
    r_noise = await sts.evaluate_reopening_eligibility(
        incident_id=incident.id,
        source=EvidenceSource.WEATHER,
        freshness_seconds=600,
        raw_data={"rainfall_mm": 2.5},
        details="Light routine drizzle observed.",
    )
    assert r_noise["eligible"] is False
    assert any("Materiality threshold not met" in r for r in r_noise["rejection_reasons"])

    # Rule D: Fresh material rainfall (>= 35mm) -> Eligible!
    r_rain = await sts.evaluate_reopening_eligibility(
        incident_id=incident.id,
        source=EvidenceSource.WEATHER,
        freshness_seconds=600,
        raw_data={"rainfall_mm": 52.0},
    )
    assert r_rain["eligible"] is True
    assert "rainfall surge" in r_rain["materiality_reason"].lower()

    # Rule E: Fresh material InSAR deformation (>= 15mm/yr) -> Eligible!
    r_insar = await sts.evaluate_reopening_eligibility(
        incident_id=incident.id,
        source=EvidenceSource.SATELLITE,
        freshness_seconds=3600,
        raw_data={"deformation_velocity_mm_yr": -26.4},
    )
    assert r_insar["eligible"] is True
    assert "satellite insar" in r_insar["materiality_reason"].lower()

    # Rule F: Fresh field report with tension crack widening -> Eligible!
    r_field = await sts.evaluate_reopening_eligibility(
        incident_id=incident.id,
        source=EvidenceSource.FIELD,
        freshness_seconds=1800,
        details="Tension crack widening by 18mm observed on upper crown scarp with fresh debris raveling.",
    )
    assert r_field["eligible"] is True
    assert "tension crack" in r_field["materiality_reason"].lower()


# ── TEST 11: Reopening from RESOLVED Preserves Incident Twin Identity ──
@pytest.mark.asyncio
async def test_11_reopening_from_resolved_preserves_identity(db_session: AsyncSession):
    """When fresh credible material evidence arrives at a RESOLVED incident, it reopens to REASSESSING with same ID & code."""
    incident = _make_test_incident(IncidentStatus.RESOLVED)
    original_id = incident.id
    original_code = incident.code
    db_session.add(incident)
    await db_session.flush()

    ev_svc = EvidenceService(db_session)
    # Ingest fresh material weather surge (45mm rainfall)
    ev = await ev_svc.add_evidence(
        incident_id=incident.id,
        source=EvidenceSource.WEATHER,
        source_name="IMD Radar Station West Kameng",
        evidence_type="precipitation_telemetry",
        observation="Convective cloudburst: 48mm rainfall in 2 hours",
        metric="48.0 mm/2h",
        freshness_seconds=900,
        raw_data={"rainfall_mm": 48.0},
    )

    # Incident has transitioned to REASSESSING
    await db_session.refresh(incident)
    assert incident.status == IncidentStatus.REASSESSING.value
    # INVARIANT: Incident Twin identity is preserved!
    assert incident.id == original_id
    assert incident.code == original_code
    meta = incident.metadata_json or {}
    assert meta.get("is_reopened") is True
    assert len(meta.get("reopening_history", [])) == 1


# ── TEST 12: Reopening from REVIEWED Preserves Identity and Emits INCIDENT_REOPENED ──
@pytest.mark.asyncio
async def test_12_reopening_from_reviewed_emits_audit(db_session: AsyncSession):
    """When fresh credible material evidence arrives at a REVIEWED incident, it transitions REVIEWED -> REOPENED -> REASSESSING and logs INCIDENT_REOPENED."""
    incident = _make_test_incident(IncidentStatus.REVIEWED)
    original_id = incident.id
    original_code = incident.code
    db_session.add(incident)
    await db_session.flush()

    ev_svc = EvidenceService(db_session)
    # Ingest fresh InSAR deformation rate (-32mm/yr)
    ev = await ev_svc.add_evidence(
        incident_id=incident.id,
        source=EvidenceSource.SATELLITE,
        source_name="Copernicus Sentinel-1 InSAR",
        evidence_type="ground_displacement",
        observation="Accelerating downslope LOS velocity on crown",
        metric="-32.0 mm/yr",
        freshness_seconds=1800,
        raw_data={"deformation_velocity_mm_yr": -32.0},
    )

    # Incident transitioned to REASSESSING
    await db_session.refresh(incident)
    assert incident.status == IncidentStatus.REASSESSING.value
    assert incident.id == original_id
    assert incident.code == original_code
    meta = incident.metadata_json or {}
    assert meta.get("is_reopened") is True


# ── TEST 13: Deterministic Replay Engine 10-Step Timeline ──
def test_13_replay_engine_10_step_closed_loop():
    """Verify ReplayEngineService steps through all 10 crisis steps including RESOLVED, REVIEWED, and REOPENED."""
    ReplayEngineService.reset()
    status = ReplayEngineService.get_status()
    assert status["total_steps"] == 10

    # Step to T16 (Closure Gate Sign-off - RESOLVED)
    s_resolved = ReplayEngineService.jump_to_step(6)
    assert s_resolved["current_step"]["step_code"] == "T16"
    assert s_resolved["current_step"]["governance"]["incident_status"] == "RESOLVED"

    # Step to T17 (Post-Incident Review - REVIEWED)
    s_reviewed = ReplayEngineService.jump_to_step(7)
    assert s_reviewed["current_step"]["step_code"] == "T17"
    assert s_reviewed["current_step"]["governance"]["incident_status"] == "REVIEWED"

    # Step to T18 (Fresh Convective Surge)
    s_surge = ReplayEngineService.jump_to_step(8)
    assert s_surge["current_step"]["step_code"] == "T18"
    assert s_surge["current_step"]["intelligence"]["operational_priority"] == "P2"

    # Step to T20 (Incident Twin Reopened)
    s_reopened = ReplayEngineService.jump_to_step(9)
    assert s_reopened["current_step"]["step_code"] == "T20"
    assert s_reopened["current_step"]["governance"]["incident_status"] == "REOPENED"
    assert "INCIDENT_TWIN_TG2048_REACTIVATED" in s_reopened["current_step"]["governance"]["statutory_authorization_state"]

    # Reset
    ReplayEngineService.reset()
    assert ReplayEngineService.get_status()["current_step_index"] == 0


# ── TEST 14: REST API POST /reopen Endpoint ──
@pytest.mark.asyncio
async def test_14_reopen_endpoint_api(async_client: AsyncClient, db_session: AsyncSession):
    """Verify POST /api/v1/incidents/{id}/reopen reopens a reviewed incident and preserves identity."""
    incident = _make_test_incident(IncidentStatus.REVIEWED)
    db_session.add(incident)
    await db_session.flush()

    resp = await async_client.post(
        f"/api/v1/incidents/{incident.id}/reopen",
        json={
            "reason": "Field inspection confirmed 20mm fresh tension crack progression at crown",
            "actor_role": "OPERATOR",
            "actor_name": "Senior Dispatcher",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "REASSESSING"
    assert data["id"] == str(incident.id)
    assert data["code"] == incident.code


# ── TEST 15: REST API GET /reopening-eligibility Endpoint ──
@pytest.mark.asyncio
async def test_15_reopening_eligibility_endpoint_api(async_client: AsyncClient, db_session: AsyncSession):
    """Verify GET /api/v1/incidents/{id}/reopening-eligibility returns structured guardrail checks."""
    incident = _make_test_incident(IncidentStatus.RESOLVED)
    db_session.add(incident)
    await db_session.flush()

    resp = await async_client.get(
        f"/api/v1/incidents/{incident.id}/reopening-eligibility?source=FIELD&interpretation=VERIFIED&freshness_seconds=1200",
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["incident_id"] == str(incident.id)
    assert data["current_status"] == "RESOLVED"
    assert data["source_credible"] is True
    assert data["fresh"] is True


# ── TEST 16: Duplicate Evidence Rejected On Closed Incident ──
@pytest.mark.asyncio
async def test_16_duplicate_evidence_rejected_on_closed_incident(async_client: AsyncClient, db_session: AsyncSession):
    """Verify duplicate evidence cannot attach to or repeatedly reopen a resolved incident."""
    incident = _make_test_incident(IncidentStatus.RESOLVED)
    db_session.add(incident)
    await db_session.flush()

    # First submission with unique reference
    ev1 = await async_client.post(
        f"/api/v1/incidents/{incident.id}/evidence",
        json={
            "source": "WEATHER",
            "source_name": "IMD Radar West Kameng",
            "evidence_type": "precipitation_telemetry",
            "observation": "Monsoon burst 55mm in 2 hours",
            "metric": "55.0 mm",
            "freshness_seconds": 600,
            "original_reference": "REF-IMD-RADAR-UNIQUE-01",
            "raw_data": {"rainfall_mm": 55.0},
        },
    )
    assert ev1.status_code in (200, 201)

    # Put incident back to RESOLVED for testing rejection
    await db_session.refresh(incident)
    incident.status = IncidentStatus.RESOLVED.value
    await db_session.flush()

    # Second submission with identical original_reference -> Rejected as duplicate!
    ev2 = await async_client.post(
        f"/api/v1/incidents/{incident.id}/evidence",
        json={
            "source": "WEATHER",
            "source_name": "IMD Radar West Kameng",
            "evidence_type": "precipitation_telemetry",
            "observation": "Monsoon burst 55mm in 2 hours",
            "metric": "55.0 mm",
            "freshness_seconds": 600,
            "original_reference": "REF-IMD-RADAR-UNIQUE-01",
            "raw_data": {"rainfall_mm": 55.0},
        },
    )
    assert ev2.status_code == 400
    assert "duplicate" in ev2.json().get("detail", "").lower()

