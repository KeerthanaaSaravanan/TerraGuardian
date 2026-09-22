"""Unit tests for isolated intelligence design contracts.

Verifies instantiation, immutability, and core safety invariants of design contracts.
Zero database dependency, zero network dependency.
"""

from __future__ import annotations

from datetime import datetime
import uuid

from gis.contracts import (
    GeoPointContract,
    IncidentCorridorBoundaryContract,
    SpatialCorridorRelation,
    SpatialObservationRelationContract,
)
from intelligence.agents.contracts import (
    AgentIdentityContract,
    AgentRole,
    AuthorityScope,
)
from intelligence.evidence.contracts import (
    EvidenceObservationContract,
    EvidenceSourceType,
    FreshnessCategory,
    VerificationState,
)
from intelligence.impact.contracts import (
    ConsequenceAssessmentContract,
    ExposureSeverity,
    ImpactDimension,
    LifelineStatus,
)
from intelligence.outcome.contracts import (
    InterventionContextState,
    ObservationAdequacy,
    OutcomeClassification,
    OutcomeInterpretationContract,
)
from intelligence.priority.contracts import (
    OperationalPriorityAssessmentContract,
    OperationalPriorityLevel,
    PriorityDriver,
)
from intelligence.risk.contracts import (
    HazardRiskAssessmentContract,
    RiskFactorContribution,
    RiskLevel,
)
from intelligence.vision.contracts import (
    VisualEvidenceCategory,
    VisualEvidenceMetadataContract,
    VisualEvidenceQuality,
    VisualObservationLocation,
)


def test_risk_contract_construction():
    inc_id = uuid.uuid4()
    assessment = HazardRiskAssessmentContract(
        assessment_id=uuid.uuid4(),
        incident_id=inc_id,
        assessed_at=datetime.utcnow(),
        risk_score=86.4,
        risk_level=RiskLevel.HIGH,
        factor_contributions=[
            RiskFactorContribution(
                factor_name="antecedent_rainfall",
                raw_value=184.6,
                normalized_score=92.0,
                coefficient_weight=0.35,
                contribution_percentage=35.0,
                geotechnical_rationale="Monsoonal saturation exceeds safety threshold",
            )
        ],
    )
    assert assessment.risk_level == RiskLevel.HIGH
    assert assessment.risk_score == 86.4
    assert len(assessment.factor_contributions) == 1


def test_evidence_contract_construction():
    ev = EvidenceObservationContract(
        evidence_id=uuid.uuid4(),
        incident_id=uuid.uuid4(),
        source_type=EvidenceSourceType.FIELD_PATROL,
        source_name="SDRF Patrol Team 4",
        observed_at=datetime.utcnow(),
        received_at=datetime.utcnow(),
        verification_state=VerificationState.OFFICIALLY_VERIFIED,
        freshness=FreshnessCategory.RECENT,
        reliability_weight=0.95,
    )
    assert ev.verification_state == VerificationState.OFFICIALLY_VERIFIED
    assert ev.source_type == EvidenceSourceType.FIELD_PATROL


def test_outcome_contract_causal_claim_invariant():
    outcome = OutcomeInterpretationContract(
        outcome_id=uuid.uuid4(),
        incident_id=uuid.uuid4(),
        evaluated_at=datetime.utcnow(),
        classification=OutcomeClassification.INTERVENTION_CONDITIONED_NON_EVENT,
        intervention_state=InterventionContextState.INTERVENTION_CONFIRMED,
        observation_adequacy=ObservationAdequacy.ADEQUATE,
        causal_claim_established=False,
        closure_permitted=False,
        reassessment_required=True,
    )
    assert outcome.causal_claim_established is False
    assert outcome.closure_permitted is False


def test_agent_contract_non_autonomous_invariant():
    agent = AgentIdentityContract(
        agent_id="agt-watchdog-01",
        role=AgentRole.FIELD_TELEMETRY_WATCHDOG,
        version="1.0.0",
        allowed_tools=["read_telemetry"],
        authority_scope=AuthorityScope.READ_ONLY_OBSERVE,
        is_autonomous_executor=False,
    )
    assert agent.is_autonomous_executor is False
    assert agent.authority_scope == AuthorityScope.READ_ONLY_OBSERVE


def test_gis_contract_corridor_policy():
    corridor = IncidentCorridorBoundaryContract(
        corridor_code="NH-13-KM-42",
        highway_identifier="NH-13",
        start_chainage_km=38.0,
        end_chainage_km=48.0,
        corridor_tolerance_meters=5000.0,
    )
    assert corridor.corridor_tolerance_meters == 5000.0
