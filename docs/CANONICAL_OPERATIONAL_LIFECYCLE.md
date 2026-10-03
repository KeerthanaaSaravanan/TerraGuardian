# TERRAGUARDIAN AI — CANONICAL OPERATIONAL LIFECYCLE
## Living Closed-Loop Operational State Machine & Disaster Governance Engine
**SIH Problem ID:** SIH26001  
**Target Organization:** Ministry of Development of North Eastern Region (MDoNER)  
**Corridor Focus:** NH-13 Trans-Arunachal Highway (KM-42 Sessa Hairpin Turn)  

---

## 1. ABSOLUTE GOVERNING INVARIANTS

The TerraGuardian state machine strictly encodes and enforces thirteen fundamental operational, scientific, and statutory invariants across all API routes, database transactions, and background workers:

1. **Risk $\neq$ Confidence:** High spatial susceptibility does not imply high observational data confidence; low-confidence alerts carry explicit evidentiary uncertainty.
2. **Hazard $\neq$ Priority:** Geotechnical hazard score indicates physical destabilization severity; operational priority incorporates exposure, lifeline criticality, and isolation vulnerability.
3. **Prediction $\neq$ Ground Truth:** AI models generate advisory susceptibility and hazard predictions; ground physical verification requires accepted field observation.
4. **Recommendation $\neq$ Authorization:** AI and DSS propose actions; statutory disaster management orders (e.g. road blockade, evacuation) strictly require human Magistrate/DDMA authorization.
5. **Authorization $\neq$ Execution:** Signing a disaster order does not mean it has been dispatched or executed by the responsible agency.
6. **Execution $\neq$ Confirmation:** Field dispatch or agency claim does not equal physical ground confirmation. An action is confirmed only through accepted ground confirmation evidence.
7. **Observation $\neq$ Interpretation:** Raw telemetry (rain gauge, InSAR, citizen photo) is distinct from expert or verified interpretation.
8. **Citizen Evidence $\neq$ Verified Ground Truth:** Citizen submissions enter the operational fabric as `UNVERIFIED` and cannot trigger statutory orders without field patrol verification.
9. **Non-Event $\neq$ False Alarm:** The absence of a manifested slope failure during a predicted window does not imply the model was incorrect; soil pore-water dissipation or stabilization intervention may have intervened.
10. **Intervention + Non-Event $\neq$ Proven Prevention:** When an intervention occurred and no landslide was recorded, causal claims remain unproven (`causal_claim_established = False`).
11. **Operational Closure $\neq$ Geotechnical Hazard Extinction:** Resolving an incident signifies that operational response tasks are completed; the physical slope hazard remains susceptible to hydrologic recharge.
12. **AI Recommendation $\neq$ Human Decision:** Under no circumstance can automated AI algorithms close, verify, or reopen statutory operational orders.
13. **Reopened Incident Preserves Identity:** A reopened incident retains the exact Incident Twin identity (`id`, `code` e.g., TG-2048), history, and actions. It does not spawn disconnected duplicate twins.

---

## 2. CANONICAL INCIDENT STATE GRAPH

```
[DETECTED]
   ↓
[ASSESSING]
   ↓
[VERIFYING]
   ↓
[VERIFIED]
   ↓
[DECISION_REQUIRED]
   ├─── (Routine / Low Consequence) ─────────────→ [MONITORING]
   │                                                     │
   └─── (Critical P1/P2 Operational Action) ─┐           │
                                             ↓           │
                                       [AUTHORIZED]      │
                                             ↓           │
                                       [RESPONDING]      │
                                             ↓           │
                                       [MONITORING] ←────┘
                                             ↓
                                       [REASSESSING]
                                             ↓
                       (9-Point Evidentiary Closure Gate)
                                             ↓
                                        [RESOLVED]
                                             │
                       ┌─────────────────────┴───────────────────────┐
                       │ (Fresh Credible Material Evidence)          │ (Post-Incident Review)
                       ↓                                             ↓
                 [REASSESSING]                                  [REVIEWED]
                       ↑                                             │
                       │                                             │ (Fresh Credible Material Evidence)
                       │                                             ↓
                       └──────────────────────────────────────── [REOPENED]
```

---

## 3. STATE TRANSITIONS & GUARDS MATRIX

