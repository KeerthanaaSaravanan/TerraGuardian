"""TerraGuardian Intelligence Contract — Bounded Agent Governance.

Status: DESIGN / FUTURE
Runtime Status: NOT ACTIVE
Active Runtime Implementation: None (All active reasoning is deterministic backend service logic)

Architectural governance contracts for future bounded assistive reasoning agents.
This module explicitly contains ZERO autonomous dispatch, ZERO LLM execution engines,
and ZERO runtime background executors.

Core Invariants:
    RECOMMENDATION != AUTHORIZATION
    AI assists reasoning; statutory rules govern state transitions; humans authorize critical actions.
    No agent possesses autonomous executive authority to dispatch field units or close incidents.
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid


class AgentRole(str, enum.Enum):
    """Permitted assistive agent roles within bounded operational constraints."""

    FIELD_TELEMETRY_WATCHDOG = "FIELD_TELEMETRY_WATCHDOG"
    EVIDENCE_CORROBORATION_ASSISTANT = "EVIDENCE_CORROBORATION_ASSISTANT"
    SPATIAL_DIVERGENCE_ANALYZER = "SPATIAL_DIVERGENCE_ANALYZER"
    CLOSURE_PREREQUISITE_AUDITOR = "CLOSURE_PREREQUISITE_AUDITOR"


class AuthorityScope(str, enum.Enum):
    """Strictly bounded authority capabilities."""

    READ_ONLY_OBSERVE = "READ_ONLY_OBSERVE"
    PROPOSE_INFORMATIONAL_STEP = "PROPOSE_INFORMATIONAL_STEP"
    VERIFY_CONFORMANCE = "VERIFY_CONFORMANCE"
    # Note: No executive or dispatch authority permitted


@dataclass(frozen=True)
class AgentIdentityContract:
    """Architectural identity contract for a bounded assistive agent."""

    agent_id: str
    role: AgentRole
    version: str
    allowed_tools: List[str]
    authority_scope: AuthorityScope
    is_autonomous_executor: bool = False  # Strictly False by invariant


@dataclass(frozen=True)
class AgentIntentContract:
    """Explicitly articulated proposal for human review."""

    intent_id: uuid.UUID
    agent_id: str
    incident_id: uuid.UUID
    proposed_at: datetime
    suggested_action_name: str
    rationale: str
    evidence_grounding_ids: List[uuid.UUID]
    requires_human_approval: bool = True  # Invariant: critical actions mandate human sign-off


@dataclass(frozen=True)
class ConformanceObservationContract:
    """Audit record evaluating response alignment with operational protocols."""

    observation_id: uuid.UUID
    incident_id: uuid.UUID
    observed_at: datetime
    monitored_action_id: uuid.UUID
    action_state: str
    latency_seconds: float
    deviation_detected: bool
    deviation_notes: Optional[str] = None
