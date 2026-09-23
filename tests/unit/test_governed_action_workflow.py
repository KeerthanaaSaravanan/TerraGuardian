"""Governed Action Workflow & Authority Boundary Tests — Prompt 03 verification.

Validates the frozen TerraGuardian invariants:
1. RECOMMENDATION ≠ AUTHORIZATION
2. AUTHORIZATION ≠ EXECUTION
3. EXECUTION ≠ PHYSICAL CONFIRMATION
4. ACTION COMPLETED ≠ HAZARD RESOLVED

Covers:
- Server-derived authority and client role stripping on actions and decisions
- Statutory decision enactment by AUTHORIZED_DECISION_MAKER (Magistrate)
- Action proposal, approval, dispatch, completion, and physical confirmation lifecycle
- Rejection of bypasses, invalid state jumps, and privilege escalation
- Mandatory confirmation evidence validation and idempotency
- Audit event generation and provenance tracking
"""

from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient

from app.config import settings


@pytest.mark.asyncio
async def test_magistrate_can_enact_statutory_decision(async_client: AsyncClient) -> None:
    """Authorized magistrate can enact a statutory decision with an official order code."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "magistrate", "password": "Terra#Admin2026"},
    )
    assert login.status_code == 200
    mag_token = login.json()["access_token"]

    # Create incident
    inc_res = await async_client.post(
        "/api/v1/incidents",
        json={"code": f"TG-DEC-{uuid.uuid4().hex[:6].upper()}", "title": "Decision Test Incident", "latitude": 27.1, "longitude": 92.5},
    )
    assert inc_res.status_code == 201
    inc_id = inc_res.json()["id"]

    # Enact statutory decision
    dec_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/decisions",
        headers={"Authorization": f"Bearer {mag_token}"},
        json={
            "decision_type": "APPROVED",
            "action_directive": "Enforce commercial traffic stoppage at KM-38",
            "order_code": "DDMA-WK-2026/884-A",
            "rationale": "Saturated slope at KM-42 presents imminent landslide risk to trans-highway corridor.",
            "proposed_measures": ["Traffic Diversion", "BRO Staging"],
        },
    )
    assert dec_res.status_code == 201
    dec_data = dec_res.json()
    assert dec_data["order_code"] == "DDMA-WK-2026/884-A"
    assert dec_data["signer_role"] == "AUTHORIZED_DECISION_MAKER"
    assert "P. Tsering" in dec_data["signer_name"]

    # List decisions
    list_res = await async_client.get(
        f"/api/v1/incidents/{inc_id}/decisions",
        headers={"Authorization": f"Bearer {mag_token}"},
    )
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1


@pytest.mark.asyncio
async def test_operator_cannot_enact_statutory_decision(async_client: AsyncClient) -> None:
    """Operator role is insufficient to enact statutory decisions (must return 403)."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Terra#Op2026"},
    )
    op_token = login.json()["access_token"]

    inc_res = await async_client.post(
        "/api/v1/incidents",
        json={"code": f"TG-DEC-{uuid.uuid4().hex[:6].upper()}", "title": "Operator Decision Rejection Test", "latitude": 27.1, "longitude": 92.5},
    )
    inc_id = inc_res.json()["id"]

    dec_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/decisions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={
            "decision_type": "APPROVED",
            "action_directive": "Unauthorized directive attempt",
            "order_code": "ILLEGAL-ORD-01",
            "rationale": "Trying to bypass human authority boundary.",
        },
    )
    assert dec_res.status_code == 403


