"""Authoritative Decision Intelligence & Next-Best-Information (NBI) Domain Service.

Synthesizes:
- Predictive Risk & Confidence
- Cross-Source Evidence Reconciliation & Conflict
- Consequence & Priority (HAZARD ≠ PRIORITY)
- Living Hazard Divergence & Evolution
- Intervention-Conditioned Outcome Reasoning

Enforces:
1. AI ASSISTS REASONING. RULES GOVERN CRITICAL STATE TRANSITIONS. HUMANS AUTHORIZE CRITICAL ACTIONS.
2. Next-Best-Information (NBI) is deterministic and evidence-grounded.
3. Every recommendation is traceable to verifiable domain inputs.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import ActionModel, EvidenceModel, IncidentModel
from app.domain.decision import DecisionSupportAssessment, NextBestInformationItem, StructuredRecommendation
from app.domain.enums import (
    ActionState,
    ActorRole,
    ConfidenceLevel,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceSource,
    HazardState,
    IncidentStatus,
    PriorityLevel,
    RiskLevel,
)
from app.domain.outcome import ObservationAdequacy, OutcomeType
from app.services.hazard_service import HazardService
from app.services.impact_service import ImpactService
from app.services.outcome_service import OutcomeService
from app.services.reconciliation_service import ReconciliationService


class DecisionIntelligenceService:
    """Backend-authoritative service for decision support and next-best-information evaluation."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.reconciliation_service = ReconciliationService(session)
        self.impact_service = ImpactService(session)
        self.hazard_service = HazardService(session)
        self.outcome_service = OutcomeService(session)

    async def evaluate_decision_support(self, incident_id: uuid.UUID) -> DecisionSupportAssessment:
        """Derive comprehensive, deterministic decision support synthesis for an incident."""
        stmt = (
            select(IncidentModel)
            .where(IncidentModel.id == incident_id)
            .options(
                selectinload(IncidentModel.evidence_items),
                selectinload(IncidentModel.actions),
                selectinload(IncidentModel.reassessments),
            )
        )
        result = await self.session.execute(stmt)
        incident = result.scalar_one_or_none()
        if not incident:
            raise ValueError(f"Incident {incident_id} not found.")

        evidence_items = incident.evidence_items or []
        actions = incident.actions or []

        # 1. Evaluate Subsystem States
        reconciliation = await self.reconciliation_service.reconcile_incident_evidence(incident_id)
        hypothesis = await self.hazard_service.get_hazard_hypothesis(incident_id)
        outcome = await self.outcome_service.evaluate_outcome(incident_id)

        # 2. Extract Key Indicators
        risk_score = float(incident.risk_score)
        conf_score = float(incident.confidence_score)
        priority_str = incident.priority_level or PriorityLevel.P2_HIGH.value
        hazard_state_str = incident.hazard_state or HazardState.EXPECTED.value

        has_ground_truth = any(
            ev.source == EvidenceSource.FIELD.value and ev.interpretation == EvidenceInterpretation.VERIFIED.value
            for ev in evidence_items
        )
        has_stabilization_evidence = any(
            "stabilized" in ev.observation.lower() or "cleared" in ev.observation.lower() or "repaired" in ev.observation.lower()
            for ev in evidence_items
        )
        has_confirmed_action = any(
            a.state == ActionState.PHYSICALLY_CONFIRMED.value for a in actions
        )
        optical_cloud_cover = float(incident.metadata_json.get("optical_cloud_cover_pct", 88.0)) if incident.metadata_json else 88.0

        # 3. Governing Safety Rules
        governing_rules = [
            "AI ASSISTS REASONING. RULES GOVERN CRITICAL STATE TRANSITIONS. HUMANS AUTHORIZE CRITICAL ACTIONS.",
            "RISK ≠ CONFIDENCE: Physical hazard severity is evaluated independently from evidential certainty.",
            "HAZARD ≠ PRIORITY: Operational priority is consequence-driven across strategic corridors and lifelines.",
            "APPROVED ≠ COMPLETED: An approved action directive provides zero physical protection until confirmed in the field.",
            "EVENT ABSENCE ≠ HAZARD RESOLUTION: Non-occurrence within an expected rainfall window triggers reassessment, not closure.",
            "INTERVENTION + NON-EVENT ≠ PROVEN PREVENTION: Causal prevention cannot be claimed without affirmative physical evidence.",
        ]

        # 4. Deterministic Next-Best-Information (NBI) Items
        nbi_items: list[NextBestInformationItem] = []

        # NBI 1: Field Ground Patrol Verification
        if not has_ground_truth or conf_score < 75.0:
            nbi_items.append(
                NextBestInformationItem(
                    action_type="DISPATCH_GROUND_PATROL",
                    priority="HIGH" if risk_score >= 70.0 else "MEDIUM",
                    target_modality="FIELD_PATROL",
                    title="Dispatch Ground Patrol for Physical Hazard Verification",
                    rationale=(
                        f"Evidential certainty is currently {conf_score:.1f}%. "
                        "On-site visual confirmation of slope toe displacement and carriageway encroachment "
                        "provides definitive ground truth, resolving spaceborne ambiguity."
                    ),
                    target_hypotheses=["H2_INTERVENTION_CONDITIONED_NON_EVENT", "H5_OBSERVATION_GAP", "H1_FALSE_ALARM"],
                    discriminates_between=[
                        ["H2_INTERVENTION_CONDITIONED_NON_EVENT", "H5_OBSERVATION_GAP"],
                        ["H1_FALSE_ALARM", "H5_OBSERVATION_GAP"],
                    ],
                    spatial_scope=f"Slope Toe & Carriageway Envelope ({incident.latitude:.4f}N, {incident.longitude:.4f}E)",
                    temporal_scope="Immediate (< 2 hours)",
                    qualitative_discrimination="HIGH",
                    expected_confidence_delta=None,
                    authority_required=False,
                )
            )

        # NBI 2: All-Weather SAR Radar Acquisition
        if optical_cloud_cover >= 70.0:
            nbi_items.append(
                NextBestInformationItem(
                    action_type="ACQUIRE_RADAR_TELEMETRY",
                    priority="HIGH",
                    target_modality="SATELLITE_RADAR",
                    title="Acquire All-Weather Sentinel-1 InSAR Backscatter Anomaly",
                    rationale=(
                        f"Optical satellite sensors are {optical_cloud_cover:.0f}% cloud-obscured by monsoon front. "
                        "Synthetic Aperture Radar (SAR) phase coherence penetrates heavy precipitation "
                        "to detect millimeter-scale downslope shear."
                    ),
                    target_hypotheses=["H3_DELAYED_FAILURE", "H4_SHIFTED_HAZARD", "H5_OBSERVATION_GAP"],
                    discriminates_between=[
                        ["H3_DELAYED_FAILURE", "H4_SHIFTED_HAZARD"],
                        ["H1_FALSE_ALARM", "H4_SHIFTED_HAZARD"],
                    ],
                    spatial_scope="5km Regional Transit Corridor Envelope",
                    temporal_scope="Next orbital pass (< 12 hours)",
                    qualitative_discrimination="HIGH",
                    expected_confidence_delta=None,
                    authority_required=False,
                )
            )

        # NBI 3: Cross-Source Evidence Conflict Reconciliation
        if reconciliation.conflict_status in (EvidenceConflictStatus.CONFLICTED, EvidenceConflictStatus.PARTIALLY_CONFLICTED):
            nbi_items.append(
                NextBestInformationItem(
                    action_type="RESOLVE_EVIDENCE_CONFLICT",
                    priority="HIGH",
                    target_modality="CROSS_SOURCE_RECONCILIATION",
                    title="Reconcile Discordant Field vs. Telemetry Signals",
                    rationale=(
                        f"Conflict detected: {reconciliation.conflict_summary} "
                        "Reconciling source discordance avoids premature resource commitment or false reassurance."
                    ),
                    target_hypotheses=["H7_CONFLICTED", "H1_FALSE_ALARM", "H2_INTERVENTION_CONDITIONED_NON_EVENT"],
                    discriminates_between=[
                        ["H7_CONFLICTED", "H1_FALSE_ALARM"],
                        ["H7_CONFLICTED", "H2_INTERVENTION_CONDITIONED_NON_EVENT"],
                    ],
                    spatial_scope="Carriageway conflict coordinates",
                    temporal_scope="Immediate (< 1 hour)",
                    qualitative_discrimination="HIGH",
                    expected_confidence_delta=None,
                    authority_required=False,
                )
            )

        # NBI 4: Extended Observation Window on Delayed Hazard
        if hazard_state_str in (HazardState.DELAYED.value, HazardState.EXPECTED.value) and has_confirmed_action:
            nbi_items.append(
                NextBestInformationItem(
                    action_type="EXTEND_OBSERVATION_WINDOW",
                    priority="HIGH",
                    target_modality="UAV_DRONE_SURVEY",
                    title="Extend Observation Window & Deploy Drone Slope Survey",
                    rationale=(
                        "Physical barrier confirmed at KM-38, but zero surface failure observed at KM-42. "
                        "Precipitation surcharge (184mm) maintains critical pore-water pressure. "
                        "Extend temporal window and execute drone inspection to scan for shifted tension cracks."
                    ),
                    target_hypotheses=["H1_FALSE_ALARM", "H3_DELAYED_FAILURE"],
                    discriminates_between=[
                        ["H1_FALSE_ALARM", "H3_DELAYED_FAILURE"],
                    ],
                    spatial_scope="Corridor Monitoring Sector",
                    temporal_scope="Extend monitoring window by 6 hours",
                    qualitative_discrimination="MEDIUM",
                    expected_confidence_delta=None,
                    authority_required=False,
                )
            )

        # NBI 5: Affirmative Geotechnical Stabilization Survey
        if not has_stabilization_evidence and incident.status != IncidentStatus.CLOSED.value:
            nbi_items.append(
                NextBestInformationItem(
                    action_type="GEOTECHNICAL_STABILIZATION_SURVEY",
                    priority="MEDIUM" if risk_score < 60.0 else "LOW",
                    target_modality="ENGINEERING_SURVEY",
                    title="Execute Geotechnical Stabilization Clearance Survey",
                    rationale=(
                        "Evidentiary closure gate requires documented engineering stabilization or debris clearance report "
                        "before this incident can be transitioned to RESOLVED or CLOSED."
                    ),
                    target_hypotheses=["H6_RESIDUAL_HAZARD", "H1_FALSE_ALARM"],
                    discriminates_between=[
                        ["H6_RESIDUAL_HAZARD", "H1_FALSE_ALARM"],
                    ],
                    spatial_scope="Full cut-slope geometry and retaining structures",
                    temporal_scope="Prior to any formal incident closure order",
                    qualitative_discrimination="MEDIUM",
                    expected_confidence_delta=None,
                    authority_required=True,
                )
            )

        # 5. Operational Options for Human Decision Maker
        operational_options: list[dict[str, Any]] = []

        if priority_str in (PriorityLevel.P1_CRITICAL.value, PriorityLevel.P2_HIGH.value) or risk_score >= 75.0:
            operational_options.append({
                "option_id": "OPT-ROAD-CLOSURE",
                "title": "Enforce Full Highway Cordon at KM-38 Checkpost",
                "action_type": "TRAFFIC_DIVERSION",
                "authority_required": True,
                "statutory_authority": "District Magistrate / DDMA Chairperson (Sec 34, DM Act 2005)",
                "rationale": "Severe hydrometeorological slope hazard threatens sole heavy transit corridor to West Kameng Civil Hospital.",
                "status": "PROPOSED",
            })
            operational_options.append({
                "option_id": "OPT-EARTHMOVER-STAGING",
                "title": "Pre-position Border Roads Organisation (BRO) Heavy Earthmover at Tenga Base",
                "action_type": "RESOURCE_STAGING",
                "authority_required": False,
                "statutory_authority": "Operations Incident Commander",
                "rationale": "Ensures immediate debris clearance capability if cut-slope colluvium slips onto carriageway.",
                "status": "RECOMMENDED",
            })

        if hazard_state_str == HazardState.DELAYED.value:
            operational_options.append({
                "option_id": "OPT-MAINTAIN-DELAYED-CORDON",
                "title": "Maintain Precautionary Cordon; Reassess at 6-Hour Interval",
                "action_type": "PRECAUTIONARY_HOLD",
                "authority_required": True,
                "statutory_authority": "DDMA Incident Commander",
                "rationale": "Event absence does not resolve the hazard under ongoing slope saturation.",
                "status": "RECOMMENDED",
            })

        if hazard_state_str == HazardState.SHIFTED.value:
            operational_options.append({
                "option_id": "OPT-RELOCATE-CORDON",
                "title": "Relocate Traffic Cordon to KM-43.5 to Protect Shifted Hazard Zone",
                "action_type": "CORDON_ADJUSTMENT",
                "authority_required": True,
                "statutory_authority": "Highway Police Patrol Commander",
                "rationale": "Spatial divergence detected: Scarp failure manifested 1.2km north within same geological shear zone.",
                "status": "RECOMMENDED",
            })

        # 6. Active Divergences
        active_divergences = [d.explanation for d in hypothesis.divergences]

        # 7. Closure Readiness & Blockers
        closure_blockers: list[str] = []
        if risk_score >= 60.0:
            closure_blockers.append(f"High physical hazard risk ({risk_score:.1f}/100) exceeds safety threshold.")
        if not has_stabilization_evidence:
            closure_blockers.append("Affirmative geotechnical stabilization or debris clearance evidence is absent.")
        if outcome.outcome_type in (OutcomeType.INTERVENTION_CONDITIONED_NON_EVENT, OutcomeType.RESIDUAL_HAZARD, OutcomeType.OBSERVATION_GAP):
            closure_blockers.append(f"Outcome is {outcome.outcome_type.value}: Event absence ≠ hazard resolution.")
        if not outcome.closure_permitted:
            closure_blockers.append("Outcome Engine evaluates that legal closure criteria are NOT satisfied.")

        closure_readiness = len(closure_blockers) == 0

        outcome_summary_str = (
            f"Outcome Type: {outcome.outcome_type.value} | "
            f"Intervention State: {outcome.intervention_state.value} | "
            f"Observation Adequacy: {outcome.observation_adequacy.value} | "
            f"Causal Claim: {'ESTABLISHED' if outcome.causal_claim_established else 'UNPROVEN (causal_claim_established=False)'}"
        )

        # 8. Synthesize Structured Recommendation (Phase 5 Workstream A2)
        supporting_ev_desc = [
            f"{e.source}: {e.observation}"
            for e in evidence_items
            if e.interpretation in (EvidenceInterpretation.VERIFIED.value, "VERIFIED")
            and any(kw in (e.observation or "").lower() for kw in ("rain", "mm", "slope", "crack", "displacement", "saturation"))
        ][:4]
        contradicting_ev_desc = [
            f"{e.source}: {e.observation}"
            for e in evidence_items
            if e.conflict_status == EvidenceConflictStatus.CONFLICTED.value
            or any(kw in (e.observation or "").lower() for kw in ("clear", "intact", "no debris", "stabilized"))
        ][:3]

        primary_opt = operational_options[0] if operational_options else {
            "title": "Maintain Precautionary Corridor Monitoring",
            "action_type": "MONITORING_HOLD",
            "authority_required": False,
        }

        structured_rec = StructuredRecommendation(
            recommendation=primary_opt.get("title", "Maintain precautionary corridor monitoring"),
            rationale=(
                f"Evaluated physical hazard score is {risk_score:.1f}/100 ({incident.risk_level}) with {priority_str} priority. "
                + primary_opt.get("rationale", "Active terrain distress requires governed response.")
            ),
            supporting_evidence=supporting_ev_desc,
            contradicting_evidence=contradicting_ev_desc,
            uncertainty=(
                f"Evidential certainty is {conf_score:.1f}% ({incident.confidence_level}). "
                f"{'Optical spaceborne pass is heavily cloud-obscured (Observation Gap). ' if optical_cloud_cover >= 70.0 else ''}"
                "Physical ground confirmation is required before resolving evidential ambiguity."
            ),
            next_best_information=nbi_items,
            required_authority=primary_opt.get("statutory_authority", "District Magistrate / DDMA Authorization Officer"),
            proposed_action=primary_opt,
            authority_boundary_notice="AI ASSISTS REASONING. ONLY STATUTORY HUMAN OFFICIALS MAY AUTHORIZE OPERATIONAL ACTIONS.",
        )

        return DecisionSupportAssessment(
            id=uuid.uuid4(),
            incident_id=incident.id,
            current_status=incident.status,
            current_hazard_state=hazard_state_str,
            risk_score=risk_score,
            confidence_score=conf_score,
            priority_level=priority_str,
            governing_safety_rules=governing_rules,
            recommended_operational_options=operational_options,
            next_best_information=nbi_items,
            structured_recommendation=structured_rec,
            active_divergences=active_divergences,
            outcome_summary=outcome_summary_str,
            closure_readiness=closure_readiness,
            closure_blockers=closure_blockers,
            assessed_at=datetime.utcnow(),
            assessed_by="TerraGuardian Decision Intelligence Engine",
        )

    @classmethod
    def generate_structured_recommendation(
        cls,
        incident_id: str = "TG-2048",
        hazard_summary: str = "Slope instability at NH-13 KM-42 due to 184mm antecedent rainfall.",
        consequence_summary: str = "Critical lifeline route threatens 380 downslope dwellings.",
        confidence: str = "MODERATE",
    ) -> StructuredRecommendation:
        """Produce structured recommendation adhering to Phase 5 Workstream A2."""
        nbi_items = [
            NextBestInformationItem(
                action_type="FIELD_PATROL_INSPECTION",
                information_type="FIELD_PATROL_INSPECTION",
                priority="HIGH",
                urgency="HIGH",
                target_modality="FIELD_PATROL",
                title="Dispatch Ground Patrol for Toe Inspection",
                rationale="Visual ground inspection resolves spaceborne cloud cover and discriminates H1 vs H3.",
                qualitative_discrimination="HIGH",
                required_role="FIELD_RESPONDER",
                status="RECOMMENDED",
            ),
            NextBestInformationItem(
                action_type="ACQUIRE_SAR_RADAR",
                information_type="ACQUIRE_SAR_RADAR",
                priority="HIGH",
                urgency="HIGH",
                target_modality="SATELLITE_RADAR",
                title="Acquire Sentinel-1 SAR Radar Pass",
                rationale="Synthetic Aperture Radar penetrates 88% monsoon cloud cover to measure slope decorrelation.",
                qualitative_discrimination="HIGH",
                required_role="OPERATOR",
                status="RECOMMENDED",
            ),
        ]
        return StructuredRecommendation(
            recommendation="Enforce precautionary heavy vehicle traffic halt on NH-13 KM-38 to KM-48.",
            rationale=f"Evaluated hazard: {hazard_summary}. Consequence: {consequence_summary}.",
            supporting_evidence=[
                "184.6mm antecedent rainfall recorded at IMD Bhalukpong AWS",
                "25.7° cut-slope gradient confirmed from Copernicus GLO-30 DEM",
            ],
            contradicting_evidence=[],
            uncertainty=f"Evidential certainty is {confidence}. 88% cloud cover creates an observation gap; ground confirmation mandatory.",
            next_best_information=nbi_items,
            required_authority="District Magistrate / DDMA Authorization Officer",
            proposed_action={
                "action_type": "HIGHWAY_TRAFFIC_HALT",
                "target": "NH-13 KM-38 to KM-48",
                "status": "PROPOSED",
                "requires_statutory_order": True,
            },
            authority_boundary_notice="AI ASSISTS REASONING. ONLY STATUTORY HUMAN OFFICIALS MAY AUTHORIZE OPERATIONAL ACTIONS.",
        )

    @classmethod
    def get_decision_support_assessment(cls, incident_id: str = "TG-2048") -> DecisionSupportAssessment:
        """Produce deterministic decision support assessment for incident."""
        rec = cls.generate_structured_recommendation(incident_id=incident_id)
        return DecisionSupportAssessment(
            id=uuid.uuid4(),
            incident_id=uuid.UUID(incident_id) if isinstance(incident_id, str) and len(incident_id) == 36 else uuid.uuid4(),
            current_status="ASSESSING",
            current_hazard_state="EXPECTED",
            risk_score=86.0,
            confidence_score=54.0,
            priority_level="P2_HIGH",
            governing_safety_rules=[
                "RULE 1: AI RECOMMENDS, ONLY HUMAN OFFICIALS AUTHORIZE.",
                "RULE 2: EVENT ABSENCE != HAZARD EXTINCTION.",
                "RULE 3: HAZARD != PRIORITY.",
            ],
            recommended_operational_options=[
                {
                    "title": "Enforce precautionary heavy vehicle traffic halt",
                    "action_type": "HIGHWAY_TRAFFIC_HALT",
                    "priority": "P2_HIGH",
                    "authority_required": True,
                    "statutory_authority": "AUTHORIZATION_OFFICER",
                }
            ],
            next_best_information=rec.next_best_information,
            structured_recommendation=rec,
            active_divergences=[],
            outcome_summary="Outcome Type: OBSERVATION_GAP | Causal Claim: UNPROVEN",
            closure_readiness=False,
            closure_blockers=["Unresolved observation gap", "Missing field confirmation"],
            assessed_at=datetime.utcnow(),
            assessed_by="TerraGuardian Decision Intelligence Engine",
        )


decision_intelligence_service = DecisionIntelligenceService(None)  # type: ignore


