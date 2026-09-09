"""Decision and Field Verification Task domain models.

INVARIANT:
AI RECOMMENDS → HUMAN AUTHORIZES
Safety-critical interventions (road closure, evacuation, emergency mobilization)
require mandatory sign-off by a designated statutory official.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.domain.enums import ActorRole


class VerificationTask(BaseModel):
    """An official order dispatching ground patrol to verify hazard conditions."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    target_location_name: str
    target_latitude: float
    target_longitude: float
    assigned_agency: str  # e.g., "SDRF Quick Response Team Bravo"
    assigned_officer: Optional[str] = None
    status: str = "PENDING"  # PENDING | DISPATCHED | IN_PROGRESS | VERIFIED
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    dispatched_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    instructions: str = "Perform visual inspection and upload geo-tagged photo."

    model_config = {"from_attributes": True}


class Decision(BaseModel):
    """Statutory determination enacted by an authorized human magistrate or coordinator."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID

    decision_type: str  # APPROVED | MODIFIED | REJECTED
    action_directive: str  # e.g., "Enforce commercial traffic stoppage at KM-38"

    # Human Authority Boundary
    signer_name: str  # e.g., "P. Tsering, IAS"
    signer_role: ActorRole = ActorRole.AUTHORIZED_DECISION_MAKER
    order_code: str  # e.g., "DDMA-WK-2026/884-A"

    rationale: str
    proposed_measures: list[str] = Field(default_factory=list)
    enacted_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"from_attributes": True}
