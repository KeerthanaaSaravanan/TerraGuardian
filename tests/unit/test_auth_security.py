"""Auth Security Tests — P0-A and P0-B verification.

Tests:
  1. Login success returns bearer token and sanitized profile
  2. Login failure with wrong password returns 401
  3. Login failure with unknown username returns 401
  4. /auth/me with valid token returns server-derived identity
  5. /auth/me without token returns 401 in non-test env (mocked)
  6. Public citizen role is blocked from operator-protected endpoint
  7. Operator role is permitted on operator-protected endpoint
  8. Demo user seeding is idempotent
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_seed_demo_users(async_client: AsyncClient) -> None:
    """POST /api/v1/auth/seed-demo-users should create demo users idempotently."""
    response = await async_client.post("/api/v1/auth/seed-demo-users")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 4
    usernames = [u["username"] for u in data]
    assert "citizen" in usernames
    assert "operator" in usernames
    assert "patrol" in usernames
    assert "magistrate" in usernames


@pytest.mark.asyncio
async def test_seed_demo_users_idempotent(async_client: AsyncClient) -> None:
    """Calling seed twice should not error or double-create users."""
    r1 = await async_client.post("/api/v1/auth/seed-demo-users")
    r2 = await async_client.post("/api/v1/auth/seed-demo-users")
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert len(r1.json()) == len(r2.json())


@pytest.mark.asyncio
async def test_login_success_operator(async_client: AsyncClient) -> None:
    """Operator credentials should return a valid bearer token."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Terra#Op2026"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "operator"
    assert data["user"]["role"] == "OPERATOR"
    assert "password_hash" not in data["user"]


