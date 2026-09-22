"""TerraGuardian AI — GIS Domain Contracts.

STATUS: DESIGN CONTRACT
RUNTIME: NOT ACTIVE
CURRENT RUNTIME IMPLEMENTATION: services/api/app/domain/outcome.py (haversine calculation)

Defines strongly typed geospatial primitives and corridor relationship descriptors.
"""

from gis.contracts import (
    GeoPointContract,
    IncidentCorridorBoundaryContract,
    SpatialCorridorRelation,
    SpatialObservationRelationContract,
)

__all__ = [
    "GeoPointContract",
    "IncidentCorridorBoundaryContract",
    "SpatialCorridorRelation",
    "SpatialObservationRelationContract",
]
