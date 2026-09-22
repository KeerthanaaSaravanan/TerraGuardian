"""TerraGuardian Intelligence Fabric.

ACTIVE RUNTIME SERVICES:
- Decision Intelligence & Next-Best-Information (NBI): intelligence.decision

DESIGN CONTRACT PACKAGES (Domain Boundaries / Not Active In Runtime):
- intelligence.risk: Risk factor decomposition contracts
- intelligence.evidence: Multi-source evidence reconciliation contracts
- intelligence.impact: Consequence propagation contracts
- intelligence.priority: Operational priority contracts
- intelligence.outcome: Intervention-conditioned outcome contracts
- intelligence.agents: Bounded agent governance contracts
- intelligence.vision: Visual evidence metadata contracts
"""

from intelligence.decision import (
    DecisionIntelligenceService,
    DecisionSupportAssessment,
    NextBestInformationItem,
)

__all__ = [
    "DecisionIntelligenceService",
    "DecisionSupportAssessment",
    "NextBestInformationItem",
]