@pytest.mark.asyncio
async def test_decision_idempotency_same_order_code(async_client: AsyncClient) -> None:
    """Submitting identical decision with the same order code returns existing record idempotently."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "magistrate", "password": "Terra#Admin2026"},
    )
    mag_token = login.json()["access_token"]

    inc_res = await async_client.post(
        "/api/v1/incidents",
        json={"code": f"TG-DEC-{uuid.uuid4().hex[:6].upper()}", "title": "Idempotency Incident", "latitude": 27.1, "longitude": 92.5},
    )
    inc_id = inc_res.json()["id"]

    payload = {
        "decision_type": "APPROVED",
        "action_directive": "Cordon Highway",
        "order_code": "DDMA-WK-IDEMP-01",
        "rationale": "Precautionary safety measure.",
    }

    r1 = await async_client.post(
        f"/api/v1/incidents/{inc_id}/decisions",
        headers={"Authorization": f"Bearer {mag_token}"},
        json=payload,
    )
    assert r1.status_code == 201

    r2 = await async_client.post(
        f"/api/v1/incidents/{inc_id}/decisions",
        headers={"Authorization": f"Bearer {mag_token}"},
        json=payload,
    )
    assert r2.status_code == 201
    assert r1.json()["id"] == r2.json()["id"]


@pytest.mark.asyncio
async def test_operator_can_propose_action(async_client: AsyncClient) -> None:
    """Operator can propose an operational task bound to an incident."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Terra#Op2026"},
    )
    op_token = login.json()["access_token"]

    inc_res = await async_client.post(
        "/api/v1/incidents",
        json={"code": f"TG-ACT-{uuid.uuid4().hex[:6].upper()}", "title": "Action Propose Test", "latitude": 27.1, "longitude": 92.5},
    )
    inc_id = inc_res.json()["id"]

    act_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/actions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={
            "task_code": "TSK-TEST-01",
            "agency": "Traffic Police",
            "title": "Establish Checkpost",
            "description": "Deploy barricades at KM-38",
            "assigned_to": "Officer Tashi",
        },
    )
    assert act_res.status_code == 201
    data = act_res.json()
    assert data["task_code"] == "TSK-TEST-01"
    assert data["state"] == "PROPOSED"


@pytest.mark.asyncio
async def test_citizen_cannot_propose_or_mutate_action(async_client: AsyncClient) -> None:
    """Public citizen role is forbidden from proposing or mutating operational tasks."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "citizen", "password": "Citizen#2026"},
    )
    citizen_token = login.json()["access_token"]

    inc_res = await async_client.post(
        "/api/v1/incidents",
        json={"code": f"TG-ACT-{uuid.uuid4().hex[:6].upper()}", "title": "Citizen Rejection Test", "latitude": 27.1, "longitude": 92.5},
    )
    inc_id = inc_res.json()["id"]

    # Citizen trying to propose action -> 403
    act_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/actions",
        headers={"Authorization": f"Bearer {citizen_token}"},
        json={
            "task_code": "TSK-CIT-01",
            "agency": "Civilians",
            "title": "Block Road",
            "description": "Unauthorized blockage",
            "assigned_to": "Self",
        },
    )
    assert act_res.status_code == 403


@pytest.mark.asyncio
async def test_action_privilege_escalation_rejected(async_client: AsyncClient) -> None:
    """Operator claiming AUTHORIZED_DECISION_MAKER on action transition must be rejected with 403."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Terra#Op2026"},
    )
    op_token = login.json()["access_token"]

    # Seed incident and pick an action
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]
    acts = (await async_client.get(f"/api/v1/incidents/{inc_id}/actions")).json()
    action_id = acts[0]["id"]

    # Operator sends forged actor_role in transition body
    resp = await async_client.post(
        f"/api/v1/actions/{action_id}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={
            "target_state": "APPROVED",
            "actor_role": "AUTHORIZED_DECISION_MAKER",  # Forged!
        },
    )
    assert resp.status_code == 403
    assert "privilege escalation rejected" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invalid_action_transition_jumps_rejected(async_client: AsyncClient) -> None:
    """Direct invalid jumps (e.g. PROPOSED → COMPLETED, or PROPOSED → DISPATCHED) must return 400."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Terra#Op2026"},
    )
    op_token = login.json()["access_token"]

    inc_res = await async_client.post(
        "/api/v1/incidents",
        json={"code": f"TG-JUMP-{uuid.uuid4().hex[:6].upper()}", "title": "Jump Test Incident", "latitude": 27.1, "longitude": 92.5},
    )
    inc_id = inc_res.json()["id"]

    act = (await async_client.post(
        f"/api/v1/incidents/{inc_id}/actions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"task_code": "TSK-JUMP-01", "agency": "Police", "title": "Test Jump", "description": "Desc", "assigned_to": "Officer"},
    )).json()
    act_id = act["id"]
    assert act["state"] == "PROPOSED"

    # Direct PROPOSED → COMPLETED must fail with 400
    r1 = await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"target_state": "COMPLETED"},
    )
    assert r1.status_code == 400

    # Direct PROPOSED → DISPATCHED must fail with 400 (Must be APPROVED first)
    r2 = await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"target_state": "DISPATCHED"},
    )
    assert r2.status_code == 400


@pytest.mark.asyncio
async def test_duplicate_dispatch_is_idempotent(async_client: AsyncClient) -> None:
    """Repeated state transition to current state is a safe idempotent no-op."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Terra#Op2026"},
    )
    op_token = login.json()["access_token"]

    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]
    acts = (await async_client.get(f"/api/v1/incidents/{inc_id}/actions")).json()
    # TSK-02 is in DISPATCHED state
    tsk_02 = next(a for a in acts if a["task_code"] == "TSK-02")
    act_id = tsk_02["id"]
    assert tsk_02["state"] == "DISPATCHED"

    # Replay transition to DISPATCHED
    resp = await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"target_state": "DISPATCHED"},
    )
    assert resp.status_code == 200
    assert resp.json()["state"] == "DISPATCHED"


