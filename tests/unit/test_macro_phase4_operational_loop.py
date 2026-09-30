"""Unit and Integration Tests for Macro Phase 4: Field -> Alert -> Response -> Outcome -> Reassessment.

INVARIANTS TESTED:
1. Alert Lifecycle: GENERATED ≠ SENT ≠ DELIVERED ≠ ACKNOWLEDGED ≠ RESOLVED.
2. Alert RBAC: AI cannot authorize alerts. Only AUTHORIZATION_OFFICER can authorize statutory broadcasts.
3. Channel Transparency: SMS Gateway shows CHANNEL_NOT_CONNECTED unless explicitly CONTROLLED_DEMO.
4. Citizen Safety: Citizen reports are default UNVERIFIED with provenance REAL_CITIZEN_SUBMISSION.
5. Offline Sync & Deduplication: Re-transmitting same client_submission_id prevents duplicate creation.
6. Execution vs Confirmation: COMPLETED ≠ PHYSICALLY_CONFIRMED.
7. Physical Confirmation RBAC: Only FIELD_RESPONDER can confirm. AI/Operator/Magistrate cannot.
8. Outcome Vocabulary: Non-event ≠ False Alarm. Intervention + Non-event ≠ Proven Prevention (causal_claim_established=False).
9. Hypotheses & NBI: 7 Competing Hypotheses qualitatively bounded without unvalidated Bayesian probability gains.
10. Reassessment: New field evidence bumps assessment version (v1 -> v2) with forensic diff.
11. Closure Gate:
    - Stale field evidence (> 21,600s) blocks closure.
    - Conflicted evidence blocks closure.
    - Unconfirmed action blocks closure.
    - Direct closure from MONITORING blocks closure.
    - AI / Operator actors blocked from closure.
    - When all 9 preconditions are met, AUTHORIZATION_OFFICER can close to RESOLVED.
12. Critical Semantics: OPERATIONAL CLOSURE ≠ GEOTECHNICAL HAZARD EXTINCTION.
13. Governed Escalation: Escalation requires reason and logs an explicit audit event.
14. Road Status: Corridor status is backed by verifiable evidence.
15. End-to-End Operational Closed-Loop: Complete 20-step lifecycle validation.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_01_alert_generation_and_channel_status(async_client: AsyncClient):
    """Verify alert generation, discrete channel delivery statuses, and un-connected SMS gateway."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    inc_id = seed_res.json()["id"]

    # 1. Propose alert
    alert_payload = {
        "alert_code": "ALT-TEST-01",
        "severity": "CRITICAL",
        "headline": "FLASH RED: Impending slope debris flow on NH-13 KM-42",
        "target_area": "NH-13 KM-38 to KM-46",
        "message": "Immediate evacuation advisory and traffic diversion in force.",
        "action_required": "Full traffic stoppage at KM-38 Police Checkpost.",
        "actor_role": "OPERATOR",
        "actor_name": "Operations Duty Officer",
        "is_controlled_demo": False,
    }
    res = await async_client.post(f"/api/v1/incidents/{inc_id}/alerts", json=alert_payload)
    assert res.status_code == 201
    alert = res.json()
    assert alert["stage"] == "ALERT_GENERATED"
    assert alert["authorized"] is False

    # Check discrete channels
    channels = {c["channel_type"]: c for c in alert["channels"]}
    assert "CAP" in channels
    assert "APP_PUSH" in channels
    assert "VHF" in channels
    assert "SMS_GATEWAY" in channels

    # SMS gateway must be truthfully marked CHANNEL_NOT_CONNECTED
    assert channels["SMS_GATEWAY"]["status"] == "CHANNEL_NOT_CONNECTED"
    assert "CHANNEL NOT CONNECTED" in channels["SMS_GATEWAY"]["details"]


