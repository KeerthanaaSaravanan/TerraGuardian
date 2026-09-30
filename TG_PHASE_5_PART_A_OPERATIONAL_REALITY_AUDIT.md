# PART A — OPERATIONAL PRODUCT REALITY AUDIT
**Document ID:** `TG-PHASE-5-PARTA-OPERATIONAL-REALITY-AUDIT`  
**Execution Timestamp:** 2026-09-27T20:55:00+05:30  
**Phase Position:** Phase 4R Frozen | Phase 5 Entry Readiness Audit (Part A)  
**Governing Standard:** REALITY > AGENT REPORT | RUNTIME > DOCUMENTATION | TRUTHFULNESS > DEMO JARGON  

---

## 1. Environment

| Component | Verified Local Specification | Status |
| :--- | :--- | :--- |
| **Operating System** | Windows 11 Enterprise (amd64) | Active |
| **Backend Runtime** | Python 3.11.9 (Uvicorn 0.34.0, FastAPI 0.115.8) | Active on `http://127.0.0.1:8000` |
| **Database Engine** | SQLite 3.45.3 with async SQLAlchemy (`terraguardian.db`) | Active (`services/api/terraguardian.db`) |
| **Operations Centre** | Vite 6.4.3 / React 19.1.0 / Tailwind CSS / Leaflet 1.9.4 | Active on `http://127.0.0.1:5173` |
| **Safe Citizen PWA** | Vite 6.3.0 / React 19.1.0 / TypeScript 5.7.0 | Active on `http://127.0.0.1:5174` |
| **Active Browser** | Chromium / Headless automation probe | Verified |
| **API Base URL** | `http://127.0.0.1:8000/api/v1` | Verified HTTP 200 |
| **Primary Incident Under Test** | **`TG-2048`** (`7b3bb54d-7faa-4f1b-97e3-c9ef2febf5f9`) | Verified Active |

---

## 2. Frozen Baseline

- **Current Git Commit:** `20042bd` (`fix(branding): enhance logo visibility with clean white background containers and optimized shield assets`)
- **Git Status:** 24 modified tracked files, 15 untracked operational files (adapters, GIS engine, tests).
- **Baseline Classification:** `CHANGED — NON-BREAKING` (All changes are within the approved Phase 4R/5 discovery envelope).
- **Backend Test Suite:** **189 / 189 tests passing** in 302.40s (`pytest tests/unit`).
- **Frontend Build Status:**
  - `apps/operations-centre`: Build Clean (`tsc -b && vite build` succeeded).
  - `apps/terra-guardian-safe`: Build Clean (`tsc -b && vite build` succeeded).

---

## 3. Application Startup

1. **Operations Centre (`http://127.0.0.1:5173`):**
   - Loads immediately (Vite ready in 812 ms). HTTP 200 OK.
   - Top banner displays: `OPERATIONAL (API Connected: 127.0.0.1:8000)`.
   - Incident queue loads incident `TG-2048`.
2. **API Health Probe (`GET http://127.0.0.1:8000/health`):**
   - Response: `{"status": "ok", "service": "terraguardian-api", "version": "0.0.1"}` (HTTP 200 OK).
3. **Console & Network Inspection:**
   - No fatal JavaScript exceptions on initial load.
   - Network requests to `/api/v1/incidents`, `/api/v1/gis/incidents/spatial`, and `/health` return HTTP 200.

---

## 4. Primary Navigation

The Operations Centre implements two navigation layers:

### A. Primary Rail Navigation (Global)
- **`INCIDENTS` (`IconRadar`):** Loads regional incident queue with active living twin `TG-2048`. **PASS**.
- **`MAP` (`IconLayers`):** Opens tactical GIS map with vector layers (boundaries, roads, settlements, infrastructure). **PASS**.
- **`EVIDENCE` (`IconShieldCheck`):** Opens Multi-Source Evidence Reconciliation workspace. **PASS**.
- **`ALERTS` (`IconActivity`):** Opens Early Warning & Impact Priority Cascade view. **PASS**.
- **`REVIEW` (`IconClock`):** Opens Review Workspace & Forensic Replay Timeline. **PASS**.

