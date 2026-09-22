<div align="center">

# TERRAGUARDIAN AI

### FROM WARNING TO VERIFIED RESPONSE

**Landslide Operational Intelligence for the North Eastern Region of India**

<br>

> ## A warning starts an incident. It does not end one.

<br>

**SIH26001** · **MDoNER** · **Disaster Management** · **Software**

<br><br>

[Architecture](#architecture) ·
[Research](#research) ·
[Engineering](#engineering-truth) ·
[Demonstration](#demonstration) ·
[Run](#run)

</div>

---

<div align="center">

### TERRAGUARDIAN OPERATIONS CENTRE

**[ INSERT FINAL VERIFIED PRODUCT SCREENSHOT / GIF HERE ]**

*Incident · Map · Evidence · Risk · Confidence · Priority · Action · Timeline*

</div>

---

# THE IDEA

<table>
<tr>
<td width="50%" align="center">

### EXISTING HAZARD SYSTEMS

> **What may happen?**

</td>
<td width="50%" align="center">

### TERRAGUARDIAN

> **What should happen next — and what can we legitimately conclude afterward?**

</td>
</tr>
</table>

It maintains **one evolving, evidence-backed incident state** across:

<div align="center">

**HAZARD → EVIDENCE → CONSEQUENCE → DECISION → ACTION → CONFIRMATION → OUTCOME → REASSESSMENT**

</div>

### GOVERNANCE

> **AI assists reasoning. Rules govern critical state transitions. Humans authorize critical actions.**

---

# THE OPERATIONAL GAP

## A WARNING IS NOT THE END OF AN INCIDENT

| **Signal** | **Operational question** |
|---|---|
| **Forecast** | What is actually happening? |
| **Alert** | How certain are we? |
| **Hazard map** | Who and what is exposed? |
| **Risk** | What matters most now? |
| **Recommendation** | What should happen next? |
| **Authorization** | Was the action approved? |
| **Execution** | Did it actually happen? |
| **Confirmation** | Was execution verified? |
| **Observation** | What actually happened afterward? |
| **Outcome** | What can we legitimately conclude? |

<br>

### THE HARD CASE

<div align="center">

```text
WARNING
   ↓
INTERVENTION
   ↓
NO OBSERVED EVENT

</div>A non-event does not automatically mean:

<div align="center">FALSE ALARM

</div>And it does not prove:

<div align="center">INTERVENTION PREVENTED THE EVENT

</div>The system must distinguish among:

<div align="center">Delayed / shifted hazard · Incomplete observation · Successful intervention · Model error · Residual hazard · Unresolved evidence

</div>TERRAGUARDIAN

<div align="center">DON'T GUESS. REASSESS.

</div>
---

THE OPERATIONAL LOOP

flowchart LR

P[Predict] --> E[Evidence]
E --> A[Assess]
A --> PR[Prioritize]
PR --> D[Decide]
D --> AU[Authorize]
AU --> AC[Act]
AC --> C[Confirm]
C --> O[Observe]
O --> I[Interpret]
I --> R[Reassess]

R -->|Continue| E
R -->|Escalate| D
R -->|Closure Assessment| CL[Closure Assessment]

CL -->|Insufficient Evidence| E
CL -->|Sufficient Evidence| RES[Resolved]

<div align="center">ONE INCIDENT. ONE OPERATIONAL TRUTH.

The incident remains under reassessment as evidence and reality evolve.

</div>
---

WHAT THE SYSTEM MAINTAINS

State	Preserved operational truth

INCIDENT	Lifecycle · location · current state
EVIDENCE	Source · time · provenance · freshness · reliability · conflict
RISK	Hazard likelihood / severity
CONFIDENCE	Confidence in the assessment
CONSEQUENCE	Exposure · criticality · response difficulty
PRIORITY	Operational importance
DECISION	Recommended next step · rationale
AUTHORIZATION	Human approval for critical action
ACTION	Proposed → authorized → executed
CONFIRMATION	Whether execution was actually confirmed
OUTCOME	What was observed
REASSESSMENT	What should happen next
AUDIT	Structured incident history



---

SAFETY SEMANTICS

TerraGuardian deliberately keeps operational concepts separate.

Invariant	Operational meaning

Risk ≠ Confidence	High risk does not mean high certainty
Hazard ≠ Priority	Hazard severity alone does not determine operational priority
Recommendation ≠ Authorization	AI recommendation does not authorize critical action
Approval ≠ Execution	Approval does not prove action occurred
Execution ≠ Confirmation	Reported execution does not equal verified execution
Observation ≠ Interpretation	Observation is not automatically a causal conclusion
Non-event ≠ False Alarm	No observed event does not prove forecast error
Intervention + Non-event ≠ Proven Prevention	Temporal sequence alone does not establish causality
Missing Evidence ≠ Hazard Resolution	Lack of evidence is not evidence of safety
Stale Assessment ≠ Current State	Old intelligence must not silently represent current reality



---

ARCHITECTURE

Operational Architecture

flowchart TB

    S[Hazard Intelligence<br/>Forecasts · Terrain · Rainfall · GIS]

    S --> E[Evidence Intelligence<br/>Provenance · Freshness · Reliability · Conflict]

    E --> IT[INCIDENT TWIN<br/><br/>One evolving operational state]

    IT --> R[Risk + Confidence]
    IT --> CP[Consequence + Priority]
    IT --> D[Decision Intelligence]

    D --> G[Policy / Rule Validation]
    G --> H[Human Authorization]

    H --> A[Action Governance]
    A --> X[Execution]
    X --> CF[Confirmation]

    CF --> O[Observation]
    O --> OUT[Outcome Interpretation]
    OUT --> RE[Reassessment]

    RE -->|Continue| IT
    RE -->|Escalate| D
    RE -->|Closure Assessment| CL[Closure Assessment]

    CL -->|Insufficient Evidence| IT
    CL -->|Sufficient Evidence| RES[Resolved]

Technical Architecture

flowchart LR

    UI[React + TypeScript<br/>Operations Centre]

    API[FastAPI<br/>Typed API Layer]

    DOMAIN[Domain Services<br/>Incident · Evidence · Risk<br/>Impact · Priority · Reassessment]

    DB[(PostgreSQL / PostGIS)]

    ML[Python Intelligence<br/>Deterministic / Interpretable Baseline]

    GIS[MapLibre<br/>Geospatial Layer]

    ADAPTERS[Source Adapter Layer<br/>Validate · Normalize · Provenance]

    UI --> API
    API --> DOMAIN

    ADAPTERS --> DOMAIN

    DOMAIN --> DB
    DOMAIN --> ML
    DOMAIN --> GIS

    DOMAIN --> API
    API --> UI

ARCHITECTURE PRINCIPLE

<div align="center">Replaceable inputs. Persistent incident state. Bounded intelligence. Human-governed critical transitions.

</div>
---

DECISION INTELLIGENCE

TerraGuardian does not stop at:

<div align="center">“What is the risk?”

</div>It asks:

<div align="center">“What information or operational step is most valuable next?”

</div>RISK
+
CONFIDENCE
+
CONSEQUENCE
+
TIME
+
EVIDENCE
        ↓
MOST INFORMATIVE NEXT STEP
        ↓
VERIFY · MONITOR · OBSERVE · PREPARE · ACT

AI reasoning feeds a policy and rule boundary before critical state transitions.


---

RESEARCH

FROM RESEARCH → OPERATIONAL GAP → CONTRIBUTION

LANDSLIDE WARNING & DECISION RESEARCH
                 ↓
FORECAST VERIFICATION
                 ↓
EVIDENCE / UNCERTAINTY
                 ↓
ACTIVE SENSING / INFORMATION VALUE
                 ↓
INTERVENTION-AWARE REASONING
                 ↓
RESIDUAL HAZARD / POST-EVENT ASSESSMENT
                 ↓
INDIAN DISASTER-MANAGEMENT ECOSYSTEM
                 ↓
          OPERATIONAL GAP
                 ↓

┌───────────────────────────────────────────┐
│ WHAT SHOULD AN OPERATIONAL SYSTEM        │
│ CONCLUDE AFTER AN INTERVENTION AND       │
│ AN OBSERVED OUTCOME?                     │
└───────────────────────────────────────────┘

                 ↓

INTERVENTION-CONDITIONED
HAZARD OUTCOME INTERPRETATION
                 ↓
OPERATIONAL IMPLEMENTATION


---

WHAT THE RESEARCH CHANGED

Research area	Engineering consequence

Forecast verification	Living hazard state + divergence reassessment
Evidence / uncertainty	Evidence-aware state instead of single-source truth
Active sensing / information value	Select the most informative next operational step
Incident / digital-twin research	One evolving incident state
Intervention-aware / counterfactual research	Intervention context + bounded outcome interpretation
Residual-hazard research	Continued reassessment instead of premature closure
Indian warning ecosystem	Connect to — not replace — authoritative systems



---

THE RESEARCH QUESTION

<div align="center">> When a predicted hazard is followed by an intervention and an observed non-event or altered outcome, how should an operational system distinguish model error, successful intervention, delayed/shifted hazard, incomplete observation and unresolved residual risk — without making an unsupported causal claim?



</div>This question drives the outcome semantics, reassessment workflow and governance boundaries.


---

THE CONTRIBUTION

INTERVENTION-CONDITIONED HAZARD OUTCOME INTERPRETATION

TerraGuardian separates:

WHAT WAS PREDICTED
        ↓
WHAT INTERVENTION OCCURRED
        ↓
WHAT WAS ACTUALLY OBSERVED
        ↓
WHAT EVIDENCE SUPPORTS
        ↓
WHAT REMAINS UNCERTAIN
        ↓
WHAT SHOULD HAPPEN NEXT

CORE RULE

<div align="center">Observed outcome ≠ automatic causal explanation.

The system preserves uncertainty when available evidence cannot justify a stronger conclusion.

</div>
---

RESEARCH BOUNDARY

TerraGuardian does not claim to invent:

<div align="center">Landslide prediction · Evidence fusion · Active sensing · Value-of-information · Digital twins · Forecast verification · Intervention-aware warning · Residual-hazard assessment · Closed-loop disaster response · GIS / satellite landslide intelligence

</div>DEFENSIBLE CONTRIBUTION

> An intervention-conditioned operational synthesis connecting evidence, action, observed outcome and reassessment within one persistent incident lifecycle — while preserving uncertainty instead of forcing premature conclusions.




---

INDIA / NER POSITIONING

TerraGuardian is an operational intelligence layer, not a replacement for authoritative warning infrastructure.

GSI / NLFC
NDEM / NRSC
NDMA / SACHET
NESAC
STATE / DISTRICT SYSTEMS
        │
        ▼
┌────────────────────────────┐
│       ADAPTER / API        │
│ Validate · Normalize       │
│ Provenance · Freshness     │
└──────────────┬─────────────┘
               ▼
        TERRAGUARDIAN
               │
               ▼
    Evidence → Decision
               │
               ▼
       Action → Confirmation
               │
               ▼
        Observation
               │
               ▼
         Reassessment

CONNECT. DON'T REPLACE.

Progressive integration is supported through replaceable data adapters.

No live government integration is claimed unless explicitly implemented and verified.


---

ENGINEERING TRUTH

TerraGuardian follows a strict maturity model:

DESIGNED
   ↓
IMPLEMENTED
   ↓
EXECUTABLE
   ↓
VERIFIED
   ↓
DEMONSTRATION-READY

Claims are not upgraded without evidence.

Capability	Current status

Persistent Incident Twin	IMPLEMENTED
Server-enforced incident lifecycle	IMPLEMENTED
Evidence reconciliation	IMPLEMENTED
Citizen-evidence safety boundary	IMPLEMENTED
Risk + confidence baseline	IMPLEMENTED
Impact / priority	IMPLEMENTED
Human authorization	IMPLEMENTED
Reassessment	IMPLEMENTED + TESTED
Deterministic / interpretable intelligence baseline	IMPLEMENTED / SIMULATED
Intervention context	DESIGN / PARTIAL
Observed-outcome integration	PARTIAL
Evidentiary closure gate	IN PROGRESS
Full action-confirmation enforcement	IN PROGRESS
Live government integrations	NOT CLAIMED
Production ML accuracy	NOT CLAIMED
Production RBAC / IAM	NOT CLAIMED
Cryptographically immutable audit	NOT CLAIMED
Full offline-first operation	NOT CLAIMED


<div align="center">Sparse-but-true beats impressive-but-false.

</div>
---

VERIFICATION

BACKEND EVIDENCE

<div align="center">57 / 57 backend tests passing

</div>Verified command:

python3 -m pytest tests/ -v

Current backend verification covers domain and service behavior including:

Incident lifecycle · evidence handling · risk/confidence · impact/priority · authorization · reassessment

VERIFICATION BOUNDARY

The following are not represented as production-verified unless separately demonstrated:

PostgreSQL/PostGIS runtime

Docker Compose runtime

Frontend E2E execution

Production authentication / IAM

Live government integrations

Regional ML accuracy

Offline-first operation

Cryptographically immutable audit



---

DEMONSTRATION

THE GOLDEN SCENARIO

01 · PREDICT

A hazard signal creates an incident.

Risk       → assessed
Confidence → assessed separately
Location   → mapped

02 · EVIDENCE

Additional evidence arrives.

Source · Timestamp · Location
Freshness · Reliability · Conflict

03 · PRIORITIZE

Hazard
+
Exposure
+
Criticality
+
Response Difficulty

04 · DECIDE

AI reasoning
      ↓
Policy / Rule validation
      ↓
Human authorization

05 · ACT

PROPOSED
   ↓
AUTHORIZED
   ↓
EXECUTED
   ↓
CONFIRMED

06 · REALITY DIVERGES

Field observation:

<div align="center">NO LANDSLIDE OBSERVED

</div>TerraGuardian does not automatically declare:

FALSE ALARM

and does not claim:

PREVENTION PROVEN

07 · INTERPRET

<div align="center">INTERVENTION-CONDITIONED
NON-EVENT

</div>The incident retains:

Intervention context · Observation · Evidence · Uncertainty · Residual questions

08 · REASSESS

OBSERVE
   ↓
INTERPRET
   ↓
REASSESS
   ↓
CONTINUE
   /
ESCALATE
   /
CLOSURE ASSESSMENT


---

OUTCOME SEMANTICS

Scenario	Operational interpretation

Event observed	EVENT_OBSERVED
No event + intervention	INTERVENTION_CONDITIONED_NON_EVENT
No event + adequate observation	POTENTIAL_FALSE_ALARM_ASSESSMENT
No event + insufficient evidence	OBSERVATION_GAP
Event + remaining hazard	RESIDUAL_HAZARD
Conflicting evidence	CONFLICTED
Evidence insufficient for closure	UNRESOLVED


CLOSURE IS NOT A SHORTCUT

MONITORING
    ↓
OUTCOME ASSESSMENT
    ↓
REASSESSMENT
    ↓
CONTINUE / ESCALATE / CLOSURE ASSESSMENT
    ↓
AUTHORIZED CLOSURE
    ↓
RESOLVED
    ↓
REVIEWED


---

IMPACT

FROM MORE ALERTS TO BETTER OPERATIONAL DECISIONS

Capability	Operational value

Faster coordination	Warning → verification → decision → action
Better prioritization	Consequence-aware operational focus
Evidence-aware state	Freshness, provenance and conflict remain visible
Verified response	Authorization → execution → confirmation
Safer interpretation	Observation separated from causal conclusion
Continuous reassessment	Reality divergence produces the next decision
Structured history	Incident state remains reviewable


OPERATIONAL METRICS

WARNING → DECISION TIME

DECISION → ACTION TIME

ACTION CONFIRMATION LATENCY

EVIDENCE CONFLICT RATE

REASSESSMENT COMPLETION

CLOSURE EVIDENCE COMPLETENESS

These are proposed operational metrics, not claimed performance results.


---

WHY THE NORTH EAST

The architecture is designed for a regional operational environment where hazard intelligence, field evidence, exposure, response coordination and changing ground conditions must coexist across multiple administrative and technical systems.

<div align="center">REUSABLE CORE
      +
REPLACEABLE DATA ADAPTERS
      +
PROGRESSIVE VALIDATION
      +
DISTRICT → STATE → NER SCALE

</div>DEPLOYMENT PRINCIPLE

<div align="center">Validate first. Delegate authority progressively.

</div>
---

TECHNOLOGY

Layer	Technology

Frontend	React · TypeScript
API	FastAPI
Database	PostgreSQL / PostGIS target architecture
Intelligence	Python
ML baseline	Deterministic / interpretable prototype
Geospatial UI	MapLibre
Validation	Typed APIs · Domain rules
Testing	Pytest
Migrations	Alembic
Architecture	Modular domain services



---

REPOSITORY

TerraGuardian/
│
├── apps/
│   ├── operations-centre/
│   └── terra-guardian-safe/
│
├── services/
│   └── api/
│       ├── models/
│       ├── services/
│       ├── routers/
│       └── migrations/
│
├── intelligence/
│   ├── agents/
│   ├── evidence/
│   ├── impact/
│   ├── priority/
│   ├── risk/
│   └── vision/
│
├── ml/
├── gis/
├── tests/
├── docs/
└── README.md

Repository structure reflects the current prototype architecture. Placeholder modules are not represented as completed intelligence capabilities.


---

ENGINEERING METHOD

<div align="center">REQUIREMENT
     ↓
ARCHITECTURAL DECISION
     ↓
DOMAIN CONTRACT
     ↓
SMALL IMPLEMENTATION
     ↓
AUTOMATED TEST
     ↓
RUNTIME VERIFICATION
     ↓
INTEGRATION
     ↓
DEMO VERIFICATION
     ↓
DOCUMENTATION

</div>ENGINEERING RULES

Evidence before conclusion

Explicit state over implicit assumptions

Human authorization for critical actions

Deterministic rules for critical transitions

AI assists; governance controls

Replaceable source adapters

Persistent incident history

No unsupported causal claims

No automatic closure from absence alone

Documentation follows verification



---

RUN

Backend verification

cd services/api

python3 -m pytest tests/ -v

For the complete development environment, follow the repository's verified setup and dependency instructions.

Runtime and deployment commands must remain synchronized with the actual repository configuration.


---

RESEARCH & SUPPORTING MATERIAL

The README is intentionally the product and engineering front door.

Detailed material belongs in supporting documentation:

docs/
├── research/
│   ├── research-matrix
│   ├── prior-art
│   └── source-register
│
├── architecture/
│   ├── domain-model
│   ├── state-machines
│   └── decisions
│
├── verification/
│   ├── test-evidence
│   └── audit
│
└── demo/
    ├── golden-scenario
    └── walkthrough


---

<div align="center">TERRAGUARDIAN AI

FROM WARNING TO VERIFIED RESPONSE

<br>PREDICT → EVIDENCE → ASSESS → PRIORITIZE → DECIDE → AUTHORIZE → ACT → CONFIRM → OBSERVE → INTERPRET → REASSESS

<br><br>

> Making uncertainty an operational decision variable.



<br>SIH26001 · MDoNER · Disaster Management · Software

</div>
```
