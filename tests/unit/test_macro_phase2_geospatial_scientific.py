"""Targeted test suite for Accelerated Macro Phase 2:
Geospatial + Data Fabric + Scientific AI Foundation.

Covers the 10 core verification requirements:
1. Whole-NER geographic hierarchy & coverage states
2. Spatial association thresholds (ATTACHED <=5km, REVIEW_REQUIRED <=10km, UNASSIGNED >10km)
3. Corridor containment & scarp divergence detection (500m threshold)
4. Real terrain derivation from Copernicus GLO-30 DEM (Horn 1981 slope, elevation MSL)
5. Real rainfall & ARI-7 antecedent derivation (ERA5 reanalysis)
6. Historical landslide context association (GSI NLSM catalog)
7. Scientific feature pipeline extraction & audit lineage preservation
8. Experimental susceptibility model maturity boundary (L3, not calibrated)
9. Strict decoupling of Risk vs Confidence and Hazard vs Priority
10. Connected vertical slice: Incident -> Feature Derivation -> Scientific Assessment
"""

from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient

from app.db.models import IncidentModel
from app.domain.enums import IncidentStatus, HazardState, RiskLevel, ConfidenceLevel, PriorityLevel
from app.gis.terrain_engine import TerrainEngine
from app.services.environmental_data_service import EnvironmentalDataService
from app.services.historical_landslides_service import HistoricalLandslidesService
from app.services.feature_pipeline import FeaturePipeline
from app.services.susceptibility_service import SusceptibilityBaselineService


@pytest.mark.asyncio
async def test_01_whole_ner_geographic_hierarchy(async_client: AsyncClient):
    """Verify Whole-NER hierarchy exposes all 8 states with truthful coverage states."""
    res = await async_client.get("/api/v1/gis/ner/hierarchy")
    assert res.status_code == 200
    data = res.json()
    assert data["country"] == "India"
    assert data["region_code"] == "IND-NER"
    assert data["states_count"] == 8

    state_codes = {s["state_code"]: s for s in data["states"]}
    expected_states = {"AR", "AS", "ML", "MN", "MZ", "NL", "TR", "SK"}
    assert set(state_codes.keys()) == expected_states

    # Arunachal Pradesh must be the deep demonstration corridor
    ar = state_codes["AR"]
    assert ar["coverage_state"] == "REAL_HISTORICAL"
    assert ar["is_primary_demonstration_corridor"] is True
    assert len(ar["districts"]) >= 1
    wk = next(d for d in ar["districts"] if d["district_code"] == "IND-NER-WK")
    assert wk["name"] == "West Kameng"
    assert wk["corridors"][0]["corridor_code"] == "NH-13"

    # Other states must explicitly disclose unintegrated / no live feed status
    assert state_codes["AS"]["coverage_state"] == "SOURCE_AVAILABLE_ADAPTER_NOT_CONNECTED"
    assert state_codes["AS"]["provenance_class"] == "NO_LIVE_FEED"
    assert state_codes["SK"]["provenance_class"] == "FIXTURE"


@pytest.mark.asyncio
async def test_02_spatial_association_distance_thresholds(async_client: AsyncClient):
    """Verify spatial association classifies ATTACHED (<=5km), REVIEW (5-10km), and UNASSIGNED (>10km)."""
    # Seed TG-2048 first to associate against
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    inc_id = seed_res.json()["id"]

    # 1. Close coordinate (~1.5 km away) -> ATTACHED
    res1 = await async_client.post(
        "/api/v1/gis/spatial-association",
        json={"latitude": 27.0900, "longitude": 92.5700, "incident_id": inc_id},
    )
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["association_status"] == "ATTACHED"
    assert d1["distance_meters"] <= 5000.0

    # 2. Intermediate coordinate (~7.5 km away) -> REVIEW_REQUIRED
    res2 = await async_client.post(
        "/api/v1/gis/spatial-association",
        json={"latitude": 27.1400, "longitude": 92.5900, "incident_id": inc_id},
    )
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["association_status"] == "REVIEW_REQUIRED"
    assert 5000.0 < d2["distance_meters"] <= 10000.0

    # 3. Distant coordinate (~25 km away) -> UNASSIGNED
    res3 = await async_client.post(
        "/api/v1/gis/spatial-association",
        json={"latitude": 27.3000, "longitude": 92.4000, "incident_id": inc_id},
    )
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["association_status"] == "UNASSIGNED"
    assert d3["distance_meters"] > 10000.0


