"""TerraGuardian Intelligence — Risk Domain Contracts.

STATUS: DESIGN CONTRACT
RUNTIME: NOT ACTIVE
CURRENT RUNTIME IMPLEMENTATION: ml.baseline (LandslidePredictiveBaseline)

Defines strongly typed interfaces and data contracts for hazard risk representation.
"""

from intelligence.risk.contracts import (
    HazardRiskAssessmentContract,
    RiskFactorContribution,
    RiskLevel,
)

__all__ = [
    "HazardRiskAssessmentContract",
    "RiskFactorContribution",
    "RiskLevel",
]
