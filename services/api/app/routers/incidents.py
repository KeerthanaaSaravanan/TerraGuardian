"""Authoritative Incident API endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.domain.enums import (
    ActionState,
    ActorRole,
    ConfidenceLevel,
    HazardState,
    IncidentStatus,
    PriorityLevel,
    RiskLevel,
)
from app.services.action_service import ActionService
from app.services.audit_service import AuditService
from app.services.evidence_service import EvidenceService
from app.services.exceptions import (
    ActionNotFoundError,
    DomainError,
    IncidentNotFoundError,
    InvalidTransitionError,
    PreconditionFailedError,
    UnauthorizedAuthorityError,
)
from app.services.incident_service import IncidentService
from app.services.seed_service import SeedService
from app.services.state_transition_service import StateTransitionService

router = APIRouter(tags=["incidents"])


# ── Schemas ──

class IncidentResponse(BaseModel):
    """Authoritative Incident Twin representation."""
    id: uuid.UUID
    code: str
    title: str
    description: Optional[str] = None
    incident_type: str = "landslide"
    status: IncidentStatus
    hazard_state: HazardState
    risk_level: RiskLevel
    risk_score: float
    confidence_level: ConfidenceLevel
    confidence_score: float
    priority_level: PriorityLevel
    priority_score: float
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    corridor_name: Optional[str] = None
    state: str
    district: str
    detected_at: datetime
    updated_at: datetime
    is_primary_demo: bool = False
    is_simulated: bool = False
    metadata_json: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class PublicIncidentSummaryResponse(BaseModel):
    """Sanitized public summary response for citizen/public consumers.
    
    Explicitly boundaries sensitive operational details (corridor vulnerability scores,
    internal agency rosters, raw telemetry confidence weights) away from public tier.
    """
    id: uuid.UUID
    code: str
    title: str
    general_location: Optional[str] = None
    district: str
    state: str
    status: IncidentStatus
    advisory_summary: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class IncidentStateResponse(BaseModel):
    """Condensed multi-dimensional state response."""
    id: uuid.UUID
    code: str
    status: IncidentStatus
    hazard_state: HazardState
    risk_level: RiskLevel
    risk_score: float
    confidence_level: ConfidenceLevel
    confidence_score: float
    priority_level: PriorityLevel
    priority_score: float

    model_config = {"from_attributes": True}


class IncidentListResponse(BaseModel):
    """Paginated incident list."""
    items: list[IncidentResponse]
    total: int
    page: int
    page_size: int


class TimelineEventResponse(BaseModel):
    """Chronological audit event in incident timeline."""
    id: uuid.UUID
    incident_id: uuid.UUID
    event_type: str
    actor_role: str
    actor_name: str
    actor_id: Optional[str] = None
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    reason: Optional[str] = None
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}


class EvidenceItemResponse(BaseModel):
    """Reconciled multi-source evidence item."""
    id: uuid.UUID
    incident_id: uuid.UUID
    source: str
    source_name: str
    evidence_type: str
    observation: str
    metric: str
    reliability: str
    observed_at: datetime
    received_at: datetime
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    provenance: Optional[str] = None
    original_reference: Optional[str] = None
    is_simulated: bool = False
    freshness_seconds: Optional[int] = None
    confidence_contribution: Optional[float] = None
    processing_status: str
    interpretation: str
    details: Optional[str] = None
    raw_data: Optional[dict[str, Any]] = None

    model_config = {"from_attributes": True}


class TransitionRequest(BaseModel):
    """Payload for requesting an authoritative lifecycle transition."""
    target_status: IncidentStatus
    actor_role: ActorRole
    actor_name: str
    reason: Optional[str] = None
    authority_order_code: Optional[str] = None
    context_payload: Optional[dict[str, Any]] = None


class ActionResponse(BaseModel):
    """Operational task assigned to field agencies."""
    id: uuid.UUID
    incident_id: uuid.UUID
    task_code: str
    agency: str
    title: str
    description: str
    state: ActionState
    assigned_to: str
    is_action_gap_trigger: bool = False
    dispatched_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ActionTransitionRequest(BaseModel):
    """Payload to transition an action state."""
    target_state: ActionState
    actor_role: ActorRole
    actor_name: str
    reason: Optional[str] = None


class ActionConfirmationRequest(BaseModel):
    """Payload to submit accepted ground confirmation evidence."""
    confirming_officer: str
    confirming_agency: str
    location_confirmed: str
    confirmation_notes: str
    communication_channel: str = "TETRA_RADIO"
    evidence_photo_url: Optional[str] = None
    is_simulated: bool = False


class ActionConfirmationResponse(BaseModel):
    """Record of accepted confirmation evidence."""
    id: uuid.UUID
    action_id: uuid.UUID
    incident_id: uuid.UUID
    confirming_officer: str
    confirming_agency: str
    communication_channel: str
    location_confirmed: str
    confirmed_at: datetime
    confirmation_notes: str
    evidence_photo_url: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Endpoints ──

@router.get("/incidents", response_model=IncidentListResponse)
async def list_incidents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[IncidentStatus] = Query(None, alias="status"),
    session: AsyncSession = Depends(get_db_session),
) -> IncidentListResponse:
    """List incidents with optional status filter."""
    service = IncidentService(session)
    items, total = await service.list_incidents(page=page, page_size=page_size, status=status_filter)
    return IncidentListResponse(
        items=[IncidentResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/incidents/code/{code}", response_model=IncidentResponse)
async def get_incident_by_code(
    code: str,
    session: AsyncSession = Depends(get_db_session),
) -> IncidentResponse:
    """Get a single Incident Twin by operational incident code (e.g. TG-2048)."""
    service = IncidentService(session)
    incident = await service.get_by_code(code)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with code '{code}' not found.",
        )
    return IncidentResponse.model_validate(incident)


@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> IncidentResponse:
    """Get a single Incident Twin by UUID."""
    service = IncidentService(session)
    try:
        incident = await service.get_by_id(incident_id)
        return IncidentResponse.model_validate(incident)
    except IncidentNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)


@router.get("/incidents/{incident_id}/public-summary", response_model=PublicIncidentSummaryResponse)
async def get_public_incident_summary(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> PublicIncidentSummaryResponse:
    """Get sanitized public advisory summary for an incident by UUID."""
    service = IncidentService(session)
    try:
        incident = await service.get_by_id(incident_id)
        return PublicIncidentSummaryResponse(
            id=incident.id,
            code=incident.code,
            title=incident.title,
            general_location=incident.location_name,
            district=incident.district,
            state=incident.state,
            status=IncidentStatus(incident.status),
            advisory_summary=f"Landslide alert for {incident.location_name or incident.corridor_name}. Current status: {incident.status}.",
            updated_at=incident.updated_at,
        )
    except IncidentNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)


@router.get("/incidents/code/{code}/public-summary", response_model=PublicIncidentSummaryResponse)
async def get_public_incident_summary_by_code(
    code: str,
    session: AsyncSession = Depends(get_db_session),
) -> PublicIncidentSummaryResponse:
    """Get sanitized public advisory summary for an incident by code (e.g. TG-2048)."""
    service = IncidentService(session)
    incident = await service.get_by_code(code)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with code '{code}' not found.",
        )
    return PublicIncidentSummaryResponse(
        id=incident.id,
        code=incident.code,
        title=incident.title,
        general_location=incident.location_name,
        district=incident.district,
        state=incident.state,
        status=IncidentStatus(incident.status),
        advisory_summary=f"Landslide alert for {incident.location_name or incident.corridor_name}. Current status: {incident.status}.",
        updated_at=incident.updated_at,
    )


@router.get("/incidents/{incident_id}/state", response_model=IncidentStateResponse)
async def get_incident_state(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> IncidentStateResponse:
    """Get current multi-dimensional operational state for an incident."""
    service = IncidentService(session)
    try:
        incident = await service.get_by_id(incident_id)
        return IncidentStateResponse.model_validate(incident)
    except IncidentNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)


@router.get("/incidents/{incident_id}/timeline", response_model=list[TimelineEventResponse])
async def get_incident_timeline(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> list[TimelineEventResponse]:
    """Get chronological audit timeline for an incident."""
    incident_service = IncidentService(session)
    audit_service = AuditService(session)
    try:
        await incident_service.get_by_id(incident_id)
        events = await audit_service.get_incident_timeline(incident_id)
        return [TimelineEventResponse.model_validate(e) for e in events]
    except IncidentNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)


@router.get("/incidents/{incident_id}/evidence", response_model=list[EvidenceItemResponse])
async def get_incident_evidence(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> list[EvidenceItemResponse]:
    """Get all reconciled multi-source evidence items for an incident."""
    evidence_service = EvidenceService(session)
    try:
        items = await evidence_service.get_evidence_for_incident(incident_id)
        return [EvidenceItemResponse.model_validate(e) for e in items]
    except IncidentNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)


@router.get("/incidents/{incident_id}/actions", response_model=list[ActionResponse])
async def get_incident_actions(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> list[ActionResponse]:
    """Get all operational tasks for an incident."""
    action_service = ActionService(session)
    try:
        actions = await action_service.list_actions_for_incident(incident_id)
        return [ActionResponse.model_validate(a) for a in actions]
    except IncidentNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)


@router.post("/incidents/{incident_id}/transitions", response_model=IncidentResponse)
async def transition_incident_state(
    incident_id: uuid.UUID,
    body: TransitionRequest,
    session: AsyncSession = Depends(get_db_session),
) -> IncidentResponse:
    """Execute and audit a validated lifecycle state transition."""
    transition_service = StateTransitionService(session)
    try:
        updated = await transition_service.transition(
            incident_id=incident_id,
            target_status=body.target_status,
            actor_role=body.actor_role,
            actor_name=body.actor_name,
            reason=body.reason,
            authority_order_code=body.authority_order_code,
            context_payload=body.context_payload,
        )
        return IncidentResponse.model_validate(updated)
    except IncidentNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)
    except InvalidTransitionError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err.message)
    except UnauthorizedAuthorityError as err:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=err.message)
    except PreconditionFailedError as err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=err.message)


@router.post("/actions/{action_id}/transitions", response_model=ActionResponse)
async def transition_action_state(
    action_id: uuid.UUID,
    body: ActionTransitionRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ActionResponse:
    """Execute and audit a validated action task state transition."""
    action_service = ActionService(session)
    try:
        action = await action_service.update_action_state(
            action_id=action_id,
            target_state=body.target_state,
            actor_role=body.actor_role,
            actor_name=body.actor_name,
            reason=body.reason,
        )
        return ActionResponse.model_validate(action)
    except ActionNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)
    except InvalidTransitionError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err.message)
    except DomainError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err.message)


@router.post("/actions/{action_id}/confirmations", response_model=ActionConfirmationResponse, status_code=status.HTTP_201_CREATED)
async def confirm_action_evidence(
    action_id: uuid.UUID,
    body: ActionConfirmationRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ActionConfirmationResponse:
    """Record accepted confirmation evidence and advance task state to PHYSICALLY_CONFIRMED."""
    action_service = ActionService(session)
    try:
        confirmation = await action_service.confirm_action(
            action_id=action_id,
            confirming_officer=body.confirming_officer,
            confirming_agency=body.confirming_agency,
            location_confirmed=body.location_confirmed,
            confirmation_notes=body.confirmation_notes,
            communication_channel=body.communication_channel,
            evidence_photo_url=body.evidence_photo_url,
            is_simulated=body.is_simulated,
        )
        return ActionConfirmationResponse.model_validate(confirmation)
    except ActionNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)
    except InvalidTransitionError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err.message)
    except DomainError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err.message)


@router.post("/incidents/seed/tg-2048", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def seed_tg2048_endpoint(
    force_reset: bool = Query(False),
    session: AsyncSession = Depends(get_db_session),
) -> IncidentResponse:
    """Deterministic seeder endpoint for incident TG-2048."""
    seed_service = SeedService(session)
    incident = await seed_service.seed_tg_2048(force_reset=force_reset)
    return IncidentResponse.model_validate(incident)

