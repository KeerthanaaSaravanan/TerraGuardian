"""Domain models for the Phase 5 'What Changed' Intelligence Engine.

Invariants:
1. Every change is grounded in verifiable audit, telemetry, evidence, or state transitions.
2. Changes are NEVER fabricated.
3. Quantifiable and qualitative deltas are explicitly distinguished.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ChangeType(str, enum.Enum):
    """Authoritative taxonomy of incident state deltas."""

    HAZARD_INCREASED = "HAZARD_INCREASED"
    HAZARD_DECREASED = "HAZARD_DECREASED"
    CONFIDENCE_INCREASED = "CONFIDENCE_INCREASED"
    CONFIDENCE_DECREASED = "CONFIDENCE_DECREASED"
    NEW_EVIDENCE = "NEW_EVIDENCE"
    EVIDENCE_EXPIRED = "EVIDENCE_EXPIRED"
    EVIDENCE_CONFLICT = "EVIDENCE_CONFLICT"
    EXPOSURE_CHANGED = "EXPOSURE_CHANGED"
    PRIORITY_CHANGED = "PRIORITY_CHANGED"
    ACTION_STATE_CHANGED = "ACTION_STATE_CHANGED"
    FIELD_CONFIRMATION_RECEIVED = "FIELD_CONFIRMATION_RECEIVED"
    OUTCOME_RECORDED = "OUTCOME_RECORDED"
    OBSERVATION_GAP_DETECTED = "OBSERVATION_GAP_DETECTED"
    STATUS_CHANGED = "STATUS_CHANGED"
    INCIDENT_STATUS_CHANGED = "INCIDENT_STATUS_CHANGED"


class ChangeSeverity(str, enum.Enum):
    """Operational urgency or importance of a detected delta."""

    NORMAL = "NORMAL"
    MODERATE = "MODERATE"
    ELEVATED = "ELEVATED"
    SIGNIFICANT = "SIGNIFICANT"
    CRITICAL = "CRITICAL"


class IncidentChangeEvent(BaseModel):
    """An individual structured change event between incident assessments."""

    change_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    change_type: ChangeType
    parameter: Optional[str] = None
    previous_value: Any
    current_value: Any
    observed_at: datetime = Field(default_factory=datetime.utcnow)
    source: str
    evidence_reference: Optional[str] = None
    severity: ChangeSeverity = ChangeSeverity.NORMAL
    explanation: str

    model_config = {"from_attributes": True}


class WhatChangedReport(BaseModel):
    """Complete structured comparison between current and previous known incident state."""

    incident_id: uuid.UUID
    current_version: int
    previous_version: int
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)
    total_changes: int
    changes: list[IncidentChangeEvent] = Field(default_factory=list)
    summary_narrative: str
    provenance: str = "TERRAGUARDIAN_CHANGE_INTELLIGENCE_ENGINE"

    model_config = {"from_attributes": True}
