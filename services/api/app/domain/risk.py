from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.domain.enums import ConfidenceLevel, RiskLevel


class ModelMetadata(BaseModel):
    """Metadata describing the active predictive inference model."""

    model_name: str = "tg-landslide-baseline-v1"
    model_version: str = "1.0.0-demo"
    model_type: str = "INTERPRETABLE_LOGISTIC_BASELINE"
    feature_schema_version: str = "v1.0"
    training_data_status: str = "SYNTHETIC_CALIBRATION_DEMO (NOT REAL-WORLD FIELD ACCURACY)"
    is_demonstration_only: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    description: str = (
        "Baseline physical slope-stability and antecedent precipitation hazard model "
        "calibrated for demonstration and deterministic operational intelligence."
    )


class FeatureContribution(BaseModel):
    """Traceable feature contribution to the assessed risk score."""

    feature_name: str
    raw_value: Optional[float] = None
    normalized_value: float
    coefficient: float
    contribution_pct: float
    description: str


class DataQualitySummary(BaseModel):
    """Assessment of evidence completeness, freshness, and sensor obstruction."""

    total_expected_features: int = 7
    available_features: int
    missing_features: list[str] = Field(default_factory=list)
    stale_features: list[str] = Field(default_factory=list)
    conflicted_features: list[str] = Field(default_factory=list)
    completeness_ratio: float = Field(ge=0.0, le=1.0)
    optical_obscuration_pct: Optional[float] = None


class PredictiveRiskAssessment(BaseModel):
    """Comprehensive backend-authoritative risk and confidence assessment.
    
    CRITICAL RULE: RISK ≠ CONFIDENCE
    Risk represents the physical hazard magnitude (0-100).
    Confidence represents the evidential reliability and data quality (0-100).
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID

    risk_score: float = Field(ge=0.0, le=100.0, description="Numerical physical hazard score (0-100).")
    risk_level: RiskLevel

    confidence_score: float = Field(ge=0.0, le=100.0, description="Numerical evidential certainty score (0-100).")
    confidence_level: ConfidenceLevel

    dominant_risk_factors: list[str] = Field(default_factory=list)
    feature_contributions: list[FeatureContribution] = Field(default_factory=list)
    explanation_narrative: str
    data_quality: DataQualitySummary

    model_metadata: ModelMetadata = Field(default_factory=ModelMetadata)
    recommended_operational_action: str = "FIELD_VERIFICATION_REQUIRED"

    assessed_at: datetime = Field(default_factory=datetime.utcnow)
    assessed_by: str = "tg-landslide-baseline-v1"

    model_config = {"from_attributes": True}


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

