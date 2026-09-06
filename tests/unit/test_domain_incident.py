"""Unit tests for IncidentTwin and core domain models."""

import uuid
from app.domain.incident import (
    IncidentStatus,
    IncidentTwin,
    is_valid_transition,
    VALID_TRANSITIONS,
)
from app.domain.risk import (
    ConfidenceAssessment,
    ConfidenceLevel,
    RiskAssessment,
    RiskLevel,
)
from app.domain.evidence import (
    Evidence,
    EvidenceSource,
    ProcessingStatus,
)
from datetime import datetime, timezone


def test_incident_twin_creation():
    incident = IncidentTwin(
        title="Nongstoin Slope Subsidence",
        description="Active slope movement observed along NH-106",
        latitude=25.52,
        longitude=91.27,
        location_name="Nongstoin, Meghalaya",
    )
    assert isinstance(incident.id, uuid.UUID)
    assert incident.status == IncidentStatus.DETECTED
    assert incident.incident_type == "landslide"
    assert incident.latitude == 25.52
    assert incident.longitude == 91.27


def test_valid_state_transitions():
    """Verify all canonical transitions succeed according to the state machine."""
    lifecycle = [
        IncidentStatus.DETECTED,
        IncidentStatus.ASSESSING,
        IncidentStatus.VERIFYING,
        IncidentStatus.VERIFIED,
        IncidentStatus.DECISION_REQUIRED,
        IncidentStatus.AUTHORIZED,
        IncidentStatus.RESPONDING,
        IncidentStatus.MONITORING,
        IncidentStatus.RESOLVED,
        IncidentStatus.REVIEWED,
    ]
    for i in range(len(lifecycle) - 1):
        curr, next_state = lifecycle[i], lifecycle[i + 1]
        assert is_valid_transition(curr, next_state), f"Expected {curr} -> {next_state} to be valid"


def test_invalid_state_transitions_rejected():
    """Verify arbitrary status changes are blocked."""
    # Cannot jump from DETECTED directly to AUTHORIZED or RESOLVED
    assert not is_valid_transition(IncidentStatus.DETECTED, IncidentStatus.AUTHORIZED)
    assert not is_valid_transition(IncidentStatus.DETECTED, IncidentStatus.RESOLVED)
    # Terminal state REVIEWED cannot transition to anything
    assert not is_valid_transition(IncidentStatus.REVIEWED, IncidentStatus.DETECTED)
    # Backward transitions not allowed without formal workflow
    assert not is_valid_transition(IncidentStatus.VERIFIED, IncidentStatus.DETECTED)


def test_risk_does_not_equal_confidence():
    """Verify that Risk and Confidence are independent quantities.

    Core rule: RISK ≠ CONFIDENCE.
    Example: HIGH RISK + LOW CONFIDENCE requires field verification.
    """
    incident_id = uuid.uuid4()

    risk_eval = RiskAssessment(
        incident_id=incident_id,
        risk_level=RiskLevel.HIGH,
        risk_score=0.85,
        risk_factors=["steep_slope", "continuous_rainfall_48h"],
    )

    conf_eval = ConfidenceAssessment(
        incident_id=incident_id,
        confidence_level=ConfidenceLevel.LOW,
        confidence_score=0.30,
        evidence_count=1,
        agreeing_sources=1,
        conflicting_sources=0,
        missing_source_types=["FIELD_REPORT", "RADAR_INFEROMETRY"],
        rationale="Only single uncalibrated citizen observation available; needs field verification.",
    )

    # Risk is high, but confidence is low
    assert risk_eval.risk_level == RiskLevel.HIGH
    assert conf_eval.confidence_level == ConfidenceLevel.LOW
    assert risk_eval.risk_level != conf_eval.confidence_level
    assert risk_eval.incident_id == conf_eval.incident_id


def test_evidence_object_metadata():
    evidence = Evidence(
        source=EvidenceSource.WEATHER,
        source_name="IMD Automatic Weather Station Cherrapunji",
        evidence_type="precipitation_accumulation",
        observed_at=datetime.now(timezone.utc),
        latitude=25.27,
        longitude=91.73,
        provenance="API fetch from IMD Regional Centre Guwahati",
        confidence_contribution=0.85,
        processing_status=ProcessingStatus.VALIDATED,
        summary="Cumulative rainfall 210mm in 24 hours.",
    )
    assert evidence.source == EvidenceSource.WEATHER
    assert evidence.processing_status == ProcessingStatus.VALIDATED
    assert evidence.confidence_contribution == 0.85
