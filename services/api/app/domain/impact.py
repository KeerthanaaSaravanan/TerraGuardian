"""Impact Intelligence and Operational Priority Domain Models (Prompt 07).

INVARIANTS:
1. HAZARD ≠ PRIORITY (Hazard volume or risk alone does not determine operational priority).
2. HIGHEST HAZARD ≠ HIGHEST OPERATIONAL PRIORITY.
3. RISK ≠ CONFIDENCE (Uncertainty is surfaced independently and does not blindly suppress priority).
4. PRIORITY ≠ AUTHORIZATION (Priority informs human decision-making; it does NOT autonomously execute actions).
5. CONSEQUENCE IS EXPLAINABLE & AUDITABLE.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.domain.enums import ActorRole, ConfidenceLevel, PriorityLevel, RiskLevel
from app.domain.hazard import HazardHypothesis


class CriticalFacilityType(str, enum.Enum):
    """Categorization of exposed critical infrastructure."""

    HOSPITAL = "HOSPITAL"
    EMERGENCY_DEPOT = "EMERGENCY_DEPOT"
    STRATEGIC_CORRIDOR = "STRATEGIC_CORRIDOR"
    BRIDGE_VIADUCT = "BRIDGE_VIADUCT"
    COMMUNICATIONS = "COMMUNICATIONS"
    POWER_WATER_GRID = "POWER_WATER_GRID"
    RESIDENTIAL_COMMUNITY = "RESIDENTIAL_COMMUNITY"


class CorridorConnectivity(str, enum.Enum):
    """Transport corridor redundancy and isolation potential."""

    SOLE_LIFELINE_NO_DETOUR = "SOLE_LIFELINE_NO_DETOUR"
    LONG_UNPAVED_DETOUR = "LONG_UNPAVED_DETOUR"
    PARTIAL_BYPASS_AVAILABLE = "PARTIAL_BYPASS_AVAILABLE"
    MULTIPLE_PAVED_ALTERNATIVES = "MULTIPLE_PAVED_ALTERNATIVES"


class ResponseAccessibility(str, enum.Enum):
    """Physical and logistical difficulty for emergency responders."""

    HIGH_DIFFICULTY_STEEP_ISOLATED = "HIGH_DIFFICULTY_STEEP_ISOLATED"
    MODERATE_DIFFICULTY_WEATHER_CONSTRAINED = "MODERATE_DIFFICULTY_WEATHER_CONSTRAINED"
    NORMAL_ACCESSIBLE = "NORMAL_ACCESSIBLE"


class ImpactDataQuality(str, enum.Enum):
    """Completeness and certainty of impact input vectors."""

    COMPLETE = "COMPLETE"
    PARTIAL_DEMOGRAPHIC_MISSING = "PARTIAL_DEMOGRAPHIC_MISSING"
    PARTIAL_CONNECTIVITY_UNCONFIRMED = "PARTIAL_CONNECTIVITY_UNCONFIRMED"
    INCOMPLETE = "INCOMPLETE"


class ImpactNode(BaseModel):
    """A single discrete node in the hazard propagation and consequence chain."""

    stage_order: int
    stage_name: str  # e.g., "1. Hazard Origin", "2. Strategic Corridor"
    node_name: str   # e.g., "NH-13 KM-42 Carriageway"
    category: str    # ORIGIN | CORRIDOR | COMMUNITY | LIFELINE | FACILITY
    severity: RiskLevel
    description: str
    vulnerability_factor: str
    population_count: int = 0
    facility_type: Optional[CriticalFacilityType] = None


# Alias for backward compatibility if needed
ImpactNodeModel = ImpactNode


class ImpactAssessment(BaseModel):
    """Authoritative downstream consequence, infrastructure, and population exposure assessment."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    corridor_name: str
    population_exposed: Optional[int] = 1420
    is_population_known: bool = True
    vulnerable_population_count: Optional[int] = 380
    critical_facilities: list[str] = Field(default_factory=list)
    is_critical_facilities_known: bool = True
    connectivity_status: CorridorConnectivity = CorridorConnectivity.LONG_UNPAVED_DETOUR
    is_connectivity_known: bool = True
    has_alternative_detour: bool = False
    detour_penalty_km: float = 0.0
    detour_travel_time_hours: float = 0.0
    response_difficulty: ResponseAccessibility = ResponseAccessibility.HIGH_DIFFICULTY_STEEP_ISOLATED
    is_response_difficulty_known: bool = True
    cascading_consequences: list[str] = Field(default_factory=list)
    
    # Impact Data Quality & Evidential Confidence (Distinct from Hazard Confidence)
    impact_data_quality: ImpactDataQuality = ImpactDataQuality.COMPLETE
    impact_confidence_score: float = Field(ge=0.0, le=100.0, default=82.0)
    impact_confidence_level: ConfidenceLevel = ConfidenceLevel.HIGH

    # Causal Impact Graph / Chain
    impact_chain: list[ImpactNode] = Field(default_factory=list)
    
    assessed_at: datetime = Field(default_factory=datetime.utcnow)
    assessed_by: str = "System Consequence Engine"

    model_config = {"from_attributes": True}


