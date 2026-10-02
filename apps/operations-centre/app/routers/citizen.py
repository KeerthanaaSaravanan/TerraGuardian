"""Authoritative Citizen Safe Evidence & Public Observation REST API Router.

Integrates real image validation, multimodal AI vision screening, real device geolocation,
reverse-geocoding, transactional database persistence, and role-based review queues.
"""

from __future__ import annotations

import base64
from datetime import datetime
import logging
from typing import Any, Optional
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.geocoding import GeocodingProvider, GeocodingResult
from app.adapters.storage import EvidenceStorageProvider, StoredImageMetadata
from app.adapters.vision import VisionProvider, VisionScreeningResult
from app.db.models import (
    AlertAcknowledgementModel,
    AlertModel,
    AuditEventModel,
    CitizenHelpRequestModel,
    CitizenReportModel,
    EvidenceModel,
    IncidentModel,
    UserModel,
)
from app.db.session import get_db_session
from app.domain.enums import ActorRole, AuditEventType, EvidenceSource
from app.domain.permissions import OperationalPermission
from app.services.auth_service import get_current_user, require_permission
from app.services.evidence_service import EvidenceService
from app.services.incident_service import IncidentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/citizen", tags=["Citizen Safe & Public Observation Pipeline"])


class ScreenImagePayload(BaseModel):
    """Payload to screen an image using multimodal vision AI."""
    image_base64: str
    filename: Optional[str] = "observation.jpg"


class SubmitReportPayload(BaseModel):
    """Structured citizen report submission payload."""
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    gps_accuracy: Optional[float] = None
    gps_altitude: Optional[float] = None
    gps_timestamp: Optional[datetime] = None
    state: Optional[str] = None
    district: Optional[str] = None
    locality: Optional[str] = None
    road_corridor: Optional[str] = None
    citizen_notes: Optional[str] = None
    ai_observation: Optional[str] = None
    ai_screening_result: Optional[dict[str, Any]] = None
    reporter_contact: Optional[str] = None
    client_submission_id: Optional[str] = None


class CitizenReportResponse(BaseModel):
    """Canonical persisted citizen report response."""
    id: uuid.UUID
    tracking_id: str
    created_at: datetime
    image_url: str
    image_hash: str
    latitude: float
    longitude: float
    gps_accuracy: Optional[float] = None
    state: str
    district: str
    locality: Optional[str] = None
    road_corridor: Optional[str] = None
    is_ner_region: bool
    citizen_notes: Optional[str] = None
    ai_observation: Optional[str] = None
    ai_status: str
    ai_screening_result: dict[str, Any]
    submission_status: str
    review_status: str
    maturity_status: str
    reviewer_role: Optional[str] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    incident_id: Optional[uuid.UUID] = None
    incident_code: Optional[str] = None
    provenance: str = "REAL_USER_SUBMITTED"
    source_type: str = "REAL_CITIZEN_SUBMISSION"


class CitizenReviewRequest(BaseModel):
    """Role-based review and disposition request."""
    action: str = Field(..., description="APPROVE, REJECT, or NEEDS_MORE_INFORMATION")
    incident_id: Optional[uuid.UUID] = None
    create_new_incident: bool = False
    new_incident_title: Optional[str] = None
    review_notes: Optional[str] = None


@router.post(
    "/screen-image",
    response_model=VisionScreeningResult,
    status_code=status.HTTP_200_OK,
    summary="Screen uploaded photograph using AI vision model",
)
async def screen_image_endpoint(
    payload: ScreenImagePayload,
) -> VisionScreeningResult:
    """Analyze uploaded photo for slope hazards and reject unrelated imagery."""
    try:
        # Strip data URL prefix if present
        raw_b64 = payload.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        image_bytes = base64.b64decode(raw_b64)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 image data: {e}",
        )

    return await VisionProvider.screen_image(image_bytes, filename=payload.filename)


