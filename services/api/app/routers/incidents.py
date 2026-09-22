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
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceProcessingStatus,
    EvidenceSource,
    HazardState,
    IncidentStatus,
    PriorityLevel,
    RiskLevel,
)
from app.domain.hazard import (
    BoundedReassessmentRequest,
    BoundedReassessmentResult,
    DivergenceRecord,
    HazardHypothesis,
    HazardLineageSummary,
    HazardStateTransitionRequest,
)
from app.domain.impact import (
    ComparativePriorityResult,
    ImpactAssessment,
    PriorityAssessment,
    PriorityRecalculationRequest,
)
from app.domain.risk import ModelMetadata, PredictiveRiskAssessment
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
from app.services.hazard_service import HazardService
from app.services.impact_service import ImpactService
from app.services.incident_service import IncidentService
from app.services.predictive_models import SyntheticBenchmarkValidator
from app.services.predictive_service import PredictiveService
from app.services.reconciliation_service import ReconciliationService
from app.services.seed_service import SeedService
from app.services.auth_service import (
    require_authenticated_user,
    require_field_verifier,
    require_operator,
)
from app.domain.outcome import OutcomeAssessment, OutcomeEvaluationRequest
from app.services.outcome_service import OutcomeService
from app.services.state_transition_service import StateTransitionService

router = APIRouter(tags=["incidents"])



# ── Schemas ──

class EvidenceCreateRequest(BaseModel):
    """Payload to add a new piece of evidence to an incident."""
    source: EvidenceSource
    source_name: str
    evidence_type: str
    observation: str
    metric: str
    reliability: str = "HIGH"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    provenance: Optional[str] = None
    original_reference: Optional[str] = None
    is_simulated: bool = False
    freshness_seconds: Optional[int] = None
    confidence_contribution: Optional[float] = None
    processing_status: EvidenceProcessingStatus = EvidenceProcessingStatus.RECEIVED
    interpretation: EvidenceInterpretation = EvidenceInterpretation.UNVERIFIED
    conflict_status: EvidenceConflictStatus = EvidenceConflictStatus.NONE
    conflict_details: Optional[str] = None
    details: Optional[str] = None
    raw_data: Optional[dict[str, Any]] = None


class EvidenceUpdateRequest(BaseModel):
    """Payload to update processing, verification, or conflict status of an evidence item."""
    actor_role: ActorRole
    actor_name: str
    processing_status: Optional[EvidenceProcessingStatus] = None
    interpretation: Optional[EvidenceInterpretation] = None
    conflict_status: Optional[EvidenceConflictStatus] = None
    conflict_details: Optional[str] = None
    reason: Optional[str] = None


class IncidentCreateRequest(BaseModel):
    """Payload to create a new Incident Twin."""
    title: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    location_name: Optional[str] = None
    incident_type: str = "landslide"
    corridor_name: Optional[str] = None
    state: str = "Arunachal Pradesh"
    district: str = "West Kameng"
    metadata_json: dict[str, Any] = Field(default_factory=dict)


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
    conflict_status: str = "NONE"
    conflict_details: Optional[str] = None
    details: Optional[str] = None
    raw_data: Optional[dict[str, Any]] = None

    model_config = {"from_attributes": True}


class ReconciliationResponse(BaseModel):
    """Structured deterministic cross-source evidence reconciliation result."""
    incident_id: uuid.UUID
    total_evidence_count: int
    source_distribution: dict[str, int]
    verified_count: int
    unverified_count: int
    supporting_evidence_ids: list[uuid.UUID]
    conflicting_evidence_ids: list[uuid.UUID]
    stale_evidence_ids: list[uuid.UUID]
    conflict_status: EvidenceConflictStatus
    conflict_summary: str
    dominant_signal: str
    evidence_quality_score: float
    confidence_contribution_aggregate: float
    recommended_action: str
    reconciled_at: datetime

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


@router.post("/incidents", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    body: IncidentCreateRequest,
    session: AsyncSession = Depends(get_db_session),
) -> IncidentResponse:
    """Create a new Incident Twin."""
    service = IncidentService(session)
    incident = await service.create_incident(
        title=body.title,
        latitude=body.latitude,
        longitude=body.longitude,
        description=body.description,
        location_name=body.location_name,
        incident_type=body.incident_type,
        corridor_name=body.corridor_name,
        state=body.state,
        district=body.district,
        metadata_json=body.metadata_json,
    )
    return IncidentResponse.model_validate(incident)


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
    _current_user: Any = Depends(require_authenticated_user),
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


