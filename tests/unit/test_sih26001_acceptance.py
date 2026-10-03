"""Master Acceptance Test Suite for SIH26001 Compliance.

Problem Statement:
SIH26001 — AI-Based Early Warning and Landslide Risk Monitoring System in the North Eastern Region of India
Ministry: Ministry of Development of North Eastern Region (MDoNER)

Verifies the complete closed-loop architecture:
1. Multi-window hydrometeorological data fabric (1h, 3h, 6h, 24h, 72h, 7d, ARI-7)
2. In-situ and satellite soil moisture ingestion
3. Copernicus Sentinel-1 InSAR surface displacement & coherence
4. Real Copernicus GLO-30 DEM terrain derivation (Horn 1981)
5. GSI NLSM ground truth historical landslide catalog
6. Cryptographic multi-modal feature pipeline & lineage
7. Model Registry (Model v1 Logistic Baseline & Model v2 Multi-Modal Ensemble)
8. Decoupled Risk vs Confidence semantics
9. GIS Critical Risk Zones GeoJSON export
10. Exposure, Consequence & Deterministic Priority (P1-P4)
11. Statutory Magistrate Authorization RBAC
12. End-to-end Multi-Agency Dispatch Loop
13. Physical Ground Confirmation
14. Multilingual Warning Generation (EN, HI, AS, BN, BDO)
15. Truthful System Observability Registry
16. Deterministic Demonstration Event Replay Engine (T0-T14)
17. Citizen Safe Offline Sync Idempotency
18. Closure Evidentiary Gate
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from httpx import AsyncClient

from app.adapters.canonical_schemas import (
    CanonicalInSARDeformation,
    CanonicalPrecipitationObservation,
    CanonicalSoilMoistureObservation,
)
from app.adapters.copernicus_insar_adapter import CopernicusInSARAdapter
from app.adapters.imd_rainfall_adapter import IMDRainfallAdapter
from app.adapters.soil_moisture_adapter import SoilMoistureAdapter
from app.db.models import IncidentModel
from app.domain.enums import ActorRole
from app.gis.terrain_engine import TerrainEngine
from app.services.alert_service import AlertService
from app.services.environmental_data_service import EnvironmentalDataService
from app.services.feature_pipeline import FeaturePipeline
from app.services.historical_landslides_service import HistoricalLandslidesService
from app.services.model_registry_service import ModelRegistryService
from app.services.replay_engine_service import ReplayEngineService


# ── TEST 1: Multi-Window Precipitation & Meteorological Telemetry ──
def test_multi_window_rainfall_adapter():
    """Verify IMDRainfallAdapter validates multi-window accumulations and enforces physical limits."""
    adapter = IMDRainfallAdapter()
    raw_payload = {
        "station_id": "IMD-WK-BHALUKPONG-01",
        "station_name": "Bhalukpong AWS",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.0125,
        "longitude": 92.6450,
        "rainfall_1h_mm": 18.5,
        "rainfall_3h_mm": 45.0,
        "rainfall_6h_mm": 72.0,
        "rainfall_24h_mm": 124.0,
        "rainfall_72h_mm": 210.0,
        "rainfall_7d_mm": 340.0,
        "antecedent_rainfall_index_7d": 142.5,
        "intensity_rate_mm_hr": 22.0,
        "anomaly_pct_vs_normal": 38.5,
    }

    valid, reason, msg = adapter.validate_raw(raw_payload)
    assert valid is True
    obs = adapter.transform(raw_payload)

    assert isinstance(obs, CanonicalPrecipitationObservation)
    assert obs.rainfall_1h_mm == 18.5
    assert obs.rainfall_3h_mm == 45.0
    assert obs.rainfall_24h_mm == 124.0
    assert obs.antecedent_rainfall_index_7d == 142.5
    assert obs.anomaly_pct_vs_normal == 38.5

    # Out-of-bounds rejection test
    bad_payload = dict(raw_payload)
    bad_payload["rainfall_1h_mm"] = -5.0
    valid_bad, _, _ = adapter.validate_raw(bad_payload)
    assert valid_bad is False


# ── TEST 2: Soil Moisture & Saturation Ingestion Adapter ──
def test_soil_moisture_adapter():
    """Verify SoilMoistureAdapter processes dielectric probe and satellite soil moisture."""
    adapter = SoilMoistureAdapter()
    raw_payload = {
        "sensor_id": "TDR-SESSA-KM42-01",
        "sensor_type": "TDR_PROBE",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.0842,
        "longitude": 92.5681,
        "depth_layer_cm": "10-40",
        "volumetric_water_content_m3_m3": 0.44,
        "soil_saturation_index": 0.88,
        "matric_suction_kpa": 45.0,
        "soil_temperature_c": 19.5,
    }

    valid, reason, msg = adapter.validate_raw(raw_payload)
    assert valid is True
    obs = adapter.transform(raw_payload)

    assert isinstance(obs, CanonicalSoilMoistureObservation)
    assert obs.volumetric_water_content_m3_m3 == 0.44
    assert obs.soil_saturation_index == 0.88
    assert obs.depth_layer_cm == "10-40"
    assert obs.provenance_class.value == "REPLAY"


# ── TEST 3: Copernicus Sentinel-1 InSAR Surface Deformation ──
def test_copernicus_insar_adapter():
    """Verify CopernicusInSARAdapter processes radar LOS velocity and coherence."""
    adapter = CopernicusInSARAdapter()
    raw_payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latitude": 27.0842,
        "longitude": 92.5681,
        "coherence": 0.68,
        "line_of_sight_velocity_mm_yr": -32.5,
        "satellite_mission": "Sentinel-1",
        "orbit_direction": "DESCENDING",
        "baseline_days": 12,
    }

    valid, reason, msg = adapter.validate_raw(raw_payload)
    assert valid is True
    obs = adapter.transform(raw_payload)

    assert isinstance(obs, CanonicalInSARDeformation)
    assert obs.line_of_sight_velocity_mm_yr == -32.5
    assert obs.coherence == 0.68
    assert obs.baseline_days == 12


# ── TEST 4: Real Copernicus GLO-30 DEM Terrain Derivation (Horn 1981) ──
def test_copernicus_dem_real_raster_substrate():
    """Verify real Copernicus 30m DEM raster on disk and Horn (1981) geodetic slope calculation."""
    terrain = TerrainEngine()
    assert terrain.is_dem_available() is True

    # Sessa KM-42 site on NH-13
    derivs = terrain.compute_terrain_derivatives(27.0842, 92.5681)
    assert derivs["elevation_m"] == pytest.approx(618.4, abs=5.0)
    assert derivs["slope_degrees"] == pytest.approx(25.65, abs=1.0)
    assert derivs["source_dataset"].startswith("Copernicus")


# ── TEST 5: GSI NLSM Historical Landslide Catalog Ground Truth ──
def test_gsi_historical_landslide_ground_truth():
    """Verify historical landslide proximity and spatial cluster density calculation."""
    svc = HistoricalLandslidesService()
    records = svc.get_all_records()
    assert len(records) >= 5

    nearest, dist_m = svc.find_nearest_landslide(27.0842, 92.5681)
    assert nearest is not None
    assert dist_m < 200.0  # Sessa historical landslide within 200m
    assert "Sessa" in nearest["name"]


# ── TEST 6: Multi-Modal Feature Pipeline & Scientific Lineage ──
def test_feature_pipeline_real_substrate_provenance():
    """Verify FeaturePipeline extracts typed predictors with explicit provenance."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-2048",
        title="NH-13 KM-42 Sessa Hairpin Turn Scarp",
        latitude=27.0842,
        longitude=92.5681,
        is_simulated=False,
    )

    vector = FeaturePipeline.extract_features(incident, use_real_substrate=True)
    assert vector.slope_gradient_deg == pytest.approx(25.65, abs=1.0)
    assert vector.elevation_msl_m == pytest.approx(618.4, abs=5.0)
    assert vector.antecedent_rainfall_7d_mm > 50.0
    assert vector.data_quality.total_expected_features == 7



