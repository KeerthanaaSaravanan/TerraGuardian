"""Incident Twin — the central authoritative domain object.

An Incident Twin represents a living hazard/response digital twin and is
the shared source of truth across citizen, field, and authority workflows.

It cleanly separates:
1. Operational Lifecycle State (IncidentStatus)
2. Physical Reality State (HazardState)
3. Risk (Hazard Severity)
4. Confidence (Evidential Certainty)
5. Priority (Consequence & Lifeline Impact)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.domain.enums import (
    ConfidenceLevel,
    HazardState,
    IncidentStatus,
    PriorityLevel,
    RiskLevel,
)


# Canonical server-side lifecycle transitions.
# Arbitrary transitions are blocked.
VALID_TRANSITIONS: dict[IncidentStatus, frozenset[IncidentStatus]] = {
    IncidentStatus.DETECTED: frozenset({IncidentStatus.ASSESSING}),
    IncidentStatus.ASSESSING: frozenset({IncidentStatus.VERIFYING, IncidentStatus.DECISION_REQUIRED}),
    IncidentStatus.VERIFYING: frozenset({IncidentStatus.VERIFIED, IncidentStatus.ASSESSING}),
    IncidentStatus.VERIFIED: frozenset({IncidentStatus.DECISION_REQUIRED}),
    IncidentStatus.DECISION_REQUIRED: frozenset({IncidentStatus.AUTHORIZED, IncidentStatus.MONITORING}),
    IncidentStatus.AUTHORIZED: frozenset({IncidentStatus.RESPONDING}),
    IncidentStatus.RESPONDING: frozenset({IncidentStatus.MONITORING}),
    IncidentStatus.MONITORING: frozenset({IncidentStatus.REASSESSING}),
    IncidentStatus.REASSESSING: frozenset({
        IncidentStatus.MONITORING,
        IncidentStatus.RESPONDING,
        IncidentStatus.RESOLVED,
        IncidentStatus.DECISION_REQUIRED,
    }),
    IncidentStatus.RESOLVED: frozenset({IncidentStatus.REVIEWED}),
    IncidentStatus.REVIEWED: frozenset(),  # Terminal state
}


def is_valid_transition(current: IncidentStatus, target: IncidentStatus) -> bool:
    """Check whether a state transition is permitted by the canonical state machine."""
    return target in VALID_TRANSITIONS.get(current, frozenset())


class IncidentTwin(BaseModel):
    """The living digital twin of a hazard/response incident.

    The Incident Twin maintains the CURRENT authoritative operational state.
    Historical transitions belong to the audit layer (AuditEvent).
    """

    # Identity
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    code: str = Field(description="Operational code, e.g. TG-2048")
    title: str
    description: Optional[str] = None
    incident_type: str = "landslide"

    # Operational Lifecycle & Hazard Evolution Dimensions
    status: IncidentStatus = IncidentStatus.DETECTED
    hazard_state: HazardState = HazardState.EXPECTED

    # Core Metric Decoupling (RISK ≠ CONFIDENCE, HAZARD ≠ PRIORITY)
    risk_level: RiskLevel = RiskLevel.HIGH
    risk_score: float = Field(default=0.0, ge=0.0, le=100.0)
    confidence_level: ConfidenceLevel = ConfidenceLevel.MODERATE
    confidence_score: float = Field(default=0.0, ge=0.0, le=100.0)
    priority_level: PriorityLevel = PriorityLevel.P2_HIGH
    priority_score: float = Field(default=0.0, ge=0.0, le=100.0)

    # Spatial Context (WGS84)
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    corridor_name: Optional[str] = None
    state: str = "Arunachal Pradesh"
    district: str = "West Kameng"

    # Temporal Window
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Flags & Metadata
    is_primary_demo: bool = False
    is_simulated: bool = False
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}
