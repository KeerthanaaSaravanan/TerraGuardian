# TerraGuardian AI — Engineering Constitution

This document is the governing engineering contract for the TerraGuardian AI platform. All contributors, modules, and AI-generated code must conform to these rules.

## 1. Product Identity

- **Product**: TerraGuardian AI
- **Tagline**: FROM WARNING TO ACTION
- **Purpose**: AI-powered closed-loop landslide risk and response intelligence for the North Eastern Region of India.
- **Core thesis**: Existing systems generate valuable hazard intelligence. TerraGuardian connects that intelligence through: Sense → Reconcile → Verify → Understand → Prioritize → Decide → Act → Confirm → Learn.
- TerraGuardian does NOT replace GSI, IMD, NRSC/NDEM, NDMA or other authoritative systems. It is an operational intelligence and coordination layer.

## 2. Two User Experiences

### Operations Centre
- Platform: Desktop/laptop web application
- Users: Authorities, disaster-management teams, field coordinators, infrastructure/road operators
- Interface: Map-first, information-dense, professional, government-grade
- Primary questions: WHAT is happening? HOW BAD is it? HOW CERTAIN are we? WHAT IS AFFECTED? WHAT SHOULD HAPPEN NEXT? WHAT ACTUALLY HAPPENED?

### TerraGuardian Safe
- Platform: Mobile-first Progressive Web App
- Users: Citizens
- Workflow: Observe → Capture/upload image → Location/context → AI image observation → Evidence creation → Risk/context analysis → Precautions → Submit → Authority workflow → Status
- Interface: Minimal, clean, rich in colour, highly legible, extremely easy to understand. Must NOT expose Operations Centre complexity.

## 3. Central Domain Object — Incident Twin

The central domain object is the INCIDENT TWIN, a living hazard/response incident.

```
Incident
├── Identity
├── Location
├── Time
├── Status
├── Evidence
├── Risk
├── Confidence
├── Impact
├── Priority
├── Verification
├── Tasks
├── Decisions
├── Actions
├── Notifications
├── Timeline
└── Outcome/Learning
```

The incident is the shared source of truth between citizen, field, and authority workflows.

## 4. Incident State Machine

Canonical lifecycle:

```
DETECTED → ASSESSING → VERIFYING → VERIFIED → DECISION_REQUIRED → AUTHORIZED → RESPONDING → MONITORING → RESOLVED → REVIEWED
```

- Do not implement arbitrary status changes.
- Backend must enforce valid transitions.

## 5. AI Safety Model

AI can: detect, analyze, estimate, explain, prioritize, recommend, coordinate, summarize.

AI must NOT independently perform safety-critical authoritative decisions:
- Evacuation declaration
- Official emergency declaration
- Authoritative road closure
- Other legally/operationally restricted actions

Human authority must exist between recommendation and safety-critical execution:

```
AI → Recommendation → Human Authority → Approve/Modify/Reject → Action → Confirmation
```

## 6. Risk and Confidence

**RISK ≠ CONFIDENCE** — Never treat these as the same quantity.

Example: HIGH RISK + LOW CONFIDENCE → FIELD VERIFICATION

Evidence quality, freshness, agreement, missing sources, and conflicts must influence confidence. Never create fake confidence values to make the interface look impressive.

## 7. Evidence Principles

Evidence sources: authoritative external, weather, satellite, terrain, sensors, citizen observations, field observations, historical data, model outputs.

Every evidence object must eventually support: source, type, timestamp, location, provenance, freshness, confidence/contribution, processing status, original reference.

Do not fabricate external evidence.

## 8. Real Data Policy

Target real/free data sources: IMD, MOSDAC, Copernicus/Sentinel, OpenStreetMap, Bhuvan, DEM/terrain, historical landslide data, citizen uploads.

External APIs must be isolated behind connector interfaces:

```
FETCH → VALIDATE → NORMALIZE → GEOREFERENCE → TIMESTAMP → PROVENANCE → CACHE → STORE → PUBLISH EVENT
```

Frontend must never directly depend on raw external API responses.

## 9. Data Classification

| Category | Examples |
|---|---|
| REAL | Real geography, infrastructure, weather, satellite observations, user submissions |
| MODEL | Predicted risk, predicted hazard footprint, derived impact |
| SIMULATED | Demo sensor streams, controlled disaster scenarios, synthetic event progression |
| AUTHORITATIVE/HUMAN | Official verification, decisions, actions |

Never present simulated data as real-world observations.

## 10. Core Operational Model

Built around: IDENTITY, AUTHORITY, INTENT, PROVENANCE, CONFORMANCE.

Every agent must eventually have: identity, purpose, allowed tools, authority boundary, input contract, output contract, provenance, policy constraints, conformance checks.

Do not create a swarm of arbitrary LLM agents. Agents should primarily be deterministic services/workflows. LLMs used only where language/vision reasoning adds genuine value.

## 11. Architectural Principles

1. Modular monolith first where appropriate
2. Avoid premature microservices
3. Strong domain boundaries
4. API contracts before frontend assumptions
5. Database migrations are version controlled
6. Spatial data uses proper geographic types
7. External APIs isolated behind adapters/connectors
8. No secrets in source code
9. No fake production claims
10. No hardcoded business logic inside UI components
11. Safety-critical actions require explicit authorization
12. Every important operational event should be auditable
13. Design for offline field workflows
14. Prefer deterministic logic over unnecessary LLM calls
15. Keep provider dependencies replaceable
16. Every major module must be testable independently
17. UI must consume typed domain/API contracts
18. Avoid unnecessary infrastructure until required

## 12. Security Rules

- Never commit API keys
- Use environment variables for all secrets
- Maintain `.env.example` with key names only
- Do not store secrets in frontend code
- Validate all external input
- Prepare for RBAC (Role-Based Access Control)
- Prepare for audit logging
- Do not trust client-provided risk or authority decisions
- Server remains authoritative for all business state

## 13. Visual Design Rules

Do not introduce:
- Generic SaaS dashboard aesthetics
- Excessive gradients
- Random glassmorphism
- Giant AI-brain graphics
- Unnecessary 3D illustrations
- Unrelated colour palettes
- Random fonts
- Decorative UI that competes with operational information

The citizen UI must remain simpler than the administrative UI while sharing the same brand system.

## 14. Anti-Vibe-Coding Rules

Do NOT:
- Generate the entire application in one pass
- Invent undocumented architecture
- Install unnecessary dependencies
- Create fake API integrations
- Create fake ML models
- Hardcode fake real-world claims
- Generate arbitrary dashboard data
- Create placeholder features and pretend they work
- Replace PostGIS with simple coordinates if spatial functionality requires PostGIS
- Introduce unnecessary agent frameworks
- Add random UI components
- Redesign the supplied reference interfaces
- Create production claims without validation

If a decision is ambiguous, document the decision and choose the simplest architecturally sound option.

## 15. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI | Tailwind CSS, Custom design system |
| Maps | MapLibre GL JS |
| Citizen PWA | Service Worker, IndexedDB, Camera, GPS, Offline queue |
| Backend | Python, FastAPI, Pydantic, SQLAlchemy, Alembic |
| Database | PostgreSQL, PostGIS |
| GIS | GeoPandas, Shapely, Rasterio, GDAL, PyProj |
| ML | scikit-learn initially |
| Testing | pytest, Vitest, Playwright |
| DevOps | Git, GitHub, Docker, Docker Compose |

---

*This constitution is a living document. Changes require documented justification and team review.*
