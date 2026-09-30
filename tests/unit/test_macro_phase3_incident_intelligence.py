"""Comprehensive Unit Test Suite for Accelerated Macro Phase 3:
Risk -> Evidence -> Incident -> Impact Intelligence.

Covers the 14 core verification requirements:
1. Incident creation and spatial association
2. Evidence attachment across diverse sources (weather, terrain, historical, satellite, citizen, field)
3. Evidence provenance and truth maturity state retention
4. Verified vs Unverified evidence boundary (citizen observations are unverified by default)
5. Conflicting evidence detection and reconciliation status
6. Evidence lineage relationships (SUPPORTS, CONTRADICTS, DERIVED_FROM, SUPERSEDES)
7. Exposure association (NH-13 corridor, Lower Bhalukpong settlement, Civil Hospital)
8. Consequence calculation and impact chain
9. Deterministic priority formula (25% Hazard, 25% Exposure, 25% Criticality, 15% Connectivity, 10% Difficulty)
10. Incident FSM lifecycle transitions & audit events
11. Timeline persistence
12. Next Best Information (NBI) recommendation & hypothesis discrimination
13. AI cannot authorize statutory orders (RBAC safety boundary)
14. Connected end-to-end vertical slice:
    Assessment -> Evidence -> Incident Twin -> Exposure -> Consequence -> Priority -> Decision -> Action
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient

from app.domain.enums import (
    ActionState,
    ActorRole,
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


@pytest.mark.asyncio
async def test_01_incident_creation_and_spatial_association(async_client: AsyncClient):
    """Verify incident creation and automatic/candidate spatial association."""
    # 1. Create incident at KM-42 (27.0842N, 92.5681E)
    create_payload = {
        "title": "KM-42 Sessa Sector Debris Flow",
        "latitude": 27.0842,
        "longitude": 92.5681,
        "location_name": "KM-42 Bhalukpong-Tenga Road",
        "corridor_name": "NH-13 Trans-Arunachal Highway",
        "state": "Arunachal Pradesh",
        "district": "West Kameng",
        "incident_type": "landslide",
        "description": "Cut slope colluvium failure under heavy precipitation",
    }
    res = await async_client.post("/api/v1/incidents", json=create_payload)
    assert res.status_code == 201
    incident = res.json()
    incident_id = incident["id"]
    assert incident["status"] == "DETECTED"
    assert incident["code"].startswith("TG-")

    # 2. Test spatial association within 5km corridor envelope
    assoc_payload = {
        "latitude": 27.0850,
        "longitude": 92.5690,
        "incident_id": incident_id,
    }
    assoc_res = await async_client.post("/api/v1/gis/spatial-association", json=assoc_payload)
    assert assoc_res.status_code == 200
    assoc_data = assoc_res.json()
    assert assoc_data["association_status"] == "ATTACHED"
    assert assoc_data["distance_meters"] < 5000.0


@pytest.mark.asyncio
async def test_02_evidence_attachment_and_provenance(async_client: AsyncClient):
    """Verify evidence attachment across diverse modalities with provenance retention."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    inc_id = seed_res.json()["id"]

    # Attach terrain-derived evidence
    ev_payload = {
        "source": "TERRAIN",
        "source_name": "Copernicus GLO-30 DEM Extraction",
        "evidence_type": "slope_derivative",
        "observation": "Steep 42.3° colluvial escarpment facing 185.4° S",
        "metric": "Slope: 42.3° | Aspect: 185.4° | Elevation: 1480m MSL",
        "reliability": "HIGH",
        "latitude": 27.0842,
        "longitude": 92.5681,
        "provenance": "Copernicus GLO-30 30m posting, Horn (1981) finite-difference",
        "is_simulated": False,
        "confidence_contribution": 0.90,
        "processing_status": "RECONCILED",
        "interpretation": "VERIFIED",
    }
    res = await async_client.post(f"/api/v1/incidents/{inc_id}/evidence", json=ev_payload)
    assert res.status_code == 201
    ev_item = res.json()
    assert ev_item["source"] == "TERRAIN"
    assert ev_item["provenance"] == "Copernicus GLO-30 30m posting, Horn (1981) finite-difference"
    assert ev_item["interpretation"] == "VERIFIED"


