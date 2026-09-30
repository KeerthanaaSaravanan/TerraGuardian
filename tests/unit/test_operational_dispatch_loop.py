"""Operational Response & Multi-Agency Dispatch Test Suite.

Verifies the frozen invariants of the TerraGuardian operational dispatch loop:
1. RECOMMENDATION ≠ AUTHORIZATION ≠ EXECUTION
2. EXECUTION ≠ PHYSICAL CONFIRMATION
3. ACTION COMPLETED ≠ HAZARD RESOLVED
4. Critical operational actions cannot be approved by ordinary operators without AUTHORIZED_DECISION_MAKER authority.
5. Full lifecycle: PROPOSED → APPROVED → DISPATCHED → ACKNOWLEDGED → IN_PROGRESS → COMPLETED → PHYSICALLY_CONFIRMED.
6. Multi-Agency Action Model: BRO, Geotechnical Field Authority, DDMA, Field Telemetry Unit.
7. Living hazard reassessment: Physical ground confirmation triggers living hazard reassessment and monotonic assessment_version increment.
"""

from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient

from app.domain.enums import ActionState, ActorRole, HazardState, IncidentStatus


async def _get_auth_token(client: AsyncClient, username: str, password: str) -> str:
    await client.post("/api/v1/auth/seed-demo-users")
    login = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
    )
    assert login.status_code == 200
    return login.json()["access_token"]


async def _create_test_p1_incident(client: AsyncClient) -> dict:
    await client.post("/api/v1/auth/seed-demo-users")
    inc_res = await client.post(
        "/api/v1/incidents",
        json={
            "code": f"TG-DISP-{uuid.uuid4().hex[:6].upper()}",
            "title": "Bhalukpong-Bomdila NH-13 Km 38 Escarpment Tension Crack",
            "description": "High consequence cut-slope failure threatening sole lifeline NH-13.",
            "latitude": 27.2000,
            "longitude": 92.4000,
            "corridor_name": "NH-13 Bhalukpong-Bomdila",
            "location_name": "NH-13 KM-38",
            "priority_level": "P1",
            "priority_score": 88.0,
            "risk_level": "HIGH",
            "risk_score": 82.0,
        },
    )
    assert inc_res.status_code == 201
    return inc_res.json()


# ── 1. P1 Creates Recommended Multi-Agency Actions ──
@pytest.mark.asyncio
async def test_01_p1_incident_generates_coordinated_actions(async_client: AsyncClient):
    """P1 incidents generate the 4 canonical coordinated multi-agency response tasks."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    rec_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/recommend-actions",
        headers={"Authorization": f"Bearer {op_token}"},
    )
    assert rec_res.status_code == 201
    actions = rec_res.json()
    assert len(actions) == 4

    task_codes = {a["task_code"] for a in actions}
    assert task_codes == {"TSK-01", "TSK-02", "TSK-03", "TSK-04"}

    tsk_01 = next(a for a in actions if a["task_code"] == "TSK-01")
    assert tsk_01["action_type"] == "TRAFFIC_CONTROL"
    assert tsk_01["priority"] == "P1"
    assert tsk_01["urgency"] == "IMMEDIATE"
    assert tsk_01["requires_authorization"] is True
    assert "Border Roads" in tsk_01["agency"]
    assert tsk_01["state"] == "PROPOSED"

    tsk_02 = next(a for a in actions if a["task_code"] == "TSK-02")
    assert tsk_02["action_type"] == "FIELD_VERIFICATION"
    assert tsk_02["priority"] == "P1"
    assert tsk_02["requires_authorization"] is True

    tsk_03 = next(a for a in actions if a["task_code"] == "TSK-03")
    assert tsk_03["action_type"] == "EVACUATION"
    assert tsk_03["requires_authorization"] is True

    tsk_04 = next(a for a in actions if a["task_code"] == "TSK-04")
    assert tsk_04["action_type"] == "MONITORING"
    assert tsk_04["requires_authorization"] is False


# ── 2. Unauthorized User Cannot Approve Critical Action ──
@pytest.mark.asyncio
async def test_02_operator_cannot_approve_critical_action(async_client: AsyncClient):
    """Operator role is rejected (403) when attempting to approve an action with requires_authorization=True."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    rec_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/recommend-actions",
        headers={"Authorization": f"Bearer {op_token}"},
    )
    tsk_01 = next(a for a in rec_res.json() if a["task_code"] == "TSK-01")

    # Operator tries to approve TSK-01 (requires_authorization=True)
    appr_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"target_state": "APPROVED", "reason": "Operator attempted approval."},
    )
    assert appr_res.status_code == 403
    assert "statutory authorization" in appr_res.json()["detail"].lower()


