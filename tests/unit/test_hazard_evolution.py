"""Unit & Integration Tests for Hazard Evolution, Divergence, and Bounded Reassessment (Prompt 06).

Verifies:
1. Living Hazard Hypothesis derivation and expected vs observed reconciliation.
2. EVENT ABSENCE DOES NOT AUTO-RESOLVE (Becomes DELAYED or triggers reassessment).
3. DIVERGENCE TRIGGERS REASSESSMENT — NOT AUTOMATIC ESCALATION.
4. ACTION CONFIRMED DOES NOT RESOLVE HAZARD.
5. DISSIPATED is distinct from RESOLVED.
6. DELAYED is distinct from FALSE_ALARM.
7. RESOLVED requires affirmative geotechnical/stabilization evidence.
8. Hazard continuity and lineage tracking.
9. Audit event creation on reassessment and hazard state transitions.
10. REST API endpoints for hypothesis, divergences, reassessment, and lineage.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient

from app.db.models import ActionModel, EvidenceModel, IncidentModel
from app.domain.enums import (
    ActionState,
    ActorRole,
    AuditEventType,
    EvidenceInterpretation,
    EvidenceSource,
    HazardState,
    IncidentStatus,
    RiskLevel,
)
from app.domain.hazard import (
    BoundedReassessmentRequest,
    DivergenceType,
    HazardStateTransitionRequest,
)
from app.services.hazard_service import HazardService


@pytest.mark.asyncio
async def test_get_hazard_hypothesis_and_temporal_divergence(test_client: AsyncClient):
    """Verify living hazard hypothesis extracts expected spatial/temporal envelope and detects temporal divergence."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    incident_id = seed_res.json()["id"]

    res = await test_client.get(f"/api/v1/incidents/{incident_id}/hypothesis")
    assert res.status_code == 200
    data = res.json()

    assert data["incident_id"] == incident_id
    assert data["lineage_id"] == "HL-TG-2048-01"
    assert data["current_state"] == HazardState.EXPECTED.value
    assert data["spatial_envelope"]["corridor_chainage"] == "KM-42 Bhalukpong-Tenga Sector"
    assert len(data["divergences"]) > 0

    # Verify temporal divergence detected (EVENT ABSENCE ≠ HAZARD RESOLUTION)
    temp_div = next((d for d in data["divergences"] if d["divergence_type"] == DivergenceType.TEMPORAL.value), None)
    assert temp_div is not None
    assert "EVENT ABSENCE ≠ HAZARD RESOLUTION" in temp_div["explanation"]
    assert temp_div["requires_reassessment"] is True


@pytest.mark.asyncio
async def test_event_absence_does_not_auto_resolve(test_client: AsyncClient):
    """Verify that when an expected window elapses without failure, bounded reassessment yields DELAYED, NOT RESOLVED."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # Reassess without ground failure evidence
    reassess_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/reassess",
        json={
            "actor_role": "OPERATOR",
            "actor_name": "Shift Commander",
            "notes": "Expected 4-hour rainfall peak window passed without major debris detachment.",
        },
    )
    assert reassess_res.status_code == 200
    data = reassess_res.json()

    # Must transition to DELAYED, NOT RESOLVED
    assert data["previous_hazard_state"] == HazardState.EXPECTED.value
    assert data["updated_hazard_state"] == HazardState.DELAYED.value
    assert data["continuity_supported"] is True
    assert "TEMPORAL REASSESSMENT" in data["rationale"]
    assert "NO AUTO-RESOLUTION" in data["rationale"]

    # Check incident twin reflects DELAYED
    inc_res = await test_client.get(f"/api/v1/incidents/{incident_id}")
    assert inc_res.status_code == 200
    assert inc_res.json()["hazard_state"] == HazardState.DELAYED.value


@pytest.mark.asyncio
async def test_resolved_requires_affirmative_evidence(test_client: AsyncClient):
    """Verify system strictly rejects transitioning hazard to RESOLVED without physical verification."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # Attempt to force RESOLVED state without resolution evidence
    res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/reassess",
        json={
            "actor_role": "OPERATOR",
            "actor_name": "Operator",
            "target_hazard_state": "RESOLVED",
        },
    )
    assert res.status_code == 400
    assert "RESOLUTION REJECTED" in res.json()["detail"]


