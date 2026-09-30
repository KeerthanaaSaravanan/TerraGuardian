"""Scientific Foundation & Real Environmental Substrate Integration Tests.

Verifies:
1. Real Copernicus GLO-30 DEM raster processing and Horn (1981) slope calculation.
2. Real Historical Landslide Ground Truth loading, proximity, and density analysis.
3. Real Monsoon Rainfall Series and Antecedent Rainfall Index (ARI-7) computation.
4. Real-substrate feature extraction pipeline with strict provenance preservation.
5. End-to-end scientific assessment changing an operational incident twin.
6. Stage 1 Condition: Explicit PROPOSED -> APPROVED -> DISPATCHED operational action lifecycle.
"""

import uuid
from datetime import datetime
import pytest
from httpx import AsyncClient

from app.db.models import ActionModel, IncidentModel
from app.domain.enums import ActionState, ActorRole, ConfidenceLevel, IncidentStatus, RiskLevel
from app.gis.terrain_engine import TerrainEngine
from app.services.action_service import ActionService
from app.services.environmental_data_service import EnvironmentalDataService
from app.services.feature_pipeline import FeaturePipeline
from app.services.historical_landslides_service import HistoricalLandslidesService


def test_terrain_engine_real_copernicus_dem():
    """Verify real Copernicus GLO-30 DEM ingestion and Horn (1981) terrain derivation."""
    engine = TerrainEngine()
    assert engine.is_dem_available(), "Copernicus DEM file must exist on disk"

    # KM-42 Bhalukpong-Tenga Corridor Centroid
    lat, lon = 27.0842, 92.5681
    elev = engine.get_elevation_meters(lat, lon)
    assert 550.0 <= elev <= 700.0, f"Elevation {elev}m expected in Himalayan foothill gorge"

    derivatives = engine.compute_terrain_derivatives(lat, lon)
    assert derivatives["elevation_m"] == elev
    assert 20.0 <= derivatives["slope_degrees"] <= 35.0, f"Horn slope {derivatives['slope_degrees']}° expected"
    assert 0.0 <= derivatives["aspect_degrees"] <= 360.0
    assert "Copernicus GLO-30 DEM" in derivatives["source_dataset"]
    assert derivatives["provenance_class"] == "REAL_HISTORICAL"
    assert "Horn (1981)" in derivatives["derivation_algorithm"]

    stats = engine.compute_corridor_slope_stats(lat, lon, buffer_pixels=7)
    assert stats["min_slope"] < stats["max_slope"]
    assert stats["max_slope"] >= 40.0, "Corridor envelope must contain steep cut-slopes"


def test_historical_landslides_ground_truth_catalog():
    """Verify authoritative GSI/BRO historical landslide catalog loading and proximity."""
    svc = HistoricalLandslidesService()
    records = svc.get_all_records()
    assert len(records) >= 5, "Must load authoritative historical records for West Kameng"

    geojson = svc.to_geojson()
    assert geojson["type"] == "FeatureCollection"
    assert geojson["provenance_class"] == "REAL_HISTORICAL"
    assert len(geojson["features"]) == len(records)

    # Nearest landslide to KM-42
    nearest, dist_m = svc.find_nearest_landslide(27.0842, 92.5681)
    assert nearest is not None
    assert nearest["event_id"] == "LS-WK-2022-07-02"
    assert dist_m < 500.0, "Sessa slide must be within 500m of KM-42"
    assert nearest["field_verified"] is True

    # Spatial density within 5km
    density = svc.compute_density_in_radius(27.0842, 92.5681, 5000.0)
    assert density >= 1


def test_environmental_rainfall_series_and_ari():
    """Verify real ECMWF/GPM rainfall series and Antecedent Rainfall Index (ARI-7)."""
    svc = EnvironmentalDataService()
    dates = svc.get_observation_dates()
    assert len(dates) >= 30, "Must have at least 30 daily observations for monsoon 2024"

    # Peak monsoon day
    window = svc.get_rainfall_window("2024-06-25")
    assert window["target_date"] == "2024-06-25"
    assert window["rainfall_24h_mm"] >= 70.0, "Peak 24h rainfall must exceed 70mm"
    assert window["rainfall_72h_mm"] > window["rainfall_24h_mm"]
    assert window["antecedent_rainfall_index_7d"] > 100.0, "7-day ARI must reflect severe monsoon saturation"
    assert window["decay_factor"] == 0.80
    assert window["provenance_class"] == "REAL_HISTORICAL"


def test_feature_pipeline_real_substrate_provenance():
    """Verify feature pipeline extracts real terrain and environmental features with explicit provenance."""
    inc = IncidentModel(
        id=uuid.uuid4(),
        code="TG-REAL-TEST",
        title="NH-13 Corridor Real Assessment Test",
        latitude=27.0842,
        longitude=92.5681,
        is_simulated=False,
    )

    vector = FeaturePipeline.extract_features(inc, use_real_substrate=True)

    # Must reflect real Copernicus DEM, not 44.2° fixture
    assert vector.slope_gradient_deg == pytest.approx(25.65, abs=0.5)
    assert vector.elevation_msl_m == pytest.approx(618.4, abs=5.0)
    assert "Copernicus GLO-30 DEM" in vector.terrain_provenance

    # Must reflect real GSI NLSM landslide proximity
    assert vector.nearest_historical_landslide_dist_m is not None
    assert vector.nearest_historical_landslide_dist_m < 500.0
    assert vector.nearest_historical_landslide_name == "Sessa Waterfall Debris Slide (KM-42)"

    # Must reflect real rainfall
    assert vector.short_window_rainfall_24h_mm > 0.0
    assert "ECMWF" in vector.rainfall_provenance or "Open-Meteo" in vector.rainfall_provenance


