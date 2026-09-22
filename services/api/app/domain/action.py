"""Operational Action and Confirmation domain models.

INVARIANTS:
1. APPROVED ≠ COMPLETED (Issuing an order is not proof of execution).
2. COMPLETED ≠ PHYSICALLY_CONFIRMED (Action is confirmed through accepted confirmation evidence).

SEMANTIC NOTE:
PHYSICALLY_CONFIRMED denotes that the operational action has been confirmed through accepted
confirmation evidence (e.g. accepted field patrol radio/photo report, which in demonstration fixtures
is simulated). It does not claim live physical telemetry or cryptographic hardware proof.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.domain.enums import ActionState


VALID_ACTION_TRANSITIONS: dict[ActionState, frozenset[ActionState]] = {
    ActionState.PROPOSED: frozenset({ActionState.APPROVED}),
    ActionState.APPROVED: frozenset({ActionState.DISPATCHED}),
    ActionState.DISPATCHED: frozenset({ActionState.ACKNOWLEDGED, ActionState.IN_PROGRESS, ActionState.COMPLETED}),
    ActionState.ACKNOWLEDGED: frozenset({ActionState.IN_PROGRESS, ActionState.COMPLETED}),
    ActionState.IN_PROGRESS: frozenset({ActionState.COMPLETED}),
    ActionState.COMPLETED: frozenset(),  # Terminal via regular transitions; advance to PHYSICALLY_CONFIRMED only via confirm_action()
    ActionState.PHYSICALLY_CONFIRMED: frozenset(),  # Terminal state
}


def is_valid_action_transition(current: ActionState, target: ActionState) -> bool:
    """Check whether an action lifecycle transition is permitted."""
    return target in VALID_ACTION_TRANSITIONS.get(current, frozenset())


class Action(BaseModel):
    """An operational response task assigned to a specific field agency."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    task_code: str  # e.g., "TSK-01", "TSK-02"
    agency: str    # e.g., "Border Roads Organisation", "Traffic Police"
    title: str
    description: str

    state: ActionState = ActionState.PROPOSED
    assigned_to: str
    is_action_gap_trigger: bool = False

    # Timestamps
    dispatched_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ActionConfirmation(BaseModel):
    """Record of accepted confirmation evidence for an operational action."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    action_id: uuid.UUID
    incident_id: uuid.UUID

    confirming_officer: str  # e.g., "ASI D. Sonam"
    confirming_agency: str   # e.g., "West Kameng Traffic Police"
    communication_channel: str = "TETRA_RADIO"  # TETRA_RADIO | ERSS_112 | MOBILE
    location_confirmed: str  # e.g., "NH-13 KM-38 Police Checkpost"

    confirmed_at: datetime = Field(default_factory=datetime.utcnow)
    confirmation_notes: str
    evidence_photo_url: Optional[str] = None
    is_simulated: bool = False

    model_config = {"from_attributes": True}
