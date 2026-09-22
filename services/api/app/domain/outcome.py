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