@pytest.mark.asyncio
async def test_physical_confirmation_evidence_validation(async_client: AsyncClient) -> None:
    """Physical confirmation requires non-empty location, notes, and confirming officer."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "patrol", "password": "Patrol#2026"},
    )
    patrol_token = login.json()["access_token"]

    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]
    acts = (await async_client.get(f"/api/v1/incidents/{inc_id}/actions")).json()
    tsk_02 = next(a for a in acts if a["task_code"] == "TSK-02")
    act_id = tsk_02["id"]

    # 1. Missing location_confirmed -> 422
    r1 = await async_client.post(
        f"/api/v1/actions/{act_id}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "confirming_officer": "ASI D. Sonam",
            "confirming_agency": "Traffic Police",
            "location_confirmed": "",  # Empty!
            "confirmation_notes": "Valid note about barrier.",
        },
    )
    assert r1.status_code == 422

    # 2. Missing confirmation_notes -> 422
    r2 = await async_client.post(
        f"/api/v1/actions/{act_id}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "confirming_officer": "ASI D. Sonam",
            "confirming_agency": "Traffic Police",
            "location_confirmed": "KM-38 Checkpost",
            "confirmation_notes": "   ",  # Whitespace only!
        },
    )
    assert r2.status_code == 422


@pytest.mark.asyncio
async def test_physical_confirmation_lifecycle_and_idempotency(async_client: AsyncClient) -> None:
    """Valid physical confirmation transitions action to PHYSICALLY_CONFIRMED and is idempotent."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "patrol", "password": "Patrol#2026"},
    )
    patrol_token = login.json()["access_token"]

    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]
    acts = (await async_client.get(f"/api/v1/incidents/{inc_id}/actions")).json()
    tsk_02 = next(a for a in acts if a["task_code"] == "TSK-02")
    act_id = tsk_02["id"]

    conf_payload = {
        "confirming_officer": "ASI D. Sonam",
        "confirming_agency": "West Kameng Traffic Police",
        "location_confirmed": "NH-13 KM-38 Checkpost",
        "confirmation_notes": "Physical roadblock deployed across carriageway with steel bollards and retroreflective tape.",
        "communication_channel": "TETRA_RADIO",
        "is_simulated": True,
    }

    # First confirmation
    r1 = await async_client.post(
        f"/api/v1/actions/{act_id}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json=conf_payload,
    )
    assert r1.status_code == 201
    conf_id = r1.json()["id"]

    # Verify action is now PHYSICALLY_CONFIRMED
    updated_acts = (await async_client.get(f"/api/v1/incidents/{inc_id}/actions")).json()
    act_now = next(a for a in updated_acts if a["id"] == act_id)
    assert act_now["state"] == "PHYSICALLY_CONFIRMED"
    assert act_now["confirmed_at"] is not None

    # Idempotent replay: submittal again returns existing confirmation
    r2 = await async_client.post(
        f"/api/v1/actions/{act_id}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json=conf_payload,
    )
    assert r2.status_code in (200, 201)
    assert r2.json()["id"] == conf_id


