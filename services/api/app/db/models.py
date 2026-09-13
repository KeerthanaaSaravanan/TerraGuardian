"""SQLAlchemy 2.0 ORM models representing the TerraGuardian database schema.

Tables:
- `incidents`: Authoritative Incident Twins
- `evidence`: Multi-source observation evidence fabric
- `decisions`: Statutory human authority sign-offs
- `actions`: Dispatched operational response tasks
- `action_confirmations`: Verified ground truth physical barriers
- `audit_events`: Append-oriented audit logs
- `reassessments`: Bounded physical hazard reassessments
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class IncidentModel(Base):
    """Authoritative persistent Incident Twin."""

    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    incident_type: Mapped[str] = mapped_column(String(64), default="landslide", nullable=False)

    # Operational lifecycle and physical hazard state dimensions
    status: Mapped[str] = mapped_column(String(32), index=True, nullable=False, default="DETECTED")
    hazard_state: Mapped[str] = mapped_column(String(32), index=True, nullable=False, default="EXPECTED")

    # Core Decoupled Metrics (RISK ≠ CONFIDENCE, HAZARD ≠ PRIORITY)
    risk_level: Mapped[str] = mapped_column(String(32), index=True, nullable=False, default="HIGH")
    risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    confidence_level: Mapped[str] = mapped_column(String(32), index=True, nullable=False, default="MODERATE")
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    priority_level: Mapped[str] = mapped_column(String(32), index=True, nullable=False, default="P2_HIGH")
    priority_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Spatial Context (WGS84 Coordinates)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    corridor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    state: Mapped[str] = mapped_column(String(100), default="Arunachal Pradesh", nullable=False)
    district: Mapped[str] = mapped_column(String(100), default="West Kameng", nullable=False)

    # Temporal Window
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Simulation & Demonstration Flags
    is_primary_demo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    evidence_items: Mapped[list[EvidenceModel]] = relationship(
        "EvidenceModel", back_populates="incident", cascade="all, delete-orphan"
    )
    decisions: Mapped[list[DecisionModel]] = relationship(
        "DecisionModel", back_populates="incident", cascade="all, delete-orphan"
    )
    actions: Mapped[list[ActionModel]] = relationship(
        "ActionModel", back_populates="incident", cascade="all, delete-orphan"
    )
    audit_events: Mapped[list[AuditEventModel]] = relationship(
        "AuditEventModel", back_populates="incident", cascade="all, delete-orphan", order_by="AuditEventModel.created_at.asc()"
    )
    reassessments: Mapped[list[ReassessmentModel]] = relationship(
        "ReassessmentModel", back_populates="incident", cascade="all, delete-orphan"
    )


class EvidenceModel(Base):
    """Multi-source evidence item contributing to incident intelligence."""

    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"), index=True, nullable=False
    )

    source: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    source_name: Mapped[str] = mapped_column(String(255), nullable=False)
    evidence_type: Mapped[str] = mapped_column(String(100), nullable=False)
    observation: Mapped[str] = mapped_column(Text, nullable=False)
    metric: Mapped[str] = mapped_column(String(255), nullable=False)
    reliability: Mapped[str] = mapped_column(String(32), default="HIGH", nullable=False)

    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    provenance: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    freshness_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence_contribution: Mapped[float | None] = mapped_column(Float, nullable=True)
    processing_status: Mapped[str] = mapped_column(String(32), default="RECEIVED", nullable=False)
    interpretation: Mapped[str] = mapped_column(String(32), default="UNVERIFIED", nullable=False)
    conflict_status: Mapped[str] = mapped_column(String(32), default="NONE", nullable=False)
    conflict_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    incident: Mapped[IncidentModel] = relationship("IncidentModel", back_populates="evidence_items")


class DecisionModel(Base):
    """Statutory determination enacted by a designated human official."""

    __tablename__ = "decisions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"), index=True, nullable=False
    )

    decision_type: Mapped[str] = mapped_column(String(32), nullable=False)  # APPROVED | MODIFIED | REJECTED
    action_directive: Mapped[str] = mapped_column(Text, nullable=False)
    signer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    signer_role: Mapped[str] = mapped_column(String(64), default="AUTHORIZED_DECISION_MAKER", nullable=False)
    order_code: Mapped[str] = mapped_column(String(100), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    proposed_measures: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    enacted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    incident: Mapped[IncidentModel] = relationship("IncidentModel", back_populates="decisions")


class ActionModel(Base):
    """Operational response task assigned to an executing agency."""

    __tablename__ = "actions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"), index=True, nullable=False
    )

    task_code: Mapped[str] = mapped_column(String(64), nullable=False)
    agency: Mapped[str] = mapped_column(String(255), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    state: Mapped[str] = mapped_column(String(32), default="PROPOSED", nullable=False)
    assigned_to: Mapped[str] = mapped_column(String(255), nullable=False)
    is_action_gap_trigger: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    incident: Mapped[IncidentModel] = relationship("IncidentModel", back_populates="actions")
    confirmations: Mapped[list[ActionConfirmationModel]] = relationship(
        "ActionConfirmationModel", back_populates="action", cascade="all, delete-orphan"
    )


class ActionConfirmationModel(Base):
    """Physical ground verification record for an operational action."""

    __tablename__ = "action_confirmations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    action_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("actions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    incident_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"), index=True, nullable=False
    )

    confirming_officer: Mapped[str] = mapped_column(String(255), nullable=False)
    confirming_agency: Mapped[str] = mapped_column(String(255), nullable=False)
    communication_channel: Mapped[str] = mapped_column(String(64), default="TETRA_RADIO", nullable=False)
    location_confirmed: Mapped[str] = mapped_column(String(255), nullable=False)

    confirmed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    confirmation_notes: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    action: Mapped[ActionModel] = relationship("ActionModel", back_populates="confirmations")


class AuditEventModel(Base):
    """Append-oriented domain audit record."""

    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"), index=True, nullable=False
    )

    event_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    actor_role: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    previous_state: Mapped[str | None] = mapped_column(String(64), nullable=True)
    new_state: Mapped[str | None] = mapped_column(String(64), nullable=True)

    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True, nullable=False)

    incident: Mapped[IncidentModel] = relationship("IncidentModel", back_populates="audit_events")


class ReassessmentModel(Base):
    """Physical hazard reassessment and divergence reconciliation record."""

    __tablename__ = "reassessments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("incidents.id", ondelete="CASCADE"), index=True, nullable=False
    )

    previous_hazard_state: Mapped[str] = mapped_column(String(32), nullable=False)
    updated_hazard_state: Mapped[str] = mapped_column(String(32), nullable=False)
    updated_risk_level: Mapped[str] = mapped_column(String(32), nullable=False)
    updated_risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    updated_confidence_level: Mapped[str] = mapped_column(String(32), default="MODERATE", nullable=False)
    updated_confidence_score: Mapped[float] = mapped_column(Float, default=50.0, nullable=False)

    divergence_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    continuity_supported: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    lineage_id: Mapped[str] = mapped_column(String(64), default="HL-TG-2048-01", nullable=False)
    lineage_decision: Mapped[str] = mapped_column(String(64), default="CONTINUE_SAME_LINEAGE", nullable=False)

    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    operational_guidance: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    reassessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    reassessed_by: Mapped[str] = mapped_column(String(255), default="system", nullable=False)

    incident: Mapped[IncidentModel] = relationship("IncidentModel", back_populates="reassessments")

