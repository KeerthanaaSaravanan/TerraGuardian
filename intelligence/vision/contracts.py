"""TerraGuardian Intelligence Contract — Visual Evidence Metadata.

Status: DESIGN / FUTURE
Runtime Status: NOT ACTIVE
Active Runtime Implementation: None (Visual processing handled via direct field verification)

Architectural contracts defining visual-evidence ingestion metadata, photographic
provenance, EXIF telemetry validation, and visual quality indicators.
Contains ZERO computer vision models, ZERO neural networks, and ZERO fabricated inference.

Core Invariants:
    OBSERVATION != INTERPRETATION (Raw photographic capture does not constitute verified geotechnical safety).
    Visual evidence remains uncorroborated until examined by authorized patrol personnel.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid


class VisualEvidenceCategory(str, enum.Enum):
    """Categorical visual manifestations observable during slope failure inspections."""

    SCARP_TENSION_CRACK = "SCARP_TENSION_CRACK"
    DEBRIS_ENCROACHMENT = "DEBRIS_ENCROACHMENT"
    DRAINAGE_OVERFLOW = "DRAINAGE_OVERFLOW"
    SLOPE_TOE_BULGING = "SLOPE_TOE_BULGING"
    ROAD_SURFACE_SUBSIDENCE = "ROAD_SURFACE_SUBSIDENCE"
    UNSPECIFIED_SURFACE_ANOMALY = "UNSPECIFIED_SURFACE_ANOMALY"


class VisualEvidenceQuality(str, enum.Enum):
    """Visual clarity assessment indicator based on atmospheric conditions."""

    HIGH_CONFIDENCE_VISIBILITY = "HIGH_CONFIDENCE_VISIBILITY"
    MODERATE_PARTIAL_OBSCURATION = "MODERATE_PARTIAL_OBSCURATION"
    POOR_FOG_OR_RAIN_ARTIFACTS = "POOR_FOG_OR_RAIN_ARTIFACTS"
    UNUSABLE_OCCLUDED = "UNUSABLE_OCCLUDED"


@dataclass(frozen=True)
class VisualObservationLocation:
    """Geospatial and directional metadata associated with visual capture."""

    latitude: float
    longitude: float
    elevation_meters: Optional[float] = None
    compass_bearing_deg: Optional[float] = None  # 0 to 360
    estimated_distance_to_subject_meters: Optional[float] = None


@dataclass(frozen=True)
class VisualEvidenceMetadataContract:
    """Design contract representing captured photographic evidence metadata.

    Note: This contract models metadata and provenance. It intentionally does NOT
    perform neural network inference or computer vision classification.
    """

    media_id: uuid.UUID
    incident_id: uuid.UUID
    captured_at: datetime
    location: VisualObservationLocation
    capture_device: str
    exif_tamper_flag: bool
    quality_assessment: VisualEvidenceQuality
    reported_category: VisualEvidenceCategory
    sha256_checksum: str
    geotechnical_analyst_notes: Optional[str] = None