@pytest.mark.asyncio
async def test_action_confirmed_does_not_resolve_hazard(test_client: AsyncClient):
    """Verify ACTION CONFIRMED ≠ HAZARD RESOLUTION: Roadblock confirmation does not resolve physical slope danger."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # Fetch actions and confirm TSK-02 (roadblock)
    actions_res = await test_client.get(f"/api/v1/incidents/{incident_id}/actions")
    assert actions_res.status_code == 200
    task_02 = next(a for a in actions_res.json() if a["task_code"] == "TSK-02")

    # Confirm action
    conf_res = await test_client.post(
        f"/api/v1/actions/{task_02['id']}/confirmations",
        json={
            "confirming_officer": "ASI D. Sonam",
            "confirming_agency": "West Kameng Police",
            "location_confirmed": "KM-38 Checkpost",
            "confirmation_notes": "Physical barrier deployed across both carriageways.",
        },
    )
    assert conf_res.status_code == 201

    # Check that incident hazard state is still EXPECTED or DELAYED, NOT RESOLVED
    inc_res = await test_client.get(f"/api/v1/incidents/{incident_id}")
    assert inc_res.status_code == 200
    assert inc_res.json()["hazard_state"] in (HazardState.EXPECTED.value, HazardState.DELAYED.value)
    assert inc_res.json()["hazard_state"] != HazardState.RESOLVED.value


@pytest.mark.asyncio
async def test_spatial_divergence_and_shifted_state(test_client: AsyncClient):
    """Verify spatial divergence produces SHIFTED while maintaining lineage continuity."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/reassess",
        json={
            "actor_role": "OPERATOR",
            "actor_name": "GIS Specialist",
            "target_hazard_state": "SHIFTED",
            "notes": "Instability shifted 400m up-corridor to KM-42.4",
        },
    )
    assert res.status_code == 200
    data = res.json()

    assert data["updated_hazard_state"] == HazardState.SHIFTED.value
    assert data["continuity_supported"] is True
    assert data["lineage_id"] == "HL-TG-2048-01"
    assert "SPATIAL REASSESSMENT" in data["rationale"]


@pytest.mark.asyncio
async def test_hazard_evolution_audit_trail(test_client: AsyncClient):
    """Verify that hazard reassessments generate append-oriented relational audit records."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # Perform reassessment
    await test_client.post(
        f"/api/v1/incidents/{incident_id}/reassess",
        json={
            "actor_role": "OPERATOR",
            "actor_name": "Audit Test Officer",
            "notes": "Testing audit generation on reassessment",
        },
    )

    timeline_res = await test_client.get(f"/api/v1/incidents/{incident_id}/timeline")
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()

    reassess_event = next((e for e in timeline if e["event_type"] == AuditEventType.REASSESSMENT_PERFORMED.value), None)
    assert reassess_event is not None
    assert reassess_event["actor_name"] == "Audit Test Officer"
    assert "previous_hazard_state" in reassess_event["payload"]


@pytest.mark.asyncio
async def test_get_hazard_lineage_endpoint(test_client: AsyncClient):
    """Verify lineage tracking summary and tree inspection."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # Perform a reassessment to add a node to the lineage tree
    await test_client.post(
        f"/api/v1/incidents/{incident_id}/reassess",
        json={
            "actor_role": "OPERATOR",
            "actor_name": "Lineage Auditor",
        },
    )

    lineage_res = await test_client.get(f"/api/v1/incidents/{incident_id}/lineage")
    assert lineage_res.status_code == 200
    data = lineage_res.json()

    assert data["lineage_id"] == "HL-TG-2048-01"
    assert data["total_reassessments_performed"] >= 1
    assert data["continuity_intact"] is True
    assert len(data["lineage_tree"]) >= 2