### B. Incident-Level Sub-Navigation (`IncidentWorkspaceView`)
- **`OVERVIEW`:** Digital twin banner, 4-dimensional status indicators, road corridor callouts. **PASS**.
- **`EVIDENCE`:** Reconciles multi-source sensor and ground feeds against incident centroid. **PASS**.
- **`ASSESSMENT`:** Predictive hazard baseline, feature log-odds attribution, model metrics. **PASS WITH CONDITIONS** (Scientific claims require qualification).
- **`ACTIONS`:** Task tracking, dispatch states, field verification dispatch. **PASS**.
- **`OUTCOME`:** Closed-loop mitigation outcome assessment. **PASS**.
- **`TIMELINE`:** Cryptographic-style audit ledger event trace. **PASS**.

**Architecture Note:** The interface supports both `OPERATIONAL` mode (free-form incident navigation) and legacy `WALKTHROUGH` mode (guided 11-step sequence). While operational mode is active by default, residual step-based context triggers exist.

---

## 5. Incident Persistence

- **Incident Code:** `TG-2048`
- **Database UUID:** `7b3bb54d-7faa-4f1b-97e3-c9ef2febf5f9`
- **Initial Values Displayed:**
  - Operational Status: `VERIFYING`
  - Hazard State: `EXPECTED`
  - Risk Score / Level: `86.0` / `HIGH`
  - Evidential Confidence: `54.0` / `MODERATE`
  - Priority Level / Score: `P1_CRITICAL` / `89.7`
  - Evidence Count: `4`
  - Action Count: `4`
- **Browser Refresh Test:**
  - Values re-fetched from `GET /api/v1/incidents/7b3bb54d-7faa-4f1b-97e3-c9ef2febf5f9` and `GET /api/v1/incidents/code/TG-2048`.
  - Exact values persist across full hard refresh: `86.0`, `54.0`, `P1_CRITICAL`, `VERIFYING`.
- **Sub-Tab Navigation Test:**
  - Navigating `Overview → Evidence → Assessment → Actions → Outcome → Timeline → Overview` does not mutate backend state.
  - Sub-views fetch live from backend API client.

---

## 6. Single Source of Operational Truth

| Screen / Component | Incident State | Risk Score / Level | Confidence Score / Level | Priority Score / Level | Evidence Count | Discrepancy / Root Cause |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Top Header Bar** | `VERIFYING` | `86%` (`HIGH`) | `54%` (`MODERATE`) | `89.7` (`P1_CRITICAL`) | `4` | None (Canonical backend twin) |
| **Incident Overview** | `VERIFYING` | `86 / 100` (`HIGH`) | `54 / 100` (`MODERATE`) | `CRITICAL (P1)` | `4` | Consistent |
| **Evidence Reconciliation** | `VERIFYING` | `86%` (`HIGH`) | `54%` (`MODERATE`) | `CRITICAL` | `4` | Consistent |
| **Impact & Priority** | `VERIFYING` | `86%` (`HIGH`) | `54%` (`MODERATE`) | `89.7` (`P1_CRITICAL`) | `4` | Consistent |
| **Field Verification View** | `VERIFYING` | `86%` (`HIGH`) | **`54%` (`HIGH`)** *(Mismatch)* | `CRITICAL` | `4` | **TG-003**: Hardcoded label `HIGH (54%)` in UI |
| **Authority Decision View** | `VERIFYING` | `86%` (`HIGH`) | `54%` (`MODERATE`) | `CRITICAL (P1)` | `4` | Consistent |
| **Actions Tracking View** | `VERIFYING` | `86%` (`HIGH`) | `54%` (`MODERATE`) | `CRITICAL (P1)` | `4` | Consistent |
| **Outcome Confirmation** | `VERIFYING` | `86%` (`HIGH`) | `54%` (`MODERATE`) | `CRITICAL` | `4` | Consistent |
| **Audit Timeline** | `VERIFYING` | `86%` (`HIGH`) | `54%` (`MODERATE`) | `89.7` (`P1_CRITICAL`) | `11 events` | Consistent |
| **Bounded Reassessment** | `DELAYED` *(Projection)* | `84 / 100` (`HIGH`) | `62 / 100` (`MODERATE`) | `P1` *(Simulated)* | `4` | Expected (Shows post-divergence hypothetical) |

---

## 7. Confidence Classification (Defect TG-003)

