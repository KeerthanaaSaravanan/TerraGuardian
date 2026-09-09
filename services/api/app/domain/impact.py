"""Hazard Hypothesis, Impact, and Priority domain models.

INVARIANT:
HAZARD ≠ PRIORITY
Operational priority is driven by downstream impact, population exposure,
lifeline criticality, and lack of alternative detours, not merely hazard volume.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.domain.enums import PriorityLevel, RiskLevel


class HazardHypothesis(BaseModel):
    """Mathematical and physical representation of the predicted hazard."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    estimated_volume_m3: float
    slope_angle_deg: float
    soil_saturation_pct: float
    primary_failure_mechanism: str  # e.g., "ROTATIONAL_DEBRIS_SLUMP"
    predicted_runout_distance_m: float
    formulated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"from_attributes": True}


class ImpactNodeModel(BaseModel):
    """A single asset or community exposed in the hazard propagation chain."""

    stage_order: int
    stage_name: str  # e.g., "1. Hazard Origin", "2. Strategic Corridor"
    node_name: str   # e.g., "NH-13 KM-42 Carriageway"
    category: str    # ORIGIN | CORRIDOR | COMMUNITY | LIFELINE
    severity: RiskLevel
    description: str
    vulnerability_factor: str


class ImpactAssessment(BaseModel):
    """Downstream vulnerability and infrastructure cascade assessment."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    corridor_name: str
    has_alternative_detour: bool = False
    detour_penalty_km: float = 0.0
    threatened_population_count: int = 0
    critical_facilities: list[str] = Field(default_factory=list)
    impact_chain: list[ImpactNodeModel] = Field(default_factory=list)
    assessed_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"from_attributes": True}


class PriorityAssessment(BaseModel):
    """Operational response priority score and rank.
    
    Formula: Priority = Hazard × Exposure × Criticality × Isolation Penalty
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    priority_level: PriorityLevel
    priority_score: float = Field(ge=0.0, le=100.0)
    hazard_score_component: float
    exposure_component: float
    criticality_component: float
    isolation_multiplier: float = 1.0
    rationale: str
    assessed_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"from_attributes": True}
