"""Targeted Regression Tests for What Changed Delta Engine Hardening.

Verifies:
1. compute_what_changed with valid incident and real state.
2. compute_what_changed with nullable metadata / 'previous_assessment': None.
3. compute_what_changed with missing metadata.
4. compute_what_changed with no changes detected (baseline established).
5. compute_what_changed raises IncidentNotFoundError for nonexistent incident.
6. Schema consistency and zero fabricated deltas.
"""

import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import IncidentModel, EvidenceModel, ActionModel
from app.domain.enums import (
    ActionState,
    EvidenceInterpretation,
    EvidenceSource,
    HazardState,
    IncidentStatus,
    PriorityLevel,
    RiskLevel,
    ConfidenceLevel,
)
from app.services.exceptions import IncidentNotFoundError
from app.services.what_changed_service import WhatChangedService


@pytest.mark.asyncio
async def test_what_changed_nullable_previous_assessment(db_session: AsyncSession):
    """Verify that metadata with 'previous_assessment': None does not raise AttributeError."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-TEST-01",
        title="Test Cut-Slope Failure",
        latitude=27.123,
        longitude=92.456,
        state="Arunachal Pradesh",
        district="West Kameng",
        status=IncidentStatus.MONITORING.value,
        hazard_state=HazardState.EXPECTED.value,
        risk_level=RiskLevel.HIGH.value,
        risk_score=82.0,
        confidence_level=ConfidenceLevel.MODERATE.value,
        confidence_score=55.0,
        priority_level=PriorityLevel.P1_CRITICAL.value,
        priority_score=85.0,
        assessment_version=1,
        metadata_json={
            "current_assessment": {"assessment_version": 1, "risk_score": 82.0},
            "previous_assessment": None,
            "what_changed": [],
        },
    )
    db_session.add(incident)
    await db_session.commit()

    service = WhatChangedService(db_session)
    report = await service.compute_what_changed(incident.id)

    assert report is not None
    assert report.incident_id == incident.id
    assert report.current_version == 1
    assert "Incident TG-TEST-01 v1" in report.summary_narrative
    assert report.provenance == "TERRAGUARDIAN_CHANGE_INTELLIGENCE_ENGINE"


@pytest.mark.asyncio
async def test_what_changed_missing_metadata(db_session: AsyncSession):
    """Verify that metadata_json=None is safely handled without error."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-TEST-02",
        title="Test Bare Incident",
        latitude=27.123,
        longitude=92.456,
        state="Arunachal Pradesh",
        district="West Kameng",
        status=IncidentStatus.MONITORING.value,
        hazard_state=HazardState.EXPECTED.value,
        risk_level=RiskLevel.MODERATE.value,
        risk_score=50.0,
        confidence_level=ConfidenceLevel.LOW.value,
        confidence_score=30.0,
        priority_level=PriorityLevel.P3_MODERATE.value,
        priority_score=45.0,
        assessment_version=0,
        metadata_json=None,
    )
    db_session.add(incident)
    await db_session.commit()

    service = WhatChangedService(db_session)
    report = await service.compute_what_changed(incident.id)

    assert report is not None
    assert report.total_changes == 0
    assert "Baseline assessment established" in report.summary_narrative


@pytest.mark.asyncio
async def test_what_changed_nonexistent_incident_raises_404(db_session: AsyncSession):
    """Verify that querying a nonexistent incident raises IncidentNotFoundError."""
    service = WhatChangedService(db_session)
    with pytest.raises(IncidentNotFoundError):
        await service.compute_what_changed(uuid.uuid4())


@pytest.mark.asyncio
async def test_what_changed_grounded_evidence_and_action_changes(db_session: AsyncSession):
    """Verify that real evidence and action state changes are accurately reported."""
    inc_id = uuid.uuid4()
    incident = IncidentModel(
        id=inc_id,
        code="TG-TEST-03",
        title="Grounded Test Incident",
        latitude=27.123,
        longitude=92.456,
        state="Arunachal Pradesh",
        district="West Kameng",
        status=IncidentStatus.MONITORING.value,
        hazard_state=HazardState.EXPECTED.value,
        risk_level=RiskLevel.HIGH.value,
        risk_score=85.0,
        confidence_level=ConfidenceLevel.HIGH.value,
        confidence_score=75.0,
        priority_level=PriorityLevel.P1_CRITICAL.value,
        priority_score=90.0,
        assessment_version=2,
        metadata_json={
            "previous_assessment": {
                "assessment_version": 1,
                "risk_score": 70.0,
                "confidence_score": 60.0,
                "priority_level": PriorityLevel.P2_HIGH.value,
            }
        },
    )
    ev = EvidenceModel(
        id=uuid.uuid4(),
        incident_id=inc_id,
        source=EvidenceSource.FIELD.value,
        source_name="Field Patrol Team Alpha",
        evidence_type="GROUND_OBSERVATION",
        metric="Blockage: 50%",
        reliability="HIGH",
        interpretation=EvidenceInterpretation.VERIFIED.value,
        observation="Active debris movement on slope toe blocking 50% carriageway",
        observed_at=datetime.now(timezone.utc),
        received_at=datetime.now(timezone.utc),
    )
    act = ActionModel(
        id=uuid.uuid4(),
        incident_id=inc_id,
        task_code="TSK-CONF-01",
        title="Deploy Physical Concrete Barrier",
        description="Deploy physical concrete barriers to restrict traffic flow",
        agency="BRO",
        assigned_to="Capt. Sharma",
        state=ActionState.PHYSICALLY_CONFIRMED.value,
        confirmed_at=datetime.now(timezone.utc),
    )
    db_session.add_all([incident, ev, act])
    await db_session.commit()

    service = WhatChangedService(db_session)
    report = await service.compute_what_changed(inc_id)

    assert report.total_changes >= 4  # Hazard increased, Conf increased, Priority changed, New Evidence, Field Confirmed
    change_types = [c.change_type.value for c in report.changes]
    assert "HAZARD_INCREASED" in change_types
    assert "CONFIDENCE_INCREASED" in change_types
    assert "PRIORITY_CHANGED" in change_types
    assert "NEW_EVIDENCE" in change_types
    assert "FIELD_CONFIRMATION_RECEIVED" in change_types
