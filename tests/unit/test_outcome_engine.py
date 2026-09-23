"""Comprehensive Unit & Integration Tests for Intervention-Conditioned Hazard Outcome Engine (Prompt 03).

Verifies all 14 core safety-critical domain tests:
1.  TEST 1:  Predicted hazard + observed event -> EVENT_OBSERVED.
2.  TEST 2:  Predicted hazard + adequately observed non-event -> NON_EVENT_OBSERVED / DISSIPATED (NOT auto-RESOLVED).
3.  TEST 3:  Predicted hazard + insufficient observation -> OBSERVATION_GAP / UNRESOLVED (no closure).
4.  TEST 4:  Intervention + non-event -> INTERVENTION_CONDITIONED_NON_EVENT (no causal claim).
5.  TEST 5:  Intervention dispatched but unconfirmed -> INTERVENTION_DISPATCHED_UNCONFIRMED (not confirmed).
6.  TEST 6:  Later evidence arrives -> SAME incident reassessed (id unchanged).
7.  TEST 7:  Nearby evidence within supported scope -> triggers reassessment of SAME incident.
8.  TEST 8:  Unrelated/distant evidence (>10km) -> rejected, cannot silently attach.
9.  TEST 9:  Conflicting evidence -> CONFLICTED status preserved, no silent overwrite.
10. TEST 10: Residual hazard -> RESIDUAL_HAZARD, no premature closure.
11. TEST 11: FALSE_ALARM cannot be reached without adequate observation.
12. TEST 12: Prompt 2 closure gate remains strictly enforced.
13. TEST 13: Public citizen cannot access authority outcome endpoint (403).
14. TEST 14: Unauthorized actor cannot trigger operational reassessment (403).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from app.domain.enums import (
    ActionState,
    ActorRole,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceSource,
    HazardState,
    IncidentStatus,
)
from app.domain.outcome import (
    EvidenceRelationshipType,
    HypothesisStatus,
    HypothesisType,
    InterventionContextState,
    ObservationAdequacy,
    OutcomeType,
)


def _unique_code(prefix: str = "TG-OUT") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"


async def _create_test_incident(
    client: AsyncClient,
    code: str | None = None,
    lat: float = 27.2000,
    lon: float = 92.4000,
) -> dict:
    res = await client.post(
        "/api/v1/incidents",
        json={
            "code": code or _unique_code(),
            "title": "Outcome Engine Verification Incident",
            "description": "Living incident testing for Prompt 3 Outcome Engine",
            "incident_type": "landslide",
            "latitude": lat,
            "longitude": lon,
            "location_name": "KM-42 Bhalukpong-Tenga",
            "state": "Arunachal Pradesh",
            "district": "West Kameng",
        },
    )
    assert res.status_code == 201
    return res.json()


# ── TEST 1: Predicted hazard + observed event -> EVENT_OBSERVED ──
@pytest.mark.asyncio
async def test_01_predicted_hazard_plus_observed_event(async_client: AsyncClient):
    """TEST 1: Ingesting verified active ground failure evidence yields EVENT_OBSERVED."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Ingest verified field evidence of active landslide
    ev = await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "SDRF Ground Patrol #01",
            "evidence_type": "physical_inspection",
            "observation": "Active cut-slope toe failure with mud slurry blocking 60% carriageway",
            "metric": "60% Carriageway Blocked",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )
    assert ev.status_code == 201

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    assert outcome["outcome_type"] == OutcomeType.EVENT_OBSERVED.value
    assert outcome["recommended_hazard_state"] == HazardState.ACTIVE.value
    assert outcome["closure_permitted"] is False
    assert outcome["causal_claim_established"] is False


# ── TEST 2: Predicted hazard + adequately observed non-event -> NON_EVENT_OBSERVED (NOT auto-RESOLVED) ──
@pytest.mark.asyncio
async def test_02_adequately_observed_non_event_does_not_auto_resolve(async_client: AsyncClient):
    """TEST 2: When expected window elapses with verified field check confirming no failure, hazard is DISSIPATED/DELAYED, NOT RESOLVED."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Ingest verified field patrol inspection confirming slope is intact and carriageway is clear
    ev = await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "BRO Engineering Patrol",
            "evidence_type": "physical_inspection",
            "observation": "Ground inspection confirms slope intact, carriageway fully clear, no debris detachment",
            "metric": "0% Obstruction",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )
    assert ev.status_code == 201

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    assert outcome["outcome_type"] == OutcomeType.NON_EVENT_OBSERVED.value
    # INVARIANT: EVENT ABSENCE ≠ HAZARD RESOLUTION
    assert outcome["closure_permitted"] is False
    assert outcome["recommended_hazard_state"] != HazardState.RESOLVED.value


# ── TEST 3: Predicted hazard + insufficient observation -> OBSERVATION_GAP (no closure) ──
@pytest.mark.asyncio
async def test_03_insufficient_observation_creates_observation_gap(async_client: AsyncClient):
    """TEST 3: With optical cloud cover and no ground patrol, outcome is OBSERVATION_GAP, forbidding closure."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Add satellite evidence noting heavy cloud obscuration
    ev = await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "SATELLITE",
            "source_name": "Sentinel-2 Optical",
            "evidence_type": "optical_imagery",
            "observation": "88% dense cloud cover obscuring cut-slope scarp and carriageway",
            "metric": "88% Cloud Cover",
            "reliability": "HIGH",
            "interpretation": "UNVERIFIED",
        },
    )
    assert ev.status_code == 201

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    assert outcome["outcome_type"] == OutcomeType.OBSERVATION_GAP.value
    assert outcome["closure_permitted"] is False
    assert outcome["reassessment_required"] is True
    assert "OBSERVATION GAP" in outcome["explanation"] or "INADEQUATE" in outcome["explanation"]