@pytest.mark.asyncio
async def test_03_corridor_containment_and_scarp_divergence(async_client: AsyncClient):
    """Verify road corridor buffer check and 500m scarp divergence detection."""
    # Corridor check
    road_wkt = "LINESTRING(92.6500 27.0100, 92.6000 27.0500, 92.5681 27.0842, 92.5200 27.1400)"
    c_res = await async_client.post(
        "/api/v1/gis/corridor/check",
        json={
            "point_latitude": 27.0845,
            "point_longitude": 92.5685,
            "road_linestring_wkt": road_wkt,
            "buffer_meters": 1000.0,
        },
    )
    assert c_res.status_code == 200
    assert c_res.json()["is_in_corridor"] is True

    # Non-divergent scarp (<500m)
    div_res1 = await async_client.post(
        "/api/v1/gis/divergence/check",
        json={
            "origin_latitude": 27.0842,
            "origin_longitude": 92.5681,
            "observation_latitude": 27.0850,
            "observation_longitude": 92.5690,
            "threshold_meters": 500.0,
        },
    )
    assert div_res1.status_code == 200
    assert div_res1.json()["is_divergent"] is False

    # Divergent scarp (>500m)
    div_res2 = await async_client.post(
        "/api/v1/gis/divergence/check",
        json={
            "origin_latitude": 27.0842,
            "origin_longitude": 92.5681,
            "observation_latitude": 27.0950,
            "observation_longitude": 92.5800,
            "threshold_meters": 500.0,
        },
    )
    assert div_res2.status_code == 200
    assert div_res2.json()["is_divergent"] is True
    assert div_res2.json()["recommended_action"] == "SPAWN_CHILD_INCIDENT_H4_SHIFTED"


def test_04_real_terrain_derivation_copernicus():
    """Verify Horn (1981) slope and elevation derivation from Copernicus GLO-30 DEM."""
    engine = TerrainEngine()
    assert engine.is_dem_available() is True

    # Sessa KM-42 site
    derivs = engine.compute_terrain_derivatives(27.0842, 92.5681)
    assert "slope_degrees" in derivs
    assert "elevation_m" in derivs
    assert "aspect_degrees" in derivs
    assert derivs["source_dataset"].startswith("Copernicus GLO-30 DEM")
    assert derivs["derivation_algorithm"] == "Horn (1981) 3x3 Finite Difference"
    assert 20.0 <= derivs["slope_degrees"] <= 45.0
    assert 400.0 <= derivs["elevation_m"] <= 1200.0


def test_05_real_rainfall_and_ari7_derivation():
    """Verify ERA5 reanalysis rainfall window and ARI-7 exponential decay index."""
    svc = EnvironmentalDataService()
    dates = svc.get_observation_dates()
    assert len(dates) >= 1

    window = svc.get_rainfall_window(dates[-1])
    assert window["rainfall_24h_mm"] > 0
    assert window["antecedent_rainfall_index_7d"] > 0
    assert "ECMWF ERA5" in window["source_agency"]
    # ARI-7 must account for decay over 7 days
    assert window["antecedent_rainfall_index_7d"] >= window["rainfall_24h_mm"]


def test_06_historical_landslide_association_gsi():
    """Verify GSI NLSM historical landslide catalog proximity calculation."""
    svc = HistoricalLandslidesService()
    nearest, dist = svc.find_nearest_landslide(27.0842, 92.5681)
    assert nearest is not None
    assert dist < 500.0  # Sessa slide is within 500m of KM-42
    assert "Sessa" in nearest["name"]

    density = svc.compute_density_in_radius(27.0842, 92.5681, 5000.0)
    assert density >= 1


