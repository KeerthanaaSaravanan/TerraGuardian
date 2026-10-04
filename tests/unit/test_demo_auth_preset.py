from __future__ import annotations

import pytest
from httpx import AsyncClient
from pydantic import SecretStr

from app.config import settings
from app.db.models import UserModel
from app.services.auth_service import DEMO_PRESET_ACCOUNTS, hash_password


TEST_DEMO_PASSWORDS = {
    "demo_operator_password": "test-only-operator-password",
    "demo_assessment_password": "test-only-assessment-password",
    "demo_patrol_password": "test-only-patrol-password",
    "demo_magistrate_password": "test-only-magistrate-password",
    "demo_reviewer_password": "test-only-reviewer-password",
}


def enable_production_demo_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "demo_auth_enabled", True)
    for setting_name, password in TEST_DEMO_PASSWORDS.items():
        monkeypatch.setattr(settings, setting_name, SecretStr(password))


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("account_id", "expected_role"),
    [
        ("operator", "OPERATOR"),
        ("assessment", "ASSESSMENT_OFFICER"),
        ("patrol", "FIELD_RESPONDER"),
        ("magistrate", "AUTHORIZATION_OFFICER"),
        ("reviewer", "REVIEWER"),
    ],
)
async def test_demo_preset_issues_server_verified_role_token(
    async_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    account_id: str,
    expected_role: str,
) -> None:
    enable_production_demo_auth(monkeypatch)

    response = await async_client.post(
        "/api/v1/auth/demo-login",
        json={"account": account_id},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["role"] == expected_role
    assert body["token_type"] == "bearer"
    profile = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert profile.status_code == 200
    assert profile.json()["role"] == expected_role


@pytest.mark.asyncio
async def test_demo_preset_is_disabled_in_production_by_default(
    async_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "demo_auth_enabled", False)

    response = await async_client.post(
        "/api/v1/auth/demo-login",
        json={"account": "operator"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_demo_preset_rejects_roles_outside_the_allowlist(
    async_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    enable_production_demo_auth(monkeypatch)

    response = await async_client.post(
        "/api/v1/auth/demo-login",
        json={"account": "admin"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_normal_login_for_enabled_demo_user_still_checks_password(
    async_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    enable_production_demo_auth(monkeypatch)
    await async_client.post("/api/v1/auth/demo-login", json={"account": "operator"})

    rejected = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "incorrect-test-password"},
    )
    assert rejected.status_code == 401

    accepted = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": TEST_DEMO_PASSWORDS["demo_operator_password"]},
    )
    assert accepted.status_code == 200
    assert accepted.json()["user"]["role"] == "OPERATOR"


@pytest.mark.asyncio
async def test_normal_login_does_not_allow_other_demo_identities_in_production(
    async_client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    enable_production_demo_auth(monkeypatch)

    response = await async_client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "incorrect-test-password"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_preset_does_not_reassign_a_database_user_to_the_preset_role(
    async_client: AsyncClient,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    enable_production_demo_auth(monkeypatch)
    db_session.add(
        UserModel(
            username="operator",
            email="operator@terraguardian.gov.in",
            password_hash=hash_password("existing-test-password"),
            full_name="Existing Account",
            role="AUTHORIZATION_OFFICER",
            is_active=True,
        )
    )
    await db_session.commit()

    response = await async_client.post(
        "/api/v1/auth/demo-login",
        json={"account": "operator"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_normal_login_rejects_a_demo_user_with_a_mismatched_database_role(
    async_client: AsyncClient,
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    enable_production_demo_auth(monkeypatch)
    db_session.add(
        UserModel(
            username="operator",
            email="operator@terraguardian.gov.in",
            password_hash=hash_password(TEST_DEMO_PASSWORDS["demo_operator_password"]),
            full_name="Existing Account",
            role="AUTHORIZATION_OFFICER",
            is_active=True,
        )
    )
    await db_session.commit()

    response = await async_client.post(
        "/api/v1/auth/login",
        json={
            "username": "operator",
            "password": TEST_DEMO_PASSWORDS["demo_operator_password"],
        },
    )
    assert response.status_code == 401


def test_preset_configuration_has_only_the_five_approved_roles() -> None:
    assert {account["role"] for account in DEMO_PRESET_ACCOUNTS.values()} == {
        "OPERATOR",
        "ASSESSMENT_OFFICER",
        "FIELD_RESPONDER",
        "AUTHORIZATION_OFFICER",
        "REVIEWER",
    }
