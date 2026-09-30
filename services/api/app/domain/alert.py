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


class WarningLevel(str, enum.Enum):
    """Standardized Early Warning Levels (Separated from generic risk scores)."""

    NORMAL = "NORMAL"
    WATCH = "WATCH"
    ADVISORY = "ADVISORY"
    WARNING = "WARNING"
    SEVERE_WARNING = "SEVERE_WARNING"
    EMERGENCY = "EMERGENCY"


class AlertTriggerType(str, enum.Enum):
    """Authoritative trigger classes for early warning generation."""

    HAZARD_OBSERVATION = "HAZARD_OBSERVATION"
    WEATHER_TRIGGER = "WEATHER_TRIGGER"
    MULTI_EVIDENCE_CONVERGENCE = "MULTI_EVIDENCE_CONVERGENCE"
    OFFICIAL_ALERT = "OFFICIAL_ALERT"
    INCIDENT_STATE_CHANGE = "INCIDENT_STATE_CHANGE"


class HazardType(str, enum.Enum):
    """Specific geological and environmental hazard types."""

    LANDSLIDE = "LANDSLIDE"
    DEBRIS_FLOW = "DEBRIS_FLOW"
    ROCKFALL = "ROCKFALL"
    SLOPE_CRACK = "SLOPE_CRACK"
    FLASH_FLOOD = "FLASH_FLOOD"
    ROAD_SUBSIDENCE = "ROAD_SUBSIDENCE"


class TargetGeometryType(str, enum.Enum):
    """Geofenced warning zone geometries."""

    POINT = "POINT"
    CORRIDOR = "CORRIDOR"
    POLYGON = "POLYGON"
    DISTRICT = "DISTRICT"
    STATE = "STATE"


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

    # Early Warning & Spatial Targeting Dimensions
    warning_level: WarningLevel = WarningLevel.WARNING
    trigger_type: AlertTriggerType = AlertTriggerType.HAZARD_OBSERVATION
    hazard_type: HazardType = HazardType.LANDSLIDE
    confidence: float = 0.85
    rationale: Optional[str] = None
    target_geometry_type: TargetGeometryType = TargetGeometryType.CORRIDOR
    target_state: str = "Arunachal Pradesh"
    target_district: str = "West Kameng"
    target_localities: Optional[list[str]] = None
    target_latitude: Optional[float] = None
    target_longitude: Optional[float] = None
    target_radius_km: float = 15.0
    affected_roads: Optional[list[str]] = None
    valid_from: datetime = Field(default_factory=datetime.utcnow)
    valid_until: Optional[datetime] = None
    evidence_lineage: Optional[dict[str, Any]] = None
    dedup_hash: Optional[str] = None
    version: int = 1

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

    # Early warning optional parameters
    warning_level: Optional[WarningLevel] = None
    trigger_type: Optional[AlertTriggerType] = None
    hazard_type: Optional[HazardType] = None
    confidence: Optional[float] = 0.85
    rationale: Optional[str] = None
    target_geometry_type: Optional[TargetGeometryType] = None
    target_state: Optional[str] = "Arunachal Pradesh"
    target_district: Optional[str] = "West Kameng"
    target_localities: Optional[list[str]] = None
    target_latitude: Optional[float] = None
    target_longitude: Optional[float] = None
    target_radius_km: Optional[float] = 15.0
    affected_roads: Optional[list[str]] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    evidence_lineage: Optional[dict[str, Any]] = None


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


class AlertAcknowledgementRequest(BaseModel):
    """Citizen emergency acknowledgement and 'I AM SAFE' status ping."""

    device_id: str
    citizen_id: Optional[str] = None
    opened_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    is_safe: bool = False
    safe_notes: Optional[str] = None
    approx_lat: Optional[float] = None
    approx_lng: Optional[float] = None


class DeviceRegisterRequest(BaseModel):
    """Citizen device registration for FCM push and localized safety updates."""

    device_id: str
    fcm_token: str
    platform: str = "ANDROID"
    app_version: str = "1.0.0"
    notification_permissions: bool = True
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_m: Optional[float] = None
    subscribed_districts: Optional[list[str]] = None
    subscribed_corridors: Optional[list[str]] = None


class RoadStatusItem(BaseModel):
    """Authoritative road status."""

    id: uuid.UUID
    road_code: str
    road_name: str
    corridor_section: str
    state: str
    district: str
    status: str
    condition_summary: str
    closure_reason: Optional[str] = None
    source: str
    verified_by: Optional[str] = None
    observed_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CitizenSafetyStatusResponse(BaseModel):
    """Authoritative safety status answering the core citizen safety questions."""

    safety_status: WarningLevel
    status_color: str  # "GREEN" | "YELLOW" | "ORANGE" | "RED"
    status_headline: str
    current_location: dict[str, Any]
    active_warning: Optional[Alert] = None
    what_changed: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    affected_roads: list[RoadStatusItem] = Field(default_factory=list)
    nearby_incidents: list[dict[str, Any]] = Field(default_factory=list)
    emergency_contacts: dict[str, str] = Field(default_factory=dict)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    is_cached_stale: bool = False