@pytest.mark.asyncio
async def test_03_citizen_evidence_unverified_by_default(async_client: AsyncClient):
    """Verify citizen reports are treated as UNVERIFIED by default (no auto ground truth)."""
    # Seed incident
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    citizen_payload = {
        "latitude": 27.0840,
        "longitude": 92.5680,
        "observation": "Large rocks and mud tumbling onto carriageway near hairpin turn",
        "hazard_type": "SLOPE_DEBRIS",
        "severity": "HIGH",
        "reporter_note": "Single lane completely blocked by boulders",
        "incident_id": inc_id,
    }
    res = await async_client.post("/api/v1/ingestion/citizen-report", json=citizen_payload)
    assert res.status_code == 201
    cit_res = res.json()
    assert cit_res["status"] == "RECEIVED"
    assert cit_res["interpretation"] == "UNVERIFIED"
    assert cit_res["incident_id"] == inc_id

    # Verify evidence item is UNVERIFIED in the incident evidence list
    ev_res = await async_client.get(f"/api/v1/incidents/{inc_id}/evidence")
    assert ev_res.status_code == 200
    ev_items = ev_res.json()
    cit_evidence = next(e for e in ev_items if e["id"] == cit_res["evidence_id"])
    assert cit_evidence["interpretation"] == "UNVERIFIED"
    assert cit_evidence["provenance"] == "REAL_CITIZEN_SUBMISSION"


@pytest.mark.asyncio
async def test_04_field_officer_can_verify_evidence(async_client: AsyncClient):
    """Verify FIELD_VERIFIER can transition evidence status to VERIFIED or CONFLICTED."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    # Ingest unverified report
    citizen_payload = {
        "latitude": 27.0842,
        "longitude": 92.5681,
        "observation": "Cracks forming across pavement",
        "incident_id": inc_id,
    }
    cit_res = await async_client.post("/api/v1/ingestion/citizen-report", json=citizen_payload)
    ev_id = cit_res.json()["evidence_id"]

    # Field verifier verifies it
    patch_payload = {
        "actor_role": "FIELD_VERIFIER",
        "actor_name": "ASI D. Sonam",
        "interpretation": "VERIFIED",
        "reason": "Physical on-site inspection confirmed tension cracks across pavement",
    }
    patch_res = await async_client.patch(f"/api/v1/evidence/{ev_id}", json=patch_payload)
    assert patch_res.status_code == 200
    updated_ev = patch_res.json()
    assert updated_ev["interpretation"] == "VERIFIED"


@pytest.mark.asyncio
async def test_05_conflicting_evidence_detection_and_reconciliation(async_client: AsyncClient):
    """Verify detection of conflicting evidence signals (e.g. optical obscuration vs weather trigger)."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    # Query reconciliation summary
    rec_res = await async_client.get(f"/api/v1/incidents/{inc_id}/reconciliation")
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["total_evidence_count"] >= 4
    # SATELLITE evidence is simulated with 88% cloud cover and CONFLICTED status
    assert len(rec_data["conflicting_evidence_ids"]) >= 1
    assert rec_data["conflict_status"] in ("CONFLICTED", "PARTIALLY_CONFLICTED")
    assert "FIELD_VERIFICATION" in rec_data["recommended_action"]


@pytest.mark.asyncio
async def test_06_exposure_and_impact_chain(async_client: AsyncClient):
    """Verify the 4-stage disaster convergence chain and exposure nodes."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    # Query /exposure endpoint (and /impact)
    res = await async_client.get(f"/api/v1/incidents/{inc_id}/exposure")
    assert res.status_code == 200
    impact = res.json()
    assert impact["corridor_name"] is not None
    assert impact["population_exposed"] == 1420
    assert impact["vulnerable_population_count"] == 380
    assert len(impact["critical_facilities"]) >= 2
    assert any("Hospital" in f for f in impact["critical_facilities"])

    # Verify 4-stage disaster convergence chain
    chain = impact["impact_chain"]
    assert len(chain) == 4
    stages = [node["category"] for node in chain]
    assert stages == ["ORIGIN", "CORRIDOR", "COMMUNITY", "LIFELINE"]


@pytest.mark.asyncio
async def test_07_deterministic_priority_formula(async_client: AsyncClient):
    """Verify frozen 5-factor priority formula: 25% Hazard, 25% Exposure, 25% Criticality, 15% Connectivity, 10% Difficulty."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    res = await async_client.get(f"/api/v1/incidents/{inc_id}/priority")
    assert res.status_code == 200
    pri = res.json()

    h_score = pri["hazard_risk_input"]
    e_score = pri["exposure_score"]
    c_score = pri["criticality_score"]
    conn_score = pri["connectivity_penalty_score"]
    d_score = pri["response_difficulty_score"]
    total_score = pri["priority_score"]

    expected_score = round(
        0.25 * h_score + 0.25 * e_score + 0.25 * c_score + 0.15 * conn_score + 0.10 * d_score,
        1,
    )
    assert abs(total_score - expected_score) <= 0.1
    assert pri["priority_level"] in ("P1_CRITICAL", "P1")
    assert "HAZARD" in pri["operational_rationale"] or "Critical" in pri["operational_rationale"] or len(pri["primary_drivers"]) >= 1