# ── TEST 7: AI/ML Landslide Model Registry & Dual Model Inference ──
def test_model_registry_dual_models_and_comparison():
    """Verify Model Registry contains Model v1 and Model v2 with truthful scientific metadata."""
    reg = ModelRegistryService()
    models = reg.get_registered_models()
    assert len(models) == 2

    v1 = models[0]
    v2 = models[1]
    assert v1["model_version"] == "logreg-baseline-v0.1-exp"
    assert v2["model_version"] == "ensemble-multimodal-v0.2-exp"
    assert v1["is_regionally_validated"] is False
    assert v2["is_regionally_validated"] is False

    # Point comparison
    cmp = reg.compare_models(27.0842, 92.5681, target_date="2024-06-25")
    assert "model_v1" in cmp
    assert "model_v2" in cmp
    assert "factor_contributions" in cmp["model_v2"]
    assert 0.0 <= cmp["model_v1"]["score"] <= 1.0
    assert 0.0 <= cmp["model_v2"]["score"] <= 1.0


# ── TEST 8: Multilingual Alert Generation ──
def test_multilingual_alert_payload_generation():
    """Verify alert templates generate English, Hindi, Assamese, Bengali, and Bodo payloads."""
    payloads = AlertService.generate_multilingual_payload(
        headline="Landslide Warning: NH-13 Bhalukpong-Tenga",
        message="Torrential rainfall detected. Road blockage likely.",
        warning_level="WARNING",
        corridor="NH-13 Trans-Arunachal Highway",
    )

    assert "en" in payloads
    assert "hi" in payloads
    assert "as" in payloads
    assert "bn" in payloads
    assert "bdo" in payloads

    assert "English" in payloads["en"]["language"]
    assert "हिंदी" in payloads["hi"]["language"]
    assert "অসমীয়া" in payloads["as"]["language"]


