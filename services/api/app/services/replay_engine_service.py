"""Deterministic Event Replay Engine for TerraGuardian Demonstration.

GOVERNING PRINCIPLE:
Provides an auditable, step-by-step chronological replay of a high-impact
monsoon landslide crisis along the NH-13 Trans-Arunachal Highway corridor (KM-42 Sessa).
Enables evaluation judges to inspect the progression from baseline -> trigger ->
alert recommendation -> statutory magistrate authorization -> physical confirmation -> clearance.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional


REPLAY_TIMELINE_STEPS = [
    {
        "step_index": 0,
        "step_code": "T0",
        "title": "Baseline Pre-Monsoon Stability",
        "timestamp_offset": "2024-06-20T06:00:00Z",
        "description": "Dry antecedent conditions. Routine civilian traffic on NH-13 corridor. Soil saturation at normal field capacity.",
        "environmental_state": {
            "rainfall_24h_mm": 4.5,
            "antecedent_rainfall_7d_mm": 28.0,
            "soil_saturation_index": 0.32,
            "slope_gradient_deg": 25.65,
            "insar_los_velocity_mm_yr": -2.1,
            "radar_coherence": 0.88,
        },
        "intelligence": {
            "hazard_risk_score": 18.5,
            "hazard_risk_level": "LOW",
            "evidential_confidence_score": 75.0,
            "evidential_confidence_level": "HIGH",
            "warning_level": "NORMAL",
            "operational_priority": "P4",
            "corridor_status": "OPEN_NORMAL",
        },
        "governance": {
            "incident_status": "MONITORING",
            "recommended_action": None,
            "statutory_authorization_state": "NONE_REQUIRED",
            "field_confirmation_state": "ROUTINE_PATROL",
        },
    },
    {
        "step_index": 1,
        "step_code": "T3",
        "title": "Monsoon Rainfall Onset & Infiltration",
        "timestamp_offset": "2024-06-23T14:00:00Z",
        "description": "Continuous convective rainfall starts over West Kameng foothills. Storm accumulation reaches 45mm in 3h.",
        "environmental_state": {
            "rainfall_24h_mm": 45.0,
            "antecedent_rainfall_7d_mm": 72.5,
            "soil_saturation_index": 0.62,
            "slope_gradient_deg": 25.65,
            "insar_los_velocity_mm_yr": -8.4,
            "radar_coherence": 0.74,
        },
        "intelligence": {
            "hazard_risk_score": 42.0,
            "hazard_risk_level": "MODERATE",
            "evidential_confidence_score": 70.0,
            "evidential_confidence_level": "HIGH",
            "warning_level": "WATCH",
            "operational_priority": "P3",
            "corridor_status": "CAUTION_SURFACE_RUNOFF",
        },
        "governance": {
            "incident_status": "ELEVATED_WATCH",
            "recommended_action": "ISSUE_WEATHER_WATCH_BRO_PATROL",
            "statutory_authorization_state": "PENDING_REVIEW",
            "field_confirmation_state": "SURVEILLANCE_ACTIVE",
        },
    },
    {
        "step_index": 2,
        "step_code": "T6",
        "title": "Monsoon Surge & Instability Trigger",
        "timestamp_offset": "2024-06-25T03:30:00Z",
        "description": "Severe monsoon surge: 140mm/24h, ARI-7 index 165.2. Soil mantle reaches 88% saturation. InSAR creep acceleration detected.",
        "environmental_state": {
            "rainfall_24h_mm": 140.0,
            "antecedent_rainfall_7d_mm": 165.2,
            "soil_saturation_index": 0.88,
            "slope_gradient_deg": 25.65,
            "insar_los_velocity_mm_yr": -34.5,
            "radar_coherence": 0.42,
        },
        "intelligence": {
            "hazard_risk_score": 86.4,
            "hazard_risk_level": "CRITICAL",
            "evidential_confidence_score": 62.0,
            "evidential_confidence_level": "MODERATE",
            "warning_level": "SEVERE_WARNING",
            "operational_priority": "P1",
            "corridor_status": "DANGER_CRITICAL_SLOPE",
        },
        "governance": {
            "incident_status": "ACTION_RECOMMENDED",
            "recommended_action": "PROPOSED: PRECAUTIONARY_CLOSURE_NH13_KM42",
            "statutory_authorization_state": "AWAITING_MAGISTRATE_SIGN_OFF",
            "field_confirmation_state": "FIELD_DISPATCH_PROPOSED",
        },
    },
    {
        "step_index": 3,
        "step_code": "T8",
        "title": "Statutory Authority Sign-Off (District Magistrate)",
        "timestamp_offset": "2024-06-25T05:00:00Z",
        "description": "District Magistrate (West Kameng DDMA) verifies multi-modal risk evidence and formally signs statutory closure order DDMA/WK/DIS/2024/07-14.",
        "environmental_state": {
            "rainfall_24h_mm": 155.0,
            "antecedent_rainfall_7d_mm": 178.0,
            "soil_saturation_index": 0.92,
            "slope_gradient_deg": 25.65,
            "insar_los_velocity_mm_yr": -48.0,
            "radar_coherence": 0.38,
        },
        "intelligence": {
            "hazard_risk_score": 88.5,
            "hazard_risk_level": "CRITICAL",
            "evidential_confidence_score": 68.0,
            "evidential_confidence_level": "HIGH",
            "warning_level": "EMERGENCY",
            "operational_priority": "P1",
            "corridor_status": "CLOSED_PRECAUTIONARY",
        },
        "governance": {
            "incident_status": "STATUTORY_ORDER_ACTIVE",
            "recommended_action": "APPROVED: PRECAUTIONARY_CLOSURE_NH13_KM42",
            "statutory_authorization_state": "AUTHORIZED_BY_MAGISTRATE_WEST_KAMENG",
            "field_confirmation_state": "DISPATCHED_TO_BRO_AND_POLICE",
        },
    },
    {
        "step_index": 4,
        "step_code": "T10",
        "title": "Slope Failure & Physical Ground Confirmation",
        "timestamp_offset": "2024-06-25T08:15:00Z",
        "description": "Colluvium slope yields at KM-42.3. 1,200 m3 debris covers both lanes. BRO Project Vartak patrol physically confirms zero casualties due to prior closure.",
        "environmental_state": {
            "rainfall_24h_mm": 162.0,
            "antecedent_rainfall_7d_mm": 182.0,
            "soil_saturation_index": 0.95,
            "slope_gradient_deg": 25.65,
            "insar_los_velocity_mm_yr": -120.0,
            "radar_coherence": 0.18,
        },
        "intelligence": {
            "hazard_risk_score": 92.0,
            "hazard_risk_level": "CRITICAL",
            "evidential_confidence_score": 95.0,
            "evidential_confidence_level": "VERY_HIGH",
            "warning_level": "EMERGENCY",
            "operational_priority": "P1",
            "corridor_status": "SEVERED_PHYSICAL_BLOCKAGE",
        },
        "governance": {
            "incident_status": "INCIDENT_MANIFESTED_CONFIRMED",
            "recommended_action": "IN_PROGRESS: CLEARANCE_AND_CLEARING_OPERATIONS",
            "statutory_authorization_state": "ACTIVE_DISASTER_MANAGEMENT_ACT_2005",
            "field_confirmation_state": "PHYSICALLY_CONFIRMED_BY_BRO_PATROL",
        },
    },
    {
        "step_index": 5,
        "step_code": "T14",
        "title": "Clearance, Drainage Berm & Post-Action Reassessment",
        "timestamp_offset": "2024-06-27T16:00:00Z",
        "description": "Debris cleared by BRO excavators. Catchwater drains cut above scarp. Rainfall ceases. Reassessment bumps version; single-lane convoy opened.",
        "environmental_state": {
            "rainfall_24h_mm": 12.0,
            "antecedent_rainfall_7d_mm": 68.0,
            "soil_saturation_index": 0.48,
            "slope_gradient_deg": 25.65,
            "insar_los_velocity_mm_yr": -5.0,
            "radar_coherence": 0.82,
        },
        "intelligence": {
            "hazard_risk_score": 38.0,
            "hazard_risk_level": "LOW_MODERATE",
            "evidential_confidence_score": 90.0,
            "evidential_confidence_level": "HIGH",
            "warning_level": "ADVISORY",
            "operational_priority": "P3",
            "corridor_status": "OPEN_CONTROLLED_ONE_WAY",
        },
        "governance": {
            "incident_status": "POST_ACTION_REASSESSED",
            "recommended_action": "COMPLETED: CORRIDOR_PARTIAL_RESTORATION",
            "statutory_authorization_state": "CLOSURE_ORDER_RESCINDED",
            "field_confirmation_state": "CLEARANCE_PHYSICALLY_CONFIRMED",
        },
    },
]


class ReplayEngineService:
    """Singleton-style in-memory service maintaining demonstration replay state."""

    _current_step_index: int = 0

    @classmethod
    def get_status(cls) -> dict[str, Any]:
        """Return the current replay state and full timeline catalog."""
        current = REPLAY_TIMELINE_STEPS[cls._current_step_index]
        return {
            "scenario_name": "NH-13 West Kameng July 2024 Monsoon Surge",
            "corridor": "NH-13 Trans-Arunachal Highway (KM-30 Bhalukpong -> KM-60 Tenga)",
            "focal_site": "KM-42 Sessa Hairpin (TG-2048)",
            "current_step_index": cls._current_step_index,
            "total_steps": len(REPLAY_TIMELINE_STEPS),
            "current_step": current,
            "timeline": [
                {
                    "step_index": s["step_index"],
                    "step_code": s["step_code"],
                    "title": s["title"],
                    "timestamp": s["timestamp_offset"],
                    "risk_score": s["intelligence"]["hazard_risk_score"],
                    "warning_level": s["intelligence"]["warning_level"],
                    "operational_priority": s["intelligence"]["operational_priority"],
                    "status": s["governance"]["incident_status"],
                }
                for s in REPLAY_TIMELINE_STEPS
            ],
        }

    @classmethod
    def step_forward(cls) -> dict[str, Any]:
        """Advance replay to next timeline step."""
        if cls._current_step_index < len(REPLAY_TIMELINE_STEPS) - 1:
            cls._current_step_index += 1
        return cls.get_status()

    @classmethod
    def step_backward(cls) -> dict[str, Any]:
        """Step replay backwards to previous step."""
        if cls._current_step_index > 0:
            cls._current_step_index -= 1
        return cls.get_status()

    @classmethod
    def jump_to_step(cls, step_index: int) -> dict[str, Any]:
        """Jump directly to a specific step index (0 to 5)."""
        if 0 <= step_index < len(REPLAY_TIMELINE_STEPS):
            cls._current_step_index = step_index
        return cls.get_status()

    @classmethod
    def reset(cls) -> dict[str, Any]:
        """Reset replay back to T0 baseline."""
        cls._current_step_index = 0
        return cls.get_status()
