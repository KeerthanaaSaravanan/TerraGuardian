"""Deterministic seed service for TG-2048 demonstration scenario.

Provides an idempotent, resettable seeder creating authoritative domain records
for incident TG-2048 in West Kameng, Arunachal Pradesh.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    ActionModel,
    AlertChannelModel,
    AlertModel,
    AuditEventModel,
    EvidenceModel,
    IncidentModel,
)
from app.domain.enums import (
    ActionState,
    ActorRole,
    AuditEventType,
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


class SeedService:
    """Service to seed and reset deterministic demonstration data."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def seed_tg_2048(self, force_reset: bool = False) -> IncidentModel:
        """Seed or reset the primary deterministic incident TG-2048."""
        stmt = select(IncidentModel).where(IncidentModel.code == "TG-2048")
        result = await self.session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing and not force_reset:
            return existing

        if existing and force_reset:
            await self.session.execute(
                delete(IncidentModel).where(IncidentModel.id == existing.id)
            )
            await self.session.flush()

        # 1. Create Incident Twin TG-2048
        now = datetime.utcnow()
        detected_time = now - timedelta(minutes=45)

        incident = IncidentModel(
            id=uuid.uuid4(),
            code="TG-2048",
            title="NH-13 KM-42 Bhalukpong-Tenga Corridor Slope Debris Flow",
            description="Saturated mica-schist cut-slope above NH-13 trans-highway corridor. Single-point supply cutoff risk for West Kameng and Tawang lifelines.",
            incident_type="landslide",
            status=IncidentStatus.VERIFYING.value,
            hazard_state=HazardState.EXPECTED.value,
            risk_level=RiskLevel.HIGH.value,
            risk_score=86.0,
            confidence_level=ConfidenceLevel.MODERATE.value,
            confidence_score=54.0,
            priority_level=PriorityLevel.P2_HIGH.value,
            priority_score=74.0,
            latitude=27.0842,
            longitude=92.5681,
            location_name="KM-42 Bhalukpong-Tenga Sector",
            corridor_name="NH-13 Trans-Arunachal Highway",
            state="Arunachal Pradesh",
            district="West Kameng",
            detected_at=detected_time,
            updated_at=now,
            is_primary_demo=True,
            is_simulated=True,
            metadata_json={
                "rainfall_peak_rate_mm_hr": 28.4,
                "slope_angle_deg": 44.2,
                "exposed_population": 1420,
                "consequence_priority_score": 89.2,
                "consequence_priority_level": "P1_CRITICAL",
                "consequence_model": "0.25*Hazard + 0.25*Exposure + 0.25*Criticality + 0.15*Connectivity + 0.10*Response",
                "priority_rationale": "Multi-factor consequence ranking for TG-2048 based on single-point supply cutoff risk for West Kameng and Tawang lifelines.",
                "exposure_summary": "West Kameng corridor • Pop exposed: 1420",
                "pending_decision": "Statutory evacuation order & BRO road clearance authorization pending",
                "required_role": "DISTRICT_MAGISTRATE / INCIDENT_COMMANDER",
                "current_assessment": {
                    "assessment_version": 0,
                    "assessed_at": detected_time.isoformat(),
                    "data_class": "CONTROLLED_DEMO",
                    "model_type": "Deterministic Heuristic Baseline",
                    "provenance_class": "CONTROLLED_DEMO",
                    "risk_score": 86.0,
                    "risk_level": "HIGH",
                    "confidence_score": 54.0,
                    "confidence_level": "MODERATE",
                    "slope_degrees": 44.2,
                    "elevation_m": None,
                    "aspect_degrees": None,
                    "rainfall_24h_mm": 64.6,
                    "antecedent_rainfall_7d_mm": 184.6,
                    "dominant_risk_factors": ["Antecedent Rainfall", "Terrain Slope Angle"],
                    "explanation": "Initial scenario assessment driven by synthetic hydrometeorological saturation (184.6mm) on 44.2° cut-slope colluvium.",
                },
                "previous_assessment": None,
                "what_changed": [],
            },
        )
        self.session.add(incident)
        await self.session.flush()

        # 2. Add Multi-Source Evidence Fabric
        evidence_records = [
            EvidenceModel(
                id=uuid.uuid4(),
                incident_id=incident.id,
                source=EvidenceSource.WEATHER.value,
                source_name="IMD-Style Rainfall Observation (Bhalukpong AWS #428)",
                evidence_type="precipitation_measurement",
                observation="Extreme Cumulative Precipitation Exceeded (Demo Fixture)",
                metric="184.6 mm / 24h",
                reliability="HIGH",
                observed_at=detected_time + timedelta(minutes=5),
                received_at=detected_time + timedelta(minutes=7),
                latitude=27.012,
                longitude=92.634,
                provenance="Simulated AWS Telemetry (Demo Fixture)",
                is_simulated=True,
                freshness_seconds=720,
                confidence_contribution=0.88,
                processing_status=EvidenceProcessingStatus.RECONCILED.value,
                interpretation=EvidenceInterpretation.UNVERIFIED.value,
                conflict_status=EvidenceConflictStatus.NONE.value,
                details="Rainfall rate peaked at 28.4 mm/hr. Slope saturation threshold exceeded by 153%.",
                raw_data={
                    "rainfall_mm_24h": 64.6,
                    "antecedent_rainfall_7d_mm": 184.6,
                    "rainfall_peak_rate_mm_hr": 28.4,
                },
            ),
            EvidenceModel(
                id=uuid.uuid4(),
                incident_id=incident.id,
                source=EvidenceSource.SATELLITE.value,
                source_name="Satellite-Derived Observation (Sentinel-2 / Sentinel-1 SAR)",
                evidence_type="sar_backscatter_anomaly",
                observation="Optical Obscured by Cloud; SAR Backscatter Anomaly (Demo Fixture)",
                metric="88% Cloud Cover",
                reliability="MODERATE",
                observed_at=detected_time - timedelta(hours=2),
                received_at=detected_time + timedelta(minutes=8),
                provenance="Copernicus Sentinel Hub (Simulated Feed)",
                is_simulated=True,
                freshness_seconds=10800,
                confidence_contribution=0.45,
                processing_status=EvidenceProcessingStatus.RECONCILED.value,
                interpretation=EvidenceInterpretation.CONFLICTED.value,
                conflict_status=EvidenceConflictStatus.CONFLICTED.value,
                conflict_details="Optical observation obscured by monsoon cloud cover; radar backscatter noisy.",
                details="Monsoon stratus cloud obstruction simulated. SAR backscatter indicates 3.2 dB surface roughness anomaly.",
                raw_data={
                    "cloud_cover_pct": 88.0,
                    "radar_coherence_anomaly": 0.72,
                },
            ),
            EvidenceModel(
                id=uuid.uuid4(),
                incident_id=incident.id,
                source=EvidenceSource.TERRAIN.value,
                source_name="Geological Context (GSI NLSM Geomorphology Baseline)",
                evidence_type="geomorphology_baseline",
                observation="High Hazard Debris Flow Geomorphology (Reference Basemap)",
                metric="Slope Angle: 44.2°",
                reliability="HIGH",
                observed_at=datetime(2024, 1, 1),
                received_at=detected_time,
                latitude=27.084,
                longitude=92.568,
                provenance="GSI National Landslide Susceptibility Mapping (2024 Reference)",
                is_simulated=False,
                confidence_contribution=0.92,
                processing_status=EvidenceProcessingStatus.RECONCILED.value,
                interpretation=EvidenceInterpretation.VERIFIED.value,
                conflict_status=EvidenceConflictStatus.NONE.value,
                details="Highly fractured Daling-Buxa formation mica-schist with deep colluvium overburden.",
                raw_data={
                    "slope_deg": 44.2,
                    "geological_susceptibility": 0.88,
                    "soil_saturation": 0.85,
                },
            ),
            EvidenceModel(
                id=uuid.uuid4(),
                incident_id=incident.id,
                source=EvidenceSource.HISTORICAL.value,
                source_name="Historical Record (BRO Project Vartak Highway Log)",
                evidence_type="culvert_maintenance_log",
                observation="Recurrent Slide Vulnerability at KM-42 (Archived Record)",
                metric="3 Events (2021-2024)",
                reliability="HIGH",
                observed_at=datetime(2023, 7, 15),
                received_at=detected_time,
                provenance="BRO Project Vartak Historical Archive",
                is_simulated=False,
                confidence_contribution=0.90,
                processing_status=EvidenceProcessingStatus.RECONCILED.value,
                interpretation=EvidenceInterpretation.VERIFIED.value,
                conflict_status=EvidenceConflictStatus.NONE.value,
                details="Culvert #42/2 blocked in July 2023 causing road shoulder collapse. Structural toe-wall repair completed Nov 2023.",
                raw_data={
                    "historical_landslide_count": 3,
                },
            ),
        ]
        self.session.add_all(evidence_records)

        # 3. Add Operational Tasks
        tasks = [
            ActionModel(
                id=uuid.uuid4(),
                incident_id=incident.id,
                task_code="TSK-01",
                agency="Border Roads Organisation (TF 14 / 85 RCC)",
                title="Pre-position Heavy Earthmover & JCB at KM-40",
                description="Deploy JCB-3DX and wheel loader to staging point 2km south of slide for immediate clearance once slope stabilizes.",
                state=ActionState.ACKNOWLEDGED.value,
                assigned_to="Major V. Sharma (Officer Commanding)",
                is_action_gap_trigger=False,
                action_type="TRAFFIC_CONTROL",
                priority="P1",
                urgency="IMMEDIATE",
                requires_authorization=True,
                affected_area="NH-13 Bhalukpong-Bomdila Km 38-40",
                rationale="Critical transport corridor on sole strategic lifeline NH-13.",
                prerequisites=["BRO Project Vartak Operational Directive"],
                workflow_type="COORDINATED_DISPATCH",
                dispatch_reference="DSP-TSK01-INIT",
                dispatch_channel="INTERNAL_DISPATCH",
                dispatch_status="DISPATCHED",
                acknowledged_by="Major V. Sharma",
                dispatched_at=detected_time + timedelta(minutes=15),
                acknowledged_at=detected_time + timedelta(minutes=18),
            ),
            ActionModel(
                id=uuid.uuid4(),
                incident_id=incident.id,
                task_code="TSK-02",
                agency="West Kameng Traffic Police (Bhalukpong)",
                title="Establish Physical Roadblock & Heavy Vehicle Diversion at KM-38 Checkpost",
                description="Erect physical barriers. Halt all uphill container and fuel tankers. Inform drivers of alternative holding zone at Bhalukpong ground.",
                state=ActionState.DISPATCHED.value,
                assigned_to="ASI D. Sonam (Bhalukpong Thana)",
                is_action_gap_trigger=True,
                action_type="FIELD_VERIFICATION",
                priority="P1",
                urgency="HIGH",
                requires_authorization=True,
                affected_area="KM-38 Police Checkpost",
                rationale="Prevent passenger vehicles from entering active failure perimeter.",
                prerequisites=["Traffic Police S.O.P."],
                workflow_type="COORDINATED_DISPATCH",
                dispatch_reference="DSP-TSK02-INIT",
                dispatch_channel="INTERNAL_DISPATCH",
                dispatch_status="DISPATCHED",
                dispatched_at=detected_time + timedelta(minutes=15),
            ),
            ActionModel(
                id=uuid.uuid4(),
                incident_id=incident.id,
                task_code="TSK-03",
                agency="Public Works Department (PWD / NHIDCL)",
                title="Inspect Culvert 42/2 Spillway and Downhill Scour",
                description="Clear debris screen to relieve hydrostatic backpressure threatening road shoulder integrity.",
                state=ActionState.IN_PROGRESS.value,
                assigned_to="Junior Engineer K. Deka",
                is_action_gap_trigger=False,
                action_type="MONITORING",
                priority="P2",
                urgency="HIGH",
                requires_authorization=True,
                affected_area="Culvert 42/2 Spillway",
                rationale="Assess drainage blockage exacerbating slope pore-water pressure.",
                prerequisites=[],
                workflow_type="COORDINATED_DISPATCH",
                dispatch_reference="DSP-TSK03-INIT",
                dispatch_channel="INTERNAL_DISPATCH",
                dispatch_status="DISPATCHED",
                acknowledged_by="Junior Engineer K. Deka",
                execution_actor="Junior Engineer K. Deka",
                execution_notes="Field inspection of spillway commenced.",
                dispatched_at=detected_time + timedelta(minutes=20),
                acknowledged_at=detected_time + timedelta(minutes=22),
            ),
            ActionModel(
                id=uuid.uuid4(),
                incident_id=incident.id,
                task_code="TSK-04",
                agency="District Disaster Management Authority (DDMA)",
                title="Broadcast Cell-Broadcast SMS & Siren Warning to Lower Bhalukpong",
                description="Issue precautionary Flash Flood / Slurry Warning to 380 households in downstream alluvial basin.",
                state=ActionState.COMPLETED.value,
                assigned_to="DDMO Control Room",
                is_action_gap_trigger=False,
                action_type="EVACUATION",
                priority="P2",
                urgency="CONDITIONAL",
                requires_authorization=True,
                affected_area="Lower Bhalukpong Alluvial Basin",
                rationale="Precautionary notification to downslope human settlement.",
                prerequisites=["District Magistrate Advisory"],
                workflow_type="COORDINATED_DISPATCH",
                dispatch_reference="DSP-TSK04-INIT",
                dispatch_channel="INTERNAL_DISPATCH",
                dispatch_status="DISPATCHED",
                acknowledged_by="DDMO Duty Officer",
                execution_actor="DDMO Duty Officer",
                execution_notes="Siren broadcast and emergency bulletin completed.",
                dispatched_at=detected_time + timedelta(minutes=10),
                completed_at=detected_time + timedelta(minutes=12),
            ),
        ]
        self.session.add_all(tasks)

        # 4. Add Initial Alert Record
        alert = AlertModel(
            id=uuid.uuid4(),
            incident_id=incident.id,
            alert_code="RED-ALERT-KM42-BCT",
            severity="CRITICAL",
            headline="FLASH RED: Active Slope Debris Flow & Carriageway Severance Threat",
            target_area="NH-13 Corridor KM-38 to KM-46 (Bhalukpong-Tenga Road), West Kameng",
            message="Severe slope failure imminent at KM-42. High risk to NH-13 strategic transport corridor and downstream settlements. Emergency services deployed.",
            stage="ALERT_DELIVERED",
            authorized=True,
            authorized_by="District Magistrate West Kameng",
            authorized_role="AUTHORIZATION_OFFICER",
            authority_order_code="DDMA-WK-884",
            authorized_at=detected_time + timedelta(minutes=14),
            action_required="Immediate complete closure of NH-13 at KM-38 checkpost. Divert all non-emergency traffic via Rupa bypass.",
            is_controlled_demo=True,
            provenance="TERRAGUARDIAN_ALERT_FABRIC",
            generated_at=detected_time + timedelta(minutes=10),
            sent_at=detected_time + timedelta(minutes=14),
            delivered_at=detected_time + timedelta(minutes=15),
        )
        self.session.add(alert)

        alert_channels = [
            AlertChannelModel(
                id=uuid.uuid4(),
                alert_id=alert.id,
                channel_type="CAP",
                channel_name="CAP / SACHET XML Protocol",
                status="DELIVERED",
                latency="1.2s",
                details="[CONTROLLED_DEMO] Standardized OASIS CAP v1.2 feed consumed by simulated emergency portal",
                dispatched_at=detected_time + timedelta(minutes=14),
                delivered_at=detected_time + timedelta(minutes=15),
            ),
            AlertChannelModel(
                id=uuid.uuid4(),
                alert_id=alert.id,
                channel_type="APP_PUSH",
                channel_name="TerraGuardian Safe Mobile PWA Push",
                status="DELIVERED",
                latency="0.8s",
                details="[CONTROLLED_DEMO] Hyper-local geo-fenced broadcast to registered mobile test devices in West Kameng",
                dispatched_at=detected_time + timedelta(minutes=14),
                delivered_at=detected_time + timedelta(minutes=15),
            ),
            AlertChannelModel(
                id=uuid.uuid4(),
                alert_id=alert.id,
                channel_type="VHF",
                channel_name="District Police Wireless VHF Channel 4",
                status="SENT",
                latency="Manual",
                details="[CONTROLLED_DEMO] Operational radio dispatch logged for Bhalukpong & Tenga Police Checkposts",
                dispatched_at=detected_time + timedelta(minutes=14),
            ),
            AlertChannelModel(
                id=uuid.uuid4(),
                alert_id=alert.id,
                channel_type="SMS_GATEWAY",
                channel_name="National Telecom SMS Gateway (C-DOT Cell Broadcast)",
                status="CHANNEL_NOT_CONNECTED",
                latency="N/A",
                details="Carrier SMS SMPP gateway integration awaiting departmental telecom clearance (CHANNEL NOT CONNECTED)",
            ),
        ]
        self.session.add_all(alert_channels)

        # 5. Add Initial Audit Events
        audit_events = [
            AuditEventModel(
                id=uuid.uuid4(),
                incident_id=incident.id,
                event_type=AuditEventType.INCIDENT_CREATED.value,
                actor_role=ActorRole.SYSTEM_AI.value,
                actor_name="TerraGuardian Early Warning Pipeline",
                previous_state=None,
                new_state=IncidentStatus.DETECTED.value,
                reason="Precipitation threshold exceeded 180mm with high slope saturation",
                payload={"rainfall_24h": 184.6, "threshold": 120.0},
                created_at=detected_time,
            ),
            AuditEventModel(
                id=uuid.uuid4(),
                incident_id=incident.id,
                event_type=AuditEventType.STATE_CHANGED.value,
                actor_role=ActorRole.OPERATOR.value,
                actor_name="District Disaster Duty Officer",
                previous_state=IncidentStatus.DETECTED.value,
                new_state=IncidentStatus.VERIFYING.value,
                reason="Multi-source evidence reconciled (Risk HIGH + Confidence MODERATE). Patrol dispatched.",
                payload={"risk_score": 86.0, "confidence_score": 54.0},
                created_at=detected_time + timedelta(minutes=8),
            ),
        ]
        self.session.add_all(audit_events)
        await self.session.flush()

        # 6. Seed Additional Priority Queue Demo Incidents (TG-2105, TG-1944, TG-1082)
        await self._seed_additional_demo_incidents(now)

        return incident

    async def _seed_additional_demo_incidents(self, now: datetime) -> None:
        """Seed additional controlled demo incidents for Priority Queue consequence ranking."""
        additional_incidents = [
            {
                "code": "TG-2105",
                "title": "Mangan-Chungthang Road Blockage Debris",
                "description": "Glacial till with loose granitic scree active failure blocking transit along North Sikkim border axis.",
                "incident_type": "landslide",
                "status": IncidentStatus.RESPONDING.value,
                "hazard_state": HazardState.ACTIVE.value,
                "risk_level": RiskLevel.HIGH.value,
                "risk_score": 78.0,
                "confidence_level": ConfidenceLevel.HIGH.value,
                "confidence_score": 88.0,
                "priority_level": PriorityLevel.P2_HIGH.value,
                "priority_score": 80.0,
                "latitude": 27.562,
                "longitude": 88.614,
                "location_name": "Toong River Flank, Mangan Sector",
                "corridor_name": "North Sikkim Highway",
                "state": "Sikkim",
                "district": "Mangan",
                "is_primary_demo": False,
                "is_simulated": True,
                "metadata_json": {
                    "data_class": "CONTROLLED_DEMO",
                    "provenance_class": "CONTROLLED_DEMO",
                    "exposed_population": 940,
                    "consequence_model": "0.25*Hazard + 0.25*Exposure + 0.25*Criticality + 0.15*Connectivity + 0.10*Response",
                    "priority_rationale": "Glacial till with loose granitic scree active failure blocking transit; machinery en route.",
                    "exposure_summary": "North Sikkim border axis lifeline; heavy transport corridor and hydel project access",
                    "pending_decision": "Debris clearance team dispatch & temporary Bailey bridge engineering inspection",
                    "required_role": "BORDER_ROADS_ORGANISATION / PWD",
                },
            },
            {
                "code": "TG-1944",
                "title": "Dima Hasao Hill Cut Embankment Subsidence",
                "description": "Disang shales with heavy moisture pore pressure and cut-slope subsidence threatening Lumding-Badarpur rail/road link.",
                "incident_type": "landslide",
                "status": IncidentStatus.ASSESSING.value,
                "hazard_state": HazardState.EXPECTED.value,
                "risk_level": RiskLevel.MODERATE.value,
                "risk_score": 61.0,
                "confidence_level": ConfidenceLevel.MODERATE.value,
                "confidence_score": 58.0,
                "priority_level": PriorityLevel.P2_HIGH.value,
                "priority_score": 74.0,
                "latitude": 25.132,
                "longitude": 93.018,
                "location_name": "Jatinga Valley Link KM-74",
                "corridor_name": "Lumding-Badarpur Hill Section",
                "state": "Assam",
                "district": "Dima Hasao",
                "is_primary_demo": False,
                "is_simulated": True,
                "metadata_json": {
                    "data_class": "CONTROLLED_DEMO",
                    "provenance_class": "CONTROLLED_DEMO",
                    "exposed_population": 680,
                    "consequence_model": "0.25*Hazard + 0.25*Exposure + 0.25*Criticality + 0.15*Connectivity + 0.10*Response",
                    "priority_rationale": "Disang shales with heavy moisture pore pressure and cut-slope subsidence threatening trackbed.",
                    "exposure_summary": "Lumding-Badarpur Hill Section rail/road intermodal freight connectivity",
                    "pending_decision": "Geotechnical pore-pressure sensor verification & track foundation inspection",
                    "required_role": "RAILWAY_ENGINEER / GEOTECHNICAL_OFFICER",
                },
            },
            {
                "code": "TG-1082",
                "title": "Champhai Minor Slope Rill Erosion",
                "description": "Superficial topsoil creep on agricultural terrace with zero lifeline blockage.",
                "incident_type": "landslide",
                "status": IncidentStatus.MONITORING.value,
                "hazard_state": HazardState.EXPECTED.value,
                "risk_level": RiskLevel.LOW.value,
                "risk_score": 38.0,
                "confidence_level": ConfidenceLevel.LOW.value,
                "confidence_score": 42.0,
                "priority_level": PriorityLevel.P4_LOW.value,
                "priority_score": 46.5,
                "latitude": 23.475,
                "longitude": 93.328,
                "location_name": "KM-12 Agricultural Terrace Flank",
                "corridor_name": "Champhai-Zokhawthar Border Road",
                "state": "Mizoram",
                "district": "Champhai",
                "is_primary_demo": False,
                "is_simulated": True,
                "metadata_json": {
                    "data_class": "CONTROLLED_DEMO",
                    "provenance_class": "CONTROLLED_DEMO",
                    "exposed_population": 110,
                    "consequence_model": "0.25*Hazard + 0.25*Exposure + 0.25*Criticality + 0.15*Connectivity + 0.10*Response",
                    "priority_rationale": "Superficial terrace creep; rural traffic unaffected, local detour open.",
                    "exposure_summary": "Rural arterial road; local agricultural transit with open alternate village detour",
                    "pending_decision": "Routine weekly drone reconnaissance scheduled",
                    "required_role": "DISTRICT_AGRICULTURE_OFFICER",
                },
            },
        ]

        for item_data in additional_incidents:
            stmt = select(IncidentModel).where(IncidentModel.code == item_data["code"])
            res = await self.session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                inc = IncidentModel(
                    id=uuid.uuid4(),
                    code=item_data["code"],
                    title=item_data["title"],
                    description=item_data["description"],
                    incident_type=item_data["incident_type"],
                    status=item_data["status"],
                    hazard_state=item_data["hazard_state"],
                    risk_level=item_data["risk_level"],
                    risk_score=item_data["risk_score"],
                    confidence_level=item_data["confidence_level"],
                    confidence_score=item_data["confidence_score"],
                    priority_level=item_data["priority_level"],
                    priority_score=item_data["priority_score"],
                    latitude=item_data["latitude"],
                    longitude=item_data["longitude"],
                    location_name=item_data["location_name"],
                    corridor_name=item_data["corridor_name"],
                    state=item_data["state"],
                    district=item_data["district"],
                    detected_at=now - timedelta(hours=2),
                    updated_at=now,
                    is_primary_demo=False,
                    is_simulated=True,
                    metadata_json=item_data["metadata_json"],
                )
                self.session.add(inc)

        await self.session.flush()
