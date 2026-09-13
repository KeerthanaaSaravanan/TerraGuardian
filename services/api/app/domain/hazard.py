"""Domain models for Living Hazard Hypothesis, Divergence, and Bounded Reassessment.

Core Principles:
1. A landslide forecast is a BOUNDED, LIVING HAZARD HYPOTHESIS reconciled against reality.
2. RISK ≠ CONFIDENCE
3. HAZARD ≠ PRIORITY
4. APPROVED ≠ COMPLETED
5. EVENT ABSENCE ≠ HAZARD RESOLUTION
6. DIVERGENCE TRIGGERS REASSESSMENT — NOT AUTOMATIC ESCALATION.
7. ACTION CONFIRMED ≠ HAZARD RESOLUTION.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.domain.enums import ActorRole, ConfidenceLevel, HazardState, RiskLevel


class DivergenceType(str, enum.Enum):
    """Categorization of divergence between expected hypothesis and observed reality."""

    TEMPORAL = "TEMPORAL"      # Expected window elapsed without manifestation, or early activation
    SPATIAL = "SPATIAL"        # Observed location/runout differs from expected envelope
    MAGNITUDE = "MAGNITUDE"    # Observed volume/velocity differs materially from hypothesis
    EVIDENCE = "EVIDENCE"      # Conflicting multi-source evidence shifts confidence/risk


class DivergenceSeverity(str, enum.Enum):
    """Operational significance of detected divergence."""

    CRITICAL = "CRITICAL"
    SIGNIFICANT = "SIGNIFICANT"
    MODERATE = "MODERATE"
    LOW = "LOW"


class DivergenceRecord(BaseModel):
    """Structured record of an explainable divergence between prediction and observation."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    divergence_type: DivergenceType
    severity: DivergenceSeverity = DivergenceSeverity.SIGNIFICANT
    detected_at: datetime = Field(default_factory=datetime.utcnow)

    expected_context: str
    observed_context: str
    evidence_references: list[str] = Field(default_factory=list)
    explanation: str

    requires_reassessment: bool = True
    is_resolved: bool = False

    model_config = {"from_attributes": True}


class SpatialEnvelope(BaseModel):
    """Expected spatial hazard envelope and corridor alignment."""

    latitude: float
    longitude: float
    radius_meters: float = 500.0
    corridor_chainage: Optional[str] = "KM-42"
    elevation_m: Optional[float] = 1240.0
    slope_gradient_deg: Optional[float] = 44.2


class TemporalWindow(BaseModel):
    """Expected temporal window of hazard activation."""

    window_start: datetime
    window_end: datetime
    peak_intensity_expected_at: Optional[datetime] = None
    window_elapsed: bool = False


class HazardHypothesis(BaseModel):
    """Living digital hazard hypothesis continuously reconciled against reality."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    lineage_id: str = "HL-TG-2048-01"
    parent_lineage_id: Optional[str] = None

    current_state: HazardState = HazardState.EXPECTED
    spatial_envelope: SpatialEnvelope
    temporal_window: TemporalWindow

    initiating_evidence_ids: list[str] = Field(default_factory=list)
    initial_risk_score: float = 86.0
    current_risk_score: float = 86.0
    initial_confidence_score: float = 54.0
    current_confidence_score: float = 54.0

    divergences: list[DivergenceRecord] = Field(default_factory=list)
    evolution_history: list[dict[str, Any]] = Field(default_factory=list)
    residual_uncertainty: str = "Optical cloud cover persists (88%); pending physical patrol confirmation."

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"from_attributes": True}


class BoundedReassessmentRequest(BaseModel):
    """Request payload to initiate a deterministic bounded reassessment."""

    actor_role: ActorRole = ActorRole.OPERATOR
    actor_name: str = "Operations Duty Officer"
    trigger_divergence_id: Optional[uuid.UUID] = None
    target_hazard_state: Optional[HazardState] = None
    notes: Optional[str] = None


class BoundedReassessmentResult(BaseModel):
    """Authoritative outcome of a deterministic bounded reassessment."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    hypothesis_id: uuid.UUID
    lineage_id: str

    previous_hazard_state: HazardState
    updated_hazard_state: HazardState

    updated_risk_score: float
    updated_risk_level: RiskLevel
    updated_confidence_score: float
    updated_confidence_level: ConfidenceLevel

    divergence_evaluated: Optional[DivergenceRecord] = None
    continuity_supported: bool = True
    lineage_decision: str = "CONTINUE_SAME_LINEAGE"  # CONTINUE_SAME_LINEAGE | SPAWN_NEW_LINEAGE

    rationale: str
    operational_guidance: str
    reassessed_at: datetime = Field(default_factory=datetime.utcnow)
    reassessed_by: str = "system"

    model_config = {"from_attributes": True}


class HazardStateTransitionRequest(BaseModel):
    """Request payload to transition hazard state."""

    target_state: HazardState
    actor_role: ActorRole = ActorRole.OPERATOR
    actor_name: str
    reason: str
    resolution_evidence_id: Optional[uuid.UUID] = None


class HazardLineageSummary(BaseModel):
    """Summary of hazard evolution history and lineage continuity."""

    lineage_id: str
    incident_id: uuid.UUID
    root_detected_at: datetime
    active_hazard_state: HazardState
    states_traversed: list[str]
    total_divergences_detected: int
    total_reassessments_performed: int
    continuity_intact: bool
    lineage_tree: list[dict[str, Any]] = Field(default_factory=list)
