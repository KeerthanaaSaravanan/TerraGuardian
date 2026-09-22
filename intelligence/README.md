# TerraGuardian — Intelligence Layer Contracts

## Purpose
Defines strongly typed architectural contracts, domain primitives, and data schemas for the TerraGuardian intelligence layer.

## Architecture Status
- **Status**: `DESIGN CONTRACT`
- **Runtime Status**: `NOT ACTIVE` (Contracts are isolated domain boundaries)
- **Active Operational Implementation**:
  - Decision Intelligence & NBI: `intelligence.decision` (re-exports `services/api/app/services/decision_intelligence.py`)
  - Landslide Predictive Baseline: `ml.baseline`
  - Multi-Source Reconciliation: `services/api/app/services/reconciliation_service.py`
  - Consequence Scoring: `services/api/app/services/impact_service.py`
  - Operational Priority: `services/api/app/services/priority_service.py`
  - Outcome Interpretation: `services/api/app/services/outcome_service.py`
  - Living Reassessment: `services/api/app/services/hazard_service.py`

## Package Structure
- `agents/`: Bounded agent governance contracts (zero autonomous dispatch, zero LLMs)
- `evidence/`: Multi-source evidence reconciliation contracts
- `impact/`: Multi-dimensional consequence propagation contracts
- `outcome/`: Intervention-conditioned outcome interpretation contracts
- `priority/`: Operational triage priority contracts
- `risk/`: Landslide hazard risk factor contracts
- `vision/`: Photographic evidence metadata & quality indicators (zero neural networks)