- **Backend Canonical Standard:**
  - `ConfidenceLevel.MODERATE` is explicitly defined in `app/domain/enums.py`.
  - `initial_confidence_score = 54.0` in `app/domain/hazard.py:98`.
  - `confidence_score = 54.0` maps to `MODERATE` in `seed_service.py:72`.
- **Frontend Discrepancy Found:**
  - In `FieldVerificationView.tsx:109`:
    ```tsx
    Evidence Confidence Elevated: <span className="...">MODERATE (54%)</span>
    → <span className="...">HIGH ({confidenceScore}%)</span>
    ```
  - When `confidenceScore` is 54, the rendered string is literally:
    `"MODERATE (54%) → HIGH (54%)"`
  - **Classification:** **CONFIRMED DEFECT (TG-003)**. Caused by hardcoded `"HIGH"` label in `FieldVerificationView.tsx` instead of deriving the level dynamically from `confidenceScore`.

---

## 8. Evidence Workflow

- **Backend Query:** `GET /api/v1/incidents/7b3bb54d-7faa-4f1b-97e3-c9ef2febf5f9/evidence` (HTTP 200 OK).
- **Persisted Evidence Records (4 Items):**
  1. `d12f86ac-d062-48a6-ab05-dccd53929c92`: `HISTORICAL` | `BRO Project Vartak Highway Log` | `VERIFIED`
  2. `b1338bae-df7d-4741-98fc-44e61f1b54e0`: `TERRAIN` | `GSI NLSM Geomorphology Baseline` | `VERIFIED`
  3. `b9e9ad82-0379-4cae-9842-d25688c10448`: `SATELLITE` | `Sentinel-2 / Sentinel-1 SAR` | `CONFLICTED` (88% optical cloud cover)
  4. `6d0f418f-9a75-4fc5-a8c4-e774c4506dcb`: `WEATHER` | `Bhalukpong AWS #428` | `UNVERIFIED` (Extreme precipitation trigger)
- **Provenance Transparency:** Provenance classes (`REAL_HISTORICAL`, `REPLAY`, `LIVE`) and freshness timers are displayed on evidence cards.
- **Traceability Test:**
  - `d12f86ac-d062-48a6-ab05-dccd53929c92` traced: SQLite DB → FastAPI Response → `EvidenceReconciliationView` card. Identifiers match exactly.

---

## 9. Duplicate / Test Data Analysis (Defect TG-004)

- **Database Inspection (`SELECT count(*), incident_id FROM evidence GROUP BY incident_id`):**
  - Current active twin (`7b3bb54d`): 4 evidence records.
  - Previous test runs (`39c7302d` & `90a984eb`): **11 evidence records each**.
- **Inspection of 11-Record Incidents:**
  - Identical `SENSOR | DWR Mohanbari Sector Scan (Replay Telemetry)` repeated 3 times.
  - Identical `CITIZEN | TerraGuardian Safe Citizen App` repeated 3 times.
- **Root Cause Trace:**
  - During repeated E2E test runs, automated tests invoked `POST /api/v1/incidents/{id}/evidence` repeatedly without payload deduplication or test fixture cleanup.
  - Foreign key cascading is disabled by default in SQLite, leaving orphaned evidence records attached to past test incident IDs.
  - **Classification:** **CONFIRMED DEFECT (TG-004)**. Test contamination accumulated across test cycles.

---

## 10. Action Lifecycle

- **Canonical State Transitions:**
  `PROPOSED` → `APPROVED` → `DISPATCHED` → `ACKNOWLEDGED` → `IN_PROGRESS` → `COMPLETED` → `PHYSICALLY_CONFIRMED`
- **Persisted Tasks on TG-2048 (4 Actions):**
  1. `ACT-TRAFFIC-KM38`: `West Kameng Traffic Police` | `PHYSICALLY_CONFIRMED`
  2. `ACT-BRO-EQUIP-40`: `Border Roads Organisation` | `DISPATCHED`
  3. `ACT-NDRF-STANDBY`: `12 Bn NDRF Itanagar` | `ACKNOWLEDGED`
  4. `ACT-PUBLIC-ADVISORY`: `District Disaster Management Authority` | `COMPLETED`
- **Execution Verification:**
  - Each action transition is backed by `POST /api/v1/incidents/{id}/actions/{action_id}/transitions`.
  - Physical confirmation creates an immutable audit event (`ACTION_PHYSICALLY_CONFIRMED`) with confirming officer badge number.

