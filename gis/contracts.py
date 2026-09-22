"""TerraGuardian GIS & Spatial Corridor Domain Contracts.

Status: DESIGN CONTRACT
Runtime Status: NOT ACTIVE
Active Runtime Implementation: services/api/app/domain/outcome.py and outcome_service.py

This module defines strongly typed spatial primitives, corridor relationship states,
and topographic observation descriptors.
Does NOT redefine or contradict the authoritative 5,000m corridor policy.
Contains ZERO map rendering or heavy GIS engine dependencies.

Core Invariant:
    Corridor envelope policy (5,000m) binds observation shifts to the SAME digital twin.
    Distant observations (> 5,000m) are rejected from silent attachment.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional
import uuid


class SpatialCorridorRelation(str, enum.Enum):
    """Categorical relationship between observed physical coordinate and incident forecast centroid."""

    WITHIN_INCIDENT_CORRIDOR = "WITHIN_INCIDENT_CORRIDOR"
    OUTSIDE_INCIDENT_CORRIDOR = "OUTSIDE_INCIDENT_CORRIDOR"
    ALONG_SLOPE_LINEAGE = "ALONG_SLOPE_LINEAGE"
    CROSS_VALLEY_DISJOINT = "CROSS_VALLEY_DISJOINT"


@dataclass(frozen=True)
class GeoPointContract:
    """Immutable geospatial coordinate primitive."""

    latitude: float
    longitude: float
    elevation_meters: Optional[float] = None
    geodetic_datum: str = "WGS84"


@dataclass(frozen=True)
class IncidentCorridorBoundaryContract:
    """Design contract defining the linear highway corridor envelope.

    Authoritative Policy:
        5,000 meters standard corridor radius (as enforced in domain/outcome.py).
    """

    corridor_code: str
    highway_identifier: str
    start_chainage_km: float
    end_chainage_km: float
    corridor_tolerance_meters: float = 5000.0  # Authoritative operational corridor threshold
    notes: Optional[str] = None


@dataclass(frozen=True)
class SpatialObservationRelationContract:
    """Design contract evaluating spatial divergence between prediction and ground evidence."""

    observation_id: uuid.UUID
    incident_id: uuid.UUID
    forecast_centroid: GeoPointContract
    observed_point: GeoPointContract
    offset_distance_meters: float
    relation_status: SpatialCorridorRelation
    within_supported_scope: bool
    same_incident_preservation_supported: bool
    spatial_reassessment_notes: str = ""