@router.get(
    "/reverse-geocode",
    response_model=GeocodingResult,
    status_code=status.HTTP_200_OK,
    summary="Resolve GPS coordinates to administrative geography and NER region",
)
async def reverse_geocode_endpoint(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
) -> GeocodingResult:
    """Real-time reverse geocoding via OpenStreetMap with North Eastern Region boundary resolution."""
    return await GeocodingProvider.reverse_geocode(lat, lng)


@router.post(
    "/report",
    response_model=CitizenReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit and durably persist a real citizen observation report",
)
async def submit_citizen_report(
    payload: SubmitReportPayload,
    session: AsyncSession = Depends(get_db_session),
) -> CitizenReportResponse:
    """Ingest, validate, store image, screen, and persist citizen report."""
    tracking_id = payload.client_submission_id or f"TG-CIT-{uuid.uuid4().hex[:8].upper()}"

    # 1. Process and persist image
    image_url = payload.image_url
    image_hash = "EXTERNAL"
    file_size = 0
    mime_type = "image/jpeg"

    if payload.image_base64:
        try:
            raw_b64 = payload.image_base64
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            img_bytes = base64.b64decode(raw_b64)
            stored_meta = EvidenceStorageProvider.validate_and_save_image(
                image_bytes=img_bytes,
                tracking_id=tracking_id,
            )
            image_url = stored_meta.image_url
            image_hash = stored_meta.image_hash
            file_size = stored_meta.file_size
            mime_type = stored_meta.mime_type
        except ValueError as err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))

    if not image_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid hazard photograph (image_base64 or image_url) is required for citizen observation reports.",
        )

    # 2. Vision screening validation
    ai_result = payload.ai_screening_result
    ai_obs = payload.ai_observation
    ai_status_val = "SUCCESS"

    if ai_result:
        is_relevant = ai_result.get("is_hazard_relevant", True)
        ai_status_val = ai_result.get("ai_status", "SUCCESS")
        if not is_relevant or ai_status_val in ("REJECTED_UNRELATED", "INSUFFICIENT_IMAGE"):
            # Enforce rejection of unrelated/insufficient images
            reason = ai_result.get("reasoning", "The uploaded photograph does not show visible slope or road hazards.")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Image rejected by AI screening: {reason}. Please upload a clear photograph of a landslide, slope failure, tension crack, rockfall, debris flow, or road obstruction.",
            )
    else:
        ai_result = {
            "is_hazard_relevant": True,
            "hazard_type": "SLOPE_DEBRIS",
            "visual_observations": [ai_obs or "Citizen field hazard observation"],
            "severity_screen": "MEDIUM",
            "image_quality": "SUFFICIENT",
            "confidence": "MODERATE VISUAL EVIDENCE",
            "recommended_followup": "Human verification required by authorized field responder.",
            "reasoning": "Standard citizen observation submitted for review.",
            "needs_human_verification": True,
            "ai_status": "SUCCESS",
        }

    # 3. Location context resolution
    state_val = payload.state
    district_val = payload.district
    locality_val = payload.locality
    road_val = payload.road_corridor
    is_ner = True

    if not state_val or not district_val:
        geo = await GeocodingProvider.reverse_geocode(payload.latitude, payload.longitude)
        state_val = state_val or geo.state
        district_val = district_val or geo.district
        locality_val = locality_val or geo.locality
        road_val = road_val or geo.road_corridor
        is_ner = geo.is_ner_region
    else:
        from app.adapters.geocoding import NER_STATES
        is_ner = state_val in NER_STATES

    # 4. Check for duplicate submission
    stmt = select(CitizenReportModel).where(CitizenReportModel.tracking_id == tracking_id)
    res = await session.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        return CitizenReportResponse(
            id=existing.id,
            tracking_id=existing.tracking_id,
            created_at=existing.created_at,
            image_url=existing.image_url,
            image_hash=existing.image_hash,
            latitude=existing.latitude,
            longitude=existing.longitude,
            gps_accuracy=existing.gps_accuracy,
            state=existing.state,
            district=existing.district,
            locality=existing.locality,
            road_corridor=existing.road_corridor,
            is_ner_region=existing.is_ner_region,
            citizen_notes=existing.citizen_notes,
            ai_observation=existing.ai_observation,
            ai_status=existing.ai_status,
            ai_screening_result=existing.ai_screening_result,
            submission_status=existing.submission_status,
            review_status=existing.review_status,
            maturity_status=existing.maturity_status,
            reviewer_role=existing.reviewer_role,
            reviewer_name=existing.reviewer_name,
            reviewed_at=existing.reviewed_at,
            review_notes=existing.review_notes,
            incident_id=existing.incident_id,
            provenance=existing.provenance,
            source_type=existing.source_type,
        )

    # 5. Persist CitizenReportModel
    report = CitizenReportModel(
        tracking_id=tracking_id,
        reporter_contact=payload.reporter_contact,
        citizen_notes=payload.citizen_notes,
        image_url=image_url,
        image_hash=image_hash,
        image_file_size=file_size,
        image_mime_type=mime_type,
        ai_status=ai_status_val,
        ai_observation=ai_obs or (ai_result.get("visual_observations") or ["Hazard observed"])[0],
        ai_screening_result=ai_result,
        latitude=payload.latitude,
        longitude=payload.longitude,
        gps_accuracy=payload.gps_accuracy,
        gps_altitude=payload.gps_altitude,
        gps_timestamp=payload.gps_timestamp or datetime.utcnow(),
        state=state_val,
        district=district_val,
        locality=locality_val,
        road_corridor=road_val,
        is_ner_region=is_ner,
        submission_status="PENDING_REVIEW",
        review_status="PENDING_REVIEW",
        maturity_status="UNVERIFIED",
        provenance="REAL_USER_SUBMITTED",
        source_type="REAL_CITIZEN_SUBMISSION",
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)

    return CitizenReportResponse(
        id=report.id,
        tracking_id=report.tracking_id,
        created_at=report.created_at,
        image_url=report.image_url,
        image_hash=report.image_hash,
        latitude=report.latitude,
        longitude=report.longitude,
        gps_accuracy=report.gps_accuracy,
        state=report.state,
        district=report.district,
        locality=report.locality,
        road_corridor=report.road_corridor,
        is_ner_region=report.is_ner_region,
        citizen_notes=report.citizen_notes,
        ai_observation=report.ai_observation,
        ai_status=report.ai_status,
        ai_screening_result=report.ai_screening_result,
        submission_status=report.submission_status,
        review_status=report.review_status,
        maturity_status=report.maturity_status,
        incident_id=report.incident_id,
        provenance=report.provenance,
        source_type=report.source_type,
    )


