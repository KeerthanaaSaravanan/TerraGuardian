"""TerraGuardian Intelligence Contract — Hazard Outcome Domain.

Status: DESIGN CONTRACT
Runtime Status: NOT ACTIVE
Active Runtime Implementation: services/api/app/services/outcome_service.py and services/api/app/domain/outcome.py

This module defines strongly typed domain boundaries for intervention-conditioned outcome
interpretation, observation adequacy, and counterfactual reasoning constraints.

Core Invariants:
    EVENT ABSENCE != HAZARD RESOLUTION
    INTERVENTION + NON-EVENT != PROVEN PREVENTION (causal_claim_established must remain False).
    An unobserved event following roadblock deployment does NOT establish that the intervention stopped a slide.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional
import uuid


class OutcomeClassification(str, enum.Enum):
    """Canonical operational classifications of observed reality."""

    EVENT_OBSERVED = "EVENT_OBSERVED"
    NON_EVENT_OBSERVED = "NON_EVENT_OBSERVED"
    INTERVENTION_CONDITIONED_NON_EVENT = "INTERVENTION_CONDITIONED_NON_EVENT"
    OBSERVATION_GAP = "OBSERVATION_GAP"
    RESIDUAL_HAZARD = "RESIDUAL_HAZARD"
    CONFLICTED = "CONFLICTED"
    UNRESOLVED = "UNRESOLVED"


class ObservationAdequacy(str, enum.Enum):
    """Adequacy of field observation channels during the failure window."""

    ADEQUATE = "ADEQUATE"
    INADEQUATE_WEATHER_BLIND = "INADEQUATE_WEATHER_BLIND"
    MISSING_CONFIRMATION = "MISSING_CONFIRMATION"


class InterventionContextState(str, enum.Enum):
    """Execution status of mitigating interventions prior to observation."""

    NO_INTERVENTION = "NO_INTERVENTION"
    INTERVENTION_PROPOSED = "INTERVENTION_PROPOSED"
    INTERVENTION_DISPATCHED = "INTERVENTION_DISPATCHED"
    INTERVENTION_CONFIRMED = "INTERVENTION_CONFIRMED"


@dataclass(frozen=True)
class OutcomeInterpretationContract:
    """Design contract representing synthesized outcome reasoning.

    Note: causal_claim_established is strictly False by default. Causal prevention
    claims require affirmative post-event geotechnical clearance and cannot be
    inferred from temporal non-occurrence alone.
    """

    outcome_id: uuid.UUID
    incident_id: uuid.UUID
    evaluated_at: datetime
    classification: OutcomeClassification
    intervention_state: InterventionContextState
    observation_adequacy: ObservationAdequacy

    # Fundamental Invariant: Causal prevention is unestablished without rigorous proof
    causal_claim_established: bool = False

    # Evidentiary closure gate interaction: Non-event cannot authorize automated closure
    closure_permitted: bool = False
    reassessment_required: bool = True

    spatial_divergence_meters: Optional[float] = None
    within_supported_corridor: bool = True
    operational_explanation: str = ""
    evidence_payload: Dict[str, Any] = field(default_factory=dict)
