"""TerraGuardian Intelligence — Impact Domain Contracts.

STATUS: DESIGN CONTRACT
RUNTIME: NOT ACTIVE
CURRENT RUNTIME IMPLEMENTATION: services/api/app/services/impact_service.py

Defines strongly typed interfaces and data contracts for consequence analysis.
"""

from intelligence.impact.contracts import (
    ConsequenceAssessmentContract,
    ConsequenceDimensionScore,
    ExposureSeverity,
    ImpactDimension,
    LifelineStatus,
)

__all__ = [
    "ConsequenceAssessmentContract",
    "ConsequenceDimensionScore",
    "ExposureSeverity",
    "ImpactDimension",
    "LifelineStatus",
]
