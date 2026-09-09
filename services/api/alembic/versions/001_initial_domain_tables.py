"""Initial TerraGuardian Domain Tables.

Revision ID: 001_initial_domain
Revises: None
Create Date: 2026-09-09 22:15:00.000000

Creates normalized tables:
- incidents
- evidence
- decisions
- actions
- action_confirmations
- audit_events
- reassessments
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "001_initial_domain"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Incidents Table
    op.create_table(
        "incidents",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("incident_type", sa.String(length=64), server_default="landslide", nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("hazard_state", sa.String(length=32), nullable=False),
        sa.Column("risk_level", sa.String(length=32), nullable=False),
        sa.Column("risk_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("confidence_level", sa.String(length=32), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("priority_level", sa.String(length=32), nullable=False),
        sa.Column("priority_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("location_name", sa.String(length=255), nullable=True),
        sa.Column("corridor_name", sa.String(length=255), nullable=True),
        sa.Column("state", sa.String(length=100), server_default="Arunachal Pradesh", nullable=False),
        sa.Column("district", sa.String(length=100), server_default="West Kameng", nullable=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_primary_demo", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("is_simulated", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
    )
    op.create_index("ix_incidents_code", "incidents", ["code"], unique=True)
    op.create_index("ix_incidents_status", "incidents", ["status"])
    op.create_index("ix_incidents_hazard_state", "incidents", ["hazard_state"])
    op.create_index("ix_incidents_risk_level", "incidents", ["risk_level"])
    op.create_index("ix_incidents_confidence_level", "incidents", ["confidence_level"])
    op.create_index("ix_incidents_priority_level", "incidents", ["priority_level"])

    # 2. Evidence Table
    op.create_table(
        "evidence",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("incident_id", sa.UUID(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("source_name", sa.String(length=255), nullable=False),
        sa.Column("evidence_type", sa.String(length=100), nullable=False),
        sa.Column("observation", sa.Text(), nullable=False),
        sa.Column("metric", sa.String(length=255), nullable=False),
        sa.Column("reliability", sa.String(length=32), server_default="HIGH", nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("provenance", sa.Text(), nullable=True),
        sa.Column("original_reference", sa.String(length=255), nullable=True),
        sa.Column("is_simulated", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("freshness_seconds", sa.Integer(), nullable=True),
        sa.Column("confidence_contribution", sa.Float(), nullable=True),
        sa.Column("processing_status", sa.String(length=32), server_default="RECEIVED", nullable=False),
        sa.Column("interpretation", sa.String(length=32), server_default="UNVERIFIED", nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("raw_data", sa.JSON(), nullable=True),
    )
    op.create_index("ix_evidence_incident_id", "evidence", ["incident_id"])
    op.create_index("ix_evidence_source", "evidence", ["source"])

    # 3. Decisions Table
    op.create_table(
        "decisions",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("incident_id", sa.UUID(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("decision_type", sa.String(length=32), nullable=False),
        sa.Column("action_directive", sa.Text(), nullable=False),
        sa.Column("signer_name", sa.String(length=255), nullable=False),
        sa.Column("signer_role", sa.String(length=64), server_default="AUTHORIZED_DECISION_MAKER", nullable=False),
        sa.Column("order_code", sa.String(length=100), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("proposed_measures", sa.JSON(), nullable=False),
        sa.Column("enacted_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_decisions_incident_id", "decisions", ["incident_id"])

    # 4. Actions Table
    op.create_table(
        "actions",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("incident_id", sa.UUID(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_code", sa.String(length=64), nullable=False),
        sa.Column("agency", sa.String(length=255), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("state", sa.String(length=32), server_default="PROPOSED", nullable=False),
        sa.Column("assigned_to", sa.String(length=255), nullable=False),
        sa.Column("is_action_gap_trigger", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_actions_incident_id", "actions", ["incident_id"])

    # 5. Action Confirmations Table
    op.create_table(
        "action_confirmations",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("action_id", sa.UUID(), sa.ForeignKey("actions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("incident_id", sa.UUID(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("confirming_officer", sa.String(length=255), nullable=False),
        sa.Column("confirming_agency", sa.String(length=255), nullable=False),
        sa.Column("communication_channel", sa.String(length=64), server_default="TETRA_RADIO", nullable=False),
        sa.Column("location_confirmed", sa.String(length=255), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmation_notes", sa.Text(), nullable=False),
        sa.Column("evidence_photo_url", sa.String(length=500), nullable=True),
    )
    op.create_index("ix_action_confirmations_action_id", "action_confirmations", ["action_id"])
    op.create_index("ix_action_confirmations_incident_id", "action_confirmations", ["incident_id"])

    # 6. Audit Events Table
    op.create_table(
        "audit_events",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("incident_id", sa.UUID(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("actor_role", sa.String(length=64), nullable=False),
        sa.Column("actor_name", sa.String(length=255), nullable=False),
        sa.Column("actor_id", sa.String(length=100), nullable=True),
        sa.Column("previous_state", sa.String(length=64), nullable=True),
        sa.Column("new_state", sa.String(length=64), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_events_incident_id", "audit_events", ["incident_id"])
    op.create_index("ix_audit_events_event_type", "audit_events", ["event_type"])
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"])

    # 7. Reassessments Table
    op.create_table(
        "reassessments",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("incident_id", sa.UUID(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("previous_hazard_state", sa.String(length=32), nullable=False),
        sa.Column("updated_hazard_state", sa.String(length=32), nullable=False),
        sa.Column("updated_risk_level", sa.String(length=32), nullable=False),
        sa.Column("updated_risk_score", sa.Float(), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=False),
        sa.Column("reassessed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reassessed_by", sa.String(length=255), server_default="system", nullable=False),
    )
    op.create_index("ix_reassessments_incident_id", "reassessments", ["incident_id"])


def downgrade() -> None:
    op.drop_table("reassessments")
    op.drop_table("audit_events")
    op.drop_table("action_confirmations")
    op.drop_table("actions")
    op.drop_table("decisions")
    op.drop_table("evidence")
    op.drop_table("incidents")