---

## 11. Authorization

- **Unauthenticated Access Test:**
  - `GET /api/v1/incidents/{id}/timeline` without token: **HTTP 401 Unauthorized** (WWW-Authenticate: Bearer).
- **Authenticated Operator Test:**
  - Login as `operator` / `Terra#Op2026`: HTTP 200 OK. Bearer token issued.
  - `GET /api/v1/incidents/{id}/timeline` with token: **HTTP 200 OK** (11 audit events).
- **Unauthorized Role Test:**
  - Login as `citizen` / `Citizen#2026`: HTTP 200 OK. Role: `PUBLIC_CITIZEN`.
  - Attempt `POST /api/v1/incidents/{id}/transitions` as citizen:
    **HTTP 403 Forbidden** (`"Access forbidden: User with role 'PUBLIC_CITIZEN' is not authorized. Required roles: ['AUTHORIZED_DECISION_MAKER', 'OPERATOR']"`).
- **Verdict:** Authorization boundary operates correctly according to security requirements.

---

## 12. Closure Governance

- **Premature Closure Test:**
  - Operator attempts `POST /api/v1/incidents/{id}/transitions` with `target_status: "RESOLVED"`.
  - Response: **HTTP 400 Bad Request** (`"Transition REJECTED: Cannot transition incident from state 'VERIFYING' to 'RESOLVED'. Reason: Closure blocked: Direct state jump is not permitted by the canonical state machine."`).
- **Semantic Distinction Verification:**
  - The domain engine explicitly prohibits equating `NON_EVENT` with `FALSE_ALARM`.
  - In `app/services/outcome_service.py`, `PREVENTED_BY_INTERVENTION` requires physical barricade confirmation and verified debris in runout corridor, preventing false claims of natural prevention.

---

## 13. GIS Runtime Audit

- **Map Substrate:** Leaflet 1.9.4 rendered within `InteractiveMap.tsx`.
- **Vector Layers Rendering:**
  - District Boundary: West Kameng Polygon rendered in emerald stroke.
  - Strategic Corridors: NH-13 Trans-Arunachal Highway (KM 0 to KM 112) LineString rendered with sole lifeline criticality styling.
  - Settlements: 4 villages (Lower Bhalukpong, Tenga Market, Dahung, Rupa) rendered as circle markers with population exposure tooltips.
  - Critical Infrastructure: 4 lifeline assets (West Kameng District Civil Hospital, Bhalukpong Primary Health Centre, KM-42 Kameng River Girder Bridge, BRO Heavy Equipment Staging Post) rendered with distinct SVG icons.
- **Incident Pin:** Renders at `27.0842° N, 92.5681° E` with animated hazard ring and priority pill.

---

## 14. GIS API-Key / Basemap Investigation (Defect TG-006)

- **Basemap URL Configured (`InteractiveMap.tsx:127-130`):**
  - Dark: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
  - Light: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
- **Network Verification:**
  - Direct HTTP fetch of tile `https://a.basemaps.cartocdn.com/dark_all/10/832/439.png`: **HTTP 200 OK** (2,513 bytes, image/png).
  - No "API KEY REQUIRED" watermark is emitted by CartoDB basemaps.
- **Forensic Investigation of TG-006:**
  - Third-party tile providers (e.g. Stadia Maps, Thunderforest, MapTiler) impose hard paywalls and stamp "API KEY REQUIRED" across tiles when no API token is supplied.
  - The repository was migrated to CartoDB basemaps during Phase 4R, resolving tile blocking.
  - **Verdict:** CartoDB basemap is operational and unwatermarked in the current runtime. Defect TG-006 is **TRACED & MITIGATED** in active code, but requires explicit environment documentation to avoid regression.

---

## 15. GIS Layer Verification

| Layer Name | API Endpoint | HTTP Status | Feature Count | Geometry Type | Provenance Class |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **District Boundary** | `/api/v1/gis/layers/boundaries` | **200 OK** | 1 | Polygon | `REAL_HISTORICAL` |
| **Highway Corridors** | `/api/v1/gis/layers/roads` | **200 OK** | 2 | LineString | `REAL_HISTORICAL` |
| **Settlements** | `/api/v1/gis/layers/settlements` | **200 OK** | 4 | Point | `REAL_HISTORICAL` |
| **Critical Infrastructure** | `/api/v1/gis/layers/infrastructure` | **200 OK** | 4 | Point | `REAL_HISTORICAL` |
| **Spatial Incidents** | `/api/v1/gis/incidents/spatial` | **200 OK** | 1 | Point | `REPLAY` |

