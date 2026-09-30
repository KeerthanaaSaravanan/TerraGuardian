"""Operational Copilot Router.

Exposes endpoints for the commander operational copilot.
"""

from fastapi import APIRouter
from app.services.copilot_service import (
    CopilotQueryRequest,
    CopilotQueryResponse,
    OperationalCopilotService,
    SUPPORTED_CAPABILITIES,
)

router = APIRouter(prefix="/copilot", tags=["copilot"])
copilot_service = OperationalCopilotService()


@router.post("/query", response_model=CopilotQueryResponse)
async def query_copilot(req: CopilotQueryRequest):
    """Authoritative dialogue and operational command endpoint."""
    return copilot_service.evaluate_query(req)


@router.get("/capabilities")
async def get_capabilities():
    """Returns finite list of supported commander commands."""
    return {
        "registry_version": "1.0.0",
        "description": "Authoritative Operational Intel & Command Registry",
        "is_read_only_advisory": True,
        "statutory_guardrail": "Active — Statutory Governance Guardrail (Disaster Management Act, 2005 — Section 34)",
        "capabilities": SUPPORTED_CAPABILITIES,
    }
