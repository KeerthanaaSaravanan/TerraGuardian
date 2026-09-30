"""Evidence and Observation domain models.

INVARIANT:
CITIZEN OBSERVATION ≠ AUTHORITATIVE CONFIRMATION
Citizen evidence can contribute to multi-source synthesis, but MUST be capable
of remaining UNVERIFIED until physical ground truth or calibrated instruments confirm it.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.domain.enums import (
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceProcessingStatus,
    EvidenceSource,
)


class Observation(BaseModel):
    """Raw ingestion observation from any source (citizen, sensor, API)."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    source: EvidenceSource
    source_name: str
    observed_at: datetime
    received_at: datetime = Field(default_factory=datetime.utcnow)

    # Location (WGS84)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude_m: Optional[float] = None
    accuracy_m: Optional[float] = None

    # Content
    raw_payload: dict[str, Any] = Field(default_factory=dict)
    media_url: Optional[str] = None
    reporter_note: Optional[str] = None
    is_simulated: bool = False

    model_config = {"from_attributes": True}


class EvidenceConflict(BaseModel):
    """Represents a detected contradiction or divergence between evidence sources.
    
    e.g., Extreme rainfall telemetry vs 88% cloud-obscured optical satellite.
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    evidence_a_id: uuid.UUID
    evidence_b_id: uuid.UUID
    conflict_type: str  # e.g., "OPTICAL_CLOUD_OBSCURATION", "MAGNITUDE_DISCREPANCY"
    description: str
    resolution_strategy: str = "FIELD_VERIFICATION_REQUIRED"
    resolved: bool = False
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class Evidence(BaseModel):
    """A discrete piece of reconciled evidence contributing to incident assessment.

    Every evidence object tracks its source, provenance, freshness,
    interpretation status, and contribution confidence independently.
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: Optional[uuid.UUID] = None
    observation_id: Optional[uuid.UUID] = None

    source: EvidenceSource
    source_name: str  # e.g. "IMD AWS #428"
    evidence_type: str  # e.g. "rainfall_measurement", "citizen_photo"

    # Core observation summary & metrics
    observation: str
    metric: str
    reliability: str = "HIGH"  # HIGH | MODERATE | LOW

    # Temporal & Spatial
    observed_at: datetime
    received_at: datetime = Field(default_factory=datetime.utcnow)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Provenance
    provenance: Optional[str] = None
    original_reference: Optional[str] = None
    is_simulated: bool = False

    # Processing & Interpretation
    freshness_seconds: Optional[int] = None
    confidence_contribution: Optional[float] = Field(
        default=None, ge=0.0, le=1.0,
        description="How much this evidence contributes to overall confidence (0-1).",
    )
    processing_status: EvidenceProcessingStatus = EvidenceProcessingStatus.RECEIVED
    interpretation: EvidenceInterpretation = EvidenceInterpretation.UNVERIFIED
    conflict_status: EvidenceConflictStatus = EvidenceConflictStatus.NONE
    conflict_details: Optional[str] = None
    details: Optional[str] = None
    raw_data: Optional[dict[str, Any]] = None

    model_config = {"from_attributes": True}


class ReconciliationSummary(BaseModel):
    """Structured deterministic cross-source evidence reconciliation result.
    
    Captures what the multi-source evidence fabric collectively indicates,
    where uncertainties / conflicts exist, and the recommended operational next step.
    """

    incident_id: uuid.UUID
    total_evidence_count: int
    source_distribution: dict[str, int] = Field(default_factory=dict)
    verified_count: int
    unverified_count: int
    supporting_evidence_ids: list[uuid.UUID] = Field(default_factory=list)
    conflicting_evidence_ids: list[uuid.UUID] = Field(default_factory=list)
    stale_evidence_ids: list[uuid.UUID] = Field(default_factory=list)
    conflict_status: EvidenceConflictStatus = EvidenceConflictStatus.NONE
    conflict_summary: str
    dominant_signal: str
    evidence_quality_score: float = Field(ge=0.0, le=1.0)
    confidence_contribution_aggregate: float = Field(ge=0.0, le=1.0)
    recommended_action: str
    reconciled_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"from_attributes": True}


class VerificationObservation(BaseModel):
    """Ground truth verification captured on-site by an authorized patrol unit."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    verification_task_id: uuid.UUID
    officer_name: str
    unit: str
    callsign: str
    observed_at: datetime = Field(default_factory=datetime.utcnow)
    latitude: float
    longitude: float
    altitude_str: Optional[str] = None
    summary: str
    key_findings: list[str] = Field(default_factory=list)
    photo_url: Optional[str] = None
    device_imei: Optional[str] = None
    cryptographic_hash: Optional[str] = None

    model_config = {"from_attributes": True}