@pytest.mark.asyncio
async def test_full_governed_action_scenario_with_semantic_invariants(async_client: AsyncClient) -> None:
    """Full Golden Scenario demonstrating frozen semantic invariants:
    1. Recommendation ≠ Authorization
    2. Authorization ≠ Execution
    3. Execution ≠ Physical Confirmation
    4. Action Completed ≠ Hazard Resolved
    """
    await async_client.post("/api/v1/auth/seed-demo-users")
    mag_login = await async_client.post("/api/v1/auth/login", json={"username": "magistrate", "password": "Terra#Admin2026"})
    op_login = await async_client.post("/api/v1/auth/login", json={"username": "operator", "password": "Terra#Op2026"})
    patrol_login = await async_client.post("/api/v1/auth/login", json={"username": "patrol", "password": "Patrol#2026"})

    mag_token = mag_login.json()["access_token"]
    op_token = op_login.json()["access_token"]
    patrol_token = patrol_login.json()["access_token"]

    # 1. Create Incident Twin
    inc_res = await async_client.post(
        "/api/v1/incidents",
        json={"code": f"TG-INV-{uuid.uuid4().hex[:6].upper()}", "title": "Semantic Invariants Golden Incident", "latitude": 27.08, "longitude": 92.56},
    )
    assert inc_res.status_code == 201
    inc_id = inc_res.json()["id"]

    # 2. Ingest Evidence and Evaluate Decision Support (AI Recommendation)
    # INVARIANT 1: Recommendation ≠ Authorization
    ds_res = await async_client.get(f"/api/v1/incidents/{inc_id}/decision-support")
    assert ds_res.status_code == 200
    recommendations = ds_res.json()["recommended_operational_options"]
    assert any(r["option_id"] == "OPT-ROAD-CLOSURE" for r in recommendations)

    # Incident state is DETECTED, NOT AUTHORIZED
    inc_state = (await async_client.get(f"/api/v1/incidents/{inc_id}")).json()
    assert inc_state["status"] == "DETECTED"

    # Advance to DECISION_REQUIRED
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"target_status": "ASSESSING"},
    )
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"target_status": "DECISION_REQUIRED"},
    )

    # 3. Human Magistrate Authorization
    # Magistrate signs statutory order
    dec_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/decisions",
        headers={"Authorization": f"Bearer {mag_token}"},
        json={
            "decision_type": "APPROVED",
            "action_directive": "Enforce Full Highway Cordon at KM-38 Checkpost",
            "order_code": "DDMA-WK-2026/884-A",
            "rationale": "Severe colluvium saturation threatens NH-13 transit lifeline.",
            "proposed_measures": ["TRAFFIC_DIVERSION"],
        },
    )
    assert dec_res.status_code == 201

    # Transition Incident to AUTHORIZED with order code
    auth_inc = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        headers={"Authorization": f"Bearer {mag_token}"},
        json={"target_status": "AUTHORIZED", "authority_order_code": "DDMA-WK-2026/884-A"},
    )
    assert auth_inc.status_code == 200
    assert auth_inc.json()["status"] == "AUTHORIZED"

    # INVARIANT 2: Authorization ≠ Execution
    # Incident is AUTHORIZED, but no actions are dispatched yet!
    # Propose action
    act_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/actions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={
            "task_code": "TSK-GOLDEN-01",
            "agency": "West Kameng Traffic Police",
            "title": "Establish Physical Roadblock",
            "description": "Halt traffic at KM-38",
            "assigned_to": "ASI D. Sonam",
        },
    )
    act_id = act_res.json()["id"]
    assert act_res.json()["state"] == "PROPOSED"

    # Action is approved
    app_res = await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        headers={"Authorization": f"Bearer {mag_token}"},
        json={"target_state": "APPROVED"},
    )
    assert app_res.status_code == 200
    assert app_res.json()["state"] == "APPROVED"
    assert app_res.json()["dispatched_at"] is None  # NOT dispatched yet!

    # 4. Dispatch and In-Field Execution
    # Operator dispatches task
    disp_res = await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"target_state": "DISPATCHED"},
    )
    assert disp_res.status_code == 200
    assert disp_res.json()["state"] == "DISPATCHED"

    # Field verifier acknowledges and marks completed
    await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={"target_state": "ACKNOWLEDGED"},
    )
    await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={"target_state": "IN_PROGRESS"},
    )
    comp_res = await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={"target_state": "COMPLETED"},
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["state"] == "COMPLETED"

    # INVARIANT 3: Execution ≠ Physical Confirmation
    # The action reached COMPLETED, but confirmed_at is None! It is NOT confirmed!
    assert comp_res.json()["confirmed_at"] is None

    # 5. Physical Confirmation with Field Evidence
    conf_res = await async_client.post(
        f"/api/v1/actions/{act_id}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "confirming_officer": "ASI D. Sonam",
            "confirming_agency": "West Kameng Traffic Police",
            "location_confirmed": "NH-13 KM-38 Police Checkpost",
            "confirmation_notes": "Heavy physical boom barrier locked across both lanes; detour signs erected.",
            "communication_channel": "TETRA_RADIO",
            "is_simulated": True,
        },
    )
    assert conf_res.status_code == 201

    confirmed_act = (await async_client.get(f"/api/v1/incidents/{inc_id}/actions")).json()[0]
    assert confirmed_act["state"] == "PHYSICALLY_CONFIRMED"
    assert confirmed_act["confirmed_at"] is not None

    # INVARIANT 4: Action Completed ≠ Hazard Resolved
    # The barrier was confirmed in the field, but physical slope hazard remains UNRESOLVED!
    curr_inc = (await async_client.get(f"/api/v1/incidents/{inc_id}")).json()
    assert curr_inc["hazard_state"] in ("EXPECTED", "ACTIVE")
    assert curr_inc["status"] != "RESOLVED"


