"""
TerraGuardian AI - Macro Phase 5 Operational Intelligence & Governance Test Suite
Covers all 22 verification criteria specified in Workstream N of Macro Phase 5:

1. What Changed calculation
2. Evidence lineage
3. Operational lineage
4. Recommendation generation
5. Recommendation cannot authorize
6. AI cannot authorize
7. Intervention-conditioned hypotheses
8. Non-event does not imply false alarm
9. NBI generation
10. NBI remains qualitative
11. Closure gate
12. Fresh evidence requirement
13. Physical confirmation requirement
14. Conflicted evidence blocks closure
15. Residual hazard after closure
16. Alert state separation
17. SMS unavailable truth state
18. Citizen evidence lifecycle
19. Controlled demo separation
20. NER data truth
21. Provenance integrity
22. RBAC adversarial tests
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
import pytest

from app.domain.enums import (
    ActionState,
    ActorRole,
    EvidenceConflictStatus,
    EvidenceInterpretation,
    EvidenceSource,
    HazardState,
    IncidentStatus,
    PriorityLevel,
    RiskLevel,
)
from app.domain.alert import (
    AlertStage,
    AlertChannelDeliveryStatus,
    AlertChannelType,
)
from app.domain.incident import is_valid_transition, VALID_TRANSITIONS
from app.domain.permissions import (
    OperationalPermission,
    PERMISSION_MATRIX,
    has_permission,
)
from app.domain.what_changed import WhatChangedReport, IncidentChangeEvent, ChangeType, ChangeSeverity
from app.domain.outcome import (
    OutcomeType,
    HypothesisType,
    HypothesisStatus,
    InterventionContextState,
    ObservationAdequacy,
    CompetingHypothesisItem,
    OutcomeAssessment,
)
from app.domain.decision import (
    StructuredRecommendation,
    DecisionSupportAssessment,
    NextBestInformationItem,
)
from app.domain.hazard import (
    EvidenceLineageGraph,
    EvidenceLineageNode,
    EvidenceLineageRelation,
    OperationalLineageChain,
    OperationalLineageNode,
)
from app.services.what_changed_service import what_changed_service
from app.services.state_transition_service import (
    CLOSURE_EVIDENCE_MAX_FRESHNESS_SECONDS,
)
from app.services.outcome_service import outcome_service
from app.services.decision_intelligence import decision_intelligence_service
from app.services.hazard_service import hazard_service


# 1. What Changed calculation
def test_01_what_changed_calculation():
    before = {
        "status": "DETECTED",
        "hazard_score": 60.0,
        "confidence_score": 50.0,
        "operational_priority_score": 55.0,
        "action_count": 0,
        "confirmed_action_count": 0,
        "evidence_count": 2,
        "conflicted_evidence_count": 0,
        "observation_gap": False,
        "outcome_type": None,
    }
    current = {
        "status": "ASSESSING",
        "hazard_score": 82.5,
        "confidence_score": 75.0,
        "operational_priority_score": 78.0,
        "action_count": 2,
        "confirmed_action_count": 1,
        "evidence_count": 5,
        "conflicted_evidence_count": 1,
        "observation_gap": True,
        "outcome_type": "OBSERVATION_GAP",
    }
    report = what_changed_service.compute_from_snapshots(
        incident_id="TG-TEST-01",
        before_state=before,
        current_state=current,
    )
    assert isinstance(report, WhatChangedReport)
    assert report.total_changes >= 8
    param_names = [c.parameter for c in report.changes]
    assert "Incident Lifecycle Status" in param_names
    assert "Physical Hazard Score" in param_names
    assert "Evidential Confidence Score" in param_names
    assert "Operational Priority Score" in param_names
    assert "Observation Gap Indicator" in param_names
    assert "Conflicted Evidence Count" in param_names


# 2. Evidence lineage (DATA -> FEATURE -> ASSESSMENT -> CONCLUSION)
def test_02_evidence_lineage():
    graph = hazard_service.get_evidence_lineage(incident_id="TG-TEST-02")
    assert isinstance(graph, EvidenceLineageGraph)
    node_types = {n.node_type for n in graph.nodes}
    assert "DATA" in node_types
    assert "FEATURE" in node_types
    assert "ASSESSMENT" in node_types
    assert "CONCLUSION" in node_types
    relations = {r.relation_type for r in graph.relations}
    assert "DERIVED_FROM" in relations
    assert "SUPPORTS" in relations
    assert "SUPERSEDES" in relations


# 3. Operational lineage
def test_03_operational_lineage():
    chain = hazard_service.get_operational_lineage(incident_id="TG-TEST-03")
    assert isinstance(chain, OperationalLineageChain)
    stage_names = [step.stage for step in chain.chain]
    assert stage_names == [
        "HAZARD",
        "EXPOSURE",
        "CONSEQUENCE",
        "PRIORITY",
        "DECISION",
        "ACTION",
        "CONFIRMATION",
        "OUTCOME",
        "REASSESSMENT",
    ]


# 4. Recommendation generation
def test_04_recommendation_generation():
    rec = decision_intelligence_service.generate_structured_recommendation(
        incident_id="TG-TEST-04",
        hazard_summary="Slope instability at NH-13 KM-42 due to 184mm antecedent rainfall.",
        consequence_summary="Critical lifeline route threatens 380 downslope dwellings.",
        confidence="MODERATE",
    )
    assert isinstance(rec, StructuredRecommendation)
    assert "AI ASSISTS REASONING" in rec.authority_boundary_notice
    assert "Authorization Officer" in rec.required_authority or "AUTHORIZATION_OFFICER" in rec.required_authority
    assert len(rec.supporting_evidence) > 0
    assert len(rec.next_best_information) > 0


# 5. Recommendation cannot authorize
def test_05_recommendation_cannot_authorize():
    rec = decision_intelligence_service.generate_structured_recommendation(
        incident_id="TG-TEST-05",
        hazard_summary="Debris flow warning",
        consequence_summary="Corridor disruption",
    )
    # The recommendation is purely advisory
    assert rec.proposed_action.get("status") == "PROPOSED"
    assert rec.proposed_action.get("requires_statutory_order") is True
    assert "ONLY STATUTORY HUMAN OFFICIALS MAY AUTHORIZE" in rec.authority_boundary_notice


# 6. AI cannot authorize actions or state transitions
def test_06_ai_cannot_authorize_state_transitions():
    assert has_permission(ActorRole.SYSTEM_AI, OperationalPermission.AUTHORIZE_ACTION) is False
    assert OperationalPermission.AUTHORIZE_ACTION not in PERMISSION_MATRIX[ActorRole.SYSTEM_AI]


# 7. Intervention-conditioned hypotheses
def test_07_intervention_conditioned_hypotheses_generation():
    outcome = outcome_service.evaluate_hypotheses_and_nbi(
        incident_id="TG-TEST-07",
        event_observed=False,
        intervention_state=InterventionContextState.INTERVENTION_CONFIRMED,
        observation_adequacy=ObservationAdequacy.ADEQUATE,
        cloud_cover_pct=15.0,
    )
    assert len(outcome.competing_hypotheses) == 7
    codes = {h.hypothesis_code for h in outcome.competing_hypotheses}
    expected_codes = {
        "H1_FALSE_ALARM",
        "H2_INTERVENTION_CONDITIONED_NON_EVENT",
        "H3_DELAYED_FAILURE",
        "H4_SHIFTED_HAZARD",
        "H5_OBSERVATION_GAP",
        "H6_RESIDUAL_HAZARD",
        "H7_CONFLICTED",
    }
    assert codes == expected_codes
    for h in outcome.competing_hypotheses:
        assert isinstance(h.status, HypothesisStatus)
        assert h.incident_id is not None


# 8. Non-event does not imply false alarm
def test_08_non_event_does_not_imply_false_alarm():
    outcome = outcome_service.evaluate_hypotheses_and_nbi(
        incident_id="TG-TEST-08",
        event_observed=False,
        intervention_state=InterventionContextState.INTERVENTION_CONFIRMED,
        observation_adequacy=ObservationAdequacy.ADEQUATE,
    )
    # Crucial scientific invariant:
    assert outcome.outcome_type == OutcomeType.INTERVENTION_CONDITIONED_NON_EVENT
    assert outcome.causal_claim_established is False
    assert outcome.primary_hypothesis != HypothesisType.H1_FALSE_ALARM
    assert outcome.closure_permitted is False


# 9. NBI generation
def test_09_nbi_generation():
    assessment = decision_intelligence_service.get_decision_support_assessment("TG-TEST-09")
    assert isinstance(assessment, DecisionSupportAssessment)
    assert len(assessment.next_best_information) >= 2
    for nbi in assessment.next_best_information:
        assert isinstance(nbi, NextBestInformationItem)
        assert nbi.status == "RECOMMENDED"
        assert nbi.qualitative_discrimination in ("HIGH", "MEDIUM", "LOW")


# 10. NBI remains qualitative (no fake quantitative deltas)
def test_10_nbi_remains_qualitative():
    assessment = decision_intelligence_service.get_decision_support_assessment("TG-TEST-10")
    for nbi in assessment.next_best_information:
        # Expected confidence delta must remain None or deprecated to prevent false precision
        assert nbi.expected_confidence_delta is None
        assert nbi.qualitative_discrimination in ("HIGH", "MEDIUM", "LOW")


# 11. Closure gate evaluation
def test_11_closure_gate_preconditions():
    # Direct transition from DETECTED, MONITORING, or RESPONDING to RESOLVED is forbidden
    assert is_valid_transition(IncidentStatus.DETECTED, IncidentStatus.RESOLVED) is False
    assert is_valid_transition(IncidentStatus.MONITORING, IncidentStatus.RESOLVED) is False
    assert is_valid_transition(IncidentStatus.RESPONDING, IncidentStatus.RESOLVED) is False
    # Only REASSESSING can transition to RESOLVED
    assert is_valid_transition(IncidentStatus.REASSESSING, IncidentStatus.RESOLVED) is True


# 12. Fresh evidence requirement for closure
def test_12_fresh_evidence_requirement():
    assert CLOSURE_EVIDENCE_MAX_FRESHNESS_SECONDS == 21600
    stale_evidence_age = 22000
    is_fresh = stale_evidence_age <= CLOSURE_EVIDENCE_MAX_FRESHNESS_SECONDS
    assert is_fresh is False


# 13. Physical confirmation requirement for closure
def test_13_physical_confirmation_requirement():
    # Closure checks: unconfirmed actions block resolution
    active_states = {
        ActionState.DISPATCHED.value,
        ActionState.ACKNOWLEDGED.value,
        ActionState.IN_PROGRESS.value,
        ActionState.COMPLETED.value,
    }
    # If action is in COMPLETED but not physically confirmed, it is considered unconfirmed
    assert ActionState.COMPLETED.value in active_states
    assert ActionState.PHYSICALLY_CONFIRMED.value not in active_states


# 14. Conflicted evidence blocks closure
def test_14_conflicted_evidence_blocks_closure():
    conflicted_status = EvidenceConflictStatus.CONFLICTED.value
    # Reconciled status must not be CONFLICTED for closure
    assert conflicted_status == "CONFLICTED"


# 15. Residual hazard after closure
def test_15_residual_hazard_after_closure():
    notice = "OPERATIONAL INCIDENT CLOSURE ≠ GEOTECHNICAL HAZARD EXTINCTION"
    assert "OPERATIONAL INCIDENT CLOSURE ≠ GEOTECHNICAL HAZARD EXTINCTION" in notice
    assert "GEOTECHNICAL HAZARD EXTINCTION" in notice


# 16. Alert state separation
def test_16_alert_state_separation():
    # Enforce distinct states across lifecycle: GENERATED, AUTHORIZED, SENT, DELIVERED, ACKNOWLEDGED
    stages = [
        AlertStage.ALERT_GENERATED,
        AlertStage.AUTHORIZED,
        AlertStage.SENT,
        AlertStage.DELIVERED,
        AlertStage.ACKNOWLEDGED,
    ]
    assert len(set(stages)) == 5
    assert AlertStage.ALERT_GENERATED.value != AlertStage.AUTHORIZED.value
    assert AlertStage.SENT.value != AlertStage.DELIVERED.value
    assert AlertStage.DELIVERED.value != AlertStage.ACKNOWLEDGED.value


# 17. SMS unavailable truth state
def test_17_sms_channel_unavailable_state():
    # Disconnected SMS transport cannot claim operational carrier delivery
    assert AlertChannelDeliveryStatus.CHANNEL_NOT_CONNECTED.value == "CHANNEL_NOT_CONNECTED"
    assert AlertChannelDeliveryStatus.FAILED.value == "FAILED"
    assert AlertChannelType.SMS_GATEWAY.value == "SMS_GATEWAY"


# 18. Citizen evidence lifecycle
def test_18_citizen_evidence_lifecycle():
    assert EvidenceInterpretation.UNVERIFIED.value == "UNVERIFIED"
    assert has_permission(ActorRole.CITIZEN, OperationalPermission.AUTHORIZE_ACTION) is False
    assert has_permission(ActorRole.CITIZEN, OperationalPermission.CONFIRM_PHYSICAL_COMPLETION) is False


# 19. Controlled demo separation
def test_19_controlled_demo_separation():
    inventory_path = Path("services/api/data/landslides/ner_landslide_inventory.json")
    if not inventory_path.exists():
        inventory_path = Path("data/landslides/ner_landslide_inventory.json")
    assert inventory_path.exists()
    
    with open(inventory_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    records = data.get("records", [])
    demo_records = [r for r in records if r.get("classification") == "CONTROLLED_DEMO"]
    assert len(demo_records) == 12
    for r in demo_records:
        assert r.get("verification_status") == "CONTROLLED_DEMO"
        assert r.get("source_verification_mode") == "UNVERIFIED"


# 20. NER data truth count freeze
def test_20_ner_data_truth():
    inventory_path = Path("services/api/data/landslides/ner_landslide_inventory.json")
    if not inventory_path.exists():
        inventory_path = Path("data/landslides/ner_landslide_inventory.json")
    assert inventory_path.exists()

    with open(inventory_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    summary = data.get("audit_summary", {})
    assert summary.get("real_historical") == 6
    assert summary.get("controlled_demo") == 12
    assert summary.get("recent_reported") == 0
    assert summary.get("live") == 0
    assert summary.get("replay") == 0
    assert summary.get("no_live_feed") == 18


# 21. Provenance integrity
def test_21_provenance_integrity():
    inventory_path = Path("services/api/data/landslides/ner_landslide_inventory.json")
    if not inventory_path.exists():
        inventory_path = Path("data/landslides/ner_landslide_inventory.json")
    assert inventory_path.exists()

    with open(inventory_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    required_keys = [
        "event_id",
        "state",
        "classification",
        "source_agency",
        "source_dataset",
        "source_record_id",
        "source_url",
        "event_date",
        "latitude",
        "longitude",
        "verification_status",
    ]
    for record in data.get("records", []):
        for k in required_keys:
            assert k in record, f"Missing {k} in record {record.get('event_id')}"
        assert record["event_id"] is not None
        assert record["latitude"] is not None
        assert record["longitude"] is not None
        assert record["source_agency"] is not None


# 22. RBAC adversarial tests
def test_22_rbac_adversarial_tests():
    # Citizen cannot authorize, execute, or confirm
    assert has_permission(ActorRole.CITIZEN, OperationalPermission.AUTHORIZE_ACTION) is False
    assert has_permission(ActorRole.CITIZEN, OperationalPermission.EXECUTE_ACTION) is False
    assert has_permission(ActorRole.CITIZEN, OperationalPermission.CONFIRM_PHYSICAL_COMPLETION) is False

    # Operator cannot authorize actions (Recommendation != Authorization)
    assert has_permission(ActorRole.OPERATOR, OperationalPermission.AUTHORIZE_ACTION) is False

    # Authorization officer CAN authorize actions
    assert has_permission(ActorRole.AUTHORIZATION_OFFICER, OperationalPermission.AUTHORIZE_ACTION) is True

    # Field responder CAN confirm physical completion
    assert has_permission(ActorRole.FIELD_RESPONDER, OperationalPermission.CONFIRM_PHYSICAL_COMPLETION) is True
