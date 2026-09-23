"""Unit tests for Server-Side State Machine and Authority Boundaries."""

import uuid
import pytest

from datetime import datetime, timezone
from app.db.models import EvidenceModel, IncidentModel, OutcomeModel
from app.domain.enums import (
    ActorRole,
    ConfidenceLevel,
    EvidenceInterpretation,
    EvidenceSource,
    HazardState,
    IncidentStatus,
    PriorityLevel,
    RiskLevel,
)
from app.services.exceptions import (
    InvalidTransitionError,
    PreconditionFailedError,
    UnauthorizedAuthorityError,
)
from app.services.state_transition_service import StateTransitionService


@pytest.mark.asyncio
async def test_state_machine_valid_progression(db_session):
    """Test full canonical progression from DETECTED through to REVIEWED."""
    # Setup test incident in DETECTED
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-TEST-01",
        title="Test Incident",
        status=IncidentStatus.DETECTED.value,
        hazard_state=HazardState.EXPECTED.value,
        risk_level=RiskLevel.HIGH.value,
        risk_score=80.0,
        confidence_level=ConfidenceLevel.MODERATE.value,
        confidence_score=50.0,
        priority_level=PriorityLevel.P2_HIGH.value,
        priority_score=70.0,
        latitude=27.0,
        longitude=92.0,
    )
    db_session.add(incident)
    await db_session.flush()

    service = StateTransitionService(db_session)

    # 1. DETECTED -> ASSESSING
    updated = await service.transition(
        incident_id=incident.id,
        target_status=IncidentStatus.ASSESSING,
        actor_role=ActorRole.SYSTEM_AI,
        actor_name="Early Warning Engine",
    )
    assert updated.status == IncidentStatus.ASSESSING.value

    # 2. ASSESSING -> VERIFYING
    updated = await service.transition(
        incident_id=incident.id,
        target_status=IncidentStatus.VERIFYING,
        actor_role=ActorRole.OPERATOR,
        actor_name="Duty Officer",
    )
    assert updated.status == IncidentStatus.VERIFYING.value

    # 3. VERIFYING -> VERIFIED
    updated = await service.transition(
        incident_id=incident.id,
        target_status=IncidentStatus.VERIFIED,
        actor_role=ActorRole.FIELD_VERIFIER,
        actor_name="SI R. Thapa (SDRF)",
    )
    assert updated.status == IncidentStatus.VERIFIED.value

    # 4. VERIFIED -> DECISION_REQUIRED
    updated = await service.transition(
        incident_id=incident.id,
        target_status=IncidentStatus.DECISION_REQUIRED,
        actor_role=ActorRole.SYSTEM_AI,
        actor_name="Impact Synthesizer",
    )
    assert updated.status == IncidentStatus.DECISION_REQUIRED.value

    # 5. DECISION_REQUIRED -> AUTHORIZED (Human Authority Boundary)
    updated = await service.transition(
        incident_id=incident.id,
        target_status=IncidentStatus.AUTHORIZED,
        actor_role=ActorRole.AUTHORIZED_DECISION_MAKER,
        actor_name="P. Tsering, IAS (District Magistrate)",
        authority_order_code="DDMA-WK-884",
    )
    assert updated.status == IncidentStatus.AUTHORIZED.value

    # 6. AUTHORIZED -> RESPONDING
    updated = await service.transition(
        incident_id=incident.id,
        target_status=IncidentStatus.RESPONDING,
        actor_role=ActorRole.OPERATOR,
        actor_name="Dispatch Coordinator",
    )
    assert updated.status == IncidentStatus.RESPONDING.value

    # 7. RESPONDING -> MONITORING
    updated = await service.transition(
        incident_id=incident.id,
        target_status=IncidentStatus.MONITORING,
        actor_role=ActorRole.FIELD_VERIFIER,
        actor_name="ASI D. Sonam (Traffic Police)",
        reason="Physical barrier at KM-38 confirmed.",
    )
    assert updated.status == IncidentStatus.MONITORING.value

    # 8. MONITORING -> REASSESSING
    updated = await service.transition(
        incident_id=incident.id,
        target_status=IncidentStatus.REASSESSING,
        actor_role=ActorRole.SYSTEM_AI,
        actor_name="Divergence Watchdog",
        reason="Rainfall ceased; slope saturation declining.",
    )
    assert updated.status == IncidentStatus.REASSESSING.value

    # Satisfy Prompt 05 Evidentiary Closure Preconditions
    now = datetime.now(timezone.utc)
    ev = EvidenceModel(
        id=uuid.uuid4(),
        incident_id=incident.id,
        source=EvidenceSource.FIELD.value,
        source_name="SDRF Patrol",
        evidence_type="physical_inspection",
        observation="Slope stabilized, carriageway fully clear",
        metric="Clearance verified",
        reliability="HIGH",
        interpretation=EvidenceInterpretation.VERIFIED.value,
        freshness_seconds=1200,
        received_at=now,
        observed_at=now,
    )
    db_session.add(ev)
    outcome = OutcomeModel(
        id=uuid.uuid4(),
        incident_id=incident.id,
        outcome_type="EVENT_OBSERVED",
        intervention_state="INTERVENTION_CONFIRMED",
        observation_adequacy="ADEQUATE",
        causal_claim_established=True,
        closure_permitted=True,
        reassessment_required=False,
        recommended_hazard_state="RESOLVED",
        explanation="Field verification confirmed hazard resolved.",
        evaluated_at=now,
    )
    db_session.add(outcome)
    await db_session.flush()

    # 9. REASSESSING -> RESOLVED
    updated = await service.transition(
        incident_id=incident.id,
        target_status=IncidentStatus.RESOLVED,
        actor_role=ActorRole.AUTHORIZED_DECISION_MAKER,
        actor_name="DC West Kameng",
        authority_order_code="ORD-CLOSURE-2026-TEST",
        reason="BRO completed clearance; residual risk negligible.",
    )
    assert updated.status == IncidentStatus.RESOLVED.value

    # 10. RESOLVED -> REVIEWED
    updated = await service.transition(
        incident_id=incident.id,
        target_status=IncidentStatus.REVIEWED,
        actor_role=ActorRole.OPERATOR,
        actor_name="Post-Incident Review Board",
    )
    assert updated.status == IncidentStatus.REVIEWED.value


