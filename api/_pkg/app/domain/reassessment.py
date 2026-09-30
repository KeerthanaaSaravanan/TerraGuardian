"""Divergence, Reassessment, and Operational Outcome domain models.

INVARIANT:
EVENT ABSENCE ≠ HAZARD RESOLUTION
When predicted reality does not occur, the system MUST NOT automatically resolve.
It executes: EXPECTED → OBSERVED → DIVERGENCE → BOUNDED REASSESSMENT → UPDATED HAZARD STATE
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.domain.enums import HazardState, RiskLevel


class Divergence(BaseModel):
    """Detected deviation between expected model prediction and observed ground telemetry."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID

    expected_phenomenon: str  # e.g., "Major 450m³ debris runout on carriageway by 05:00 IST"
    observed_phenomenon: str  # e.g., "15m³ superficial slurry only; tension scarp stabilized"
    divergence_type: str      # e.g., "VOLUME_UNDERSHOOT", "TIME_DELAY", "LATERAL_SHIFT"

    detected_at: datetime = Field(default_factory=datetime.utcnow)
    confidence_in_divergence: float = Field(ge=0.0, le=1.0)
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class Reassessment(BaseModel):
    """Bounded reassessment reconciling physical divergence into an updated hazard state."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    divergence_id: Optional[uuid.UUID] = None

    previous_hazard_state: HazardState
    updated_hazard_state: HazardState  # DELAYED | SHIFTED | PARTIAL | DISSIPATED | RESOLVED | FALSE_ALARM

    updated_risk_level: RiskLevel
    updated_risk_score: float = Field(ge=0.0, le=100.0)

    reassessed_at: datetime = Field(default_factory=datetime.utcnow)
    reassessed_by: str = "system"
    rationale: str

    model_config = {"from_attributes": True}


class Outcome(BaseModel):
    """Final post-incident operational resolution and model learning record."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID

    resolution_status: str  # RESOLVED_CONTROLLED | FALSE_ALARM_RECORDED | EVOLVED_SUCCESS
    actual_debris_volume_m3: Optional[float] = None
    casualty_count: int = 0
    property_damage_summary: Optional[str] = None
    corridor_closure_duration_hours: float
    key_learnings: list[str] = Field(default_factory=list)

    resolved_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_by: Optional[str] = None

    model_config = {"from_attributes": True}
