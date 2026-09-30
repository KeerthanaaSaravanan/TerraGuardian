"""Authoritative Operational Permission Matrix (Phase 2).

Core governance principle:
AI assists reasoning.
Rules govern critical state transitions.
Humans authorize critical actions.

Therefore:
Recommendation ≠ Authorization
Authorization ≠ Execution
Execution ≠ Confirmation
"""

from __future__ import annotations

import enum
from typing import Any

from app.domain.enums import ActorRole


class OperationalPermission(str, enum.Enum):
    """Explicit operational permissions."""
    READ = "READ"
    ASSESS = "ASSESS"
    RECONCILE_EVIDENCE = "RECONCILE_EVIDENCE"
    PROPOSE_ACTION = "PROPOSE_ACTION"
    AUTHORIZE_ACTION = "AUTHORIZE_ACTION"
    EXECUTE_ACTION = "EXECUTE_ACTION"
    CONFIRM_PHYSICAL_COMPLETION = "CONFIRM_PHYSICAL_COMPLETION"
    RECORD_OUTCOME = "RECORD_OUTCOME"
    REVIEW = "REVIEW"
    ADMINISTER = "ADMINISTER"


# Explicit Role → Permission Matrix
PERMISSION_MATRIX: dict[ActorRole, set[OperationalPermission]] = {
    # 1. CITIZEN: Read public advisories and citizen reports; no authority mutations.
    ActorRole.CITIZEN: {
        OperationalPermission.READ,
    },
    # 2. OPERATOR: Operational coordination, triage, evidence reconciliation, action dispatch, outcomes.
    # CANNOT authorize actions (Recommendation ≠ Authorization).
    # CANNOT confirm physical completion (Execution ≠ Confirmation).
    ActorRole.OPERATOR: {
        OperationalPermission.READ,
        OperationalPermission.ASSESS,
        OperationalPermission.RECONCILE_EVIDENCE,
        OperationalPermission.PROPOSE_ACTION,
        OperationalPermission.EXECUTE_ACTION,
        OperationalPermission.RECORD_OUTCOME,
        OperationalPermission.REVIEW,
    },
    # 3. ASSESSMENT_OFFICER: Scientific/geotechnical hazard analysis & assessment models.
    # CANNOT authorize statutory emergency orders or execute physical dispatch.
    ActorRole.ASSESSMENT_OFFICER: {
        OperationalPermission.READ,
        OperationalPermission.ASSESS,
        OperationalPermission.RECONCILE_EVIDENCE,
        OperationalPermission.PROPOSE_ACTION,
        OperationalPermission.RECORD_OUTCOME,
        OperationalPermission.REVIEW,
    },
    # 4. FIELD_RESPONDER: On-site emergency patrols, SDRF/police field personnel.
    # The ONLY human actor authorized to physically confirm ground completion with evidence.
    # CANNOT authorize district emergency orders.
    ActorRole.FIELD_RESPONDER: {
        OperationalPermission.READ,
        OperationalPermission.RECONCILE_EVIDENCE,
        OperationalPermission.EXECUTE_ACTION,
        OperationalPermission.CONFIRM_PHYSICAL_COMPLETION,
    },
    # 5. AUTHORIZATION_OFFICER: District Magistrate / Statutory Authority (#DDMA-WK-884).
    # The ONLY role authorized to enact binding emergency decision orders and approve statutory actions.
    # Does not self-execute on ground or self-confirm physical completion.
    ActorRole.AUTHORIZATION_OFFICER: {
        OperationalPermission.READ,
        OperationalPermission.ASSESS,
        OperationalPermission.RECONCILE_EVIDENCE,
        OperationalPermission.PROPOSE_ACTION,
        OperationalPermission.AUTHORIZE_ACTION,
        OperationalPermission.RECORD_OUTCOME,
        OperationalPermission.REVIEW,
    },
    # 6. REVIEWER: Independent post-event statutory/audit review and oversight.
    # Read-only audit access; strictly prohibited from mutating active operations or authorizing actions.
    ActorRole.REVIEWER: {
        OperationalPermission.READ,
        OperationalPermission.REVIEW,
    },
    # 7. ADMINISTRATOR: System configuration, ingestion adapters, user credentials, model registry.
    # Administrative privileges are explicit; does not conflate civil emergency decision authority.
    ActorRole.ADMINISTRATOR: {
        OperationalPermission.READ,
        OperationalPermission.REVIEW,
        OperationalPermission.ADMINISTER,
    },
    # Internal automated AI pipelines (cannot make critical decisions).
    ActorRole.SYSTEM_AI: {
        OperationalPermission.READ,
        OperationalPermission.ASSESS,
        OperationalPermission.RECONCILE_EVIDENCE,
    },
    # Compatibility aliases
    ActorRole.PUBLIC_CITIZEN: {
        OperationalPermission.READ,
    },
    ActorRole.FIELD_VERIFIER: {
        OperationalPermission.READ,
        OperationalPermission.RECONCILE_EVIDENCE,
        OperationalPermission.EXECUTE_ACTION,
        OperationalPermission.CONFIRM_PHYSICAL_COMPLETION,
    },
    ActorRole.AUTHORIZED_DECISION_MAKER: {
        OperationalPermission.READ,
        OperationalPermission.ASSESS,
        OperationalPermission.RECONCILE_EVIDENCE,
        OperationalPermission.PROPOSE_ACTION,
        OperationalPermission.AUTHORIZE_ACTION,
        OperationalPermission.RECORD_OUTCOME,
        OperationalPermission.REVIEW,
    },
    ActorRole.ADMIN: {
        OperationalPermission.READ,
        OperationalPermission.REVIEW,
        OperationalPermission.ADMINISTER,
    },
}


def normalize_role(role: ActorRole | str) -> ActorRole:
    """Safely convert any role string or alias to canonical ActorRole."""
    val = role.value if isinstance(role, ActorRole) else str(role)
    val = val.upper().strip()
    if val in ("FIELD_VERIFIER", "FIELD_RESPONDER"):
        return ActorRole.FIELD_RESPONDER
    if val in ("AUTHORIZED_DECISION_MAKER", "AUTHORIZATION_OFFICER"):
        return ActorRole.AUTHORIZATION_OFFICER
    if val in ("PUBLIC_CITIZEN", "CITIZEN"):
        return ActorRole.CITIZEN
    if val in ("ADMIN", "ADMINISTRATOR"):
        return ActorRole.ADMINISTRATOR
    try:
        return ActorRole(val)
    except ValueError:
        return ActorRole[val]


def has_permission(role: ActorRole | str, permission: OperationalPermission | str) -> bool:
    """Evaluate whether an actor role holds the given operational permission."""
    canonical_role = normalize_role(role)
    perm = OperationalPermission(permission) if isinstance(permission, str) else permission
    return perm in PERMISSION_MATRIX.get(canonical_role, set())


def get_role_permissions(role: ActorRole | str) -> list[str]:
    """Retrieve sorted list of all granted permission strings for an actor role."""
    canonical_role = normalize_role(role)
    perms = PERMISSION_MATRIX.get(canonical_role, set())
    return sorted([p.value for p in perms])