# ── 3. Authorized Decision Maker Can Approve ──
@pytest.mark.asyncio
async def test_03_authorized_decision_maker_can_approve(async_client: AsyncClient):
    """Magistrate (AUTHORIZED_DECISION_MAKER) can approve critical actions with order code."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    mag_token = await _get_auth_token(async_client, "magistrate", "Terra#Admin2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    rec_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/recommend-actions",
        headers={"Authorization": f"Bearer {op_token}"},
    )
    tsk_01 = next(a for a in rec_res.json() if a["task_code"] == "TSK-01")

    appr_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {mag_token}"},
        json={
            "target_state": "APPROVED",
            "authority_order_code": "ORDER-WK-2026-088",
            "authorization_reason": "Imminent slope failure threatens trans-highway safety.",
        },
    )
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["state"] == "APPROVED"
    assert appr_data["authority_order_code"] == "ORDER-WK-2026-088"
    assert appr_data["authorized_by"] is not None
    assert appr_data["authorized_at"] is not None


# ── 4 & 5. APPROVED → DISPATCHED Works and Persists Dispatch Metadata ──
@pytest.mark.asyncio
async def test_04_05_approved_to_dispatched_persists_dispatch_metadata(async_client: AsyncClient):
    """Dispatch records dispatch_reference, dispatch_channel, target_agency, and dispatched_at."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    mag_token = await _get_auth_token(async_client, "magistrate", "Terra#Admin2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    rec_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/recommend-actions",
        headers={"Authorization": f"Bearer {op_token}"},
    )
    tsk_01 = next(a for a in rec_res.json() if a["task_code"] == "TSK-01")

    await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {mag_token}"},
        json={"target_state": "APPROVED", "authority_order_code": "ORD-001"},
    )

    disp_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={
            "target_state": "DISPATCHED",
            "dispatch_reference": "DSP-BRO-2026-001",
            "dispatch_channel": "INTERNAL_DISPATCH",
            "reason": "Official dispatch to Border Roads Task Force.",
        },
    )
    assert disp_res.status_code == 200
    disp_data = disp_res.json()
    assert disp_data["state"] == "DISPATCHED"
    assert disp_data["dispatch_reference"] == "DSP-BRO-2026-001"
    assert disp_data["dispatch_channel"] == "INTERNAL_DISPATCH"
    assert disp_data["dispatch_status"] == "DISPATCHED"
    assert disp_data["dispatched_at"] is not None


# ── 6. Assigned Actor Acknowledges ──
@pytest.mark.asyncio
async def test_06_field_actor_acknowledges_dispatched_action(async_client: AsyncClient):
    """Field responder acknowledges receipt of dispatched action."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    mag_token = await _get_auth_token(async_client, "magistrate", "Terra#Admin2026")
    patrol_token = await _get_auth_token(async_client, "patrol", "Patrol#2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    rec_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/recommend-actions",
        headers={"Authorization": f"Bearer {op_token}"},
    )
    tsk_01 = next(a for a in rec_res.json() if a["task_code"] == "TSK-01")

    await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {mag_token}"},
        json={"target_state": "APPROVED", "authority_order_code": "ORD-001"},
    )
    await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"target_state": "DISPATCHED"},
    )

    ack_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "target_state": "ACKNOWLEDGED",
            "acknowledged_by": "Major V. Sharma",
            "acknowledgement_status": "ACKNOWLEDGED",
            "reason": "Task acknowledged by BRO Task Force 14.",
        },
    )
    assert ack_res.status_code == 200
    ack_data = ack_res.json()
    assert ack_data["state"] == "ACKNOWLEDGED"
    assert ack_data["acknowledged_by"] == "Major V. Sharma"
    assert ack_data["acknowledged_at"] is not None


# ── 7. Forged Acknowledgement Rejected ──
@pytest.mark.asyncio
async def test_07_citizen_acknowledgement_rejected(async_client: AsyncClient):
    """Citizen role is forbidden (403) from acknowledging or mutating operational tasks."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    mag_token = await _get_auth_token(async_client, "magistrate", "Terra#Admin2026")
    citizen_token = await _get_auth_token(async_client, "citizen", "Citizen#2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    rec_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/recommend-actions",
        headers={"Authorization": f"Bearer {op_token}"},
    )
    tsk_01 = next(a for a in rec_res.json() if a["task_code"] == "TSK-01")

    await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {mag_token}"},
        json={"target_state": "APPROVED", "authority_order_code": "ORD-001"},
    )
    await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={"target_state": "DISPATCHED"},
    )

    ack_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {citizen_token}"},
        json={"target_state": "ACKNOWLEDGED", "acknowledged_by": "Citizen Impersonator"},
    )
    assert ack_res.status_code == 403