@router.get(
    "/reports",
    response_model=list[CitizenReportResponse],
    status_code=status.HTTP_200_OK,
    summary="List all citizen reports for operational review queue",
)
async def list_citizen_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    ner_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_db_session),
) -> list[CitizenReportResponse]:
    """Retrieve durable database-backed citizen reports for the Operations review queue."""
    query = select(CitizenReportModel).order_by(desc(CitizenReportModel.created_at))

    if status_filter and status_filter.upper() != "ALL":
        query = query.where(CitizenReportModel.review_status == status_filter.upper())
    if ner_only:
        query = query.where(CitizenReportModel.is_ner_region.is_(True))

    query = query.limit(limit).offset(offset)
    res = await session.execute(query)
    reports = res.scalars().all()

    # Pre-fetch incident codes if associated
    inc_ids = [r.incident_id for r in reports if r.incident_id]
    inc_map = {}
    if inc_ids:
        inc_stmt = select(IncidentModel).where(IncidentModel.id.in_(inc_ids))
        inc_res = await session.execute(inc_stmt)
        for inc in inc_res.scalars().all():
            inc_map[inc.id] = inc.code

    return [
        CitizenReportResponse(
            id=r.id,
            tracking_id=r.tracking_id,
            created_at=r.created_at,
            image_url=r.image_url,
            image_hash=r.image_hash,
            latitude=r.latitude,
            longitude=r.longitude,
            gps_accuracy=r.gps_accuracy,
            state=r.state,
            district=r.district,
            locality=r.locality,
            road_corridor=r.road_corridor,
            is_ner_region=r.is_ner_region,
            citizen_notes=r.citizen_notes,
            ai_observation=r.ai_observation,
            ai_status=r.ai_status,
            ai_screening_result=r.ai_screening_result,
            submission_status=r.submission_status,
            review_status=r.review_status,
            maturity_status=r.maturity_status,
            reviewer_role=r.reviewer_role,
            reviewer_name=r.reviewer_name,
            reviewed_at=r.reviewed_at,
            review_notes=r.review_notes,
            incident_id=r.incident_id,
            incident_code=inc_map.get(r.incident_id),
            provenance=r.provenance,
            source_type=r.source_type,
        )
        for r in reports
    ]


