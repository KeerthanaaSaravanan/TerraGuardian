"""Audit domain models.

Append-oriented domain audit records tracing:
- WHAT happened
- WHEN it happened
- WHO/WHAT caused it
- WHICH incident was affected
- PREVIOUS and NEW state
- REASON / contextual metadata
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.domain.enums import ActorRole, AuditEventType


class AuditEvent(BaseModel):
    """An append-oriented audit trail record of a domain event.
    
    Provides chronological operational history. Does not claim cryptographic immutability.
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    event_type: AuditEventType

    # Actor boundary
    actor_role: ActorRole
    actor_name: str  # e.g., "P. Tsering, IAS" or "TerraGuardian Ingestion Worker"
    actor_id: Optional[str] = None

    # State delta (where applicable)
    previous_state: Optional[str] = None
    new_state: Optional[str] = None

    # Context & Rationale
    reason: Optional[str] = None
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"from_attributes": True}
