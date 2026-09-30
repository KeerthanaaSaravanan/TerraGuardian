"""Tests for Phase 4R Geospatial Intelligence API Endpoints and Spatial Layers."""

import uuid
import pytest
from httpx import AsyncClient

from app.routers.gis import (
    parse_wkt_linestring_coordinates,
    parse_wkt_polygon_coordinates,
)


def test_wkt_linestring_to_geojson_coordinates():
    """Verify WKT LineString correctly parses to GeoJSON [lon, lat] without inversion."""
    wkt = "LINESTRING(92.4000 27.1000, 92.5000 27.2000, 92.6000 27.3000)"
    coords = parse_wkt_linestring_coordinates(wkt)
    assert len(coords) == 3
    # First point: lon=92.4000, lat=27.1000
    assert coords[0] == [92.4, 27.1]
    assert coords[1] == [92.5, 27.2]
    assert coords[2] == [92.6, 27.3]


def test_wkt_polygon_to_geojson_coordinates():
    """Verify WKT Polygon correctly parses to GeoJSON [[[lon, lat], ...]]."""
    wkt = "POLYGON((92.1 26.9, 92.9 26.9, 92.9 27.8, 92.1 27.8, 92.1 26.9))"
    coords = parse_wkt_polygon_coordinates(wkt)
    assert len(coords) == 1
    assert len(coords[0]) == 5
    assert coords[0][0] == [92.1, 26.9]
    assert coords[0][2] == [92.9, 27.8]


@pytest.mark.asyncio
async def test_seed_baseline_and_fetch_layers(async_client: AsyncClient):
    """Verify baseline GIS seeding and layer retrieval endpoints."""
    # 1. Seed baseline layers
    seed_res = await async_client.post("/api/v1/gis/seed-baseline?force_reset=true")
    assert seed_res.status_code == 201
    seed_data = seed_res.json()
    assert seed_data["status"] == "SEEDED"
    assert seed_data["boundaries_count"] >= 1
    assert seed_data["roads_count"] >= 2
    assert seed_data["settlements_count"] >= 4
    assert seed_data["infrastructure_count"] >= 4

    # 2. Fetch Boundaries
    res_b = await async_client.get("/api/v1/gis/layers/boundaries")
    assert res_b.status_code == 200
    boundaries = res_b.json()
    assert len(boundaries) >= 1
    b0 = boundaries[0]
    assert b0["boundary_code"] == "IND-NER-WK"
    assert b0["name"] == "West Kameng District"
    assert b0["geometry_geojson"]["type"] == "Polygon"
    assert len(b0["geometry_geojson"]["coordinates"][0]) >= 4

    # 3. Fetch Roads
    res_r = await async_client.get("/api/v1/gis/layers/roads")
    assert res_r.status_code == 200
    roads = res_r.json()
    assert len(roads) >= 2
    nh13 = next(r for r in roads if "Bhalukpong-Tenga" in r["segment_name"])
    assert nh13["classification"] == "NATIONAL_HIGHWAY"
    assert nh13["geometry_geojson"]["type"] == "LineString"
    assert len(nh13["geometry_geojson"]["coordinates"]) >= 3

    # 4. Fetch Settlements
    res_s = await async_client.get("/api/v1/gis/layers/settlements")
    assert res_s.status_code == 200
    settlements = res_s.json()
    assert len(settlements) >= 4
    tenga = next(s for s in settlements if "Tenga" in s["name"])
    assert tenga["population"] == 3450
    assert tenga["latitude"] == 27.21
    assert tenga["longitude"] == 92.43
    assert tenga["geometry_geojson"]["coordinates"] == [92.43, 27.21]

    # 5. Fetch Critical Infrastructure
    res_inf = await async_client.get("/api/v1/gis/layers/infrastructure")
    assert res_inf.status_code == 200
    infra = res_inf.json()
    assert len(infra) >= 4
    hosp = next(f for f in infra if f["facility_type"] == "HOSPITAL")
    assert "Hospital" in hosp["name"]
    assert hosp["provenance_class"] == "GEOGRAPHICALLY_GROUNDED_FIXTURE"



@pytest.mark.asyncio
async def test_spatial_incidents_endpoint(async_client: AsyncClient):
    """Verify spatial incident features retrieval with metrics and coordinates."""
    # Seed TG-2048 first
    seed_inc = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_inc.status_code == 201

    res = await async_client.get("/api/v1/gis/incidents/spatial")
    assert res.status_code == 200
    incidents = res.json()
    assert len(incidents) >= 1
    tg2048 = next(i for i in incidents if i["code"] == "TG-2048")
    assert tg2048["latitude"] == 27.0842
    assert tg2048["longitude"] == 92.5681
    assert tg2048["risk_score"] == 86.0
    assert tg2048["confidence_score"] == 54.0
    assert tg2048["priority_score"] == 74.0
    assert tg2048["corridor_name"] == "NH-13 Trans-Arunachal Highway"


