"""Authoritative Ingestion REST API Router."""

from __future__ import annotations

import uuid
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime
from pydantic import BaseModel, Field

from app.adapters.base import IngestionResult, IngestionStatus
from app.adapters.ingestion_pipeline import IngestionPipeline
from app.db.session import get_db_session
from app.domain.enums import EvidenceSource
from app.domain.outcome import haversine_distance_meters
from app.services.evidence_service import EvidenceService
from app.services.incident_service import IncidentService

router = APIRouter(prefix="/ingestion", tags=["Ingestion & External Data Adapters"])


class CitizenReportPayload(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    observation: str = Field(..., min_length=3)
    hazard_type: Optional[str] = "SLOPE_DEBRIS"
    severity: Optional[str] = "MEDIUM"
    photo_url: Optional[str] = None
    reporter_note: Optional[str] = None
    reporter_contact: Optional[str] = None
    incident_id: Optional[uuid.UUID] = None
    client_submission_id: Optional[str] = None
    captured_at: Optional[datetime] = None


class CitizenReportResponse(BaseModel):
    tracking_id: str
    evidence_id: uuid.UUID
    incident_id: uuid.UUID
    incident_code: str
    status: str
    interpretation: str
    message: str
    preliminary_guidance: str
    timestamp: datetime
    is_duplicate: bool = False


# Global singleton pipeline instance for caching hashes & quarantine
_global_pipeline = IngestionPipeline()


def get_pipeline(session: AsyncSession = Depends(get_db_session)) -> IngestionPipeline:
    """Dependency provider injecting the current database session into the pipeline."""
    _global_pipeline.session = session
    from app.services.audit_service import AuditService
    _global_pipeline.audit_service = AuditService(session)
    return _global_pipeline


@router.post(
    "/citizen-report",
    response_model=CitizenReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest public citizen hazard report and attach as unverified evidence",
)
async def ingest_citizen_report(
    payload: CitizenReportPayload,
    session: AsyncSession = Depends(get_db_session),
) -> CitizenReportResponse:
    """Public citizen reporting gateway enforcing public safety boundary invariants."""
    from sqlalchemy import select
    from app.db.models import EvidenceModel

    incident_service = IncidentService(session)
    evidence_service = EvidenceService(session)

    incident = None
    if payload.incident_id:
        incident = await incident_service.get_by_id(payload.incident_id)
    else:
        active_incidents, _ = await incident_service.list_incidents(page=1, page_size=20)
        best_incident = None
        min_dist = float("inf")
        for inc in active_incidents:
            dist = haversine_distance_meters(inc.latitude, inc.longitude, payload.latitude, payload.longitude)
            if dist < min_dist:
                min_dist = dist
                best_incident = inc

        if best_incident and min_dist <= 15000.0:
            incident = best_incident
        elif active_incidents:
            incident = active_incidents[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active operational incident twins available to receive citizen report.",
            )

    # Deduplication check: If client_submission_id matches an existing submission, return it
    if payload.client_submission_id:
        stmt = (
            select(EvidenceModel)
            .where(
                EvidenceModel.incident_id == incident.id,
                EvidenceModel.original_reference == payload.client_submission_id,
            )
        )
        existing_res = await session.execute(stmt)
        existing_ev = existing_res.scalar_one_or_none()
        if existing_ev:
            return CitizenReportResponse(
                tracking_id=existing_ev.original_reference or f"TG-CIT-{existing_ev.id.hex[:8].upper()}",
                evidence_id=existing_ev.id,
                incident_id=incident.id,
                incident_code=incident.code,
                status="RECEIVED",
                interpretation="UNVERIFIED",
                message="Report previously synchronized. Deduplication enforced.",
                preliminary_guidance="Stay clear of unstable slopes. Your report is on file.",
                timestamp=existing_ev.received_at,
                is_duplicate=True,
            )

    tracking_id = payload.client_submission_id or f"TG-CIT-{uuid.uuid4().hex[:8].upper()}"
    observed_time = payload.captured_at or datetime.utcnow()

    evidence = await evidence_service.add_evidence(
        incident_id=incident.id,
        source=EvidenceSource.CITIZEN,
        source_name="TerraGuardian Safe Citizen Portal",
        evidence_type="CITIZEN_GROUND_REPORT",
        observation=payload.observation,
        metric=f"Hazard: {payload.hazard_type or 'SLOPE_DEBRIS'} | Severity: {payload.severity or 'MEDIUM'}",
        reliability="MEDIUM",
        latitude=payload.latitude,
        longitude=payload.longitude,
        provenance="REAL_CITIZEN_SUBMISSION",
        original_reference=tracking_id,
        is_simulated=False,
        details=payload.reporter_note or "Citizen ground observation submitted via TerraGuardian Safe.",
        raw_data={
            "tracking_id": tracking_id,
            "hazard_type": payload.hazard_type,
            "severity": payload.severity,
            "photo_url": payload.photo_url,
            "reporter_contact": payload.reporter_contact,
            "client_submission_id": payload.client_submission_id,
            "captured_at": observed_time.isoformat(),
        },
    )

    await session.commit()

    return CitizenReportResponse(
        tracking_id=tracking_id,
        evidence_id=evidence.id,
        incident_id=incident.id,
        incident_code=incident.code,
        status="RECEIVED",
        interpretation="UNVERIFIED",
        message="Your report has been received and routed to the district emergency operations centre. It will be reviewed by emergency responders before operational action.",
        preliminary_guidance="Stay clear of unstable slopes, cut faces, and drainage channels. Follow local road signage and advisory instructions.",
        timestamp=evidence.received_at,
        is_duplicate=False,
    )


@router.post(
    "/{adapter_key}",
    response_model=IngestionResult,
    status_code=status.HTTP_200_OK,
    summary="Ingest external observation payload through trusted adapter",
)
async def ingest_external_observation(
    adapter_key: str,
    payload: dict[str, Any],
    incident_id: Optional[uuid.UUID] = Query(None, description="Optional incident ID for spatial corridor association"),
    pipeline: IngestionPipeline = Depends(get_pipeline),
) -> IngestionResult:
    """Ingest, validate, deduplicate, normalize, and associate an external payload."""
    result = await pipeline.ingest_payload(
        adapter_key=adapter_key,
        raw_payload=payload,
        incident_id=incident_id,
    )
    return result


@router.post(
    "/replay/{adapter_key}",
    response_model=list[IngestionResult],
    status_code=status.HTTP_200_OK,
    summary="Replay batch of historical/synthetic observations",
)
async def replay_external_feed(
    adapter_key: str,
    records: list[dict[str, Any]],
    incident_id: Optional[uuid.UUID] = Query(None, description="Optional incident ID for spatial corridor association"),
    pipeline: IngestionPipeline = Depends(get_pipeline),
) -> list[IngestionResult]:
    """Execute deterministic replay of historical records."""
    return await pipeline.replay_feed(
        adapter_key=adapter_key,
        records=records,
        incident_id=incident_id,
    )


@router.get(
    "/quarantine/records",
    status_code=status.HTTP_200_OK,
    summary="List quarantined payloads requiring manual inspection",
)
async def list_quarantine_records(
    pipeline: IngestionPipeline = Depends(get_pipeline),
) -> list[dict[str, Any]]:
    """Return all quarantined records."""
    return pipeline.get_quarantine_records()


@router.get(
    "/telemetry/metrics",
    status_code=status.HTTP_200_OK,
    summary="Get ingestion pipeline throughput and error metrics",
)
async def get_ingestion_metrics(
    pipeline: IngestionPipeline = Depends(get_pipeline),
) -> dict[str, int]:
    """Return pipeline execution counters."""
    return pipeline.metrics
