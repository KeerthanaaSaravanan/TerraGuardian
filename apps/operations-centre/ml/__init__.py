"""Machine Learning Layer for TerraGuardian Landslide Intelligence.

Exposes:
- LandslidePredictiveBaseline: Interpretable physics-informed logistic baseline
- ModelInferenceResult: Standardized model inference output
- SyntheticBenchmarkValidator: Spatial-group holdout validation on demonstration data
"""

from ml.baseline import (
    LandslidePredictiveBaseline,
    ModelInferenceResult,
    SyntheticBenchmarkValidator,
)

__all__ = [
    "LandslidePredictiveBaseline",
    "ModelInferenceResult",
    "SyntheticBenchmarkValidator",
]
