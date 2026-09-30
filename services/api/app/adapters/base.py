"""Base classes, enums, and protocols for External Data Adapters."""

from __future__ import annotations

import enum
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel, Field

from app.domain.enums import EvidenceInterpretation, EvidenceSource


class SourceAccessStatus(str, enum.Enum):
    """Institutional access reality of the external data provider."""
    LIVE = "LIVE"                                                      # Real-time institutional connection with valid API credentials
    REAL_HISTORICAL = "REAL_HISTORICAL"                                # Archived actual government/scientific datasets
    GEOGRAPHICALLY_GROUNDED_FIXTURE = "GEOGRAPHICALLY_GROUNDED_FIXTURE" # Structurally realistic mock derived from real geography
    REPLAY = "REPLAY"                                                  # Historical/deterministic dataset played forward in time
    SYNTHETIC = "SYNTHETIC"                                            # Mathematically generated benchmark fixture
    DEMO = "DEMO"                                                      # Seeded demonstration scenario data
    BLOCKED = "BLOCKED"                                                # Formal MOU / API credentials unavailable or denied



class IngestionStatus(str, enum.Enum):
    """Result of the ingestion validation and pipeline execution."""
    ACCEPTED = "ACCEPTED"                  # Validated, normalized, and accepted into canonical fabric
    REJECTED = "REJECTED"                  # Violates schema, coordinate, or temporal invariants
    QUARANTINED = "QUARANTINED"            # Suspicious or out-of-range; isolated for analyst review
    DUPLICATE = "DUPLICATE"                # Identical payload received previously; processed idempotently


class IngestionFailureReason(str, enum.Enum):
    """Granular failure codes for rejected or quarantined payloads."""
    NONE = "NONE"
    SOURCE_UNAVAILABLE = "SOURCE_UNAVAILABLE"
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
    SCHEMA_INVALID = "SCHEMA_INVALID"
    QUALITY_REJECTED = "QUALITY_REJECTED"
    STALE_DATA = "STALE_DATA"
    DUPLICATE = "DUPLICATE"
    QUARANTINED = "QUARANTINED"
    TRANSFORMATION_FAILED = "TRANSFORMATION_FAILED"
    SPATIAL_OUT_OF_BOUNDS = "SPATIAL_OUT_OF_BOUNDS"
    TEMPORAL_OUT_OF_BOUNDS = "TEMPORAL_OUT_OF_BOUNDS"
    IMPOSSIBLE_METRIC_VALUE = "IMPOSSIBLE_METRIC_VALUE"


class IncidentAssociationStatus(str, enum.Enum):
    """Association resolution between incoming external observation and incident twins."""
    ATTACHED = "ATTACHED"                  # Corroborated within spatial envelope (<= 5.0 km)
    REVIEW_REQUIRED = "REVIEW_REQUIRED"    # Near boundary (5.0 km to 10.0 km); requires human review
    UNASSIGNED = "UNASSIGNED"              # Distant or no matching incident twin in corridor


class CanonicalObservation(BaseModel):
    """Authoritative base schema for all normalized external observations."""
    observation_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    source_id: str
    source_name: str
    source_type: EvidenceSource
    provenance_class: SourceAccessStatus
    observed_at: datetime
    ingested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    latitude: float
    longitude: float
    spatial_reference: str = "EPSG:4326"
    spatial_resolution_meters: Optional[float] = None
    temporal_resolution_seconds: Optional[int] = None
    
    # Raw & Normalized Data
    raw_payload_hash: str
    metric_name: str
    raw_value: Any
    normalized_value: float
    unit: str
    
    # Quality & Governance
    quality_status: str = "VALID"
    freshness_seconds: int
    verification_status: EvidenceInterpretation = EvidenceInterpretation.UNVERIFIED
    processing_version: str = "1.0.0"
    schema_version: str = "1.0.0"
    lineage_reference: Optional[str] = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class IngestionAuditRecord(BaseModel):
    """Audit record capturing the full lineage of an ingestion attempt."""
    audit_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source_id: str
    adapter_name: str
    provenance_class: SourceAccessStatus
    ingestion_status: IngestionStatus
    failure_reason: IngestionFailureReason
    raw_payload_hash: str
    observation_id: Optional[uuid.UUID] = None
    incident_id: Optional[uuid.UUID] = None
    association_status: IncidentAssociationStatus = IncidentAssociationStatus.UNASSIGNED
    details: str = ""
    processing_time_ms: float = 0.0


class IngestionResult(BaseModel):
    """Comprehensive result object returned by the ingestion pipeline."""
    status: IngestionStatus
    failure_reason: IngestionFailureReason = IngestionFailureReason.NONE
    observation: Optional[CanonicalObservation] = None
    audit_record: IngestionAuditRecord
    quarantine_id: Optional[uuid.UUID] = None
    details: str = ""
    is_duplicate: bool = False


T = TypeVar("T", bound=CanonicalObservation)


class ExternalDataAdapter(Generic[T]):
    """Abstract protocol for external provider ingestion adapters."""

    adapter_name: str
    source_type: EvidenceSource
    access_status: SourceAccessStatus

    def compute_payload_hash(self, raw_payload: dict[str, Any]) -> str:
        """Compute deterministic SHA-256 hash of the raw JSON payload."""
        serialized = json.dumps(raw_payload, sort_keys=True, default=str)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def validate_raw(self, raw_payload: dict[str, Any]) -> tuple[bool, Optional[str]]:
        """Validate presence of basic structure and required raw fields."""
        raise NotImplementedError

    def transform(self, raw_payload: dict[str, Any], provenance: Optional[SourceAccessStatus] = None) -> T:
        """Transform raw provider payload into a normalized canonical observation."""
        raise NotImplementedError
