# Demo Access

**Scope: local development and explicitly configured Vercel Preview only.** These are seeded demonstration users, not real government accounts or production credentials. Do not set `VITE_DEMO_AUTH_ENABLED` in Vercel Production, and do not reuse these passwords outside a controlled demonstration.

The Operations Centre role presets submit these credentials to the backend login endpoint. The server returns the normal demo account profile and signed token in local/staging environments. Demo account authentication is blocked when the backend runs with `ENVIRONMENT=production`. Preview role buttons are enabled only when `VITE_DEMO_AUTH_ENABLED=true` is configured for Preview.

| Role | Username | Demo password | Scope |
|---|---|---|---|
| Operations Duty Officer | `operator` | `Terra#Op2026` | Triage, reconciliation and action proposal |
| Hazard Assessment Officer | `assessment` | `Terra#Assess2026` | Assessment and evidence analysis |
| Field Responder / Patrol | `patrol` | `Patrol#2026` | Demonstration field workflow and confirmation |
| Authorization Officer | `magistrate` | `Terra#Admin2026` | Demonstration authorization gates |
| Reviewer | `reviewer` | `Terra#Review2026` | Review and audit views |

Citizen observation submission is public and does not require one of these command-centre accounts. Submitted citizen evidence remains unverified until reviewed. Successful demo login does not confer real-world or statutory authority.
