"""TerraGuardian Intelligence Contract — Evidence Processing Domain.

Status: DESIGN CONTRACT
Runtime Status: NOT ACTIVE
Active Runtime Implementation: services/api/app/services/reconciliation_service.py

This module defines strongly typed domain boundaries for evidence ingestion,
provenance tracking, temporal freshness classification, and cross-source conflict
reconciliation.

Core Invariants:
    MISSING EVIDENCE != HAZARD RESOLUTION
    Citizen evidence remains UNVERIFIED until corroborated by physical patrol or official instrumentation.
    Old telemetry must not silently represent current physical conditions (Stale Assessment != Current State).
"""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid


class EvidenceSourceType(str, enum.Enum):
    """Authoritative classification of evidence acquisition channels."""

    AUTOMATED_SENSOR = "AUTOMATED_SENSOR"
    SATELLITE_REMOTE_SENSING = "SATELLITE_REMOTE_SENSING"
    FIELD_PATROL = "FIELD_PATROL"
    CITIZEN_OBSERVATION = "CITIZEN_OBSERVATION"
    REGIONAL_EARLY_WARNING = "REGIONAL_EARLY_WARNING"


class VerificationState(str, enum.Enum):
    """Evidentiary verification hierarchy."""

    UNVERIFIED = "UNVERIFIED"
    OFFICIALLY_VERIFIED = "OFFICIALLY_VERIFIED"
    CORROBORATED = "CORROBORATED"
    DISCREDITED = "DISCREDITED"


class FreshnessCategory(str, enum.Enum):
    """Temporal validity classification based on operational half-life."""

    REAL_TIME = "REAL_TIME"      # < 1 hour old
    RECENT = "RECENT"            # 1 to 6 hours old
    DEGRADED = "DEGRADED"        # 6 to 24 hours old
    STALE = "STALE"              # > 24 hours (flags uncertainty)


class ConflictState(str, enum.Enum):
    """Multi-source concordancy status."""

    CONCORDANT = "CONCORDANT"
    PARTIALLY_CONFLICTING = "PARTIALLY_CONFLICTING"
    DIRECTLY_CONTRADICTORY = "DIRECTLY_CONTRADICTORY"


@dataclass(frozen=True)
class EvidenceObservationContract:
    """Design contract for individual evidence observations."""

    evidence_id: uuid.UUID
    incident_id: uuid.UUID
    source_type: EvidenceSourceType
    source_name: str
    observed_at: datetime
    received_at: datetime
    verification_state: VerificationState
    freshness: FreshnessCategory
    reliability_weight: float  # 0.0 to 1.0
    telemetry_payload: Dict[str, Any] = field(default_factory=dict)
    provenance_hash: Optional[str] = None
    verifier_name: Optional[str] = None


@dataclass(frozen=True)
class EvidenceReconciliationSummaryContract:
    """Design contract representing synthesized multi-source evidence state."""

    summary_id: uuid.UUID
    incident_id: uuid.UUID
    evaluated_at: datetime
    total_observations_count: int
    verified_observations_count: int
    conflict_state: ConflictState
    conflict_rationale: Optional[str]
    has_active_observation_gap: bool
    stale_evidence_ids: List[uuid.UUID] = field(default_factory=list)
    corroborated_evidence_ids: List[uuid.UUID] = field(default_factory=list)