# ── 8 & 9. ACKNOWLEDGED → IN_PROGRESS → COMPLETED Works ──
@pytest.mark.asyncio
async def test_08_09_action_execution_lifecycle(async_client: AsyncClient):
    """Action advances through IN_PROGRESS and COMPLETED recording execution details."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    mag_token = await _get_auth_token(async_client, "magistrate", "Terra#Admin2026")
    patrol_token = await _get_auth_token(async_client, "patrol", "Patrol#2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    rec_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/recommend-actions",
        headers={"Authorization": f"Bearer {op_token}"},
    )
    tsk_01 = next(a for a in rec_res.json() if a["task_code"] == "TSK-01")

    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {mag_token}"}, json={"target_state": "APPROVED", "authority_order_code": "ORD-001"})
    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {op_token}"}, json={"target_state": "DISPATCHED"})
    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {patrol_token}"}, json={"target_state": "ACKNOWLEDGED"})

    # IN_PROGRESS
    inp_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "target_state": "IN_PROGRESS",
            "execution_actor": "BRO Unit 85",
            "execution_notes": "Deploying physical jersey barriers at KM-38 checkpost.",
            "execution_location": "KM-38 Checkpost",
        },
    )
    assert inp_res.status_code == 200
    assert inp_res.json()["state"] == "IN_PROGRESS"
    assert inp_res.json()["execution_actor"] == "BRO Unit 85"

    # COMPLETED
    cmp_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "target_state": "COMPLETED",
            "execution_notes": "Both traffic lanes cordoned; commercial vehicles halted.",
        },
    )
    assert cmp_res.status_code == 200
    cmp_data = cmp_res.json()
    assert cmp_data["state"] == "COMPLETED"
    assert cmp_data["completed_at"] is not None


# ── 10. COMPLETED Does Not Imply Physical Confirmation ──
@pytest.mark.asyncio
async def test_10_completed_does_not_set_physically_confirmed(async_client: AsyncClient):
    """INVARIANT: COMPLETED ≠ PHYSICALLY_CONFIRMED. State remains COMPLETED until confirmed."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    mag_token = await _get_auth_token(async_client, "magistrate", "Terra#Admin2026")
    patrol_token = await _get_auth_token(async_client, "patrol", "Patrol#2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    rec_res = await async_client.post(f"/api/v1/incidents/{inc_id}/recommend-actions", headers={"Authorization": f"Bearer {op_token}"})
    tsk_01 = next(a for a in rec_res.json() if a["task_code"] == "TSK-01")

    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {mag_token}"}, json={"target_state": "APPROVED", "authority_order_code": "ORD-001"})
    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {op_token}"}, json={"target_state": "DISPATCHED"})
    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {patrol_token}"}, json={"target_state": "ACKNOWLEDGED"})
    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {patrol_token}"}, json={"target_state": "IN_PROGRESS"})
    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {patrol_token}"}, json={"target_state": "COMPLETED"})

    act_res = await async_client.get(f"/api/v1/incidents/{inc_id}/actions")
    current_action = next(a for a in act_res.json() if a["task_code"] == "TSK-01")
    assert current_action["state"] == "COMPLETED"
    assert current_action["confirmed_at"] is None

    # Direct jump to PHYSICALLY_CONFIRMED via /transitions is strictly forbidden
    bad_jump = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={"target_state": "PHYSICALLY_CONFIRMED"},
    )
    assert bad_jump.status_code == 400


