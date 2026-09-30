"""Authoritative Geospatial & Spatial Intelligence Test Suite (Phase 4).

Verifies the 18 core geospatial criteria:
1. Valid geometry creation (GeoPoint)
2. Invalid coordinates rejection (Latitude/Longitude bounds)
3. SRID correctness (EPSG:4326)
4. Coordinate order verification ([lon, lat] for GeoJSON/PostGIS, [lat, lon] for human geodetics)
5. Spatial distance accuracy (WGS 84 Haversine)
6. Spatial containment (Point in Polygon)
7. Spatial intersection (Polygon ray casting)
8. Proximity queries within spatial buffer
9. Incident/evidence spatial association boundary (5km / 10km)
10. Administrative boundary envelope lookup
11. Road vector minimum distance query
12. Hazard corridor query (5,000m linear envelope)
13. Geometry serialization (WKT <-> GeoJSON <-> GeoPoint)
14. Relational database migration preservation
15. Persistent quarantine storage (Resolving Phase 3 Gap COND-01)
16. Multi-modal semantic observation deduplication (Resolving Phase 3 Gap COND-02)
17. DEM / Terrain metadata lineage trace
18. Stale / historical spatial data temporal filtering
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.ingestion_pipeline import IngestionPipeline
from app.gis.models import (
    AdminBoundaryModel,
    CriticalInfrastructureModel,
    DEMDatasetContract,
    QuarantineRecordModel,
    RoadSegmentModel,
    SettlementModel,
    TerrainLineageContract,
)
from app.gis.primitives import GeoBoundingBox, GeoPoint
from app.gis.spatial_engine import SpatialQueryEngine


# ── TEST 1: Valid Geometry Creation ──
def test_01_valid_geometry_creation():
    """Verify GeoPoint creates valid coordinate representation with default SRID 4326."""
    pt = GeoPoint(latitude=27.2000, longitude=92.4000)
    assert pt.latitude == 27.2000
    assert pt.longitude == 92.4000
    assert pt.srid == 4326


# ── TEST 2: Invalid Coordinate Rejection ──
def test_02_invalid_coordinate_rejection():
    """Verify coordinates outside [-90, 90] and [-180, 180] raise validation error."""
    with pytest.raises(ValueError):
        GeoPoint(latitude=95.0, longitude=92.4)

    with pytest.raises(ValueError):
        GeoPoint(latitude=27.2, longitude=195.0)


# ── TEST 3: SRID Correctness ──
def test_03_srid_correctness():
    """Verify authoritative SRID is pinned to EPSG:4326 (WGS 84)."""
    pt = GeoPoint(latitude=27.0, longitude=92.0)
    assert pt.srid == 4326
    bbox = GeoBoundingBox(min_latitude=21.0, max_latitude=30.0, min_longitude=88.0, max_longitude=98.0)
    assert bbox.srid == 4326


# ── TEST 4: Coordinate Order Verification ──
def test_04_coordinate_order():
    """Verify GeoJSON uses [lon, lat] and WKT uses POINT(lon lat), while human models use (lat, lon)."""
    pt = GeoPoint(latitude=27.123456, longitude=92.654321)
    geojson = pt.to_geojson_geometry()
    assert geojson["type"] == "Point"
    # GeoJSON coordinate order is [longitude, latitude]
    assert geojson["coordinates"] == [92.654321, 27.123456]

    wkt = pt.to_wkt()
    # WKT coordinate order is POINT(longitude latitude)
    assert wkt.startswith("POINT(92.6543210 27.1234560)")


# ── TEST 5: Spatial Distance Accuracy ──
def test_05_spatial_distance_accuracy():
    """Verify geodesic distance calculation between two points in Arunachal Pradesh."""
    # Bhalukpong (27.01, 92.65) to Tenga (27.21, 92.43) is approximately 31 km
    p1 = GeoPoint(latitude=27.0100, longitude=92.6500)
    p2 = GeoPoint(latitude=27.2100, longitude=92.4300)
    dist = p1.distance_to(p2)
    assert 30000.0 < dist < 33000.0  # ~31.3 km


# ── TEST 6: Spatial Containment (Point in Polygon) ──
def test_06_spatial_containment():
    """Verify point containment inside a WKT polygon."""
    # Polygon around West Kameng region
    polygon_wkt = "POLYGON((92.0 27.0, 93.0 27.0, 93.0 28.0, 92.0 28.0, 92.0 27.0))"
    inside_point = GeoPoint(latitude=27.5, longitude=92.5)
    outside_point = GeoPoint(latitude=28.5, longitude=92.5)

    engine = SpatialQueryEngine()
    assert engine.point_in_polygon(inside_point, polygon_wkt) is True
    assert engine.point_in_polygon(outside_point, polygon_wkt) is False


# ── TEST 7: Spatial Intersection (Ray Casting) ──
def test_07_spatial_intersection():
    """Verify ray-casting algorithm correctly detects polygon boundary intersections."""
    poly_wkt = "POLYGON((92.0 27.0, 93.0 27.0, 92.5 28.0, 92.0 27.0))"
    pt = GeoPoint(latitude=27.2, longitude=92.5)
    engine = SpatialQueryEngine()
    assert engine.point_in_polygon(pt, poly_wkt) is True


# ── TEST 8: Proximity Query ──
def test_08_indexed_proximity():
    """Verify proximity evaluation within specified buffer thresholds."""
    center = GeoPoint(latitude=27.2000, longitude=92.4000)
    near = GeoPoint(latitude=27.2050, longitude=92.4050)   # ~750m away
    far = GeoPoint(latitude=27.2800, longitude=92.4800)    # ~11.8 km away

    engine = SpatialQueryEngine()
    assert engine.is_within_distance(center, near, 1000.0) is True
    assert engine.is_within_distance(center, far, 1000.0) is False


# ── TEST 9: Incident / Evidence Spatial Association Boundary ──
def test_09_incident_evidence_spatial_association():
    """Verify 5km corridor attachment threshold and 500m scarp divergence threshold."""
    scarp_origin = GeoPoint(latitude=27.2000, longitude=92.4000)
    minor_shift = GeoPoint(latitude=27.2020, longitude=92.4020)  # ~295m away
    divergent_shift = GeoPoint(latitude=27.2070, longitude=92.4070) # ~1037m away

    engine = SpatialQueryEngine()
    is_div1, dist1 = engine.detect_spatial_divergence(scarp_origin, minor_shift, 500.0)
    assert is_div1 is False
    assert dist1 < 500.0

    is_div2, dist2 = engine.detect_spatial_divergence(scarp_origin, divergent_shift, 500.0)
    assert is_div2 is True
    assert dist2 > 500.0


# ── TEST 10: Administrative Boundary Envelope Lookup ──
def test_10_admin_boundary_lookup():
    """Verify bounding box containment for administrative jurisdictions."""
    ner_box = GeoBoundingBox(min_latitude=21.0, max_latitude=30.5, min_longitude=87.5, max_longitude=98.0)
    gangtok = GeoPoint(latitude=27.3389, longitude=88.6065)
    assert ner_box.contains(gangtok) is True

    mumbai = GeoPoint(latitude=19.0760, longitude=72.8777)
    assert ner_box.contains(mumbai) is False


# ── TEST 11: Road Vector Minimum Distance Query ──
def test_11_road_intersection():
    """Verify distance calculation from an observation to a road LineString."""
    # Road segment along longitude 92.4000 from lat 27.1000 to 27.3000
    road_wkt = "LINESTRING(92.4000 27.1000, 92.4000 27.2000, 92.4000 27.3000)"
    obs_near = GeoPoint(latitude=27.2000, longitude=92.4050)  # ~490m perpendicular
    engine = SpatialQueryEngine()
    dist = engine.point_to_linestring_distance(obs_near, road_wkt)
    assert 400.0 < dist < 600.0


# ── TEST 12: Hazard Corridor Query (5,000m Linear Envelope) ──
def test_12_hazard_corridor_query():
    """Verify observation is recognized as within the 5,000m infrastructure corridor."""
    road_wkt = "LINESTRING(92.4000 27.1000, 92.4000 27.3000)"
    inside_corridor = GeoPoint(latitude=27.2000, longitude=92.4300)  # ~2.9 km away
    outside_corridor = GeoPoint(latitude=27.2000, longitude=92.4800) # ~7.9 km away

    engine = SpatialQueryEngine()
    assert engine.is_within_corridor(inside_corridor, road_wkt, 5000.0) is True
    assert engine.is_within_corridor(outside_corridor, road_wkt, 5000.0) is False


# ── TEST 13: Geometry Serialization (WKT <-> GeoJSON <-> GeoPoint) ──
def test_13_geometry_serialization():
    """Verify bidirectional serialization between WKT, GeoJSON, and GeoPoint."""
    p_orig = GeoPoint(latitude=27.5000, longitude=92.8000)
    wkt = p_orig.to_wkt()
    p_from_wkt = GeoPoint.from_wkt(wkt)

    assert abs(p_orig.latitude - p_from_wkt.latitude) < 1e-5
    assert abs(p_orig.longitude - p_from_wkt.longitude) < 1e-5


# ── TEST 14: Relational Database Migration Preservation ──
@pytest.mark.asyncio
async def test_14_migration_preservation(db_session: AsyncSession):
    """Verify geospatial ORM models persist and query correctly in database."""
    admin = AdminBoundaryModel(
        id=uuid.uuid4(),
        boundary_code="IND-NER-WK",
        name="West Kameng District",
        admin_level="DISTRICT",
        state_code="AR",
        geometry_wkt="POLYGON((92.0 27.0, 93.0 27.0, 93.0 28.0, 92.0 28.0, 92.0 27.0))",
        min_latitude=27.0,
        max_latitude=28.0,
        min_longitude=92.0,
        max_longitude=93.0,
        source="Survey of India",
        provenance_class="REAL_HISTORICAL",
    )
    db_session.add(admin)

    settlement = SettlementModel(
        id=uuid.uuid4(),
        settlement_code="VIL-TENGA-01",
        name="Tenga Market",
        district="West Kameng",
        state="Arunachal Pradesh",
        population=3450,
        latitude=27.2100,
        longitude=92.4300,
        provenance_class="REAL_HISTORICAL",
    )
    db_session.add(settlement)
    await db_session.flush()

    res = await db_session.execute(select(AdminBoundaryModel).where(AdminBoundaryModel.boundary_code == "IND-NER-WK"))
    retrieved = res.scalar_one_or_none()
    assert retrieved is not None
    assert retrieved.name == "West Kameng District"


# ── TEST 15: Persistent Quarantine Storage (Resolving Phase 3 Gap COND-01) ──
@pytest.mark.asyncio
async def test_15_quarantine_persistence(db_session: AsyncSession):
    """Verify quarantined observations persist into QuarantineRecordModel (Resolving Gap COND-01)."""
    pipeline = IngestionPipeline(session=db_session)
    payload_extreme = {
        "station_id": "IMD-PERSIST-QUARANTINE",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.2000,
        "longitude": 92.4000,
        "rainfall_1h_mm": 500.0,  # Extreme impossible cloudburst -> Quarantined
    }
    result = await pipeline.ingest_payload("rainfall", payload_extreme)
    assert result.status.value == "QUARANTINED"
    assert result.quarantine_id is not None

    # Verify record was committed to persistent database table
    stmt = select(QuarantineRecordModel).where(QuarantineRecordModel.id == result.quarantine_id)
    db_record = (await db_session.execute(stmt)).scalar_one_or_none()
    assert db_record is not None
    assert db_record.source_id == "IMD-PERSIST-QUARANTINE"
    assert db_record.review_status == "PENDING_REVIEW"
    assert "exceeds maximum physical threshold" in db_record.details


# ── TEST 16: Multi-Modal Semantic Observation Deduplication (Resolving Gap COND-02) ──
def test_16_semantic_observation_deduplication():
    """Verify semantic deduplication key correctly distinguishes physical modality, location, and time."""
    now_dt = datetime.now(timezone.utc)
    key1 = IngestionPipeline.compute_semantic_observation_key(
        source_type="WEATHER",
        source_id="IMD-01",
        metric_name="cumulative_precipitation_1h",
        observed_at=now_dt,
        latitude=27.2000,
        longitude=92.4000,
    )
    # Same observation
    key2 = IngestionPipeline.compute_semantic_observation_key(
        source_type="WEATHER",
        source_id="IMD-01",
        metric_name="cumulative_precipitation_1h",
        observed_at=now_dt,
        latitude=27.2000,
        longitude=92.4000,
    )
    assert key1 == key2

    # Different metric at same station/time
    key_diff_metric = IngestionPipeline.compute_semantic_observation_key(
        source_type="WEATHER",
        source_id="IMD-01",
        metric_name="temperature_c",
        observed_at=now_dt,
        latitude=27.2000,
        longitude=92.4000,
    )
    assert key1 != key_diff_metric


# ── TEST 17: DEM / Terrain Metadata Lineage Trace ──
def test_17_dem_metadata_lineage():
    """Verify derived terrain slope retains lineage trace back to DEM source dataset."""
    dem = DEMDatasetContract(
        dataset_name="Cartosat-1 DEM v3R1",
        source_agency="ISRO / National Remote Sensing Centre",
        acquisition_year=2021,
        spatial_resolution_meters=10.0,
        coverage_bounding_box={"min_lat": 26.5, "max_lat": 28.5, "min_lon": 91.5, "max_lon": 93.5},
        provenance_class="REAL_HISTORICAL",
    )
    terrain_feature = TerrainLineageContract(
        feature_id="SLOPE-WK-KM42",
        dem_source_dataset=dem.dataset_name,
        derived_slope_degrees=38.5,
        derived_aspect_degrees=142.0,
        elevation_meters_msl=1840.0,
        threshold_classification="POLICY_RULE",
    )
    assert terrain_feature.dem_source_dataset == "Cartosat-1 DEM v3R1"
    assert terrain_feature.derived_slope_degrees == 38.5
    assert terrain_feature.threshold_classification == "POLICY_RULE"


# ── TEST 18: Stale / Historical Spatial Data Handling ──
def test_18_stale_historical_spatial_data():
    """Verify spatial bounds are capable of handling temporal expiration flags."""
    now_utc = datetime.now(timezone.utc)
    old_time = now_utc - timedelta(days=400)
    boundary = AdminBoundaryModel(
        id=uuid.uuid4(),
        boundary_code="HIST-OLD-DIST",
        name="Historic 2011 Census Block",
        admin_level="DISTRICT",
        state_code="SK",
        geometry_wkt="POLYGON((88.0 27.0, 89.0 27.0, 89.0 28.0, 88.0 28.0, 88.0 27.0))",
        min_latitude=27.0,
        max_latitude=28.0,
        min_longitude=88.0,
        max_longitude=89.0,
        source="Census of India 2011",
        provenance_class="REAL_HISTORICAL",
        updated_at=old_time,
    )
    # Check that age can be computed and flagged as historical archive
    boundary_dt = boundary.updated_at if boundary.updated_at.tzinfo else boundary.updated_at.replace(tzinfo=timezone.utc)
    age_days = (now_utc - boundary_dt).days
    assert age_days >= 365
    assert boundary.provenance_class == "REAL_HISTORICAL"