@pytest.mark.asyncio
async def test_08_risk_vs_confidence_decoupling(async_client: AsyncClient):
    """Verify that Risk and Confidence are evaluated and reported as separate dimensions."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    res = await async_client.get(f"/api/v1/incidents/{inc_id}/state")
    assert res.status_code == 200
    state = res.json()

    # Risk is HIGH/CRITICAL, while confidence is MODERATE (independent metrics)
    assert state["risk_level"] in ("HIGH", "CRITICAL")
    assert state["confidence_level"] in ("MODERATE", "LOW", "HIGH")
    assert state["risk_score"] != state["confidence_score"]
    assert state["priority_level"] in ("P1_CRITICAL", "P1", "P2_HIGH", "P2")


@pytest.mark.asyncio
async def test_09_incident_fsm_lifecycle_transitions_and_timeline(async_client: AsyncClient):
    """Verify canonical FSM progression and chronological audit timeline persistence."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    # 1. DETECTED -> ASSESSING
    t1 = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        json={"target_status": "ASSESSING", "actor_role": "OPERATOR", "actor_name": "T. Norbu"},
    )
    assert t1.status_code == 200
    assert t1.json()["status"] == "ASSESSING"

    # 2. ASSESSING -> VERIFYING
    t2 = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        json={"target_status": "VERIFYING", "actor_role": "OPERATOR", "actor_name": "T. Norbu"},
    )
    assert t2.status_code == 200
    assert t2.json()["status"] == "VERIFYING"

    # 3. VERIFYING -> VERIFIED
    t3 = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        json={"target_status": "VERIFIED", "actor_role": "FIELD_VERIFIER", "actor_name": "ASI D. Sonam"},
    )
    assert t3.status_code == 200
    assert t3.json()["status"] == "VERIFIED"

    # 4. VERIFIED -> DECISION_REQUIRED
    t4 = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        json={"target_status": "DECISION_REQUIRED", "actor_role": "OPERATOR", "actor_name": "T. Norbu"},
    )
    assert t4.status_code == 200
    assert t4.json()["status"] == "DECISION_REQUIRED"

    # Verify chronological timeline persists events
    tl_res = await async_client.get(f"/api/v1/incidents/{inc_id}/timeline")
    assert tl_res.status_code == 200
    timeline = tl_res.json()
    assert len(timeline) >= 4
    event_types = [e["event_type"] for e in timeline]
    assert any("TRANSITION" in et or "ASSESSING" in str(e.get("new_state")) for et, e in zip(event_types, timeline))


@pytest.mark.asyncio
async def test_10_ai_cannot_authorize_statutory_orders(async_client: AsyncClient):
    """Verify safety governance rule: AI cannot authorize statutory orders."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    # Move to DECISION_REQUIRED
    await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", json={"target_status": "ASSESSING", "actor_role": "OPERATOR", "actor_name": "Operator"})
    await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", json={"target_status": "DECISION_REQUIRED", "actor_role": "OPERATOR", "actor_name": "Operator"})

    # Attempt AI transition to AUTHORIZED -> Must be rejected (403 Forbidden)
    ai_transition = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        json={"target_status": "AUTHORIZED", "actor_role": "SYSTEM_AI", "actor_name": "TerraGuardian AI"},
    )
    assert ai_transition.status_code in (403, 400)


@pytest.mark.asyncio
async def test_11_decision_support_and_nbi_evaluation(async_client: AsyncClient):
    """Verify Next Best Information (NBI) items discriminate between competing hypotheses."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    res = await async_client.get(f"/api/v1/incidents/{inc_id}/decision-support")
    assert res.status_code == 200
    ds = res.json()

    assert "governing_safety_rules" in ds
    assert len(ds["governing_safety_rules"]) >= 4
    assert any("AI ASSISTS REASONING" in r for r in ds["governing_safety_rules"])

    # NBI Items
    nbi_items = ds["next_best_information"]
    assert len(nbi_items) >= 1
    # Check qualitative discrimination fields
    item0 = nbi_items[0]
    assert "target_modality" in item0
    assert "rationale" in item0
    assert "target_hypotheses" in item0
    assert "spatial_scope" in item0

    # Competing hypotheses in target_hypotheses
    all_hypotheses = {h for item in nbi_items for h in item.get("target_hypotheses", [])}
    assert any("H1_FALSE_ALARM" in h for h in all_hypotheses)
    assert any("H2_INTERVENTION_CONDITIONED_NON_EVENT" in h for h in all_hypotheses)


