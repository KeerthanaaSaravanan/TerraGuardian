"""TerraGuardian Intelligence Contract — Consequence & Impact Domain.

Status: DESIGN CONTRACT
Runtime Status: NOT ACTIVE
Active Runtime Implementation: services/api/app/services/impact_service.py

This module defines strongly typed domain boundaries for multi-dimensional consequence
propagation: population exposure, lifeline highway connectivity, and response constraints.

Core Invariants:
    HAZARD != PRIORITY (Hazard likelihood alone does not determine operational urgency).
    Consequence evaluation incorporates vulnerability, economic isolation, and detour penalties.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid


class ImpactDimension(str, enum.Enum):
    """Core dimensions of operational consequence."""

    POPULATION_EXPOSURE = "POPULATION_EXPOSURE"
    LIFELINE_CONNECTIVITY = "LIFELINE_CONNECTIVITY"
    CRITICAL_INFRASTRUCTURE = "CRITICAL_INFRASTRUCTURE"
    RESPONSE_DIFFICULTY = "RESPONSE_DIFFICULTY"


class ExposureSeverity(str, enum.Enum):
    """Categorical consequence severity classification."""

    NEGLIGIBLE = "NEGLIGIBLE"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"
    CATASTROPHIC = "CATASTROPHIC"


class LifelineStatus(str, enum.Enum):
    """Corridor transportation and logistics cutoff status."""

    UNRESTRICTED = "UNRESTRICTED"
    DEGRADED = "DEGRADED"
    SEVERELY_RESTRICTED = "SEVERELY_RESTRICTED"
    ISOLATED_NO_DETOUR = "ISOLATED_NO_DETOUR"


@dataclass(frozen=True)
class ConsequenceDimensionScore:
    """Detailed scoring for a single consequence dimension."""

    dimension: ImpactDimension
    score: float  # 0.0 to 100.0
    weight: float
    contributing_assets_count: int
    rationale: str


@dataclass(frozen=True)
class ConsequenceAssessmentContract:
    """Design contract representing synthesized operational consequence."""

    assessment_id: uuid.UUID
    incident_id: uuid.UUID
    assessed_at: datetime
    composite_consequence_score: float  # 0.0 to 100.0
    severity_level: ExposureSeverity
    lifeline_status: LifelineStatus
    detour_distance_km: Optional[float]
    dimension_breakdown: List[ConsequenceDimensionScore] = field(default_factory=list)
    impacted_settlements: List[str] = field(default_factory=list)
    critical_infrastructure_threatened: List[str] = field(default_factory=list)
