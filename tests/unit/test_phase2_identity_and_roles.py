"""Phase 2 Identity & Role System Security Boundary Tests.

Verifies:
1. All 7 canonical operational roles and compatibility aliases.
2. Complete Permission Matrix integrity.
3. 7 deterministic local demo accounts seed and login with JWT and permissions payload.
4. Core Governance Invariants:
   - AI assists reasoning.
   - Rules govern critical state transitions.
   - Humans authorize critical actions.
   - Recommendation ≠ Authorization ≠ Execution ≠ Confirmation
5. Unauthenticated / invalid token requests return 401 Unauthorized.
6. Unauthorized roles attempting mutations return 403 Forbidden:
   - Operators cannot authorize statutory decisions (Recommendation ≠ Authorization).
   - Reviewers and Administrators cannot enact statutory emergency disaster orders.
   - Operators and Magistrates cannot physically confirm ground actions (Execution ≠ Confirmation).
   - Only FIELD_RESPONDER / FIELD_VERIFIER can submit physical ground confirmation evidence.
7. Server-derived identity enforcement rejects client body spoofing and privilege escalation attempts.
"""

from __future__ import annotations

import os
import uuid
import pytest
from httpx import AsyncClient

from app.domain.enums import ActionState, ActorRole, IncidentStatus
from app.domain.permissions import (
    PERMISSION_MATRIX,
    OperationalPermission,
    get_role_permissions,
    has_permission,
    normalize_role,
)
from app.services.auth_service import DEMO_USERS


def test_phase2_role_and_permission_matrix_integrity():
    """Verify all 7 roles and explicit permissions meet Phase 2 specification."""
    # 1. Verify 7 canonical roles exist in ActorRole
    assert ActorRole.CITIZEN == "CITIZEN"
    assert ActorRole.OPERATOR == "OPERATOR"
    assert ActorRole.ASSESSMENT_OFFICER == "ASSESSMENT_OFFICER"
    assert ActorRole.FIELD_RESPONDER == "FIELD_RESPONDER"
    assert ActorRole.AUTHORIZATION_OFFICER == "AUTHORIZATION_OFFICER"
    assert ActorRole.REVIEWER == "REVIEWER"
    assert ActorRole.ADMINISTRATOR == "ADMINISTRATOR"

    # 2. Check Permission Matrix covers all canonical roles
    for role in [
        ActorRole.CITIZEN,
        ActorRole.OPERATOR,
        ActorRole.ASSESSMENT_OFFICER,
        ActorRole.FIELD_RESPONDER,
        ActorRole.AUTHORIZATION_OFFICER,
        ActorRole.REVIEWER,
        ActorRole.ADMINISTRATOR,
    ]:
        assert role in PERMISSION_MATRIX

    # 3. Governance Invariant: Recommendation ≠ Authorization
    assert has_permission(ActorRole.OPERATOR, OperationalPermission.PROPOSE_ACTION) is True
    assert has_permission(ActorRole.OPERATOR, OperationalPermission.AUTHORIZE_ACTION) is False

    # 4. Governance Invariant: Execution ≠ Confirmation
    assert has_permission(ActorRole.OPERATOR, OperationalPermission.EXECUTE_ACTION) is True
    assert has_permission(ActorRole.OPERATOR, OperationalPermission.CONFIRM_PHYSICAL_COMPLETION) is False
    assert has_permission(ActorRole.FIELD_RESPONDER, OperationalPermission.CONFIRM_PHYSICAL_COMPLETION) is True

    # 5. Governance Invariant: Authorization Official does not confirm physical execution
    assert has_permission(ActorRole.AUTHORIZATION_OFFICER, OperationalPermission.AUTHORIZE_ACTION) is True
    assert has_permission(ActorRole.AUTHORIZATION_OFFICER, OperationalPermission.CONFIRM_PHYSICAL_COMPLETION) is False

    # 6. Governance Invariant: Reviewer is read/review only
    assert has_permission(ActorRole.REVIEWER, OperationalPermission.READ) is True
    assert has_permission(ActorRole.REVIEWER, OperationalPermission.REVIEW) is True
    assert has_permission(ActorRole.REVIEWER, OperationalPermission.AUTHORIZE_ACTION) is False
    assert has_permission(ActorRole.REVIEWER, OperationalPermission.EXECUTE_ACTION) is False

    # 7. Governance Invariant: Administrator does not authorize emergency orders
    assert has_permission(ActorRole.ADMINISTRATOR, OperationalPermission.ADMINISTER) is True
    assert has_permission(ActorRole.ADMINISTRATOR, OperationalPermission.AUTHORIZE_ACTION) is False
    assert has_permission(ActorRole.ADMINISTRATOR, OperationalPermission.CONFIRM_PHYSICAL_COMPLETION) is False

    # 8. Check get_role_permissions returns sorted string list
    admin_perms = get_role_permissions(ActorRole.ADMINISTRATOR)
    assert admin_perms == ["ADMINISTER", "READ", "REVIEW"]