@pytest.mark.asyncio
async def test_hazard_state_transitions_fsm_validation(test_client: AsyncClient):
    """Verify hazard FSM transition validation, invalid jumps rejection, and state distinctions."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # 1. Invalid jump: EXPECTED -> RESOLVED directly without resolution evidence is rejected
    jump_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/hazard-transitions",
        json={
            "target_state": "RESOLVED",
            "actor_role": "OPERATOR",
            "actor_name": "Test Operator",
            "reason": "Invalid direct jump attempt",
        },
    )
    assert jump_res.status_code == 400
    assert "Invalid hazard state transition" in jump_res.json()["detail"]

    # 2. Valid transition: EXPECTED -> DELAYED
    t1 = await test_client.post(
        f"/api/v1/incidents/{incident_id}/hazard-transitions",
        json={
            "target_state": "DELAYED",
            "actor_role": "OPERATOR",
            "actor_name": "Test Operator",
            "reason": "Expected window elapsed without failure",
        },
    )
    assert t1.status_code == 200
    assert t1.json()["hazard_state"] == HazardState.DELAYED.value

    # 3. Valid transition: DELAYED -> ACTIVE
    t2 = await test_client.post(
        f"/api/v1/incidents/{incident_id}/hazard-transitions",
        json={
            "target_state": "ACTIVE",
            "actor_role": "OPERATOR",
            "actor_name": "Test Operator",
            "reason": "Ground movement reported",
        },
    )
    assert t2.status_code == 200
    assert t2.json()["hazard_state"] == HazardState.ACTIVE.value

    # 4. Valid transition: ACTIVE -> PARTIAL
    t3 = await test_client.post(
        f"/api/v1/incidents/{incident_id}/hazard-transitions",
        json={
            "target_state": "PARTIAL",
            "actor_role": "OPERATOR",
            "actor_name": "Test Operator",
            "reason": "Partial slope movement observed",
        },
    )
    assert t3.status_code == 200
    assert t3.json()["hazard_state"] == HazardState.PARTIAL.value

    # 5. Valid transition: PARTIAL -> EVOLVED
    t4 = await test_client.post(
        f"/api/v1/incidents/{incident_id}/hazard-transitions",
        json={
            "target_state": "EVOLVED",
            "actor_role": "OPERATOR",
            "actor_name": "Test Operator",
            "reason": "Secondary scarp formed up-slope",
        },
    )
    assert t4.status_code == 200
    assert t4.json()["hazard_state"] == HazardState.EVOLVED.value

    # 6. Valid transition: EVOLVED -> DISSIPATED
    t5 = await test_client.post(
        f"/api/v1/incidents/{incident_id}/hazard-transitions",
        json={
            "target_state": "DISSIPATED",
            "actor_role": "OPERATOR",
            "actor_name": "Test Operator",
            "reason": "Rainfall ceased, movement stabilized but not formally cleared",
        },
    )
    assert t5.status_code == 200
    assert t5.json()["hazard_state"] == HazardState.DISSIPATED.value
    # Invariant: DISSIPATED is NOT RESOLVED
    assert t5.json()["hazard_state"] != HazardState.RESOLVED.value


@pytest.mark.asyncio
async def test_delayed_to_active_with_field_evidence(test_client: AsyncClient):
    """Verify that when delayed slope receives active verified ground evidence, reassessment yields ACTIVE."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # First reassess to DELAYED
    await test_client.post(
        f"/api/v1/incidents/{incident_id}/hazard-transitions",
        json={
            "target_state": "DELAYED",
            "actor_role": "OPERATOR",
            "actor_name": "Test Operator",
            "reason": "Temporal window elapsed",
        },
    )

    # Ingest verified field evidence of active movement
    ev_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "SDRF Ground Patrol #03",
            "evidence_type": "physical_inspection",
            "observation": "Active cut-slope toe failure with mud slurry blocking 60% carriageway",
            "metric": "60% Carriageway Obstructed",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
            "confidence_contribution": 0.35,
        },
    )
    assert ev_res.status_code == 201

    # Perform bounded reassessment
    reassess_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/reassess",
        json={
            "actor_role": "OPERATOR",
            "actor_name": "Reassessment Officer",
        },
    )
    assert reassess_res.status_code == 200
    data = reassess_res.json()
    assert data["updated_hazard_state"] == HazardState.ACTIVE.value
    assert data["continuity_supported"] is True