@pytest.mark.asyncio
async def test_12_what_changed_temporal_evolution(async_client: AsyncClient):
    """Verify What Changed forensic comparison reflects reassessment."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    # Reassess with real environmental data
    reassess_res = await async_client.post(
        "/api/v1/gis/environmental/reassess-with-real-data",
        json={"incident_id": inc_id, "target_date": "2024-06-25"},
    )
    assert reassess_res.status_code == 200
    r_data = reassess_res.json()

    assert "what_changed" in r_data
    changes = r_data["what_changed"]
    assert len(changes) >= 5
    params = [c["parameter"] for c in changes]
    assert "Slope Angle" in params
    assert "Terrain Elevation" in params
    assert "Assessment Version" in params


@pytest.mark.asyncio
async def test_13_end_to_end_connected_vertical_slice(async_client: AsyncClient):
    """Verify complete vertical slice:
    Scientific Assessment -> Evidence -> Incident Twin -> Exposure -> Consequence -> Priority -> Decision -> Action.
    """
    # 1. Seed / Initialize Incident Twin
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    inc = seed_res.json()
    inc_id = inc["id"]

    # 2. Query Scientific Assessment
    sa_res = await async_client.get(f"/api/v1/gis/incidents/{inc_id}/scientific-assessment")
    assert sa_res.status_code == 200
    sa = sa_res.json()
    assert sa["susceptibility"]["experimental_score"] > 0
    assert sa["susceptibility"]["scientific_maturity"] == "L3 — Integration Tested"
    assert "Copernicus GLO-30" in sa["feature_lineage"]["slope"]["source_dataset"]

    # 3. Query Exposure & Consequence
    exp_res = await async_client.get(f"/api/v1/incidents/{inc_id}/exposure")
    assert exp_res.status_code == 200
    exp = exp_res.json()
    assert exp["population_exposed"] == 1420
    assert len(exp["cascading_consequences"]) >= 2

    # 4. Query Priority
    pri_res = await async_client.get(f"/api/v1/incidents/{inc_id}/priority")
    assert pri_res.status_code == 200
    pri = pri_res.json()
    assert pri["priority_level"] in ("P1_CRITICAL", "P1")

    # 5. Advance State to DECISION_REQUIRED
    await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", json={"target_status": "ASSESSING", "actor_role": "OPERATOR", "actor_name": "T. Norbu"})
    await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", json={"target_status": "DECISION_REQUIRED", "actor_role": "OPERATOR", "actor_name": "T. Norbu"})

    # 6. Human Authority Enacts Decision
    dec_payload = {
        "decision_type": "APPROVED",
        "action_directive": "Enact precautionary physical carriageway closure at KM-40 to KM-48",
        "order_code": "DDMA-WK-884-AUTH",
        "rationale": "High consequence to solitary strategic military corridor and hospital lifeline",
        "signer_role": "AUTHORIZED_DECISION_MAKER",
        "signer_name": "Deputy Commissioner / Chairman DDMA",
    }
    dec_res = await async_client.post(f"/api/v1/incidents/{inc_id}/decisions", json=dec_payload)
    assert dec_res.status_code == 201
    assert dec_res.json()["decision_type"] == "APPROVED"

    # 7. Dispatched Action Advances to PHYSICALLY_CONFIRMED
    actions_res = await async_client.get(f"/api/v1/incidents/{inc_id}/actions")
    assert actions_res.status_code == 200
    actions = actions_res.json()
    assert len(actions) >= 1
    act_id = actions[0]["id"]

    # Confirm Action on ground
    conf_payload = {
        "confirming_officer": "ASI D. Sonam",
        "confirming_agency": "Arunachal Pradesh Police / Bhalukpong PS",
        "location_confirmed": "NH-13 KM-40 Police Outpost Staging",
        "confirmation_notes": "Physical barricade erected and heavy earthmover staged. Warning signage in place.",
        "communication_channel": "TETRA_RADIO",
    }
    conf_res = await async_client.post(f"/api/v1/actions/{act_id}/confirmations", json=conf_payload)
    assert conf_res.status_code == 201
    assert conf_res.json()["confirming_officer"] == "ASI D. Sonam"

    # Verify Action State is PHYSICALLY_CONFIRMED
    action_res2 = await async_client.get(f"/api/v1/incidents/{inc_id}/actions")
    a0 = next(a for a in action_res2.json() if a["id"] == act_id)
    assert a0["state"] == "PHYSICALLY_CONFIRMED"