@router.post("/incidents/{incident_id}/evidence", response_model=EvidenceItemResponse, status_code=status.HTTP_201_CREATED)
async def create_incident_evidence(
    incident_id: uuid.UUID,
    body: EvidenceCreateRequest,
    session: AsyncSession = Depends(get_db_session),
) -> EvidenceItemResponse:
    """Add a new piece of evidence to an incident twin with audit logging."""
    evidence_service = EvidenceService(session)
    try:
        evidence = await evidence_service.add_evidence(
            incident_id=incident_id,
            source=body.source,
            source_name=body.source_name,
            evidence_type=body.evidence_type,
            observation=body.observation,
            metric=body.metric,
            reliability=body.reliability,
            latitude=body.latitude,
            longitude=body.longitude,
            provenance=body.provenance,
            original_reference=body.original_reference,
            is_simulated=body.is_simulated,
            freshness_seconds=body.freshness_seconds,
            confidence_contribution=body.confidence_contribution,
            processing_status=body.processing_status,
            interpretation=body.interpretation,
            conflict_status=body.conflict_status,
            conflict_details=body.conflict_details,
            details=body.details,
            raw_data=body.raw_data,
        )
        return EvidenceItemResponse.model_validate(evidence)
    except IncidentNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)
    except DomainError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err.message)


@router.post("/incidents/{incident_id}/reconcile", response_model=ReconciliationResponse)
async def reconcile_incident_evidence_endpoint(
    incident_id: uuid.UUID,
    actor_role: ActorRole = Query(ActorRole.SYSTEM_AI),
    actor_name: str = Query("TerraGuardian Reconciliation Engine"),
    session: AsyncSession = Depends(get_db_session),
) -> ReconciliationResponse:
    """Execute deterministic multi-source cross-evidence reconciliation and conflict synthesis."""
    reconciliation_service = ReconciliationService(session)
    try:
        summary = await reconciliation_service.reconcile_incident_evidence(
            incident_id=incident_id,
            actor_role=actor_role,
            actor_name=actor_name,
        )
        return ReconciliationResponse.model_validate(summary)
    except IncidentNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)


@router.get("/incidents/{incident_id}/reconciliation", response_model=ReconciliationResponse)
async def get_incident_reconciliation_endpoint(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> ReconciliationResponse:
    """Retrieve current cross-source evidence reconciliation summary for an incident."""
    reconciliation_service = ReconciliationService(session)
    try:
        summary = await reconciliation_service.reconcile_incident_evidence(
            incident_id=incident_id,
            actor_role=ActorRole.SYSTEM_AI,
            actor_name="Reconciliation Inspector",
        )
        return ReconciliationResponse.model_validate(summary)
    except IncidentNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)


@router.get("/evidence/{evidence_id}", response_model=EvidenceItemResponse)
async def get_evidence_by_id_endpoint(
    evidence_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> EvidenceItemResponse:
    """Get a discrete evidence item by UUID."""
    evidence_service = EvidenceService(session)
    try:
        evidence = await evidence_service.get_evidence_by_id(evidence_id)
        return EvidenceItemResponse.model_validate(evidence)
    except DomainError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)


@router.patch("/evidence/{evidence_id}", response_model=EvidenceItemResponse)
async def update_evidence_endpoint(
    evidence_id: uuid.UUID,
    body: EvidenceUpdateRequest,
    session: AsyncSession = Depends(get_db_session),
) -> EvidenceItemResponse:
    """Update processing, verification, or conflict status of an evidence item."""
    evidence_service = EvidenceService(session)
    try:
        updated = await evidence_service.update_evidence_status(
            evidence_id=evidence_id,
            actor_role=body.actor_role,
            actor_name=body.actor_name,
            processing_status=body.processing_status,
            interpretation=body.interpretation,
            conflict_status=body.conflict_status,
            conflict_details=body.conflict_details,
            reason=body.reason,
        )
        return EvidenceItemResponse.model_validate(updated)
    except UnauthorizedAuthorityError as err:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=err.message)
    except DomainError as err:
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
    _current_user: Any = Depends(require_operator),
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
    _current_user: Any = Depends(require_authenticated_user),
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
    _current_user: Any = Depends(require_field_verifier),
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