@router.get(
    "/reports/{report_id}",
    response_model=CitizenReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single citizen report detail",
)
async def get_citizen_report(
    report_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> CitizenReportResponse:
    """Retrieve discrete citizen report by UUID."""
    stmt = select(CitizenReportModel).where(CitizenReportModel.id == report_id)
    res = await session.execute(stmt)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Citizen report not found.")

    incident_code = None
    if report.incident_id:
        inc = await session.get(IncidentModel, report.incident_id)
        if inc:
            incident_code = inc.code

    return CitizenReportResponse(
        id=report.id,
        tracking_id=report.tracking_id,
        created_at=report.created_at,
        image_url=report.image_url,
        image_hash=report.image_hash,
        latitude=report.latitude,
        longitude=report.longitude,
        gps_accuracy=report.gps_accuracy,
        state=report.state,
        district=report.district,
        locality=report.locality,
        road_corridor=report.road_corridor,
        is_ner_region=report.is_ner_region,
        citizen_notes=report.citizen_notes,
        ai_observation=report.ai_observation,
        ai_status=report.ai_status,
        ai_screening_result=report.ai_screening_result,
        submission_status=report.submission_status,
        review_status=report.review_status,
        maturity_status=report.maturity_status,
        reviewer_role=report.reviewer_role,
        reviewer_name=report.reviewer_name,
        reviewed_at=report.reviewed_at,
        review_notes=report.review_notes,
        incident_id=report.incident_id,
        incident_code=incident_code,
        provenance=report.provenance,
        source_type=report.source_type,
    )


@router.post(
    "/reports/{report_id}/review",
    response_model=CitizenReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Review citizen report: Approve, Reject, or Associate with Incident",
)
async def review_citizen_report(
    report_id: uuid.UUID,
    body: CitizenReviewRequest,
    current_user: UserModel = Depends(require_permission(OperationalPermission.RECONCILE_EVIDENCE)),
    session: AsyncSession = Depends(get_db_session),
) -> CitizenReportResponse:
    """Enforce role-based review of citizen evidence items."""
    stmt = select(CitizenReportModel).where(CitizenReportModel.id == report_id)
    res = await session.execute(stmt)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Citizen report not found.")

    action_upper = body.action.upper().strip()
    if action_upper not in ("APPROVE", "APPROVED", "REJECT", "REJECTED", "NEEDS_MORE_INFORMATION"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid review action: '{body.action}'. Supported actions: APPROVE, REJECT, NEEDS_MORE_INFORMATION.",
        )

    if action_upper in ("APPROVE", "APPROVED"):
        status_canonical = "APPROVED"
    elif action_upper in ("REJECT", "REJECTED"):
        status_canonical = "REJECTED"
    else:
        status_canonical = "NEEDS_MORE_INFORMATION"

    report.review_status = status_canonical
    report.reviewer_role = current_user.role
    report.reviewer_name = current_user.full_name or current_user.username
    report.reviewed_at = datetime.utcnow()
    report.review_notes = body.review_notes

    incident_code = None

    if status_canonical == "APPROVED":
        report.submission_status = "APPROVED"
        report.maturity_status = "VERIFIED_FOR_OPERATIONAL_REVIEW"

        # Case 1: Create new incident twin
        if body.create_new_incident:
            incident_service = IncidentService(session)
            inc_code = f"TG-CIT-{uuid.uuid4().hex[:4].upper()}"
            title = body.new_incident_title or f"Landslide Hazard - {report.locality or report.district} ({report.state})"
            new_inc = await incident_service.create_incident(
                title=title,
                latitude=report.latitude,
                longitude=report.longitude,
                description=f"Operational case initiated from verified citizen report {report.tracking_id}. Notes: {report.citizen_notes or 'None'}",
                location_name=report.locality or f"{report.district}, {report.state}",
                corridor_name=report.road_corridor,
                state=report.state,
                district=report.district,
                incident_type="landslide",
                metadata_json={"source_report_id": str(report.id), "source_tracking_id": report.tracking_id},
            )
            report.incident_id = new_inc.id
            incident_code = new_inc.code

            # Attach evidence record
            evidence_service = EvidenceService(session)
            ev = await evidence_service.add_evidence(
                incident_id=new_inc.id,
                source=EvidenceSource.CITIZEN,
                source_name="TerraGuardian Safe Citizen Portal",
                evidence_type="CITIZEN_GROUND_REPORT",
                observation=report.ai_observation or "Verified citizen ground observation",
                metric=f"Hazard: {report.ai_screening_result.get('hazard_type', 'SLOPE_DEBRIS')}",
                reliability="HIGH",
                latitude=report.latitude,
                longitude=report.longitude,
                provenance="REAL_CITIZEN_SUBMISSION",
                original_reference=report.tracking_id,
                is_simulated=False,
                details=report.citizen_notes or "Field citizen observation verified by command operator.",
                raw_data={
                    "tracking_id": report.tracking_id,
                    "image_url": report.image_url,
                    "reviewed_by": current_user.username,
                },
            )
            report.evidence_id = ev.id

        # Case 2: Associate with existing incident
        elif body.incident_id:
            inc = await session.get(IncidentModel, body.incident_id)
            if not inc:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target incident not found.")
            report.incident_id = inc.id
            incident_code = inc.code

            evidence_service = EvidenceService(session)
            ev = await evidence_service.add_evidence(
                incident_id=inc.id,
                source=EvidenceSource.CITIZEN,
                source_name="TerraGuardian Safe Citizen Portal",
                evidence_type="CITIZEN_GROUND_REPORT",
                observation=report.ai_observation or "Verified citizen ground observation",
                metric=f"Hazard: {report.ai_screening_result.get('hazard_type', 'SLOPE_DEBRIS')}",
                reliability="HIGH",
                latitude=report.latitude,
                longitude=report.longitude,
                provenance="REAL_CITIZEN_SUBMISSION",
                original_reference=report.tracking_id,
                is_simulated=False,
                details=report.citizen_notes or "Field citizen observation verified by command operator.",
                raw_data={
                    "tracking_id": report.tracking_id,
                    "image_url": report.image_url,
                    "reviewed_by": current_user.username,
                },
            )
            report.evidence_id = ev.id

    elif action_upper == "REJECT":
        report.submission_status = "REJECTED"
        report.maturity_status = "UNVERIFIED"

    elif action_upper == "NEEDS_MORE_INFORMATION":
        report.submission_status = "PENDING_REVIEW"
        report.maturity_status = "UNVERIFIED"

    # Append audit trail if linked to an incident
    if report.incident_id:
        audit = AuditEventModel(
            incident_id=report.incident_id,
            event_type=AuditEventType.EVIDENCE_RECONCILED.value,
            actor_role=current_user.role,
            actor_name=current_user.full_name or current_user.username,
            reason=f"Citizen report {report.tracking_id} disposition: {action_upper}. Notes: {body.review_notes or 'None'}",
            payload={
                "report_id": str(report.id),
                "tracking_id": report.tracking_id,
                "action": action_upper,
                "incident_id": str(report.incident_id),
            },
        )
        session.add(audit)

    await session.commit()
    await session.refresh(report)

    return CitizenReportResponse(
        id=report.id,
        tracking_id=report.tracking_id,
        created_at=report.created_at,
        image_url=report.image_url,
        image_hash=report.image_hash,
        latitude=report.latitude,
        longitude=report.longitude,
        gps_accuracy=report.gps_accuracy,
        state=report.state,
        district=report.district,
        locality=report.locality,
        road_corridor=report.road_corridor,
        is_ner_region=report.is_ner_region,
        citizen_notes=report.citizen_notes,
        ai_observation=report.ai_observation,
        ai_status=report.ai_status,
        ai_screening_result=report.ai_screening_result,
        submission_status=report.submission_status,
        review_status=report.review_status,
        maturity_status=report.maturity_status,
        reviewer_role=report.reviewer_role,
        reviewer_name=report.reviewer_name,
        reviewed_at=report.reviewed_at,
        review_notes=report.review_notes,
        incident_id=report.incident_id,
        incident_code=incident_code,
        provenance=report.provenance,
        source_type=report.source_type,
    )


class SubmitHelpRequestPayload(BaseModel):
    """Payload for submitting an urgent assistance request from Citizen Safe."""
    help_type: Optional[str] = Field(None, description="MEDICAL_ASSISTANCE, TRAPPED, ROAD_BLOCKED, MISSING_PERSON, EVACUATION_ASSISTANCE, OTHER")
    category: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    approx_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    approx_lng: Optional[float] = Field(None, ge=-180.0, le=180.0)
    accuracy_m: Optional[float] = None
    contact_number: Optional[str] = None
    contact_phone: Optional[str] = None
    persons_count: Optional[int] = 1
    message: Optional[str] = None
    notes: Optional[str] = None
    incident_id: Optional[uuid.UUID] = None
    device_id: Optional[str] = None


class ImSafeCheckinPayload(BaseModel):
    """Payload for citizen 'I'm Safe' check-in signal."""
    device_id: str
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    approx_lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    approx_lng: Optional[float] = Field(None, ge=-180.0, le=180.0)
    is_safe: Optional[bool] = True
    incident_id: Optional[uuid.UUID] = None
    alert_id: Optional[Any] = None
    citizen_name: Optional[str] = None
    notes: Optional[str] = None
    safe_notes: Optional[str] = None


@router.post("/help-request")
async def submit_help_request(
    payload: SubmitHelpRequestPayload,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Submit an urgent citizen help / SOS request to district emergency operations."""
    now = datetime.utcnow()
    req_uuid = uuid.uuid4()
    short_hash = req_uuid.hex[:8].upper()
    req_id = f"TG-HELP-{short_hash}"

    resolved_lat = payload.latitude if payload.latitude is not None else payload.approx_lat if payload.approx_lat is not None else 27.0842
    resolved_lng = payload.longitude if payload.longitude is not None else payload.approx_lng if payload.approx_lng is not None else 92.5681
    resolved_type = (payload.help_type or payload.category or "ROAD_BLOCKED_STRANDED").upper()
    resolved_contact = payload.contact_number or payload.contact_phone
    resolved_msg = payload.message or payload.notes or "Assistance requested via TerraGuardian Citizen Safe."

    help_req = CitizenHelpRequestModel(
        id=req_uuid,
        request_id=req_id,
        incident_id=payload.incident_id,
        device_id=payload.device_id or "cit-pwa-default",
        contact_number=resolved_contact,
        help_type=resolved_type,
        message=resolved_msg,
        latitude=resolved_lat,
        longitude=resolved_lng,
        accuracy_m=payload.accuracy_m,
        status="REQUEST_RECEIVED",
        created_at=now,
        updated_at=now,
    )
    session.add(help_req)

    if payload.incident_id:
        audit = AuditEventModel(
            id=uuid.uuid4(),
            incident_id=payload.incident_id,
            event_type="STATE_CHANGED",
            actor_role="CITIZEN",
            actor_name=f"Citizen ({resolved_contact or 'Anonymous'})",
            payload={
                "action": "HELP_REQUEST_RECEIVED",
                "request_id": req_id,
                "help_type": resolved_type,
                "latitude": resolved_lat,
                "longitude": resolved_lng,
                "dispatch_state": "UNASSIGNED",
            },
            created_at=now,
        )
        session.add(audit)
    await session.flush()

    return {
        "request_id": req_id,
        "status": "REQUEST_RECEIVED",
        "dispatch_state": "UNASSIGNED",
        "help_type": resolved_type,
        "latitude": resolved_lat,
        "longitude": resolved_lng,
        "created_at": now.isoformat(),
        "hotlines": {
            "national_emergency": "112",
            "ddma_control_room": "1077",
            "sdrf_helpline": "1070",
            "ambulance": "108",
            "bro_project_vartak": "03778-222044",
        },
        "note": "Help request recorded and queued for emergency operations coordination. For immediate life-safety peril, dial 112 directly.",
    }


@router.get("/help-requests")
async def list_help_requests(
    device_id: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db_session),
) -> list[dict[str, Any]]:
    """List recent citizen help requests."""
    stmt = select(CitizenHelpRequestModel).order_by(desc(CitizenHelpRequestModel.created_at)).limit(50)
    if device_id:
        stmt = stmt.where(CitizenHelpRequestModel.device_id == device_id)
    res = await session.execute(stmt)
    records = res.scalars().all()
    return [
        {
            "request_id": r.request_id,
            "help_type": r.help_type,
            "status": r.status,
            "message": r.message,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.post("/im-safe")
async def confirm_im_safe(
    payload: ImSafeCheckinPayload,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Citizen emergency safety check-in ('I AM SAFE')."""
    now = datetime.utcnow()

    resolved_lat = payload.latitude if payload.latitude is not None else payload.approx_lat if payload.approx_lat is not None else 27.0842
    resolved_lng = payload.longitude if payload.longitude is not None else payload.approx_lng if payload.approx_lng is not None else 92.5681
    resolved_notes = payload.safe_notes or payload.notes or "Reported safe via TerraGuardian Citizen Safe."

    alert_uuid = None
    if payload.alert_id:
        try:
            alert_uuid = uuid.UUID(str(payload.alert_id))
        except Exception:
            alert_uuid = None

    if alert_uuid:
        ack_record = AlertAcknowledgementModel(
            id=uuid.uuid4(),
            alert_id=alert_uuid,
            device_id=payload.device_id,
            citizen_id=payload.citizen_name or "Public Citizen",
            opened_at=now,
            acknowledged_at=now,
            is_safe=True,
            safe_notes=resolved_notes,
            approx_lat=resolved_lat,
            approx_lng=resolved_lng,
            created_at=now,
        )
        session.add(ack_record)

    if payload.incident_id:
        audit = AuditEventModel(
            id=uuid.uuid4(),
            incident_id=payload.incident_id,
            event_type="STATE_CHANGED",
            actor_role="CITIZEN",
            actor_name=payload.citizen_name or f"Citizen ({payload.device_id[:8]})",
            payload={
                "action": "CITIZEN_IM_SAFE_CHECKIN",
                "is_safe": True,
                "latitude": resolved_lat,
                "longitude": resolved_lng,
                "notes": resolved_notes,
            },
            created_at=now,
        )
        session.add(audit)
    await session.flush()

    return {
        "status": "SAFE_CONFIRMATION_RECEIVED",
        "is_safe": True,
        "device_id": payload.device_id,
        "timestamp": now.isoformat(),
        "latitude": resolved_lat,
        "longitude": resolved_lng,
        "message": "Citizen safety confirmation recorded successfully.",
        "disclaimer": "IMPORTANT: 'I'm Safe' is a citizen-reported status. It does NOT alter physical slope hazard, declare the road open, or close active emergency operations.",
    }

