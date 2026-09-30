"""Authoritative Alert Lifecycle Service enforcing human authorization and channel provenance.

INVARIANTS:
1. AI ASSISTS REASONING. RULES GOVERN CRITICAL STATE TRANSITIONS. HUMANS AUTHORIZE CRITICAL ACTIONS.
2. AI cannot generate an authorized alert autonomously.
3. Generated ≠ Sent ≠ Delivered ≠ Acknowledged ≠ Resolved.
4. Channel Not Connected: If SMS/telecom provider is unintegrated, explicitly show CHANNEL_NOT_CONNECTED.
5. Controlled Demo: Only explicit controlled demo pathways can simulate carrier dispatch, labeled CONTROLLED_DEMO.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import AlertChannelModel, AlertModel, IncidentModel
from app.domain.alert import (
    Alert,
    AlertAuthorizeRequest,
    AlertChannelDelivery,
    AlertChannelDeliveryStatus,
    AlertChannelType,
    AlertCreateRequest,
    AlertLifecycleUpdateRequest,
    AlertSeverity,
    AlertStage,
)
from app.domain.enums import ActorRole, AuditEventType
from app.domain.permissions import OperationalPermission, has_permission
from app.services.audit_service import AuditService
from app.services.exceptions import (
    DomainError,
    IncidentNotFoundError,
    PreconditionFailedError,
    UnauthorizedAuthorityError,
)


class AlertService:
    """Backend service managing governed disaster alerts and broadcast lifecycle."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.audit_service = AuditService(session)

    async def list_alerts_for_incident(self, incident_id: uuid.UUID) -> list[Alert]:
        """Retrieve all alerts issued for an incident with discrete channel statuses."""
        stmt = (
            select(AlertModel)
            .where(AlertModel.incident_id == incident_id)
            .options(selectinload(AlertModel.channels))
            .order_by(AlertModel.generated_at.desc())
        )
        res = await self.session.execute(stmt)
        records = res.scalars().all()
        return [self._to_domain(r) for r in records]

    async def get_alert_by_id(self, alert_id: uuid.UUID) -> Alert:
        """Fetch discrete alert by UUID."""
        stmt = (
            select(AlertModel)
            .where(AlertModel.id == alert_id)
            .options(selectinload(AlertModel.channels))
        )
        res = await self.session.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            raise DomainError(f"Alert {alert_id} not found.")
        return self._to_domain(record)

    async def create_or_recommend_alert(
        self,
        incident_id: uuid.UUID,
        body: AlertCreateRequest,
    ) -> Alert:
        """Generate a proposed/recommended alert (Operator or System recommendation).
        
        The alert is created in state ALERT_GENERATED and is NOT authorized or sent yet.
        """
        # Verify incident exists
        inc_stmt = select(IncidentModel).where(IncidentModel.id == incident_id)
        inc_res = await self.session.execute(inc_stmt)
        incident = inc_res.scalar_one_or_none()
        if not incident:
            raise IncidentNotFoundError(incident_id)

        now = datetime.utcnow()
        alert_code = body.alert_code or f"ALT-{incident.code}-{now.strftime('%H%M')}"

        alert_record = AlertModel(
            id=uuid.uuid4(),
            incident_id=incident_id,
            alert_code=alert_code,
            severity=body.severity.value,
            headline=body.headline.strip(),
            target_area=body.target_area.strip(),
            message=body.message.strip(),
            stage=AlertStage.ALERT_GENERATED.value,
            authorized=False,
            authorized_by=None,
            authorized_role=None,
            authority_order_code=None,
            action_required=body.action_required.strip(),
            is_controlled_demo=body.is_controlled_demo,
            provenance="TERRAGUARDIAN_ALERT_FABRIC",
            generated_at=now,
        )
        self.session.add(alert_record)

        # Standard Multi-Agency Delivery Channels
        cap_channel = AlertChannelModel(
            id=uuid.uuid4(),
            alert_id=alert_record.id,
            channel_type=AlertChannelType.CAP.value,
            channel_name="CAP / SACHET XML Protocol",
            status=AlertChannelDeliveryStatus.PENDING.value,
            latency="1.2s",
            details="Standardized OASIS CAP v1.2 feed consumed by SDMA Emergency Portal",
        )
        push_channel = AlertChannelModel(
            id=uuid.uuid4(),
            alert_id=alert_record.id,
            channel_type=AlertChannelType.APP_PUSH.value,
            channel_name="TerraGuardian Safe Mobile PWA Push",
            status=AlertChannelDeliveryStatus.PENDING.value,
            latency="0.8s",
            details="Hyper-local geo-fenced broadcast to registered mobile devices",
        )
        vhf_channel = AlertChannelModel(
            id=uuid.uuid4(),
            alert_id=alert_record.id,
            channel_type=AlertChannelType.VHF.value,
            channel_name="District Police Wireless VHF Channel 4",
            status=AlertChannelDeliveryStatus.PENDING.value,
            latency="Manual",
            details="VHF dispatch transmitted to Checkpost police detachments",
        )
        # SMS Gateway: Channel Not Connected by default (truthful boundary)
        sms_channel = AlertChannelModel(
            id=uuid.uuid4(),
            alert_id=alert_record.id,
            channel_type=AlertChannelType.SMS_GATEWAY.value,
            channel_name="National Telecom SMS Gateway (C-DOT Cell Broadcast)",
            status=AlertChannelDeliveryStatus.CHANNEL_NOT_CONNECTED.value,
            latency="N/A",
            details="Carrier SMS SMPP gateway integration awaiting departmental telecom clearance (CHANNEL NOT CONNECTED)",
        )

        self.session.add_all([cap_channel, push_channel, vhf_channel, sms_channel])
        await self.session.flush()

        # Audit event
        await self.audit_service.record_event(
            incident_id=incident_id,
            event_type=AuditEventType.STATE_CHANGED,
            actor_role=body.actor_role,
            actor_name=body.actor_name,
            previous_state=None,
            new_state=AlertStage.ALERT_GENERATED.value,
            reason=f"Alert {alert_code} generated for target area {alert_record.target_area}.",
            payload={"alert_id": str(alert_record.id), "alert_code": alert_code, "severity": alert_record.severity},
        )

        return await self.get_alert_by_id(alert_record.id)

    async def authorize_and_broadcast_alert(
        self,
        alert_id: uuid.UUID,
        body: AlertAuthorizeRequest,
    ) -> Alert:
        """Enact statutory human authorization to broadcast an alert.
        
        CRITICAL GOVERNANCE INVARIANT:
        AI RECOMMENDS → HUMAN AUTHORIZES.
        Only a human AUTHORIZATION_OFFICER can authorize disaster alerts.
        """
        stmt = (
            select(AlertModel)
            .where(AlertModel.id == alert_id)
            .options(selectinload(AlertModel.channels))
        )
        res = await self.session.execute(stmt)
        alert = res.scalar_one_or_none()
        if not alert:
            raise DomainError(f"Alert {alert_id} not found.")

        # 1. Authority Guard: Reject AI actors
        if body.signer_role in (ActorRole.SYSTEM_AI, "SYSTEM_AI"):
            raise UnauthorizedAuthorityError(
                "AI/System actors cannot authorize statutory disaster alerts. "
                "Statutory authorization by a human official (AUTHORIZATION_OFFICER) is mandatory."
            )

        # 2. Role Check: Must have AUTHORIZE_ACTION permission
        if not has_permission(body.signer_role, OperationalPermission.AUTHORIZE_ACTION):
            raise UnauthorizedAuthorityError(
                "Only an AUTHORIZATION_OFFICER (Magistrate/DDMA) has statutory power to authorize emergency alerts. "
                f"Actor role '{body.signer_role.value if hasattr(body.signer_role, 'value') else body.signer_role}' is unauthorized."
            )

        # 3. Order Code Guard
        if not body.authority_order_code or not body.authority_order_code.strip():
            raise PreconditionFailedError("Statutory alert broadcast requires an official disaster order reference code.")

        now = datetime.utcnow()
        alert.authorized = True
        alert.authorized_by = body.signer_name.strip()
        alert.authorized_role = body.signer_role.value if hasattr(body.signer_role, "value") else str(body.signer_role)
        alert.authority_order_code = body.authority_order_code.strip()
        alert.authorized_at = now
        alert.is_controlled_demo = body.is_controlled_demo

        # Governance Invariant: Authorization ≠ Execution, Sent ≠ Delivered
        if body.is_controlled_demo:
            alert.sent_at = now
            alert.delivered_at = now
            alert.stage = AlertStage.DELIVERED.value

            for ch in alert.channels:
                if ch.channel_type in (AlertChannelType.CAP.value, AlertChannelType.APP_PUSH.value):
                    ch.status = AlertChannelDeliveryStatus.DELIVERED.value
                    ch.dispatched_at = now
                    ch.delivered_at = now
                    ch.details = f"[CONTROLLED_DEMO] Simulated dissemination via local test sandbox: {ch.channel_name}"
                elif ch.channel_type == AlertChannelType.VHF.value:
                    ch.status = AlertChannelDeliveryStatus.SENT.value
                    ch.dispatched_at = now
                    ch.details = f"[CONTROLLED_DEMO] Simulated operational radio transmission sent: {ch.channel_name}"
                elif ch.channel_type == AlertChannelType.SMS_GATEWAY.value:
                    # Invariant: Disconnected carrier channel strictly remains CHANNEL_NOT_CONNECTED
                    ch.status = AlertChannelDeliveryStatus.CHANNEL_NOT_CONNECTED.value
                    ch.details = "Carrier SMS SMPP gateway integration awaiting departmental telecom clearance (CHANNEL NOT CONNECTED)"
        else:
            # Live / Operational Mode: Authorization completed; broadcast requires real connected providers
            alert.stage = AlertStage.AUTHORIZED.value
            for ch in alert.channels:
                if ch.channel_type == AlertChannelType.SMS_GATEWAY.value:
                    ch.status = AlertChannelDeliveryStatus.CHANNEL_NOT_CONNECTED.value
                    ch.details = "Carrier SMS SMPP gateway integration awaiting departmental telecom clearance (CHANNEL NOT CONNECTED)"
                else:
                    ch.status = AlertChannelDeliveryStatus.PENDING.value

        await self.session.flush()

        # Append-Oriented Operational Audit Log
        await self.audit_service.record_event(
            incident_id=alert.incident_id,
            event_type=AuditEventType.DECISION_MADE,
            actor_role=body.signer_role,
            actor_name=body.signer_name.strip(),
            previous_state=AlertStage.ALERT_GENERATED.value,
            new_state=alert.stage,
            reason=f"Alert {alert.alert_code} authorized by {alert.authorized_by} under order {alert.authority_order_code}.",
            payload={
                "alert_id": str(alert.id),
                "authority_order_code": alert.authority_order_code,
                "is_controlled_demo": alert.is_controlled_demo,
            },
        )

        return await self.get_alert_by_id(alert.id)

    async def update_alert_lifecycle(
        self,
        alert_id: uuid.UUID,
        body: AlertLifecycleUpdateRequest,
    ) -> Alert:
        """Advance alert lifecycle through distinct canonical stages: SENT, DELIVERED, ACKNOWLEDGED, ESCALATED."""
        stmt = (
            select(AlertModel)
            .where(AlertModel.id == alert_id)
            .options(selectinload(AlertModel.channels))
        )
        res = await self.session.execute(stmt)
        alert = res.scalar_one_or_none()
        if not alert:
            raise DomainError(f"Alert {alert_id} not found.")

        now = datetime.utcnow()
        prev_stage = alert.stage

        if body.stage == AlertStage.SENT:
            alert.stage = AlertStage.SENT.value
            alert.sent_at = now
            for ch in alert.channels:
                if ch.channel_type != AlertChannelType.SMS_GATEWAY.value and (body.channel_type is None or ch.channel_type == body.channel_type.value):
                    if ch.status == AlertChannelDeliveryStatus.PENDING.value:
                        ch.status = AlertChannelDeliveryStatus.SENT.value
                        ch.dispatched_at = now
                        if alert.is_controlled_demo:
                            ch.details = f"[CONTROLLED_DEMO] Simulated transmission: {ch.channel_name}"
        elif body.stage == AlertStage.DELIVERED:
            alert.stage = AlertStage.DELIVERED.value
            alert.delivered_at = now
            for ch in alert.channels:
                if ch.channel_type != AlertChannelType.SMS_GATEWAY.value and (body.channel_type is None or ch.channel_type == body.channel_type.value):
                    if ch.status in (AlertChannelDeliveryStatus.PENDING.value, AlertChannelDeliveryStatus.SENT.value):
                        ch.status = AlertChannelDeliveryStatus.DELIVERED.value
                        ch.delivered_at = now
                        if alert.is_controlled_demo:
                            ch.details = f"[CONTROLLED_DEMO] Simulated delivery via local test sandbox: {ch.channel_name}"
        elif body.stage == AlertStage.ACKNOWLEDGED:
            alert.stage = AlertStage.ACKNOWLEDGED.value
            alert.acknowledged_at = now
            for ch in alert.channels:
                if body.channel_type is None or ch.channel_type == body.channel_type.value:
                    if ch.status == AlertChannelDeliveryStatus.DELIVERED.value:
                        ch.status = AlertChannelDeliveryStatus.ACKNOWLEDGED.value
                        ch.acknowledged_at = now

        elif body.stage == AlertStage.ESCALATED:
            alert.stage = AlertStage.ESCALATED.value
            alert.escalated_at = now
            alert.escalation_reason = body.reason or "Alert escalated due to evolving physical hazard severity."

        await self.session.flush()

        await self.audit_service.record_event(
            incident_id=alert.incident_id,
            event_type=AuditEventType.STATE_CHANGED,
            actor_role=body.actor_role,
            actor_name=body.actor_name,
            previous_state=prev_stage,
            new_state=alert.stage,
            reason=body.reason or f"Alert transitioned to {alert.stage}",
            payload={"alert_id": str(alert.id), "stage": alert.stage},
        )

        return await self.get_alert_by_id(alert.id)

    def _to_domain(self, r: AlertModel) -> Alert:
        channels = [
            AlertChannelDelivery(
                channel_type=AlertChannelType(c.channel_type),
                channel_name=c.channel_name,
                status=AlertChannelDeliveryStatus(c.status),
                latency=c.latency,
                details=c.details,
                dispatched_at=c.dispatched_at,
                delivered_at=c.delivered_at,
                acknowledged_at=c.acknowledged_at,
            )
            for c in (r.channels or [])
        ]
        return Alert(
            id=r.id,
            incident_id=r.incident_id,
            alert_code=r.alert_code,
            severity=AlertSeverity(r.severity),
            headline=r.headline,
            target_area=r.target_area,
            message=r.message,
            stage=AlertStage(r.stage),
            channels=channels,
            authorized=r.authorized,
            authorized_by=r.authorized_by,
            authorized_role=ActorRole(r.authorized_role) if r.authorized_role else None,
            authority_order_code=r.authority_order_code,
            authorized_at=r.authorized_at,
            action_required=r.action_required,
            is_controlled_demo=r.is_controlled_demo,
            provenance=r.provenance,
            escalation_reason=r.escalation_reason,
            generated_at=r.generated_at,
            sent_at=r.sent_at,
            delivered_at=r.delivered_at,
            acknowledged_at=r.acknowledged_at,
            escalated_at=r.escalated_at,
        )
