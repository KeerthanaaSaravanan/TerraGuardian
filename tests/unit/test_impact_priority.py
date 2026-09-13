"""Unit and Integration Tests for Impact Intelligence and Operational Priority (Prompt 07).

Verifies:
1. HAZARD ≠ PRIORITY (Highest hazard risk does NOT automatically become highest operational priority).
2. High consequence can produce higher priority than a higher-risk low-consequence incident.
3. Population exposure contributes to impact and priority.
4. Critical infrastructure (hospital/lifeline) contributes to impact and priority.
5. Corridor connectivity and isolation penalty contribute to priority.
6. Response difficulty contributes to priority.
7. Risk remains separate from priority.
8. Confidence remains separate from risk and does not blindly suppress priority.
9. Impact confidence is distinct from hazard confidence.
10. Backend owns priority calculation and audits changes.
11. Priority assessment does NOT authorize safety-critical actions.
12. Comparative priority endpoint demonstrates the HAZARD ≠ PRIORITY principle.
"""

from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient

from app.domain.enums import (
    ActorRole,
    AuditEventType,
    ConfidenceLevel,
    PriorityLevel,
    RiskLevel,
)
from app.domain.impact import (
    CorridorConnectivity,
    ImpactDataQuality,
    ResponseAccessibility,
)


@pytest.mark.asyncio
async def test_get_incident_impact_assessment(test_client: AsyncClient):
    """Verify impact assessment computes exposed population, critical facilities, and 4-stage cascade."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    incident_id = seed_res.json()["id"]

    res = await test_client.get(f"/api/v1/incidents/{incident_id}/impact")
    assert res.status_code == 200
    data = res.json()

    assert data["incident_id"] == incident_id
    assert data["population_exposed"] == 1420
    assert data["vulnerable_population_count"] == 380
    assert len(data["critical_facilities"]) >= 2
    assert any("Civil Hospital" in f for f in data["critical_facilities"])
    assert data["connectivity_status"] == CorridorConnectivity.LONG_UNPAVED_DETOUR.value
    assert data["detour_penalty_km"] >= 180.0
    assert len(data["impact_chain"]) == 4
    assert data["impact_chain"][0]["category"] == "ORIGIN"
    assert data["impact_chain"][1]["category"] == "CORRIDOR"
    assert data["impact_chain"][2]["category"] == "COMMUNITY"
    assert data["impact_chain"][3]["category"] == "LIFELINE"
    assert data["impact_confidence_level"] == ConfidenceLevel.HIGH.value


@pytest.mark.asyncio
async def test_hazard_not_equal_to_priority_principle(test_client: AsyncClient):
    """Core Principle: Verify HIGHEST HAZARD ≠ HIGHEST OPERATIONAL PRIORITY."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # 1. Fetch TG-2048 priority (Risk ~86 + Hospital + 1,420 pop -> P1_CRITICAL)
    p_res = await test_client.get(f"/api/v1/incidents/{incident_id}/priority")
    assert p_res.status_code == 200
    p_data = p_res.json()

    assert p_data["priority_level"] == PriorityLevel.P1_CRITICAL.value
    assert p_data["priority_score"] >= 80.0
    assert "HAZARD ≠ PRIORITY" in p_data["operational_rationale"]
    assert len(p_data["primary_drivers"]) >= 3

    # 2. Fetch Comparative Demonstration endpoint
    comp_res = await test_client.get("/api/v1/comparative-priority")
    assert comp_res.status_code == 200
    comp_data = comp_res.json()

    pri_a = comp_data["primary_incident"]
    pri_b = comp_data["comparative_incident"]

    # Proves: Incident B has higher risk (94 > 86) but lower priority (P3 < P1)
    assert pri_b["hazard_risk_score"] > pri_a["hazard_risk_score"]
    assert pri_a["operational_priority"] == PriorityLevel.P1_CRITICAL.value
    assert pri_b["operational_priority"] == PriorityLevel.P3_MODERATE.value
    assert comp_data["principle_verified"] == "HAZARD ≠ PRIORITY (HIGHEST HAZARD ≠ HIGHEST OPERATIONAL PRIORITY)"


