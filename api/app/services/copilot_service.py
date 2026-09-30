"""Authoritative Operational Copilot Engine (Signature Capability #1).

Provides an auditable, bounded, command-driven dialogue and action layer for incident commanders.
Adheres to strict invariants:
1. FINITE CAPABILITY REGISTRY: Supported intents only; unsupported intents reject cleanly.
2. READ-ONLY ADVISORY: Statutory decisions require human-in-the-loop authorization.
3. VISIBLE INTERPRETATION: Every command yields a deterministic structured interpretation.
4. GROUNDED EVIDENCE: Answers reference concrete telemetry, consequence models, and field states.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CopilotAction(BaseModel):
    type: str  # NAVIGATE, FILTER_MAP, OPEN_INCIDENT, SET_FILTER, EXPLAIN
    target_view: Optional[str] = None
    incident_code: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class CopilotQueryRequest(BaseModel):
    query: str
    current_incident_code: Optional[str] = "TG-2048"
    current_view: Optional[str] = "situational-overview"
    context: Dict[str, Any] = Field(default_factory=dict)


class CopilotQueryResponse(BaseModel):
    query: str
    intent: str
    intent_name: str
    interpreted_as: str
    is_statutory: bool = False
    statutory_guardrail_triggered: bool = False
    parameters: Dict[str, Any] = Field(default_factory=dict)
    action: Optional[CopilotAction] = None
    answer: str
    evidence_sources: List[str] = Field(default_factory=list)
    confidence: float = 0.95
    suggested_next_commands: List[str] = Field(default_factory=list)


SUPPORTED_CAPABILITIES = [
    "OPEN_INCIDENT (e.g. 'Open TG-2048')",
    "GET_PRIORITY_REASON (e.g. 'Why is TG-2048 P1?')",
    "GET_WHAT_CHANGED (e.g. 'What changed since last assessment?')",
    "OPEN_EVIDENCE (e.g. 'Show evidence convergence for TG-2048')",
    "GET_FIELD_STATUS (e.g. 'What is SDRF field status?')",
    "GET_MISSING_INFORMATION (e.g. 'What is missing before intervention?')",
    "GET_NBI (e.g. 'Explain NBI for TG-2048' — Next Best Information)",
    "OPEN_TIMELINE (e.g. 'Show incident replay')",
    "FILTER_MAP (e.g. 'Filter map to Arunachal Pradesh')",
    "FILTER_INCIDENTS (e.g. 'Show all P1 incidents', 'Show Priority Queue')",
    "GET_ALERT_STATUS (e.g. 'Are alerts published for TG-2048?')",
]


class OperationalCopilotService:
    """Evaluates commander queries and generates auditable operational interpretations."""

    def evaluate_query(self, req: CopilotQueryRequest) -> CopilotQueryResponse:
        q = req.query.strip()
        q_lower = q.lower()

        # 1. Statutory Guardrail Check (Absolute safety rule)
        statutory_keywords = [
            "authorize", "authorise", "execute evacuation", "close incident",
            "approve evacuation", "sign order", "override risk", "dispatch order"
        ]
        if any(kw in q_lower for kw in statutory_keywords) and not ("why" in q_lower or "explain" in q_lower or "status" in q_lower):
            inc_code = self._extract_incident_code(q, req.current_incident_code)
            return CopilotQueryResponse(
                query=q,
                intent="STATUTORY_GUARDRAIL_BLOCKED",
                intent_name="Statutory Action Guardrail",
                interpreted_as=f"BLOCKED_STATUTORY_INTENT(query='{q}', incident='{inc_code}')",
                is_statutory=True,
                statutory_guardrail_triggered=True,
                parameters={"incident_code": inc_code, "action": "STATUTORY_AUTHORIZATION"},
                action=CopilotAction(
                    type="NAVIGATE",
                    target_view="incident-twin",
                    incident_code=inc_code,
                    payload={"tab": "action-execution"}
                ),
                answer=(
                    "STATUTORY GOVERNANCE GUARDRAIL: Critical actions require authorized human decision-making "
                    "under the applicable disaster-management authority framework (Disaster Management Act, 2005 — Section 34). "
                    "Operational Copilot is strictly read-only and advisory. Navigate to Incident Twin -> Action Execution to review and sign."
                ),
                evidence_sources=[
                    "TerraGuardian Statutory Governance Framework v1.0",
                    "Disaster Management Act, 2005 — Section 34"
                ],
                confidence=1.0,
                suggested_next_commands=[
                    f"Why is {inc_code} P1?",
                    f"Explain NBI for {inc_code}",
                    "What is missing before intervention?"
                ]
            )

        # 2. Priority Reason Intent
        if any(kw in q_lower for kw in ["why is tg-", "why is", "priority reason", "priority rationale", "p1 reason", "consequence reason"]):
            inc_code = self._extract_incident_code(q, req.current_incident_code)
            return CopilotQueryResponse(
                query=q,
                intent="GET_PRIORITY_REASON",
                intent_name="Explain Priority Rationale",
                interpreted_as=f"GET_PRIORITY_REASON(incident_code='{inc_code}')",
                parameters={"incident_code": inc_code},
                action=CopilotAction(
                    type="NAVIGATE",
                    target_view="priority-queue",
                    incident_code=inc_code,
                    payload={"highlight": inc_code}
                ),
                answer=(
                    f"TG-2048 is ranked P1_CRITICAL (Priority Score: 89.2) under the Consequence Model [CONTROLLED DEMONSTRATION].\n"
                    f"Formula: 0.25 * Hazard (86.0) + 0.25 * Exposure (85.2) + 0.25 * Criticality (95.0) + "
                    f"0.15 * Connectivity (98.0) + 0.10 * Response Difficulty (80.0).\n"
                    f"Key driver: NH-13 KM-42 is a sole-artery lifeline for West Kameng and Tawang border supply. "
                    f"Severance cuts access to District Hospital Bomdila with no paved bypass available."
                ),
                evidence_sources=[
                    "Deterministic Consequence & Lifeline Impact Engine v1.0",
                    "BRO Infrastructure Map NH-13 KM-42 (Controlled Scenario)",
                    "Census 2011 / West Kameng Vulnerability Grid"
                ],
                confidence=0.98,
                suggested_next_commands=[
                    f"Show evidence convergence for {inc_code}",
                    f"Explain NBI for {inc_code}",
                    "What is missing before intervention?"
                ]
            )

        # 3. What Changed Intent
        if any(kw in q_lower for kw in ["what changed", "diff", "delta", "assessment history", "reassessment delta"]):
            inc_code = self._extract_incident_code(q, req.current_incident_code)
            return CopilotQueryResponse(
                query=q,
                intent="GET_WHAT_CHANGED",
                intent_name="Telemetry & Assessment Delta",
                interpreted_as=f"GET_WHAT_CHANGED(incident_code='{inc_code}')",
                parameters={"incident_code": inc_code},
                action=CopilotAction(
                    type="NAVIGATE",
                    target_view="incident-twin",
                    incident_code=inc_code,
                    payload={"section": "what-changed"}
                ),
                answer=(
                    f"Scenario assessment delta for {inc_code} between Version 0 (Baseline) and Version 1 (Reassessment) [CONTROLLED DEMONSTRATION]:\n"
                    f"• Rainfall: 64.6mm -> 78.4mm (+13.8mm, active convective band scenario)\n"
                    f"• Hazard Risk: 86.0 -> 91.4 (+5.4, threshold breach)\n"
                    f"• Scenario Field Evidence: SDRF Team Alpha submitted geo-tagged visual confirming 45m tension crack with active mud slurry.\n"
                    f"• Confidence: 54.0% (MODERATE) -> 82.5% (HIGH) driven by multi-pathway ground convergence."
                ),
                evidence_sources=[
                    "Scenario Weather Station Feed AWS-Tenga",
                    "SDRF Team Alpha Field Handheld #12 (Scenario)",
                    "Copernicus DEM Slope Colluvium Layer"
                ],
                confidence=0.96,
                suggested_next_commands=[
                    f"Show evidence convergence for {inc_code}",
                    "What is SDRF field status?",
                    "Show incident replay"
                ]
            )

        # 4. Evidence Convergence Intent
        if any(kw in q_lower for kw in ["evidence", "convergence", "why do we believe", "sensors", "ground visual"]):
            inc_code = self._extract_incident_code(q, req.current_incident_code)
            return CopilotQueryResponse(
                query=q,
                intent="OPEN_EVIDENCE",
                intent_name="Evidence Convergence & Reconciliation",
                interpreted_as=f"OPEN_EVIDENCE(incident_code='{inc_code}', mode='CONVERGENCE')",
                parameters={"incident_code": inc_code, "mode": "CONVERGENCE"},
                action=CopilotAction(
                    type="NAVIGATE",
                    target_view="evidence-reconciliation",
                    incident_code=inc_code,
                    payload={"focus": "convergence-panel"}
                ),
                answer=(
                    f"Evidence Convergence for {inc_code} [CONTROLLED DEMONSTRATION] is reconciled across 4 pathways:\n"
                    f"1. Dynamic Hazard: Scenario rainfall 184.6mm cumulative, 8.4mm/hr convective rate (HIGH scenario reliability)\n"
                    f"2. Static Susceptibility: Copernicus 30m DEM slope 44.2° colluvium mica-schist (HIGH topographical reliability)\n"
                    f"3. Scenario Field Evidence: SDRF Team Alpha geo-tagged image showing 45m slope crack (CONFIRMED in scenario)\n"
                    f"4. Citizen Intelligence: Unverified Safe PWA report from Bhalukpong Checkpost (PENDING operator review)\n"
                    f"Evidence Trust Status: Convergent across remote sensing and scenario field observation [CONTROLLED_DEMO]."
                ),
                evidence_sources=[
                    "Demonstration Precipitation Model",
                    "Copernicus 30m Global DEM",
                    "SDRF Reconnaissance Visual EV-003 (Scenario)",
                    "Citizen Safe Report CR-2048-01 (Unverified)"
                ],
                confidence=0.97,
                suggested_next_commands=[
                    "What is missing before intervention?",
                    f"Explain NBI for {inc_code}",
                    "What is SDRF field status?"
                ]
            )

        # 5. Missing Information Intent
        if any(kw in q_lower for kw in ["missing", "unknown", "gap", "uncertainty", "before intervention"]):
            inc_code = self._extract_incident_code(q, req.current_incident_code)
            return CopilotQueryResponse(
                query=q,
                intent="GET_MISSING_INFORMATION",
                intent_name="Identify Information Gaps",
                interpreted_as=f"GET_MISSING_INFORMATION(incident_code='{inc_code}')",
                parameters={"incident_code": inc_code},
                action=CopilotAction(
                    type="NAVIGATE",
                    target_view="incident-twin",
                    incident_code=inc_code,
                    payload={"section": "evidence-gaps"}
                ),
                answer=(
                    f"Operational Information Gaps for {inc_code} [CONTROLLED DEMONSTRATION]:\n"
                    f"• Subsurface Hydrology: Borehole piezometer pore-water pressure telemetry UNKNOWN (sensor offline at KM-41).\n"
                    f"• Downslope Habitation: Exact occupancy of 8 seasonal roadside shops unconfirmed (survey team in transit).\n"
                    f"• Bypass Feasibility: Khellong unpaved bridle track clearance verified for light 4x4s only; heavy transport blocked."
                ),
                evidence_sources=[
                    "Evidence Reconciliation Gaps Matrix",
                    "SDRF Unit SitRep #02 (Scenario)",
                    "Sub-basin Hydrology Gauge Status"
                ],
                confidence=0.92,
                suggested_next_commands=[
                    f"Show evidence convergence for {inc_code}",
                    "What is SDRF field status?",
                    f"Explain NBI for {inc_code}"
                ]
            )

        # 6. Next Best Information (NBI) Intent
        if any(kw in q_lower for kw in ["nbi", "next best information", "missing information", "uncertainty reduction", "information to collect"]):
            inc_code = self._extract_incident_code(q, req.current_incident_code)
            return CopilotQueryResponse(
                query=q,
                intent="GET_NBI",
                intent_name="Explain Next Best Information (NBI)",
                interpreted_as=f"GET_NEXT_BEST_INFORMATION(incident_code='{inc_code}')",
                parameters={"incident_code": inc_code},
                action=CopilotAction(
                    type="NAVIGATE",
                    target_view="incident-twin",
                    incident_code=inc_code,
                    payload={"section": "nbi-recommendations"}
                ),
                answer=(
                    f"Next Best Information (NBI) Recommendations for {inc_code}:\n"
                    f"1. Current Critical Uncertainty: Subsurface pore-water pressure and slip plane depth at KM-42 are unobserved.\n"
                    f"2. Missing Information: Geotechnical piezometer telemetry (KM-41 offline) and physical crack displacement rate.\n"
                    f"3. Why It Matters: Discriminates between active deep-seated failure vs shallow surficial sloughing.\n"
                    f"4. Next Information to Collect: On-site geotechnical slope survey & handheld extensometer pin readings.\n"
                    f"5. Collection Method: Dispatch SDRF/PWD technical patrol with geo-tagged photographic evidence.\n"
                    f"6. Supported Decision: Decides whether to maintain precautionary traffic suspension or permit controlled single-lane transit."
                ),
                evidence_sources=[
                    "Hypothesis-Separating NBI Engine (outcome_service.py)",
                    "Evidence Reconciliation Gaps Matrix",
                    "Disaster Management Act, 2005 — Section 34 Operational Protocol"
                ],
                confidence=0.95,
                suggested_next_commands=[
                    f"Show evidence convergence for {inc_code}",
                    "What is SDRF field status?",
                    "What changed since last assessment?"
                ]
            )

        # 7. Field Status Intent
        if any(kw in q_lower for kw in ["sdrf", "field status", "team status", "bro status", "deployed"]):
            inc_code = self._extract_incident_code(q, req.current_incident_code)
            return CopilotQueryResponse(
                query=q,
                intent="GET_FIELD_STATUS",
                intent_name="Field Operations & Responder Status",
                interpreted_as=f"GET_FIELD_STATUS(incident_code='{inc_code}')",
                parameters={"incident_code": inc_code},
                action=CopilotAction(
                    type="NAVIGATE",
                    target_view="field-operations",
                    incident_code=inc_code,
                    payload={"team": "SDRF_ALPHA"}
                ),
                answer=(
                    f"Field Operations Status for {inc_code} [CONTROLLED DEMONSTRATION]:\n"
                    f"• SDRF Team Alpha: On-site at KM-42 (Station Chief: Insp. Tashi Norbu). Cordon established in scenario.\n"
                    f"• BRO Task Force 14: Heavy wheel loader staged at Bhalukpong Depot (ETA 22 mins on call).\n"
                    f"• Scenario Observation: Soil moisture saturation high; minor rill slumping ongoing at upper scarp.\n"
                    f"• Communication: VHF Channel 4 active; SATPHONE redundancy verified."
                ),
                evidence_sources=[
                    "Field Response Coordination Engine (Scenario)",
                    "SDRF Alpha Handheld Dispatch Channel",
                    "BRO Project Vartak Status Board"
                ],
                confidence=0.96,
                suggested_next_commands=[
                    "What changed since last assessment?",
                    "Show incident replay",
                    "Are alerts published for TG-2048?"
                ]
            )

        # 8. Incident Replay / Timeline Intent
        if any(kw in q_lower for kw in ["replay", "timeline", "audit trail", "chronology", "operational memory"]):
            inc_code = self._extract_incident_code(q, req.current_incident_code)
            return CopilotQueryResponse(
                query=q,
                intent="OPEN_TIMELINE",
                intent_name="Incident Replay & Operational Memory",
                interpreted_as=f"OPEN_TIMELINE(incident_code='{inc_code}')",
                parameters={"incident_code": inc_code},
                action=CopilotAction(
                    type="NAVIGATE",
                    target_view="review-workspace",
                    incident_code=inc_code,
                    payload={"replay_state": "ACTIVE"}
                ),
                answer=(
                    f"Opening interactive Incident Replay and Operational Memory for {inc_code}.\n"
                    f"Replay spans 10 lifecycle milestones: Trigger -> Assessment -> Incident Creation -> "
                    f"Priority Ranking -> Recommendation -> Statutory Review -> Dispatch -> Confirmation -> Outcome -> Reassessment."
                ),
                evidence_sources=["Incident Audit Log", "Lifecycle Event Stream"],
                confidence=0.99,
                suggested_next_commands=[
                    f"Why is {inc_code} P1?",
                    "What changed since last assessment?",
                    "Show Priority Queue"
                ]
            )

        # 9. Filter Map Intent
        if any(kw in q_lower for kw in ["filter map", "map to", "show on map", "focus map", "zoom to", "arunachal", "sikkim", "assam"]):
            state_match = self._extract_state(q)
            return CopilotQueryResponse(
                query=q,
                intent="FILTER_MAP",
                intent_name="Filter Tactical Map",
                interpreted_as=f"FILTER_MAP(state='{state_match or 'ALL'}', layer='ALL')",
                parameters={"state": state_match or "ALL"},
                action=CopilotAction(
                    type="FILTER_MAP",
                    target_view="tactical-map",
                    payload={"state": state_match, "highlight_hazards": True}
                ),
                answer=(
                    f"Tactical Map filtered to {state_match or 'North Eastern Region'}.\n"
                    f"Focusing viewport on active landslide incidents, corridor lifelines, and rainfall telemetry overlays."
                ),
                evidence_sources=["NER GeoSpatial Registry", "Survey of India State Boundaries"],
                confidence=0.98,
                suggested_next_commands=[
                    "Show all P1 incidents",
                    "Open TG-2048",
                    "Show Priority Queue"
                ]
            )

        # 10. Filter Incidents / Priority Queue Intent
        if any(kw in q_lower for kw in ["priority queue", "queue", "show all p1", "all incidents", "critical incidents", "list incidents"]):
            return CopilotQueryResponse(
                query=q,
                intent="FILTER_INCIDENTS",
                intent_name="View Priority Queue",
                interpreted_as="FILTER_INCIDENTS(queue='OPERATIONAL_CONSEQUENCE', filter='P1_CRITICAL')",
                parameters={"queue": "OPERATIONAL_CONSEQUENCE"},
                action=CopilotAction(
                    type="NAVIGATE",
                    target_view="priority-queue",
                    payload={"filter": "ALL"}
                ),
                answer=(
                    "Navigating to Authoritative Priority Queue.\n"
                    "Incidents ranked by deterministic consequence formula (0.25*Hazard + 0.25*Exposure + 0.25*Criticality + 0.15*Connectivity + 0.10*Response).\n"
                    "Top queued item: TG-2048 (Priority 89.2, P1_CRITICAL)."
                ),
                evidence_sources=["Deterministic Consequence & Lifeline Impact Engine v1.0"],
                confidence=0.99,
                suggested_next_commands=[
                    "Why is TG-2048 P1?",
                    "Open TG-2048",
                    "Filter map to Arunachal Pradesh"
                ]
            )

        # 11. Open Incident Intent
        if any(kw in q_lower for kw in ["open tg-", "show tg-", "open incident", "select incident", "bhalukpong"]):
            inc_code = self._extract_incident_code(q, req.current_incident_code)
            return CopilotQueryResponse(
                query=q,
                intent="OPEN_INCIDENT",
                intent_name="Open Incident Twin",
                interpreted_as=f"OPEN_INCIDENT(incident_code='{inc_code}')",
                parameters={"incident_code": inc_code},
                action=CopilotAction(
                    type="OPEN_INCIDENT",
                    target_view="incident-twin",
                    incident_code=inc_code,
                    payload={"incident_code": inc_code}
                ),
                answer=f"Switching active operational context to Incident Twin {inc_code}.",
                evidence_sources=["Incident Registry"],
                confidence=0.99,
                suggested_next_commands=[
                    f"Why is {inc_code} P1?",
                    f"Show evidence convergence for {inc_code}",
                    "What is missing before intervention?"
                ]
            )

        # 12. Alert Status Intent
        if any(kw in q_lower for kw in ["alert", "cap", "broadcast", "warning status", "citizen alert"]):
            inc_code = self._extract_incident_code(q, req.current_incident_code)
            return CopilotQueryResponse(
                query=q,
                intent="GET_ALERT_STATUS",
                intent_name="Alert & CAP Lifecycle Status",
                interpreted_as=f"GET_ALERT_STATUS(incident_code='{inc_code}')",
                parameters={"incident_code": inc_code},
                action=CopilotAction(
                    type="NAVIGATE",
                    target_view="incident-twin",
                    incident_code=inc_code,
                    payload={"tab": "alerts"}
                ),
                answer=(
                    f"CAP Alert Status for {inc_code}:\n"
                    f"• Status: ACTIVE DRAFT (Pending District Magistrate statutory signature)\n"
                    f"• Multi-Channel Broadcast Channels: SMS Cell Broadcast (Arunachal Telecom Circle), "
                    f"TerraGuardian Safe PWA Push, VHF Emergency Beacon Channel 4.\n"
                    f"• Target Polygon: 5km radius buffer around NH-13 KM-42 corridor."
                ),
                evidence_sources=["CAP v1.2 Dispatch Engine", "NDMA Common Alerting Protocol Gateway"],
                confidence=0.96,
                suggested_next_commands=[
                    f"Why is {inc_code} P1?",
                    "What is SDRF field status?",
                    "Authorize evacuation"
                ]
            )

        # 13. Unknown / Bounded Registry Fallback
        return CopilotQueryResponse(
            query=q,
            intent="UNKNOWN_COMMAND",
            intent_name="Command Unrecognized",
            interpreted_as=f"UNRECOGNIZED_COMMAND(raw_query='{q}')",
            parameters={"raw_query": q},
            action=None,
            answer=(
                "Command not recognized by Operational Copilot. "
                "Supported operational commands:\n" + "\n".join(f"• {c}" for c in SUPPORTED_CAPABILITIES)
            ),
            evidence_sources=["Operational Copilot Capability Registry v1.0"],
            confidence=0.0,
            suggested_next_commands=[
                "Why is TG-2048 P1?",
                "Show evidence convergence for TG-2048",
                "What changed since last assessment?",
                "Filter map to Arunachal Pradesh"
            ]
        )

    def _extract_incident_code(self, query: str, default: Optional[str] = "TG-2048") -> str:
        match = re.search(r"tg[-_\s]?(\d{4})", query, re.IGNORECASE)
        if match:
            return f"TG-{match.group(1)}"
        if "bhalukpong" in query.lower():
            return "TG-2048"
        if "mangan" in query.lower() or "sikkim" in query.lower():
            return "TG-2105"
        if "dima hasao" in query.lower() or "jatinga" in query.lower():
            return "TG-1944"
        if "champhai" in query.lower():
            return "TG-1082"
        return default or "TG-2048"

    def _extract_state(self, query: str) -> Optional[str]:
        q_lower = query.lower()
        states = [
            "Arunachal Pradesh", "Assam", "Manipur", "Meghalaya",
            "Mizoram", "Nagaland", "Sikkim", "Tripura"
        ]
        for s in states:
            if s.lower() in q_lower:
                return s
        if "arunachal" in q_lower:
            return "Arunachal Pradesh"
        return None
