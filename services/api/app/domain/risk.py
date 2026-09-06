"""Risk and Confidence domain models.

CRITICAL RULE: RISK ≠ CONFIDENCE

Risk represents the assessed level of danger.
Confidence represents how certain we are about that assessment.

These are independent quantities. A HIGH RISK + LOW CONFIDENCE situation
requires field verification, not an automatic response.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RiskLevel(str, enum.Enum):
    """Assessed risk level."""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"
    NEGLIGIBLE = "NEGLIGIBLE"
    UNKNOWN = "UNKNOWN"


class ConfidenceLevel(str, enum.Enum):
    """Confidence in the assessment."""

    VERY_HIGH = "VERY_HIGH"    # Multiple agreeing authoritative sources
    HIGH = "HIGH"              # Strong evidence agreement
    MODERATE = "MODERATE"      # Partial evidence, some gaps
    LOW = "LOW"                # Limited evidence, possible conflicts
    VERY_LOW = "VERY_LOW"      # Insufficient evidence
    UNASSESSED = "UNASSESSED"  # Not yet evaluated


class RiskAssessment(BaseModel):
    """An independent risk assessment for an incident.

    Risk level is separate from confidence. Do not conflate them.
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID

    risk_level: RiskLevel
    risk_score: Optional[float] = Field(
        default=None, ge=0.0, le=1.0,
        description="Numerical risk score (0-1) if computed.",
    )
    risk_factors: list[str] = Field(default_factory=list)
    assessed_at: datetime = Field(default_factory=datetime.utcnow)
    assessed_by: str = "system"  # system, model name, or user ID
    methodology: Optional[str] = None

    model_config = {"from_attributes": True}


class ConfidenceAssessment(BaseModel):
    """An independent confidence assessment for an incident.

    Confidence is driven by evidence quality, freshness, agreement,
    missing sources, and conflicts. Never fabricate confidence.
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID

    confidence_level: ConfidenceLevel
    confidence_score: Optional[float] = Field(
        default=None, ge=0.0, le=1.0,
        description="Numerical confidence score (0-1) if computed.",
    )

    # Evidence analysis
    evidence_count: int = 0
    agreeing_sources: int = 0
    conflicting_sources: int = 0
    missing_source_types: list[str] = Field(default_factory=list)
    oldest_evidence_age_seconds: Optional[int] = None

    assessed_at: datetime = Field(default_factory=datetime.utcnow)
    rationale: Optional[str] = None

    model_config = {"from_attributes": True}