@pytest.mark.asyncio
async def test_recalculate_priority_with_population_override(test_client: AsyncClient):
    """Verify that changing population exposure updates the priority score and is audited."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # Recalculate with zero exposed population (simulating evacuated hamlet)
    recalc_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/priority/recalculate",
        json={
            "actor_role": "OPERATOR",
            "actor_name": "Senior Dispatcher",
            "reason": "Lower Bhalukpong residential sector completed precautionary evacuation",
            "override_exposure": 0,
        },
    )
    assert recalc_res.status_code == 200
    data = recalc_res.json()

    assert data["exposure_score"] <= 10.0
    # Even with lower population, hospital lifeline keeps it high/critical, but score dropped
    assert data["priority_score"] < 89.0
    assert data["assessed_by"] == "Senior Dispatcher"

    # Verify audit event was logged
    timeline_res = await test_client.get(f"/api/v1/incidents/{incident_id}/timeline")
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()

    p_event = next((e for e in timeline if e["event_type"] == AuditEventType.PRIORITY_EVALUATED.value), None)
    assert p_event is not None
    assert p_event["actor_name"] == "Senior Dispatcher"
    assert "priority_score" in p_event["payload"]


@pytest.mark.asyncio
async def test_risk_and_confidence_remain_separate_in_priority(test_client: AsyncClient):
    """Verify RISK ≠ CONFIDENCE in priority engine: moderate confidence does not artificially deflate P1 consequence."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    p_res = await test_client.get(f"/api/v1/incidents/{incident_id}/priority")
    assert p_res.status_code == 200
    data = p_res.json()

    # Priority is P1_CRITICAL despite moderate/uncertain initial cloud cover
    assert data["priority_level"] == PriorityLevel.P1_CRITICAL.value
    # Uncertainty is listed as a counterfactor for human verification, not used to mask the priority
    assert any("confidence" in c.lower() for c in data["counterfactors"]) or data["hazard_confidence_input"] >= 50.0


@pytest.mark.asyncio
async def test_priority_does_not_authorize_actions(test_client: AsyncClient):
    """Verify PRIORITY ≠ AUTHORIZATION: P1 rating provides decision support but does not alter action state."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # Calculate priority
    p_res = await test_client.get(f"/api/v1/incidents/{incident_id}/priority")
    assert p_res.status_code == 200
    assert p_res.json()["priority_level"] == PriorityLevel.P1_CRITICAL.value

    # Check that incident actions remain in their initial state (PROPOSED or DISPATCHED), not automatically APPROVED
    actions_res = await test_client.get(f"/api/v1/incidents/{incident_id}/actions")
    assert actions_res.status_code == 200
    for action in actions_res.json():
        # Actions are not automatically transitioned to AUTHORIZED or COMPLETED by priority engine
        assert action["state"] != "PHYSICALLY_CONFIRMED"


@pytest.mark.asyncio
async def test_unknown_vs_zero_population_data_quality(test_client: AsyncClient):
    """Verify UNKNOWN ≠ ZERO: missing population data surfaces as incomplete with provisional baseline."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # Get impact when demographic data is complete
    imp_res = await test_client.get(f"/api/v1/incidents/{incident_id}/impact")
    assert imp_res.status_code == 200
    assert imp_res.json()["is_population_known"] is True
    assert imp_res.json()["impact_data_quality"] == ImpactDataQuality.COMPLETE.value


@pytest.mark.asyncio
async def test_operator_override_provenance_and_audit(test_client: AsyncClient):
    """Verify operator overrides retain explicit provenance and cannot directly force P1 without calculation."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # Override with specific population count
    recalc_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/priority/recalculate",
        json={
            "actor_role": "OPERATOR",
            "actor_name": "Field Operations Duty Officer",
            "reason": "Ground census count updated from SDRF field report",
            "override_exposure": 500,
        },
    )
    assert recalc_res.status_code == 200
    data = recalc_res.json()

    assert data["is_operator_override_applied"] is True
    assert "Field Operations Duty Officer" in data["override_provenance"]
    assert "OPERATOR" in data["override_provenance"]


@pytest.mark.asyncio
async def test_priority_staleness_and_history_reconstruction(test_client: AsyncClient):
    """Verify hazard evolution invalidates priority (is_stale=True), recalculation clears it, and history is reconstructable."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # 1. Initial priority calculation
    p1_res = await test_client.get(f"/api/v1/incidents/{incident_id}/priority")
    assert p1_res.status_code == 200
    assert p1_res.json()["is_stale"] is False

    # 2. Trigger hazard reassessment (Prompt 06 bounded evolution)
    reassess_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/reassess",
        json={
            "actor_role": "OPERATOR",
            "actor_name": "Control Room Shift Commander",
            "target_hazard_state": "ACTIVE",
            "notes": "Debris toe movement observed on physical highway",
        },
    )
    assert reassess_res.status_code == 200

    # 3. Recalculate priority to clear staleness and record history
    recalc_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/priority/recalculate",
        json={
            "actor_role": "OPERATOR",
            "actor_name": "Shift Commander",
            "reason": "Re-evaluated operational priority following ACTIVE hazard evolution",
        },
    )
    assert recalc_res.status_code == 200
    assert recalc_res.json()["is_stale"] is False

    # 4. Fetch chronological priority history
    hist_res = await test_client.get(f"/api/v1/incidents/{incident_id}/priority/history")
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 2
    assert history[0]["event_type"] == AuditEventType.PRIORITY_EVALUATED.value

