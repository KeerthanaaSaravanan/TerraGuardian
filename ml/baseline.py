"""Interpretable Predictive Baseline Models & Synthetic Benchmark for Landslide Intelligence.

Source of Truth:
1. LandslidePredictiveBaseline: Interpretable physics-informed logistic baseline
   producing independent Risk and Evidential Confidence scores.
2. SyntheticBenchmarkValidator: Spatial-group holdout validation pipeline for
   baseline vs. decision tree comparison on synthetic demonstration data.
"""

from __future__ import annotations

import math
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

# Ensure services/api is importable if running from workspace root
_api_path = Path(__file__).resolve().parent.parent / "services" / "api"
if _api_path.exists() and str(_api_path) not in sys.path:
    sys.path.insert(0, str(_api_path))

try:
    from app.domain.enums import ConfidenceLevel, RiskLevel
    from app.domain.risk import FeatureContribution
    from app.services.feature_pipeline import ExtractedFeatureVector
except ImportError:
    # Standalone fallback enums and classes for isolated data science workflows
    from enum import Enum

    class RiskLevel(str, Enum):
        CRITICAL = "CRITICAL"
        HIGH = "HIGH"
        MODERATE = "MODERATE"
        LOW = "LOW"
        NEGLIGIBLE = "NEGLIGIBLE"

    class ConfidenceLevel(str, Enum):
        VERY_HIGH = "VERY_HIGH"
        HIGH = "HIGH"
        MODERATE = "MODERATE"
        LOW = "LOW"
        VERY_LOW = "VERY_LOW"

    @dataclass
    class FeatureContribution:
        feature_name: str
        raw_value: float
        normalized_value: float
        coefficient: float
        contribution_pct: float
        description: str

    @dataclass
    class ExtractedFeatureVector:
        antecedent_rainfall_7d_mm: float
        short_window_rainfall_24h_mm: float
        rainfall_intensity_mmh: float
        slope_gradient_deg: float
        geological_susceptibility: float
        soil_saturation_index: float
        optical_obscuration_pct: float
        radar_coherence_anomaly: float
        historical_landslide_count: int
        citizen_reports_count: int
        field_verification_count: int
        data_quality: Any
        raw_feature_map: dict[str, Any] = field(default_factory=dict)


@dataclass
class ModelInferenceResult:
    """Raw inference result from predictive baseline."""

    risk_score: float
    risk_level: RiskLevel
    confidence_score: float
    confidence_level: ConfidenceLevel
    feature_contributions: list[FeatureContribution]
    dominant_risk_factors: list[str]
    explanation_narrative: str
    recommended_action: str


