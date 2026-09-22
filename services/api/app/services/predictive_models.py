"""Interpretable Predictive Baseline Models & Evaluation for Landslide Intelligence.

This module exposes the authoritative ML baseline from the `ml` package.
Ensures zero code duplication: ONE authoritative implementation across the repository.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure root repository is in sys.path so 'ml' package is importable
_root_path = Path(__file__).resolve().parent.parent.parent.parent.parent
if _root_path.exists() and str(_root_path) not in sys.path:
    sys.path.insert(0, str(_root_path))

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
