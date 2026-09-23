"""Domain models for Intervention-Conditioned Hazard Outcomes & Observation Adequacy.

Core Invariants:
1. EVENT ABSENCE ≠ HAZARD RESOLUTION.
2. A non-event does not establish causal prevention.
3. INTERVENTION_CONDITIONED_NON_EVENT means an expected event was not observed after
   an intervention context exists; it does NOT mean "the intervention prevented the landslide".
4. Adequate observation is required before any negative claim can be entertained.
5. Inadequate observation creates an OBSERVATION_GAP, not a false alarm or resolution.
"""

from __future__ import annotations

import enum
import math
import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.domain.decision import NextBestInformationItem
from app.domain.enums import ActorRole, HazardState


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two WGS84 coordinate pairs in meters."""
    r_earth = 6371000.0  # meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r_earth * c


class OutcomeType(str, enum.Enum):
    """Authoritative operational outcome classifications."""

    EVENT_OBSERVED = "EVENT_OBSERVED"
    NON_EVENT_OBSERVED = "NON_EVENT_OBSERVED"
    INTERVENTION_CONDITIONED_NON_EVENT = "INTERVENTION_CONDITIONED_NON_EVENT"
    OBSERVATION_GAP = "OBSERVATION_GAP"
    RESIDUAL_HAZARD = "RESIDUAL_HAZARD"
    CONFLICTED = "CONFLICTED"
    UNRESOLVED = "UNRESOLVED"


class HypothesisType(str, enum.Enum):
    """Authoritative bounded set of 7 competing operational hypotheses (Prompt 04)."""

    H1_FALSE_ALARM = "H1_FALSE_ALARM"
    H2_INTERVENTION_CONDITIONED_NON_EVENT = "H2_INTERVENTION_CONDITIONED_NON_EVENT"
    H3_DELAYED_FAILURE = "H3_DELAYED_FAILURE"
    H4_SHIFTED_HAZARD = "H4_SHIFTED_HAZARD"
    H5_OBSERVATION_GAP = "H5_OBSERVATION_GAP"
    H6_RESIDUAL_HAZARD = "H6_RESIDUAL_HAZARD"
    H7_CONFLICTED = "H7_CONFLICTED"


class EvidenceRelationshipType(str, enum.Enum):
    """Explicit relationship between an evidence observation and a hypothesis."""

    SUPPORTING = "SUPPORTING"
    CONTRADICTING = "CONTRADICTING"
    UNKNOWN = "UNKNOWN"


class HypothesisStatus(str, enum.Enum):
    """Evaluation status of a competing hypothesis."""

    ACTIVE = "ACTIVE"
    SUPPORTED = "SUPPORTED"
    CONTRADICTED = "CONTRADICTED"
    DISFAVORED = "DISFAVORED"
    VIABLE = "VIABLE"


class InterventionContextState(str, enum.Enum):
    """Operational execution and verification status of mitigating interventions."""

    NO_INTERVENTION = "NO_INTERVENTION"
    INTERVENTION_PROPOSED = "INTERVENTION_PROPOSED"
    INTERVENTION_DISPATCHED_UNCONFIRMED = "INTERVENTION_DISPATCHED_UNCONFIRMED"
    INTERVENTION_CONFIRMED = "INTERVENTION_CONFIRMED"


class ObservationAdequacy(str, enum.Enum):
    """Evidential sufficiency of the observation process."""

    ADEQUATE = "ADEQUATE"
    INADEQUATE_OBSCURATION = "INADEQUATE_OBSCURATION"
    INADEQUATE_WINDOW = "INADEQUATE_WINDOW"
    INADEQUATE_COVERAGE = "INADEQUATE_COVERAGE"
    INADEQUATE_CONFLICTED = "INADEQUATE_CONFLICTED"


class SpatialDivergenceContext(BaseModel):
    """Contextual spatial relationship between original incident prediction and observed evidence."""

    original_latitude: float
    original_longitude: float
    observed_latitude: Optional[float] = None
    observed_longitude: Optional[float] = None
    distance_meters: Optional[float] = None
    within_supported_scope: bool = True
    spatial_scope_threshold_meters: float = 5000.0  # 5 km standard corridor radius
    corridor_alignment_notes: Optional[str] = None


class HypothesisEvidenceBinding(BaseModel):
    """Traceable evidential binding linking an evidence item to a specific competing hypothesis."""

    evidence_id: uuid.UUID
    relationship: EvidenceRelationshipType
    reasoning: str


class CompetingHypothesisItem(BaseModel):
    """Authoritative representation of one of the 7 competing operational hypotheses."""

    hypothesis_type: HypothesisType
    status: HypothesisStatus = HypothesisStatus.VIABLE
    title: str
    description: str
    supporting_evidence_ids: list[uuid.UUID] = Field(default_factory=list)
    contradicting_evidence_ids: list[uuid.UUID] = Field(default_factory=list)
    unknown_evidence_ids: list[uuid.UUID] = Field(default_factory=list)
    evidence_bindings: list[HypothesisEvidenceBinding] = Field(default_factory=list)
    rationale: str

    model_config = {"from_attributes": True}


class OutcomePolicyConfig(BaseModel):
    """Configurable operational policies and regional demonstration thresholds for the Outcome Engine.

    RESEARCH-INTEGRITY DISCLOSURE:
    None of these parameters represent universal, scientifically validated natural constants or statutory mandates.
    They represent regional administrative policies, operational corridor envelopes, and synthetic demonstration assumptions.
    """

    research_integrity_disclosure: str = Field(
        default="CONFIGURABLE POLICY & DEMONSTRATION ASSUMPTIONS (Class C/D) — Requires regional geotechnical calibration prior to field deployment.",
        description="Explicit disclosure that thresholds represent operational policy/demonstration assumptions, not universal scientific or statutory constants.",
    )
    corridor_scope_threshold_meters: float = Field(
        default=5000.0,
        description="CONFIGURABLE POLICY (Class C): 5.0 km corridor monitoring envelope along highway transit alignment.",
    )
    spatial_divergence_threshold_meters: float = Field(
        default=500.0,
        description="CONFIGURABLE POLICY (Class C): 500 m boundary beyond which ground distress is treated as a corridor flank shift (H4).",
    )
    cloud_obscuration_threshold_pct: float = Field(
        default=70.0,
        description="CONFIGURABLE POLICY (Class C): Optical sensor obscuration >= 70% constitutes an OBSERVATION_GAP (H5).",
    )
    observation_window_hours: float = Field(
        default=4.0,
        description="DEMONSTRATION ASSUMPTION (Class D): Prototype 4-hour monitoring window from trigger detection; requires local hydrologic calibration.",
    )
    rainfall_surcharge_threshold_mm: float = Field(
        default=100.0,
        description="DEMONSTRATION ASSUMPTION (Class D): Prototype antecedent precipitation surcharge contributing to DELAYED_FAILURE (H3); uncalibrated for Himalayan catchments.",
    )
    freshness_window_seconds: float = Field(
        default=86400.0,
        description="CONFIGURABLE POLICY (Class C): 24-hour observation freshness boundary; observations older than 24h cannot establish current non-event.",
    )


class OutcomeAssessment(BaseModel):
    """Authoritative outcome interpretation derived by the Outcome Engine."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    outcome_type: OutcomeType
    intervention_state: InterventionContextState
    observation_adequacy: ObservationAdequacy

    # Fundamental Invariant: Causal prevention is unestablished without rigorous post-event geotechnical proof
    causal_claim_established: bool = False

    # Evidentiary closure gate interaction: Non-event or observation gap CANNOT authorize closure
    closure_permitted: bool = False
    reassessment_required: bool = True
    recommended_hazard_state: HazardState

    spatial_divergence: Optional[SpatialDivergenceContext] = None
    explanation: str
    evidence_summary: dict[str, Any] = Field(default_factory=dict)

    # Prompt 04: Competing Hypotheses & Hypothesis-Separating NBI
    primary_hypothesis: Optional[HypothesisType] = None
    competing_hypotheses: list[CompetingHypothesisItem] = Field(default_factory=list)
    nbi_recommendations: list[NextBestInformationItem] = Field(default_factory=list)
    policy_context: Optional[OutcomePolicyConfig] = Field(default_factory=OutcomePolicyConfig)

    evaluated_at: datetime = Field(default_factory=datetime.utcnow)
    evaluated_by: str = "OutcomeEngine"

    model_config = {"from_attributes": True}


class OutcomeEvaluationRequest(BaseModel):
    """Request payload to manually trigger or parameterize an outcome evaluation."""

    actor_role: ActorRole = ActorRole.OPERATOR
    actor_name: str = "Operations Duty Officer"
    observed_latitude: Optional[float] = None
    observed_longitude: Optional[float] = None
    observation_notes: Optional[str] = None