# ── TEST 4: Intervention + non-event -> INTERVENTION_CONDITIONED_NON_EVENT (no causal claim) ──
@pytest.mark.asyncio
async def test_04_intervention_conditioned_non_event_preserves_causal_uncertainty(async_client: AsyncClient):
    """TEST 4: Interventions deployed + no event -> INTERVENTION_CONDITIONED_NON_EVENT with causal_claim_established=False."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Add an action and confirm it
    act_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/actions",
        json={
            "task_code": "TSK-DRAIN-01",
            "agency": "Border Roads Organisation",
            "title": "Emergency Cut-Slope Interceptor Trench Drainage",
            "description": "Divert crest runoff away from tension crack",
            "assigned_to": "BRO Task Force 42",
        },
    )
    assert act_res.status_code == 201
    act_id = act_res.json()["id"]

    # Advance action: PROPOSED -> APPROVED -> DISPATCHED -> COMPLETED
    for st in ["APPROVED", "DISPATCHED", "IN_PROGRESS", "COMPLETED"]:
        await async_client.post(
            f"/api/v1/actions/{act_id}/transitions",
            json={"target_state": st, "actor_role": "OPERATOR", "actor_name": "Duty Officer"},
        )

    # Physically confirm action via official patrol report
    conf_res = await async_client.post(
        f"/api/v1/actions/{act_id}/confirmations",
        json={
            "confirming_officer": "Capt. R. Sharma",
            "confirming_agency": "Border Roads Organisation",
            "location_confirmed": "KM-42.1 Crest Drainage",
            "confirmation_notes": "Interceptor trench excavated and lined with geotextile sheet.",
        },
    )
    assert conf_res.status_code == 201

    # Ingest verified patrol inspection confirming slope did not fail
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "BRO Patrol",
            "evidence_type": "physical_inspection",
            "observation": "Slope intact, no debris detachment",
            "metric": "0% Obstruction",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    assert outcome["outcome_type"] == OutcomeType.INTERVENTION_CONDITIONED_NON_EVENT.value
    assert outcome["intervention_state"] == InterventionContextState.INTERVENTION_CONFIRMED.value
    # CRITICAL DOMAIN INVARIANT: Causal prevention cannot be claimed without scientific proof
    assert outcome["causal_claim_established"] is False
    assert outcome["closure_permitted"] is False
    assert "Causal prevention is unestablished" in outcome["explanation"]


# ── TEST 5: Intervention executed but not confirmed -> must not be treated as confirmed ──
@pytest.mark.asyncio
async def test_05_intervention_unconfirmed_distinction(async_client: AsyncClient):
    """TEST 5: Dispatched/completed action without physical confirmation is INTERVENTION_DISPATCHED_UNCONFIRMED."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Add action and advance to DISPATCHED (do not confirm!)
    act_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/actions",
        json={
            "task_code": "TSK-BARR-01",
            "agency": "Traffic Police",
            "title": "Corridor Barrier Checkpost",
            "description": "Deploy concrete jersey barriers at KM-38",
            "assigned_to": "ASI Sonam",
        },
    )
    assert act_res.status_code == 201
    act_id = act_res.json()["id"]

    await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        json={"target_state": "APPROVED", "actor_role": "OPERATOR", "actor_name": "Duty Officer"},
    )
    await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        json={"target_state": "DISPATCHED", "actor_role": "OPERATOR", "actor_name": "Duty Officer"},
    )

    # Ingest verified patrol report
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "Patrol Officer",
            "evidence_type": "physical_inspection",
            "observation": "Road intact, no debris",
            "metric": "0% Obstruction",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    # Must be UNCONFIRMED intervention state
    assert outcome["intervention_state"] == InterventionContextState.INTERVENTION_DISPATCHED_UNCONFIRMED.value
    assert outcome["intervention_state"] != InterventionContextState.INTERVENTION_CONFIRMED.value