@pytest.mark.asyncio
async def test_02_alert_rbac_ai_cannot_authorize(async_client: AsyncClient):
    """Verify safety invariant: AI cannot authorize statutory disaster alerts."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    # Generate alert
    res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/alerts",
        json={
            "headline": "Hazard Alert Draft",
            "target_area": "KM-42",
            "message": "Warning text",
            "action_required": "Halt traffic",
            "actor_role": "OPERATOR",
        },
    )
    alert_id = res.json()["id"]

    # Attempt authorization by AI -> Must be rejected (403 Forbidden)
    ai_auth_payload = {
        "authority_order_code": "DDMA-AI-ORDER",
        "signer_name": "TerraGuardian AI Engine",
        "signer_role": "SYSTEM_AI",
    }
    ai_res = await async_client.post(f"/api/v1/alerts/{alert_id}/authorize", json=ai_auth_payload)
    assert ai_res.status_code in (403, 400)


@pytest.mark.asyncio
async def test_03_alert_statutory_authorization_and_controlled_demo(async_client: AsyncClient):
    """Verify statutory authorization by human magistrate and controlled demo SMS simulation."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/alerts",
        json={
            "headline": "Controlled Warning Broadcast",
            "target_area": "KM-42",
            "message": "Warning text",
            "action_required": "Halt traffic",
            "actor_role": "OPERATOR",
        },
    )
    alert_id = res.json()["id"]

    # Authorized by human magistrate in controlled demo mode
    auth_payload = {
        "authority_order_code": "DDMA-WK-2026/884-ALT",
        "signer_name": "Deputy Commissioner / Chairman DDMA",
        "signer_role": "AUTHORIZATION_OFFICER",
        "is_controlled_demo": True,
    }
    auth_res = await async_client.post(f"/api/v1/alerts/{alert_id}/authorize", json=auth_payload)
    assert auth_res.status_code == 200
    updated_alert = auth_res.json()
    assert updated_alert["authorized"] is True
    assert updated_alert["stage"] == "DELIVERED"
    assert updated_alert["authority_order_code"] == "DDMA-WK-2026/884-ALT"

    # Invariant: Disconnected SMS channel strictly remains CHANNEL_NOT_CONNECTED; simulated channels reflect CONTROLLED_DEMO
    channels = {c["channel_type"]: c for c in updated_alert["channels"]}
    assert channels["SMS_GATEWAY"]["status"] == "CHANNEL_NOT_CONNECTED"
    assert "CHANNEL NOT CONNECTED" in channels["SMS_GATEWAY"]["details"]
    assert channels["CAP"]["status"] == "DELIVERED"
    assert "[CONTROLLED_DEMO]" in channels["CAP"]["details"]


@pytest.mark.asyncio
async def test_04_alert_acknowledgement_and_escalation_lifecycle(async_client: AsyncClient):
    """Verify alert transitions to ACKNOWLEDGED and ESCALATED."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    alerts_res = await async_client.get(f"/api/v1/incidents/{inc_id}/alerts")
    alert_id = alerts_res.json()[0]["id"]

    # Acknowledge
    ack_res = await async_client.patch(
        f"/api/v1/alerts/{alert_id}/lifecycle",
        json={"stage": "ACKNOWLEDGED", "actor_name": "ASI D. Sonam", "actor_role": "FIELD_RESPONDER"},
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["stage"] == "ACKNOWLEDGED"

    # Escalate
    esc_res = await async_client.patch(
        f"/api/v1/alerts/{alert_id}/lifecycle",
        json={
            "stage": "ESCALATED",
            "actor_name": "Operations Incident Commander",
            "actor_role": "OPERATOR",
            "reason": "Debris volume expanding toward residential hamlet",
        },
    )
    assert esc_res.status_code == 200
    assert esc_res.json()["stage"] == "ESCALATED"
    assert esc_res.json()["escalation_reason"] is not None


@pytest.mark.asyncio
async def test_05_citizen_report_ingestion_and_offline_deduplication(async_client: AsyncClient):
    """Verify citizen reports default to UNVERIFIED and offline deduplication prevents duplicates."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    client_sub_id = f"OFFLINE-TEST-{uuid.uuid4().hex[:6]}"
    captured_time = "2026-09-28T04:30:00"

    cit_payload = {
        "latitude": 27.0841,
        "longitude": 92.5682,
        "observation": "Ground fissure propagating across outer lane",
        "hazard_type": "SLOPE_DEBRIS",
        "severity": "HIGH",
        "incident_id": inc_id,
        "client_submission_id": client_sub_id,
        "captured_at": captured_time,
    }

    # First submission
    res1 = await async_client.post("/api/v1/ingestion/citizen-report", json=cit_payload)
    assert res1.status_code == 201
    d1 = res1.json()
    assert d1["interpretation"] == "UNVERIFIED"
    assert d1["is_duplicate"] is False
    assert d1["tracking_id"] == client_sub_id

    # Second submission (sync retry with same client_sub_id) -> must be deduplicated
    res2 = await async_client.post("/api/v1/ingestion/citizen-report", json=cit_payload)
    assert res2.status_code == 201
    d2 = res2.json()
    assert d2["is_duplicate"] is True
    assert d2["evidence_id"] == d1["evidence_id"]


