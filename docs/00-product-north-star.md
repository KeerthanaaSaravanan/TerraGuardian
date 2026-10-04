# TerraGuardian — Product North Star (Product Definition Freeze)

**Status:** FROZEN  
**Phase:** Phase 0 Baseline  
**Governing Standard:** SIH26001 + TerraGuardian Operational Differentiation + Research Contribution

> **Scope note:** This document freezes product intent, hierarchy and semantic rules. It is not an implementation or deployment maturity report. Use the root [README](../README.md) for the current evidence-qualified capability and verification ledger; executable code and runtime evidence take precedence over this specification.

---

## 0.1 Mission
TerraGuardian is an AI-assisted landslide risk and operational intelligence system for the North Eastern Region of India that transforms multi-source hazard evidence into explainable risk, consequence-aware priorities, authorized response, verified outcomes, and continuous reassessment.

---

## 0.2 SIH Mission
The primary objective remains:
> **Early detection, prediction, monitoring and operational response to landslide risk across the North Eastern Region of India.**

Everything else supports this.

**Priority Order (Frozen):**
1. **SIH26001 SOLUTION**
   $$\downarrow$$
2. **TERRAGUARDIAN OPERATIONAL DIFFERENTIATION**
   $$\downarrow$$
3. **RESEARCH CONTRIBUTION**

---

## 0.3 The Core Product Question
Existing early-warning systems primarily answer:
> *“What may happen?”*

TerraGuardian additionally answers:
> *“What should happen next, who is authorized to act, what actually happened, and what can we legitimately conclude afterward?”*

That is the central product distinction.

---

## 0.4 The TerraGuardian Closed Loop (Master Product Loop)
The UI, APIs, database, AI/ML, and workflows must express this complete loop:

```
HAZARD INTELLIGENCE
        ↓
     EVIDENCE
        ↓
    ASSESSMENT
        ↓
    CONFIDENCE
        ↓
   CONSEQUENCE
        ↓
     PRIORITY
        ↓
     DECISION
        ↓
  AUTHORIZATION
        ↓
      ACTION
        ↓
PHYSICAL CONFIRMATION
        ↓
     OUTCOME
        ↓
   REASSESSMENT
        ↓
CONTINUE / ESCALATE / CLOSURE
```

---

## 0.5 Three Product Planes (Frozen)

### Plane 1 — HAZARD INTELLIGENCE
*Answers: What is happening / what may happen?*
- Rainfall & Antecedent Rainfall
- Soil Moisture
- Terrain, Slope & Elevation
- Geology & Lithology
- Historical Landslides (GSI/GLC)
- Satellite/EO & InSAR/Deformation (where available)
- In-situ Geotechnical Sensors (Inclinometers, Piezometers) (where available)
- Susceptibility & Dynamic Hazard
- AI/ML & Physics/Empirical Models
- Numerical Forecasts & Uncertainty Bounds

### Plane 2 — OPERATIONAL INTELLIGENCE
*Answers: What does it mean operationally, and what should happen next?*
- Incidents (Incident Twin)
- Evidence & Evidence Reconciliation
- Confidence & Calibrated Assessment
- Exposure (Assets, Population, Transport)
- Consequence & Impact Evaluation
- Strategic Connectivity & Critical Lifelines
- Priority Scoring
- Decision Support
- Authorization Workflows
- Action & Dispatch Orchestration
- Physical Confirmation & Telemetry
- Verified Outcome Recording
- Continuous Reassessment

### Plane 3 — GOVERNANCE & PROVENANCE
*Answers: Can we trust this information and this decision?*
- Identity & Role-Based Access Control (RBAC)
- Statutory Authorization Chains
- Evidence Provenance & Cryptographic Lineage
- Data Freshness & Pipeline Latency
- Model Lineage & Versioning
- Assessment Versions (Append-only)
- Immutable Audit Trail
- Conflicting Evidence Arbitration
- Data Quality & Sensor Degradation Tracking
- Action Accountability
- Scientific Maturity Labeling (Levels 0–6)
- Explicit Scientific Limitations & Operational Constraints