# ── TEST 6: Later evidence arrives -> SAME incident is reassessed (id unchanged) ──
@pytest.mark.asyncio
async def test_06_living_incident_same_id_continuity(async_client: AsyncClient):
    """TEST 6: Later evidence updates the existing incident without creating a new incident ID."""
    inc = await _create_test_incident(async_client)
    original_id = inc["id"]

    # T1: Ingest first observation
    await async_client.post(
        f"/api/v1/incidents/{original_id}/evidence",
        json={
            "source": "WEATHER",
            "source_name": "AWS Bhalukpong",
            "evidence_type": "rainfall_telemetry",
            "observation": "Precipitation surge 184mm",
            "metric": "184mm/24h",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )

    # Reassess at T1
    r1 = await async_client.post(
        f"/api/v1/incidents/{original_id}/reassess",
        json={"actor_role": "OPERATOR", "actor_name": "Shift Officer", "notes": "T1 initial reassessment"},
    )
    assert r1.status_code == 200
    assert r1.json()["incident_id"] == original_id

    # T2: Later evidence arrives on SAME incident
    await async_client.post(
        f"/api/v1/incidents/{original_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "Patrol #02",
            "evidence_type": "physical_inspection",
            "observation": "Tension crack widened by 4cm at slope shoulder",
            "metric": "4cm Displacement",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )

    # Reassess at T2 on SAME incident
    r2 = await async_client.post(
        f"/api/v1/incidents/{original_id}/reassess",
        json={"actor_role": "OPERATOR", "actor_name": "Shift Officer", "notes": "T2 later evidence reassessment"},
    )
    assert r2.status_code == 200
    assert r2.json()["incident_id"] == original_id  # IDENTICAL INCIDENT IDENTIFIER


# ── TEST 7: Relevant nearby evidence within supported scope -> triggers reassessment of SAME incident ──
@pytest.mark.asyncio
async def test_07_nearby_evidence_within_scope_triggers_same_incident_reassessment(async_client: AsyncClient):
    """TEST 7: Evidence observed 1.2km away (within 5km corridor envelope) triggers spatial reassessment on SAME incident."""
    inc = await _create_test_incident(async_client, lat=27.2000, lon=92.4000)
    inc_id = inc["id"]

    # Ingest evidence ~1.2 km north (lat=27.2108, lon=92.4000)
    ev_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "Highway Patrol",
            "evidence_type": "physical_inspection",
            "observation": "Minor rockfall at KM-43.2 (1.2km north of original forecast)",
            "metric": "1.2km Offset",
            "latitude": 27.2108,
            "longitude": 92.4000,
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )
    assert ev_res.status_code == 201

    out_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/outcome/evaluate",
        json={"observed_latitude": 27.2108, "observed_longitude": 92.4000},
    )
    assert out_res.status_code == 200
    outcome = out_res.json()

    spatial = outcome["spatial_divergence"]
    assert spatial is not None
    assert spatial["within_supported_scope"] is True
    assert spatial["distance_meters"] > 1000.0
    assert spatial["distance_meters"] < 5000.0
    assert "SAME INCIDENT" in spatial["corridor_alignment_notes"]


# ── TEST 8: Unrelated/distant evidence (>10km) -> rejected, cannot silently attach ──
@pytest.mark.asyncio
async def test_08_distant_evidence_is_rejected(async_client: AsyncClient):
    """TEST 8: Submitting evidence 45km away from incident centroid is strictly rejected with 400 Bad Request."""
    inc = await _create_test_incident(async_client, lat=27.2000, lon=92.4000)
    inc_id = inc["id"]

    # Submit evidence at lat=27.6000, lon=92.4000 (~44 km away)
    res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "Unrelated Regional Post",
            "evidence_type": "physical_inspection",
            "observation": "Distant landslip reported on another mountain corridor",
            "metric": "44km Distant",
            "latitude": 27.6000,
            "longitude": 92.4000,
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )
    assert res.status_code == 400
    detail = res.json().get("detail", "")
    assert "Spatial boundary rejection" in detail or "exceeding maximum supported incident scope" in detail


