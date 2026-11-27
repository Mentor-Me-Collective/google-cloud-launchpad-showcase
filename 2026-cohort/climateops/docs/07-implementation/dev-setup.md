# Developer setup and code map

See `/TEAM-START.md` for the quick start. Python 3.12+.

| Path | Purpose |
|---|---|
| `backend/app/main.py` | routes (`/api/v1/...`), error format `{code,message,request_id}` |
| `backend/app/services.py` | business rules, approval gate, audit events (transaction-wrapped) |
| `backend/app/scoring.py` | deterministic 5-factor score, unknown handling, rank |
| `backend/app/nws.py` | NWS client (User-Agent, backoff, freshness), replay loader |
| `backend/app/evidence.py` | immutable evidence bundle + content hash |
| `backend/app/nim.py` | NVIDIA NIM client |
| `backend/app/grounding.py` | validation chain + deterministic fallback |
| `backend/app/auth.py` | demo bearer tokens to tenant/role (server-side claims) |
| `backend/app/store.py` | MemoryStore (default), FirestoreStore (untested) |
| `backend/tests/` | scoring, grounding, NWS, and the approval-gate regression suite |
| `web/index.html` | manager/staff console |
| `scripts/` | `scan_secrets.py`, `smoke_nim.py`, `probe_nws.py`, `demo_flow.py` |
| `data/fixtures/` | demo orgs, simulated alert, playbook, auth tokens, `public_sites.csv` |

Env vars: see `.env.example`. With no `NVIDIA_*` set the app runs and uses the evidence-only template.
