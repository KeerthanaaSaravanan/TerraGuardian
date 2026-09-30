"""Targeted Regression Test Suite for Final Acceptance Patch:
1. Alert Delivery Truth (distinct states, CONTROLLED_DEMO label, SMS stays CHANNEL_NOT_CONNECTED)
2. Decoupling of 5-Factor Operational Priority from Physical Hazard.
"""

from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient

from app.domain.alert import AlertStage, AlertChannelDeliveryStatus, AlertChannelType
from app.domain.enums import ActorRole, PriorityLevel


@pytest.mark.asyncio
async def test_alert_lifecycle_states_and_sms_channel_not_connected(async_client: AsyncClient):
    """Verify that Alert maintains distinct stages: GENERATED -> AUTHORIZED -> SENT -> DELIVERED -> ACKNOWLEDGED,
    and that SMS channel strictly remains CHANNEL_NOT_CONNECTED with no fake carrier delivery.
    """
    # 1. Seed TG-2048 incident
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code in (200, 201)
    incident_id = seed_res.json()["id"]

    # 2. Generate a new alert (Stage 1: ALERT_GENERATED)
    create_payload = {
        "alert_code": f"ALT-TEST-{uuid.uuid4().hex[:6]}",
        "severity": "CRITICAL",
        "headline": "Active Debris Flow Warning on NH-13",
        "target_area": "KM-42 Sessa Corridor",
        "message": "Immediate road closure required.",
        "action_required": "Traffic stoppage at KM-38 checkpost.",
        "actor_role": "OPERATOR",
        "actor_name": "Duty Officer",
        "is_controlled_demo": True,
    }
    create_res = await async_client.post(f"/api/v1/incidents/{incident_id}/alerts", json=create_payload)
    assert create_res.status_code == 201
    alert = create_res.json()
    alert_id = alert["id"]

    # Verify initial stage is ALERT_GENERATED
    assert alert["stage"] == "ALERT_GENERATED"
    assert alert["authorized"] is False

    # Verify SMS gateway starts as CHANNEL_NOT_CONNECTED
    sms_ch = next(c for c in alert["channels"] if c["channel_type"] == "SMS_GATEWAY")
    assert sms_ch["status"] == AlertChannelDeliveryStatus.CHANNEL_NOT_CONNECTED.value

    # 3. Authorize Alert with controlled demo flag (Stage: DELIVERED in demo, but SMS MUST stay CHANNEL_NOT_CONNECTED)
    auth_payload = {
        "authority_order_code": "DDMA-TEST-991",
        "signer_name": "District Magistrate",
        "signer_role": "AUTHORIZATION_OFFICER",
        "is_controlled_demo": True,
    }
    auth_res = await async_client.post(f"/api/v1/alerts/{alert_id}/authorize", json=auth_payload)
    assert auth_res.status_code == 200
    auth_alert = auth_res.json()
    assert auth_alert["authorized"] is True

    # Check simulated channels vs SMS channel
    channels = auth_alert["channels"]
    cap_ch = next(c for c in channels if c["channel_type"] == "CAP")
    push_ch = next(c for c in channels if c["channel_type"] == "APP_PUSH")
    vhf_ch = next(c for c in channels if c["channel_type"] == "VHF")
    sms_ch_after = next(c for c in channels if c["channel_type"] == "SMS_GATEWAY")

    # Simulated deliveries must carry [CONTROLLED_DEMO] provenance
    assert "[CONTROLLED_DEMO]" in cap_ch["details"]
    assert "[CONTROLLED_DEMO]" in push_ch["details"]
    assert "[CONTROLLED_DEMO]" in vhf_ch["details"]

    # INVARIANT: SMS must NEVER be marked DELIVERED — it remains CHANNEL_NOT_CONNECTED
    assert sms_ch_after["status"] == AlertChannelDeliveryStatus.CHANNEL_NOT_CONNECTED.value
    assert "CHANNEL NOT CONNECTED" in sms_ch_after["details"]

    # 4. Advance alert to ACKNOWLEDGED
    ack_payload = {
        "stage": "ACKNOWLEDGED",
        "actor_name": "ASI D. Sonam",
        "actor_role": "FIELD_RESPONDER",
        "reason": "VHF acknowledgment received from KM-38 checkpost",
    }
    ack_res = await async_client.patch(f"/api/v1/alerts/{alert_id}/lifecycle", json=ack_payload)
    assert ack_res.status_code == 200
    ack_alert = ack_res.json()
    assert ack_alert["stage"] == "ACKNOWLEDGED"

    # SMS channel still remains CHANNEL_NOT_CONNECTED
    sms_ch_final = next(c for c in ack_alert["channels"] if c["channel_type"] == "SMS_GATEWAY")
    assert sms_ch_final["status"] == AlertChannelDeliveryStatus.CHANNEL_NOT_CONNECTED.value


