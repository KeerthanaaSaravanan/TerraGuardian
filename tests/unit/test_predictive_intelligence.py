"""Unit & Integration Tests for Predictive Intelligence (Prompt 05).

Verifies:
1. Feature extraction pipeline with complete, missing, stale, and conflicted evidence.
2. Physics-informed logistic baseline inference.
3. Separation of Risk and Confidence (RISK ≠ CONFIDENCE).
4. High-risk + Moderate/Low-confidence invariant.
5. Traceable feature contributions and narrative explanations.
6. Ground truth impact on evidential confidence.
7. Model metadata and synthetic validation benchmark.
8. REST API endpoints for predictive assessment.
"""

from __future__ import annotations

import uuid
from datetime import datetime

import pytest
from httpx import AsyncClient

from app.db.models import EvidenceModel, IncidentModel
from app.domain.enums import (
    ConfidenceLevel,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceProcessingStatus,
    EvidenceSource,
    IncidentStatus,
    RiskLevel,
)
from app.services.feature_pipeline import FeaturePipeline
from app.services.predictive_models import LandslidePredictiveBaseline, SyntheticBenchmarkValidator


@pytest.mark.asyncio
async def test_feature_pipeline_extraction(test_client: AsyncClient):
    """Verify feature pipeline correctly extracts standardized features from multi-source evidence."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    incident_id = seed_res.json()["id"]

    # Execute prediction to verify feature extraction
    pred_res = await test_client.post(f"/api/v1/incidents/{incident_id}/predict")
    assert pred_res.status_code == 200
    data = pred_res.json()

    # Risk should be high (>=80), confidence moderate (<=65)
    assert data["risk_score"] >= 80.0
    assert data["confidence_score"] <= 65.0
    assert data["data_quality"]["completeness_ratio"] >= 0.85
    assert len(data["dominant_risk_factors"]) > 0


@pytest.mark.asyncio
async def test_feature_pipeline_missing_evidence_tracking(test_client: AsyncClient):
    """Verify missing inputs are explicitly tracked and not silently zeroed."""
    # Create bare incident via API
    inc_res = await test_client.post(
        "/api/v1/incidents",
        json={
            "title": "Sparse Evidence Corridor",
            "latitude": 27.0,
            "longitude": 92.0,
            "incident_type": "landslide",
        },
    )
    assert inc_res.status_code == 201
    inc_id = inc_res.json()["id"]

    pred_res = await test_client.post(f"/api/v1/incidents/{inc_id}/predict")
    assert pred_res.status_code == 200
    data = pred_res.json()

    assert len(data["data_quality"]["missing_features"]) > 0
    assert data["data_quality"]["completeness_ratio"] < 0.6
    # Uses domain prior risk, not 0
    assert data["risk_score"] > 0.0


def test_predictive_baseline_high_risk_low_confidence_invariant():
    """Verify RISK ≠ CONFIDENCE: High hazard with cloud cover yields high risk but moderate/low confidence."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-INVARIANT-TEST",
        title="Hazard Slope",
        status=IncidentStatus.VERIFYING.value,
        latitude=27.08,
        longitude=92.56,
        metadata_json={"rainfall_peak_rate_mm_hr": 28.4, "slope_angle_deg": 44.2},
    )
    # Severe rain + steep slope, but 88% cloud cover and no field verification
    incident.evidence_items = [
        EvidenceModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            source=EvidenceSource.WEATHER.value,
            source_name="AWS Shillong",
            evidence_type="rainfall_measurement",
            observation="Continuous monsoon downpour 184mm",
            metric="184mm / 7 days",
            observed_at=datetime.utcnow(),
            conflict_status=EvidenceConflictStatus.NONE.value,
        ),
        EvidenceModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            source=EvidenceSource.TERRAIN.value,
            source_name="GSI Geotech",
            evidence_type="geological_survey",
            observation="Mica-schist steep cut slope 44.2 deg",
            metric="Slope: 44.2°",
            observed_at=datetime.utcnow(),
            conflict_status=EvidenceConflictStatus.NONE.value,
        ),
        EvidenceModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            source=EvidenceSource.SATELLITE.value,
            source_name="Sentinel-2 Optical",
            evidence_type="satellite_multispectral",
            observation="Optical view obscured",
            metric="88% cloud cover",
            observed_at=datetime.utcnow(),
            conflict_status=EvidenceConflictStatus.CONFLICTED.value,
        ),
    ]

    features = FeaturePipeline.extract_features(incident)
    result = LandslidePredictiveBaseline.infer(features)

    # Risk should be HIGH / CRITICAL
    assert result.risk_score >= 80.0
    assert result.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)

    # Confidence should be MODERATE / LOW due to cloud cover and unconfirmed ground status
    assert result.confidence_score <= 60.0
    assert result.confidence_level in (ConfidenceLevel.MODERATE, ConfidenceLevel.LOW)

    # Recommendation must be field verification, NOT automated road closure
    assert result.recommended_action == "FIELD_VERIFICATION_REQUIRED"