---

## 0.6 Core Semantic Invariants (Product Laws)
These are inviolable product laws across all UIs, APIs, DB schemas, and AI systems:

1. **Risk $\neq$ Confidence**
2. **Hazard $\neq$ Priority**
3. **Prediction $\neq$ Ground Truth**
4. **Recommendation $\neq$ Authorization**
5. **Authorization $\neq$ Execution**
6. **Execution $\neq$ Confirmation**
7. **Observation $\neq$ Interpretation**
8. **Non-event $\neq$ False Alarm**
9. **Missing Evidence $\neq$ Resolution**
10. **Intervention + Non-event $\neq$ Proven Prevention**
11. **External Source Availability $\neq$ Successful Ingestion**
12. **Model Complexity $\neq$ Validation Quality**
13. **Operational Closure $\neq$ Geotechnical Hazard Extinction**
14. **Citizen Evidence $\neq$ Verified Ground Truth**
15. **Stale Evidence $\neq$ Current Evidence**

*Any UI, API, or AI feature violating these must be corrected.*

---

## 0.7 Geographic Product Scope (Whole-NE Region)
The geographic product hierarchy is explicit:

```
INDIA
  ↓
NORTH EASTERN REGION (NER)
  ↓
8 STATES (Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura)
  ↓
DISTRICTS
  ↓
CORRIDORS / HIGHWAYS / ROADS
  ↓
SLOPES / SITES / CATCHMENTS
  ↓
INCIDENTS
```

- **Scope:** The system represents the entire North Eastern Region of India (8 States).
- **Demonstration Corridor:** West Kameng / Balipara-Charduar-Tawang (BCT) road serves as the deep real-data demonstration corridor.
- **Truth in Coverage:** Where actual data is unavailable, the UI must explicitly state data gaps rather than pretending regional coverage exists.

---

## 0.8 The Product's Fundamental Object — Incident Twin
The central domain object is the **INCIDENT (Incident Twin / Operational Incident Record)**:
Not merely a prediction point or notification, but a persistent operational state containing:
$$\text{Incident} = \text{Hazard} + \text{Evidence} + \text{Assessment} + \text{Confidence} + \text{Exposure} + \text{Consequence} + \text{Priority} + \text{Decision} + \text{Authorization} + \text{Actions} + \text{Confirmation} + \text{Outcome} + \text{Reassessment}$$

---

## 0.9 Key Relationship Models

### A. Evidence Lineage
$$\text{DATA} \longrightarrow \text{FEATURE} \longrightarrow \text{ASSESSMENT} \longrightarrow \text{CONCLUSION}$$
With explicit edge semantics:
- `SUPPORTS`
- `CONTRADICTS`
- `DERIVED_FROM`
- `SUPERSEDES`

### B. Risk $\to$ Impact $\to$ Action Chain
$$\text{HAZARD} \longrightarrow \text{EXPOSURE} \longrightarrow \text{CONSEQUENCE} \longrightarrow \text{PRIORITY} \longrightarrow \text{DECISION} \longrightarrow \text{ACTION} \longrightarrow \text{CONFIRMATION} \longrightarrow \text{OUTCOME}$$

---

## 0.10 AI/ML North Star: The Intelligence Stack
We are not building a monolithic black-box model. We are building a multi-tier intelligence stack:

```
                   TERRAGUARDIAN AI
                         │
       ┌─────────────────┼─────────────────┐
       ↓                 ↓                 ↓
 SUSCEPTIBILITY    DYNAMIC HAZARD    EVIDENCE INTELLIGENCE
       │                 │                 │
 terrain/geology     rainfall/etc.     reports/EO/etc.
       └─────────────────┼─────────────────┘
                         ↓
                  EVIDENCE FUSION
                         ↓
                 EXPLAINABLE RISK
                         ↓
                CONSEQUENCE / PRIORITY
                         ↓
                  DECISION SUPPORT
```