| Source State | Target State | Permitted Roles | Preconditions & Validation Guards |
| :--- | :--- | :--- | :--- |
| `DETECTED` | `ASSESSING` | `OPERATOR`, `GEOTECHNICAL_ENGINEER`, `SYSTEM_AI` | Incident exists, valid WGS84 coordinates, detection provenance recorded. |
| `ASSESSING` | `VERIFYING` | `OPERATOR`, `GEOTECHNICAL_ENGINEER` | Multi-modal hazard assessment / feature vector computed. |
| `VERIFYING` | `VERIFIED` | `GEOTECHNICAL_ENGINEER`, `OPERATOR`, `AUTHORIZED_DECISION_MAKER` | **Non-AI human actor mandatory**. Zero unresolved critical conflicting evidence items. |
| `VERIFYING` | `ASSESSING` | `GEOTECHNICAL_ENGINEER`, `OPERATOR` | Conflict detection requires re-evaluation of feature pipeline. |
| `VERIFIED` | `DECISION_REQUIRED` | `OPERATOR`, `SYSTEM_AI` | Consequence model evaluated; operational priority assigned (`P1`-`P4`). |
| `DECISION_REQUIRED` | `AUTHORIZED` | `AUTHORIZED_DECISION_MAKER` (District Magistrate / DDMA) | **Non-AI actor mandatory**. `AUTHORIZE_ACTION` permission required. Statutory order reference code mandatory (`ORD-xxx`). |
| `DECISION_REQUIRED` | `MONITORING` | `OPERATOR`, `AUTHORIZED_DECISION_MAKER` | Consequence does not warrant immediate intervention; passive surveillance active. |
| `AUTHORIZED` | `RESPONDING` | `OPERATOR` (Duty Dispatcher) | Response dispatch initiated; actions assigned to field agencies (BRO, Police, DDMA). |
| `RESPONDING` | `MONITORING` | `OPERATOR` | Response actions in progress or acknowledged; transitioning to ongoing surveillance. |
| `MONITORING` | `REASSESSING` | `OPERATOR`, `SYSTEM_AI` | Periodic evaluation interval elapsed, new telemetry arrived, or manual trigger. |
| `REASSESSING` | `RESOLVED` | `AUTHORIZED_DECISION_MAKER` (Executive Magistrate) | **All 9 Evidentiary Closure Gate preconditions must pass simultaneously**. |
| `REASSESSING` | `MONITORING` | `OPERATOR` | Reassessment reveals ongoing residual monitoring requirements without operational closure. |
| `REASSESSING` | `DECISION_REQUIRED` | `OPERATOR`, `SYSTEM_AI` | Hazard escalation detected during reassessment; fresh executive order required. |
| `RESOLVED` | `REVIEWED` | `AUTHORIZED_DECISION_MAKER`, `AUDITOR` | `REVIEW` permission required; post-incident review checklist completed. Emits `INCIDENT_REVIEWED`. |
| `RESOLVED` | `REASSESSING` | Ingestion Pipeline / `OPERATOR` | Incoming evidence passes 5-point Reopening Guardrails. |
| `REVIEWED` | `REOPENED` | Ingestion Pipeline / `OPERATOR` | Incoming evidence passes 5-point Reopening Guardrails. **Non-AI actor**. Emits `INCIDENT_REOPENED`. |
| `REOPENED` | `REASSESSING` | Automatic Transition | Reopened incident twin immediately executes fresh multi-modal hazard reassessment. |

---

## 4. 9-POINT EVIDENTIARY CLOSURE GATE SPECIFICATIONS

Operational closure of an active crisis is strictly hard-gated by `StateTransitionService.evaluate_closure_gate()`. Under Indian Disaster Management Act protocol, an incident **cannot** be resolved unless all nine preconditions evaluate to `True`:

1. **Source State Restriction:** Incident MUST be in `REASSESSING`. Direct closure jumps from `MONITORING`, `RESPONDING`, or `DETECTED` are strictly rejected with HTTP 400.
2. **Statutory Authority Role:** Closure sign-off requires `AUTHORIZED_DECISION_MAKER` (District Magistrate, DDMA Chairperson). AI and operational dispatchers are barred.
3. **Statutory Resolution Order:** Official resolution order reference code (e.g. `ORD-CLOSURE-2024-06-29`) must be provided.
4. **All Actions Ground-Confirmed:** Every dispatched operational action must be in state `PHYSICALLY_CONFIRMED`. No actions in `DISPATCHED`, `ACKNOWLEDGED`, `IN_PROGRESS`, or `COMPLETED` may remain unconfirmed.
5. **Zero Conflicted Evidence:** All conflicting evidence items must be reconciled (`conflict_status == RESOLVED`) or rejected.
6. **Verified Field Evidence Presence:** At least one `FIELD` evidence item with interpretation `VERIFIED` must be linked to the incident.
7. **Strict Field Evidence Freshness:** The verified field inspection report must have freshness $\le 21,600\text{ seconds}$ (6.0 hours). Stale evidence blocks resolution.
8. **Outcome Engine Clearance:** An authoritative `OutcomeAssessment` must exist, and its `closure_permitted` flag must be `True`.
9. **Outcome Evaluation Freshness:** No newer evidence items may have arrived since the timestamp of the latest outcome evaluation. If new evidence exists, reassessment is mandatory before closure.

### Semantic Closure Disclaimer
Every closure payload permanently attaches the structured notice:
> **OPERATIONAL INCIDENT CLOSURE $\neq$ GEOTECHNICAL HAZARD EXTINCTION**  
> Operational closure indicates that immediate response, traffic diversion, and debris clearance requirements have been satisfied. Superficial clearing does not eliminate deep sub-surface pore-water pressure or shear zone susceptibility.

