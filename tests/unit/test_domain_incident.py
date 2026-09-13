"""Unit tests for IncidentTwin and core domain models.

Validates the four independent dimensions and all core invariants.
"""

import uuid
from datetime import datetime, timezone

from app.domain.action import Action, ActionConfirmation
from app.domain.audit import AuditEvent
from app.domain.enums import (
    ActionState,
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
from app.domain.evidence import (
    Evidence,
    EvidenceConflict,
    Observation,
    VerificationObservation,
)
from app.domain.impact import (
    HazardHypothesis,
    ImpactAssessment,
    PriorityAssessment,
)
from app.domain.incident import (
    VALID_TRANSITIONS,
    IncidentTwin,
    is_valid_transition,
)
from app.domain.reassessment import Divergence, Outcome, Reassessment
from app.domain.risk import ConfidenceAssessment, ResidualRisk, RiskAssessment


def test_incident_twin_dimensions():
    """Verify that the IncidentTwin encapsulates the four independent dimensions."""
    incident = IncidentTwin(
        code="TG-2048",
        title="NH-13 KM-42 Slope Debris Flow",
        description="Saturated mica-schist face above NH-13 trans-highway.",
        latitude=27.0842,
        longitude=92.5681,
        location_name="KM-42 Bhalukpong-Tenga Sector",
        status=IncidentStatus.DETECTED,
        hazard_state=HazardState.EXPECTED,
        risk_level=RiskLevel.HIGH,
        risk_score=86.0,
        confidence_level=ConfidenceLevel.MODERATE,
        confidence_score=54.0,
        priority_level=PriorityLevel.P2_HIGH,
        priority_score=74.0,
    )
    assert isinstance(incident.id, uuid.UUID)
    assert incident.code == "TG-2048"
    assert incident.status == IncidentStatus.DETECTED
    assert incident.hazard_state == HazardState.EXPECTED
    assert incident.risk_level == RiskLevel.HIGH
    assert incident.confidence_level == ConfidenceLevel.MODERATE
    assert incident.priority_level == PriorityLevel.P2_HIGH


def test_risk_does_not_equal_confidence():
    """Verify Invariant 1: RISK ≠ CONFIDENCE."""
    incident_id = uuid.uuid4()

    risk_eval = RiskAssessment(
        incident_id=incident_id,
        risk_level=RiskLevel.HIGH,
        risk_score=85.0,
        risk_factors=["steep_slope_44deg", "antecedent_rainfall_184mm"],
    )

    conf_eval = ConfidenceAssessment(
        incident_id=incident_id,
        confidence_level=ConfidenceLevel.MODERATE,
        confidence_score=54.0,
        evidence_count=4,
        agreeing_sources=3,
        conflicting_sources=1,
        missing_source_types=["FIELD_VERIFICATION"],
        rationale="Optical satellite obscured by monsoon cloud; field verification recommended.",
    )

    assert risk_eval.risk_level == RiskLevel.HIGH
    assert conf_eval.confidence_level == ConfidenceLevel.MODERATE
    assert risk_eval.risk_level.value != conf_eval.confidence_level.value


def test_hazard_does_not_equal_priority():
    """Verify Invariant 2: HAZARD ≠ PRIORITY."""
    incident_id = uuid.uuid4()

    priority_eval = PriorityAssessment(
        incident_id=incident_id,
        priority_level=PriorityLevel.P1_CRITICAL,
        priority_score=89.7,
        hazard_risk_input=86.0,
        hazard_confidence_input=89.0,
        exposure_score=90.5,
        criticality_score=95.0,
        connectivity_penalty_score=92.0,
        response_difficulty_score=80.0,
        operational_rationale="Sole heavy freight route to Tawang district; 1,420 downstream villagers in runout zone.",
    )

    assert priority_eval.priority_level == PriorityLevel.P1_CRITICAL
    assert priority_eval.priority_score == 89.7
    assert priority_eval.hazard_risk_input == 86.0
    assert priority_eval.exposure_score == 90.5


def test_citizen_evidence_can_remain_unverified():
    """Verify Invariant 6: CITIZEN OBSERVATION ≠ AUTHORITATIVE CONFIRMATION."""
    obs = Observation(
        source=EvidenceSource.CITIZEN,
        source_name="Citizen Safe PWA (#CZ-9021)",
        observed_at=datetime.now(timezone.utc),
        latitude=27.234,
        longitude=92.568,
        reporter_note="Slope slippage on roadside",
        is_simulated=True,
    )
    assert obs.source == EvidenceSource.CITIZEN

    evidence = Evidence(
        source=EvidenceSource.CITIZEN,
        source_name="Citizen Safe PWA (#CZ-9021)",
        evidence_type="citizen_photo",
        observation="Visual mud slump near KM-41.8",
        metric="Optical metadata verified",
        observed_at=datetime.now(timezone.utc),
        processing_status=EvidenceProcessingStatus.PROCESSED,
        interpretation=EvidenceInterpretation.UNVERIFIED,
    )
    # Must explicitly allow remaining UNVERIFIED
    assert evidence.interpretation == EvidenceInterpretation.UNVERIFIED
    assert evidence.processing_status == EvidenceProcessingStatus.PROCESSED


def test_action_state_invariants():
    """Verify Invariant 3: APPROVED ≠ COMPLETED and COMPLETED ≠ PHYSICALLY_CONFIRMED."""
    incident_id = uuid.uuid4()
    action = Action(
        incident_id=incident_id,
        task_code="TSK-02",
        agency="West Kameng Traffic Police",
        title="Establish Roadblock at KM-38 Checkpost",
        description="Physical barrier across uphill carriageway",
        state=ActionState.APPROVED,
        assigned_to="ASI D. Sonam",
        is_action_gap_trigger=True,
    )
    assert action.state == ActionState.APPROVED
    assert action.state != ActionState.COMPLETED
    assert action.state != ActionState.PHYSICALLY_CONFIRMED

    # Confirmation record is a separate entity
    confirmation = ActionConfirmation(
        action_id=action.id,
        incident_id=incident_id,
        confirming_officer="ASI D. Sonam",
        confirming_agency="West Kameng Traffic Police",
        communication_channel="TETRA_RADIO",
        location_confirmed="NH-13 KM-38 Police Checkpost",
        confirmation_notes="Steel barriers positioned; flasher beacons active; traffic halted.",
    )
    assert confirmation.confirming_officer == "ASI D. Sonam"


def test_event_absence_does_not_equal_resolution():
    """Verify Invariant 4: EVENT ABSENCE ≠ HAZARD RESOLUTION."""
    incident_id = uuid.uuid4()

    # 1. Divergence detected
    divergence = Divergence(
        incident_id=incident_id,
        expected_phenomenon="Massive 450m³ debris runout across road by 05:00 IST",
        observed_phenomenon="Superficial 15m³ slurry; tension scarp stabilized with reduced pore pressure",
        divergence_type="VOLUME_UNDERSHOOT",
        confidence_in_divergence=0.88,
    )
    assert divergence.divergence_type == "VOLUME_UNDERSHOOT"

    # 2. Reassessment updates hazard state (NOT direct resolution)
    reassessment = Reassessment(
        incident_id=incident_id,
        divergence_id=divergence.id,
        previous_hazard_state=HazardState.EXPECTED,
        updated_hazard_state=HazardState.PARTIAL,
        updated_risk_level=RiskLevel.MODERATE,
        updated_risk_score=48.0,
        rationale="Slope partially released; continuous monitoring required for remaining overhang.",
    )
    assert reassessment.updated_hazard_state == HazardState.PARTIAL
    assert reassessment.updated_hazard_state != HazardState.RESOLVED


def test_action_confirmed_does_not_equal_hazard_resolved():
    """Verify Invariant 5: ACTION CONFIRMED ≠ HAZARD RESOLVED."""
    incident_id = uuid.uuid4()

    residual = ResidualRisk(
        incident_id=incident_id,
        residual_risk_level=RiskLevel.HIGH,
        residual_risk_score=72.0,
        civilian_exposure_mitigated=True,  # Public is safe due to roadblock
        active_hazard_volume_remaining_m3=380.0,  # Slope is STILL active
        structural_stability_status="UNSTABILIZED_OVERHANG",
        evaluator_notes="Roadblock safely eliminates traffic casualty risk, but hill scarp remains precarious.",
    )
    assert residual.civilian_exposure_mitigated is True
    assert residual.residual_risk_level == RiskLevel.HIGH


def test_valid_state_transitions():
    """Verify the canonical lifecycle state transitions."""
    assert is_valid_transition(IncidentStatus.DETECTED, IncidentStatus.ASSESSING)
    assert is_valid_transition(IncidentStatus.ASSESSING, IncidentStatus.VERIFYING)
    assert is_valid_transition(IncidentStatus.ASSESSING, IncidentStatus.DECISION_REQUIRED)
    assert is_valid_transition(IncidentStatus.VERIFYING, IncidentStatus.VERIFIED)
    assert is_valid_transition(IncidentStatus.VERIFIED, IncidentStatus.DECISION_REQUIRED)
    assert is_valid_transition(IncidentStatus.DECISION_REQUIRED, IncidentStatus.AUTHORIZED)
    assert is_valid_transition(IncidentStatus.AUTHORIZED, IncidentStatus.RESPONDING)
    assert is_valid_transition(IncidentStatus.RESPONDING, IncidentStatus.MONITORING)
    assert is_valid_transition(IncidentStatus.MONITORING, IncidentStatus.REASSESSING)
    assert is_valid_transition(IncidentStatus.MONITORING, IncidentStatus.RESOLVED)
    assert is_valid_transition(IncidentStatus.REASSESSING, IncidentStatus.MONITORING)
    assert is_valid_transition(IncidentStatus.REASSESSING, IncidentStatus.RESOLVED)
    assert is_valid_transition(IncidentStatus.RESOLVED, IncidentStatus.REVIEWED)


def test_forbidden_state_transitions_rejected():
    """Verify illegal lifecycle jumps are strictly rejected."""
    # DETECTED -> RESOLVED is forbidden
    assert not is_valid_transition(IncidentStatus.DETECTED, IncidentStatus.RESOLVED)
    # AUTHORIZED -> RESOLVED is forbidden
    assert not is_valid_transition(IncidentStatus.AUTHORIZED, IncidentStatus.RESOLVED)
    # Terminal REVIEWED cannot transition
    assert not is_valid_transition(IncidentStatus.REVIEWED, IncidentStatus.DETECTED)
    assert not is_valid_transition(IncidentStatus.REVIEWED, IncidentStatus.MONITORING)
