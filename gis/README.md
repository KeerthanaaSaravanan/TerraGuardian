# GIS and Spatial Contracts

## What

The top-level `gis/` package contains typed spatial contracts for points, corridors and observation relationships. It is not the active GIS runtime package.

## Responsibility

The package documents shapes and semantics for spatial data exchange. Active API/map code is in `services/api/app/routers/gis.py`, `services/api/app/gis/` and `apps/operations-centre/src/components/InteractiveMap.tsx`.

## Interfaces

The current API exposes GIS responses as JSON/GeoJSON. The Operations Centre renders them with Leaflet. Spatial association and distance calculations are implemented in Python services; no active PostGIS service is verified.

## Current implementation

Contracts in this package are design contracts. Active behavior includes map layers and a static NER event catalogue, seeded demonstration geometry, a local terrain raster reader and corridor-distance policies. The map is not a complete authoritative GIS for all NER states, and source labels must be read per layer.

## Verification

Backend GIS/domain behavior is included in `python -m pytest tests/unit -q`; the Operations Centre is built with `npm run build`. These checks do not establish external data connectivity or geospatial accuracy over the region.

## Boundaries and local development

Use the API service and Operations Centre for runtime work. Keep geometry source and maturity explicit (`CONTROLLED_DEMO`, `REAL_HISTORICAL`, etc.). Do not describe this package as a PostGIS engine or infer live map data from a rendered basemap.

## Local development

Start the API using the root README instructions and run `npm run dev:ops` for the map UI. No separate service is provided by the top-level `gis/` contracts package.
