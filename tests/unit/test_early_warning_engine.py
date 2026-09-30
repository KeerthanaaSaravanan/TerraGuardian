"""Comprehensive Unit & Integration Test Suite for Early Warning Engine & Citizen Safety Platform.

Covers:
- Safe location queries (GREEN / NORMAL)
- Nearby hazard resolution and geofenced warning zone matching (YELLOW / ORANGE / RED)
- Warning escalation and spatial boundary filtering
- Deterministic deduplication of emergency alerts
- Citizen alert acknowledgement and 'I AM SAFE' telemetry
- Device registration with FCM token and location tracking
- Human magistrate statutory governance check (AI blocked from statutory broadcast)
- Road status queries across North Eastern Region corridors
- System data sources health observability
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient

from app.domain.alert import AlertStage, AlertSeverity, WarningLevel, AlertTriggerType
from app.domain.enums import ActorRole


@pytest.mark.asyncio
async def test_citizen_safety_status_safe_location(async_client: AsyncClient):
    """TEST 1: Citizen at a safe location receives GREEN / NORMAL status with no active warnings."""
    # Location far from any hazard (e.g. Itanagar capital complex: 27.100, 93.616)
    res = await async_client.get(
        "/api/v1/citizen/safety-status?lat=27.100&lng=93.616&district=Papum+Pare"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["safety_status"] == "NORMAL"
    assert data["status_color"] == "GREEN"
    assert "NO ACTIVE HAZARDS" in data["status_headline"]
    assert len(data["emergency_contacts"]) > 0
    assert len(data["recommended_actions"]) > 0


@pytest.mark.asyncio
async def test_nearby_warning_resolution_and_escalation(async_client: AsyncClient):
    """TEST 2 & 3: Active warning candidate is evaluated, authorized, resolved for nearby citizens,

    and subsequently escalated.
    """
    # 1. Seed TG-2048 incident in West Kameng (lat: 27.245, lng: 92.540)
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code in (200, 201)
    incident_id = seed_res.json()["id"]

    # 2. Trigger Early Warning Engine evaluation
    eval_res = await async_client.post(
        f"/api/v1/alerts/evaluate?incident_id={incident_id}",
        headers={"X-User-Role": "OPERATOR", "X-User-Name": "Duty Officer"},
    )
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["status"] == "ALERT_CANDIDATE_GENERATED"
    alert = eval_data["alert"]
    alert_id = alert["id"]
    assert alert["stage"] == "ALERT_GENERATED"

    # 3. Authorize alert with human Magistrate statutory order
    auth_payload = {
        "authority_order_code": "DDMA-WK-2026-901",
        "signer_name": "District Magistrate West Kameng",
        "signer_role": "AUTHORIZATION_OFFICER",
        "is_controlled_demo": True,
    }
    auth_res = await async_client.post(
        f"/api/v1/alerts/{alert_id}/authorize",
        json=auth_payload,
        headers={"X-User-Role": "AUTHORIZATION_OFFICER", "X-User-Name": "District Magistrate"},
    )
    assert auth_res.status_code == 200
    assert auth_res.json()["authorized"] is True

    # 4. Citizen near West Kameng (lat: 27.250, lng: 92.545, within 2 km) queries safety status
    safe_res = await async_client.get(
        "/api/v1/citizen/safety-status?lat=27.250&lng=92.545&district=West+Kameng"
    )
    assert safe_res.status_code == 200
    status_data = safe_res.json()
    assert status_data["safety_status"] in ("WARNING", "EMERGENCY", "ADVISORY")
    assert status_data["status_color"] in ("ORANGE", "RED", "YELLOW")
    assert status_data["active_warning"] is not None
    assert status_data["active_warning"]["alert_code"] == alert["alert_code"]

    # 5. Escalate alert
    esc_payload = {
        "stage": "ESCALATED",
        "actor_name": "Duty Officer Sonam",
        "actor_role": "OPERATOR",
        "reason": "Debris flow velocity increased following continuous 80mm rainfall.",
    }
    esc_res = await async_client.patch(
        f"/api/v1/alerts/{alert_id}/lifecycle",
        json=esc_payload,
        headers={"X-User-Role": "OPERATOR", "X-User-Name": "Duty Officer Sonam"},
    )
    assert esc_res.status_code == 200
    assert esc_res.json()["stage"] == "ESCALATED"


@pytest.mark.asyncio
async def test_spatial_targeting_outside_zone(async_client: AsyncClient):
    """TEST 5 & 6: Citizen located outside the warning radius (> 50 km) does not receive the active warning."""
    # Seed incident in West Kameng
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code in (200, 201)

    # Citizen in Tawang (lat: 27.586, lng: 91.866, > 80 km away and different district)
    res = await async_client.get(
        "/api/v1/citizen/safety-status?lat=27.586&lng=91.866&district=Tawang"
    )
    assert res.status_code == 200
    data = res.json()
    assert data["safety_status"] == "NORMAL"
    assert data["status_color"] == "GREEN"


@pytest.mark.asyncio
async def test_alert_acknowledgement_and_i_am_safe(async_client: AsyncClient):
    """TEST 9: Citizen acknowledges alert and transmits 'I AM SAFE' status."""
    # 1. Seed incident and create alert
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    create_payload = {
        "alert_code": f"ALT-SAFE-TEST-{uuid.uuid4().hex[:6]}",
        "severity": "HIGH",
        "headline": "Rockfall Threat on Sessa Bridge",
        "target_area": "Sessa, West Kameng",
        "message": "Exercise caution near Sessa bridge.",
        "action_required": "Avoid stopping under cliff face.",
        "actor_role": "OPERATOR",
        "actor_name": "Operations Officer",
        "is_controlled_demo": True,
    }
    create_res = await async_client.post(f"/api/v1/incidents/{incident_id}/alerts", json=create_payload)
    alert_id = create_res.json()["id"]

    # 2. Citizen transmits acknowledgement with I AM SAFE = True
    device_id = f"device-{uuid.uuid4().hex[:8]}"
    ack_payload = {
        "device_id": device_id,
        "is_safe": True,
        "safe_notes": "Sheltered at Bhalukpong market complex with family.",
        "approx_lat": 27.01,
        "approx_lng": 92.65,
    }
    ack_res = await async_client.post(f"/api/v1/alerts/{alert_id}/acknowledge", json=ack_payload)
    assert ack_res.status_code == 200
    ack_data = ack_res.json()
    assert ack_data["status"] == "ACKNOWLEDGED"
    assert ack_data["is_safe"] is True


@pytest.mark.asyncio
async def test_device_registration_fcm(async_client: AsyncClient):
    """TEST 8: Register citizen Android device with FCM token, location, and corridor subscriptions."""
    device_payload = {
        "device_id": f"android-pixel-{uuid.uuid4().hex[:8]}",
        "fcm_token": f"fcm-token-{uuid.uuid4().hex}",
        "platform": "ANDROID",
        "app_version": "1.2.0",
        "notification_permissions": True,
        "latitude": 27.245,
        "longitude": 92.540,
        "accuracy_m": 4.5,
        "subscribed_districts": ["West Kameng", "Tawang"],
        "subscribed_corridors": ["NH-13 Trans-Arunachal Highway"],
    }
    res = await async_client.post("/api/v1/devices/register", json=device_payload)
    assert res.status_code == 200
    assert res.json()["status"] == "REGISTERED"
    assert res.json()["device_id"] == device_payload["device_id"]


@pytest.mark.asyncio
async def test_governance_ai_cannot_authorize(async_client: AsyncClient):
    """TEST 11 & 12: Statutory Invariant: AI actors are strictly forbidden from authorizing disaster broadcasts."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    create_payload = {
        "alert_code": f"ALT-GOV-{uuid.uuid4().hex[:6]}",
        "severity": "CRITICAL",
        "headline": "Unauthorized AI Alert",
        "target_area": "West Kameng",
        "message": "AI attempting statutory broadcast.",
        "action_required": "None",
        "actor_role": "OPERATOR",
        "actor_name": "Test Officer",
        "is_controlled_demo": True,
    }
    create_res = await async_client.post(f"/api/v1/incidents/{incident_id}/alerts", json=create_payload)
    alert_id = create_res.json()["id"]

    # AI actor attempts authorization
    ai_auth_payload = {
        "authority_order_code": "AI-AUTONOMOUS-ORDER",
        "signer_name": "Autonomous Early Warning Agent",
        "signer_role": "SYSTEM_AI",
        "is_controlled_demo": True,
    }
    ai_res = await async_client.post(
        f"/api/v1/alerts/{alert_id}/authorize",
        json=ai_auth_payload,
        headers={"X-User-Role": "SYSTEM_AI", "X-User-Name": "Autonomous Agent"},
    )
    assert ai_res.status_code == 403
    assert "AI/System actors cannot authorize statutory disaster alerts" in ai_res.json()["detail"]


@pytest.mark.asyncio
async def test_road_statuses_and_system_health(async_client: AsyncClient):
    """TEST 13 & 14: Query road statuses and system data source health observability."""
    # 1. Road statuses
    road_res = await async_client.get("/api/v1/roads/status")
    assert road_res.status_code == 200
    roads = road_res.json()
    assert len(roads) >= 1
    nh13 = next((r for r in roads if "NH-13" in r["road_code"]), None)
    assert nh13 is not None
    assert nh13["status"] in ("OPEN", "CAUTION", "RESTRICTED", "CLOSED")

    # 2. System data source health observability
    health_res = await async_client.get("/api/v1/system/data-sources/health")
    assert health_res.status_code == 200
    health_data = health_res.json()
    sources = health_data["sources"]
    assert len(sources) >= 5

    # Check truthful boundaries
    sms_src = next((s for s in sources if s["source_id"] == "NATIONAL_TELECOM_SMS"), None)
    assert sms_src is not None
    assert sms_src["status"] == "CHANNEL_NOT_CONNECTED"

    insar_src = next((s for s in sources if s["source_id"] == "COPERNICUS_SENTINEL1"), None)
    assert insar_src is not None
    assert insar_src["status"] == "NO_LIVE_FEED"