Every layer toggles independently via the GIS layer control panel.

---

## 16. GIS Coordinate Verification

- **GeoJSON Standard:** Coordinates serialized as `[longitude, latitude]` (`[92.5681, 27.0842]`).
- **Leaflet Standard:** Leaflet coordinates ingested as `[latitude, longitude]` (`[27.0842, 92.5681]`).
- **Coordinate Transformation:** Explicitly handled in `InteractiveMap.tsx:222` (`r.geometry_geojson.coordinates.map(([lon, lat]) => [lat, lon])`).
- **Spatial Association Test (`POST /api/v1/gis/spatial-association`):**
  - Input: `latitude: 27.0842`, `longitude: 92.5681`, `incident_id: 7b3bb54d-7faa-4f1b-97e3-c9ef2febf5f9`.
  - Output: `distance_meters: 0.0`, `association_status: "ATTACHED"` (Threshold: `<= 5000.0m`).
  - Geodetic engine confirms exact spatial centroid binding.

---

## 17. API Failure Behavior

- **Backend Shutdown Test:**
  - With FastAPI backend halted, client health check fails.
- **Observed Behavior:**
  - `DemoHeader.tsx` renders top red alert banner: `Unable to connect to TerraGuardian API at http://127.0.0.1:8000/api/v1. Operational data unavailable. Reconnecting... [Degraded Offline State]`.
  - Header status pill transitions to: `API OFFLINE` (red pulsing indicator).
  - `InteractiveMap.tsx` renders central error overlay: `API OFFLINE: Unable to load GIS layers from http://127.0.0.1:8000/api/v1`.
- **Finding (TG-010):**
  - While header and map display truthful offline warnings, certain incident sub-views (`ImpactPriorityView`, `IncidentWorkspaceView`) fall back to in-memory React state (`deterministicScenario.ts`), displaying stale demo data rather than an explicit empty/error view.

---

## 18. Recovery Behavior

- **Backend Restart Test:**
  - Uvicorn restarted on port 8000.
- **Observed Behavior:**
  - Health check polling detects active backend within 2 seconds.
  - Red banner automatically dismisses.
  - Header badge updates to `OPERATIONAL (API Connected: 127.0.0.1:8000)`.
  - Vector GIS layers reload and render cleanly without browser refresh.
  - No duplicate data or orphaned sessions created during reconnection.

---

## 19. Safe Citizen Chain (Defect TG-007)

- **PWA Application (`http://127.0.0.1:5174`):**
  - **Inspection:** `apps/terra-guardian-safe/src/App.tsx` is an isolated, static visual shell.
  - Button `<button type="button">Report Observation</button>` has **NO `onClick` handler**.
  - Navigation links have **NO routes or event listeners**.
  - No `fetch` or HTTP client exists in `apps/terra-guardian-safe/src/` outside of service worker asset caching.
- **Operations Centre Embedded Citizen Flow:**
  - The actual functional citizen reporting flow is implemented in `apps/operations-centre/src/components/public/` via `PublicReportContext.tsx`.
  - Submissions successfully post to `POST /api/v1/incidents/{id}/evidence` with `source: CITIZEN`, `provenance: REAL_CITIZEN_SUBMISSION`, and `interpretation: UNVERIFIED`.
- **Classification:** **CONFIRMED DEFECT (TG-007)**. Port 5174 is an orphaned mockup, while the working citizen submission logic is embedded inside the Operations Centre dashboard.

---

## 20. ML Claim Audit (Defect TG-002)

Audit of claims on Assessment subtab (`IncidentWorkspaceView.tsx:470-480`):

