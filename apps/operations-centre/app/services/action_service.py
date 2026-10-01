"""Authoritative Action service managing task states and ground confirmation evidence."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ActionConfirmationModel, ActionModel, EvidenceModel
from app.domain.action import can_confirm_action, is_valid_action_transition
from app.domain.enums import (
    ActionState,
    ActorRole,
    AuditEventType,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceProcessingStatus,
    EvidenceSource,
)
from app.services.audit_service import AuditService
from app.services.exceptions import (
    ActionNotFoundError,
    DomainError,
    InvalidTransitionError,
    PreconditionFailedError,
    UnauthorizedAuthorityError,
)
from app.services.incident_service import IncidentService


class ActionService:
    """Service managing operational action states and accepted confirmation evidence."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.incident_service = IncidentService(session)
        self.audit_service = AuditService(session)

    async def get_action(self, action_id: uuid.UUID) -> ActionModel:
        """Fetch an action by ID."""
        stmt = select(ActionModel).where(ActionModel.id == action_id)
        result = await self.session.execute(stmt)
        action = result.scalar_one_or_none()
        if not action:
            raise ActionNotFoundError(f"Action with ID {action_id} not found.")
        return action

    async def list_actions_for_incident(self, incident_id: uuid.UUID) -> list[ActionModel]:
        """Fetch all operational tasks for an incident."""
        await self.incident_service.get_by_id(incident_id)
        stmt = (
            select(ActionModel)
            .where(ActionModel.incident_id == incident_id)
            .order_by(ActionModel.task_code.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_action(
        self,
        incident_id: uuid.UUID,
        task_code: str,
        agency: str,
        title: str,
        description: str,
        assigned_to: str,
        is_action_gap_trigger: bool = False,
        action_type: str = "OPERATIONAL_RESPONSE",
        priority: str = "P1",
        urgency: str = "IMMEDIATE",
        requires_authorization: bool = False,
        affected_area: Optional[str] = None,
        rationale: Optional[str] = None,
        prerequisites: Optional[list[str]] = None,
        supporting_evidence_ids: Optional[list[str]] = None,
        workflow_type: str = "COORDINATED_DISPATCH",
        actor_role: ActorRole = ActorRole.OPERATOR,
        actor_name: str = "Duty Dispatcher",
    ) -> ActionModel:
        """Create and persist a new operational response task."""
        await self.incident_service.get_by_id(incident_id)

        # Idempotency check: return existing if task_code matches within incident
        stmt = select(ActionModel).where(
            ActionModel.incident_id == incident_id,
            ActionModel.task_code == task_code,
        )
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        action = ActionModel(
            id=uuid.uuid4(),
            incident_id=incident_id,
            task_code=task_code,
            agency=agency,
            title=title,
            description=description,
            assigned_to=assigned_to,
            is_action_gap_trigger=is_action_gap_trigger,
            state=ActionState.PROPOSED.value,
            action_type=action_type,
            priority=priority,
            urgency=urgency,
            requires_authorization=requires_authorization,
            affected_area=affected_area,
            rationale=rationale,
            prerequisites=prerequisites or [],
            supporting_evidence_ids=supporting_evidence_ids or [],
            workflow_type=workflow_type,
        )
        self.session.add(action)
        await self.session.flush()

        await self.audit_service.record_event(
            incident_id=incident_id,
            event_type=AuditEventType.ACTION_UPDATED,
            actor_role=actor_role,
            actor_name=actor_name,
            previous_state=None,
            new_state=ActionState.PROPOSED.value,
            reason=f"Action {task_code} proposed: {title}",
            payload={"action_id": str(action.id), "task_code": task_code, "agency": agency, "priority": priority},
        )
        return action

    async def recommend_actions_for_incident(
        self,
        incident_id: uuid.UUID,
        actor_role: ActorRole = ActorRole.OPERATOR,
        actor_name: str = "Automated Dispatch Recommender",
    ) -> list[ActionModel]:
        """Generate and persist the 4 canonical coordinated multi-agency response tasks for an incident."""
        incident = await self.incident_service.get_by_id(incident_id)

        # Canonical multi-agency action definitions
        canonical_specs = [
            {
                "task_code": "TSK-01",
                "agency": "Border Roads Organisation (TF 14 / 85 RCC)",
                "title": "Corridor Traffic Control & Emergency Gate Closure",
                "description": "Deploy traffic regulation and emergency closure at KM-38 checkpost on sole lifeline NH-13 to prevent civilian vehicles from entering the active slope zone.",
                "assigned_to": "Major V. Sharma (Officer Commanding / BRO Project Vartak)",
                "is_action_gap_trigger": True,
                "action_type": "TRAFFIC_CONTROL",
                "priority": "P1",
                "urgency": "IMMEDIATE",
                "requires_authorization": True,
                "affected_area": f"{incident.corridor_name or 'NH-13 Bhalukpong-Bomdila'} Km 38-40",
                "rationale": "Sole strategic transport corridor with zero viable bypass routes; high consequence to life and civil logistics.",
                "prerequisites": ["Statutory Disaster Management Order", "Executive Magistrate Authorization"],
                "workflow_type": "COORDINATED_DISPATCH",
            },
            {
                "task_code": "TSK-02",
                "agency": "Geotechnical Field Authority (Bomdila Division)",
                "title": "Rapid Geotechnical Slope Inspection & Crack Mapping",
                "description": "Deploy field engineering inspection unit to conduct visual slope stability, tension crack measurement, and drainage culvert assessment.",
                "assigned_to": "Geotechnical Engineering Unit, Bomdila",
                "is_action_gap_trigger": False,
                "action_type": "FIELD_VERIFICATION",
                "priority": "P1",
                "urgency": "HIGH",
                "requires_authorization": True,
                "affected_area": f"Slope Ch. 38.200 - 38.600 ({incident.location_name or 'West Kameng Corridor'})",
                "rationale": "Confirm satellite InSAR and rainfall velocity anomalies with in-situ tension crack metrics and scarp progression.",
                "prerequisites": ["BRO Corridor Escort"],
                "workflow_type": "COORDINATED_DISPATCH",
            },
            {
                "task_code": "TSK-03",
                "agency": "District Disaster Management Authority (DDMA)",
                "title": "Downslope Settlement Advisory & Precautionary Warning",
                "description": "Issue early warning advisory to downstream hamlets and road labour camps regarding potential debris flow and runoff hazard.",
                "assigned_to": "DDMA West Kameng Field Liaison",
                "is_action_gap_trigger": False,
                "action_type": "EVACUATION",
                "priority": "P2",
                "urgency": "CONDITIONAL",
                "requires_authorization": True,
                "affected_area": "Downslope Munna Camp & Riverine Settlements",
                "rationale": "Protect habitations in secondary debris runout footprint if slope breaches.",
                "prerequisites": ["District Magistrate Advisory Sign-off"],
                "workflow_type": "COORDINATED_DISPATCH",
            },
            {
                "task_code": "TSK-04",
                "agency": "Field Telemetry Unit (Scientific Monitoring Team)",
                "title": "Automated Inclinometer & Continuous Sensor Telemetry",
                "description": "Deploy rapid-install surface tiltmeter / inclinometer telemetry on active crown zone to provide continuous millimeter-grade displacement monitoring.",
                "assigned_to": "Scientific Telemetry Response Team",
                "is_action_gap_trigger": False,
                "action_type": "MONITORING",
                "priority": "P2",
                "urgency": "ROUTINE",
                "requires_authorization": False,
                "affected_area": "Crown Escarpment KM 38",
                "rationale": "Fill spatial-temporal observation gaps during cloud obscuration periods.",
                "prerequisites": [],
                "workflow_type": "COORDINATED_DISPATCH",
            },
        ]

        result_actions: list[ActionModel] = []
        for spec in canonical_specs:
            action = await self.create_action(
                incident_id=incident.id,
                task_code=spec["task_code"],
                agency=spec["agency"],
                title=spec["title"],
                description=spec["description"],
                assigned_to=spec["assigned_to"],
                is_action_gap_trigger=spec["is_action_gap_trigger"],
                action_type=spec["action_type"],
                priority=spec["priority"],
                urgency=spec["urgency"],
                requires_authorization=spec["requires_authorization"],
                affected_area=spec["affected_area"],
                rationale=spec["rationale"],
                prerequisites=spec["prerequisites"],
                workflow_type=spec["workflow_type"],
                actor_role=actor_role,
                actor_name=actor_name,
            )
            result_actions.append(action)

        return result_actions

    async def update_action_state(
        self,
        action_id: uuid.UUID,
        target_state: ActionState,
        actor_role: ActorRole,
        actor_name: str,
        reason: Optional[str] = None,
        incident_id: Optional[uuid.UUID] = None,
        authority_order_code: Optional[str] = None,
        authorization_reason: Optional[str] = None,
        dispatch_reference: Optional[str] = None,
        dispatch_channel: Optional[str] = None,
        target_agency: Optional[str] = None,
        acknowledged_by: Optional[str] = None,
        acknowledgement_status: Optional[str] = None,
        acknowledgement_reason: Optional[str] = None,
        execution_actor: Optional[str] = None,
        execution_notes: Optional[str] = None,
        execution_location: Optional[str] = None,
    ) -> ActionModel:
        """Execute and audit a validated action state transition.
        
        Pattern: request → domain validation → state transition → persistence → audit event.
        """
        action = await self.get_action(action_id)
        current_state = ActionState(action.state)

        # 0a. Cross-Incident Ownership Guard
        if incident_id is not None and incident_id != action.incident_id:
            raise DomainError(
                f"Cross-incident action transition mismatch: Action '{action_id}' belongs to incident '{action.incident_id}', not '{incident_id}'."
            )

        # 0b. Explicit Confirmation Bypass Guard
        # PHYSICALLY_CONFIRMED is a protected terminal state reachable ONLY through confirm_action().
        if target_state == ActionState.PHYSICALLY_CONFIRMED:
            raise InvalidTransitionError(
                current_state=current_state.value,
                target_state=target_state.value,
                reason=(
                    "PHYSICALLY_CONFIRMED cannot be set via state transition. "
                    "Use POST /actions/{action_id}/confirmations with accepted field evidence."
                ),
            )

        # 0c. Server-Side Authority & RBAC Rules (Evaluated BEFORE idempotency to prevent unauthorized bypasses)
        from app.domain.permissions import OperationalPermission, has_permission, normalize_role
        canonical_role = normalize_role(actor_role)

        if target_state == ActionState.APPROVED:
            if action.requires_authorization:
                if not has_permission(canonical_role, OperationalPermission.AUTHORIZE_ACTION):
                    raise UnauthorizedAuthorityError(
                        f"Action approval for '{action.task_code}' requires statutory authorization (AUTHORIZE_ACTION) from AUTHORIZATION_OFFICER. "
                        f"Actor role '{actor_role.value if hasattr(actor_role, 'value') else actor_role}' is unauthorized."
                    )
            elif not has_permission(canonical_role, OperationalPermission.PROPOSE_ACTION) and not has_permission(canonical_role, OperationalPermission.AUTHORIZE_ACTION):
                raise UnauthorizedAuthorityError(
                    f"Action approval (APPROVED) requires OPERATOR or AUTHORIZATION_OFFICER authority. "
                    f"Actor role '{actor_role.value if hasattr(actor_role, 'value') else actor_role}' is unauthorized."
                )
        elif target_state == ActionState.DISPATCHED:
            if not has_permission(canonical_role, OperationalPermission.EXECUTE_ACTION):
                raise UnauthorizedAuthorityError(
                    f"Action dispatch requires EXECUTE_ACTION authority (e.g. OPERATOR). "
                    f"Actor role '{actor_role.value if hasattr(actor_role, 'value') else actor_role}' is unauthorized."
                )
        elif target_state in (ActionState.ACKNOWLEDGED, ActionState.IN_PROGRESS, ActionState.COMPLETED):
            if not has_permission(canonical_role, OperationalPermission.EXECUTE_ACTION):
                raise UnauthorizedAuthorityError(
                    f"Action state transition to '{target_state.value}' requires EXECUTE_ACTION authority (OPERATOR or FIELD_RESPONDER). "
                    f"Actor role '{actor_role.value if hasattr(actor_role, 'value') else actor_role}' is unauthorized."
                )

        # 0d. Idempotency Check: authorized repeated identical state change is a safe no-op
        if current_state == target_state:
            return action

        # 1. Transition Validity Check
        if not is_valid_action_transition(current_state, target_state):
            raise InvalidTransitionError(
                current_state=current_state.value,
                target_state=target_state.value,
                reason=f"Action cannot transition from '{current_state.value}' to '{target_state.value}'.",
            )

        # 2. Mutate State & Timestamp
        previous_state_val = action.state
        action.state = target_state.value
        now = datetime.utcnow()

        if target_state == ActionState.APPROVED:
            action.authorized_at = now
            action.authorized_by = actor_name
            if authority_order_code:
                action.authority_order_code = authority_order_code
            if authorization_reason or reason:
                action.authorization_reason = authorization_reason or reason
        elif target_state == ActionState.DISPATCHED:
            action.dispatched_at = now
            action.dispatch_reference = dispatch_reference or f"DSP-{action.task_code}-{uuid.uuid4().hex[:8].upper()}"
            action.dispatch_channel = dispatch_channel or "INTERNAL_DISPATCH"
            action.dispatch_status = "DISPATCHED"
            action.target_agency = target_agency or action.agency
        elif target_state == ActionState.ACKNOWLEDGED:
            if acknowledgement_status in ("DECLINED", "UNAVAILABLE") and not (acknowledgement_reason or reason):
                raise PreconditionFailedError(
                    "Declining or reporting unavailable requires an explicit acknowledgement_reason."
                )
            action.acknowledged_at = now
            action.acknowledged_by = acknowledged_by or actor_name
            action.acknowledgement_status = acknowledgement_status or "ACKNOWLEDGED"
            action.acknowledgement_reason = acknowledgement_reason or reason
        elif target_state == ActionState.IN_PROGRESS:
            action.execution_actor = execution_actor or actor_name
            if execution_notes:
                action.execution_notes = f"{action.execution_notes}\n{execution_notes}" if action.execution_notes else execution_notes
            if execution_location:
                action.execution_location = execution_location
        elif target_state == ActionState.COMPLETED:
            action.completed_at = now
            if execution_notes:
                action.execution_notes = f"{action.execution_notes}\n{execution_notes}" if action.execution_notes else execution_notes
            if execution_location:
                action.execution_location = execution_location

        await self.session.flush()

        # 3. Append Audit Event
        audit_event_type = (
            AuditEventType.ACTION_DISPATCHED
            if target_state == ActionState.DISPATCHED
            else AuditEventType.ACTION_UPDATED
        )
        audit_payload: dict[str, Any] = {
            "action_id": str(action.id),
            "task_code": action.task_code,
            "agency": action.agency,
            "priority": action.priority,
        }
        if action.dispatch_reference:
            audit_payload["dispatch_reference"] = action.dispatch_reference
        if action.authority_order_code:
            audit_payload["authority_order_code"] = action.authority_order_code
        if action.acknowledged_by:
            audit_payload["acknowledged_by"] = action.acknowledged_by

        await self.audit_service.record_event(
            incident_id=action.incident_id,
            event_type=audit_event_type,
            actor_role=actor_role,
            actor_name=actor_name,
            previous_state=previous_state_val,
            new_state=target_state.value,
            reason=reason or f"Action {action.task_code} transitioned to {target_state.value}",
            payload=audit_payload,
        )

        return action

    async def confirm_action(
        self,
        action_id: uuid.UUID,
        confirming_officer: str,
        confirming_agency: str,
        location_confirmed: str,
        confirmation_notes: str,
        communication_channel: str = "TETRA_RADIO",
        evidence_photo_url: Optional[str] = None,
        is_simulated: bool = False,
        incident_id: Optional[uuid.UUID] = None,
    ) -> ActionConfirmationModel:
        """Record accepted confirmation evidence, inject verified field evidence, and trigger living closed loop.
        
        APPROVED ≠ COMPLETED
        COMPLETED ≠ PHYSICALLY_CONFIRMED
        """
        action = await self.get_action(action_id)
        current_state = ActionState(action.state)

        # 0a. Cross-Incident Ownership Guard
        if incident_id is not None and incident_id != action.incident_id:
            raise DomainError(
                f"Cross-incident confirmation mismatch: Action '{action_id}' belongs to incident '{action.incident_id}', not '{incident_id}'."
            )

        # 0b. Idempotency & Conflicting Replay Check
        if current_state == ActionState.PHYSICALLY_CONFIRMED:
            stmt = (
                select(ActionConfirmationModel)
                .where(ActionConfirmationModel.action_id == action.id)
                .order_by(ActionConfirmationModel.confirmed_at.desc())
            )
            res = await self.session.execute(stmt)
            existing_conf = res.scalar_one_or_none()
            if existing_conf:
                same_location = existing_conf.location_confirmed.strip().lower() == location_confirmed.strip().lower()
                same_officer = existing_conf.confirming_officer.strip().lower() == confirming_officer.strip().lower()
                if same_location and same_officer:
                    return existing_conf
                raise DomainError(
                    "Conflicting confirmation replay: Action is already physically confirmed with differing location or officer."
                )

        # 1. State Validity: Only dispatched/active/completed actions can be confirmed
        if not can_confirm_action(current_state):
            raise InvalidTransitionError(
                current_state=current_state.value,
                target_state=ActionState.PHYSICALLY_CONFIRMED.value,
                reason=(
                    f"Action in state '{current_state.value}' cannot be confirmed. "
                    "Only dispatched, acknowledged, in-progress, or completed actions can receive physical ground confirmation."
                ),
            )

        # 2. Mandatory Evidence Validation
        if not location_confirmed or len(location_confirmed.strip()) < 3:
            raise PreconditionFailedError("Physical confirmation requires a valid location_confirmed (min 3 characters).")
        if not confirmation_notes or len(confirmation_notes.strip()) < 5:
            raise PreconditionFailedError("Physical confirmation requires detailed confirmation_notes (min 5 characters).")
        if not confirming_officer or not confirming_officer.strip():
            raise PreconditionFailedError("Physical confirmation requires a valid confirming_officer name.")

        now = datetime.utcnow()
        action.state = ActionState.PHYSICALLY_CONFIRMED.value
        action.confirmed_at = now

        # 3. Create Confirmation Record
        confirmation = ActionConfirmationModel(
            id=uuid.uuid4(),
            action_id=action.id,
            incident_id=action.incident_id,
            confirming_officer=confirming_officer.strip(),
            confirming_agency=confirming_agency.strip() if confirming_agency else "West Kameng Field Unit",
            communication_channel=communication_channel,
            location_confirmed=location_confirmed.strip(),
            confirmed_at=now,
            confirmation_notes=confirmation_notes.strip(),
            evidence_photo_url=evidence_photo_url,
        )
        self.session.add(confirmation)
        await self.session.flush()

        # 3b. Inject Authoritative Field Verification Evidence into Evidence Fabric
        field_evidence = EvidenceModel(
            id=uuid.uuid4(),
            incident_id=action.incident_id,
            source=EvidenceSource.FIELD.value,
            source_name=f"{confirming_agency.strip()} Ground Confirmation",
            evidence_type="GROUND_PATROL_CONFIRMATION",
            observation=f"Physical ground confirmation for {action.task_code} ({action.title}): {confirmation_notes.strip()}",
            metric=f"ACTION_CONFIRMED_{action.task_code}",
            reliability="HIGH",
            observed_at=now,
            received_at=now,
            freshness_seconds=0,
            confidence_contribution=0.90,
            processing_status=EvidenceProcessingStatus.PROCESSED.value,
            interpretation=EvidenceInterpretation.VERIFIED.value,
            conflict_status=EvidenceConflictStatus.NONE.value,
            details=f"Location: {location_confirmed.strip()} | Officer: {confirming_officer.strip()} | Channel: {communication_channel}",
            provenance=f"Field verification accepted for action {action.task_code}",
            is_simulated=is_simulated,
        )
        self.session.add(field_evidence)
        await self.session.flush()

        # 3c. Trigger Living Incident Closed-Loop: Outcome Evaluation
        try:
            from app.services.outcome_service import OutcomeService
            outcome_svc = OutcomeService(self.session)
            await outcome_svc.evaluate_outcome(incident_id=action.incident_id)
        except Exception:
            pass

        # 3d. Trigger Living Hazard Reassessment: Monotonically increment assessment_version
        try:
            from app.services.predictive_service import PredictiveService
            predictive_svc = PredictiveService(self.session)
            await predictive_svc.assess_incident_risk(
                incident_id=action.incident_id,
                actor_role=ActorRole.SYSTEM_AI.value,
                actor_name="tg-operational-reassessment-engine",
            )
        except Exception:
            pass

        # 4. Record Audit Event
        await self.audit_service.record_event(
            incident_id=action.incident_id,
            event_type=AuditEventType.ACTION_CONFIRMED,
            actor_role=ActorRole.FIELD_VERIFIER,
            actor_name=confirming_officer.strip(),
            previous_state=current_state.value,
            new_state=ActionState.PHYSICALLY_CONFIRMED.value,
            reason=f"Accepted confirmation evidence for {action.task_code} from {confirming_officer} ({confirming_agency})",
            payload={
                "action_id": str(action.id),
                "task_code": action.task_code,
                "channel": communication_channel,
                "location": location_confirmed,
                "is_simulated": is_simulated,
            },
        )

        return confirmation