# ── TEST 9: Conflicting evidence -> CONFLICTED status preserved, no silent overwrite ──
@pytest.mark.asyncio
async def test_09_conflicting_evidence_preserved_no_silent_overwrite(async_client: AsyncClient):
    """TEST 9: Conflicting multi-source observations yield CONFLICTED outcome and block resolution."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Ingest conflicted evidence items
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "CITIZEN",
            "source_name": "Citizen App Report",
            "evidence_type": "photo_report",
            "observation": "Massive catastrophic landslide blocked whole valley",
            "metric": "100% Blocked",
            "conflict_status": "CONFLICTED",
            "conflict_details": "Contradicted by BRO patrol inspection reporting clear carriageway",
            "interpretation": "UNVERIFIED",
        },
    )

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    assert outcome["outcome_type"] == OutcomeType.CONFLICTED.value
    assert outcome["closure_permitted"] is False
    assert outcome["evidence_summary"]["conflicted_evidence_count"] >= 1


# ── TEST 10: Residual hazard -> RESIDUAL_HAZARD, no premature closure ──
@pytest.mark.asyncio
async def test_10_residual_hazard_prevents_premature_closure(async_client: AsyncClient):
    """TEST 10: When slope shows critical saturation and tension cracks without failure, outcome is RESIDUAL_HAZARD."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Ingest verified patrol report documenting ongoing pore-water saturation and tension crack
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "BRO Engineering Patrol",
            "evidence_type": "geotechnical_survey",
            "observation": "No mass detachment yet, but critical pore-water saturation and active tension crack persist",
            "metric": "Active Tension Crack",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    assert outcome["outcome_type"] == OutcomeType.RESIDUAL_HAZARD.value
    assert outcome["closure_permitted"] is False
    assert outcome["recommended_hazard_state"] == HazardState.DELAYED.value


# ── TEST 11: FALSE_ALARM cannot be reached merely from event absence without adequate observation ──
@pytest.mark.asyncio
async def test_11_false_alarm_cannot_be_reached_without_adequate_observation(async_client: AsyncClient):
    """TEST 11: Transitioning hazard state to FALSE_ALARM without adequate ground observation is rejected with 400."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Attempt to force FALSE_ALARM when observation is missing
    res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/hazard-transitions",
        json={
            "target_state": "FALSE_ALARM",
            "actor_role": "OPERATOR",
            "actor_name": "Shift Officer",
            "reason": "No event observed during expected window",
        },
    )
    assert res.status_code == 400
    assert "FALSE_ALARM REJECTED" in res.json().get("detail", "")


# ── TEST 12: Existing Prompt 2 closure requirements remain enforced ──
@pytest.mark.asyncio
async def test_12_prompt2_closure_gate_remains_enforced(async_client: AsyncClient):
    """TEST 12: Attempting to resolve an incident without physically confirmed actions is blocked with 422."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Advance to MONITORING
    for target in ["ASSESSING", "AUTHORIZED", "MONITORING"]:
        b = {"target_status": target, "actor_role": "OPERATOR", "actor_name": "Operator"}
        if target == "AUTHORIZED":
            b["actor_role"] = "AUTHORIZED_DECISION_MAKER"
            b["authority_order_code"] = "ORD-TEST-P2-01"
        await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", json=b)

    # Add an unconfirmed dispatched action
    act_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/actions",
        json={
            "task_code": "TSK-UNCONF-01",
            "agency": "SDRF",
            "title": "Evacuate slope toe huts",
            "description": "Precautionary evacuation",
            "assigned_to": "SDRF Team 1",
        },
    )
    act_id = act_res.json()["id"]
    await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        json={"target_state": "APPROVED", "actor_role": "OPERATOR", "actor_name": "Duty Officer"},
    )
    await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        json={"target_state": "DISPATCHED", "actor_role": "OPERATOR", "actor_name": "Duty Officer"},
    )

    # Attempt closure to RESOLVED
    res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        json={
            "target_status": "RESOLVED",
            "actor_role": "AUTHORIZED_DECISION_MAKER",
            "actor_name": "Magistrate",
            "authority_order_code": "ORD-RESOLVE-01",
        },
    )
    # Must be blocked by Prompt 2's evidentiary closure gate (action not physically confirmed)
    assert res.status_code in (400, 422)
    assert "Closure blocked" in res.json().get("detail", "")


# ── TEST 13: Public user cannot access authority outcome endpoint (403) ──
@pytest.mark.asyncio
async def test_13_public_user_cannot_access_authority_outcome_endpoint(async_client: AsyncClient):
    """TEST 13: Public citizen token cannot access authority outcome evaluation endpoint (returns 403 Forbidden)."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Seed demo users & login as citizen
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "citizen", "password": "Citizen#2026"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    # Citizen tries to trigger outcome evaluation
    res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/outcome/evaluate",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403


# ── TEST 14: Unauthorized actor cannot trigger operational reassessment (403) ──
@pytest.mark.asyncio
async def test_14_unauthorized_actor_cannot_trigger_reassessment(async_client: AsyncClient):
    """TEST 14: Citizen user cannot trigger bounded operational hazard reassessment (returns 403 Forbidden)."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "citizen", "password": "Citizen#2026"},
    )
    token = login.json()["access_token"]

    res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/reassess",
        headers={"Authorization": f"Bearer {token}"},
        json={"notes": "Citizen trying to force reassessment"},
    )
    assert res.status_code == 403