@pytest.mark.asyncio
async def test_spatial_association_thresholds(async_client: AsyncClient):
    """Verify spatial association classifies ATTACHED (<=5km), REVIEW_REQUIRED (<=10km), and UNASSIGNED (>10km)."""
    seed_inc = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    inc_id = seed_inc.json()["id"]

    # 1. Nearby point (~2.5 km away) -> ATTACHED
    res_att = await async_client.post(
        "/api/v1/gis/spatial-association",
        json={"latitude": 27.0940, "longitude": 92.5710, "incident_id": inc_id},
    )
    assert res_att.status_code == 200
    data_att = res_att.json()
    assert data_att["association_status"] == "ATTACHED"
    assert data_att["distance_meters"] <= 5000.0

    # 2. Mid-range point (~7.5 km away) -> REVIEW_REQUIRED
    res_rev = await async_client.post(
        "/api/v1/gis/spatial-association",
        json={"latitude": 27.1400, "longitude": 92.5800, "incident_id": inc_id},
    )
    assert res_rev.status_code == 200
    data_rev = res_rev.json()
    assert data_rev["association_status"] == "REVIEW_REQUIRED"
    assert 5000.0 < data_rev["distance_meters"] <= 10000.0

    # 3. Distant point (>15 km away) -> UNASSIGNED
    res_un = await async_client.post(
        "/api/v1/gis/spatial-association",
        json={"latitude": 27.3500, "longitude": 92.7000, "incident_id": inc_id},
    )
    assert res_un.status_code == 200
    data_un = res_un.json()
    assert data_un["association_status"] == "UNASSIGNED"
    assert data_un["distance_meters"] > 10000.0


@pytest.mark.asyncio
async def test_system_model_metadata(async_client: AsyncClient):
    """Verify system model metadata reports truthful unvalidated deterministic heuristic."""
    res = await async_client.get("/api/v1/system/model-metadata")
    assert res.status_code == 200
    data = res.json()
    assert data["model_type"] == "DETERMINISTIC_HEURISTIC"
    assert data["validation_status"] == "NOT_VALIDATED"
    assert data["calibration_status"] == "UNVALIDATED_PRIOR"
    assert data["evaluation_value"] is None
    assert any(
        r["region"] == "West Kameng (NH-13 Corridor)" and r["status"] == "GEOGRAPHICALLY_GROUNDED_FIXTURE"
        for r in data["regional_coverage"]
    )


@pytest.mark.asyncio
async def test_citizen_report_ingestion_safety_boundary(async_client: AsyncClient):
    """Verify citizen report ingestion enforces public safety boundary (UNVERIFIED, RECEIVED, audit logged)."""
    seed_inc = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_inc.status_code in (200, 201)

    payload = {
        "latitude": 27.0850,
        "longitude": 92.5690,
        "observation": "Fresh mud and rock debris blocking half of NH-13 lane near KM-42.",
        "hazard_type": "SLOPE_DEBRIS",
        "severity": "HIGH",
        "reporter_note": "Visual confirmation from roadside. Cracks expanding.",
    }
    res = await async_client.post("/api/v1/ingestion/citizen-report", json=payload)
    assert res.status_code == 201
    data = res.json()

    assert data["status"] == "RECEIVED"
    assert data["interpretation"] == "UNVERIFIED"
    assert data["incident_code"] == "TG-2048"
    assert data["tracking_id"].startswith("TG-CIT-")
    assert "safety" in data["preliminary_guidance"].lower() or "stay clear" in data["preliminary_guidance"].lower()

    # Verify evidence item is in the incident's evidence collection
    inc_res = await async_client.get(f"/api/v1/incidents/{data['incident_id']}/evidence")
    assert inc_res.status_code == 200
    evidence_list = inc_res.json()
    cit_evidence = next(e for e in evidence_list if e["id"] == data["evidence_id"])
    assert cit_evidence["source"] == "CITIZEN"
    assert cit_evidence["interpretation"] == "UNVERIFIED"
    assert cit_evidence["processing_status"] == "RECEIVED"
    assert cit_evidence["provenance"] == "REAL_CITIZEN_SUBMISSION"
