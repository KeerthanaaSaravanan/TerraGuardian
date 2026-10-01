"""Interpretable Predictive Baseline Models & Evaluation for Landslide Intelligence.

This module exposes the authoritative ML baseline from the `ml` package.
Ensures zero code duplication: ONE authoritative implementation across the repository.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure directory containing 'ml' package is in sys.path
_this_file = Path(__file__).resolve()
for candidate in [
    _this_file.parent.parent.parent,                # e.g. apps/operations-centre or services/api
    _this_file.parent.parent.parent.parent,         # e.g. apps
    _this_file.parent.parent.parent.parent.parent,  # repository root
]:
    if (candidate / "ml").exists() and str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

try:
    from ml.baseline import (
        LandslidePredictiveBaseline,
        ModelInferenceResult,
        SyntheticBenchmarkValidator,
    )
except ImportError:
    # Direct import fallback if ml is in working directory
    from ml import (  # type: ignore
        LandslidePredictiveBaseline,
        ModelInferenceResult,
        SyntheticBenchmarkValidator,
    )

__all__ = [
    "LandslidePredictiveBaseline",
    "ModelInferenceResult",
    "SyntheticBenchmarkValidator",
]