class PriorityAssessment(BaseModel):
    """Authoritative operational response priority assessment.
    
    Derived from:
    Operational Priority = f(Hazard Risk, Population Exposure, Criticality, Connectivity Severance, Response Difficulty)
    
    CRITICAL:
    - RISK ≠ PRIORITY
    - HAZARD ≠ PRIORITY
    - PRIORITY ≠ AUTHORIZATION
    """

    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    incident_id: uuid.UUID
    priority_level: PriorityLevel
    priority_score: float = Field(ge=0.0, le=100.0)

    previous_priority_level: Optional[PriorityLevel] = None
    priority_change_reason: Optional[str] = None

    # Decomposed scoring components (0-100 scale)
    hazard_risk_input: float
    hazard_confidence_input: float
    exposure_score: float
    criticality_score: float
    connectivity_penalty_score: float
    response_difficulty_score: float

    # Explainable drivers & counterfactors
    primary_drivers: list[str] = Field(default_factory=list)
    counterfactors: list[str] = Field(default_factory=list)
    operational_rationale: str
    recommended_human_action: str = "Immediate human review required for response prioritization."

    # Staleness flag (True if hazard state evolved and priority has not been recomputed)
    is_stale: bool = False
    stale_reason: Optional[str] = None

    # Operator override provenance
    is_operator_override_applied: bool = False
    override_provenance: Optional[str] = None

    # Impact data quality status at time of priority calculation
    impact_data_quality: ImpactDataQuality = ImpactDataQuality.COMPLETE

    assessed_at: datetime = Field(default_factory=datetime.utcnow)
    assessed_by: str = "System Priority Engine"

    model_config = {"from_attributes": True}


class PriorityRecalculationRequest(BaseModel):
    """Request payload to manually or systematically re-evaluate operational priority."""

    actor_role: ActorRole = ActorRole.OPERATOR
    actor_name: str = "Operations Duty Officer"
    reason: Optional[str] = None
    override_exposure: Optional[int] = Field(default=None, ge=0)
    override_connectivity: Optional[CorridorConnectivity] = None


class PriorityHistoryItem(BaseModel):
    """Historical priority transition recorded in the append-oriented audit log."""

    id: uuid.UUID
    incident_id: uuid.UUID
    event_type: str
    actor_role: str
    actor_name: str
    previous_priority: Optional[str] = None
    new_priority: str
    priority_score: float
    change_reason: Optional[str] = None
    is_operator_override: bool = False
    created_at: datetime


class ComparativePriorityResult(BaseModel):
    """Demonstration structure proving HIGHEST HAZARD ≠ HIGHEST OPERATIONAL PRIORITY."""

    primary_incident: dict[str, Any]
    comparative_incident: dict[str, Any]
    principle_verified: str = "HAZARD ≠ PRIORITY"
    demonstration_summary: str
    data_classification: str = "DETERMINISTIC DEMONSTRATION DATA"

