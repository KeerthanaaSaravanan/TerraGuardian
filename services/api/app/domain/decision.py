"""Decision and Field Verification Task domain models.

INVARIANT:
AI RECOMMENDS → HUMAN AUTHORIZES
Safety-critical interventions (road closure, evacuation, emergency mobilization)
require mandatory sign-off by a designated statutory official.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

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


class NextBestInformationItem(BaseModel):
    """Specific information gathering action recommended to reduce evidential uncertainty and separate competing hypotheses."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    action_type: str
    priority: str
    target_modality: str
    title: str
    rationale: str

    # Research-Integrity: Qualitative discrimination power replacing unsupported quantitative delta
    qualitative_discrimination: str = "HIGH"  # HIGH | MEDIUM | LOW
    expected_confidence_delta: Optional[float] = None  # Deprecated: Do not use unvalidated percentage deltas

    authority_required: bool = False
    status: str = "RECOMMENDED"

    # Prompt 04: Hypothesis-Separation Attributes
    target_hypotheses: list[str] = Field(default_factory=list)
    discriminates_between: list[list[str]] = Field(default_factory=list)
    spatial_scope: Optional[str] = None
    temporal_scope: Optional[str] = None

    model_config = {"from_attributes": True}


class DecisionSupportAssessment(BaseModel):
    """Comprehensive decision support output synthesizing hazard, consequence, uncertainty and NBI."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    current_status: str
    current_hazard_state: str
    risk_score: float
    confidence_score: float
    priority_level: str

    governing_safety_rules: list[str] = Field(default_factory=list)
    recommended_operational_options: list[dict[str, Any]] = Field(default_factory=list)
    next_best_information: list[NextBestInformationItem] = Field(default_factory=list)

    active_divergences: list[str] = Field(default_factory=list)
    outcome_summary: Optional[str] = None
    closure_readiness: bool = False
    closure_blockers: list[str] = Field(default_factory=list)

    assessed_at: datetime = Field(default_factory=datetime.utcnow)
    assessed_by: str = "TerraGuardian Decision Intelligence Engine"

    model_config = {"from_attributes": True}


DecisionSupportAssessment.model_rebuild()

