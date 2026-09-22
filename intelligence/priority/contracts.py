"""TerraGuardian Intelligence Contract — Operational Priority Domain.

Status: DESIGN CONTRACT
Runtime Status: NOT ACTIVE
Active Runtime Implementation: services/api/app/services/priority_service.py

This module defines strongly typed domain boundaries for operational urgency and triage.

Core Invariants:
    HAZARD != PRIORITY (Hazard likelihood alone does not determine operational priority).
    Priority is a multi-factor synthesis: 0.35*Hazard + 0.40*Consequence + 0.15*Confidence + 0.10*Urgency.
    PRIORITY != AUTHORIZATION (Priority informs human decision-making; it does NOT autonomously execute actions).
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid


class OperationalPriorityLevel(str, enum.Enum):
    """Categorical triage priority levels for multi-agency dispatch."""

    P1_CRITICAL = "P1_CRITICAL"
    P2_HIGH = "P2_HIGH"
    P3_MODERATE = "P3_MODERATE"
    P4_ROUTINE = "P4_ROUTINE"


class PriorityDriver(str, enum.Enum):
    """Primary operational rationale elevating response priority."""

    IMMINENT_LIFE_SAFETY = "IMMINENT_LIFE_SAFETY"
    SOLE_LIFELINE_CUTOFF = "SOLE_LIFELINE_CUTOFF"
    CRITICAL_ASSET_AT_RISK = "CRITICAL_ASSET_AT_RISK"
    UNCERTAINTY_GAP_CLOSURE = "UNCERTAINTY_GAP_CLOSURE"
    MONITORING_SUSTAINMENT = "MONITORING_SUSTAINMENT"


@dataclass(frozen=True)
class PriorityFactorContribution:
    """Quantitative contribution of an operational dimension to composite priority."""

    dimension_name: str
    input_score: float
    weight: float
    weighted_score: float
    explanation: str


@dataclass(frozen=True)
class OperationalPriorityAssessmentContract:
    """Design contract representing synthesized operational priority."""

    priority_id: uuid.UUID
    incident_id: uuid.UUID
    assessed_at: datetime
    composite_priority_score: float  # 0.0 to 100.0
    priority_level: OperationalPriorityLevel
    primary_driver: PriorityDriver
    factor_contributions: List[PriorityFactorContribution] = field(default_factory=list)
    operational_rationale: str = ""
    requires_magisterial_escalation: bool = False
