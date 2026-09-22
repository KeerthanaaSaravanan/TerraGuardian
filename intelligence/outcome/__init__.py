"""TerraGuardian Intelligence — Outcome Domain Contracts.

STATUS: DESIGN CONTRACT
RUNTIME: NOT ACTIVE
CURRENT RUNTIME IMPLEMENTATION: services/api/app/services/outcome_service.py

Defines strongly typed interfaces and data contracts for intervention-conditioned outcome interpretation.
"""

from intelligence.outcome.contracts import (
    InterventionContextState,
    ObservationAdequacy,
    OutcomeClassification,
    OutcomeInterpretationContract,
)

__all__ = [
    "InterventionContextState",
    "ObservationAdequacy",
    "OutcomeClassification",
    "OutcomeInterpretationContract",
]