class LandslidePredictiveBaseline:
    """Interpretable Physics-Informed Logistic Baseline for Landslide Risk.
    
    CRITICAL INVARIANTS:
    1. RISK ≠ CONFIDENCE (Physical hazard magnitude is independent of evidential certainty).
    2. Explanations must strictly trace back to verified feature coefficients.
    3. Baseline heuristic weights reflect geotechnical domain knowledge, not empirical regression over historical field databases.
    """

    # Model Weights
    WEIGHT_7D_RAIN = 0.35
    WEIGHT_SLOPE = 0.30
    WEIGHT_GEO_SUSC = 0.20
    WEIGHT_SATURATION = 0.15

    # Center points & scaling constants for logistic normalization
    CENTER_RAIN_7D = 120.0
    SCALE_RAIN_7D = 35.0

    CENTER_SLOPE = 32.0
    SCALE_SLOPE = 7.5

    @classmethod
    def infer(cls, features: ExtractedFeatureVector) -> ModelInferenceResult:
        """Run predictive inference over an extracted feature vector."""
        # 1. Feature normalization (standardized scaling)
        z_rain = (features.antecedent_rainfall_7d_mm - cls.CENTER_RAIN_7D) / cls.SCALE_RAIN_7D
        z_slope = (features.slope_gradient_deg - cls.CENTER_SLOPE) / cls.SCALE_SLOPE
        z_geo = (features.geological_susceptibility - 0.5) * 4.0
        z_sat = (features.soil_saturation_index - 0.5) * 3.0

        # Linear Logit computation
        intercept = 0.20
        logit = (
            intercept
            + cls.WEIGHT_7D_RAIN * z_rain
            + cls.WEIGHT_SLOPE * z_slope
            + cls.WEIGHT_GEO_SUSC * z_geo
            + cls.WEIGHT_SATURATION * z_sat
        )

        # Sigmoid probability
        risk_prob = 1.0 / (1.0 + math.exp(-max(-8.0, min(8.0, logit))))
        risk_score = round(risk_prob * 100.0, 1)

        # Map Risk Level
        if risk_score >= 80.0:
            risk_level = RiskLevel.HIGH if risk_score < 92.0 else RiskLevel.CRITICAL
        elif risk_score >= 60.0:
            risk_level = RiskLevel.HIGH
        elif risk_score >= 40.0:
            risk_level = RiskLevel.MODERATE
        elif risk_score >= 20.0:
            risk_level = RiskLevel.LOW
        else:
            risk_level = RiskLevel.NEGLIGIBLE

        # 2. Independent Evidential Confidence Calculation (RISK ≠ CONFIDENCE)
        completeness = getattr(features.data_quality, "completeness_ratio", 0.8)
        conflicted_features = getattr(features.data_quality, "conflicted_features", [])
        stale_features = getattr(features.data_quality, "stale_features", [])

        base_confidence = completeness * 75.0
        obscuration_penalty = (features.optical_obscuration_pct / 100.0) * 16.0
        conflict_penalty = len(conflicted_features) * 6.0
        stale_penalty = len(stale_features) * 4.0
        field_bonus = 35.0 if features.field_verification_count > 0 else 0.0

        computed_confidence = base_confidence - obscuration_penalty - conflict_penalty - stale_penalty + field_bonus
        confidence_score = round(max(5.0, min(98.0, computed_confidence)), 1)

        # Map Confidence Level
        if confidence_score >= 85.0:
            confidence_level = ConfidenceLevel.VERY_HIGH
        elif confidence_score >= 70.0:
            confidence_level = ConfidenceLevel.HIGH
        elif confidence_score >= 50.0:
            confidence_level = ConfidenceLevel.MODERATE
        elif confidence_score >= 30.0:
            confidence_level = ConfidenceLevel.LOW
        else:
            confidence_level = ConfidenceLevel.VERY_LOW

        # 3. Traceable Feature Contributions & Drivers
        positive_components = {
            "antecedent_rainfall_7d_mm": max(0.0, cls.WEIGHT_7D_RAIN * z_rain),
            "slope_gradient_deg": max(0.0, cls.WEIGHT_SLOPE * z_slope),
            "geological_susceptibility": max(0.0, cls.WEIGHT_GEO_SUSC * z_geo),
            "soil_saturation_index": max(0.0, cls.WEIGHT_SATURATION * z_sat),
        }
        total_pos = sum(positive_components.values()) or 1.0

        contributions: list[FeatureContribution] = [
            FeatureContribution(
                feature_name="antecedent_rainfall_7d_mm",
                raw_value=features.antecedent_rainfall_7d_mm,
                normalized_value=round(z_rain, 2),
                coefficient=cls.WEIGHT_7D_RAIN,
                contribution_pct=round((positive_components["antecedent_rainfall_7d_mm"] / total_pos) * 100.0, 1),
                description=f"{features.antecedent_rainfall_7d_mm}mm 7-day cumulative precipitation surcharge",
            ),
            FeatureContribution(
                feature_name="slope_gradient_deg",
                raw_value=features.slope_gradient_deg,
                normalized_value=round(z_slope, 2),
                coefficient=cls.WEIGHT_SLOPE,
                contribution_pct=round((positive_components["slope_gradient_deg"] / total_pos) * 100.0, 1),
                description=f"{features.slope_gradient_deg}° steep engineered cut-slope gradient",
            ),
            FeatureContribution(
                feature_name="geological_susceptibility",
                raw_value=features.geological_susceptibility,
                normalized_value=round(z_geo, 2),
                coefficient=cls.WEIGHT_GEO_SUSC,
                contribution_pct=round((positive_components["geological_susceptibility"] / total_pos) * 100.0, 1),
                description=f"Lithological shear vulnerability index: {features.geological_susceptibility}",
            ),
            FeatureContribution(
                feature_name="soil_saturation_index",
                raw_value=features.soil_saturation_index,
                normalized_value=round(z_sat, 2),
                coefficient=cls.WEIGHT_SATURATION,
                contribution_pct=round((positive_components["soil_saturation_index"] / total_pos) * 100.0, 1),
                description=f"Estimated soil moisture saturation: {round(features.soil_saturation_index * 100)}%",
            ),
        ]

        dominant_factors = [
            f"{features.antecedent_rainfall_7d_mm}mm antecedent rainfall (7-day accumulation)",
            f"{features.slope_gradient_deg}° steep cut-slope gradient above highway carriageway",
            f"High geological susceptibility score ({features.geological_susceptibility})",
        ]

        if risk_score >= 70.0 and confidence_score < 65.0:
            recommended_action = "FIELD_VERIFICATION_REQUIRED"
        elif risk_score >= 80.0 and confidence_score >= 75.0:
            recommended_action = "IMMEDIATE_ROAD_CLOSURE_ADVISORY"
        elif risk_score >= 50.0:
            recommended_action = "INTENSIVE_CORRIDOR_MONITORING"
        else:
            recommended_action = "ROUTINE_STANDBY"

        explanation = (
            f"Predictive baseline assesses {risk_level.value} physical slope hazard ({risk_score}%) "
            f"primarily driven by {features.antecedent_rainfall_7d_mm}mm antecedent precipitation "
            f"and {features.slope_gradient_deg}° terrain gradient. "
            f"Evidential certainty is {confidence_level.value} ({confidence_score}%) due to "
            f"{features.optical_obscuration_pct}% optical satellite cloud cover and field patrol verification status. "
            f"Operational recommendation: {recommended_action}."
        )

        return ModelInferenceResult(
            risk_score=risk_score,
            risk_level=risk_level,
            confidence_score=confidence_score,
            confidence_level=confidence_level,
            feature_contributions=contributions,
            dominant_risk_factors=dominant_factors,
            explanation_narrative=explanation,
            recommended_action=recommended_action,
        )


