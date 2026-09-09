"""Evidence service managing multi-source evidence fabric and observations."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import EvidenceModel
from app.domain.enums import (
    ActorRole,
    AuditEventType,
    EvidenceInterpretation,
    EvidenceProcessingStatus,
    EvidenceSource,
)
from app.services.audit_service import AuditService
from app.services.exceptions import IncidentNotFoundError
from app.services.incident_service import IncidentService


class EvidenceService:
    """Service managing evidence records attached to an incident."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.incident_service = IncidentService(session)
        self.audit_service = AuditService(session)

    async def get_evidence_for_incident(self, incident_id: uuid.UUID) -> list[EvidenceModel]:
        """Fetch all evidence items associated with an incident."""
        # Ensure incident exists
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
        source: EvidenceSource,
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
        processing_status: EvidenceProcessingStatus = EvidenceProcessingStatus.RECEIVED,
        interpretation: EvidenceInterpretation = EvidenceInterpretation.UNVERIFIED,
        details: str | None = None,
        raw_data: dict[str, Any] | None = None,
    ) -> EvidenceModel:
        """Add a discrete piece of evidence to an incident with audit tracking."""
        incident = await self.incident_service.get_by_id(incident_id)

        evidence = EvidenceModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            source=source.value if hasattr(source, "value") else str(source),
            source_name=source_name,
            evidence_type=evidence_type,
            observation=observation,
            metric=metric,
            reliability=reliability,
            observed_at=observed_at or datetime.utcnow(),
            received_at=datetime.utcnow(),
            latitude=latitude,
            longitude=longitude,
            provenance=provenance,
            original_reference=original_reference,
            is_simulated=is_simulated,
            freshness_seconds=freshness_seconds,
            confidence_contribution=confidence_contribution,
            processing_status=processing_status.value if hasattr(processing_status, "value") else str(processing_status),
            interpretation=interpretation.value if hasattr(interpretation, "value") else str(interpretation),
            details=details,
            raw_data=raw_data,
        )
        self.session.add(evidence)
        await self.session.flush()

        # Audit event
        await self.audit_service.record_event(
            incident_id=incident.id,
            event_type=AuditEventType.EVIDENCE_RECEIVED,
            actor_role=ActorRole.SYSTEM_AI if source != EvidenceSource.FIELD else ActorRole.FIELD_VERIFIER,
            actor_name=source_name,
            reason=f"Evidence added: {evidence_type} from {source_name}",
            payload={"evidence_id": str(evidence.id), "source": str(source), "metric": metric},
        )

        return evidence