# ── TEST 15: Scenario A (True Event) -> Competing Hypotheses & Evidence Bindings ──
@pytest.mark.asyncio
async def test_15_scenario_a_competing_hypotheses_and_evidence_bindings(async_client: AsyncClient):
    """TEST 15 (Scenario A): Verified physical event contradicts H1 (FALSE_ALARM) and H2 (INTERVENTION_NON_EVENT)."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    ev = await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "SDRF Ground Patrol #01",
            "evidence_type": "physical_inspection",
            "observation": "Active cut-slope toe failure with mud slurry blocking 60% carriageway",
            "metric": "60% Carriageway Blocked",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )
    assert ev.status_code == 201
    ev_id = ev.json()["id"]

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    assert outcome["outcome_type"] == OutcomeType.EVENT_OBSERVED.value
    hypotheses = {h["hypothesis_type"]: h for h in outcome["competing_hypotheses"]}
    assert len(hypotheses) == 7

    # H1 FALSE_ALARM must be CONTRADICTED
    assert hypotheses[HypothesisType.H1_FALSE_ALARM.value]["status"] == HypothesisStatus.CONTRADICTED.value
    assert ev_id in hypotheses[HypothesisType.H1_FALSE_ALARM.value]["contradicting_evidence_ids"]

    # H2 INTERVENTION_NON_EVENT must be CONTRADICTED
    assert hypotheses[HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value]["status"] == HypothesisStatus.CONTRADICTED.value
    assert ev_id in hypotheses[HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value]["contradicting_evidence_ids"]

    # Check evidence binding structure
    bindings = hypotheses[HypothesisType.H1_FALSE_ALARM.value]["evidence_bindings"]
    assert len(bindings) >= 1
    binding_for_ev = next(b for b in bindings if b["evidence_id"] == ev_id)
    assert binding_for_ev["relationship"] == EvidenceRelationshipType.CONTRADICTING.value
    assert len(binding_for_ev["reasoning"]) > 10


# ── TEST 16: Scenario B (Ambiguous Non-Event) -> H2 Supported & Causal Uncertainty Preserved ──
@pytest.mark.asyncio
async def test_16_scenario_b_intervention_conditioned_non_event(async_client: AsyncClient):
    """TEST 16 (Scenario B): Intervention confirmed + verified intact slope yields H2 SUPPORTED without causal claim."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Add and advance action to COMPLETED
    act_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/actions",
        json={
            "task_code": "TSK-DRAIN-02",
            "agency": "Border Roads Organisation",
            "title": "Cut-Slope Interceptor Drainage Trench",
            "description": "Excavate crest diversion trench",
            "assigned_to": "BRO Task Force",
        },
    )
    act_id = act_res.json()["id"]
    for st in ["APPROVED", "DISPATCHED", "IN_PROGRESS", "COMPLETED"]:
        await async_client.post(
            f"/api/v1/actions/{act_id}/transitions",
            json={"target_state": st, "actor_role": "OPERATOR", "actor_name": "Duty Officer"},
        )

    # Physically confirm
    await async_client.post(
        f"/api/v1/actions/{act_id}/confirmations",
        json={
            "confirming_officer": "Capt. R. Sharma",
            "confirming_agency": "BRO",
            "location_confirmed": "KM-42 Crest",
            "confirmation_notes": "Trench excavated and lined with geotextile sheet.",
        },
    )

    # Verified ground check confirms intact slope
    ev = await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "BRO Patrol",
            "evidence_type": "physical_inspection",
            "observation": "Slope intact, carriageway clear, 0% obstruction",
            "metric": "0% Obstruction",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )
    ev_id = ev.json()["id"]

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    assert outcome["outcome_type"] == OutcomeType.INTERVENTION_CONDITIONED_NON_EVENT.value
    assert outcome["primary_hypothesis"] == HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value
    assert outcome["causal_claim_established"] is False

    hypotheses = {h["hypothesis_type"]: h for h in outcome["competing_hypotheses"]}
    assert hypotheses[HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value]["status"] == HypothesisStatus.SUPPORTED.value
    assert ev_id in hypotheses[HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value]["supporting_evidence_ids"]

    # H1 is NOT supported
    assert hypotheses[HypothesisType.H1_FALSE_ALARM.value]["status"] != HypothesisStatus.SUPPORTED.value


