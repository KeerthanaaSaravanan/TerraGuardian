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
                dispatched_at=detected_time + timedelta(minutes=10),
                completed_at=detected_time + timedelta(minutes=12),
            ),
        ]
        self.session.add_all(tasks)

        # 4. Add Initial Audit Events
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

        return incident