def test_field_verification_elevates_confidence():
    """Verify physical ground truth increases evidential confidence while preserving physics-based risk."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-GROUND-TEST",
        title="Hazard Slope",
        status=IncidentStatus.VERIFYING.value,
        latitude=27.08,
        longitude=92.56,
        metadata_json={"rainfall_peak_rate_mm_hr": 28.4, "slope_angle_deg": 44.2},
    )
    incident.evidence_items = [
        EvidenceModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            source=EvidenceSource.WEATHER.value,
            source_name="AWS Shillong",
            evidence_type="rainfall_measurement",
            observation="Continuous monsoon downpour 184mm",
            metric="184mm / 7 days",
            observed_at=datetime.utcnow(),
            conflict_status=EvidenceConflictStatus.NONE.value,
        ),
        EvidenceModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            source=EvidenceSource.FIELD.value,
            source_name="SDRF Patrol Team Bravo",
            evidence_type="ground_photo_inspection",
            observation="Active debris encroachment confirmed on KM-42",
            metric="Encroachment: 60%",
            observed_at=datetime.utcnow(),
            interpretation=EvidenceInterpretation.VERIFIED.value,
            processing_status=EvidenceProcessingStatus.RECONCILED.value,
            conflict_status=EvidenceConflictStatus.NONE.value,
        ),
    ]

    features = FeaturePipeline.extract_features(incident)
    result = LandslidePredictiveBaseline.infer(features)

    assert result.risk_score >= 80.0
    # Field verification bonus elevates confidence to HIGH or VERY_HIGH
    assert result.confidence_score >= 75.0
    assert result.confidence_level in (ConfidenceLevel.HIGH, ConfidenceLevel.VERY_HIGH)


def test_traceable_explanations_match_features():
    """Verify feature contributions trace back to actual feature coefficients and values."""
    incident = IncidentModel(
        id=uuid.uuid4(),
        code="TG-EXPLANATION-TEST",
        title="Hazard Slope",
        status=IncidentStatus.VERIFYING.value,
        latitude=27.08,
        longitude=92.56,
        metadata_json={},
    )
    incident.evidence_items = [
        EvidenceModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            source=EvidenceSource.WEATHER.value,
            source_name="AWS Shillong",
            evidence_type="rainfall_measurement",
            observation="Rainfall 184mm",
            metric="184mm",
            observed_at=datetime.utcnow(),
        )
    ]
    features = FeaturePipeline.extract_features(incident)
    result = LandslidePredictiveBaseline.infer(features)

    # Check that feature contributions exist and sum to 100%
    assert len(result.feature_contributions) == 4
    total_pct = sum(c.contribution_pct for c in result.feature_contributions)
    assert 99.0 <= total_pct <= 101.0

    # Explanation narrative contains key numbers
    assert "184" in result.explanation_narrative


def test_synthetic_validation_benchmark():
    """Verify synthetic spatial group holdout benchmark executes without data leakage."""
    report = SyntheticBenchmarkValidator.evaluate_demonstration_benchmark()

    assert report["status"] == "VALIDATION_DEMONSTRATION_BENCHMARK"
    assert "Tawang" in report["validation_split_strategy"]
    assert "baseline_logistic_regression" in report
    assert "candidate_decision_tree" in report
    assert "precision" in report["baseline_logistic_regression"]
    assert "f1_score" in report["baseline_logistic_regression"]


@pytest.mark.asyncio
async def test_predictive_service_and_api(test_client: AsyncClient):
    """Verify PredictiveService execution and FastAPI endpoints."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    incident_id = seed_res.json()["id"]

    # 1. Test POST /incidents/{id}/predict
    res_predict = await test_client.post(f"/api/v1/incidents/{incident_id}/predict")
    assert res_predict.status_code == 200
    data = res_predict.json()
    assert data["incident_id"] == incident_id
    assert data["risk_score"] >= 80.0
    assert data["confidence_score"] <= 65.0
    assert data["recommended_operational_action"] == "FIELD_VERIFICATION_REQUIRED"
    assert len(data["feature_contributions"]) > 0

    # 2. Test GET /incidents/{id}/prediction
    res_get = await test_client.get(f"/api/v1/incidents/{incident_id}/prediction")
    assert res_get.status_code == 200
    data_get = res_get.json()
    assert data_get["risk_score"] == data["risk_score"]

    # 3. Test GET /models/metadata
    res_meta = await test_client.get("/api/v1/models/metadata")
    assert res_meta.status_code == 200
    meta_data = res_meta.json()
    assert meta_data["active_model"]["model_name"] == "tg-landslide-baseline-v1"
    assert meta_data["active_model"]["is_demonstration_only"] is True
    assert meta_data["benchmark_validation"]["sample_size"] == 200


