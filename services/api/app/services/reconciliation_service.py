"""Deterministic Cross-Source Evidence Reconciliation Service.

Answers: 'What does the current evidence set collectively tell us, and where does it disagree?'
Enforces the core principles:
- RISK ≠ CONFIDENCE
- CONFLICT ≠ FAILURE (Conflict is operational information)
- CITIZEN OBSERVATION enters as UNVERIFIED and cannot self-authorize
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import EvidenceModel, IncidentModel
from app.domain.enums import (
    ActorRole,
    AuditEventType,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceProcessingStatus,
    EvidenceSource,
)
from app.domain.evidence import ReconciliationSummary
from app.services.audit_service import AuditService
from app.services.exceptions import IncidentNotFoundError
from app.services.incident_service import IncidentService


class ReconciliationService:
    """Domain service for multi-source evidence fusion and conflict reconciliation."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.incident_service = IncidentService(session)
        self.audit_service = AuditService(session)

    async def reconcile_incident_evidence(
        self,
        incident_id: uuid.UUID,
        actor_role: ActorRole = ActorRole.SYSTEM_AI,
        actor_name: str = "TerraGuardian Reconciliation Engine",
    ) -> ReconciliationSummary:
        """Perform cross-source evidence reconciliation and conflict detection."""
        incident = await self.incident_service.get_by_id(incident_id)

        # 1. Fetch all evidence items for this incident
        stmt = (
            select(EvidenceModel)
            .where(EvidenceModel.incident_id == incident_id)
            .order_by(EvidenceModel.observed_at.asc())
        )
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())

        if not items:
            summary = ReconciliationSummary(
                incident_id=incident.id,
                total_evidence_count=0,
                source_distribution={},
                verified_count=0,
                unverified_count=0,
                supporting_evidence_ids=[],
                conflicting_evidence_ids=[],
                stale_evidence_ids=[],
                conflict_status=EvidenceConflictStatus.NONE,
                conflict_summary="No evidence items available for reconciliation.",
                dominant_signal="INSUFFICIENT_DATA",
                evidence_quality_score=0.0,
                confidence_contribution_aggregate=0.0,
                recommended_action="GATHER_ADDITIONAL_SENSOR_DATA",
                reconciled_at=datetime.utcnow(),
            )
            return summary

        # 2. Source distribution & verification counts
        source_counts: dict[str, int] = {}
        verified_count = 0
        unverified_count = 0
        supporting_ids: list[uuid.UUID] = []
        conflicting_ids: list[uuid.UUID] = []
        stale_ids: list[uuid.UUID] = []

        has_weather_surge = False
        has_satellite_obscuration = False
        has_field_ground_truth = False
        has_citizen_report = False

        now = datetime.utcnow()
        stale_threshold = now - timedelta(days=7)

        quality_accum = 0.0
        confidence_accum = 0.0

        for item in items:
            src = str(item.source)
            source_counts[src] = source_counts.get(src, 0) + 1

            if item.interpretation == EvidenceInterpretation.VERIFIED.value:
                verified_count += 1
            else:
                unverified_count += 1

            # Check staleness
            if item.observed_at and item.observed_at < stale_threshold:
                stale_ids.append(item.id)

            # Analyze specific domain signals
            if item.source == EvidenceSource.WEATHER.value:
                has_weather_surge = True
                supporting_ids.append(item.id)
            elif item.source == EvidenceSource.TERRAIN.value:
                supporting_ids.append(item.id)
            elif item.source == EvidenceSource.HISTORICAL.value:
                supporting_ids.append(item.id)
            elif item.source == EvidenceSource.FIELD.value:
                has_field_ground_truth = True
                supporting_ids.append(item.id)
                # Field ground truth resolves ambiguity
            elif item.source == EvidenceSource.SATELLITE.value:
                if "cloud" in item.observation.lower() or "obscur" in item.observation.lower() or item.reliability == "MODERATE":
                    has_satellite_obscuration = True
                    conflicting_ids.append(item.id)
                    item.conflict_status = EvidenceConflictStatus.CONFLICTED.value
                    item.conflict_details = "Optical observation obscured by monsoon cloud cover; radar backscatter noisy."
                else:
                    supporting_ids.append(item.id)
            elif item.source == EvidenceSource.CITIZEN.value:
                has_citizen_report = True
                if item.interpretation != EvidenceInterpretation.VERIFIED.value:
                    # Unverified citizen observation remains pending confirmation
                    conflicting_ids.append(item.id)
                    item.conflict_status = EvidenceConflictStatus.PARTIALLY_CONFLICTED.value
                    item.conflict_details = "Citizen ground report received but unverified by official ground patrol."
                else:
                    supporting_ids.append(item.id)

            # Quality scoring
            rel_weight = 1.0 if item.reliability == "HIGH" else (0.7 if item.reliability == "MODERATE" else 0.4)
            ver_weight = 1.0 if item.interpretation == EvidenceInterpretation.VERIFIED.value else 0.6
            quality_accum += rel_weight * ver_weight

            contrib = item.confidence_contribution if item.confidence_contribution is not None else 0.5
            confidence_accum += contrib

            # Update item processing status to RECONCILED
            item.processing_status = EvidenceProcessingStatus.RECONCILED.value

        # 3. Overall Conflict Synthesis
        overall_conflict_status = EvidenceConflictStatus.NONE
        conflict_explanation = "All evidence sources are consistent with active slope destabilization."

        if has_field_ground_truth:
            overall_conflict_status = EvidenceConflictStatus.RESOLVED
            conflict_explanation = "Prior remote sensing ambiguity resolved: Field patrol confirmed physical debris encroachment."
            recommended_action = "PROCEED_TO_CONSEQUENCE_EVALUATION"
            dominant_signal = "CONFIRMED_SLOPE_DEBRIS_ENCROACHMENT"
        elif has_satellite_obscuration and has_weather_surge:
            overall_conflict_status = EvidenceConflictStatus.CONFLICTED
            conflict_explanation = (
                "Extreme precipitation telemetry (>180mm) indicates critical slope saturation, "
                "but optical satellites are cloud-obscured and InSAR backscatter exhibits rain noise. "
                "Physical ground visual is absent."
            )
            recommended_action = "FIELD_VERIFICATION_REQUIRED"
            dominant_signal = "HIGH_PRECIPITATION_SLOPE_SATURATION"
        elif has_citizen_report and not has_field_ground_truth:
            overall_conflict_status = EvidenceConflictStatus.PARTIALLY_CONFLICTED
            conflict_explanation = "Unverified citizen report suggests active debris movement; awaiting official patrol ground confirmation."
            recommended_action = "FIELD_VERIFICATION_REQUIRED"
            dominant_signal = "UNVERIFIED_CITIZEN_OBSERVATION"
        else:
            recommended_action = "CONTINUE_MONITORING"
            dominant_signal = "STEADY_STATE_OBSERVATION"

        total_count = len(items)
        quality_score = min(1.0, max(0.1, round(quality_accum / total_count, 2)))
        agg_confidence = min(1.0, max(0.1, round(confidence_accum / total_count, 2)))

        # If ground truth verified, confidence is significantly enhanced
        if has_field_ground_truth:
            agg_confidence = max(agg_confidence, 0.94)

        await self.session.flush()

        # 4. Append Audit Event for Reconciliation
        await self.audit_service.record_event(
            incident_id=incident.id,
            event_type=AuditEventType.EVIDENCE_RECONCILED,
            actor_role=actor_role,
            actor_name=actor_name,
            reason=f"Evidence reconciled: {total_count} items analyzed. Conflict status: {overall_conflict_status.value}",
            payload={
                "total_items": total_count,
                "conflict_status": overall_conflict_status.value,
                "recommended_action": recommended_action,
                "evidence_quality_score": quality_score,
                "confidence_contribution_aggregate": agg_confidence,
            },
        )

        return ReconciliationSummary(
            incident_id=incident.id,
            total_evidence_count=total_count,
            source_distribution=source_counts,
            verified_count=verified_count,
            unverified_count=unverified_count,
            supporting_evidence_ids=supporting_ids,
            conflicting_evidence_ids=conflicting_ids,
            stale_evidence_ids=stale_ids,
            conflict_status=overall_conflict_status,
            conflict_summary=conflict_explanation,
            dominant_signal=dominant_signal,
            evidence_quality_score=quality_score,
            confidence_contribution_aggregate=agg_confidence,
            recommended_action=recommended_action,
            reconciled_at=datetime.utcnow(),
        )