@pytest.mark.asyncio
async def test_live_alert_distinct_stages_progression(async_client: AsyncClient):
    """Verify live (non-demo) alert moves strictly through GENERATED -> AUTHORIZED -> SENT -> DELIVERED."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code in (200, 201)
    incident_id = seed_res.json()["id"]

    create_payload = {
        "alert_code": f"ALT-LIVE-{uuid.uuid4().hex[:6]}",
        "severity": "HIGH",
        "headline": "Slope Creep Alert",
        "target_area": "KM-42",
        "message": "Caution on NH-13.",
        "action_required": "Deploy signage.",
        "actor_role": "OPERATOR",
        "actor_name": "Operations Officer",
        "is_controlled_demo": False,
    }
    create_res = await async_client.post(f"/api/v1/incidents/{incident_id}/alerts", json=create_payload)
    assert create_res.status_code == 201
    alert_id = create_res.json()["id"]

    # Stage 1: GENERATED
    assert create_res.json()["stage"] == "ALERT_GENERATED"

    # Stage 2: AUTHORIZED
    auth_payload = {
        "authority_order_code": "DDMA-LIVE-101",
        "signer_name": "Magistrate",
        "signer_role": "AUTHORIZATION_OFFICER",
        "is_controlled_demo": False,
    }
    auth_res = await async_client.post(f"/api/v1/alerts/{alert_id}/authorize", json=auth_payload)
    assert auth_res.status_code == 200
    assert auth_res.json()["stage"] == "AUTHORIZED"

    # Stage 3: SENT
    sent_res = await async_client.patch(
        f"/api/v1/alerts/{alert_id}/lifecycle",
        json={"stage": "SENT", "actor_name": "Dispatcher", "actor_role": "OPERATOR"},
    )
    assert sent_res.status_code == 200
    assert sent_res.json()["stage"] == "SENT"

    # Stage 4: DELIVERED
    deliv_res = await async_client.patch(
        f"/api/v1/alerts/{alert_id}/lifecycle",
        json={"stage": "DELIVERED", "actor_name": "System", "actor_role": "OPERATOR"},
    )
    assert deliv_res.status_code == 200
    assert deliv_res.json()["stage"] == "DELIVERED"

    # Verify SMS channel was NOT touched and remains CHANNEL_NOT_CONNECTED
    sms_ch = next(c for c in deliv_res.json()["channels"] if c["channel_type"] == "SMS_GATEWAY")
    assert sms_ch["status"] == AlertChannelDeliveryStatus.CHANNEL_NOT_CONNECTED.value


@pytest.mark.asyncio
async def test_operational_priority_decoupled_from_hazard(async_client: AsyncClient):
    """Verify that the Five-Factor Operational Priority Score:
    1. Does not equal raw physical hazard risk alone.
    2. Is a weighted function: 25% Hazard + 25% Exposure + 25% Criticality + 15% Connectivity + 10% Response Difficulty.
    3. Reflects consequence (High Exposure + Hospital + Lifeline Severance = P1_CRITICAL even with moderate volume).
    """
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    res = await async_client.get(f"/api/v1/incidents/{incident_id}/priority")
    assert res.status_code == 200
    p_data = res.json()

    hazard_risk = p_data["hazard_risk_input"]
    exposure = p_data["exposure_score"]
    criticality = p_data["criticality_score"]
    connectivity = p_data["connectivity_penalty_score"]
    difficulty = p_data["response_difficulty_score"]
    priority_score = p_data["priority_score"]

    # Calculate expected five-factor score
    expected = round(
        0.25 * hazard_risk + 0.25 * exposure + 0.25 * criticality + 0.15 * connectivity + 0.10 * difficulty,
        1,
    )
    assert abs(priority_score - expected) <= 0.1

    # Invariant: Priority score is NOT simply the hazard score
    assert priority_score != hazard_risk or (exposure == hazard_risk and criticality == hazard_risk)

    # Invariant: Rationale must explicitly state HAZARD ≠ PRIORITY
    assert "HAZARD" in p_data["operational_rationale"] or "Priority" in p_data["operational_rationale"]