| UI Claim | Actual Implementation in Codebase | Scientific Truth Verdict |
| :--- | :--- | :--- |
| **"Validation Protocol: 5-Fold Corridor Holdout Validation"** | `ml/baseline.py:328-332` executes a **single hardcoded holdout split** (`groups == "Tawang"`), not 5-fold cross-validation. | **UNSUPPORTED / FICTITIOUS CLAIM** |
| **"Brier Calibration Score: 0.114"** | Hardcoded UI string. In `ml/baseline.py`, Brier score is computed on a 200-sample `np.random.uniform` synthetic array. | **UNSUPPORTED BENCHMARK CLAIM** |
| **"Evaluated on historical North Eastern Region corridor holdout splits"** | No empirical NER landslide dataset is connected. Benchmark data is generated via `np.random.seed(42)` and `np.random.uniform(50.0, 220.0, size=200)`. | **FALSE / SYNTHETIC ONLY** |
| **"Model predictions calibrated with Doppler Weather Radar"** | No Doppler radar calibration pipeline exists in the codebase. Predictions are logistic regression on 4 synthetic variables. | **FALSE / UNSUPPORTED CLAIM** |

**Classification:** **CONFIRMED DEFECT (TG-002)**. The frontend displays impressive academic/meteorological claims that have no basis in the actual code or data.

---

## 21. Scientific Terminology Audit (Defect TG-005)

Investigation of the phrase: **"184 mm hydrostatic pore pressure"** (`IncidentWorkspaceView.tsx:557, 617`):

- **Code Trace:**
  - `seed_service.py:104`: `metric="184.6 mm / 24h"` (Antecedent 24-hour rainfall accumulation).
  - `seed_service.py:250`: `payload={"rainfall_24h": 184.6, "threshold": 120.0}`.
  - `feature_pipeline.py:129`: `rain_7d = 184.0` (Precipitation surcharge in millimeters).
- **Physical Evaluation:**
  - Rainfall accumulation is measured in millimeters of water depth (\(\text{mm}\)).
  - Pore-water pressure is measured in kilopascals (\(\text{kPa}\)), bars, or meters of piezometric head (\(\text{m } \text{H}_2\text{O}\)).
  - Describing 184 mm of rainfall as "184mm hydrostatic pore pressure" conflates hydrometeorological input with geotechnical pore pressure.
  - No piezometer or pore-pressure sensor exists at KM-42 measuring 184 kPa.
- **Classification:** **CONFIRMED DEFECT (TG-005)**. Scientifically invalid terminology conflating precipitation depth with pore-water pressure.

---

## 22. Operational UI Terminology

| UI Terminology | Visible Location | Classification | Rationale |
| :--- | :--- | :--- | :--- |
| **Deterministic Reconciliation Engine** | Evidence Reconciliation View | **INTERNAL / DEVELOPER TERMINOLOGY** | Sounds like software architecture rather than operational disaster management. |
| **Living Hazard Object** | Header Banner / Incident View | **RESEARCH / DEVELOPER TERMINOLOGY** | Object-oriented paradigm terminology exposed to civil defense operators. |
| **Downstream Consequence Cascade** | Impact Priority View | **OPERATIONALLY APPROPRIATE** | Clearly communicates secondary infrastructure impacts. |
| **Replay Telemetry** | Map Footer & Evidence Cards | **USEFUL PROVENANCE** | Truthfully discloses that sensor data is simulated/historical replay. |
| **Physics-Informed Baseline** | Assessment Subtab | **RESEARCH TERMINOLOGY** | Logistic regression with physical threshold weights. |
| **Closed-Loop Verification** | Confirmation View | **OPERATIONALLY APPROPRIATE** | Standard emergency management terminology. |

---

## 23. Console / Network Forensics

- **Console Inspection:** Clean. No uncaught JavaScript promises or runtime crashes.
- **Network Request Log:**
  - `GET /api/v1/incidents`: HTTP 200 OK.
  - `GET /api/v1/incidents/{id}`: HTTP 200 OK.
  - `GET /api/v1/gis/incidents/spatial`: HTTP 200 OK.
  - `GET /api/v1/gis/layers/*`: HTTP 200 OK (all 4 layers).
  - `GET /api/v1/incidents/{id}/timeline`: HTTP 401 (when unauthenticated) → HTTP 200 (with bearer token).
- **Hardcoded URLs:** `apiClient.ts` uses `import.meta.env.VITE_API_URL || "/api/v1"` with fallback to `http://127.0.0.1:8000/api/v1`.

---

## 24. UI / UX Audit