**Scientific Components:**
- Interpretable baselines (empirical rainfall thresholds, infinite slope safety factors)
- Tree-based ML (XGBoost/LightGBM for susceptibility)
- Temporal models where justified (LSTM/transformer for antecedent saturation)
- Physics/empirical geotechnical constraints
- Satellite EO / InSAR deformation analysis
- Feature attribution (SHAP/explainability)
- Calibrated uncertainty intervals
- Spatial/temporal block validation (no model is claimed validated without formal validation metrics)

---

## 0.11 Research North Star: Intervention-Conditioned Outcomes
Post-intervention observation maintenance across competing hypotheses:
- `FALSE_ALARM`
- `INTERVENTION_CONDITIONED_NON_EVENT`
- `DELAYED_FAILURE`
- `SHIFTED_HAZARD`
- `OBSERVATION_GAP`
- `RESIDUAL_HAZARD`
- `CONFLICTED`

**Evidence Categorization:**
- `SUPPORTING`
- `CONTRADICTING`
- `UNKNOWN`

**Information Optimization:**
- Calculate **Next Best Information (NBI)** to actively reduce epistemic uncertainty.
- *Subordinate to the operational SIH early-warning & response mission.*

---

## 0.12 UX North Star
**Experience Persona:** Disaster intelligence command system + scientific geospatial workstation + field response platform.
- **Not:** Generic SaaS, generic dashboard, generic GIS viewer, or portal clone.
- **Visual Principles:** Professional, Scientific, Operational, Clean, Information-dense without clutter, Map-centric, Progressive disclosure, Rigorous state semantics, Mobile-first for citizens and field responders.

---

## 0.13 UI Concept
The UI visually communicates:
$$\text{WHAT WE KNOW} \to \text{WHY WE BELIEVE IT} \to \text{WHAT IT THREATENS} \to \text{WHAT SHOULD HAPPEN} \to \text{WHO AUTHORIZED IT} \to \text{WHAT ACTUALLY HAPPENED} \to \text{WHAT WE BELIEVE NOW}$$

---

## 0.14 Main Authority Navigation (Operations Centre)
1. **OPERATIONS** — Command centre & situational overview
2. **MAP** — Tactical geospatial GIS workstation
3. **INCIDENTS** — Active & lifecycle incident twin management
4. **EVIDENCE** — Multi-sensor evidence reconciliation & provenance
5. **ALERTS** — Dissemination, delivery tracking & acknowledgements
6. **FIELD** — Responder dispatch, verification & mobile telemetry
7. **OUTCOMES** — Physical confirmations & post-event evaluations
8. **REVIEW** — Institutional learning, model audits & post-mortems
9. **ADMIN** — System telemetry, RBAC & pipeline health

---

## 0.15 Main Incident Navigation (Standard Experience)
1. **OVERVIEW**
2. **EVIDENCE**
3. **ASSESSMENT**
4. **EXPOSURE**
5. **ACTIONS**
6. **OUTCOME**
7. **TIMELINE**

---

## 0.16 Citizen North Star (TerraGuardian Safe)
Answers: *“What is happening near me, what should I do, and how can I report what I see?”*
- **Flow:** Local Status $\to$ Warning $\to$ What To Do $\to$ Report $\to$ Photo/Video $\to$ GPS $\to$ Submit $\to$ Verification $\to$ Incident Association
- **Capabilities:** Multilingual (Assamese, Hindi, English, etc.), Low Bandwidth, Offline Queue, Emergency Hotline, Road Blockage Status.

---

## 0.17 Communication North Star (Warning Pipeline)
$$\text{HAZARD} \to \text{ASSESSMENT} \to \text{DECISION} \to \text{AUTHORIZATION} \to \text{ALERT} \to \text{SMS/APP/WEB/CAP} \to \text{DELIVERY} \to \text{ACKNOWLEDGEMENT} \to \text{ESCALATION}$$

Strict separation:
- Alert **Generated** $\neq$ Alert **Sent** $\neq$ Alert **Delivered** $\neq$ Alert **Acknowledged**.

---

