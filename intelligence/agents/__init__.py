"""TerraGuardian Intelligence — Bounded Agent Governance Contracts.

STATUS: DESIGN / FUTURE
RUNTIME: NOT ACTIVE
CURRENT RUNTIME IMPLEMENTATION: Deterministic backend service layer

Defines architectural governance contracts for future bounded reasoning agents.
Contains ZERO autonomous agents and ZERO runtime execution loops.
"""

from intelligence.agents.contracts import (
    AgentIdentityContract,
    AgentIntentContract,
    AgentRole,
    AuthorityScope,
    ConformanceObservationContract,
)

__all__ = [
    "AgentIdentityContract",
    "AgentIntentContract",
    "AgentRole",
    "AuthorityScope",
    "ConformanceObservationContract",
]
