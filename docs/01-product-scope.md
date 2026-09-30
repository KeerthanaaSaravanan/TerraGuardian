# Product Scope & Target Architecture

**Governing Baseline:** See [docs/00-product-north-star.md](file:///C:/Users/admin/TerraGuardian/TerraGuardian/docs/00-product-north-star.md) for the frozen product laws, semantic invariants, and full specification.

## 1. Product Vision & Mission
TerraGuardian is an AI-assisted landslide risk and operational intelligence system for the North Eastern Region of India that transforms multi-source hazard evidence into explainable risk, consequence-aware priorities, authorized response, verified outcomes, and continuous reassessment.

**SIH Mission Priority Order:**
1. **SIH26001 Solution** (Early detection, prediction, monitoring, and operational response across NER)
2. **TerraGuardian Operational Differentiation** (Closed-loop decision support, authorization, and confirmation)
3. **Research Contribution** (Intervention-conditioned hazard outcome interpretation)

## 2. Target Users & Personas
- **State & District Disaster Management Authorities (SDMA / DDMA):** Strategic oversight, alert authorization, multi-agency resource allocation.
- **Incident Commanders & Operations Centre Duty Officers:** Situational assessment, tactical dispatch, verification monitoring.
- **Field Responders & Technical Teams (NDRF, SDRF, BRO, PWD, GSI Geologists):** On-site inspection, physical confirmation, sensor telemetry validation.
- **Citizens & Commuters (TerraGuardian Safe PWA):** Hyper-local hazard awareness, early warnings, actionable precautions, crowd-sourced ground truth reporting.

## 3. Geographic Scope
- **Macro Scope:** Whole North Eastern Region of India (8 States: Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura).
- **Deep Demonstration Corridor:** West Kameng District, Arunachal Pradesh (NH-13 / BCT Road corridor).
- **Data Truth Rule:** No synthetic coverage masquerading as real-time regional feeds; explicit data gap labeling where telemetry is absent.

## 4. Core Capabilities (The Closed Operational Loop)
- **Hazard Intelligence Stack:** Susceptibility mapping, dynamic rainfall thresholds, geotechnical factor-of-safety models, satellite EO & InSAR deformation, explainable risk attribution.
- **Operational Intelligence:** Living Incident Twins, multi-source evidence reconciliation, exposure and vulnerability modeling, consequence scoring, statutory authorization chains.
- **Action & Dispatch Orchestration:** Tasking protocols, multi-agency dispatch tracking, field confirmation validation.
- **Outcome & Reassessment Engine:** Hypothesis arbitration (False Alarm, Intervention-Conditioned Non-Event, Delayed Failure, Residual Hazard), Next-Best-Information (NBI) selection.
- **Governance & Provenance:** Cryptographic evidence lineage, append-only assessment logs, RBAC enforcement, scientific maturity leveling (L0 to L6).

## 5. Semantic Invariants & Out of Scope
The 15 Product Laws defined in `docs/00-product-north-star.md` strictly govern system boundaries:
- Uncontrolled LLM decision-making is strictly out of scope.
- Fabricated metrics, faked live feeds, or unvalidated black-box predictions are prohibited.
- Operational closure is never conflated with geotechnical hazard extinction.