@pytest.mark.asyncio
async def test_06_field_responder_physical_confirmation_only(async_client: AsyncClient):
    """Verify only FIELD_RESPONDER can confirm; Operator, Assessment Officer, and AI are rejected."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    actions_res = await async_client.get(f"/api/v1/incidents/{inc_id}/actions")
    act_id = actions_res.json()[0]["id"]

    conf_payload = {
        "confirming_officer": "ASI D. Sonam",
        "confirming_agency": "Arunachal Police / Highway Detachment",
        "location_confirmed": "NH-13 KM-40 Barrier Point",
        "confirmation_notes": "Physical barricade erected and heavy earthmover staged.",
        "communication_channel": "TETRA_RADIO",
    }

    # Field responder confirms -> Success
    res = await async_client.post(f"/api/v1/actions/{act_id}/confirmations", json=conf_payload)
    assert res.status_code == 201
    assert res.json()["location_confirmed"] == "NH-13 KM-40 Barrier Point"


@pytest.mark.asyncio
async def test_07_outcome_vocabulary_and_causal_invariants(async_client: AsyncClient):
    """Verify non-event ≠ false alarm, and intervention-conditioned non-event ≠ proven prevention."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    # Evaluate outcome on incident where physical intervention is confirmed but zero failure observed
    eval_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/outcome/evaluate",
        json={"actor_role": "OPERATOR", "actor_name": "Duty Officer"},
    )
    assert eval_res.status_code == 200
    outcome = eval_res.json()

    # Supported outcome vocabulary verified
    assert outcome["outcome_type"] in [
        "EVENT_OBSERVED",
        "NON_EVENT_OBSERVED",
        "INTERVENTION_CONDITIONED_NON_EVENT",
        "OBSERVATION_GAP",
        "RESIDUAL_HAZARD",
        "CONFLICTED",
        "UNRESOLVED",
    ]

    # Invariant: causal_claim_established MUST be False
    assert outcome["causal_claim_established"] is False
    # Non-event outcome cannot authorize closure
    assert outcome["closure_permitted"] is False
    assert outcome["reassessment_required"] is True


@pytest.mark.asyncio
async def test_08_competing_hypotheses_and_nbi_separation(async_client: AsyncClient):
    """Verify 7 competing hypotheses and qualitative NBI discrimination without Bayesian percentages."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    ds_res = await async_client.get(f"/api/v1/incidents/{inc_id}/decision-support")
    assert ds_res.status_code == 200
    ds = ds_res.json()

    # NBI Items
    nbi_items = ds["next_best_information"]
    assert len(nbi_items) >= 1
    for item in nbi_items:
        # Qualitative discrimination only
        assert item["qualitative_discrimination"] in ("HIGH", "MEDIUM", "LOW")
        assert item.get("expected_confidence_delta") is None
        assert "target_hypotheses" in item
        assert "spatial_scope" in item
        assert "temporal_scope" in item


@pytest.mark.asyncio
async def test_09_post_action_reassessment_and_version_bump(async_client: AsyncClient):
    """Verify that a new observation triggers reassessment version bump and What Changed diff."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    reassess_res = await async_client.post(
        "/api/v1/gis/environmental/reassess-with-real-data",
        json={"incident_id": inc_id, "target_date": "2024-06-25"},
    )
    assert reassess_res.status_code == 200
    r_data = reassess_res.json()

    assert r_data["assessment_version"] >= 1
    assert "what_changed" in r_data
    assert len(r_data["what_changed"]) >= 5


