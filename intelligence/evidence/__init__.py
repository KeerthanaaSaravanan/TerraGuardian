"""TerraGuardian Intelligence — Evidence Domain Contracts.

STATUS: DESIGN CONTRACT
RUNTIME: NOT ACTIVE
CURRENT RUNTIME IMPLEMENTATION: services/api/app/services/reconciliation_service.py

Defines strongly typed interfaces and data contracts for evidence processing.
"""

from intelligence.evidence.contracts import (
    ConflictState,
    EvidenceObservationContract,
    EvidenceReconciliationSummaryContract,
    EvidenceSourceType,
    FreshnessCategory,
    VerificationState,
)

__all__ = [
    "ConflictState",
    "EvidenceObservationContract",
    "EvidenceReconciliationSummaryContract",
    "EvidenceSourceType",
    "FreshnessCategory",
    "VerificationState",
]
