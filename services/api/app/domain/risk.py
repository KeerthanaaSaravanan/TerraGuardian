"""Risk, Confidence, and Residual Risk domain models.

CRITICAL INVARIANTS:
1. RISK ≠ CONFIDENCE (Danger severity is independent of evidential certainty).
2. ACTION CONFIRMED ≠ HAZARD RESOLVED (Residual risk must be assessed before resolution).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.domain.enums import ConfidenceLevel, RiskLevel


class RiskAssessment(BaseModel):
    """An independent physical hazard danger assessment."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID

    risk_level: RiskLevel
    risk_score: Optional[float] = Field(
        default=None, ge=0.0, le=100.0,
        description="Numerical risk score (0-100).",
    )
    risk_factors: list[str] = Field(default_factory=list)
    assessed_at: datetime = Field(default_factory=datetime.utcnow)
    assessed_by: str = "system"
    methodology: Optional[str] = None

    model_config = {"from_attributes": True}


class ConfidenceAssessment(BaseModel):
    """An independent evidential certainty assessment."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID

    confidence_level: ConfidenceLevel
    confidence_score: Optional[float] = Field(
        default=None, ge=0.0, le=100.0,
        description="Numerical confidence score (0-100).",
    )

    # Evidence synthesis details
    evidence_count: int = 0
    agreeing_sources: int = 0
    conflicting_sources: int = 0
    missing_source_types: list[str] = Field(default_factory=list)
    oldest_evidence_age_seconds: Optional[int] = None

    assessed_at: datetime = Field(default_factory=datetime.utcnow)
    rationale: Optional[str] = None

    model_config = {"from_attributes": True}


class ResidualRisk(BaseModel):
    """Residual hazard danger remaining after protective human response is deployed.
    
    ACTION CONFIRMED ≠ HAZARD RESOLVED
    Even when human exposure drops to zero via roadblocks, residual slope risk
    must remain tracked until physical stabilization is complete.
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID

    residual_risk_level: RiskLevel
    residual_risk_score: float = Field(ge=0.0, le=100.0)
    civilian_exposure_mitigated: bool = True
    active_hazard_volume_remaining_m3: Optional[float] = None
    structural_stability_status: str = "UNSTABILIZED"
    assessed_at: datetime = Field(default_factory=datetime.utcnow)
    evaluator_notes: Optional[str] = None

    model_config = {"from_attributes": True}