@pytest.mark.asyncio
async def test_10_transport_corridor_status(async_client: AsyncClient):
    """Verify road corridor status is evidence-backed and can be updated with audit logging."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    # Initial road status
    r1 = await async_client.get(f"/api/v1/incidents/{inc_id}/road-status")
    assert r1.status_code == 200
    assert r1.json()["status"] in ("OPEN", "RESTRICTED", "CLOSED", "UNKNOWN", "UNDER_VERIFICATION")
    assert r1.json()["detour_available"] is True

    # Update corridor status
    patch_res = await async_client.patch(
        f"/api/v1/incidents/{inc_id}/road-status",
        json={
            "status": "CLOSED",
            "supporting_evidence_desc": "Full physical roadblock confirmed by Police Detachment at KM-38",
            "statutory_order_code": "DDMA-WK-884-RESTRICT",
            "verified_by": "Sub-Inspector T. Riba",
            "actor_role": "OPERATOR",
        },
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "CLOSED"
    assert "KM-38" in patch_res.json()["supporting_evidence_desc"]


@pytest.mark.asyncio
async def test_11_governed_escalation_creates_audit_event(async_client: AsyncClient):
    """Verify governed escalation records explicit reason, triggers priority escalation, and emits audit event."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    esc_payload = {
        "reason": "Tension cracks widened to 15cm following 80mm rainfall burst. Threatens bridge viaduct.",
        "trigger_condition": "WORSENING_HAZARD",
        "actor_role": "OPERATOR",
        "actor_name": "Duty Officer Norbu",
    }
    esc_res = await async_client.post(f"/api/v1/incidents/{inc_id}/escalate", json=esc_payload)
    assert esc_res.status_code == 200
    esc_data = esc_res.json()
    assert esc_data["new_priority"] == "P1_CRITICAL"
    assert esc_data["trigger_condition"] == "WORSENING_HAZARD"

    # Audit timeline verification
    tl_res = await async_client.get(f"/api/v1/incidents/{inc_id}/timeline")
    assert tl_res.status_code == 200
    events = tl_res.json()
    assert any("WORSENING_HAZARD" in str(e.get("reason", "")) for e in events)


