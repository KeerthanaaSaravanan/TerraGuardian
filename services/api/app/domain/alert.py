"""Domain models for Governed Alert Lifecycle.

INVARIANTS:
1. AI ASSISTS REASONING. RULES GOVERN CRITICAL STATE TRANSITIONS. HUMANS AUTHORIZE CRITICAL ACTIONS.
2. AI cannot generate an authorized alert autonomously.
3. Generated ≠ Sent
4. Sent ≠ Delivered
5. Delivered ≠ Acknowledged
6. Acknowledged ≠ Resolved
7. If SMS/carrier gateway is unconnected: CHANNEL NOT CONNECTED (No fake delivery).
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.domain.enums import ActorRole


class AlertStage(str, enum.Enum):
    """Canonical Alert Lifecycle Stages."""

    ALERT_GENERATED = "ALERT_GENERATED"
    AUTHORIZED = "AUTHORIZED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    ESCALATED = "ESCALATED"

    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            val_upper = value.upper()
            if val_upper in ("AUTHORIZED", "ALERT_AUTHORIZED"):
                return cls.AUTHORIZED
            if val_upper in ("ALERT_SENT", "SENT"):
                return cls.SENT
            if val_upper in ("ALERT_DELIVERED", "DELIVERED"):
                return cls.DELIVERED
            if val_upper in ("ALERT_ACKNOWLEDGED", "ACKNOWLEDGED"):
                return cls.ACKNOWLEDGED
            if val_upper in ("ALERT_GENERATED", "GENERATED"):
                return cls.ALERT_GENERATED
            if val_upper in ("ALERT_ESCALATED", "ESCALATED"):
                return cls.ESCALATED
        return None


class AlertSeverity(str, enum.Enum):
    """Alert Severity Classification."""

    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    ADVISORY = "ADVISORY"


class AlertChannelType(str, enum.Enum):
    """Broadcast and notification delivery channels."""

    CAP = "CAP"                  # OASIS Common Alerting Protocol / SACHET XML
    VHF = "VHF"                  # District Police Wireless VHF Radio Channel
    APP_PUSH = "APP_PUSH"        # TerraGuardian Safe Citizen PWA Push
    SMS_GATEWAY = "SMS_GATEWAY"  # Telecom Carrier SMS / C-DOT Cell Broadcast


class AlertChannelDeliveryStatus(str, enum.Enum):
    """Status of channel-specific broadcast delivery."""

    PENDING = "PENDING"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    CHANNEL_NOT_CONNECTED = "CHANNEL_NOT_CONNECTED"
    FAILED = "FAILED"


class AlertChannelDelivery(BaseModel):
    """Discrete channel delivery record."""

    channel_type: AlertChannelType
    channel_name: str
    status: AlertChannelDeliveryStatus = AlertChannelDeliveryStatus.PENDING
    latency: Optional[str] = None
    details: str
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None


class Alert(BaseModel):
    """Authoritative persistent Alert record with complete lifecycle and authorization tracking."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    alert_code: str  # e.g., "ALT-2048-01", "RED-ALERT-KM42"
    severity: AlertSeverity
    headline: str
    target_area: str
    message: str
    stage: AlertStage = AlertStage.ALERT_GENERATED

    channels: list[AlertChannelDelivery] = Field(default_factory=list)

    # Human Authority Boundary
    authorized: bool = False
    authorized_by: Optional[str] = None
    authorized_role: Optional[ActorRole] = None
    authority_order_code: Optional[str] = None
    authorized_at: Optional[datetime] = None

    action_required: str
    is_controlled_demo: bool = False
    provenance: str = "TERRAGUARDIAN_ALERT_FABRIC"
    escalation_reason: Optional[str] = None

    generated_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    escalated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AlertCreateRequest(BaseModel):
    """Payload to propose or generate an alert (Operator or System recommendation)."""

    alert_code: Optional[str] = None
    severity: AlertSeverity = AlertSeverity.HIGH
    headline: str
    target_area: str
    message: str
    action_required: str
    actor_role: ActorRole = ActorRole.OPERATOR
    actor_name: str = "Duty Operations Officer"
    is_controlled_demo: bool = False


class AlertAuthorizeRequest(BaseModel):
    """Statutory human magistrate authorization to broadcast an alert."""

    authority_order_code: str
    signer_name: str
    signer_role: ActorRole = ActorRole.AUTHORIZATION_OFFICER
    dispatch_channels: Optional[list[AlertChannelType]] = None
    is_controlled_demo: bool = False


class AlertLifecycleUpdateRequest(BaseModel):
    """Update alert stage (e.g. acknowledge or escalate)."""

    stage: AlertStage
    actor_name: str
    actor_role: ActorRole
    reason: Optional[str] = None
    channel_type: Optional[AlertChannelType] = None