@pytest.mark.asyncio
async def test_demo_users_seed_and_auth_tokens(test_client: AsyncClient):
    """Test all 7 demo accounts seed and login with JWT and permissions."""
    # Seed users via endpoint
    seed_res = await test_client.post("/api/v1/auth/seed-demo-users")
    assert seed_res.status_code == 200
    data = seed_res.json()
    assert isinstance(data, list)
    assert len(data) >= 7

    # Verify each demo account can authenticate
    for demo_user in DEMO_USERS:
        login_res = await test_client.post(
            "/api/v1/auth/login",
            json={
                "username": demo_user["username"],
                "password": demo_user["password"],
            },
        )
        assert login_res.status_code == 200, f"Login failed for {demo_user['username']}: {login_res.text}"
        data = login_res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        user = data["user"]
        assert user["username"] == demo_user["username"]
        assert "permissions" in user
        assert isinstance(user["permissions"], list)
        assert len(user["permissions"]) > 0


@pytest.mark.asyncio
async def test_unauthenticated_requests_return_401(test_client: AsyncClient, monkeypatch: pytest.MonkeyPatch):
    """Verify endpoints with authentication dependencies reject missing/invalid tokens with 401."""
    # Seed incident first
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    incident_id = seed_res.json()["id"]

    # 1. Invalid JWT bearer token returns 401 Unauthorized
    bad_res = await test_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer not_a_valid_jwt_token"},
    )
    assert bad_res.status_code == 401
    assert "Invalid or expired" in bad_res.json()["detail"]

    # 2. In strict/production mode, missing token returns 401 Unauthorized
    monkeypatch.setenv("TERRAGUARDIAN_ENV", "production")
    me_res = await test_client.get("/api/v1/auth/me")
    assert me_res.status_code == 401
    assert "Authentication required" in me_res.json()["detail"]

    # 3. POST /incidents/{id}/actions with invalid token -> 401
    action_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/actions",
        headers={"Authorization": "Bearer invalid_token"},
        json={
            "task_code": "TSK-UNAUTH-01",
            "agency": "SDRF",
            "title": "Unauthenticated Action",
            "description": "Should fail with 401",
            "assigned_to": "SDRF Team Lead",
        },
    )
    assert action_res.status_code == 401

    # 4. POST /incidents/{id}/decisions with invalid token -> 401
    dec_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/decisions",
        headers={"Authorization": "Bearer invalid_token"},
        json={
            "decision_type": "EVACUATION_ORDER",
            "action_directive": "Immediate evacuation",
            "order_code": "ORD-UNAUTH-01",
            "rationale": "Testing authentication guard",
        },
    )
    assert dec_res.status_code == 401

    # 5. POST /actions/{id}/confirmations with invalid token -> 401
    fake_act_id = str(uuid.uuid4())
    conf_res = await test_client.post(
        f"/api/v1/actions/{fake_act_id}/confirmations",
        headers={"Authorization": "Bearer invalid_token"},
        json={
            "confirming_officer": "Unknown",
            "confirming_agency": "Unknown",
            "location_confirmed": "Unknown",
            "confirmation_notes": "Should fail with 401",
        },
    )
    assert conf_res.status_code == 401