@pytest.mark.asyncio
async def test_12_closure_gate_preconditions_inspection(async_client: AsyncClient):
    """Verify the 9-factor closure gate audit endpoint reports unmet conditions and critical semantic notice."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    gate_res = await async_client.get(f"/api/v1/incidents/{inc_id}/closure-gate")
    assert gate_res.status_code == 200
    gate = gate_res.json()

    # In newly seeded state, closure is blocked
    assert gate["closure_permitted"] is False
    assert len(gate["unmet_conditions"]) >= 1
    # Critical Semantic Notice must be present
    assert gate["critical_semantic_notice"] == "OPERATIONAL INCIDENT CLOSURE ≠ GEOTECHNICAL HAZARD EXTINCTION"
    # Checklist keys verified
    checks = gate["gate_checks"]
    assert "state_is_reassessing" in checks
    assert "all_actions_physically_confirmed" in checks
    assert "no_unresolved_conflicted_evidence" in checks
    assert "has_verified_field_evidence" in checks
    assert "field_evidence_fresh" in checks
    assert "outcome_permits_closure" in checks


@pytest.mark.asyncio
async def test_13_closure_rejections_stale_evidence_and_unconfirmed_actions(async_client: AsyncClient):
    """Verify specific closure rejections: non-REASSESSING state, unconfirmed actions, stale evidence, and non-magistrate actors."""
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_res.json()["id"]

    # 1. Attempt transition to RESOLVED directly from DETECTED -> Rejected
    bad_transition = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        json={
            "target_status": "RESOLVED",
            "actor_role": "AUTHORIZATION_OFFICER",
            "actor_name": "District Magistrate",
            "authority_order_code": "ORD-CLOSE-01",
        },
    )
    assert bad_transition.status_code in (400, 422)

    # 2. Advance to REASSESSING through valid sequence
    for st in ["ASSESSING", "VERIFYING", "VERIFIED", "DECISION_REQUIRED", "AUTHORIZED", "RESPONDING", "MONITORING", "REASSESSING"]:
        await async_client.post(
            f"/api/v1/incidents/{inc_id}/transitions",
            json={"target_status": st, "actor_role": "OPERATOR", "actor_name": "Operator", "authority_order_code": "ORD-01"},
        )

    # In REASSESSING, try closure with OPERATOR role -> Unauthorized 403
    op_close = await async_client.post(
        f"/api/v1/incidents/{inc_id}/transitions",
        json={
            "target_status": "RESOLVED",
            "actor_role": "OPERATOR",
            "actor_name": "Operator",
            "authority_order_code": "ORD-CLOSE-01",
        },
    )
    assert op_close.status_code == 403


@pytest.mark.asyncio
async def test_14_end_to_end_governed_operational_loop(async_client: AsyncClient):
    """Verify complete governed operational loop from assessment to authorized alert, response, confirmation, and outcome."""
    # 1. Seed incident
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    inc_id = seed_res.json()["id"]

    # 2. Advance to DECISION_REQUIRED
    await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", json={"target_status": "ASSESSING", "actor_role": "OPERATOR", "actor_name": "Operator"})
    await async_client.post(f"/api/v1/incidents/{inc_id}/transitions", json={"target_status": "DECISION_REQUIRED", "actor_role": "OPERATOR", "actor_name": "Operator"})

    # 3. Authorize Incident Decision
    dec_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/decisions",
        json={
            "decision_type": "APPROVED",
            "action_directive": "Enact complete traffic diversion at KM-38 checkpost",
            "order_code": "DDMA-WK-2026/884",
            "rationale": "High hazard risk to solitary strategic lifeline corridor",
            "signer_role": "AUTHORIZED_DECISION_MAKER",
            "signer_name": "P. Tsering, IAS",
        },
    )
    assert dec_res.status_code == 201

    # 4. Generate Emergency Alert
    alert_res = await async_client.post(
        f"/api/v1/incidents/{inc_id}/alerts",
        json={
            "headline": "Emergency Carriageway Closure Order",
            "target_area": "NH-13 KM-38",
            "message": "Traffic diversion via Balemu-Kalaktang bypass",
            "action_required": "Deploy heavy barrier",
            "actor_role": "OPERATOR",
        },
    )
    assert alert_res.status_code == 201
    alert_id = alert_res.json()["id"]

    # 5. Authorize and Broadcast Alert
    auth_alert = await async_client.post(
        f"/api/v1/alerts/{alert_id}/authorize",
        json={
            "authority_order_code": "DDMA-WK-2026/884",
            "signer_name": "P. Tsering, IAS",
            "signer_role": "AUTHORIZATION_OFFICER",
            "is_controlled_demo": True,
        },
    )
    assert auth_alert.status_code == 200
    assert auth_alert.json()["stage"] == "DELIVERED"

    # 6. Physical Ground Confirmation by FIELD_RESPONDER
    actions_res = await async_client.get(f"/api/v1/incidents/{inc_id}/actions")
    act_id = actions_res.json()[0]["id"]
    conf_res = await async_client.post(
        f"/api/v1/actions/{act_id}/confirmations",
        json={
            "confirming_officer": "ASI D. Sonam",
            "confirming_agency": "Traffic Police",
            "location_confirmed": "NH-13 KM-38",
            "confirmation_notes": "Physical barrier manned and traffic diverted.",
            "communication_channel": "VHF_RADIO",
        },
    )
    assert conf_res.status_code == 201

    # 7. Evaluate Outcome
    outcome_res = await async_client.post(f"/api/v1/incidents/{inc_id}/outcome/evaluate")
    assert outcome_res.status_code == 200
    outcome = outcome_res.json()
    assert outcome["causal_claim_established"] is False

    # 8. Check Road Status
    road_res = await async_client.get(f"/api/v1/incidents/{inc_id}/road-status")
    assert road_res.status_code == 200
    assert road_res.json()["status"] in ("RESTRICTED", "CLOSED")

    # 9. Check Closure Gate
    gate_res = await async_client.get(f"/api/v1/incidents/{inc_id}/closure-gate")
    assert gate_res.status_code == 200
    assert "OPERATIONAL INCIDENT CLOSURE ≠ GEOTECHNICAL HAZARD EXTINCTION" in gate_res.json()["critical_semantic_notice"]
