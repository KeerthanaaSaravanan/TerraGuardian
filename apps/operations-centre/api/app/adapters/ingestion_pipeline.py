"""Authoritative External Data Ingestion Pipeline.

Coordinates adapters, payload deduplication, data-quality gating, quarantine isolation,
incident association, and domain persistence without mutating FSM state or authority.
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.base import (
    CanonicalObservation,
    ExternalDataAdapter,
    IncidentAssociationStatus,
    IngestionAuditRecord,
    IngestionFailureReason,
    IngestionResult,
    IngestionStatus,
    SourceAccessStatus,
)
from app.adapters.copernicus_insar_adapter import CopernicusInSARAdapter
from app.adapters.imd_rainfall_adapter import IMDRainfallAdapter
from app.adapters.iot_inclinometer_adapter import IoTInclinometerAdapter
from app.db.models import EvidenceModel, IncidentModel
from app.domain.enums import (
    AuditEventType,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceProcessingStatus,
    IncidentStatus,
)
from app.domain.outcome import haversine_distance_meters
from app.services.audit_service import AuditService


class IngestionPipeline:
    """Central ingestion coordinator enforcing validation, quality, deduplication, and non-bypass rules."""

    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session
        self.audit_service = AuditService(session) if session else None
        
        # Registry of trusted adapters
        self.adapters: dict[str, ExternalDataAdapter] = {
            "rainfall": IMDRainfallAdapter(),
            "imd_rainfall": IMDRainfallAdapter(),
            "inclinometer": IoTInclinometerAdapter(),
            "iot_inclinometer": IoTInclinometerAdapter(),
            "insar": CopernicusInSARAdapter(),
            "copernicus_insar": CopernicusInSARAdapter(),
        }

        # Deduplication Hash Store (In-memory cache; maps hash -> observation_id)
        # In production this would be backed by Redis / PostgreSQL unique constraint
        self._hash_registry: dict[str, uuid.UUID] = {}

        # Quarantine Registry
        self._quarantine_store: dict[uuid.UUID, dict[str, Any]] = {}

        # Ingestion Metrics
        self.metrics = {
            "attempts": 0,
            "accepted": 0,
            "rejected": 0,
            "quarantined": 0,
            "duplicates": 0,
        }

    def register_adapter(self, key: str, adapter: ExternalDataAdapter) -> None:
        """Register a new or custom external adapter."""
        self.adapters[key.lower()] = adapter

    def clear_caches(self) -> None:
        """Clear duplicate and quarantine registries (primarily for testing)."""
        self._hash_registry.clear()
        self._quarantine_store.clear()
        self.metrics = {k: 0 for k in self.metrics}

    @staticmethod
    def compute_semantic_observation_key(
        source_type: str,
        source_id: str,
        metric_name: str,
        observed_at: datetime,
        latitude: float,
        longitude: float,
    ) -> str:
        """Compute composite multi-modal semantic deduplication key (Resolving COND-02).
        
        Key Format: source_type : source_id : metric_name : observed_at : round(lat, 4) : round(lon, 4)
        """
        time_str = observed_at.isoformat() if hasattr(observed_at, "isoformat") else str(observed_at)
        return f"{source_type}:{source_id}:{metric_name}:{time_str}:{round(latitude, 4)}:{round(longitude, 4)}"

    async def ingest_payload(
        self,
        adapter_key: str,
        raw_payload: dict[str, Any],
        incident_id: Optional[uuid.UUID] = None,
        provenance_override: Optional[SourceAccessStatus] = None,
    ) -> IngestionResult:
        """Execute the end-to-end ingestion pipeline for a raw external payload."""
        start_time = time.perf_counter()
        self.metrics["attempts"] += 1

        adapter = self.adapters.get(adapter_key.lower())
        if not adapter:
            self.metrics["rejected"] += 1
            audit = IngestionAuditRecord(
                source_id="UNKNOWN",
                adapter_name=adapter_key,
                provenance_class=provenance_override or SourceAccessStatus.BLOCKED,
                ingestion_status=IngestionStatus.REJECTED,
                failure_reason=IngestionFailureReason.SOURCE_UNAVAILABLE,
                raw_payload_hash="N/A",
                details=f"No registered adapter found for key '{adapter_key}'",
                processing_time_ms=(time.perf_counter() - start_time) * 1000.0,
            )
            return IngestionResult(
                status=IngestionStatus.REJECTED,
                failure_reason=IngestionFailureReason.SOURCE_UNAVAILABLE,
                audit_record=audit,
                details=audit.details,
            )

        # 1. Deduplication / Idempotency Check
        payload_hash = adapter.compute_payload_hash(raw_payload)
        if payload_hash in self._hash_registry:
            self.metrics["duplicates"] += 1
            existing_obs_id = self._hash_registry[payload_hash]
            audit = IngestionAuditRecord(
                source_id=str(raw_payload.get("station_id", raw_payload.get("sensor_id", "UNKNOWN"))),
                adapter_name=adapter.adapter_name,
                provenance_class=provenance_override or adapter.access_status,
                ingestion_status=IngestionStatus.DUPLICATE,
                failure_reason=IngestionFailureReason.DUPLICATE,
                raw_payload_hash=payload_hash,
                observation_id=existing_obs_id,
                details="Duplicate payload rejected idempotently; observation already exists.",
                processing_time_ms=(time.perf_counter() - start_time) * 1000.0,
            )
            return IngestionResult(
                status=IngestionStatus.DUPLICATE,
                failure_reason=IngestionFailureReason.DUPLICATE,
                audit_record=audit,
                details=audit.details,
                is_duplicate=True,
            )

        # 2. Raw Payload Validation
        is_valid, failure_reason, detail_msg = adapter.validate_raw(raw_payload)
        if not is_valid:
            if failure_reason == IngestionFailureReason.QUARANTINED:
                self.metrics["quarantined"] += 1
                qid = uuid.uuid4()
                q_data = {
                    "quarantine_id": qid,
                    "adapter_name": adapter.adapter_name,
                    "raw_payload": raw_payload,
                    "payload_hash": payload_hash,
                    "reason": detail_msg,
                    "quarantined_at": datetime.now(timezone.utc).isoformat(),
                }
                self._quarantine_store[qid] = q_data

                # Persistent Quarantine Storage (Phase 3 Gap COND-01 Resolution)
                if self.session:
                    try:
                        from app.gis.models import QuarantineRecordModel
                        q_record = QuarantineRecordModel(
                            id=qid,
                            source_id=str(raw_payload.get("station_id", raw_payload.get("sensor_id", "UNKNOWN"))),
                            adapter_name=adapter.adapter_name,
                            failure_reason=failure_reason.value,
                            raw_payload_hash=payload_hash,
                            details=detail_msg,
                            raw_payload_json=raw_payload,
                            provenance_class=(provenance_override or adapter.access_status).value,
                            quarantined_at=datetime.utcnow(),
                            review_status="PENDING_REVIEW",
                        )
                        self.session.add(q_record)
                        await self.session.flush()
                    except Exception:
                        pass  # Fail-safe to ensure in-memory quarantine remains intact

                audit = IngestionAuditRecord(
                    source_id=str(raw_payload.get("station_id", raw_payload.get("sensor_id", "UNKNOWN"))),
                    adapter_name=adapter.adapter_name,
                    provenance_class=provenance_override or adapter.access_status,
                    ingestion_status=IngestionStatus.QUARANTINED,
                    failure_reason=failure_reason,
                    raw_payload_hash=payload_hash,
                    details=detail_msg,
                    processing_time_ms=(time.perf_counter() - start_time) * 1000.0,
                )
                return IngestionResult(
                    status=IngestionStatus.QUARANTINED,
                    failure_reason=failure_reason,
                    audit_record=audit,
                    quarantine_id=qid,
                    details=detail_msg,
                )
            else:
                self.metrics["rejected"] += 1
                audit = IngestionAuditRecord(
                    source_id=str(raw_payload.get("station_id", raw_payload.get("sensor_id", "UNKNOWN"))),
                    adapter_name=adapter.adapter_name,
                    provenance_class=provenance_override or adapter.access_status,
                    ingestion_status=IngestionStatus.REJECTED,
                    failure_reason=failure_reason,
                    raw_payload_hash=payload_hash,
                    details=detail_msg,
                    processing_time_ms=(time.perf_counter() - start_time) * 1000.0,
                )
                return IngestionResult(
                    status=IngestionStatus.REJECTED,
                    failure_reason=failure_reason,
                    audit_record=audit,
                    details=detail_msg,
                )

        # 3. Normalization into Canonical Observation
        try:
            canonical_obs = adapter.transform(raw_payload, provenance=provenance_override)
        except Exception as exc:
            self.metrics["rejected"] += 1
            audit = IngestionAuditRecord(
                source_id=str(raw_payload.get("station_id", raw_payload.get("sensor_id", "UNKNOWN"))),
                adapter_name=adapter.adapter_name,
                provenance_class=provenance_override or adapter.access_status,
                ingestion_status=IngestionStatus.REJECTED,
                failure_reason=IngestionFailureReason.TRANSFORMATION_FAILED,
                raw_payload_hash=payload_hash,
                details=f"Transformation exception: {str(exc)}",
                processing_time_ms=(time.perf_counter() - start_time) * 1000.0,
            )
            return IngestionResult(
                status=IngestionStatus.REJECTED,
                failure_reason=IngestionFailureReason.TRANSFORMATION_FAILED,
                audit_record=audit,
                details=audit.details,
            )

        # 4. Incident Association Resolution
        assoc_status = IncidentAssociationStatus.UNASSIGNED
        matched_incident: Optional[IncidentModel] = None

        if self.session and incident_id:
            stmt = select(IncidentModel).where(IncidentModel.id == incident_id)
            res = await self.session.execute(stmt)
            matched_incident = res.scalar_one_or_none()

            if matched_incident:
                # Spatial distance check against incident centroid
                dist_m = haversine_distance_meters(
                    matched_incident.latitude,
                    matched_incident.longitude,
                    canonical_obs.latitude,
                    canonical_obs.longitude,
                )
                if dist_m <= 5000.0:  # <= 5.0 km
                    assoc_status = IncidentAssociationStatus.ATTACHED
                elif dist_m <= 10000.0:  # 5.0 km to 10.0 km
                    assoc_status = IncidentAssociationStatus.REVIEW_REQUIRED
                else:  # > 10.0 km
                    assoc_status = IncidentAssociationStatus.UNASSIGNED

        # 5. Domain Persistence (Only if attached, and NEVER mutating FSM/status!)
        if self.session and matched_incident and assoc_status == IncidentAssociationStatus.ATTACHED:
            # Check terminal state
            if matched_incident.status not in (IncidentStatus.RESOLVED.value, IncidentStatus.REVIEWED.value):
                evidence_item = EvidenceModel(
                    incident_id=matched_incident.id,
                    source=canonical_obs.source_type.value,
                    source_name=canonical_obs.source_name,
                    evidence_type=canonical_obs.metric_name,
                    observation=f"{canonical_obs.source_name}: {canonical_obs.raw_value} {canonical_obs.unit}",
                    metric=f"{canonical_obs.normalized_value} {canonical_obs.unit}",
                    reliability="HIGH" if canonical_obs.quality_status == "VALID" else "MODERATE",
                    observed_at=canonical_obs.observed_at,
                    latitude=canonical_obs.latitude,
                    longitude=canonical_obs.longitude,
                    provenance=canonical_obs.provenance_class.value,
                    original_reference=canonical_obs.source_id,
                    is_simulated=(canonical_obs.provenance_class != SourceAccessStatus.LIVE),
                    freshness_seconds=canonical_obs.freshness_seconds,
                    confidence_contribution=10.0 if canonical_obs.quality_status == "VALID" else 5.0,
                    processing_status=EvidenceProcessingStatus.PROCESSED.value,
                    interpretation=EvidenceInterpretation.UNVERIFIED.value,  # Invariant: External obs enters UNVERIFIED!
                    conflict_status=EvidenceConflictStatus.NONE.value,
                    raw_data={
                        "raw_payload_hash": canonical_obs.raw_payload_hash,
                        "schema_version": canonical_obs.schema_version,
                        "metadata": canonical_obs.metadata_json,
                    },
                )
                self.session.add(evidence_item)
                await self.session.flush()

                # Audit Event (Audit trail of evidence receipt)
                if self.audit_service:
                    await self.audit_service.record_event(
                        incident_id=matched_incident.id,
                        event_type=AuditEventType.EVIDENCE_RECEIVED,
                        actor_role="SYSTEM_AI",
                        actor_name=adapter.adapter_name,
                        reason=f"External observation ingested from {canonical_obs.source_id}",
                        payload={
                            "observation_id": str(canonical_obs.observation_id),
                            "source_type": canonical_obs.source_type.value,
                            "metric_name": canonical_obs.metric_name,
                            "normalized_value": canonical_obs.normalized_value,
                            "provenance": canonical_obs.provenance_class.value,
                            "raw_hash": canonical_obs.raw_payload_hash,
                        },
                    )

        # 6. Record In Hash Registry for Idempotency
        self._hash_registry[payload_hash] = canonical_obs.observation_id
        self.metrics["accepted"] += 1

        audit = IngestionAuditRecord(
            source_id=canonical_obs.source_id,
            adapter_name=adapter.adapter_name,
            provenance_class=canonical_obs.provenance_class,
            ingestion_status=IngestionStatus.ACCEPTED,
            failure_reason=IngestionFailureReason.NONE,
            raw_payload_hash=payload_hash,
            observation_id=canonical_obs.observation_id,
            incident_id=matched_incident.id if matched_incident else None,
            association_status=assoc_status,
            details=f"Observation accepted. Association: {assoc_status.value}.",
            processing_time_ms=(time.perf_counter() - start_time) * 1000.0,
        )

        return IngestionResult(
            status=IngestionStatus.ACCEPTED,
            failure_reason=IngestionFailureReason.NONE,
            observation=canonical_obs,
            audit_record=audit,
            details=audit.details,
            is_duplicate=False,
        )

    async def replay_feed(
        self,
        adapter_key: str,
        records: list[dict[str, Any]],
        incident_id: Optional[uuid.UUID] = None,
    ) -> list[IngestionResult]:
        """Execute deterministic sequential replay of external historical payloads."""
        results: list[IngestionResult] = []
        for record in records:
            res = await self.ingest_payload(
                adapter_key=adapter_key,
                raw_payload=record,
                incident_id=incident_id,
                provenance_override=SourceAccessStatus.REPLAY,
            )
            results.append(res)
        return results

    def get_quarantine_records(self) -> list[dict[str, Any]]:
        """Return all quarantined records for forensic review."""
        return list(self._quarantine_store.values())