# ── 11. Physical Confirmation Requires Required Evidence / Context ──
@pytest.mark.asyncio
async def test_11_physical_confirmation_precondition_validation(async_client: AsyncClient):
    """Submitting confirmation with empty location or notes returns 422 Unprocessable Entity."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    mag_token = await _get_auth_token(async_client, "magistrate", "Terra#Admin2026")
    patrol_token = await _get_auth_token(async_client, "patrol", "Patrol#2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    rec_res = await async_client.post(f"/api/v1/incidents/{inc_id}/recommend-actions", headers={"Authorization": f"Bearer {op_token}"})
    tsk_01 = next(a for a in rec_res.json() if a["task_code"] == "TSK-01")

    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {mag_token}"}, json={"target_state": "APPROVED", "authority_order_code": "ORD-001"})
    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {op_token}"}, json={"target_state": "DISPATCHED"})

    # Empty location
    r1 = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={"confirming_officer": "ASI Sonam", "location_confirmed": "", "confirmation_notes": "Valid note."},
    )
    assert r1.status_code == 422

    # Insufficient notes
    r2 = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={"confirming_officer": "ASI Sonam", "location_confirmed": "KM-38 Checkpost", "confirmation_notes": "ok"},
    )
    assert r2.status_code == 422


# ── 12, 13 & 14. Physical Confirmation Triggers Outcome, Reassessment, and Version Increment ──
@pytest.mark.asyncio
async def test_12_13_14_confirmation_triggers_reassessment_and_version_increment(async_client: AsyncClient):
    """Physical confirmation injects field evidence and triggers living hazard reassessment incrementing assessment_version."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    mag_token = await _get_auth_token(async_client, "magistrate", "Terra#Admin2026")
    patrol_token = await _get_auth_token(async_client, "patrol", "Patrol#2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]
    initial_version = inc["assessment_version"]

    rec_res = await async_client.post(f"/api/v1/incidents/{inc_id}/recommend-actions", headers={"Authorization": f"Bearer {op_token}"})
    tsk_01 = next(a for a in rec_res.json() if a["task_code"] == "TSK-01")

    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {mag_token}"}, json={"target_state": "APPROVED", "authority_order_code": "ORD-001"})
    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {op_token}"}, json={"target_state": "DISPATCHED"})

    # Submit valid physical confirmation
    conf_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "confirming_officer": "ASI D. Sonam",
            "confirming_agency": "West Kameng Traffic Police",
            "location_confirmed": "NH-13 KM-38 Police Checkpost",
            "confirmation_notes": "Physical roadblock barricades deployed across carriageway. Zero vehicular transit.",
            "communication_channel": "TETRA_RADIO",
        },
    )
    assert conf_res.status_code == 201

    # Check action is PHYSICALLY_CONFIRMED
    act_res = await async_client.get(f"/api/v1/incidents/{inc_id}/actions")
    confirmed_act = next(a for a in act_res.json() if a["task_code"] == "TSK-01")
    assert confirmed_act["state"] == "PHYSICALLY_CONFIRMED"
    assert confirmed_act["confirmed_at"] is not None

    # Check living incident assessment_version has incremented
    inc_after = (await async_client.get(f"/api/v1/incidents/{inc_id}")).json()
    assert inc_after["assessment_version"] > initial_version

    # Check that injected field evidence exists in the incident evidence fabric
    ev_res = await async_client.get(f"/api/v1/incidents/{inc_id}/evidence")
    assert ev_res.status_code == 200
    evidence_items = ev_res.json()
    field_item = next((e for e in evidence_items if "TSK-01" in e["observation"]), None)
    assert field_item is not None
    assert field_item["source"] == "FIELD"
    assert field_item["interpretation"] == "VERIFIED"