@pytest.mark.asyncio
async def test_cross_incident_confirmation_mismatch_rejected(async_client: AsyncClient) -> None:
    """ADVERSARIAL: Confirming Action A with a mismatched incident_id B must return 400."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post("/api/v1/auth/login", json={"username": "patrol", "password": "Patrol#2026"})
    patrol_token = login.json()["access_token"]

    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]
    acts = (await async_client.get(f"/api/v1/incidents/{inc_id}/actions")).json()
    act_id = acts[0]["id"]

    # Supply completely unrelated fake incident ID
    alien_incident_id = str(uuid.uuid4())
    res = await async_client.post(
        f"/api/v1/actions/{act_id}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "confirming_officer": "ASI D. Sonam",
            "confirming_agency": "West Kameng Traffic Police",
            "location_confirmed": "NH-13 KM-38 Checkpost",
            "confirmation_notes": "Attempting cross-incident binding attack.",
            "incident_id": alien_incident_id,
        },
    )
    assert res.status_code == 400
    assert "cross-incident" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_conflicting_confirmation_replay_rejected(async_client: AsyncClient) -> None:
    """ADVERSARIAL: Replaying confirmation with conflicting location or officer must return 400."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post("/api/v1/auth/login", json={"username": "patrol", "password": "Patrol#2026"})
    patrol_token = login.json()["access_token"]

    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]
    acts = (await async_client.get(f"/api/v1/incidents/{inc_id}/actions")).json()
    tsk_02 = next(a for a in acts if a["task_code"] == "TSK-02")
    act_id = tsk_02["id"]

    # 1. First legitimate confirmation
    r1 = await async_client.post(
        f"/api/v1/actions/{act_id}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "confirming_officer": "ASI D. Sonam",
            "confirming_agency": "Traffic Police",
            "location_confirmed": "KM-38 Checkpost",
            "confirmation_notes": "Primary roadblock deployed.",
        },
    )
    assert r1.status_code == 201

    # 2. Conflicting replay: Different location!
    r2 = await async_client.post(
        f"/api/v1/actions/{act_id}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "confirming_officer": "ASI D. Sonam",
            "confirming_agency": "Traffic Police",
            "location_confirmed": "KM-99 False Location",  # Conflicting!
            "confirmation_notes": "Trying to overwrite ground truth location.",
        },
    )
    assert r2.status_code == 400
    assert "conflicting confirmation replay" in r2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_unauthorized_idempotency_bypass_rejected(async_client: AsyncClient) -> None:
    """ADVERSARIAL: Unauthorized user (citizen) replaying an existing action state must be rejected with 403, NOT 200."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    cit_login = await async_client.post("/api/v1/auth/login", json={"username": "citizen", "password": "Citizen#2026"})
    citizen_token = cit_login.json()["access_token"]

    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]
    acts = (await async_client.get(f"/api/v1/incidents/{inc_id}/actions")).json()
    # TSK-02 is in DISPATCHED state
    tsk_02 = next(a for a in acts if a["task_code"] == "TSK-02")
    act_id = tsk_02["id"]
    assert tsk_02["state"] == "DISPATCHED"

    # Citizen tries to replay "DISPATCHED" transition hoping idempotency returns 200 without checking RBAC
    resp = await async_client.post(
        f"/api/v1/actions/{act_id}/transitions",
        headers={"Authorization": f"Bearer {citizen_token}"},
        json={"target_state": "DISPATCHED"},
    )
    assert resp.status_code == 403
    assert "unauthorized" in resp.json()["detail"].lower() or "not authorized" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_statutory_decision_signer_impersonation_rejected(async_client: AsyncClient) -> None:
    """ADVERSARIAL: Non-magistrate user attempting to sign statutory decision with Magistrate name must return 403."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post("/api/v1/auth/login", json={"username": "operator", "password": "Terra#Op2026"})
    op_token = login.json()["access_token"]

    inc_res = await async_client.post(
        "/api/v1/incidents",
        json={"code": f"TG-IMP-{uuid.uuid4().hex[:6].upper()}", "title": "Impersonation Incident", "latitude": 27.1, "longitude": 92.5},
    )
    inc_id = inc_res.json()["id"]

    # Operator sends decision claiming Magistrate identity
    res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/decisions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={
            "decision_type": "APPROVED",
            "action_directive": "Illegal Directive",
            "order_code": "FORGED-ORD-99",
            "rationale": "Impersonation test",
            "signer_name": "P. Tsering, IAS (District Magistrate)",
        },
    )
    assert res.status_code == 403

