"""TerraGuardian Domain Models Package."""

from app.domain.action import Action, ActionConfirmation
from app.domain.audit import AuditEvent
from app.domain.decision import Decision, VerificationTask
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
from app.domain.hazard import (
    HazardHypothesis,
    HazardLineageSummary,
)
from app.domain.impact import (
    ComparativePriorityResult,
    CorridorConnectivity,
    ImpactAssessment,
    ImpactNode,
    ImpactNodeModel,
    PriorityAssessment,
)
from app.domain.incident import (
    VALID_TRANSITIONS,
    IncidentTwin,
    is_valid_transition,
)
from app.domain.outcome import (
    InterventionContextState,
    ObservationAdequacy,
    OutcomeAssessment,
    OutcomeEvaluationRequest,
    OutcomeType,
    SpatialDivergenceContext,
    haversine_distance_meters,
)
from app.domain.reassessment import (
    Divergence,
    Outcome,
    Reassessment,
)
from app.domain.risk import (
    ConfidenceAssessment,
    ResidualRisk,
    RiskAssessment,
)

__all__ = [
    # Enums
    "IncidentStatus",
    "HazardState",
    "EvidenceSource",
    "EvidenceProcessingStatus",
    "EvidenceInterpretation",
    "ActionState",
    "RiskLevel",
    "ConfidenceLevel",
    "PriorityLevel",
    "ActorRole",
    "AuditEventType",
    # Models
    "IncidentTwin",
    "VALID_TRANSITIONS",
    "is_valid_transition",
    "Evidence",
    "EvidenceConflict",
    "Observation",
    "VerificationObservation",
    "RiskAssessment",
    "ConfidenceAssessment",
    "ResidualRisk",
    "HazardHypothesis",
    "ImpactAssessment",
    "ImpactNodeModel",
    "PriorityAssessment",
    "Decision",
    "VerificationTask",
    "Action",
    "ActionConfirmation",
    "Divergence",
    "Reassessment",
    "Outcome",
    "OutcomeType",
    "InterventionContextState",
    "ObservationAdequacy",
    "SpatialDivergenceContext",
    "OutcomeAssessment",
    "OutcomeEvaluationRequest",
    "haversine_distance_meters",
    "AuditEvent",
]
