"""Tests for Assessment Convergence, What-Changed Lineage, and Empirical Susceptibility Baseline.

Verifies:
1. SusceptibilityBaselineService empirical dataset and logistic regression training.
2. Assessment evolution: reassessment records previous state and what-changed deltas.
3. REST endpoints for baseline model and assessment history.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.services.historical_landslides_service import HistoricalLandslidesService
from app.services.seed_service import SeedService
from app.services.susceptibility_service import SusceptibilityBaselineService


@pytest.mark.asyncio
async def test_susceptibility_baseline_dataset_and_training():
    """Verify empirical dataset generation and baseline logistic model fitting."""
    svc = SusceptibilityBaselineService()
    model_result = svc.train_baseline_model()

    assert model_result["model_type"] == "EXPERIMENTAL EMPIRICAL BASELINE"
    assert model_result["total_samples"] == 10  # 5 positive + 5 background control
    assert model_result["positive_samples"] == 5
    assert model_result["background_samples"] == 5
    assert model_result["scientific_status"] == "NOT_VALIDATED_EXPERIMENTAL"
    assert "slope_deg" in model_result["coefficients"]
    assert "ari_7_index" in model_result["coefficients"]
    assert 0.0 <= model_result["exploratory_training_accuracy"] <= 1.0

    # Ensure each sample has valid features
    for sample in model_result["samples"]:
        assert sample["elevation_m"] > 0
        assert sample["slope_deg"] >= 0
        assert sample["ari_7_index"] > 0
        assert sample["label"] in (0, 1)


@pytest.mark.asyncio
async def test_get_susceptibility_baseline_endpoint():
    """Test REST endpoint GET /api/v1/gis/models/susceptibility/baseline."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/gis/models/susceptibility/baseline")
        assert response.status_code == 200
        data = response.json()
        assert data["model_type"] == "EXPERIMENTAL EMPIRICAL BASELINE"
        assert data["positive_samples"] == 5
        assert len(data["samples"]) == 10


@pytest.mark.asyncio
async def test_get_susceptibility_grid_endpoint(test_client: AsyncClient):
    """Test REST endpoint GET /api/v1/gis/models/susceptibility/grid."""
    response = await test_client.get("/api/v1/gis/models/susceptibility/grid?spacing_meters=500.0")
    assert response.status_code == 200
    grid = response.json()
    assert grid["type"] == "FeatureCollection"
    assert len(grid["features"]) >= 50
    assert "metadata" in grid
    assert grid["metadata"]["corridor"] == "NH-13 (KM-30 Bhalukpong to KM-60 Tenga)"

    # Verify cell properties and truthful lineage
    cell = grid["features"][0]
    assert cell["type"] == "Feature"
    assert "geometry" in cell
    assert cell["geometry"]["type"] == "Point"
    props = cell["properties"]
    assert "cell_id" in props
    assert "chainage_km" in props
    assert "slope_degrees" in props
    assert "elevation_msl_m" in props
    assert "experimental_susceptibility_score" in props
    assert props["experimental_susceptibility_class"] in ("LOW", "MODERATE", "HIGH", "UNAVAILABLE")
    assert props["status"] in ("EXPERIMENTAL", "DATA_UNAVAILABLE")
    assert props["model_version"] == "logreg-baseline-v0.1-exp"


@pytest.mark.asyncio
async def test_get_point_susceptibility_endpoint(test_client: AsyncClient):
    """Test point-level experimental susceptibility for TG-2048 coordinates."""
    response = await test_client.get(
        "/api/v1/gis/models/susceptibility/point?latitude=27.0842&longitude=92.5681&target_date=2024-06-25"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["experimental_susceptibility_score"] is not None
    assert data["experimental_susceptibility_class"] in ("LOW", "MODERATE", "HIGH")
    assert data["model_type"] == "EXPERIMENTAL EMPIRICAL BASELINE"
    assert data["scientific_status"] == "NOT_VALIDATED_EXPERIMENTAL"
    assert data["features"]["slope_deg"] == pytest.approx(25.65, abs=0.5)
    assert data["features"]["elevation_m"] == pytest.approx(618.4, abs=5.0)
    assert "feature_lineage" in data



@pytest.mark.asyncio
async def test_assessment_convergence_and_history(test_client: AsyncClient):
    """Test that reassessment preserves previous assessment and produces what_changed records."""
    # 1. Seed initial database state
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048")
    assert seed_res.status_code == 201
    incident_id = seed_res.json()["id"]

    # 2. Check initial assessment history
    hist_before = await test_client.get(f"/api/v1/gis/incidents/{incident_id}/assessment-history")
    assert hist_before.status_code == 200
    h_data = hist_before.json()
    assert h_data["has_real_assessment"] is True
    assert h_data["current_assessment"]["data_class"] == "CONTROLLED_DEMO"

    # 3. Trigger real-data reassessment
    reassess_res = await test_client.post(
        "/api/v1/gis/environmental/reassess-with-real-data",
        json={"incident_id": incident_id, "target_date": "2024-06-25"}
    )
    assert reassess_res.status_code == 200
    reassess_data = reassess_res.json()
    assert reassess_data["status"] == "REASSESSED_WITH_REAL_ENVIRONMENTAL_DATA"
    assert reassess_data["current_assessment"]["data_class"] == "REAL_HISTORICAL"
    assert len(reassess_data["what_changed"]) >= 4

    # Verify what_changed contains slope, rainfall, and experimental susceptibility transitions
    param_names = [wc["parameter"] for wc in reassess_data["what_changed"]]
    assert "Slope Angle" in param_names
    assert "24h Monsoon Rainfall" in param_names
    assert "Experimental Baseline Susceptibility" in param_names

    # 4. Check assessment-history endpoint after reassessment
    hist_after = await test_client.get(f"/api/v1/gis/incidents/{incident_id}/assessment-history")
    assert hist_after.status_code == 200
    h_after_data = hist_after.json()
    assert h_after_data["current_assessment"]["data_class"] == "REAL_HISTORICAL"
    assert h_after_data["previous_assessment"]["data_class"] == "CONTROLLED_DEMO"
    assert len(h_after_data["what_changed"]) >= 4

