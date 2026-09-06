"""Incident Twin — the central domain object.

An Incident Twin represents a living hazard/response incident and is
the shared source of truth between citizen, field, and authority workflows.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class IncidentStatus(str, enum.Enum):
    """Canonical incident lifecycle states.

    Transitions must follow VALID_TRANSITIONS.
    Arbitrary status changes are not permitted.
    """

    DETECTED = "DETECTED"
    ASSESSING = "ASSESSING"
    VERIFYING = "VERIFYING"
    VERIFIED = "VERIFIED"
    DECISION_REQUIRED = "DECISION_REQUIRED"
    AUTHORIZED = "AUTHORIZED"
    RESPONDING = "RESPONDING"
    MONITORING = "MONITORING"
    RESOLVED = "RESOLVED"
    REVIEWED = "REVIEWED"


# Valid state transitions enforcing the canonical lifecycle.
# Each key maps to the set of states it can transition TO.
VALID_TRANSITIONS: dict[IncidentStatus, frozenset[IncidentStatus]] = {
    IncidentStatus.DETECTED: frozenset({IncidentStatus.ASSESSING}),
    IncidentStatus.ASSESSING: frozenset({IncidentStatus.VERIFYING}),
    IncidentStatus.VERIFYING: frozenset({IncidentStatus.VERIFIED}),
    IncidentStatus.VERIFIED: frozenset({IncidentStatus.DECISION_REQUIRED}),
    IncidentStatus.DECISION_REQUIRED: frozenset({IncidentStatus.AUTHORIZED}),
    IncidentStatus.AUTHORIZED: frozenset({IncidentStatus.RESPONDING}),
    IncidentStatus.RESPONDING: frozenset({IncidentStatus.MONITORING}),
    IncidentStatus.MONITORING: frozenset({IncidentStatus.RESOLVED}),
    IncidentStatus.RESOLVED: frozenset({IncidentStatus.REVIEWED}),
    IncidentStatus.REVIEWED: frozenset(),  # Terminal state
}


def is_valid_transition(current: IncidentStatus, target: IncidentStatus) -> bool:
    """Check whether a state transition is permitted."""
    return target in VALID_TRANSITIONS.get(current, frozenset())


class IncidentTwin(BaseModel):
    """The living digital twin of a hazard/response incident.

    This is the core domain object shared across all workflows.
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    title: str
    description: Optional[str] = None
    status: IncidentStatus = IncidentStatus.DETECTED

    # Location (WGS84)
    latitude: float
    longitude: float
    location_name: Optional[str] = None

    # Temporal
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Classification
    incident_type: str = "landslide"  # extensible in future

    model_config = {"from_attributes": True}