@pytest.mark.asyncio
async def test_operational_chain_recommendation_vs_authorization(test_client: AsyncClient):
    """Test Recommendation ≠ Authorization:
    Operator can propose and recommend actions, but CANNOT enact statutory decisions.
    """
    # 1. Seed incident and demo users
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    incident_id = seed_res.json()["id"]
    await test_client.post("/api/v1/auth/seed-demo-users")

    # 2. Login as Operator
    op_login = await test_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Terra#Op2026"},
    )
    assert op_login.status_code == 200
    op_token = op_login.json()["access_token"]
    op_headers = {"Authorization": f"Bearer {op_token}"}

    # 3. Operator generates recommended actions -> SUCCESS (201)
    rec_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/recommend-actions",
        headers=op_headers,
    )
    assert rec_res.status_code == 201
    actions = rec_res.json()
    assert len(actions) > 0

    # 4. Operator attempts to enact a statutory disaster order -> 403 FORBIDDEN
    bad_dec_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/decisions",
        headers=op_headers,
        json={
            "decision_type": "HIGHWAY_CLOSURE",
            "action_directive": "Halt traffic on NH-13",
            "order_code": "ORD-OP-ILLEGAL-01",
            "rationale": "Operator trying to enact statutory closure without magistrate authorization",
        },
    )
    assert bad_dec_res.status_code == 403
    assert "not authorized" in bad_dec_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_reviewer_and_admin_cannot_authorize_orders(test_client: AsyncClient):
    """Test Reviewer and Administrator cannot enact statutory disaster orders."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    incident_id = seed_res.json()["id"]
    await test_client.post("/api/v1/auth/seed-demo-users")

    # 1. Login as Reviewer
    rev_login = await test_client.post(
        "/api/v1/auth/login",
        json={"username": "reviewer", "password": "Terra#Review2026"},
    )
    assert rev_login.status_code == 200
    rev_token = rev_login.json()["access_token"]
    rev_headers = {"Authorization": f"Bearer {rev_token}"}

    # Reviewer attempting to enact statutory decision -> 403
    rev_dec_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/decisions",
        headers=rev_headers,
        json={
            "decision_type": "HIGHWAY_CLOSURE",
            "action_directive": "Reviewer trying to close road",
            "order_code": "ORD-REV-01",
            "rationale": "Independent reviewer lacks executive authorization",
        },
    )
    assert rev_dec_res.status_code == 403

    # 2. Login as Administrator
    admin_login = await test_client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "Terra#SuperAdmin2026"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Administrator attempting to enact statutory decision -> 403
    admin_dec_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/decisions",
        headers=admin_headers,
        json={
            "decision_type": "HIGHWAY_CLOSURE",
            "action_directive": "Admin trying to close road",
            "order_code": "ORD-ADM-01",
            "rationale": "IT admin lacks civil magistrate authority",
        },
    )
    assert admin_dec_res.status_code == 403


@pytest.mark.asyncio
async def test_execution_vs_confirmation_boundary(test_client: AsyncClient):
    """Test Execution ≠ Confirmation:
    Operator and Magistrate CANNOT physically confirm ground actions.
    Only FIELD_RESPONDER / FIELD_VERIFIER can confirm on-site physical completion.
    """
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    incident_id = seed_res.json()["id"]
    await test_client.post("/api/v1/auth/seed-demo-users")

    # Tokens
    op_res = await test_client.post("/api/v1/auth/login", json={"username": "operator", "password": "Terra#Op2026"})
    assert op_res.status_code == 200
    op_headers = {"Authorization": f"Bearer {op_res.json()['access_token']}"}

    mag_res = await test_client.post("/api/v1/auth/login", json={"username": "magistrate", "password": "Terra#Admin2026"})
    assert mag_res.status_code == 200
    mag_headers = {"Authorization": f"Bearer {mag_res.json()['access_token']}"}

    patrol_res = await test_client.post("/api/v1/auth/login", json={"username": "patrol", "password": "Patrol#2026"})
    assert patrol_res.status_code == 200
    patrol_headers = {"Authorization": f"Bearer {patrol_res.json()['access_token']}"}

    # 1. Propose action via operator
    act_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/actions",
        headers=op_headers,
        json={
            "task_code": "TSK-PH2-01",
            "agency": "BRO",
            "title": "Clear rockfall at KM-42",
            "description": "Deploy heavy excavator",
            "assigned_to": "BRO 114 RCC",
            "requires_authorization": True,
        },
    )
    assert act_res.status_code == 201
    action_id = act_res.json()["id"]

    # 2. Magistrate authorizes action
    app_res = await test_client.post(
        f"/api/v1/actions/{action_id}/transitions",
        headers=mag_headers,
        json={
            "target_state": "APPROVED",
            "authority_order_code": "DDMA-WK-2026/884-A",
            "authorization_reason": "Statutory emergency clearance approved",
        },
    )
    assert app_res.status_code == 200
    assert app_res.json()["state"] == "APPROVED"

    # 3. Operator dispatches action
    disp_res = await test_client.post(
        f"/api/v1/actions/{action_id}/transitions",
        headers=op_headers,
        json={"target_state": "DISPATCHED", "target_agency": "BRO"},
    )
    assert disp_res.status_code == 200

    # 4. Operator tries to confirm ground completion -> 403 FORBIDDEN
    op_conf = await test_client.post(
        f"/api/v1/actions/{action_id}/confirmations",
        headers=op_headers,
        json={
            "confirming_officer": "Operations Duty Officer",
            "confirming_agency": "State Disaster Operations Centre",
            "location_confirmed": "NH-13 KM-42",
            "confirmation_notes": "Operator cannot self-confirm field truth",
        },
    )
    assert op_conf.status_code == 403

    # 5. Magistrate tries to confirm ground completion -> 403 FORBIDDEN
    mag_conf = await test_client.post(
        f"/api/v1/actions/{action_id}/confirmations",
        headers=mag_headers,
        json={
            "confirming_officer": "P. Tsering, IAS (District Magistrate)",
            "confirming_agency": "District Disaster Management Authority",
            "location_confirmed": "NH-13 KM-42",
            "confirmation_notes": "Magistrate cannot self-confirm field execution",
        },
    )
    assert mag_conf.status_code == 403

    # 6. Field Patrol officer confirms ground completion -> 201 CREATED
    field_conf = await test_client.post(
        f"/api/v1/actions/{action_id}/confirmations",
        headers=patrol_headers,
        json={
            "confirming_officer": "ASI D. Sonam",
            "confirming_agency": "West Kameng Traffic Police",
            "location_confirmed": "NH-13 KM-42 Checkpost",
            "confirmation_notes": "Excavator on-site; cleared carriageway physically verified.",
            "communication_channel": "VHF_RADIO",
        },
    )
    assert field_conf.status_code == 201
    assert field_conf.json()["action_id"] == action_id


@pytest.mark.asyncio
async def test_client_body_privilege_escalation_rejected(test_client: AsyncClient):
    """Test server-derived identity rejects client body role spoofing and impersonation."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    incident_id = seed_res.json()["id"]
    await test_client.post("/api/v1/auth/seed-demo-users")

    # Login as Operator
    op_res = await test_client.post("/api/v1/auth/login", json={"username": "operator", "password": "Terra#Op2026"})
    assert op_res.status_code == 200
    op_token = op_res.json()["access_token"]
    op_headers = {"Authorization": f"Bearer {op_token}"}

    # Operator sends decision request attempting to spoof signer_role to AUTHORIZED_DECISION_MAKER
    spoof_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/decisions",
        headers=op_headers,
        json={
            "decision_type": "HIGHWAY_CLOSURE",
            "action_directive": "Spoofed closure directive",
            "order_code": "ORD-SPOOF-01",
            "rationale": "Attempting client-side role escalation",
            "signer_role": "AUTHORIZED_DECISION_MAKER",
            "signer_name": "P. Tsering, IAS",
        },
    )
    # The server detects and rejects the attempt
    assert spoof_res.status_code == 403
    assert "Privilege escalation rejected" in spoof_res.json()["detail"] or "not authorized" in spoof_res.json()["detail"].lower()
