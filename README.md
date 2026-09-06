# TerraGuardian AI

> **FROM WARNING TO ACTION**

AI-powered closed-loop landslide risk and response intelligence for the North Eastern Region of India.

---

## What is TerraGuardian?

TerraGuardian is an operational intelligence and coordination layer that connects hazard intelligence to action:

**Sense → Reconcile → Verify → Understand → Prioritize → Decide → Act → Confirm → Learn**

It does **not** replace authoritative systems (GSI, IMD, NRSC/NDEM, NDMA). It integrates their outputs into a unified operational picture with human-in-the-loop safety-critical decision-making.

## Two User Experiences

| Experience | Platform | Users |
|---|---|---|
| **Operations Centre** | Desktop web | Authorities, disaster-management teams, field coordinators |
| **TerraGuardian Safe** | Mobile PWA | Citizens |

## Repository Structure

```
TerraGuardian/
├── apps/
│   ├── operations-centre/    # Desktop Operations Centre (React/TypeScript/Vite)
│   └── terra-guardian-safe/  # Citizen PWA (React/TypeScript/Vite)
├── services/
│   └── api/                  # Backend API (Python/FastAPI)
├── intelligence/
│   ├── risk/                 # Risk assessment modules
│   ├── evidence/             # Evidence processing
│   ├── impact/               # Impact analysis
│   ├── priority/             # Prioritization logic
│   ├── vision/               # Image/vision analysis
│   └── agents/               # Bounded reasoning agents
├── data/
│   ├── connectors/           # External data source adapters
│   ├── ingestion/            # Data ingestion pipelines
│   └── fixtures/             # Test/demo data fixtures
├── gis/                      # GIS utilities
├── ml/                       # ML models and training
├── database/                 # Schema, migrations, spatial
├── tests/                    # Test suites
├── assets/                   # Brand, reference UI, icons
├── docs/                     # Engineering documentation
└── docker/                   # Docker configurations
```

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Maps | MapLibre GL JS |
| Backend | Python, FastAPI, Pydantic v2 |
| Database | PostgreSQL + PostGIS |
| GIS | GeoPandas, Shapely, Rasterio, GDAL |
| ML | scikit-learn (initially) |
| Testing | pytest, Vitest, Playwright |
| DevOps | Docker, Docker Compose, Git |

## Quick Start

### Prerequisites

- Node.js ≥ 20
- Python ≥ 3.11
- PostgreSQL 16 + PostGIS 3.4 (for full backend)
- Docker & Docker Compose (optional)

### Backend

```bash
cd services/api
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -e ".[dev]"
uvicorn app.main:app --reload
```

### Frontend — Operations Centre

```bash
npm install          # from repo root (installs all workspaces)
npm run dev:ops      # starts Operations Centre on localhost:5173
```

### Frontend — TerraGuardian Safe

```bash
npm run dev:safe     # starts Safe on localhost:5174
```

### Tests

```bash
# Backend
cd services/api && python -m pytest ../../tests/ -v

# Frontend
npm run test:ops
npm run test:safe

# E2E
npm run test:e2e
```

## Documentation

Engineering documentation is maintained in [`docs/`](./docs/). Start with the [Engineering Constitution](./docs/00-engineering-constitution.md).

## License

TBD — Internal / SIH 2026

## Status

**Phase 0** — Engineering foundation established. No production features implemented yet.
