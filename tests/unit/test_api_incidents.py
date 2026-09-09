"""Unit and Integration tests for FastAPI REST Endpoints."""

import uuid
import pytest
from httpx import AsyncClient

from app.domain.enums import ActorRole, IncidentStatus


@pytest.mark.asyncio
async def test_health_endpoint(test_client: AsyncClient):
    """Test GET /health."""
    response = await test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "terraguardian-api"


@pytest.mark.asyncio
async def test_seed_and_incident_endpoints(test_client: AsyncClient):
    """Test seeding TG-2048, listing, details, state, timeline, and evidence."""
    # 1. Seed TG-2048
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    assert seed_res.status_code == 201
    incident_data = seed_res.json()
    incident_id = incident_data["id"]
    assert incident_data["code"] == "TG-2048"
    assert incident_data["status"] == "VERIFYING"

    # 2. GET /api/v1/incidents
    list_res = await test_client.get("/api/v1/incidents")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(item["code"] == "TG-2048" for item in list_data["items"])

    # 3. GET /api/v1/incidents/{incident_id}
    detail_res = await test_client.get(f"/api/v1/incidents/{incident_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["title"] == incident_data["title"]

    # 4. GET /api/v1/incidents/{incident_id}/state
    state_res = await test_client.get(f"/api/v1/incidents/{incident_id}/state")
    assert state_res.status_code == 200
    state_data = state_res.json()
    assert state_data["status"] == "VERIFYING"
    assert state_data["risk_level"] == "HIGH"
    assert state_data["confidence_level"] == "MODERATE"

    # 5. GET /api/v1/incidents/{incident_id}/evidence
    evidence_res = await test_client.get(f"/api/v1/incidents/{incident_id}/evidence")
    assert evidence_res.status_code == 200
    evidence_data = evidence_res.json()
    assert len(evidence_data) == 4

    # 6. GET /api/v1/incidents/{incident_id}/timeline
    timeline_res = await test_client.get(f"/api/v1/incidents/{incident_id}/timeline")
    assert timeline_res.status_code == 200
    timeline_data = timeline_res.json()
    assert len(timeline_data) >= 2


@pytest.mark.asyncio
async def test_transition_endpoint_valid_and_invalid(test_client: AsyncClient):
    """Test POST /api/v1/incidents/{incident_id}/transitions."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    incident_id = seed_res.json()["id"]

    # 1. Invalid jump: VERIFYING -> RESOLVED should return 400
    bad_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/transitions",
        json={
            "target_status": "RESOLVED",
            "actor_role": "OPERATOR",
            "actor_name": "Duty Officer",
        },
    )
    assert bad_res.status_code == 400
    assert "Cannot transition incident from state 'VERIFYING' to 'RESOLVED'" in bad_res.json()["detail"]

    # 2. Valid transition: VERIFYING -> VERIFIED
    good_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/transitions",
        json={
            "target_status": "VERIFIED",
            "actor_role": "FIELD_VERIFIER",
            "actor_name": "SI R. Thapa (SDRF)",
            "reason": "Geo-tagged photo and on-site physical debris confirmed.",
        },
    )
    assert good_res.status_code == 200
    assert good_res.json()["status"] == "VERIFIED"

    # 3. Valid transition: VERIFIED -> DECISION_REQUIRED
    dec_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/transitions",
        json={
            "target_status": "DECISION_REQUIRED",
            "actor_role": "OPERATOR",
            "actor_name": "Duty Coordinator",
        },
    )
    assert dec_res.status_code == 200
    assert dec_res.json()["status"] == "DECISION_REQUIRED"

    # 4. Unauthorized AI attempt to AUTHORIZE -> 403
    ai_auth_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/transitions",
        json={
            "target_status": "AUTHORIZED",
            "actor_role": "SYSTEM_AI",
            "actor_name": "TerraGuardian AI",
            "authority_order_code": "AUTO-999",
        },
    )
    assert ai_auth_res.status_code == 403
    assert "AI/System actors cannot authorize" in ai_auth_res.json()["detail"]

    # 5. Legitimate human magistrate authorization -> 200
    human_auth_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/transitions",
        json={
            "target_status": "AUTHORIZED",
            "actor_role": "AUTHORIZED_DECISION_MAKER",
            "actor_name": "P. Tsering, IAS (District Magistrate)",
            "authority_order_code": "DDMA-WK-884",
            "reason": "Approved commercial freight stoppage at KM-38.",
        },
    )
    assert human_auth_res.status_code == 200
    assert human_auth_res.json()["status"] == "AUTHORIZED"


@pytest.mark.asyncio
async def test_code_lookup_and_public_summary_endpoints(test_client: AsyncClient):
    """Test lookup by operational code and sanitized public summary boundaries."""
    # Seed
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    assert seed_res.status_code == 201
    incident_id = seed_res.json()["id"]

    # 1. Lookup by code TG-2048
    code_res = await test_client.get("/api/v1/incidents/code/TG-2048")
    assert code_res.status_code == 200
    code_data = code_res.json()
    assert code_data["id"] == incident_id
    assert code_data["code"] == "TG-2048"

    # 2. Lookup by non-existent code -> 404
    bad_code_res = await test_client.get("/api/v1/incidents/code/TG-NONEXISTENT")
    assert bad_code_res.status_code == 404

    # 3. Public summary by UUID
    pub_res = await test_client.get(f"/api/v1/incidents/{incident_id}/public-summary")
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["code"] == "TG-2048"
    assert pub_data["status"] == "VERIFYING"
    # Ensure operational internals are not in public response
    assert "priority_score" not in pub_data
    assert "metadata_json" not in pub_data

    # 4. Public summary by Code
    pub_code_res = await test_client.get("/api/v1/incidents/code/TG-2048/public-summary")
    assert pub_code_res.status_code == 200
    assert pub_code_res.json()["district"] == "West Kameng"


@pytest.mark.asyncio
async def test_action_lifecycle_and_confirmation_endpoints(test_client: AsyncClient):
    """Test action list, state transitions, confirmation evidence, and audit trail."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    incident_id = seed_res.json()["id"]

    # 1. GET /incidents/{incident_id}/actions
    actions_res = await test_client.get(f"/api/v1/incidents/{incident_id}/actions")
    assert actions_res.status_code == 200
    actions = actions_res.json()
    assert len(actions) == 4
    tsk_01 = next(a for a in actions if a["task_code"] == "TSK-01")
    action_id = tsk_01["id"]
    assert tsk_01["state"] == "ACKNOWLEDGED"

    # 2. Transition TSK-01: ACKNOWLEDGED -> IN_PROGRESS
    prog_res = await test_client.post(
        f"/api/v1/actions/{action_id}/transitions",
        json={
            "target_state": "IN_PROGRESS",
            "actor_role": "FIELD_VERIFIER",
            "actor_name": "Major V. Sharma",
            "reason": "Heavy earthmover mobilized to staging point KM-40.",
        },
    )
    assert prog_res.status_code == 200
    assert prog_res.json()["state"] == "IN_PROGRESS"

    # 3. Invalid jump: IN_PROGRESS -> PROPOSED -> 400
    bad_jump = await test_client.post(
        f"/api/v1/actions/{action_id}/transitions",
        json={
            "target_state": "PROPOSED",
            "actor_role": "OPERATOR",
            "actor_name": "Duty Dispatcher",
        },
    )
    assert bad_jump.status_code == 400

    # 4. Advance IN_PROGRESS -> COMPLETED
    comp_res = await test_client.post(
        f"/api/v1/actions/{action_id}/transitions",
        json={
            "target_state": "COMPLETED",
            "actor_role": "FIELD_VERIFIER",
            "actor_name": "Major V. Sharma",
            "reason": "JCB-3DX positioned and ready at staging point KM-40.",
        },
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["state"] == "COMPLETED"
    assert comp_res.json()["completed_at"] is not None

    # 5. Submit Accepted Ground Confirmation Evidence
    conf_res = await test_client.post(
        f"/api/v1/actions/{action_id}/confirmations",
        json={
            "confirming_officer": "Major V. Sharma",
            "confirming_agency": "Border Roads Organisation",
            "location_confirmed": "NH-13 KM-40 Staging Zone",
            "confirmation_notes": "Physical deployment of earthmover and crew confirmed via field radio.",
            "communication_channel": "TETRA_RADIO",
            "is_simulated": True,
        },
    )
    assert conf_res.status_code == 201
    conf_data = conf_res.json()
    assert conf_data["confirming_officer"] == "Major V. Sharma"
    assert conf_data["action_id"] == action_id

    # 6. Check that action is now PHYSICALLY_CONFIRMED
    actions_after = (await test_client.get(f"/api/v1/incidents/{incident_id}/actions")).json()
    tsk_01_after = next(a for a in actions_after if a["id"] == action_id)
    assert tsk_01_after["state"] == "PHYSICALLY_CONFIRMED"
    assert tsk_01_after["confirmed_at"] is not None

    # 7. Check timeline contains action audit events
    timeline = (await test_client.get(f"/api/v1/incidents/{incident_id}/timeline")).json()
    action_events = [e for e in timeline if e["event_type"] in ("ACTION_UPDATED", "ACTION_CONFIRMED")]
    assert len(action_events) >= 3