- **Visual Presentation:** Professional government-grade dark/light palette, high contrast, crisp typography.
- **Information Hierarchy:**
  - Digital twin banner clearly separates Risk (86%) from Confidence (54%).
  - Priority indicator (`CRITICAL P1`) correctly dominates the visual hierarchy.
- **Identified UX Deficiencies:**
  - Mode confusion: Dual presence of `OPERATIONAL` mode and 11-step `WALKTHROUGH` demo rail.
  - Disconnected Citizen App: Standalone citizen PWA on port 5174 lacks basic interactivity.

---

## 25. Existing Defect Ledger

| Defect ID | Description | Severity | Forensic Audit Finding & Evidence | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TG-001** | Risk / Confidence inconsistency across UI | **P1** | Reassessment shows projected `84% / 62%` while header maintains authoritative `86% / 54%`. Traceable to projection vs. state machine distinction. | **OPEN** |
| **TG-002** | Unsupported ML validation claims | **P0** | UI claims "5-fold holdout validation" and "Doppler radar calibration"; code in `ml/baseline.py` uses `np.random.uniform` on 200 rows with single split. | **OPEN (REPRODUCED)** |
| **TG-003** | 54% confidence receives inconsistent qualitative labels | **P1** | In `FieldVerificationView.tsx:109`, text renders `MODERATE (54%) → HIGH (54%)` due to hardcoded `"HIGH"` label in JSX. | **OPEN (REPRODUCED)** |
| **TG-004** | Repeated test data contaminating evidence | **P1** | SQLite DB contains 38 evidence records; past test incident `39c7302d` has 11 records with 3x duplicate DWR and Citizen rows. | **OPEN (REPRODUCED)** |
| **TG-005** | Scientific terminology: "184mm pore pressure" | **P0** | Conflates 184.6 mm cumulative rainfall with pore pressure; no pore-water transducer exists. | **OPEN (REPRODUCED)** |
| **TG-006** | GIS basemap displays "API KEY REQUIRED" watermarks | **P2** | Resolved in current runtime via CartoDB migration; external providers (Stadia/Thunderforest) must be avoided without keys. | **MITIGATED / TRACKED** |

---

## 26. New Findings Ledger (TG-007+)

| Defect ID | Description | Severity | Forensic Evidence & Architectural Impact |
| :--- | :--- | :--- | :--- |
| **TG-007** | Safe Citizen standalone PWA (port 5174) is a non-functional static shell | **P1** | `apps/terra-guardian-safe/src/App.tsx` has no click handlers, no API client, and no network calls. Working citizen flow is trapped inside Operations Centre. |
| **TG-008** | Dual navigation modes (`OPERATIONAL` vs `WALKTHROUGH`) cause cognitive confusion | **P2** | `App.tsx:185-207` alternates between full operational workspaces and a rigid 11-step demo script. Operators can get trapped in wizard steps. |
| **TG-009** | Missing SQLite Foreign Key Cascading causes evidence record leakage | **P2** | Deleting or recreating incidents leaves orphaned evidence records in SQLite `evidence` table, creating database bloat across test runs. |
| **TG-010** | In-memory fallback partially masks API disconnect on sub-views | **P2** | When API goes offline, sub-views fallback to static objects in `deterministicScenario.ts`, presenting stale operational state. |

---

## 27. Part A Verdict

```
================================================================================
PART A VERDICT: CORRECTION REQUIRED (READY FOR REMEDIATION PLAN)
================================================================================
```

### Rationale:
1. **Core Runtime & GIS are genuinely functional:** The FastAPI backend, database models, spatial query engine, CartoDB Leaflet substrate, and authorization RBAC gates all execute with 100% integrity (189/189 tests passing, HTTP 200 on all operational endpoints).
2. **Defects TG-002, TG-003, TG-004, and TG-005 are confirmed by empirical code evidence:**
   - TG-002: Exaggerated ML validation claims without empirical data backing.
   - TG-003: Hardcoded `HIGH (54%)` string in `FieldVerificationView.tsx`.
   - TG-004: Duplicate evidence accumulation across test runs in SQLite.
   - TG-005: Conflation of antecedent rainfall depth (mm) with pore pressure.
   - TG-007: Safe Citizen standalone app on port 5174 is an unlinked static mockup.
3. **No code or architecture was modified during this audit:** The application state has been preserved in its frozen baseline.

**Next Action:** Proceed to Part B / Remediation Planning per user direction.
