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
import json
from typing import Any, Optional

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adapters.fcm import FCMAdapter
from app.db.models import (
    AlertChannelModel,
    AlertModel,
    IncidentModel,
    AlertAcknowledgementModel,
    DeviceRegistrationModel,
    RoadStatusModel,
)
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
    WarningLevel,
    AlertTriggerType,
    HazardType,
    TargetGeometryType,
    AlertAcknowledgementRequest,
    DeviceRegisterRequest,
    RoadStatusItem,
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
        self.fcm_adapter = FCMAdapter()


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

        # Determine warning level and triggers
        if body.warning_level:
            warning_level = body.warning_level.value
        elif body.severity == AlertSeverity.CRITICAL:
            warning_level = "EMERGENCY"
        elif body.severity == AlertSeverity.HIGH:
            warning_level = "WARNING"
        elif body.severity == AlertSeverity.MODERATE:
            warning_level = "ADVISORY"
        else:
            warning_level = "WATCH"

        trigger_type = body.trigger_type.value if body.trigger_type else "HAZARD_OBSERVATION"
        hazard_type = body.hazard_type.value if body.hazard_type else "LANDSLIDE"
        target_geom = body.target_geometry_type.value if body.target_geometry_type else "CORRIDOR"
        target_state = body.target_state or incident.state
        target_district = body.target_district or incident.district
        target_lat = body.target_latitude if body.target_latitude is not None else incident.latitude
        target_lng = body.target_longitude if body.target_longitude is not None else incident.longitude
        target_rad = body.target_radius_km if body.target_radius_km is not None else 15.0
        affected_roads = json.dumps(body.affected_roads) if body.affected_roads else (json.dumps([incident.corridor_name]) if incident.corridor_name else None)
        target_localities = json.dumps(body.target_localities) if body.target_localities else (json.dumps([incident.location_name]) if incident.location_name else None)
        evidence_lineage = json.dumps(body.evidence_lineage) if body.evidence_lineage else None

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
            warning_level=warning_level,
            trigger_type=trigger_type,
            hazard_type=hazard_type,
            confidence=body.confidence if body.confidence is not None else 0.85,
            rationale=body.rationale,
            target_geometry_type=target_geom,
            target_state=target_state,
            target_district=target_district,
            target_localities=target_localities,
            target_latitude=target_lat,
            target_longitude=target_lng,
            target_radius_km=target_rad,
            affected_roads=affected_roads,
            valid_from=body.valid_from or now,
            valid_until=body.valid_until,
            evidence_lineage=evidence_lineage,
            version=1,
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

    async def list_all_alerts(self, status_filter: Optional[str] = None) -> list[Alert]:
        """List all alerts across the platform with optional stage/lifecycle filter."""
        stmt = select(AlertModel).options(selectinload(AlertModel.channels)).order_by(AlertModel.generated_at.desc())
        if status_filter:
            sf_upper = status_filter.upper()
            if sf_upper == "ACTIVE":
                stmt = stmt.where(
                    or_(
                        AlertModel.stage == AlertStage.AUTHORIZED.value,
                        AlertModel.stage == AlertStage.SENT.value,
                        AlertModel.stage == AlertStage.DELIVERED.value,
                    )
                )
            elif sf_upper == "CANDIDATES":
                stmt = stmt.where(AlertModel.stage == AlertStage.ALERT_GENERATED.value)
            elif sf_upper == "AUTHORIZATION_REQUIRED":
                stmt = stmt.where(AlertModel.authorized.is_(False))
            elif sf_upper in ("ACKNOWLEDGED", "ESCALATED", "DELIVERED", "SENT"):
                stmt = stmt.where(AlertModel.stage == sf_upper)

        res = await self.session.execute(stmt)
        records = res.scalars().all()
        return [self._to_domain(r) for r in records]

    async def acknowledge_alert(
        self,
        alert_id: uuid.UUID,
        body: AlertAcknowledgementRequest,
    ) -> dict[str, Any]:
        """Record citizen alert acknowledgement and 'I AM SAFE' status signal."""
        stmt = select(AlertModel).where(AlertModel.id == alert_id)
        res = await self.session.execute(stmt)
        alert = res.scalar_one_or_none()
        if not alert:
            raise DomainError(f"Alert {alert_id} not found.")

        now = datetime.utcnow()
        ack_record = AlertAcknowledgementModel(
            id=uuid.uuid4(),
            alert_id=alert_id,
            device_id=body.device_id,
            citizen_id=body.citizen_id,
            opened_at=body.opened_at or now,
            acknowledged_at=body.acknowledged_at or now,
            is_safe=body.is_safe,
            safe_notes=body.safe_notes,
            approx_lat=body.approx_lat,
            approx_lng=body.approx_lng,
            created_at=now,
        )
        self.session.add(ack_record)

        # Update alert acknowledged timestamp if not set
        if not alert.acknowledged_at:
            alert.acknowledged_at = now

        await self.session.flush()

        # Append-oriented audit event
        await self.audit_service.record_event(
            incident_id=alert.incident_id,
            event_type=AuditEventType.STATE_CHANGED,
            actor_role=ActorRole.CITIZEN,
            actor_name="Citizen Safe Device",
            previous_state=alert.stage,
            new_state=alert.stage,
            reason=f"Citizen {body.device_id[:8]} acknowledged alert {alert.alert_code}. (is_safe={body.is_safe})",
            payload={"alert_id": str(alert.id), "device_id": body.device_id, "is_safe": body.is_safe},
        )

        return {
            "status": "ACKNOWLEDGED",
            "alert_id": str(alert_id),
            "device_id": body.device_id,
            "is_safe": body.is_safe,
            "recorded_at": now.isoformat(),
        }

    async def register_device(self, body: DeviceRegisterRequest) -> dict[str, Any]:
        """Register or update citizen device for targeted FCM push notifications."""
        stmt = select(DeviceRegistrationModel).where(DeviceRegistrationModel.device_id == body.device_id)
        res = await self.session.execute(stmt)
        device = res.scalar_one_or_none()

        now = datetime.utcnow()
        districts_json = json.dumps(body.subscribed_districts) if body.subscribed_districts else None
        corridors_json = json.dumps(body.subscribed_corridors) if body.subscribed_corridors else None

        if device:
            device.fcm_token = body.fcm_token
            device.platform = body.platform
            device.app_version = body.app_version
            device.notification_permissions = body.notification_permissions
            device.last_latitude = body.latitude
            device.last_longitude = body.longitude
            device.last_accuracy_m = body.accuracy_m
            device.last_location_time = now
            device.subscribed_districts = districts_json
            device.subscribed_corridors = corridors_json
            device.last_seen = now
        else:
            device = DeviceRegistrationModel(
                id=uuid.uuid4(),
                device_id=body.device_id,
                fcm_token=body.fcm_token,
                platform=body.platform,
                app_version=body.app_version,
                notification_permissions=body.notification_permissions,
                last_latitude=body.latitude,
                last_longitude=body.longitude,
                last_accuracy_m=body.accuracy_m,
                last_location_time=now,
                subscribed_districts=districts_json,
                subscribed_corridors=corridors_json,
                last_seen=now,
                created_at=now,
            )
            self.session.add(device)

        await self.session.flush()
        return {
            "status": "REGISTERED",
            "device_id": body.device_id,
            "platform": body.platform,
            "last_seen": now.isoformat(),
        }

    async def get_road_statuses(self) -> list[RoadStatusItem]:
        """Get authoritative road and transit corridor statuses."""
        await self.seed_default_road_statuses()
        stmt = select(RoadStatusModel).order_by(RoadStatusModel.observed_at.desc())
        res = await self.session.execute(stmt)
        records = res.scalars().all()
        return [
            RoadStatusItem(
                id=r.id,
                road_code=r.road_code,
                road_name=r.road_name,
                corridor_section=r.corridor_section,
                state=r.state,
                district=r.district,
                status=r.status,
                condition_summary=r.condition_summary,
                closure_reason=r.closure_reason,
                source=r.source,
                verified_by=r.verified_by,
                observed_at=r.observed_at,
                updated_at=r.updated_at,
            )
            for r in records
        ]

    async def seed_default_road_statuses(self) -> None:
        """Seed initial ground-truth road statuses if empty."""
        stmt = select(RoadStatusModel).limit(1)
        res = await self.session.execute(stmt)
        if res.scalar_one_or_none():
            return

        now = datetime.utcnow()
        default_roads = [
            RoadStatusModel(
                id=uuid.uuid4(),
                road_code="NH-13",
                road_name="Trans-Arunachal Highway (BCT Corridor)",
                corridor_section="KM-38 to KM-46 (Bhalukpong-Tenga)",
                state="Arunachal Pradesh",
                district="West Kameng",
                status="CAUTION",
                condition_summary="One-way traffic operational at KM-42. Heavy machinery clearing roadside shoulder debris.",
                closure_reason="Debris wash following persistent monsoon precipitation.",
                source="Border Roads Organisation (BRO Project Vartak)",
                verified_by="OC 14 BRTF",
                observed_at=now,
                updated_at=now,
            ),
            RoadStatusModel(
                id=uuid.uuid4(),
                road_code="NH-10",
                road_name="Sevoke-Gangtok Highway",
                corridor_section="Teesta Bazaar to Rangpo",
                state="Sikkim",
                district="Pakyong",
                status="OPEN",
                condition_summary="Carriageway clear for all vehicular traffic. Hillside slopes damp but stable.",
                closure_reason=None,
                source="Sikkim PWD / Traffic Control",
                verified_by="Duty Officer Rangpo",
                observed_at=now,
                updated_at=now,
            ),
            RoadStatusModel(
                id=uuid.uuid4(),
                road_code="NH-29",
                road_name="Dimapur-Kohima Highway",
                corridor_section="Chumukedima Rockfall Zone",
                state="Nagaland",
                district="Chümoukedima",
                status="CAUTION",
                condition_summary="Slow movement advisory due to rolling stones during rainfall. Escort pilot vehicles active.",
                closure_reason=None,
                source="Nagaland State Police & PWD",
                verified_by="Traffic Control Dimapur",
                observed_at=now,
                updated_at=now,
            ),
        ]
        self.session.add_all(default_roads)
        await self.session.flush()

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

        localities = None
        if r.target_localities:
            try:
                localities = json.loads(r.target_localities)
            except Exception:
                localities = [r.target_localities]

        roads = None
        if r.affected_roads:
            try:
                roads = json.loads(r.affected_roads)
            except Exception:
                roads = [r.affected_roads]

        lineage = None
        if r.evidence_lineage:
            try:
                lineage = json.loads(r.evidence_lineage)
            except Exception:
                lineage = {"raw": r.evidence_lineage}

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
            warning_level=WarningLevel(r.warning_level) if hasattr(r, "warning_level") and r.warning_level else WarningLevel.WARNING,
            trigger_type=AlertTriggerType(r.trigger_type) if hasattr(r, "trigger_type") and r.trigger_type else AlertTriggerType.HAZARD_OBSERVATION,
            hazard_type=HazardType(r.hazard_type) if hasattr(r, "hazard_type") and r.hazard_type else HazardType.LANDSLIDE,
            confidence=r.confidence if hasattr(r, "confidence") and r.confidence is not None else 0.85,
            rationale=r.rationale if hasattr(r, "rationale") else None,
            target_geometry_type=TargetGeometryType(r.target_geometry_type) if hasattr(r, "target_geometry_type") and r.target_geometry_type else TargetGeometryType.CORRIDOR,
            target_state=r.target_state if hasattr(r, "target_state") and r.target_state else "Arunachal Pradesh",
            target_district=r.target_district if hasattr(r, "target_district") and r.target_district else "West Kameng",
            target_localities=localities,
            target_latitude=r.target_latitude if hasattr(r, "target_latitude") else None,
            target_longitude=r.target_longitude if hasattr(r, "target_longitude") else None,
            target_radius_km=r.target_radius_km if hasattr(r, "target_radius_km") and r.target_radius_km is not None else 15.0,
            affected_roads=roads,
            valid_from=r.valid_from if hasattr(r, "valid_from") and r.valid_from else r.generated_at,
            valid_until=r.valid_until if hasattr(r, "valid_until") else None,
            evidence_lineage=lineage,
            dedup_hash=r.dedup_hash if hasattr(r, "dedup_hash") else None,
            version=r.version if hasattr(r, "version") and r.version else 1,
            generated_at=r.generated_at,
            sent_at=r.sent_at,
        )

    @classmethod
    def generate_multilingual_payload(
        cls,
        headline: str,
        message: str,
        warning_level: str = "WARNING",
        corridor: str = "NH-13 Bhalukpong-Tenga",
    ) -> dict[str, dict[str, str]]:
        """Generate standardized multilingual alert dissemination packages for North Eastern Region."""
        # Regional template matrix
        templates = {
            "en": {
                "language": "English",
                "headline": headline,
                "message": message,
                "protective_action": "Avoid non-essential travel along the corridor. Adhere to BRO and District Police checkpoints.",
                "disclaimer": "Official Early Warning broadcast under Disaster Management Act, 2005.",
            },
            "hi": {
                "language": "Hindi (हिंदी)",
                "headline": f"भूस्खलन पूर्व चेतावनी: {corridor} गलियारा — {warning_level}",
                "message": f"मौसम विभाग एवं सेंसर द्वारा भारी वर्षा एवं ढलान अस्थिरता दर्ज की गई है। {message}",
                "protective_action": "गलियारे में अनावश्यक यात्रा से बचें। बीआरओ और जिला पुलिस के निर्देशों का पालन करें।",
                "disclaimer": "आपदा प्रबंधन अधिनियम, 2005 के अंतर्गत अधिकृत आधिकारिक पूर्व चेतावनी।",
            },
            "as": {
                "language": "Assamese (অসমীয়া)",
                "headline": f"ভূমিস্খলনৰ পূৰ্ব সতৰ্কবাণী: {corridor} কৰিডৰ — {warning_level}",
                "message": f"পাহাৰীয়া অঞ্চলত প্ৰচণ্ড বৰষুণৰ ফলত ভূমিস্খলনৰ আশংকা তীব্ৰ হৈ পৰিছে। {message}",
                "protective_action": "অনাৱশ্যক ভ্ৰমণৰ পৰা বিৰত থাকক। বিআৰঅ' আৰু জিলা প্ৰশাসনৰ নিৰ্দেশ মানি চলক।",
                "disclaimer": "দুৰ্যোগ ব্যৱস্থাপনা আইন, ২০০৫ ৰ অধীনত অনুমোদিত সতৰ্কবাণী।",
            },
            "bn": {
                "language": "Bengali (বাংলা)",
                "headline": f"ভূমিধসের প্রাক-সতর্কবার্তা: {corridor} করিডোর — {warning_level}",
                "message": f"ভারী বর্ষণ এবং পাহাড়ি ঢাল বিচ্যুতির কারণে ভূমিধসের প্রবল আশঙ্কা। {message}",
                "protective_action": "জরুরি প্রয়োজন ছাড়া এই পথে চলাচল বন্ধ রাখুন। জেলা প্রশাসনের নির্দেশ মেনে চলুন।",
                "disclaimer": "বিপর্যয় ব্যবস্থাপনা আইন, ২০০৫ অনুযায়ী জারি করা সরকারি সতর্কতা।",
            },
            "bdo": {
                "language": "Bodo (बड़ो)",
                "headline": f"हाब्रु बानायनाय सिगां सांग्रांथि: {corridor} लामा — {warning_level}",
                "message": f"अखा बारहाबानाय आरो हाजो ख्लाबनायनि जाउनाव गिथाव हाब्रु बानायनाय जानो हागौ। {message}",
                "protective_action": "गोनांथार नङाब्ला लामायाव दाथां। पुलिस आरो बि.आर.अ' नि बाथ्रा मानिनानै था।",
                "disclaimer": "डिजास्टार मेनेजमेन्ट एक्ट, 2005 नि सिङाव फोसावनाय सांग्रांथि।",
            },
        }
        return templates