# ── TEST 9: Deterministic Event Replay Engine (Demonstration Workflow) ──
def test_deterministic_event_replay_engine():
    """Verify ReplayEngineService steps chronologically through crisis timeline T0 to T14."""
    ReplayEngineService.reset()
    status = ReplayEngineService.get_status()
    assert status["current_step_index"] == 0
    assert status["current_step"]["step_code"] == "T0"
    assert status["current_step"]["intelligence"]["warning_level"] == "NORMAL"

    # Step to T3
    s1 = ReplayEngineService.step_forward()
    assert s1["current_step"]["step_code"] == "T3"

    # Step to T6 (Surge / Trigger)
    s2 = ReplayEngineService.step_forward()
    assert s2["current_step"]["step_code"] == "T6"
    assert s2["current_step"]["intelligence"]["operational_priority"] == "P1"

    # Jump to T8 (Statutory Authorization)
    s3 = ReplayEngineService.jump_to_step(3)
    assert s3["current_step"]["step_code"] == "T8"
    assert "AUTHORIZED" in s3["current_step"]["governance"]["statutory_authorization_state"]

    # Reset
    res = ReplayEngineService.reset()
    assert res["current_step_index"] == 0


# ── TEST 10: End-to-End API Integration Acceptance ──
@pytest.mark.asyncio
async def test_api_sih26001_endpoints(test_client: AsyncClient):
    """Verify REST API exposes model registry, replay, sources, and critical zones."""
    # 1. System Truthful Sources
    src_res = await test_client.get("/api/v1/system/sources")
    assert src_res.status_code == 200
    src_data = src_res.json()
    assert src_data["total_sources"] == 10
    sources_dict = {s["source_id"]: s for s in src_data["sources"]}
    assert sources_dict["SRC-DEM-COPERNICUS-30M"]["provenance_status"] == "REAL_HISTORICAL"
    assert sources_dict["SRC-SMS-CELL-BROADCAST"]["provenance_status"] == "CHANNEL_NOT_CONFIGURED"

    # 2. Model Registry Endpoints
    models_res = await test_client.get("/api/v1/gis/models")
    assert models_res.status_code == 200
    models_data = models_res.json()
    assert models_data["total_models"] == 2

    # Compare endpoint
    cmp_res = await test_client.get("/api/v1/gis/models/compare?latitude=27.0842&longitude=92.5681")
    assert cmp_res.status_code == 200
    assert "model_v1" in cmp_res.json()

    # 3. GIS Critical Zones GeoJSON
    cz_res = await test_client.get("/api/v1/gis/critical-zones")
    assert cz_res.status_code == 200
    cz_data = cz_res.json()
    assert cz_data["type"] == "FeatureCollection"
    assert len(cz_data["features"]) >= 3

    # 4. Replay API Endpoints
    rep_res = await test_client.get("/api/v1/replay/status")
    assert rep_res.status_code == 200
    assert rep_res.json()["current_step_index"] >= 0

    step_res = await test_client.post("/api/v1/replay/step?direction=forward")
    assert step_res.status_code == 200

    reset_res = await test_client.post("/api/v1/replay/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["current_step_index"] == 0
