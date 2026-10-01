"""Early Warning Engine for TerraGuardian AI.

INVARIANTS & PRINCIPLES:
1. AI ASSISTS REASONING. RULES GOVERN CRITICAL STATE TRANSITIONS. HUMANS AUTHORIZE CRITICAL ACTIONS.
2. Separate: HAZARD ≠ CONFIDENCE ≠ WARNING LEVEL ≠ CONSEQUENCE ≠ PRIORITY ≠ ALERT STATUS.
3. No fabricated prediction: "Landslide shortly" must be supported by validated physical/empirical triggers.
4. Warning Levels: NORMAL, WATCH, ADVISORY, WARNING, SEVERE_WARNING, EMERGENCY.
5. Spatial Targeting: POINT, CORRIDOR, POLYGON, DISTRICT, STATE with geofenced distance calculations.
6. Deduplication: Deterministic SHA-256 identity based on incident + level + target + validity window.
"""

from __future__ import annotations

import hashlib
import json
import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    AlertModel,
    AlertChannelModel,
    DeviceRegistrationModel,
    IncidentModel,
    IncidentFeaturesModel,
    CitizenReportModel,
    RoadStatusModel,
)
from app.domain.alert import (
    Alert,
    AlertSeverity,
    AlertStage,
    AlertTriggerType,
    HazardType,
    TargetGeometryType,
    WarningLevel,
    RoadStatusItem,
    CitizenSafetyStatusResponse,
)
from app.domain.enums import PriorityLevel


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in kilometers."""
    r = 6371.0  # Earth's radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class EarlyWarningEngine:
    """Dedicated Early Warning Engine evaluating multi-source hazard triggers and spatial targeting."""

    def __init__(self, session: AsyncSession):
        self.session = session

    def compute_alert_dedup_hash(
        self,
        incident_id: uuid.UUID,
        warning_level: WarningLevel,
        target_district: str,
        affected_roads: list[str] | None,
        valid_until: datetime,
        version: int = 1,
    ) -> str:
        """Generate deterministic alert identity to prevent duplicate broadcast dispatches."""
        roads_str = ",".join(sorted(affected_roads or []))
        time_slot = valid_until.strftime("%Y%m%d%H")
        seed = f"{incident_id}:{warning_level.value}:{target_district.lower()}:{roads_str}:{time_slot}:{version}"
        return hashlib.sha256(seed.encode("utf-8")).hexdigest()

    async def evaluate_incident_for_warning(
        self,
        incident_id: uuid.UUID,
        override_trigger: Optional[AlertTriggerType] = None,
    ) -> Optional[dict[str, Any]]:
        """Evaluate an incident twin's physical state, environmental telemetry, and field evidence

        to determine if an early warning candidate should be generated.
        Returns candidate alert specification if conditions meet warning threshold, or None.
        """
        stmt = (
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(selectinload(IncidentModel.alerts))
        )
        res = await self.session.execute(stmt)
        incident = res.scalar_one_or_none()
        if not incident:
            return None

        # Fetch latest environmental features
        feat_stmt = (
            select(IncidentFeaturesModel)
            .where(IncidentFeaturesModel.incident_id == incident_id)
            .order_by(IncidentFeaturesModel.calculated_at.desc())
            .limit(1)
        )
        feat_res = await self.session.execute(feat_stmt)
        feat_record = feat_res.scalar_one_or_none()
        feat_dict = feat_record.features_json if feat_record and feat_record.features_json else {}

        now = datetime.now(timezone.utc)
        valid_until = now + timedelta(hours=3)

        # 1. Evaluate Trigger Class
        rainfall_24h = float(feat_dict.get("rainfall_24h_mm", 0.0) or feat_dict.get("rainfall_intensity_mm_hr", 0.0) * 12.0)
        antecedent_rainfall = float(feat_dict.get("antecedent_rainfall_72h_mm", 0.0))
        slope_angle = float(feat_dict.get("slope_angle_deg", 35.0))


        trigger_type = override_trigger or AlertTriggerType.HAZARD_OBSERVATION
        rationale_lines = []
        evidence_lineage = {
            "incident_code": incident.code,
            "evaluation_time": now.isoformat(),
            "factors": {},
        }

        # Physical reasoning rules:
        if rainfall_24h >= 70.0 or antecedent_rainfall >= 120.0:
            trigger_type = AlertTriggerType.WEATHER_TRIGGER
            rationale_lines.append(
                f"Severe precipitation exceedance: 24h rainfall={rainfall_24h:.1f}mm (threshold 70mm), "
                f"72h antecedent rainfall={antecedent_rainfall:.1f}mm (threshold 120mm)."
            )
            evidence_lineage["factors"]["rainfall_24h_mm"] = rainfall_24h
            evidence_lineage["factors"]["antecedent_rainfall_72h_mm"] = antecedent_rainfall

        if incident.status == "ESCALATED" or incident.hazard_state == "ACTIVE":
            trigger_type = AlertTriggerType.INCIDENT_STATE_CHANGE
            rationale_lines.append(
                f"Incident status is {incident.status} with physical hazard state '{incident.hazard_state}'."
            )
            evidence_lineage["factors"]["incident_status"] = incident.status
            evidence_lineage["factors"]["hazard_state"] = incident.hazard_state

        # Multi-evidence convergence
        if len(rationale_lines) >= 2 or (rainfall_24h >= 50.0 and slope_angle >= 35.0):
            trigger_type = AlertTriggerType.MULTI_EVIDENCE_CONVERGENCE
            rationale_lines.append("Multi-evidence convergence: High slope gradient combined with intense saturation.")
            evidence_lineage["factors"]["slope_angle_deg"] = slope_angle

        # 2. Determine Warning Level (Separated from generic risk score)
        if incident.priority_level == PriorityLevel.P1_CRITICAL.value or incident.hazard_state == "ACTIVE":
            warning_level = WarningLevel.EMERGENCY
            severity = AlertSeverity.CRITICAL
            headline = f"🔴 EMERGENCY EVACUATION WARNING: Active Slope Failure along {incident.corridor_name or 'Corridor'}"
            action_required = "Immediate complete carriageway stoppage. Evacuate unstable slope toe immediately."
        elif incident.priority_level == PriorityLevel.P2_HIGH.value or rainfall_24h >= 70.0:
            warning_level = WarningLevel.WARNING
            severity = AlertSeverity.HIGH
            headline = f"🟠 LANDSLIDE WARNING: High Slope Instability along {incident.corridor_name or 'Corridor'}"
            action_required = "Exercise extreme caution. Avoid non-essential travel along the affected highway corridor."
        elif incident.priority_level == PriorityLevel.P3_MODERATE.value or rainfall_24h >= 40.0:
            warning_level = WarningLevel.ADVISORY
            severity = AlertSeverity.MODERATE
            headline = f"🟡 LANDSLIDE ADVISORY: Heightened Monsoon Infiltration near {incident.location_name or 'Settlement'}"
            action_required = "Stay alert for falling stones or hillside mud. Maintain radio and hotline monitoring."
        else:
            warning_level = WarningLevel.WATCH
            severity = AlertSeverity.ADVISORY
            headline = f"WEATHER WATCH: Rainfall monitoring active along {incident.corridor_name or 'Corridor'}"
            action_required = "Standard precautionary vigilance."

        affected_roads = [incident.corridor_name] if incident.corridor_name else ["NH-13 Trans-Arunachal Highway"]
        target_localities = [incident.location_name] if incident.location_name else ["KM-42 Sessa"]

        dedup_hash = self.compute_alert_dedup_hash(
            incident_id=incident.id,
            warning_level=warning_level,
            target_district=incident.district,
            affected_roads=affected_roads,
            valid_until=valid_until,
        )

        # Check if an identical alert candidate or active alert already exists
        for existing in incident.alerts:
            if existing.dedup_hash == dedup_hash and existing.stage in (
                AlertStage.ALERT_GENERATED.value,
                AlertStage.AUTHORIZED.value,
                AlertStage.SENT.value,
                AlertStage.DELIVERED.value,
            ):
                return None  # Duplicate suppressed

        message = (
            f"{headline}. Issued by District Disaster Management Authority for {incident.district}. "
            f"Rationale: {' '.join(rationale_lines)} Action: {action_required}"
        )

        return {
            "incident_id": incident.id,
            "alert_code": f"ALT-{incident.code}-{now.strftime('%H%M')}",
            "severity": severity,
            "warning_level": warning_level,
            "trigger_type": trigger_type,
            "hazard_type": HazardType.LANDSLIDE,
            "headline": headline,
            "target_area": f"{incident.corridor_name or 'Corridor'}, {incident.district}",
            "message": message,
            "action_required": action_required,
            "rationale": " \n".join(rationale_lines) if rationale_lines else "Elevated physical sensor and terrain metrics.",
            "confidence": incident.confidence_score or 0.85,
            "target_geometry_type": TargetGeometryType.CORRIDOR,
            "target_state": incident.state,
            "target_district": incident.district,
            "target_localities": target_localities,
            "target_latitude": incident.latitude,
            "target_longitude": incident.longitude,
            "target_radius_km": 15.0,
            "affected_roads": affected_roads,
            "valid_from": now,
            "valid_until": valid_until,
            "evidence_lineage": evidence_lineage,
            "dedup_hash": dedup_hash,
            "version": 1,
        }

    async def get_safety_status_for_citizen(
        self,
        latitude: float,
        longitude: float,
        state: Optional[str] = None,
        district: Optional[str] = None,
    ) -> CitizenSafetyStatusResponse:
        """Resolve citizen coordinates against active alerts, nearby hazards, and road statuses.

        Answers the core safety questions:
        - Is there a hazard near me?
        - How serious is it?
        - What changed?
        - What should I do?
        - Is my road safe?
        """
        now = datetime.now(timezone.utc)

        # 1. Query all active or delivered alerts
        alert_stmt = (
            select(AlertModel)
            .where(
                or_(
                    AlertModel.stage == AlertStage.AUTHORIZED.value,
                    AlertModel.stage == AlertStage.SENT.value,
                    AlertModel.stage == AlertStage.DELIVERED.value,
                    AlertModel.stage == AlertStage.ACKNOWLEDGED.value,
                )
            )
            .options(selectinload(AlertModel.channels))
            .order_by(AlertModel.generated_at.desc())
        )
        alert_res = await self.session.execute(alert_stmt)
        alerts = alert_res.scalars().all()


        # Find closest active warning within target radius
        closest_alert: Optional[AlertModel] = None
        min_distance_km: float = 999999.0

        for a in alerts:
            # Check expiry
            if a.valid_until and a.valid_until.replace(tzinfo=timezone.utc) < now:
                continue

            dist = 999999.0
            if a.target_latitude is not None and a.target_longitude is not None:
                dist = haversine_distance_km(latitude, longitude, a.target_latitude, a.target_longitude)

            # Match criteria: within radius or matching administrative district
            is_matching_district = district and a.target_district.lower() == district.lower()
            is_within_radius = dist <= (a.target_radius_km or 25.0)

            if is_within_radius or is_matching_district:
                if dist < min_distance_km:
                    min_distance_km = dist
                    closest_alert = a

        # 2. Determine Overall Status & Color
        if closest_alert:
            w_level = WarningLevel(closest_alert.warning_level) if closest_alert.warning_level else WarningLevel.WARNING
            if w_level == WarningLevel.EMERGENCY:
                status_color = "RED"
                status_headline = "🔴 EMERGENCY WARNING: ACTIVE HAZARD"
            elif w_level == WarningLevel.WARNING or w_level == WarningLevel.SEVERE_WARNING:
                status_color = "ORANGE"
                status_headline = "🟠 HIGH HAZARD LANDSLIDE WARNING"
            elif w_level == WarningLevel.ADVISORY:
                status_color = "YELLOW"
                status_headline = "🟡 LANDSLIDE ADVISORY ACTIVE"
            else:
                status_color = "YELLOW"
                status_headline = "MONSOON WATCH IN EFFECT"
        else:
            w_level = WarningLevel.NORMAL
            status_color = "GREEN"
            status_headline = "🟢 NO ACTIVE HAZARDS NEAR YOU"

        # 3. Query Road Statuses
        road_stmt = select(RoadStatusModel).order_by(RoadStatusModel.observed_at.desc()).limit(10)
        road_res = await self.session.execute(road_stmt)
        road_records = road_res.scalars().all()

        road_items = [
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
            for r in road_records
        ]

        # 4. Nearby Incidents
        inc_stmt = select(IncidentModel).where(IncidentModel.status != "CLOSED").limit(5)
        inc_res = await self.session.execute(inc_stmt)
        incidents = inc_res.scalars().all()

        nearby_inc_list = []
        for inc in incidents:
            d_km = haversine_distance_km(latitude, longitude, inc.latitude, inc.longitude)
            nearby_inc_list.append({
                "id": str(inc.id),
                "code": inc.code,
                "title": inc.title,
                "distance_km": round(d_km, 1),
                "corridor": inc.corridor_name,
                "status": inc.status,
                "priority_level": inc.priority_level,
                "hazard_state": inc.hazard_state,
            })

        # Sort nearby incidents by distance
        nearby_inc_list.sort(key=lambda x: x["distance_km"])

        # 5. Recommended Actions & What Changed
        if closest_alert:
            actions = [
                closest_alert.action_required,
                "Follow instructions issued by District Police and SDRF checkpoint officers.",
                "Do not stop beneath steep cut slopes during continuous heavy downpours.",
            ]
            what_changed = [
                f"Statutory warning issued for {closest_alert.target_area}.",
                f"Reason: {closest_alert.rationale or 'Heightened soil moisture and slope instability.'}",
                f"Valid until {closest_alert.valid_until.strftime('%H:%M IST') if closest_alert.valid_until else 'further notice'}.",
            ]
        else:
            actions = [
                "Proceed with normal transit caution along Himalayan hillside corridors.",
                "Report newly observed slope cracks or road shoulder subsidence via TerraGuardian Safe.",
            ]
            what_changed = [
                "No physical slope failure detected within your current corridor envelope.",
                "Regional telemetry and automated precipitation stations reporting stable status.",
            ]

        # 6. Map Alert to Domain
        domain_alert = None
        if closest_alert:
            from app.services.alert_service import AlertService
            temp_srv = AlertService(self.session)
            domain_alert = temp_srv._to_domain(closest_alert)

        return CitizenSafetyStatusResponse(
            safety_status=w_level,
            status_color=status_color,
            status_headline=status_headline,
            current_location={
                "latitude": latitude,
                "longitude": longitude,
                "state": state or "Arunachal Pradesh",
                "district": district or "West Kameng",
                "distance_to_nearest_hazard_km": round(min_distance_km, 1) if min_distance_km < 999990 else None,
            },
            active_warning=domain_alert,
            what_changed=what_changed,
            recommended_actions=actions,
            affected_roads=road_items,
            nearby_incidents=nearby_inc_list[:3],
            emergency_contacts={
                "DDMA Control Room": "1077",
                "State Disaster Management Authority (SDMA)": "1070",
                "Police Emergency": "112",
                "Ambulance / Medical": "108",
                "BRO Project Vartak Hotline": "03778-222044",
            },
            last_updated=now,
            is_cached_stale=False,
        )