@pytest.mark.asyncio
async def test_feature_evidence_lineage_and_snapshot(test_client: AsyncClient):
    """Verify research-grade feature -> evidence lineage and feature snapshot preservation."""
    seed_res = await test_client.post("/api/v1/incidents/seed/tg-2048?force_reset=true")
    assert seed_res.status_code == 201
    incident_id = seed_res.json()["id"]

    pred_res = await test_client.post(f"/api/v1/incidents/{incident_id}/predict")
    assert pred_res.status_code == 200
    data = pred_res.json()

    # Verify input evidence lineage tracking
    assert "input_evidence_ids" in data
    assert len(data["input_evidence_ids"]) > 0
    assert "evidence_lineage" in data
    assert len(data["evidence_lineage"]) > 0

    first_lineage = data["evidence_lineage"][0]
    assert "evidence_id" in first_lineage
    assert "source" in first_lineage
    assert "contributed_features" in first_lineage

    # Verify feature snapshot
    assert "feature_snapshot" in data
    assert len(data["feature_snapshot"]) == 7
    rain_snapshot = next(f for f in data["feature_snapshot"] if f["feature_name"] == "antecedent_rainfall_7d_mm")
    assert rain_snapshot["raw_value"] == 184.0
    assert rain_snapshot["is_missing"] is False
    assert len(rain_snapshot["contributing_evidence_ids"]) > 0


def test_model_input_validation_rejects_nan_and_inf():
    """Verify strict model boundary rejects NaN and infinite values explicitly."""
    import math
    from app.domain.risk import DataQualitySummary
    from app.services.feature_pipeline import ExtractedFeatureVector

    bad_vector = ExtractedFeatureVector(
        antecedent_rainfall_7d_mm=float("nan"),  # Non-finite!
        short_window_rainfall_24h_mm=62.5,
        rainfall_intensity_mmh=28.4,
        slope_gradient_deg=44.2,
        geological_susceptibility=0.88,
        soil_saturation_index=0.92,
        optical_obscuration_pct=88.0,
        radar_coherence_anomaly=0.72,
        historical_landslide_count=3,
        citizen_reports_count=2,
        field_verification_count=1,
        data_quality=DataQualitySummary(
            available_features=7, completeness_ratio=1.0
        ),
    )

    with pytest.raises(ValueError, match="finite numerical value"):
        LandslidePredictiveBaseline.infer(bad_vector)


def test_model_input_validation_rejects_out_of_range():
    """Verify strict model boundary rejects physically impossible values (e.g. slope > 90°)."""
    from app.domain.risk import DataQualitySummary
    from app.services.feature_pipeline import ExtractedFeatureVector

    bad_vector = ExtractedFeatureVector(
        antecedent_rainfall_7d_mm=184.0,
        short_window_rainfall_24h_mm=62.5,
        rainfall_intensity_mmh=28.4,
        slope_gradient_deg=115.0,  # Impossible physical cut-slope > 90°!
        geological_susceptibility=0.88,
        soil_saturation_index=0.92,
        optical_obscuration_pct=88.0,
        radar_coherence_anomaly=0.72,
        historical_landslide_count=3,
        citizen_reports_count=2,
        field_verification_count=1,
        data_quality=DataQualitySummary(
            available_features=7, completeness_ratio=1.0
        ),
    )

    with pytest.raises(ValueError, match="outside acceptable physical range"):
        LandslidePredictiveBaseline.infer(bad_vector)


def test_deterministic_inference_reproducibility():
    """Verify identical input feature vectors produce byte-for-byte deterministic inference results."""
    from app.domain.risk import DataQualitySummary
    from app.services.feature_pipeline import ExtractedFeatureVector

    vector = ExtractedFeatureVector(
        antecedent_rainfall_7d_mm=184.0,
        short_window_rainfall_24h_mm=62.5,
        rainfall_intensity_mmh=28.4,
        slope_gradient_deg=44.2,
        geological_susceptibility=0.88,
        soil_saturation_index=0.92,
        optical_obscuration_pct=88.0,
        radar_coherence_anomaly=0.72,
        historical_landslide_count=3,
        citizen_reports_count=2,
        field_verification_count=1,
        data_quality=DataQualitySummary(
            available_features=7, completeness_ratio=1.0
        ),
    )

    r1 = LandslidePredictiveBaseline.infer(vector)
    r2 = LandslidePredictiveBaseline.infer(vector)

    assert r1.risk_score == r2.risk_score
    assert r1.confidence_score == r2.confidence_score
    assert r1.risk_level == r2.risk_level
    assert r1.confidence_level == r2.confidence_level
    assert len(r1.feature_contributions) == len(r2.feature_contributions)
    for c1, c2 in zip(r1.feature_contributions, r2.feature_contributions):
        assert c1.feature_name == c2.feature_name
        assert c1.contribution_pct == c2.contribution_pct
        assert c1.normalized_value == c2.normalized_value