class SyntheticBenchmarkValidator:
    """Reproducible validation benchmark on synthetic regional demonstration data.
    
    NOTE: Evaluates baseline Logistic Regression vs. Decision Tree with Spatial Group Holdout
    on synthetic demonstration data only. This is NOT a validated empirical benchmark
    against actual field ground databases.
    """

    @classmethod
    def evaluate_demonstration_benchmark(cls) -> dict[str, Any]:
        """Run benchmark comparison on synthetic NER corridor dataset with spatial holdout."""
        try:
            import numpy as np
            from sklearn.linear_model import LogisticRegression
            from sklearn.metrics import brier_score_loss, f1_score, precision_score, recall_score
            from sklearn.tree import DecisionTreeClassifier
        except ImportError:
            return {
                "status": "VALIDATION_DEMONSTRATION_BENCHMARK",
                "data_classification": "SYNTHETIC_DEMONSTRATION_DATA (NOT REAL-WORLD FIELD VALIDATION)",
                "note": "scikit-learn and numpy required for running live benchmark.",
                "sample_size": 200,
            }

        np.random.seed(42)

        n_samples = 200
        groups = np.random.choice(["West_Kameng", "Tawang", "East_Kameng", "Papum_Pare"], size=n_samples)

        rain_7d = np.random.uniform(50.0, 220.0, size=n_samples)
        slope = np.random.uniform(20.0, 50.0, size=n_samples)
        geo_susc = np.random.uniform(0.3, 0.95, size=n_samples)
        sat_index = np.clip(rain_7d / 200.0 + np.random.normal(0, 0.1, n_samples), 0.0, 1.0)

        X = np.column_stack([rain_7d, slope, geo_susc, sat_index])

        hazard_logit = (
            0.35 * (rain_7d - 120) / 35
            + 0.30 * (slope - 32) / 7.5
            + 0.20 * (geo_susc - 0.5) * 4
            + 0.15 * (sat_index - 0.5) * 3
            + np.random.normal(0, 0.3, n_samples)
        )
        y = (hazard_logit > 0.0).astype(int)

        train_mask = groups != "Tawang"
        test_mask = groups == "Tawang"

        X_train, y_train = X[train_mask], y[train_mask]
        X_test, y_test = X[test_mask], y[test_mask]

        lr = LogisticRegression(max_iter=200)
        lr.fit(X_train, y_train)
        lr_preds = lr.predict(X_test)
        lr_probs = lr.predict_proba(X_test)[:, 1]

        lr_metrics = {
            "model_type": "LogisticRegression (Baseline)",
            "precision": round(float(precision_score(y_test, lr_preds, zero_division=0)), 3),
            "recall": round(float(recall_score(y_test, lr_preds, zero_division=0)), 3),
            "f1_score": round(float(f1_score(y_test, lr_preds, zero_division=0)), 3),
            "brier_score": round(float(brier_score_loss(y_test, lr_probs)), 3),
        }

        dt = DecisionTreeClassifier(max_depth=3, random_state=42)
        dt.fit(X_train, y_train)
        dt_preds = dt.predict(X_test)
        dt_probs = dt.predict_proba(X_test)[:, 1]

        dt_metrics = {
            "model_type": "DecisionTreeClassifier (Candidate)",
            "precision": round(float(precision_score(y_test, dt_preds, zero_division=0)), 3),
            "recall": round(float(recall_score(y_test, dt_preds, zero_division=0)), 3),
            "f1_score": round(float(f1_score(y_test, dt_preds, zero_division=0)), 3),
            "brier_score": round(float(brier_score_loss(y_test, dt_probs)), 3),
        }

        return {
            "status": "VALIDATION_DEMONSTRATION_BENCHMARK",
            "data_classification": "SYNTHETIC_DEMONSTRATION_DATA (NOT REAL-WORLD FIELD VALIDATION)",
            "validation_split_strategy": "Spatial Group Holdout (Held out Tawang district corridor)",
            "sample_size": n_samples,
            "baseline_logistic_regression": lr_metrics,
            "candidate_decision_tree": dt_metrics,
            "model_selection_rational": (
                "Logistic Regression selected as default active baseline due to monotonic interpretability, "
                "direct coefficient traceability, and continuous probability scaling."
            ),
        }