@pytest.mark.asyncio
async def test_state_machine_blocks_detected_to_resolved(db_session):
    """Verify DETECTED -> RESOLVED is strictly rejected."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-TEST-02",
        title="Test Incident",
        status=IncidentStatus.DETECTED.value,
        latitude=27.0,
        longitude=92.0,
    )
    db_session.add(incident)
    await db_session.flush()

    service = StateTransitionService(db_session)
    with pytest.raises(InvalidTransitionError) as exc_info:
        await service.transition(
            incident_id=incident.id,
            target_status=IncidentStatus.RESOLVED,
            actor_role=ActorRole.OPERATOR,
            actor_name="Operator",
        )
    assert "Cannot transition incident from state 'DETECTED' to 'RESOLVED'" in str(exc_info.value)


@pytest.mark.asyncio
async def test_state_machine_blocks_authorized_to_resolved(db_session):
    """Verify AUTHORIZED -> RESOLVED is strictly rejected."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-TEST-03",
        title="Test Incident",
        status=IncidentStatus.AUTHORIZED.value,
        latitude=27.0,
        longitude=92.0,
    )
    db_session.add(incident)
    await db_session.flush()

    service = StateTransitionService(db_session)
    with pytest.raises(InvalidTransitionError) as exc_info:
        await service.transition(
            incident_id=incident.id,
            target_status=IncidentStatus.RESOLVED,
            actor_role=ActorRole.OPERATOR,
            actor_name="Operator",
        )
    assert "Cannot transition incident from state 'AUTHORIZED' to 'RESOLVED'" in str(exc_info.value)


@pytest.mark.asyncio
async def test_state_machine_blocks_ai_from_authorizing(db_session):
    """Verify AI / System actors cannot authorize safety-critical orders."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-TEST-04",
        title="Test Incident",
        status=IncidentStatus.DECISION_REQUIRED.value,
        latitude=27.0,
        longitude=92.0,
    )
    db_session.add(incident)
    await db_session.flush()

    service = StateTransitionService(db_session)
    with pytest.raises(UnauthorizedAuthorityError) as exc_info:
        await service.transition(
            incident_id=incident.id,
            target_status=IncidentStatus.AUTHORIZED,
            actor_role=ActorRole.SYSTEM_AI,
            actor_name="TerraGuardian Copilot",
            authority_order_code="AUTO-123",
        )
    assert "AI/System actors cannot authorize safety-critical disaster orders" in str(exc_info.value)


@pytest.mark.asyncio
async def test_state_machine_requires_order_code_for_authorization(db_session):
    """Verify authorization requires official order reference code."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-TEST-05",
        title="Test Incident",
        status=IncidentStatus.DECISION_REQUIRED.value,
        latitude=27.0,
        longitude=92.0,
    )
    db_session.add(incident)
    await db_session.flush()

    service = StateTransitionService(db_session)
    with pytest.raises(PreconditionFailedError) as exc_info:
        await service.transition(
            incident_id=incident.id,
            target_status=IncidentStatus.AUTHORIZED,
            actor_role=ActorRole.AUTHORIZED_DECISION_MAKER,
            actor_name="P. Tsering, IAS",
            authority_order_code=None,  # Missing!
        )
    assert "Authorization requires an official disaster order reference code" in str(exc_info.value)
