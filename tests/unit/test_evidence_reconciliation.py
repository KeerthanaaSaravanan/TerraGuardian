"""Unit and Integration tests for Evidence Fabric and Cross-Source Reconciliation."""

import uuid
import pytest
from httpx import AsyncClient

from app.domain.enums import ActorRole, EvidenceConflictStatus, EvidenceInterpretation, EvidenceSource


@pytest.mark.asyncio
async def test_citizen_evidence_safety_boundary(test_client: AsyncClient):
    """Invariant 1: Citizen evidence cannot enter pre-verified or bypass UNVERIFIED state."""
    # Seed incident
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    incident_id = seed_res.json()["id"]

    # Attempt to submit citizen observation marked as VERIFIED
    cit_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/evidence",
        json={
            "source": "CITIZEN",
            "source_name": "Citizen App Report #992",
            "evidence_type": "citizen_hazard_photo",
            "observation": "Fresh slope scarp near culvert",
            "metric": "Photo geo-tagged at KM-41.9",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",  # Malicious / naive attempt to enter as VERIFIED
            "processing_status": "RECONCILED",
        },
    )
    assert cit_res.status_code == 201
    cit_data = cit_res.json()
    # Server-side safety boundary enforces UNVERIFIED and RECEIVED
    assert cit_data["source"] == "CITIZEN"
    assert cit_data["interpretation"] == "UNVERIFIED"
    assert cit_data["processing_status"] == "RECEIVED"


@pytest.mark.asyncio
async def test_ai_cannot_self_verify_citizen_evidence(test_client: AsyncClient):
    """Invariant 2: Automated AI actors cannot independently verify citizen observations."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    incident_id = seed_res.json()["id"]

    # 1. Ingest citizen evidence
    add_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/evidence",
        json={
            "source": "CITIZEN",
            "source_name": "Citizen App Report #104",
            "evidence_type": "citizen_hazard_photo",
            "observation": "Road shoulder cracking",
            "metric": "Crack width 10cm",
        },
    )
    evidence_id = add_res.json()["id"]

    # 2. AI actor attempts to update interpretation to VERIFIED -> 403 Forbidden
    ai_patch_res = await test_client.patch(
        f"/api/v1/evidence/{evidence_id}",
        json={
            "actor_role": "SYSTEM_AI",
            "actor_name": "TerraGuardian Vision Classifier",
            "interpretation": "VERIFIED",
            "reason": "Computer vision classified photo with 98% confidence",
        },
    )
    assert ai_patch_res.status_code == 403
    assert "Automated AI systems cannot independently verify citizen observations" in ai_patch_res.json()["detail"]


@pytest.mark.asyncio
async def test_authorized_field_verification_of_evidence(test_client: AsyncClient):
    """Invariant 3: Field verifier can verify citizen evidence with audit trail."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    incident_id = seed_res.json()["id"]

    # 1. Ingest citizen evidence
    add_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/evidence",
        json={
            "source": "CITIZEN",
            "source_name": "Citizen App Report #105",
            "evidence_type": "citizen_hazard_photo",
            "observation": "Active mud slurry running over road",
            "metric": "Slurry depth ~1m",
        },
    )
    evidence_id = add_res.json()["id"]

    # 2. Field verifier updates to VERIFIED
    field_patch_res = await test_client.patch(
        f"/api/v1/evidence/{evidence_id}",
        json={
            "actor_role": "FIELD_VERIFIER",
            "actor_name": "SI R. Thapa (SDRF Patrol #2)",
            "interpretation": "VERIFIED",
            "processing_status": "RECONCILED",
            "conflict_status": "NONE",
            "reason": "On-site visual inspection confirmed 1.2m mud encroachment.",
        },
    )
    assert field_patch_res.status_code == 200
    updated_data = field_patch_res.json()
    assert updated_data["interpretation"] == "VERIFIED"
    assert updated_data["processing_status"] == "RECONCILED"

    # 3. Verify audit event was logged
    timeline_res = await test_client.get(f"/api/v1/incidents/{incident_id}/timeline")
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    reconciled_events = [e for e in timeline if e["event_type"] == "EVIDENCE_RECONCILED"]
    assert len(reconciled_events) >= 1


