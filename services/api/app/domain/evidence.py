"""Evidence domain models.

Evidence may originate from authoritative sources, weather, satellite,
terrain, sensors, citizen observations, field observations, historical
data, or system-generated model outputs.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class EvidenceSource(str, enum.Enum):
    """Origin category of evidence."""

    AUTHORITATIVE = "AUTHORITATIVE"  # GSI, NDMA, etc.
    WEATHER = "WEATHER"              # IMD, MOSDAC
    SATELLITE = "SATELLITE"          # Copernicus, Sentinel, NRSC
    TERRAIN = "TERRAIN"              # DEM, geological surveys
    SENSOR = "SENSOR"                # IoT, field instruments
    CITIZEN = "CITIZEN"              # TerraGuardian Safe submissions
    FIELD = "FIELD"                  # Field team observations
    HISTORICAL = "HISTORICAL"        # Past incident data
    MODEL = "MODEL"                  # System-generated predictions


class ProcessingStatus(str, enum.Enum):
    """Evidence processing pipeline status."""

    RECEIVED = "RECEIVED"
    VALIDATING = "VALIDATING"
    VALIDATED = "VALIDATED"
    REJECTED = "REJECTED"
    NORMALIZED = "NORMALIZED"
    GEOREFERENCED = "GEOREFERENCED"
    PUBLISHED = "PUBLISHED"


class Evidence(BaseModel):
    """A discrete piece of evidence contributing to incident assessment.

    Every evidence object tracks its source, provenance, freshness,
    and contribution confidence independently.
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: Optional[uuid.UUID] = None

    source: EvidenceSource
    source_name: str  # e.g. "IMD Rainfall Station Shillong"
    evidence_type: str  # e.g. "rainfall_measurement", "satellite_image", "citizen_photo"

    # Temporal
    observed_at: datetime
    received_at: datetime = Field(default_factory=datetime.utcnow)

    # Location (WGS84)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Provenance
    provenance: Optional[str] = None  # How this evidence was obtained
    original_reference: Optional[str] = None  # URL, file path, or ID

    # Quality
    freshness_seconds: Optional[int] = None  # Age of observation
    confidence_contribution: Optional[float] = Field(
        default=None, ge=0.0, le=1.0,
        description="How much this evidence contributes to overall confidence (0-1).",
    )

    # Processing
    processing_status: ProcessingStatus = ProcessingStatus.RECEIVED
    processing_notes: Optional[str] = None

    # Content
    summary: Optional[str] = None
    raw_data: Optional[dict] = None  # Original payload (type-dependent)

    model_config = {"from_attributes": True}
