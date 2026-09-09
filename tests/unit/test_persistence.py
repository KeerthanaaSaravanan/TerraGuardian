"""Unit tests for Database Persistence, Evidence Fabric, Audit Logs, and TG-2048 Seeding."""

import uuid
import pytest

from app.domain.enums import (
    ActorRole,
    AuditEventType,
    ConfidenceLevel,
    EvidenceInterpretation,
    EvidenceProcessingStatus,
    EvidenceSource,
    HazardState,
    IncidentStatus,
    PriorityLevel,
    RiskLevel,
)
from app.services.audit_service import AuditService
from app.services.evidence_service import EvidenceService
from app.services.incident_service import IncidentService
from app.services.seed_service import SeedService


@pytest.mark.asyncio
async def test_tg2048_seed_and_idempotence(db_session):
    """Verify deterministic and idempotent seeding of TG-2048."""
    seed_service = SeedService(db_session)

    # 1. First seed
    incident = await seed_service.seed_tg_2048(force_reset=False)
    assert incident.code == "TG-2048"
    assert incident.title == "NH-13 KM-42 Bhalukpong-Tenga Corridor Slope Debris Flow"
    assert incident.risk_level == RiskLevel.HIGH.value
    assert incident.confidence_level == ConfidenceLevel.MODERATE.value
    assert incident.priority_level == PriorityLevel.P2_HIGH.value
    assert incident.is_primary_demo is True
    assert incident.is_simulated is True

    # 2. Verify attached evidence items
    evidence_service = EvidenceService(db_session)
    evidence_items = await evidence_service.get_evidence_for_incident(incident.id)
    assert len(evidence_items) == 4

    sources = {e.source for e in evidence_items}
    assert EvidenceSource.WEATHER.value in sources
    assert EvidenceSource.SATELLITE.value in sources
    assert EvidenceSource.TERRAIN.value in sources
    assert EvidenceSource.HISTORICAL.value in sources

    # 3. Verify audit trail
    audit_service = AuditService(db_session)
    timeline = await audit_service.get_incident_timeline(incident.id)
    assert len(timeline) >= 2
    assert timeline[0].event_type == AuditEventType.INCIDENT_CREATED.value

    # 4. Idempotence: re-running without force_reset returns existing without duplication
    reseeded = await seed_service.seed_tg_2048(force_reset=False)
    assert reseeded.id == incident.id

    evidence_after = await evidence_service.get_evidence_for_incident(incident.id)
    assert len(evidence_after) == 4


@pytest.mark.asyncio
async def test_evidence_service_add_and_audit(db_session):
    """Verify adding evidence appends to incident fabric and logs an audit event."""
    seed_service = SeedService(db_session)
    incident = await seed_service.seed_tg_2048(force_reset=False)

    evidence_service = EvidenceService(db_session)
    new_evidence = await evidence_service.add_evidence(
        incident_id=incident.id,
        source=EvidenceSource.CITIZEN,
        source_name="Citizen Safe PWA (#CZ-9021)",
        evidence_type="citizen_photo",
        observation="Active roadside slope failure with debris spilling onto carriageway.",
        metric="Optical metadata verified",
        reliability="HIGH",
        is_simulated=True,
        confidence_contribution=0.60,
        processing_status=EvidenceProcessingStatus.PROCESSED,
        interpretation=EvidenceInterpretation.UNVERIFIED,
    )
    assert new_evidence.interpretation == EvidenceInterpretation.UNVERIFIED.value

    # Total evidence is now 5
    all_evidence = await evidence_service.get_evidence_for_incident(incident.id)
    assert len(all_evidence) == 5

    # Audit log includes EVIDENCE_RECEIVED
    audit_service = AuditService(db_session)
    timeline = await audit_service.get_incident_timeline(incident.id)
    event_types = [e.event_type for e in timeline]
    assert AuditEventType.EVIDENCE_RECEIVED.value in event_types


@pytest.mark.asyncio
async def test_incident_service_queries(db_session):
    """Verify IncidentService get_by_id, get_by_code, and list_incidents."""
    seed_service = SeedService(db_session)
    seeded = await seed_service.seed_tg_2048(force_reset=False)

    incident_service = IncidentService(db_session)

    by_id = await incident_service.get_by_id(seeded.id)
    assert by_id.code == "TG-2048"

    by_code = await incident_service.get_by_code("TG-2048")
    assert by_code is not None
    assert by_code.id == seeded.id

    items, total = await incident_service.list_incidents(page=1, page_size=10)
    assert total >= 1
    assert any(i.code == "TG-2048" for i in items)