# ── TEST 17: Scenario C (Observation Gap) -> H5 Supported & Hypothesis-Separating NBI ──
@pytest.mark.asyncio
async def test_17_scenario_c_observation_gap_nbi_discrimination(async_client: AsyncClient):
    """TEST 17 (Scenario C): Optical cloud obscuration yields H5 SUPPORTED; NBI explicitly discriminates H2 vs H5."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Satellite evidence noting dense cloud cover
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "SATELLITE",
            "source_name": "Sentinel-2 Optical",
            "evidence_type": "optical_imagery",
            "observation": "88% dense cloud cover obscuring cut-slope scarp and carriageway",
            "metric": "88% Cloud Cover",
            "reliability": "HIGH",
            "interpretation": "UNVERIFIED",
        },
    )

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    assert outcome["outcome_type"] == OutcomeType.OBSERVATION_GAP.value
    assert outcome["primary_hypothesis"] == HypothesisType.H5_OBSERVATION_GAP.value

    hypotheses = {h["hypothesis_type"]: h for h in outcome["competing_hypotheses"]}
    assert hypotheses[HypothesisType.H5_OBSERVATION_GAP.value]["status"] == HypothesisStatus.SUPPORTED.value

    # Verify NBI recommendations include ground patrol separating H2 vs H5
    nbi_items = outcome["nbi_recommendations"]
    assert len(nbi_items) >= 1
    patrol_nbi = next((item for item in nbi_items if item["action_type"] == "DISPATCH_GROUND_PATROL_INSPECTION"), None)
    assert patrol_nbi is not None
    assert HypothesisType.H5_OBSERVATION_GAP.value in patrol_nbi["target_hypotheses"]
    assert [HypothesisType.H2_INTERVENTION_CONDITIONED_NON_EVENT.value, HypothesisType.H5_OBSERVATION_GAP.value] in patrol_nbi["discriminates_between"]
    assert patrol_nbi["spatial_scope"] is not None
    assert patrol_nbi["temporal_scope"] is not None


# ── TEST 18: Scenario D (Residual Hazard) -> H6 Supported & Geotechnical Clearance NBI ──
@pytest.mark.asyncio
async def test_18_scenario_d_residual_hazard_separation(async_client: AsyncClient):
    """TEST 18 (Scenario D): Persisting pore-water saturation and tension crack yields H6 SUPPORTED; closure blocked."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "BRO Engineering Patrol",
            "evidence_type": "geotechnical_survey",
            "observation": "Critical pore-water saturation and active tension crack persist at crest shoulder",
            "metric": "Active Tension Crack",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    assert outcome["outcome_type"] == OutcomeType.RESIDUAL_HAZARD.value
    assert outcome["primary_hypothesis"] == HypothesisType.H6_RESIDUAL_HAZARD.value
    assert outcome["closure_permitted"] is False

    hypotheses = {h["hypothesis_type"]: h for h in outcome["competing_hypotheses"]}
    assert hypotheses[HypothesisType.H6_RESIDUAL_HAZARD.value]["status"] == HypothesisStatus.SUPPORTED.value

    # NBI recommends geotechnical stabilization survey separating H6 vs H1
    nbi_items = outcome["nbi_recommendations"]
    geo_nbi = next((item for item in nbi_items if item["action_type"] == "GEOTECHNICAL_STABILIZATION_SURVEY"), None)
    assert geo_nbi is not None
    assert [HypothesisType.H6_RESIDUAL_HAZARD.value, HypothesisType.H1_FALSE_ALARM.value] in geo_nbi["discriminates_between"]
    assert geo_nbi["authority_required"] is True


