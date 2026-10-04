# Intelligence Contracts

## What

The top-level `intelligence/` package groups typed domain contracts for decision, evidence, impact, outcome, priority, risk, vision and agent boundaries.

## Responsibility

These modules define or re-export data shapes and policy vocabulary. Executable orchestration is primarily in `services/api/app/services/`; the deterministic predictive baseline is in `ml/baseline.py`.

## Interfaces

The FastAPI service uses Pydantic domain models and service methods to expose decision support, evidence reconciliation, impact/priority, outcome interpretation and reassessment through API routes. The frontend consumes those APIs through `apps/operations-centre/src/services/apiClient.ts`.

## Current implementation

This package is not an autonomous agent platform. Core behavior is deterministic service logic. The risk baseline uses expert-set coefficients and controlled inputs; it is not a trained or regionally validated model. NBI is qualitative advisory reasoning and cannot authorize actions.

## Verification

Run `python -m pytest tests/unit -q` for backend contracts/services and `npm run build` for the Operations Centre client. These checks do not validate scientific accuracy or live feeds.

## Boundaries and local development

Import the owning service or contract rather than duplicating business logic. Preserve provenance and maturity fields. “AI”, “intelligence” and “agent” directory names do not imply autonomous operation, neural inference or production validation.

## Local development

Install the backend requirements and start the API as described in the root README. Run backend tests with `python -m pytest tests/unit -q`; there is no independent server command for this contract package.
