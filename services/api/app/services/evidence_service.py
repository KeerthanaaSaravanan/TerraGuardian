"""Evidence service managing multi-source evidence fabric, observations, and safety boundaries."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import EvidenceModel
from app.domain.enums import (
    ActorRole,
    AuditEventType,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceProcessingStatus,
    EvidenceSource,
    IncidentStatus,
)
from app.domain.outcome import haversine_distance_meters
from app.services.audit_service import AuditService
from app.services.exceptions import (
    DomainError,
    IncidentNotFoundError,
    InvalidTransitionError,
    UnauthorizedAuthorityError,
)
from app.services.incident_service import IncidentService


class EvidenceService:
    """Service managing evidence records attached to an incident."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.incident_service = IncidentService(session)
        self.audit_service = AuditService(session)

    async def get_evidence_by_id(self, evidence_id: uuid.UUID) -> EvidenceModel:
        """Fetch a single evidence item by ID."""
        stmt = select(EvidenceModel).where(EvidenceModel.id == evidence_id)
        result = await self.session.execute(stmt)
        item = result.scalar_one_or_none()
        if not item:
            raise DomainError(f"Evidence item with ID {evidence_id} not found.")
        return item

    async def get_evidence_for_incident(self, incident_id: uuid.UUID) -> list[EvidenceModel]:
        """Fetch all evidence items associated with an incident."""
        await self.incident_service.get_by_id(incident_id)

        stmt = (
            select(EvidenceModel)
            .where(EvidenceModel.incident_id == incident_id)
            .order_by(EvidenceModel.observed_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def add_evidence(
        self,
        incident_id: uuid.UUID,
        source: EvidenceSource | str,
        source_name: str,
        evidence_type: str,
        observation: str,
        metric: str,
        reliability: str = "HIGH",
        observed_at: datetime | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
        provenance: str | None = None,
        original_reference: str | None = None,
        is_simulated: bool = False,
        freshness_seconds: int | None = None,
        confidence_contribution: float | None = None,
        processing_status: EvidenceProcessingStatus | str = EvidenceProcessingStatus.RECEIVED,
        interpretation: EvidenceInterpretation | str = EvidenceInterpretation.UNVERIFIED,
        conflict_status: EvidenceConflictStatus | str = EvidenceConflictStatus.NONE,
        conflict_details: str | None = None,
        details: str | None = None,
        raw_data: dict[str, Any] | None = None,
    ) -> EvidenceModel:
        """Add a discrete piece of evidence to an incident with safety boundary enforcement and audit tracking."""
        incident = await self.incident_service.get_by_id(incident_id)

        # ── TERMINAL STATE IMMUTABILITY ──
        # Closed / reviewed incidents cannot accept new operational evidence.
        if incident.status in (IncidentStatus.RESOLVED.value, IncidentStatus.REVIEWED.value):
            raise DomainError(
                f"Incident {incident.code} is in terminal state '{incident.status}'. "
                "Evidence cannot be attached to a closed or archived incident twin."
            )

        # ── COORDINATE RANGE VALIDATION ──
        if latitude is not None and not (-90.0 <= latitude <= 90.0):
            raise DomainError(f"Invalid latitude: {latitude}. Latitude must be between -90.0 and 90.0 degrees.")
        if longitude is not None and not (-180.0 <= longitude <= 180.0):
            raise DomainError(f"Invalid longitude: {longitude}. Longitude must be between -180.0 and 180.0 degrees.")

        # ── TEMPORAL / FRESHNESS VALIDATION ──
        now_utc = datetime.utcnow()
        if observed_at is not None:
            obs_cmp = observed_at.replace(tzinfo=None) if observed_at.tzinfo else observed_at
            if obs_cmp > now_utc + timedelta(minutes=5):
                raise DomainError(
                    f"Temporal integrity violation: Evidence observed_at ({observed_at.isoformat()}) "
                    f"is in the future relative to server time ({now_utc.isoformat()})."
                )
        if freshness_seconds is not None and freshness_seconds < 0:
            raise DomainError(f"freshness_seconds cannot be negative, got {freshness_seconds}.")

        if freshness_seconds is None and observed_at is not None:
            obs_cmp = observed_at.replace(tzinfo=None) if observed_at.tzinfo else observed_at
            freshness_seconds = max(0, int((now_utc - obs_cmp).total_seconds()))

        # ── SPATIAL BOUNDARY VALIDATION ──
        # Evidence with coordinates must fall within the maximum supported spatial scope (10.0 km).
        # Unrelated distant evidence cannot silently attach to the incident.
        if latitude is not None and longitude is not None:
            dist_m = haversine_distance_meters(incident.latitude, incident.longitude, latitude, longitude)
            if dist_m > 10000.0:  # 10 km
                raise DomainError(
                    f"Spatial boundary rejection: Evidence location ({latitude:.4f}, {longitude:.4f}) is "
                    f"{dist_m / 1000.0:.1f}km away from incident centroid ({incident.latitude:.4f}, {incident.longitude:.4f}), "
                    f"exceeding maximum supported incident scope of 10.0km. Unrelated distant evidence cannot silently attach to incident {incident.code}."
                )

        # ── PUBLIC SAFETY BOUNDARY ENFORCEMENT ──
        # Citizen observations MUST enter the operational fabric as UNVERIFIED.
        # They cannot self-authorize or enter pre-verified.
        source_val = source.value if hasattr(source, "value") else str(source)
        if source_val == EvidenceSource.CITIZEN.value or source_val == "CITIZEN":
            interpretation_val = EvidenceInterpretation.UNVERIFIED.value
            processing_status_val = EvidenceProcessingStatus.RECEIVED.value
        else:
            interpretation_val = interpretation.value if hasattr(interpretation, "value") else str(interpretation)
            processing_status_val = processing_status.value if hasattr(processing_status, "value") else str(processing_status)

        conflict_status_val = conflict_status.value if hasattr(conflict_status, "value") else str(conflict_status)

        evidence = EvidenceModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            source=source_val,
            source_name=source_name,
            evidence_type=evidence_type,
            observation=observation,
            metric=metric,
            reliability=reliability,
            observed_at=observed_at or now_utc,
            received_at=now_utc,
            latitude=latitude,
            longitude=longitude,
            provenance=provenance,
            original_reference=original_reference,
            is_simulated=is_simulated,
            freshness_seconds=freshness_seconds,
            confidence_contribution=confidence_contribution,
            processing_status=processing_status_val,
            interpretation=interpretation_val,
            conflict_status=conflict_status_val,
            conflict_details=conflict_details,
            details=details,
            raw_data=raw_data,
        )
        self.session.add(evidence)
        await self.session.flush()

        # Audit event
        actor_role = ActorRole.FIELD_VERIFIER if source_val == EvidenceSource.FIELD.value else ActorRole.SYSTEM_AI
        await self.audit_service.record_event(
            incident_id=incident.id,
            event_type=AuditEventType.EVIDENCE_RECEIVED,
            actor_role=actor_role,
            actor_name=source_name,
            reason=f"Evidence ingested: {evidence_type} from {source_name} (Verification: {interpretation_val})",
            payload={
                "evidence_id": str(evidence.id),
                "source": source_val,
                "metric": metric,
                "interpretation": interpretation_val,
                "conflict_status": conflict_status_val,
            },
        )

        return evidence

    async def update_evidence_status(
        self,
        evidence_id: uuid.UUID,
        actor_role: ActorRole,
        actor_name: str,
        processing_status: Optional[EvidenceProcessingStatus] = None,
        interpretation: Optional[EvidenceInterpretation] = None,
        conflict_status: Optional[EvidenceConflictStatus] = None,
        conflict_details: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> EvidenceModel:
        """Update processing, verification, or conflict status of an evidence item."""
        evidence = await self.get_evidence_by_id(evidence_id)

        # Invariant: AI/System actors CANNOT independently verify unverified citizen reports
        if (
            evidence.source == EvidenceSource.CITIZEN.value
            and interpretation == EvidenceInterpretation.VERIFIED
            and actor_role == ActorRole.SYSTEM_AI
        ):
            raise UnauthorizedAuthorityError(
                "Automated AI systems cannot independently verify citizen observations. "
                "Official ground patrol (FIELD_VERIFIER) or designated coordinator (OPERATOR) verification is required."
            )

        previous_interpretation = evidence.interpretation
        previous_processing = evidence.processing_status

        if processing_status is not None:
            evidence.processing_status = processing_status.value if hasattr(processing_status, "value") else str(processing_status)
        if interpretation is not None:
            evidence.interpretation = interpretation.value if hasattr(interpretation, "value") else str(interpretation)
        if conflict_status is not None:
            evidence.conflict_status = conflict_status.value if hasattr(conflict_status, "value") else str(conflict_status)
        if conflict_details is not None:
            evidence.conflict_details = conflict_details

        await self.session.flush()

        # Record audit event for verification / processing change
        await self.audit_service.record_event(
            incident_id=evidence.incident_id,
            event_type=AuditEventType.EVIDENCE_RECONCILED,
            actor_role=actor_role,
            actor_name=actor_name,
            previous_state=f"{previous_processing}/{previous_interpretation}",
            new_state=f"{evidence.processing_status}/{evidence.interpretation}",
            reason=reason or f"Evidence {evidence.evidence_type} status updated by {actor_name}",
            payload={
                "evidence_id": str(evidence.id),
                "source": evidence.source,
                "interpretation": evidence.interpretation,
                "conflict_status": evidence.conflict_status,
            },
        )

        return evidence
