# TEAM START: read this first (Mon 2 Nov)

**What exists now:** a working backend + console that already enforces the hard rule (no task until a manager approves the exact brief version). 44 tests pass. It runs on simulated data with no keys. Your job is to replace the fakes with real things, not to rebuild.

## 5-minute start
```bash
git checkout -b team/climateops      # ONE shared branch, PR to main, never fork or merge (hackathon rule)
make install && make test            # expect: 44 passed
make run                             # http://localhost:8080 (console), /docs (API explorer)
make demo                            # 2nd terminal: full approval flow
make hooks                           # blocks commits containing secrets
```
Console sign-ins are fake DEMO users. Weather in demo mode is a labelled SIMULATED alert, because there are no live heat alerts in November.

**Judged against the organizer rubric:** see `docs/09-submission/rubric-checklist.md`. Codebase (25%) needs *meaningful, demonstrated* Google Cloud AND NVIDIA integration, so the integrations are the priority this week, not new features. The console's Integrations panel shows what is really live.

## Who changes what (one owner per file avoids conflicts)
| Person | First task | Files |
|---|---|---|
| **Blanca (`@bcperez14`)** | `python scripts/smoke_nim.py` with a real key; record the model id in DEC-06. Set `NVIDIA_MODEL_ID`/`NVIDIA_API_KEY`, run `make demo`, check `used_fallback` is false. Tune the prompt. Deploy per `deploy/README.md`. Wire Firestore. | `nim.py`, `deploy/`, `store.py` |
| **Kseniya (`@ksen-nm`)** | Fill `data/fixtures/public_sites.csv` (5-10 verified sites; header exists). Finalise factors/weights and unknown handling in `scoring.py` (open question below). Edit `demo_orgs.json`. Source-register entries. | `scoring.py`, `data/fixtures/*`, `docs/01-research`, `docs/04-data` |
| **Shiksha (`@Shiksha99`)** | Confirm secret storage; run `make scan` before the first push (CI also runs it); review `auth.py` (demo tokens are public fakes), pick the real identity provider; threat model; budget alerts. | `auth.py`, `scripts/scan_secrets.py`, `docs/06-security` |
| **Justin (`@creova-gif`)** | Product brief, playbook (`data/fixtures/heat_tasks.json`), user testing, review every PR against the approval gate, demo script. | `docs/02-product`, `docs/09-submission` |

## Hard rules (tests enforce most of these)
1. `Service.create_tasks` in `services.py` is the gate. Do not add another way to create tasks.
2. The model never sets scores or ranks (`scoring.py` is pure code). The model only writes the cited brief; `grounding.py` rejects uncited or unknown sources and falls back to a plain template.
3. Never commit keys. `.env` is git-ignored. Use Secret Manager on Cloud Run.
4. Label data honestly: `PUBLIC_VERIFIED` / `DEMO_SYNTHETIC` / `UNKNOWN`; weather `NWS_LIVE` / `NWS_REPLAY` / `SIMULATED`. Never call a listed site a cooling center.
5. A failed or empty weather fetch is **unknown**, never "no hazard".
6. Do not claim an integration works until its smoke test passes (ADR-007).

## Known gaps and open decisions
- **NVIDIA call is untested.** It follows NVIDIA's OpenAI-compatible API (`https://integrate.api.nvidia.com/v1/chat/completions`); the model id and JSON behavior must be proven by Blanca's smoke test. Until then every brief uses the evidence-only template, which works.
- **Live NWS mode is untested** (the build sandbox could not reach api.weather.gov). Run `python scripts/probe_nws.py` on a normal network: it prints the zone and exact alert `event` strings. Update `HEAT_EVENT_LEVEL` in `scoring.py` if they differ.
- **Ranking rule (Kseniya):** unknown factors are dropped and the rest renormalised, so a stale facility with only heat known scores 100 at confidence 0.3 (DEMO-A3 does). The console shows a LOW-confidence marker. Options: confidence floor, or a separate "verify first" list.
- Firestore adapter untested; memory store loses data on restart (fine for the demo).
- Proof uploads: server issues tenant-scoped object paths and signed URLs (`uploads.py`); the Cloud Storage signer is untested and cannot enforce a max file size yet.
- Auth is demo tokens: replace before any non-demo use.
- Not built: superseding approved plans on new weather, cursor pagination, forecast ingestion (`/points` then `forecastHourly`), retention/deletion job.
- Weights, thresholds and the 24h staleness rule are DRAFT values from the deck.

## Paste into #mmc-build
> Starter code is in the repo (branch `team/climateops`). `make install && make test && make run`. It already enforces approve-before-tasks. Read TEAM-START.md for who does what first. Blanca: NVIDIA smoke test today. Kseniya: public_sites.csv + factors by tomorrow. Shiksha: key storage + secret scan before first push.
