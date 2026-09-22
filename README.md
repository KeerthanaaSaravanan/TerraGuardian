<div align="center">

# TERRAGUARDIAN AI

### FROM WARNING TO VERIFIED RESPONSE

**Landslide Operational Intelligence for the North Eastern Region of India**

[![SIH26001](https://img.shields.io/badge/SIH-26001-1f6feb?style=for-the-badge)](#)
[![Domain](https://img.shields.io/badge/Domain-Disaster%20Management-2ea043?style=for-the-badge)](#)
[![Platform](https://img.shields.io/badge/Platform-Software-8250df?style=for-the-badge)](#)
[![Status](https://img.shields.io/badge/Status-Research%20Prototype-orange?style=for-the-badge)](#)

**A warning starts an incident. It does not end one.**

[Architecture](#architecture) ·
[Research](#research) ·
[Engineering](#engineering-truth) ·
[Demonstration](#demonstration)

</div>

---

## At a Glance

| | TerraGuardian |
|---|---|
| **Problem** | Operational continuity after a hazard warning |
| **Core model** | Hazard → Evidence → Decision → Action → Outcome → Reassessment |
| **Contribution** | Intervention-Conditioned Hazard Outcome Interpretation |
| **Deployment philosophy** | Connect existing systems — don't replace them |
| **Governance** | AI assists · Rules constrain · Humans authorize |
| **Primary domain** | Landslide risk & response |
| **Region** | North Eastern Region of India |

---

# The Problem

Most hazard systems answer:

> **What may happen?**

Operational teams then have to answer:

> **What should happen next — and what can we legitimately conclude afterward?**

The difficult case is:

```text
             WARNING
                │
                ▼
          INTERVENTION
                │
                ▼
       NO OBSERVED EVENT
                │
       ┌────────┼────────┐
       ▼        ▼        ▼
    MODEL    ALTERED   EVIDENCE
     ERROR?  OUTCOME?    GAP?

A non-event is not automatically a false alarm.

An intervention followed by a non-event is not proof of prevention.

Missing evidence is not evidence of resolution.

TerraGuardian keeps the incident under bounded reassessment instead of forcing an unsupported conclusion.


---

The Operational Loop

┌─────────┐
│ PREDICT │
└────┬────┘
     ↓
┌─────────┐
│ EVIDENCE│
└────┬────┘
     ↓
┌─────────┐
│ ASSESS  │
└────┬────┘
     ↓
┌───────────┐
│ PRIORITIZE│
└────┬──────┘
     ↓
┌─────────┐
│ DECIDE  │
└────┬────┘
     ↓
┌──────────┐
│AUTHORIZE │
└────┬─────┘
     ↓
┌─────────┐
│  ACT    │
└────┬────┘
     ↓
┌───────────┐
│  CONFIRM  │
└────┬──────┘
     ↓
┌─────────┐
│ OBSERVE │
└────┬────┘
     ↓
┌───────────┐
│ INTERPRET │
└────┬──────┘
     ↓
┌────────────┐
│ REASSESS   │
└─────┬──────┘
      │
      └───────────────↺

<div align="center">ONE INCIDENT · ONE OPERATIONAL TRUTH · ONE CLOSED LOOP

</div>
---

Architecture

Operational Architecture

┌─────────────────────────────┐
                    │     HAZARD + EVIDENCE       │
                    │                             │
                    │ Forecast · Rainfall · GIS   │
                    │ Terrain · Reports · Field   │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │     INTELLIGENCE LAYER      │
                    │                             │
                    │ Risk · Confidence ·         │
                    │ Consequence · Priority ·    │
                    │ Evidence · Reconciliation  │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                 ┌──────────────────────────────────┐
                 │          INCIDENT STATE           │
                 │                                  │
                 │ One evolving state for one       │
                 │ operational incident             │
                 └───────────────┬──────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        CONSEQUENCE          DECISION            ACTION
        + PRIORITY          INTELLIGENCE        GOVERNANCE
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 ▼
                        HUMAN AUTHORIZATION
                                 │
                                 ▼
                           FIELD ACTION
                                 │
                                 ▼
                       CONFIRMATION + EVIDENCE
                                 │
                                 ▼
                         OBSERVATION / OUTCOME
                                 │
                                 ▼
                           REASSESSMENT
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
                 CONTINUE     ESCALATE     CLOSURE
                                           ASSESSMENT


---

Technical Architecture

Layer	Implementation

Interface	React · TypeScript · MapLibre
API	FastAPI · Python · Typed APIs
Persistence	PostgreSQL · PostGIS
Intelligence	Deterministic / interpretable Python baselines
Domain	Incident · Evidence · Decision · Action · Outcome · Reassessment
Integration	Adapter / API boundary for external systems


System Boundary

AUTHORITATIVE / EXTERNAL SYSTEMS
              │
              ▼
      ┌─────────────────┐
      │ Adapter / API   │
      │ Validate        │
      │ Normalize       │
      │ Provenance      │
      └────────┬────────┘
               ▼
        ┌─────────────┐
        │ TerraGuardian│
        │ Operational │
        │ Intelligence│
        └──────┬──────┘
               ▼
      DECISION → ACTION
               │
               ▼
      CONFIRM → OBSERVE
               │
               ▼
          REASSESS

> CONNECT. DON'T REPLACE.




---

Domain Safety Model

TerraGuardian deliberately prevents operational concepts from being collapsed:

Distinction	Meaning

Risk ≠ Confidence	Potential impact is different from evidence strength
Hazard ≠ Priority	Priority also considers consequence and exposure
Recommendation ≠ Authorization	AI can assist; humans authorize critical actions
Authorization ≠ Execution	Approval does not prove field execution
Execution ≠ Confirmation	Execution requires observable confirmation
Observation ≠ Interpretation	What was observed is separate from what it means
Non-event ≠ False Alarm	Absence of an observed event does not establish model error


Critical invariant

INTERVENTION + NON-EVENT
            ≠
     PROVEN PREVENTION


---

Research

TerraGuardian was shaped through:

Prior-art research · Indian ecosystem analysis · Public SIH implementation analysis

Research covered established work in:

Research area	Role in TerraGuardian

Forecast verification	Reassessment after prediction
Evidence fusion	Evidence-backed incident state
Adaptive monitoring	Selecting informative next steps
Value of information	Information-guided operations
Digital twins	Persistent incident representation
Intervention-aware warning	Post-intervention interpretation
Residual hazard	Continued risk after observed change
Human-in-the-loop systems	Authorization boundaries


The research deliberately narrowed the contribution instead of claiming these areas as individually novel.

Research Question

> When a predicted hazard is followed by an intervention and an observed non-event or altered outcome, how should an operational system distinguish model error, intervention-conditioned outcome, delayed or shifted hazard, incomplete observation and unresolved residual risk — without making an unsupported causal claim?



Contribution

INTERVENTION-CONDITIONED HAZARD OUTCOME INTERPRETATION

PREDICTION
    +
INTERVENTION
    +
OBSERVATION
    ↓
OUTCOME INTERPRETATION
    ↓
BOUNDED REASSESSMENT
    ↓
CONTINUE / ESCALATE / CLOSURE ASSESSMENT

> Not a new landslide predictor.
A bounded operational synthesis for interpreting intervention-conditioned outcomes.




---

Engineering Truth

TerraGuardian follows one rule:

> If the repository cannot prove it, the README does not claim it.



Implemented / Verified	Not Claimed

Persistent incident state	Live government integrations
Incident lifecycle	Production ML accuracy
Evidence reconciliation	Autonomous emergency response
Risk + confidence baseline	Production IAM / RBAC
Consequence + priority	Cryptographically immutable audit
Human authorization	Full offline operation
Reassessment	Causal proof of prevention



---

Engineering Model

RESEARCH
   ↓
CLAIM
   ↓
DOMAIN CONTRACT
   ↓
IMPLEMENTATION
   ↓
AUTOMATED TEST
   ↓
RUNTIME VERIFICATION
   ↓
DEMO VERIFICATION
   ↓
DOCUMENTATION

Sparse-but-true beats impressive-but-false.


---

Demonstration

The primary scenario demonstrates the complete operational lifecycle:

Stage	System state

01	Hazard predicted
02	Evidence reconciled
03	Risk / confidence / consequence assessed
04	Next action recommended
05	Human authorization
06	Action executed
07	Action confirmed
08	No event observed
09	Intervention-conditioned non-event
10	Causal prevention not established
11	Reassessment
12	Continue / escalate / closure assessment


WARNING
   ↓
DECISION
   ↓
AUTHORIZED ACTION
   ↓
CONFIRMED EXECUTION
   ↓
OBSERVED OUTCOME
   ↓
INTERPRETATION
   ↓
REASSESSMENT


---

Verification

The engineering evidence chain is:

RESEARCH → CONTRACT → CODE → TEST → RUNTIME → DEMO

The repository separates:

VERIFIED · IMPLEMENTED · PARTIAL · DESIGN · SIMULATED · FUTURE · BLOCKED · UNSUPPORTED

This prevents implementation status from being silently upgraded into production claims.


---

Repository

apps/
├── operations-centre/
└── terra-guardian-safe/

services/
└── api/

docs/
├── research/
├── architecture/
└── verification/

tests/


---

Documentation

Resource	Purpose

Research Matrix	Prior art, evidence and claim boundaries
Architecture	Domain model and system decisions
Verification	Tests and execution evidence
Demo	Reproducible operational scenario



---

Run

cd services/api

pip install -r requirements.txt

uvicorn app.main:app --reload

> Full deployment instructions follow the verified repository configuration.




---

<div align="center">TERRAGUARDIAN AI

FROM WARNING TO VERIFIED RESPONSE

One Incident · One Operational Truth · One Closed Loop

SIH26001 · MDoNER · Disaster Management · Software

</div>