@pytest.mark.asyncio
async def test_login_success_magistrate(async_client: AsyncClient) -> None:
    """Magistrate credentials should return AUTHORIZED_DECISION_MAKER role in token."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "magistrate", "password": "Terra#Admin2026"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "AUTHORIZED_DECISION_MAKER"


@pytest.mark.asyncio
async def test_login_wrong_password(async_client: AsyncClient) -> None:
    """Wrong password must return 401 Unauthorized."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "wrongpassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_user(async_client: AsyncClient) -> None:
    """Unknown username must return 401 Unauthorized."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "ghost_user_xyz", "password": "whatever"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_with_valid_token(async_client: AsyncClient) -> None:
    """GET /auth/me with a valid bearer token should return server-verified identity."""
    await async_client.post("/api/v1/auth/seed-demo-users")
    login = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "patrol", "password": "Patrol#2026"},
    )
    token = login.json()["access_token"]

    me = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me.status_code == 200
    data = me.json()
    assert data["username"] == "patrol"
    assert data["role"] == "FIELD_VERIFIER"


@pytest.mark.asyncio
async def test_auth_me_with_invalid_token(async_client: AsyncClient) -> None:
    """GET /auth/me with a tampered token must return 401."""
    me = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer tampered.token.value"},
    )
    assert me.status_code == 401


@pytest.mark.asyncio
async def test_privilege_escalation_operator_claiming_magistrate_rejected(async_client: AsyncClient) -> None:
    """CRITICAL SECURITY TEST: Operator token claiming AUTHORIZED_DECISION_MAKER role must be rejected with 403."""
    await async_client.post("/api/v1/auth/seed-demo-users")

    # 1. Log in as operator
    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Terra#Op2026"},
    )
    assert login_resp.status_code == 200
    operator_token = login_resp.json()["access_token"]

    # 2. Create an incident
    inc_resp = await async_client.post(
        "/api/v1/incidents",
        json={
            "code": "TG-SEC-01",
            "title": "Privilege Escalation Test Incident",
            "latitude": 27.2,
            "longitude": 92.4,
        },
    )
    assert inc_resp.status_code == 201
    inc_id = inc_resp.json()["id"]

    # 3. Transition to ASSESSING first (valid)
    t1 = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        headers={"Authorization": f"Bearer {operator_token}"},
        json={"target_status": "ASSESSING"},
    )
    assert t1.status_code == 200

    # 4. Attempt privilege escalation: Operator token sends body claiming AUTHORIZED_DECISION_MAKER
    escalation_resp = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        headers={"Authorization": f"Bearer {operator_token}"},
        json={
            "target_status": "AUTHORIZED",
            "actor_role": "AUTHORIZED_DECISION_MAKER",  # Forged claimed role!
            "authority_order_code": "FORGED-ORD-01",
        },
    )
    assert escalation_resp.status_code == 403
    detail = escalation_resp.json()["detail"]
    assert "Privilege escalation rejected" in detail or "not authorized" in detail


@pytest.mark.asyncio
async def test_identity_spoofing_operator_claiming_magistrate_name_rejected(async_client: AsyncClient) -> None:
    """CRITICAL SECURITY TEST: Operator claiming official Magistrate title in actor_name must be rejected with 403."""
    await async_client.post("/api/v1/auth/seed-demo-users")

    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Terra#Op2026"},
    )
    operator_token = login_resp.json()["access_token"]

    inc_resp = await async_client.post(
        "/api/v1/incidents",
        json={"code": "TG-SEC-02", "title": "Impersonation Test", "latitude": 27.2, "longitude": 92.4},
    )
    inc_id = inc_resp.json()["id"]

    # Attempt to spoof Magistrate name
    spoof_resp = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        headers={"Authorization": f"Bearer {operator_token}"},
        json={
            "target_status": "ASSESSING",
            "actor_name": "P. Tsering, IAS (District Magistrate)",  # Spoofed authority name!
        },
    )
    assert spoof_resp.status_code == 403
    assert "impersonation rejected" in spoof_resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_legitimate_magistrate_transition_succeeds(async_client: AsyncClient) -> None:
    """Legitimate AUTHORIZED_DECISION_MAKER token succeeds on statutory authorization."""
    await async_client.post("/api/v1/auth/seed-demo-users")

    # 1. Log in as magistrate
    login_resp = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "magistrate", "password": "Terra#Admin2026"},
    )
    assert login_resp.status_code == 200
    magistrate_token = login_resp.json()["access_token"]

    inc_resp = await async_client.post(
        "/api/v1/incidents",
        json={"code": "TG-SEC-03", "title": "Magistrate Auth Test", "latitude": 27.2, "longitude": 92.4},
    )
    inc_id = inc_resp.json()["id"]

    # Drive to ASSESSING -> DECISION_REQUIRED
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        headers={"Authorization": f"Bearer {magistrate_token}"},
        json={"target_status": "ASSESSING"},
    )
    await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        headers={"Authorization": f"Bearer {magistrate_token}"},
        json={"target_status": "DECISION_REQUIRED"},
    )

    # Statutory authorization with order code
    auth_resp = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        headers={"Authorization": f"Bearer {magistrate_token}"},
        json={
            "target_status": "AUTHORIZED",
            "authority_order_code": "DDMA-WK-2026/884-A",
        },
    )
    assert auth_resp.status_code == 200
    assert auth_resp.json()["status"] == "AUTHORIZED"


@pytest.mark.asyncio
async def test_malformed_role_rejected(async_client: AsyncClient) -> None:
    """Malformed role string in transition payload must be rejected with 422 Unprocessable Entity."""
    inc_resp = await async_client.post(
        "/api/v1/incidents",
        json={"code": "TG-SEC-04", "title": "Malformed Role Test", "latitude": 27.2, "longitude": 92.4},
    )
    inc_id = inc_resp.json()["id"]

    resp = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        json={"target_status": "ASSESSING", "actor_role": "SUPER_ADMIN_HACKER_ROLE"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected_outside_test_environment(async_client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    """REGRESSION TEST (Section 17): In non-test environment (e.g. production), missing token is strictly rejected with 401."""
    import os
    from app.config import settings

    # Simulate production environment
    monkeypatch.setenv("TERRAGUARDIAN_ENV", "production")
    monkeypatch.setattr(settings, "environment", "production")

    # Attempting to call an authenticated endpoint without Authorization header must return 401
    resp = await async_client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert "authentication required" in resp.json()["detail"].lower()