@pytest.mark.asyncio
async def test_action_lifecycle_proposed_to_approved_to_dispatched(test_client: AsyncClient):
    """Verify Stage 1 Action Lifecycle condition: PROPOSED -> APPROVED -> DISPATCHED."""
    # Seed demo users and login as operator
    await test_client.post("/api/v1/auth/seed-demo-users")
    login_res = await test_client.post(
        "/api/v1/auth/login",
        json={"username": "operator", "password": "Terra#Op2026"},
    )
    assert login_res.status_code == 200
    op_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {op_token}"}

    # Seed baseline demonstration incident
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    incident_id = seed_res.json()["id"]

    # 1. Create action in PROPOSED state
    create_res = await test_client.post(
        f"/api/v1/incidents/{incident_id}/actions",
        headers=headers,
        json={
            "task_code": "TSK-LIFECYCLE-01",
            "agency": "Border Roads Organisation",
            "title": "Deploy Excavator to Clear Culvert 42/1",
            "description": "Clear debris accumulation blocking cross-drainage culvert",
            "assigned_to": "Officer Commanding BRO 85 RCC",
        },
    )
    assert create_res.status_code == 201
    action_data = create_res.json()
    action_id = action_data["id"]
    assert action_data["state"] == ActionState.PROPOSED.value

    # 2. Advance PROPOSED -> APPROVED
    appr_res = await test_client.post(
        f"/api/v1/actions/{action_id}/transitions",
        headers=headers,
        json={
            "target_state": ActionState.APPROVED.value,
            "actor_role": ActorRole.OPERATOR.value,
            "reason": "Geotechnical risk confirmed. Task approved for execution.",
        },
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["state"] == ActionState.APPROVED.value

    # 3. Advance APPROVED -> DISPATCHED
    disp_res = await test_client.post(
        f"/api/v1/actions/{action_id}/transitions",
        headers=headers,
        json={
            "target_state": ActionState.DISPATCHED.value,
            "actor_role": ActorRole.OPERATOR.value,
            "reason": "Mobilization order transmitted via VHF net.",
        },
    )
    assert disp_res.status_code == 200
    assert disp_res.json()["state"] == ActionState.DISPATCHED.value

    # 4. Advance DISPATCHED -> ACKNOWLEDGED
    ack_res = await test_client.post(
        f"/api/v1/actions/{action_id}/transitions",
        headers=headers,
        json={
            "target_state": ActionState.ACKNOWLEDGED.value,
            "actor_role": ActorRole.OPERATOR.value,
            "reason": "Order acknowledged by mobile unit.",
        },
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["state"] == ActionState.ACKNOWLEDGED.value


@pytest.mark.asyncio
async def test_e2e_real_environmental_reassessment(test_client: AsyncClient):
    """Verify end-to-end scientific assessment: Real DEM + Real Rainfall changes operational incident twin."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    inc_data = seed_res.json()
    incident_id = inc_data["id"]
    initial_version = inc_data.get("assessment_version", 0)

    # 1. Query Real Terrain API
    t_res = await test_client.get(
        f"/api/v1/gis/terrain/query?latitude=27.0842&longitude=92.5681"
    )
    assert t_res.status_code == 200
    t_data = t_res.json()
    assert t_data["elevation_m"] == pytest.approx(618.4, abs=5.0)
    assert t_data["slope_degrees"] == pytest.approx(25.65, abs=0.5)
    assert "Copernicus GLO-30 DEM" in t_data["source_dataset"]

    # 2. Query Historical Landslides Layer
    ls_res = await test_client.get("/api/v1/gis/layers/historical-landslides")
    assert ls_res.status_code == 200
    ls_data = ls_res.json()
    assert ls_data["type"] == "FeatureCollection"
    assert len(ls_data["features"]) >= 5

    # 3. Query Rainfall Series API
    r_res = await test_client.get("/api/v1/gis/environmental/rainfall-series?target_date=2024-06-25")
    assert r_res.status_code == 200
    r_data = r_res.json()
    assert r_data["latest_window"]["rainfall_24h_mm"] >= 70.0

    # 4. Trigger Real Environmental Reassessment
    reassess_res = await test_client.post(
        "/api/v1/gis/environmental/reassess-with-real-data",
        json={"incident_id": incident_id, "target_date": "2024-06-25"},
    )
    assert reassess_res.status_code == 200
    re_data = reassess_res.json()
    assert re_data["status"] == "REASSESSED_WITH_REAL_ENVIRONMENTAL_DATA"
    assert re_data["assessment_version"] > initial_version
    assert re_data["real_terrain"]["slope_degrees"] == pytest.approx(25.65, abs=0.5)
    assert re_data["real_rainfall"]["rainfall_24h_mm"] >= 70.0

    # 5. Verify Incident Twin reflects updated assessment
    get_inc = await test_client.get(f"/api/v1/incidents/{incident_id}")
    assert get_inc.status_code == 200
    updated_inc = get_inc.json()
    assert updated_inc["assessment_version"] == re_data["assessment_version"]
    assert updated_inc["risk_score"] == re_data["updated_risk_score"]