# ── TEST 19: Scenario E (Delayed Failure) -> H3 Supported & Temporal Window Extension NBI ──
@pytest.mark.asyncio
async def test_19_scenario_e_delayed_failure_separation(async_client: AsyncClient):
    """TEST 19 (Scenario E): Heavy rainfall surge with hydrologic lag yields H3 SUPPORTED; recommends extending window."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "WEATHER",
            "source_name": "AWS Bhalukpong",
            "evidence_type": "rainfall_telemetry",
            "observation": "Precipitation surge 184mm sustained; deep hydrologic saturation",
            "metric": "184mm/24h",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    hypotheses = {h["hypothesis_type"]: h for h in outcome["competing_hypotheses"]}
    assert hypotheses[HypothesisType.H3_DELAYED_FAILURE.value]["status"] == HypothesisStatus.SUPPORTED.value

    # NBI recommends extending observation window
    nbi_items = outcome["nbi_recommendations"]
    window_nbi = next((item for item in nbi_items if item["action_type"] == "EXTEND_OBSERVATION_WINDOW"), None)
    assert window_nbi is not None
    assert [HypothesisType.H1_FALSE_ALARM.value, HypothesisType.H3_DELAYED_FAILURE.value] in window_nbi["discriminates_between"]


# ── TEST 20: Scenario F (Shifted Hazard) -> H4 Supported & Radar Telemetry NBI ──
@pytest.mark.asyncio
async def test_20_scenario_f_shifted_hazard_separation(async_client: AsyncClient):
    """TEST 20 (Scenario F): Offset evidence within 5km corridor envelope yields H4 SUPPORTED on SAME incident."""
    inc = await _create_test_incident(async_client, lat=27.2000, lon=92.4000)
    inc_id = inc["id"]

    # Submit evidence at 1.2km offset
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "Highway Patrol",
            "evidence_type": "physical_inspection",
            "observation": "Cut-slope scarp detachment and rockfall at KM-43.2 (1.2km north)",
            "metric": "1.2km Offset",
            "latitude": 27.2108,
            "longitude": 92.4000,
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )

    out_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/outcome/evaluate",
        json={"observed_latitude": 27.2108, "observed_longitude": 92.4000},
    )
    assert out_res.status_code == 200
    outcome = out_res.json()

    assert outcome["outcome_type"] == OutcomeType.EVENT_OBSERVED.value
    assert outcome["primary_hypothesis"] == HypothesisType.H4_SHIFTED_HAZARD.value
    hypotheses = {h["hypothesis_type"]: h for h in outcome["competing_hypotheses"]}
    assert hypotheses[HypothesisType.H4_SHIFTED_HAZARD.value]["status"] == HypothesisStatus.SUPPORTED.value

    # NBI recommends radar scan discriminating H3 vs H4
    nbi_items = outcome["nbi_recommendations"]
    radar_nbi = next((item for item in nbi_items if item["action_type"] == "ACQUIRE_RADAR_TELEMETRY"), None)
    assert radar_nbi is not None
    assert [HypothesisType.H3_DELAYED_FAILURE.value, HypothesisType.H4_SHIFTED_HAZARD.value] in radar_nbi["discriminates_between"]


# ── TEST 21: Scenario G (Conflicted Evidence) -> H7 Supported & Cross-Agency Reconciliation NBI ──
@pytest.mark.asyncio
async def test_21_scenario_g_conflicted_evidence_separation(async_client: AsyncClient):
    """TEST 21 (Scenario G): Conflicted multi-source reports yield H7 SUPPORTED; NBI recommends joint reconciliation."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "CITIZEN",
            "source_name": "Citizen App Report",
            "evidence_type": "photo_report",
            "observation": "Massive catastrophic landslide blocked whole valley",
            "metric": "100% Blocked",
            "conflict_status": "CONFLICTED",
            "conflict_details": "Contradicted by patrol inspection reporting open road",
            "interpretation": "UNVERIFIED",
        },
    )

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    assert outcome["outcome_type"] == OutcomeType.CONFLICTED.value
    assert outcome["primary_hypothesis"] == HypothesisType.H7_CONFLICTED.value

    hypotheses = {h["hypothesis_type"]: h for h in outcome["competing_hypotheses"]}
    assert hypotheses[HypothesisType.H7_CONFLICTED.value]["status"] == HypothesisStatus.SUPPORTED.value

    # NBI recommends cross-agency reconciliation patrol
    nbi_items = outcome["nbi_recommendations"]
    recon_nbi = next((item for item in nbi_items if item["action_type"] == "RECONCILE_DISCORDANT_OBSERVATIONS"), None)
    assert recon_nbi is not None
    assert [HypothesisType.H7_CONFLICTED.value, HypothesisType.H1_FALSE_ALARM.value] in recon_nbi["discriminates_between"]


# ── TEST 22: Idempotent Hypothesis Evaluation & GET Endpoint Persistence Retrieval ──
@pytest.mark.asyncio
async def test_22_idempotent_hypothesis_evaluation_and_retrieval(async_client: AsyncClient):
    """TEST 22: Re-evaluating outcome produces deterministic identical hypotheses and GET endpoint retrieves persisted state."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Ingest verified patrol report
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "BRO Patrol",
            "evidence_type": "physical_inspection",
            "observation": "Ground inspection confirms slope intact, carriageway fully clear",
            "metric": "0% Obstruction",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
        },
    )

    eval_1 = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert eval_1.status_code == 200
    data_1 = eval_1.json()

    # Re-evaluate without new evidence
    eval_2 = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert eval_2.status_code == 200
    data_2 = eval_2.json()

    # Deterministic equality
    assert data_1["outcome_type"] == data_2["outcome_type"]
    assert data_1["primary_hypothesis"] == data_2["primary_hypothesis"]
    assert len(data_1["competing_hypotheses"]) == len(data_2["competing_hypotheses"])
    for h1, h2 in zip(data_1["competing_hypotheses"], data_2["competing_hypotheses"]):
        assert h1["hypothesis_type"] == h2["hypothesis_type"]
        assert h1["status"] == h2["status"]

    # Retrieve via GET endpoint
    get_res = await async_client.get(f"/api/v1/incidents/{inc_id}/outcome")
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["outcome_type"] == data_1["outcome_type"]
    assert retrieved["primary_hypothesis"] == data_1["primary_hypothesis"]
    assert len(retrieved["competing_hypotheses"]) == 7
    assert len(retrieved["nbi_recommendations"]) == len(data_1["nbi_recommendations"])


# ── TEST 23: Research-Integrity: NBI Contains NO Quantitative Confidence Deltas ──
@pytest.mark.asyncio
async def test_23_nbi_no_quantitative_confidence_delta(async_client: AsyncClient):
    """TEST 23: NBI recommendations must not output unsupported quantitative percentage deltas; qualitative discrimination is enforced."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Submit evidence indicating cloud obscuration
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "SATELLITE",
            "source_name": "Sentinel-2 Optical Pass",
            "evidence_type": "optical_imagery",
            "observation": "Cloud cover obscuration (88%) over target slope corridor",
            "metric": "88% Cloud Cover",
            "reliability": "MEDIUM",
            "interpretation": "UNVERIFIED",
        },
    )

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    nbi_items = outcome.get("nbi_recommendations", [])
    assert len(nbi_items) > 0, "Expected at least one NBI recommendation"

    for item in nbi_items:
        # Research-integrity invariant: no unverified pseudo-mathematical percentage deltas
        assert item.get("expected_confidence_delta") is None, (
            f"NBI item {item['action_type']} illegally has quantitative expected_confidence_delta: {item.get('expected_confidence_delta')}"
        )
        assert item.get("qualitative_discrimination") in ("HIGH", "MEDIUM", "LOW"), (
            f"NBI item {item['action_type']} missing valid qualitative_discrimination level: {item.get('qualitative_discrimination')}"
        )
        assert "RECOMMENDED OBSERVATION ONLY" in item.get("rationale", ""), (
            f"NBI item {item['action_type']} missing non-authorizing advisory notice"
        )