@router.post("/incidents/{incident_id}/predict", response_model=PredictiveRiskAssessment, status_code=status.HTTP_200_OK)
async def predict_incident_risk_endpoint(
    incident_id: uuid.UUID,
    actor_role: Optional[ActorRole] = Query(ActorRole.SYSTEM_AI),
    actor_name: Optional[str] = Query("tg-landslide-baseline-v1"),
    session: AsyncSession = Depends(get_db_session),
) -> PredictiveRiskAssessment:
    """Execute predictive intelligence hazard & confidence assessment over multi-source evidence."""
    predictive_service = PredictiveService(session)
    try:
        assessment = await predictive_service.assess_incident_risk(
            incident_id=incident_id,
            actor_role=actor_role.value if isinstance(actor_role, ActorRole) else str(actor_role),
            actor_name=actor_name or "tg-landslide-baseline-v1",
        )
        return assessment
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))
    except DomainError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err.message)


@router.get("/incidents/{incident_id}/prediction", response_model=PredictiveRiskAssessment)
async def get_incident_prediction_endpoint(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> PredictiveRiskAssessment:
    """Retrieve the latest predictive risk and evidential confidence assessment."""
    predictive_service = PredictiveService(session)
    try:
        assessment = await predictive_service.get_latest_prediction(incident_id)
        return assessment
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.get("/models/metadata")
async def get_models_metadata_endpoint() -> dict[str, Any]:
    """Retrieve predictive model metadata and benchmark validation metrics."""
    metadata = ModelMetadata()
    benchmark_report = SyntheticBenchmarkValidator.evaluate_demonstration_benchmark()
    return {
        "active_model": metadata.model_dump(),
        "benchmark_validation": benchmark_report,
    }


@router.post("/incidents/seed/tg-2048", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def seed_tg2048_endpoint(
    force_reset: bool = Query(False),
    session: AsyncSession = Depends(get_db_session),
) -> IncidentResponse:
    """Deterministic seeder endpoint for incident TG-2048."""
    seed_service = SeedService(session)
    incident = await seed_service.seed_tg_2048(force_reset=force_reset)
    return IncidentResponse.model_validate(incident)


# ── Prompt 06: Hazard Evolution, Divergence & Bounded Reassessment ──

@router.get("/incidents/{incident_id}/hypothesis", response_model=HazardHypothesis)
async def get_hazard_hypothesis_endpoint(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> HazardHypothesis:
    """Retrieve the living hazard hypothesis and expected envelope for an incident."""
    hazard_service = HazardService(session)
    try:
        hypothesis = await hazard_service.get_hazard_hypothesis(incident_id)
        return hypothesis
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.get("/incidents/{incident_id}/divergences", response_model=list[DivergenceRecord])
async def get_incident_divergences_endpoint(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> list[DivergenceRecord]:
    """Retrieve all detected divergences between expected hypothesis and observed reality."""
    hazard_service = HazardService(session)
    try:
        divergences = await hazard_service.detect_divergences(incident_id)
        return divergences
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.post("/incidents/{incident_id}/reassess", response_model=BoundedReassessmentResult)
async def perform_bounded_reassessment_endpoint(
    incident_id: uuid.UUID,
    body: BoundedReassessmentRequest,
    session: AsyncSession = Depends(get_db_session),
    _current_user: Any = Depends(require_operator),
) -> BoundedReassessmentResult:
    """Execute a deterministic bounded hazard reassessment."""
    hazard_service = HazardService(session)
    try:
        result = await hazard_service.perform_bounded_reassessment(incident_id, body)
        return result
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.post("/incidents/{incident_id}/hazard-transitions", response_model=IncidentResponse)
async def transition_hazard_state_endpoint(
    incident_id: uuid.UUID,
    body: HazardStateTransitionRequest,
    session: AsyncSession = Depends(get_db_session),
    _current_user: Any = Depends(require_operator),
) -> IncidentResponse:
    """Execute and audit a validated physical hazard state transition."""
    hazard_service = HazardService(session)
    try:
        incident = await hazard_service.transition_hazard_state(incident_id, body)
        return IncidentResponse.model_validate(incident)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.get("/incidents/{incident_id}/lineage", response_model=HazardLineageSummary)
async def get_hazard_lineage_endpoint(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> HazardLineageSummary:
    """Retrieve full hazard evolution history and lineage continuity tree."""
    hazard_service = HazardService(session)
    try:
        summary = await hazard_service.get_lineage(incident_id)
        return summary
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


# ── PROMPT 03: Intervention-Conditioned Hazard Outcome Engine Endpoints ──

@router.post("/incidents/{incident_id}/outcome/evaluate", response_model=OutcomeAssessment)
async def evaluate_incident_outcome_endpoint(
    incident_id: uuid.UUID,
    body: Optional[OutcomeEvaluationRequest] = None,
    session: AsyncSession = Depends(get_db_session),
    _current_user: Any = Depends(require_operator),
) -> OutcomeAssessment:
    """Evaluate and record authoritative intervention-conditioned outcome."""
    outcome_service = OutcomeService(session)
    try:
        assessment = await outcome_service.evaluate_outcome(incident_id, body)
        return assessment
    except IncidentNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.get("/incidents/{incident_id}/outcome", response_model=Optional[OutcomeAssessment])
async def get_incident_outcome_endpoint(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    _current_user: Any = Depends(require_authenticated_user),
) -> Optional[OutcomeAssessment]:
    """Retrieve the latest evaluated outcome assessment for an incident."""
    outcome_service = OutcomeService(session)
    outcome = await outcome_service.get_latest_outcome(incident_id)
    if not outcome:
        try:
            outcome = await outcome_service.evaluate_outcome(incident_id)
        except IncidentNotFoundError as err:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=err.message)
    return outcome


@router.get("/incidents/{incident_id}/reassessments", response_model=list[dict[str, Any]])
async def list_incident_reassessments_endpoint(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    _current_user: Any = Depends(require_authenticated_user),
) -> list[dict[str, Any]]:
    """Retrieve full history of bounded reassessments for an incident."""
    hazard_service = HazardService(session)
    try:
        hypothesis = await hazard_service.get_hazard_hypothesis(incident_id)
        return hypothesis.evolution_history
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


# ── PROMPT 07: Impact Intelligence & Operational Priority Endpoints ──

@router.get("/incidents/{incident_id}/impact", response_model=ImpactAssessment)
async def get_incident_impact_endpoint(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> ImpactAssessment:
    """Retrieve the downstream consequence, infrastructure, and population exposure assessment."""
    impact_service = ImpactService(session)
    try:
        impact = await impact_service.get_impact_assessment(incident_id)
        return impact
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.post("/incidents/{incident_id}/impact/recalculate", response_model=ImpactAssessment)
async def recalculate_incident_impact_endpoint(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> ImpactAssessment:
    """Recalculate downstream impact vectors."""
    impact_service = ImpactService(session)
    try:
        impact = await impact_service.get_impact_assessment(incident_id)
        return impact
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.get("/incidents/{incident_id}/priority", response_model=PriorityAssessment)
async def get_incident_priority_endpoint(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> PriorityAssessment:
    """Retrieve the backend-authoritative operational response priority assessment."""
    impact_service = ImpactService(session)
    try:
        priority = await impact_service.compute_priority(incident_id)
        return priority
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.post("/incidents/{incident_id}/priority/recalculate", response_model=PriorityAssessment)
async def recalculate_incident_priority_endpoint(
    incident_id: uuid.UUID,
    body: Optional[PriorityRecalculationRequest] = None,
    session: AsyncSession = Depends(get_db_session),
) -> PriorityAssessment:
    """Recalculate operational response priority based on current hazard, exposure, and lifeline context."""
    impact_service = ImpactService(session)
    try:
        priority = await impact_service.compute_priority(incident_id, body)
        return priority
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.get("/incidents/{incident_id}/priority/history")
async def get_incident_priority_history_endpoint(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
) -> list[dict[str, Any]]:
    """Reconstruct chronological priority transitions (e.g. P2 -> P1) from append-oriented audit logs."""
    impact_service = ImpactService(session)
    return await impact_service.get_priority_history(incident_id)


@router.get("/comparative-priority", response_model=ComparativePriorityResult)
async def get_comparative_priority_endpoint(
    session: AsyncSession = Depends(get_db_session),
) -> ComparativePriorityResult:
    """Demonstrate HAZARD ≠ PRIORITY using two contrasting demonstration incidents."""
    impact_service = ImpactService(session)
    return impact_service.get_comparative_priority()





