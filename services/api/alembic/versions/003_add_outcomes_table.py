"""Add outcomes table for Intervention-Conditioned Hazard Outcome Engine.

Revision ID: 003_add_outcomes_table
Revises: 002_add_users_table
Create Date: 2026-09-22 21:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "003_add_outcomes_table"
down_revision: Union[str, None] = "002_add_users_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "outcomes",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("incident_id", sa.UUID(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("outcome_type", sa.String(length=64), nullable=False),
        sa.Column("intervention_state", sa.String(length=64), nullable=False),
        sa.Column("observation_adequacy", sa.String(length=64), nullable=False),
        sa.Column("causal_claim_established", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("closure_permitted", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("reassessment_required", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("recommended_hazard_state", sa.String(length=32), nullable=False),
        sa.Column("spatial_divergence_meters", sa.Float(), nullable=True),
        sa.Column("within_supported_scope", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("evidence_summary", sa.JSON(), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("evaluated_by", sa.String(length=255), server_default="OutcomeEngine", nullable=False),
    )
    op.create_index("ix_outcomes_incident_id", "outcomes", ["incident_id"])
    op.create_index("ix_outcomes_outcome_type", "outcomes", ["outcome_type"])


def downgrade() -> None:
    op.drop_index("ix_outcomes_outcome_type", table_name="outcomes")
    op.drop_index("ix_outcomes_incident_id", table_name="outcomes")
    op.drop_table("outcomes")