# ── 15. Conflicted Evidence Blocks Incident Closure ──
@pytest.mark.asyncio
async def test_15_conflicted_evidence_blocks_closure(async_client: AsyncClient):
    """Closure to RESOLVED is blocked (422) if unresolved conflicted evidence exists."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    mag_token = await _get_auth_token(async_client, "magistrate", "Terra#Admin2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    # Ingest conflicted evidence
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        headers={"Authorization": f"Bearer {op_token}"},
        json={
            "source": "FIELD",
            "source_name": "Local Informant",
            "evidence_type": "visual_sighting",
            "observation": "Road reported completely washed away.",
            "metric": "Conflict Signal",
            "reliability": "LOW",
            "interpretation": "CONFLICTED",
            "conflict_status": "CONFLICTED",
        },
    )

    # Transition through necessary states to REASSESSING:
    # DETECTED -> ASSESSING -> DECISION_REQUIRED -> AUTHORIZED -> RESPONDING -> MONITORING -> REASSESSING
    await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", headers={"Authorization": f"Bearer {op_token}"}, json={"target_status": "ASSESSING"})
    await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", headers={"Authorization": f"Bearer {op_token}"}, json={"target_status": "DECISION_REQUIRED"})
    await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", headers={"Authorization": f"Bearer {mag_token}"}, json={"target_status": "AUTHORIZED", "authority_order_code": "ORD-001"})
    await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", headers={"Authorization": f"Bearer {op_token}"}, json={"target_status": "RESPONDING"})
    await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", headers={"Authorization": f"Bearer {op_token}"}, json={"target_status": "MONITORING"})
    await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", headers={"Authorization": f"Bearer {op_token}"}, json={"target_status": "REASSESSING"})

    # Attempt to resolve incident with unresolved conflict -> must be blocked with 422
    closure_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        headers={"Authorization": f"Bearer {mag_token}"},
        json={"target_status": "RESOLVED", "authority_order_code": "ORD-CLOSURE-001"},
    )
    assert closure_res.status_code == 422
    assert "conflict" in closure_res.json()["detail"].lower()


# ── 16. Citizen Evidence Enters as UNVERIFIED ──
@pytest.mark.asyncio
async def test_16_citizen_evidence_enters_as_unverified(async_client: AsyncClient):
    """Citizen reports cannot self-authorize and must enter operational fabric as UNVERIFIED."""
    citizen_token = await _get_auth_token(async_client, "citizen", "Citizen#2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    ev_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/evidence",
        headers={"Authorization": f"Bearer {citizen_token}"},
        json={
            "source": "CITIZEN",
            "source_name": "Safe Citizen Mobile App",
            "evidence_type": "citizen_report",
            "observation": "Small stones rolling onto road near KM-38.",
            "metric": "Citizen report",
            "reliability": "LOW",
            "interpretation": "VERIFIED",  # Malicious/unauthorized attempt to self-verify!
        },
    )
    assert ev_res.status_code == 201
    ev_data = ev_res.json()
    assert ev_data["interpretation"] == "UNVERIFIED"
    assert ev_data["processing_status"] == "RECEIVED"


# ── 17. Every Critical Transition Logs Audit Event ──
@pytest.mark.asyncio
async def test_17_critical_transitions_log_audit_events(async_client: AsyncClient):
    """Action state changes and confirmations persist append-only AuditEvent records."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    mag_token = await _get_auth_token(async_client, "magistrate", "Terra#Admin2026")
    patrol_token = await _get_auth_token(async_client, "patrol", "Patrol#2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    rec_res = await async_client.post(f"/api/v1/incidents/{inc_id}/recommend-actions", headers={"Authorization": f"Bearer {op_token}"})
    tsk_01 = next(a for a in rec_res.json() if a["task_code"] == "TSK-01")

    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {mag_token}"}, json={"target_state": "APPROVED", "authority_order_code": "ORD-001"})
    await async_client.post(f"/api/v1/actions/{tsk_01['id']}/transitions", headers={"Authorization": f"Bearer {op_token}"}, json={"target_state": "DISPATCHED"})
    conf_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "confirming_officer": "ASI D. Sonam",
            "confirming_agency": "West Kameng Traffic Police",
            "location_confirmed": "KM-38 Checkpost",
            "confirmation_notes": "Ground verification complete.",
        },
    )
    assert conf_res.status_code == 201

    timeline_res = await async_client.get(f"/api/v1/incidents/{inc_id}/timeline")
    assert timeline_res.status_code == 200
    events = timeline_res.json()

    event_types = [e["event_type"] for e in events]
    assert "ACTION_DISPATCHED" in event_types
    assert "ACTION_CONFIRMED" in event_types


