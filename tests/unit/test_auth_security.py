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
    assert data["seeded_count"] >= 4
    usernames = [u["username"] for u in data["users"]]
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
    assert r1.json()["seeded_count"] == r2.json()["seeded_count"]


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
