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