# ── TEST 24: Operational Invariant: NBI Recommendation CANNOT Authorize Actions ──
@pytest.mark.asyncio
async def test_24_nbi_cannot_authorize_actions(async_client: AsyncClient):
    """TEST 24: NBI items are advisory information requests; they cannot dispatch actions or modify incident operational lifecycle."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Evaluate outcome to produce NBI recommendations
    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    nbi_items = outcome["nbi_recommendations"]
    assert len(nbi_items) > 0

    # Verify every NBI item status is strictly 'RECOMMENDED'
    for item in nbi_items:
        assert item["status"] == "RECOMMENDED"

    # Query incident: verify NO actions were dispatched or created as side-effects of NBI generation
    inc_res = await async_client.get(f"/api/v1/incidents/{inc_id}")
    assert inc_res.status_code == 200
    incident_data = inc_res.json()
    assert len(incident_data.get("actions", [])) == 0, "NBI evaluation must not dispatch operational actions"
    assert incident_data["status"] != IncidentStatus.CLOSED.value, "NBI evaluation must not close incident"


# ── TEST 25: Evidentiary Invariant: Stale Observation Cannot Establish Non-Event Claim ──
@pytest.mark.asyncio
async def test_25_stale_observation_cannot_establish_non_event(async_client: AsyncClient):
    """TEST 25: Verified inspection older than 24 hours cannot establish current slope stability or clear carriageway."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    # Ingest a field patrol report observed 26 hours ago (exceeding 24h freshness window)
    stale_timestamp = (datetime.now(timezone.utc) - timedelta(hours=26)).isoformat()
    ev_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "Yesterday Patrol",
            "evidence_type": "physical_inspection",
            "observation": "Ground inspection confirms slope intact, carriageway fully clear",
            "metric": "0% Obstruction",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
            "observed_at": stale_timestamp,
        },
    )
    assert ev_res.status_code == 201

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    # Safety invariant: Stale observation cannot establish NON_EVENT_OBSERVED or permit closure
    assert outcome["outcome_type"] == OutcomeType.OBSERVATION_GAP.value
    assert outcome["closure_permitted"] is False
    assert "24-hour freshness policy threshold" in outcome["explanation"]


# ── TEST 26: Safety Invariant: Provenance and Policy Context Integrity ──
@pytest.mark.asyncio
async def test_26_policy_context_integrity_and_provenance(async_client: AsyncClient):
    """TEST 26: Outcome evaluation includes explicit policy_context disclosing Class C/D thresholds and provenance."""
    inc = await _create_test_incident(async_client)
    inc_id = inc["id"]

    out_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert out_res.status_code == 200
    outcome = out_res.json()

    policy_ctx = outcome.get("policy_context")
    assert policy_ctx is not None, "policy_context must be present in outcome assessment"
    assert policy_ctx["corridor_scope_threshold_meters"] == 5000.0
    assert policy_ctx["spatial_divergence_threshold_meters"] == 500.0
    assert policy_ctx["observation_window_hours"] == 4.0
    assert policy_ctx["freshness_window_seconds"] == 86400
    assert "research_integrity_disclosure" in policy_ctx
    assert "Class C" in policy_ctx["research_integrity_disclosure"]