## 0.18 Data Truth Model
Every significant dataset records:
- Source, Dataset Version, Observation Time, Ingestion Time, Location, Spatial Resolution, Temporal Resolution, Quality Score, Freshness Latency, Provenance, Transformations, Scientific Maturity Level.
- **Truth Badges:** `LIVE`, `REAL_HISTORICAL`, `REPLAY`, `SYNTHETIC`, `CONTROLLED_DEMO`, `EXPERIMENTAL`, `NO LIVE FEED`.

---

## 0.19 Scientific Maturity Rule (Maturity Levels)
- **LEVEL 0 — CONCEPT:** Theoretical framing or unvalidated formula.
- **LEVEL 1 — IMPLEMENTED:** Code written and runnable in environment.
- **LEVEL 2 — UNIT TESTED:** Algorithmic correctness verified under unit tests.
- **LEVEL 3 — INTEGRATION TESTED:** Connected to end-to-end data/incident pipeline.
- **LEVEL 4 — CONTROLLED DEMO:** Validated on calibrated benchmark demonstration scenarios.
- **LEVEL 5 — REAL HISTORICAL VALIDATION:** Formally validated on back-tested historical event records with published metrics (ROC-AUC, Brier score, F1).
- **LEVEL 6 — PROSPECTIVE / OPERATIONAL VALIDATION:** Evaluated in active field operations against real ground-truth monitoring.

---

## 0.20 Competitor Strategy
1. What problem are they solving?
2. What technical innovation are they using?
3. What capability is genuinely useful?
4. What evidence supports it?
$$\Downarrow$$
**Adopt the idea where useful $\to$ Re-engineer it for TerraGuardian $\to$ Do not copy their UI.**  
*Our product identity comes from the operational closed loop.*

---

## 0.21 Prohibited Anti-Patterns (What We Will NOT Do)
- ❌ Add AI merely because it sounds impressive.
- ❌ Fabricate validation metrics.
- ❌ Fake live APIs or pretend mock data is real-time.
- ❌ Fake SMS delivery or physical telemetry.
- ❌ Fake satellite/InSAR data.
- ❌ Call fixtures "live".
- ❌ Claim whole-NER real coverage without actual data feeds.
- ❌ Call five historical points a regional ground truth dataset.
- ❌ Call heuristic scores "probabilities".
- ❌ Use an LLM as an uncontrolled safety-critical decision maker.
- ❌ Create decorative features with no operational purpose.
- ❌ Copy competitor dashboards.
- ❌ Overload the UI with unnecessary cards.
- ❌ Let academic research distract from the SIH operational mission.

---

## 0.22 Definition of a Finished Capability
A capability is finished **ONLY** when the complete unbroken chain is present:
$$\text{REAL SOURCE/DATA} \to \text{REAL COMPUTATION} \to \text{REAL PERSISTENCE} \to \text{REAL API} \to \text{REAL UI} \to \text{REAL USER ACTION} \to \text{REAL STATE CHANGE} \to \text{TEST} \to \text{TRUTHFUL MATURITY LABEL}$$
*If any essential link is missing: Capability = NOT FINISHED.*

---

## 0.23 The Ultimate Demonstration (The Complete Story)
A hazard emerges somewhere in the NER:
1. Detects changing conditions (rainfall, saturation, slope strain).
2. Computes dynamic hazard & evaluates geotechnical susceptibility.
3. Explains evidence with transparent factor attribution.
4. Identifies exposed lifelines, roads, and settlements.
5. Calculates multi-dimensional consequence & assigns priority.
6. Creates/updates Incident Twin.
7. Receives citizen and field evidence reports.
8. Reassesses risk and confidence.
9. Recommends statutory operational actions.
10. Obtains authorized administrative approval.
11. Dispatches agencies (NDRF, SDRF, BRO, PWD, District Admin).
12. Tracks execution in real-time.
13. Receives physical telemetry and field confirmation.
14. Records verified ground outcome.
15. Interprets the outcome against competing hypotheses.
16. Identifies residual hazard and uncertainty.
17. Requests/uses Next Best Information (NBI).
18. Reassesses: continues, escalates, or legitimately closes with audited justification.
