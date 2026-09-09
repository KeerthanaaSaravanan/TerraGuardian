"""TerraGuardian Canonical Domain Enums.

Defines the four independent operational dimensions:
1. Incident Lifecycle (Operational State)
2. Hazard State (Physical Reality)
3. Evidence State (Evidential Interpretation & Processing)
4. Action State (Operational Execution & Ground Truth)

Along with core risk, confidence, priority, actor, and audit classifications.
"""

from __future__ import annotations

import enum


class IncidentStatus(str, enum.Enum):
    """A. Canonical Incident Operational Lifecycle States.
    
    Represents the operational handling and coordination lifecycle.
    """
    DETECTED = "DETECTED"
    ASSESSING = "ASSESSING"
    VERIFYING = "VERIFYING"
    VERIFIED = "VERIFIED"
    DECISION_REQUIRED = "DECISION_REQUIRED"
    AUTHORIZED = "AUTHORIZED"
    RESPONDING = "RESPONDING"
    MONITORING = "MONITORING"
    REASSESSING = "REASSESSING"
    RESOLVED = "RESOLVED"
    REVIEWED = "REVIEWED"


class HazardState(str, enum.Enum):
    """B. Physical Hazard Evolution States.
    
    Represents the actual physical behavior of the slope/landslide.
    Physical hazard evolves INDEPENDENTLY of administrative lifecycle.
    """
    EXPECTED = "EXPECTED"
    ACTIVE = "ACTIVE"
    DELAYED = "DELAYED"
    SHIFTED = "SHIFTED"
    PARTIAL = "PARTIAL"
    EVOLVED = "EVOLVED"
    DISSIPATED = "DISSIPATED"
    RESOLVED = "RESOLVED"
    FALSE_ALARM = "FALSE_ALARM"


class EvidenceSource(str, enum.Enum):
    """Origin category of evidence."""
    AUTHORITATIVE = "AUTHORITATIVE"  # GSI, NDMA, CWC
    WEATHER = "WEATHER"              # IMD AWS, Doppler Radar
    SATELLITE = "SATELLITE"          # Sentinel-1 InSAR, Sentinel-2 Optical
    TERRAIN = "TERRAIN"              # DEM, GSI NLSM Geomorphology
    SENSOR = "SENSOR"                # Piezometer, Inclinometer, Extensometer
    CITIZEN = "CITIZEN"              # TerraGuardian Safe mobile submissions
    FIELD = "FIELD"                  # SDRF/NDRF/BRO ground patrol
    HISTORICAL = "HISTORICAL"        # Past landslide logs
    MODEL = "MODEL"                  # Algorithmic hazard estimates


class EvidenceProcessingStatus(str, enum.Enum):
    """Evidence processing pipeline stage."""
    RECEIVED = "RECEIVED"
    PROCESSED = "PROCESSED"
    RECONCILED = "RECONCILED"


class EvidenceInterpretation(str, enum.Enum):
    """Final evidential interpretation.
    
    Citizen evidence MUST be capable of remaining UNVERIFIED.
    """
    VERIFIED = "VERIFIED"
    UNVERIFIED = "UNVERIFIED"
    CONFLICTED = "CONFLICTED"


class ActionState(str, enum.Enum):
    """D. Operational Action Execution Lifecycle.
    
    APPROVED ≠ COMPLETED
    COMPLETED ≠ PHYSICALLY_CONFIRMED
    """
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    DISPATCHED = "DISPATCHED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    PHYSICALLY_CONFIRMED = "PHYSICALLY_CONFIRMED"


class RiskLevel(str, enum.Enum):
    """Assessed risk level (Physical Hazard Danger/Severity)."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"
    NEGLIGIBLE = "NEGLIGIBLE"
    UNKNOWN = "UNKNOWN"


class ConfidenceLevel(str, enum.Enum):
    """Assessed confidence level (Evidential Certainty).
    
    RISK ≠ CONFIDENCE
    """
    VERY_HIGH = "VERY_HIGH"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"
    VERY_LOW = "VERY_LOW"
    UNASSESSED = "UNASSESSED"


class PriorityLevel(str, enum.Enum):
    """Operational Response Priority.
    
    HAZARD ≠ PRIORITY (Hazard volume alone does not determine priority).
    """
    P1_CRITICAL = "P1_CRITICAL"
    P2_HIGH = "P2_HIGH"
    P3_MODERATE = "P3_MODERATE"
    P4_LOW = "P4_LOW"


class ActorRole(str, enum.Enum):
    """Actor Authority Classification.
    
    AI/System actors cannot make safety-critical authoritative decisions.
    """
    SYSTEM_AI = "SYSTEM_AI"
    FIELD_VERIFIER = "FIELD_VERIFIER"
    OPERATOR = "OPERATOR"
    AUTHORIZED_DECISION_MAKER = "AUTHORIZED_DECISION_MAKER"


class AuditEventType(str, enum.Enum):
    """Canonical domain audit event types."""
    INCIDENT_CREATED = "INCIDENT_CREATED"
    EVIDENCE_RECEIVED = "EVIDENCE_RECEIVED"
    EVIDENCE_RECONCILED = "EVIDENCE_RECONCILED"
    STATE_CHANGED = "STATE_CHANGED"
    DECISION_MADE = "DECISION_MADE"
    ACTION_DISPATCHED = "ACTION_DISPATCHED"
    ACTION_UPDATED = "ACTION_UPDATED"
    ACTION_CONFIRMED = "ACTION_CONFIRMED"
    DIVERGENCE_DETECTED = "DIVERGENCE_DETECTED"
    REASSESSMENT_PERFORMED = "REASSESSMENT_PERFORMED"
    RESOLUTION_RECORDED = "RESOLUTION_RECORDED"