@pytest.mark.asyncio
async def test_deterministic_reconciliation_and_conflict_detection(test_client: AsyncClient):
    """Invariant 4 & 5: Reconciliation detects conflicts (Rainfall vs Cloud-Obscured Satellite) and preserves them."""
    # Seed fresh incident
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # 1. Call reconcile endpoint
    rec_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/reconcile",
        params={"actor_role": "SYSTEM_AI", "actor_name": "Reconciliation Engine"},
    )
    assert rec_res.status_code == 200
    rec_data = rec_res.json()

    assert rec_data["incident_id"] == incident_id
    assert rec_data["total_evidence_count"] == 4
    assert rec_data["conflict_status"] == "CONFLICTED"
    assert len(rec_data["conflicting_evidence_ids"]) >= 1
    assert len(rec_data["supporting_evidence_ids"]) >= 2
    assert len(rec_data["stale_evidence_ids"]) >= 1  # Historical 2023/2024 records
    assert rec_data["recommended_action"] == "FIELD_VERIFICATION_REQUIRED"
    assert rec_data["dominant_signal"] == "HIGH_PRECIPITATION_SLOPE_SATURATION"


@pytest.mark.asyncio
async def test_conflict_resolution_upon_field_ground_truth(test_client: AsyncClient):
    """Invariant 6: Ground patrol visual evidence resolves prior remote sensing conflict."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    incident_id = seed_res.json()["id"]

    # 1. Ingest verified field evidence
    field_add = await test_client.post(
        f"/api/v1/incidents/{incident_id}/evidence",
        json={
            "source": "FIELD",
            "source_name": "SDRF Quick Response Team Bravo",
            "evidence_type": "ground_photo_inspection",
            "observation": "Active debris slide with mud slurry blocking 60% carriageway",
            "metric": "Encroachment: 60% (1.2m mud depth)",
            "reliability": "HIGH",
            "interpretation": "VERIFIED",
            "processing_status": "RECONCILED",
            "confidence_contribution": 0.95,
        },
    )
    assert field_add.status_code == 201

    # 2. Reconcile evidence fabric
    rec_res = await test_client.post(f"/api/v1/incidents/{incident_id}/reconcile")
    assert rec_res.status_code == 200
    rec_data = rec_res.json()

    # Ambiguity is now resolved by ground truth
    assert rec_data["conflict_status"] == "RESOLVED"
    assert rec_data["recommended_action"] == "PROCEED_TO_CONSEQUENCE_EVALUATION"
    assert rec_data["dominant_signal"] == "CONFIRMED_SLOPE_DEBRIS_ENCROACHMENT"
    assert rec_data["confidence_contribution_aggregate"] >= 0.90


@pytest.mark.asyncio
async def test_independent_evidence_dimensions(test_client: AsyncClient):
    """Invariant 8: Source, Reliability, Verification, and Conflict are independent dimensions."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    incident_id = seed_res.json()["id"]

    # Low reliability authoritative source
    ev_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/evidence",
        json={
            "source": "AUTHORITATIVE",
            "source_name": "Outdated Geological Survey Map (1998)",
            "evidence_type": "legacy_paper_map",
            "observation": "Low historic slip index",
            "metric": "Historical Class C",
            "reliability": "LOW",  # Independent of AUTHORITATIVE source
            "interpretation": "UNVERIFIED",
            "conflict_status": "CONFLICTED",
            "confidence_contribution": 0.20,
        },
    )
    assert ev_res.status_code == 201
    data = ev_res.json()
    assert data["source"] == "AUTHORITATIVE"
    assert data["reliability"] == "LOW"
    assert data["interpretation"] == "UNVERIFIED"
    assert data["conflict_status"] == "CONFLICTED"