---

## 5. POST-INCIDENT REVIEW & REOPENING POLICY

A `RESOLVED` or `REVIEWED` incident is never permanently locked. If nature or human activity reactivates the slope, TerraGuardian reopens the living Incident Twin without spawning disconnected duplicate tickets.

### 5-Point Reopening Guardrails
Incoming evidence triggers reopening if and only if:
1. **Direct Linkage:** The evidence is linked to the specific incident ID and falls within its 10.0 km spatial scope.
2. **Freshness:** Evidence age $\le 86,400\text{ seconds}$ (24.0 hours) and not future-dated.
3. **Source Credibility:** Originates from authoritative platforms (`FIELD`, `SATELLITE`, `WEATHER`, `SENSOR`, `AUTHORITATIVE`) or verified `CITIZEN` reports. Unverified citizen reports are barred from reopening incidents.
4. **Non-Duplication:** Payload hash, original reference, and timestamp are checked against existing records; duplicates are rejected.
5. **Physical Materiality Threshold:**
   - **Rainfall Surge:** 24h precipitation $\ge 35.0\text{ mm}$ (or high-rate convective storm).
   - **Soil Saturation:** Soil moisture saturation $\ge 0.65$ (65%).
   - **InSAR Deformation:** Line-of-sight velocity magnitude $\ge 15.0\text{ mm/yr}$ or displacement $\ge 10.0\text{ mm}$.
   - **Sensor Tilt:** Borehole tiltmeter / inclinometer rate $\ge 5.0\text{ mm/day}$.
   - **Field Physical Destabilization:** Inspection report detailing tension crack widening, crown scarp slumping, toe bulges, or rockfall raveling.

---

## 6. MULTI-AGENCY OPERATIONAL ACTION LIFECYCLE

```
[PROPOSED] ──(Approval / Order)──→ [APPROVED] ──(Dispatch)──→ [DISPATCHED]
                                                                  │
                                      ┌───────────────────────────┴───────────────────────────┐
                                      ↓                                                       ↓
                               [ACKNOWLEDGED]                                           [IN_PROGRESS]
                                      │                                                       │
                                      └───────────────────────────┬───────────────────────────┘
                                                                  ↓
                                                             [COMPLETED]
                                                                  ↓
                                             (Physical Field Confirmation Accepted)
                                                                  ↓
                                                        [PHYSICALLY_CONFIRMED]
```

### Canonical Multi-Agency Task Roster (TG-2048 Sessa KM-42)
1. **TSK-01 (Border Roads Organisation - TF 14 / 85 RCC):** Corridor Traffic Control & Emergency Gate Closure at KM-38 checkpost on NH-13.
2. **TSK-02 (Geotechnical Field Authority - Bomdila):** Rapid Geotechnical Slope Inspection & Tension Crack Measurement.
3. **TSK-03 (District Disaster Management Authority - West Kameng):** Downslope Munna Camp & Riverine Settlements Precautionary Advisory.
4. **TSK-04 (Scientific Telemetry Response Unit):** Surface Tiltmeter & Automated Extensometer Telemetry Deployment.

---

## 7. VERIFICATION & ACCEPTANCE STATUS

All lifecycle transitions, authority barriers, closure gates, and reopening protocols are covered by automated unit tests in `tests/unit/test_canonical_lifecycle.py`:

- **TEST 01:** Canonical State Machine Valid Forward Transitions (100% Passed)
- **TEST 02:** Forbidden Direct State Jumps (100% Passed)
- **TEST 03:** AI Actor Barred from Authorizing Disaster Orders (100% Passed)
- **TEST 04:** AI Actor Barred from Verifying Ground Reality (100% Passed)
- **TEST 05:** AI Actor Barred from Closing Operational Incidents (100% Passed)
- **TEST 06:** AI Actor Barred from Authorizing Incident Reopening (100% Passed)
- **TEST 07:** Statutory Disaster Order Code Mandatory (100% Passed)
- **TEST 08:** Action Lifecycle & Physical Ground Confirmation (100% Passed)
- **TEST 09:** 9-Point Evidentiary Closure Gate Preconditions (100% Passed)
- **TEST 10:** 5-Point Reopening Eligibility Evaluation Rules (100% Passed)
- **TEST 11:** Reopening from RESOLVED Preserves Identity (100% Passed)
- **TEST 12:** Reopening from REVIEWED Emits Audit Event (100% Passed)
- **TEST 13:** Deterministic Replay Engine 10-Step Timeline (100% Passed)
- **TEST 14:** REST API `POST /incidents/{id}/reopen` (100% Passed)
- **TEST 15:** REST API `GET /incidents/{id}/reopening-eligibility` (100% Passed)
- **TEST 16:** Duplicate Evidence Rejection on Closed Incidents (100% Passed)
