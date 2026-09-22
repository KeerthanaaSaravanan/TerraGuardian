"""TerraGuardian Intelligence Contract — Landslide Risk Domain.

Status: DESIGN CONTRACT
Runtime Status: NOT ACTIVE
Active Runtime Implementation: ml.baseline (LandslidePredictiveBaseline) and services/api/app/domain/risk.py

This module defines strongly typed, side-effect-free domain contracts for hazard
risk assessment, factor decompositions, and explanatory representations.
It does NOT implement an active inference engine or duplicate the mathematical baseline.

Core Invariant:
    RISK != CONFIDENCE (High hazard trigger probability does not imply high evidential certainty).
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid


class RiskLevel(str, enum.Enum):
    """Categorical hazard risk classifications bounded to standardized thresholds."""

    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    VERY_HIGH = "VERY_HIGH"


@dataclass(frozen=True)
class RiskFactorContribution:
    """Traceable individual parameter contribution to assessed slope hazard risk."""

    factor_name: str
    raw_value: Optional[float]
    normalized_score: float
    coefficient_weight: float
    contribution_percentage: float
    geotechnical_rationale: str


@dataclass(frozen=True)
class HazardRiskAssessmentContract:
    """Design contract representing a point-in-time hazard risk evaluation.

    Note: This is an architectural boundary contract. The authoritative runtime
    evaluation is performed by ml.baseline.LandslidePredictiveBaseline.
    """

    assessment_id: uuid.UUID
    incident_id: uuid.UUID
    assessed_at: datetime
    risk_score: float  # 0.0 to 100.0
    risk_level: RiskLevel
    factor_contributions: List[RiskFactorContribution] = field(default_factory=list)
    model_identifier: str = "tg-landslide-baseline-contract-v1"
    uncertainty_reference: Optional[str] = None
    audit_metadata: Dict[str, Any] = field(default_factory=dict)
