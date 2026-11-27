# Rubric and deliverables self-check (update weekly; owner = Justin)

Source: organizer brief screenshots (Google Cloud + NVIDIA rule, deliverables list, key components, scoring table). **Honest status as of 2 Nov 2026.** Do not tick a box without evidence in the repo or a linked artifact.

## Rubric (weights from the brief)
| Criterion | Weight | What judges look for | Our evidence | Status / next step | Owner |
|---|---|---|---|---|---|
| Problem Grounding | 20% | Clear audience + problem tied to SDG; **credible data and user evidence** | `docs/01-research/problem-evidence.md`, source register, 3 new SRC records (NYC EM, NWS OKX, CDC) | **Weakest spot: no user evidence yet.** Run 3-5 quick user conversations Nov 7-13 (Workshop Wed + user-testing week); record notes in `user-research.md`; cite NWS/NYC HVI figures with dates | Justin, Kseniya |
| Solution Quality | 25% | Innovation, user value, practicality, sustainability; features address friction points | Working approval-first flow, deterministic ranking, cited brief with fallback, audit trail (44 tests) | Good base. Need real facility list, AI brief live, and a clear "friction point -> feature" table in the deck | Justin, Kseniya |
| Implementation Plan | 20% | Steps, owners, timeline, resources, risks, mitigations; progress follows BUILD roadmap | `docs/07-implementation/roadmap.md`, task playbook, risk register | Align dates to the real calendar (Nov 3 / 4 / 6 / 7-13 / 14-20 / 21-27 / 28); post 2 #mmc-build updates per week as evidence | Justin |
| Codebase | 25% | Working, organized code capturing team contributions; **meaningful Google Cloud AND NVIDIA integration** | Starter repo, tests, CI, secret scan, live GCP project `climateops-justin` | **VERIFIED LIVE:** NVIDIA NIM (`nvidia/nemotron-3.5-bolt-e4b` for briefing & `meta/llama-3.2-90b-vision-instruct` for visual inspection), Cloud Run (`climateops-api`), Firestore native mode, Cloud Storage private signed uploads, Cloud Scheduler 5-min job, Secret Manager. 44 passing tests. | Blanca, all |
| Documentation & Presentation | 10% | README clarity, summary, deck, walkthrough | README rewritten with required sections; summary/deck/script drafts | Replace TBDs: screenshots with live AI brief, links, contributions; record walkthrough | Justin |

## Google Cloud + NVIDIA rule ("must contribute to a meaningful product feature")
| Requirement | Evidence needed | Status |
|---|---|---|
| Explain where each fits in the architecture | README integration table; `docs/03-architecture/system.md` | Done |
| Show it working in the demo | Console "Integrations" panel + AI-written brief + Cloud Run URL in the recording | **Verified Live**: Console Integrations panel shows Cloud Run `climateops-api`, Firestore in use, Cloud Storage in use, NVIDIA NIM model `nvidia/nemotron-3.5-bolt-e4b`, latency ~11s, fallback: False |
| Document how to reproduce | `deploy/README.md`, `scripts/smoke_nim.py`, `make demo` | Done & verified on GCP |
| Confirm model API availability before committing | DEC-06 (Blanca) | **Resolved**: `nvidia/nemotron-3.5-bolt-e4b` verified HTTP 200 |
| Keys server-side only; no keys/private data in GitHub | `.gitignore`, `scan_secrets.py`, CI step, Secret Manager | Done: scan_secrets.py clean; Secret Manager live |
| Document sample inputs, setup, dependencies, limitations | README sections | Done |

## Deliverables
| Deliverable | Limit | Status |
|---|---|---|
| Working product + complete codebase (data sources, sample data, design assets) | team branch, PR to main | Starter exists; not pushed |
| README (audience, problem, SDG, solution, setup, GC+NVIDIA, screenshots/demo links, credits, contributions) | n/a | Drafted; links/credits TBD |
| Written summary | <=3 pages | Draft in `summary.md`; export to PDF and check length |
| Presentation deck | <=8 slides | Outline in `presentation.md`; not built |
| Recorded walkthrough | <=5 min | Script in `demo-script.md`; not recorded |
| Workshop Wednesday (Nov 4), hackathon (Nov 6) | mandatory | Attend |

## Cut line if time runs out (protects the 25% Codebase row first)
1. Keep: approval gate, NIM brief with fallback, Cloud Run deploy, one real Google data service (Firestore or Cloud Storage).
2. Cut first: forecast ingestion, retention job, plan superseding, cursor pagination.
3. Never cut: honest labels (DEMO/SIMULATED), secret hygiene, tests for the gate.
