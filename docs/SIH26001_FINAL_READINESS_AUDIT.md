# SIH26001 Final Readiness Audit (TerraGuardian AI)

> **Assessment scope:** This is a capability/maturity snapshot, not a Production certification. `IMPLEMENTED` and `CONTROLLED DEMO` do not mean live external feeds. See the root [README](../README.md) for current verification and deployment boundaries.

Status legend: **IMPLEMENTED** (executable code + tests) · **CONTROLLED DEMO** (replay/seeded data, not live) · **ADAPTER READY** (schema/adapter only, no live feed) · **EXPERIMENTAL**.

| # | Capability | Status | Notes |
|---|-----------|--------|-------|
| 1 | Incident lifecycle state machine (DETECTED → REVIEWED, REOPENED) | IMPLEMENTED | `tests/unit/test_canonical_lifecycle.py` |
| 2 | Human-authorized actions (Recommendation != Authorization) | IMPLEMENTED | action/authorization services |
| 3 | Evidence & provenance lineage | IMPLEMENTED | evidence service |
| 4 | Rainfall ingestion | ADAPTER READY / CONTROLLED DEMO | No live IMD feed connected |
| 5 | Soil moisture | ADAPTER READY | No live feed |
| 6 | InSAR / satellite deformation | ADAPTER READY | No live Copernicus feed |
| 7 | Landslide susceptibility | EXPERIMENTAL | Not scientifically validated |
| 8 | Road network / alternate routes | CONTROLLED DEMO | Seeded NER corridor data |
| 9 | Alerts pipeline | CONTROLLED DEMO | Governed dispatch; no real SMS gateway claimed |
| 10 | Replay scenarios | CONTROLLED DEMO | Labelled as replay, never live |
| 11 | Citizen portal (Citizen Safe) | IMPLEMENTED | Citizen evidence != verified ground truth |
| 12 | Operations Centre multilingual UI | IMPLEMENTED (core UI) | Global `I18nContext`, 8 languages, English fallback, `tg_ops_language` storage |
| 13 | GIS map layers panel + legend | IMPLEMENTED | Original map architecture preserved |

## i18n scope and known limits
- Translated: header, sidebar, NER card, map layers/legend, login (en/hi complete for login keys).
- Other languages fall back to English for login keys and any missing key; raw keys are never shown.
- Not yet translated: individual workspace view bodies, map scope preset buttons, modals inside views. Translations for as/bn/ne/mni/lus/brx are machine-assisted and need native-speaker review before official use.

## Verification
Run: `pytest tests/unit -q`, `npm --prefix apps/operations-centre run build`, `npm --prefix apps/terra-guardian-safe run build`.
