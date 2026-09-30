"""Unit tests for Operational Copilot Engine (Signature Capability #1).

Tests:
1. Finite capability registry enforcement
2. Statutory action guardrail (block & advise)
3. Deterministic interpretation string formatting
4. Concrete grounded response extraction for all supported operational commands
"""

import pytest
from httpx import AsyncClient
from app.services.copilot_service import OperationalCopilotService, CopilotQueryRequest


@pytest.fixture
def copilot_service():
    return OperationalCopilotService()


def test_copilot_priority_reason(copilot_service):
    req = CopilotQueryRequest(query="Why is TG-2048 P1?")
    resp = copilot_service.evaluate_query(req)
    assert resp.intent == "GET_PRIORITY_REASON"
    assert resp.interpreted_as == "GET_PRIORITY_REASON(incident_code='TG-2048')"
    assert resp.is_statutory is False
    assert resp.statutory_guardrail_triggered is False
    assert "89.2" in resp.answer
    assert resp.action.target_view == "priority-queue"


def test_copilot_statutory_guardrail(copilot_service):
    req = CopilotQueryRequest(query="Authorize evacuation for TG-2048")
    resp = copilot_service.evaluate_query(req)
    assert resp.intent == "STATUTORY_GUARDRAIL_BLOCKED"
    assert resp.statutory_guardrail_triggered is True
    assert resp.is_statutory is True
    assert "STATUTORY GOVERNANCE GUARDRAIL" in resp.answer
    assert "Disaster Management Act, 2005 — Section 34" in resp.answer
    assert resp.action.target_view == "incident-twin"


def test_copilot_nbi_next_best_information(copilot_service):
    req = CopilotQueryRequest(query="Explain NBI for TG-2048")
    resp = copilot_service.evaluate_query(req)
    assert resp.intent == "GET_NBI"
    assert "Next Best Information (NBI)" in resp.answer
    # Enforce semantic purity: zero economic net benefit figures
    assert "Net Benefit of Intervention" not in resp.answer
    assert "Crore" not in resp.answer
    assert "₹" not in resp.answer
    assert "Current Critical Uncertainty" in resp.answer
    assert "Next Information to Collect" in resp.answer


def test_copilot_what_changed(copilot_service):
    req = CopilotQueryRequest(query="What changed since last assessment?")
    resp = copilot_service.evaluate_query(req)
    assert resp.intent == "GET_WHAT_CHANGED"
    assert "Version 0" in resp.answer
    assert resp.action.target_view == "incident-twin"


def test_copilot_evidence_convergence(copilot_service):
    req = CopilotQueryRequest(query="Show evidence convergence for TG-2048")
    resp = copilot_service.evaluate_query(req)
    assert resp.intent == "OPEN_EVIDENCE"
    assert resp.action.target_view == "evidence-reconciliation"
    assert len(resp.evidence_sources) >= 4
    assert "Scenario Field Evidence" in resp.answer


def test_copilot_unrecognized_command(copilot_service):
    req = CopilotQueryRequest(query="Tell me a joke about weather")
    resp = copilot_service.evaluate_query(req)
    assert resp.intent == "UNKNOWN_COMMAND"
    assert "Command not recognized" in resp.answer
    assert resp.action is None


@pytest.mark.asyncio
async def test_copilot_endpoint(async_client: AsyncClient):
    payload = {"query": "Why is TG-2048 P1?"}
    res = await async_client.post("/api/v1/copilot/query", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == "GET_PRIORITY_REASON"
    assert data["statutory_guardrail_triggered"] is False
    assert data["interpreted_as"] == "GET_PRIORITY_REASON(incident_code='TG-2048')"


@pytest.mark.asyncio
async def test_copilot_capabilities_endpoint(async_client: AsyncClient):
    res = await async_client.get("/api/v1/copilot/capabilities")
    assert res.status_code == 200
    data = res.json()
    assert data["is_read_only_advisory"] is True
    assert len(data["capabilities"]) >= 10
