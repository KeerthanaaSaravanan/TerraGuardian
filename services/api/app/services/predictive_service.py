"""Authoritative Predictive Intelligence Domain Service.

Coordinates feature extraction, predictive model inference, audit logging,
and persistent twin updates.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import AuditEventModel, IncidentModel
from app.domain.enums import AuditEventType
from app.domain.risk import ModelMetadata, PredictiveRiskAssessment
from app.services.audit_service import AuditService
from app.services.feature_pipeline import FeaturePipeline
from app.services.predictive_models import LandslidePredictiveBaseline


class PredictiveService:
    """Backend-authoritative service for predictive risk and confidence intelligence."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.audit_service = AuditService(session)

    async def assess_incident_risk(
        self,
        incident_id: uuid.UUID,
        actor_role: str = "SYSTEM_AI",
        actor_name: str = "tg-landslide-baseline-v1",
    ) -> PredictiveRiskAssessment:
        """Run predictive intelligence inference and persist updated risk twin."""
        stmt = (
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(selectinload(IncidentModel.evidence_items))
        )
        result = await self.session.execute(stmt)
        incident = result.scalar_one_or_none()

        if not incident:
            raise ValueError(f"Incident {incident_id} not found.")

        # 1. Feature Extraction Pipeline
        feature_vector = FeaturePipeline.extract_features(incident)

        # 2. Predictive Baseline Inference
        inference_result = LandslidePredictiveBaseline.infer(feature_vector)

        # 3. Update Incident Model metrics
        prev_risk_score = incident.risk_score
        prev_confidence_score = incident.confidence_score

        incident.risk_score = inference_result.risk_score
        incident.risk_level = inference_result.risk_level.value
        incident.confidence_score = inference_result.confidence_score
        incident.confidence_level = inference_result.confidence_level.value
        incident.updated_at = datetime.utcnow()

        # 4. Construct Structured Domain Assessment with Complete Lineage
        assessment = PredictiveRiskAssessment(
            id=uuid.uuid4(),
            incident_id=incident.id,
            risk_score=inference_result.risk_score,
            risk_level=inference_result.risk_level,
            confidence_score=inference_result.confidence_score,
            confidence_level=inference_result.confidence_level,
            dominant_risk_factors=inference_result.dominant_risk_factors,
            feature_contributions=inference_result.feature_contributions,
            explanation_narrative=inference_result.explanation_narrative,
            data_quality=feature_vector.data_quality,
            evidence_lineage=feature_vector.evidence_lineage,
            feature_snapshot=feature_vector.feature_snapshot,
            input_evidence_ids=feature_vector.input_evidence_ids,
            feature_schema_version=feature_vector.feature_schema_version,
            model_metadata=ModelMetadata(),
            recommended_operational_action=inference_result.recommended_action,
            assessed_at=datetime.utcnow(),
            assessed_by=actor_name,
        )

        # Update Incident Metadata with Latest Prediction Lineage
        meta = incident.metadata_json or {}
        meta["latest_prediction_id"] = str(assessment.id)
        meta["latest_prediction_model"] = assessment.model_metadata.model_name
        meta["latest_prediction_version"] = assessment.model_metadata.model_version
        meta["latest_prediction_evidence_ids"] = [str(eid) for eid in feature_vector.input_evidence_ids]
        meta["latest_prediction_assessed_at"] = assessment.assessed_at.isoformat()
        incident.metadata_json = meta

        # 5. Append Audit Event with Lineage Snapshot
        await self.audit_service.record_event(
            incident_id=incident.id,
            event_type=AuditEventType.RISK_ASSESSED,
            actor_role=actor_role,
            actor_name=actor_name,
            previous_state=f"Risk:{prev_risk_score} | Conf:{prev_confidence_score}",
            new_state=f"Risk:{inference_result.risk_score} ({inference_result.risk_level.value}) | Conf:{inference_result.confidence_score} ({inference_result.confidence_level.value})",
            reason="Predictive baseline hazard assessment executed over multi-source evidence fabric.",
            payload={
                "prediction_id": str(assessment.id),
                "risk_score": inference_result.risk_score,
                "risk_level": inference_result.risk_level.value,
                "confidence_score": inference_result.confidence_score,
                "confidence_level": inference_result.confidence_level.value,
                "dominant_factors": inference_result.dominant_risk_factors,
                "recommended_action": inference_result.recommended_action,
                "model_version": assessment.model_metadata.model_version,
                "feature_schema_version": assessment.feature_schema_version,
                "input_evidence_ids": [str(eid) for eid in feature_vector.input_evidence_ids],
                "evidence_lineage_count": len(feature_vector.evidence_lineage),
                "feature_snapshot": [fs.model_dump(mode="json") for fs in feature_vector.feature_snapshot],
            },
        )

        await self.session.commit()
        return assessment

    async def get_latest_prediction(self, incident_id: uuid.UUID) -> PredictiveRiskAssessment:
        """Derive or fetch the latest predictive risk assessment for an incident."""
        stmt = (
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(selectinload(IncidentModel.evidence_items))
        )
        result = await self.session.execute(stmt)
        incident = result.scalar_one_or_none()

        if not incident:
            raise ValueError(f"Incident {incident_id} not found.")

        feature_vector = FeaturePipeline.extract_features(incident)
        inference_result = LandslidePredictiveBaseline.infer(feature_vector)

        return PredictiveRiskAssessment(
            id=uuid.uuid4(),
            incident_id=incident.id,
            risk_score=inference_result.risk_score,
            risk_level=inference_result.risk_level,
            confidence_score=inference_result.confidence_score,
            confidence_level=inference_result.confidence_level,
            dominant_risk_factors=inference_result.dominant_risk_factors,
            feature_contributions=inference_result.feature_contributions,
            explanation_narrative=inference_result.explanation_narrative,
            data_quality=feature_vector.data_quality,
            evidence_lineage=feature_vector.evidence_lineage,
            feature_snapshot=feature_vector.feature_snapshot,
            input_evidence_ids=feature_vector.input_evidence_ids,
            feature_schema_version=feature_vector.feature_schema_version,
            model_metadata=ModelMetadata(),
            recommended_operational_action=inference_result.recommended_action,
            assessed_at=datetime.utcnow(),
            assessed_by="tg-landslide-baseline-v1",
        )
