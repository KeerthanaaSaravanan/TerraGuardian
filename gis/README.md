# TerraGuardian — GIS Primitives & Spatial Domain Contracts

## Purpose
Defines strongly typed geospatial primitives, linear highway corridor envelopes, and spatial divergence relationships for TerraGuardian incidents.

## Architecture Status
- **Status**: `DESIGN CONTRACT`
- **Runtime Status**: `NOT ACTIVE`
- **Active Operational Implementation**:
  - Distance computation: `services/api/app/domain/outcome.py` (`haversine_distance_meters`)
  - Operational Corridor Policy: `services/api/app/services/outcome_service.py` (`5,000 meters` threshold)

## Key Concepts
- `GeoPointContract`: Standard geodetic point (WGS84).
- `IncidentCorridorBoundaryContract`: Linear infrastructure catchment adhering to the authoritative 5,000m corridor policy.
- `SpatialObservationRelationContract`: Formal characterization of spatial shifts along the same geological slope lineage.