# ── 18. Server-Derived Actor Identity Preserved ──
@pytest.mark.asyncio
async def test_18_privilege_escalation_impersonation_rejected(async_client: AsyncClient):
    """Client cannot spoof magistrate role in payload; server validates JWT session claims."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]

    rec_res = await async_client.post(f"/api/v1/incidents/{inc_id}/recommend-actions", headers={"Authorization": f"Bearer {op_token}"})
    tsk_01 = next(a for a in rec_res.json() if a["task_code"] == "TSK-01")

    # Operator sends forged actor_role in body
    spoof_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={
            "target_state": "APPROVED",
            "actor_role": "AUTHORIZED_DECISION_MAKER",  # Spoofed
            "actor_name": "P. Tsering, IAS",            # Spoofed
        },
    )
    assert spoof_res.status_code == 403


# ── 19. Full End-to-End Operational Loop ──
@pytest.mark.asyncio
async def test_19_full_end_to_end_operational_dispatch_loop(async_client: AsyncClient):
    """PROVEN CLOSED LOOP: P1 -> PROPOSED -> APPROVED -> DISPATCHED -> ACKNOWLEDGED -> IN_PROGRESS -> COMPLETED -> PHYSICALLY_CONFIRMED -> OUTCOME -> REASSESSMENT."""
    op_token = await _get_auth_token(async_client, "operator", "Terra#Op2026")
    mag_token = await _get_auth_token(async_client, "magistrate", "Terra#Admin2026")
    patrol_token = await _get_auth_token(async_client, "patrol", "Patrol#2026")

    # Step 1: Detect P1 Incident on NH-13
    inc = await _create_test_p1_incident(async_client)
    inc_id = inc["id"]
    initial_version = inc["assessment_version"]

    # Step 2: Coordinated Action Recommendation
    rec_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/recommend-actions",
        headers={"Authorization": f"Bearer {op_token}"},
    )
    assert rec_res.status_code == 201
    actions = rec_res.json()
    tsk_01 = next(a for a in actions if a["task_code"] == "TSK-01")
    assert tsk_01["state"] == ActionState.PROPOSED.value

    # Step 3: Statutory Decision Maker Authorization (Magistrate)
    appr_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {mag_token}"},
        json={
            "target_state": ActionState.APPROVED.value,
            "authority_order_code": "DM-WK-2026-NH13-09",
            "authorization_reason": "Order issued under Section 34 of Disaster Management Act.",
        },
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["state"] == ActionState.APPROVED.value

    # Step 4: Dispatch to Executing Agency
    disp_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {op_token}"},
        json={
            "target_state": ActionState.DISPATCHED.value,
            "dispatch_reference": "DSP-NH13-001",
            "dispatch_channel": "INTERNAL_DISPATCH",
            "target_agency": "Border Roads Organisation",
        },
    )
    assert disp_res.status_code == 200
    assert disp_res.json()["state"] == ActionState.DISPATCHED.value

    # Step 5: Field Acknowledgement
    ack_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "target_state": ActionState.ACKNOWLEDGED.value,
            "acknowledged_by": "Major V. Sharma",
            "acknowledgement_status": "ACKNOWLEDGED",
        },
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["state"] == ActionState.ACKNOWLEDGED.value

    # Step 6: Field Execution (IN_PROGRESS)
    inp_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "target_state": ActionState.IN_PROGRESS.value,
            "execution_actor": "BRO Task Force 14",
            "execution_location": "NH-13 KM-38",
            "execution_notes": "Jersey barriers moved into blocking alignment.",
        },
    )
    assert inp_res.status_code == 200
    assert inp_res.json()["state"] == ActionState.IN_PROGRESS.value

    # Step 7: Execution Completed (COMPLETED != PHYSICALLY_CONFIRMED)
    cmp_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/transitions",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "target_state": ActionState.COMPLETED.value,
            "execution_notes": "Roadblock established. Civilian vehicles halted.",
        },
    )
    assert cmp_res.status_code == 200
    assert cmp_res.json()["state"] == ActionState.COMPLETED.value

    # Step 8: Physical Ground Verification (PHYSICALLY_CONFIRMED)
    conf_res = await async_client.post(
        f"/api/v1/actions/{tsk_01['id']}/confirmations",
        headers={"Authorization": f"Bearer {patrol_token}"},
        json={
            "confirming_officer": "ASI D. Sonam",
            "confirming_agency": "West Kameng Traffic Police",
            "location_confirmed": "NH-13 KM-38 Checkpost",
            "confirmation_notes": "Physical roadblock visually confirmed on ground with red retroreflective barricades.",
            "communication_channel": "TETRA_RADIO",
        },
    )
    assert conf_res.status_code == 201
    assert conf_res.json()["action_id"] == tsk_01["id"]

    # Step 9: Verify Reassessment & Living State Loop
    inc_final = (await async_client.get(f"/api/v1/incidents/{inc_id}")).json()
    assert inc_final["assessment_version"] > initial_version

    # Step 10: Verify Outcome Engine Evaluation
    out_res = await async_client.get(f"/api/v1/incidents/{inc_id}/outcome")
    assert out_res.status_code == 200
    outcome = out_res.json()
    assert outcome["intervention_state"] in ("INTERVENTION_CONFIRMED", "INTERVENTION_DISPATCHED_UNCONFIRMED")