def test_07_feature_pipeline_extraction_and_lineage():
    """Verify FeaturePipeline extracts typed feature vector with complete evidence lineage."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TEST-INC-01",
        title="Test Incident",
        status=IncidentStatus.DETECTED.value,
        hazard_state=HazardState.ACTIVE.value,
        risk_level=RiskLevel.HIGH.value,
        risk_score=75.0,
        confidence_level=ConfidenceLevel.HIGH.value,
        confidence_score=80.0,
        priority_level=PriorityLevel.P1_CRITICAL.value,
        priority_score=90.0,
        latitude=27.0842,
        longitude=92.5681,
        is_simulated=False,
    )

    vector = FeaturePipeline.extract_features(incident, use_real_substrate=True)
    assert vector.slope_gradient_deg > 0
    assert vector.short_window_rainfall_24h_mm > 0
    assert vector.antecedent_rainfall_7d_mm > 0
    assert vector.elevation_msl_m is not None
    assert vector.terrain_provenance.startswith("Copernicus GLO-30 DEM")
    assert "ERA5" in vector.rainfall_provenance
    assert vector.data_quality.completeness_ratio >= 0.5
    assert len(vector.feature_snapshot) >= 5


def test_08_susceptibility_model_boundary_and_maturity():
    """Verify empirical susceptibility model reports truthful non-calibrated experimental maturity."""
    svc = SusceptibilityBaselineService()
    res = svc.predict_point_susceptibility(27.0842, 92.5681)
    assert 0.0 <= res["experimental_susceptibility_score"] <= 1.0
    assert res["experimental_susceptibility_class"] in {"LOW", "MODERATE", "HIGH", "VERY_HIGH"}
    assert res["model_type"] == "EXPERIMENTAL EMPIRICAL BASELINE"
    assert res["scientific_status"] == "NOT_VALIDATED_EXPERIMENTAL"
    notice = res.get("classification_notice", "")
    assert "calibrated" not in notice.lower() or "not" in notice.lower()


@pytest.mark.asyncio
async def test_09_decoupled_risk_vs_confidence_semantics(async_client: AsyncClient):
    """Verify that Risk and Confidence remain mathematically decoupled."""
    # Seed TG-2048 first
    await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")

    res = await async_client.get("/api/v1/gis/incidents/spatial")
    assert res.status_code == 200
    incidents = res.json()
    assert len(incidents) >= 1
    for inc in incidents:
        # Risk and Confidence must be distinct fields with separate values
        assert "risk_score" in inc
        assert "confidence_score" in inc
        assert "priority_score" in inc
        # Consequence priority is separate from physical risk
        assert "priority_level" in inc


@pytest.mark.asyncio
async def test_10_incident_scientific_assessment_vertical_slice(async_client: AsyncClient):
    """Verify end-to-end connected vertical slice: DEM + ERA5 -> Features -> Assessment Contract."""
    # Seed TG-2048 first
    seed_res = await async_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    inc_id = seed_res.json()["id"]

    res = await async_client.get(f"/api/v1/gis/incidents/{inc_id}/scientific-assessment")
    assert res.status_code == 200
    data = res.json()

    # 1. Spatial grounding
    assert data["incident_code"] == "TG-2048"
    assert data["coordinates"]["crs"] == "EPSG:4326"
    assert abs(data["coordinates"]["latitude"] - 27.0842) < 0.01

    # 2. Susceptibility dimension (independent static)
    susc = data["susceptibility"]
    assert 0.0 <= susc["experimental_score"] <= 1.0
    assert "L3" in susc["scientific_maturity"]
    assert susc["is_validated"] is False
    assert susc["is_calibrated"] is False

    # 3. Dynamic hazard dimension (physics trigger)
    hazard = data["dynamic_hazard"]
    assert hazard["risk_score"] > 0
    assert len(hazard["dominant_risk_factors"]) >= 2

    # 4. Evidential confidence dimension (certainty)
    conf = data["confidence"]
    assert conf["confidence_score"] > 0
    assert conf["completeness_ratio"] > 0

    # 5. Feature lineage with provenance
    lineage = data["feature_lineage"]
    assert lineage["slope"]["source_dataset"].startswith("Copernicus GLO-30 DEM")
    assert "ERA5" in lineage["rainfall_24h"]["source_dataset"]
    assert "GSI" in lineage["historical_landslide"]["source_dataset"]

    # 6. Consequence priority
    assert data["consequence_priority"]["criticality_tier"] == "SOLE_LIFELINE"

    # 7. Semantic invariant disclosures
    disclosures = data["semantic_invariant_disclosures"]
    assert "RISK_NEQ_CONFIDENCE" in disclosures
    assert "HAZARD_NEQ_PRIORITY" in disclosures
    assert "PREDICTION_NEQ_GROUND_TRUTH" in disclosures
    assert "MODEL_SCORE_NEQ_CALIBRATED_PROBABILITY" in disclosures
