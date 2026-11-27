# CanopyCrew Project Journal

Shared chronological log of pull requests, architectural decisions, cross-lane unblocks, and weekly `#mmc-build` status milestones across all four tracks (**Alice**, **Laurine**, **Barbara**, and **Idris**).

> **Agent Tip:** When adding a new milestone or preparing a Tuesday/Friday `#mmc-build` update, follow [`.agents/skills/project-journal/SKILL.md`](../.agents/skills/project-journal/SKILL.md).

## Entry Template

```markdown
### [YYYY-MM-DD] — <PR Title or Milestone Name> (`<branch-name>`)
- **Author / Lane:** <Name & Track>
- **Changes Delivered:** 2–3 concise bullets of technical or documentation deliverables.
- **Cross-Lane Unblocks:** How this helps Frontend (Laurine), Product Brief (Barbara), Backend (Alice), or Security (Idris).
- **Verification:** Commands or tests passed (e.g., `pytest -v`).
```

---

## Chronological Log

### [2026-11-03] — PR #1: chore(infra): add devcontainer, pr template, and agent guardrails (`chore/infra-devcontainer-and-pr-standards`)
- **Author / Lane:** Alice Severi Gonçalves (Cloud Engineering)
- **Changes Delivered:**
  - Configured universal GitHub Codespaces environment (`.devcontainer/devcontainer.json` with Python 3.12 + Node 22 and forwarded ports `8000` / `5173`), cross-OS LF normalization (`.gitattributes`), and `.github/pull_request_template.md`.
  - Added foundational project guardrails (`.agents/rules/canopycrew.md`, `.agents/rules/git-pr-standards.md`) and the procedural `git-commit-pr` workflow skill.
- **Cross-Lane Unblocks:** Standardized zero-install browser reproducibility in GitHub Codespaces and 4-lane PR review handoffs across `@Alice`, `@Laurine`, `@Barbara`, and `@Idris`.
- **Verification:** Verified `.devcontainer/devcontainer.json` specification, `.gitattributes` LF rules, and PR template compliance checklist.

### [2026-11-03] — PR #2: feat(backend): add core config, cors, health routes, and pinned deps (`feature/backend-core-foundation`)
- **Author / Lane:** Alice Severi Gonçalves (Cloud Engineering)
- **Changes Delivered:**
  - Pinned lightweight Python `3.12.7` dependencies in `backend/requirements.txt` (`fastapi==0.162.0`, `pydantic==2.14.2`, `pydantic-settings==2.16.2`, `pytest==8.3.5`) and removed unused SQLAlchemy `models/` and `repositories/` folders to enforce the `$0` non-SQL MVP scope.
  - Added secret-safe `Settings` (`SecretStr` for `NVIDIA_API_KEY`, `PORT`/`API_PORT` alias support) in `backend/app/core/config.py`, Vite + `*.run.app` CORS middleware in `backend/app/main.py`, and modular `/`, `/health`, and `/api/v1/health` routes.
- **Cross-Lane Unblocks:** Unblocked `@Laurine` (`http://localhost:5173` CORS + `/api/v1/health` liveness probe) and `@Idris` (`SecretStr` credential isolation for Google Secret Manager runtime injection).
- **Verification:** `pytest -v` (`backend/tests/test_health.py` passing across `/`, `/health`, `/api/v1/health`, and CORS preflight checks).

### [2026-11-03] — PR #3: chore(rules): add cross-agent AGENTS.md, skills, and project journal (`chore/rules-cross-agent-skills`)
- **Author / Lane:** Alice Severi Gonçalves (Cloud Engineering)
- **Changes Delivered:**
  - Added universal cross-agent entrypoint `AGENTS.md`, `.github/copilot-instructions.md`, and `.agents/rules/docs-and-deliverables.md` enforcing lane ownership and alignment with the 5 GCLP x MMC capstone rubric pillars.
  - Created `doc-helper` and `project-journal` workflow skills under `.agents/skills/` and initialized `docs/PROJECT_JOURNAL.md`.
- **Cross-Lane Unblocks:** Enabled shared guardrails across Antigravity, GitHub Copilot, Cursor, and Codex, protecting `@Barbara`'s `docs/PRODUCT_BRIEF.md` narrative sections and standardizing `#mmc-build` milestone reporting.
- **Verification:** Validated `SKILL.md` YAML frontmatter parsing and cross-agent rule path references.

### [2026-11-03] — PR #4: feat(backend): add data seeds, plan schemas, and recommendation routes (`feature/backend-data-and-endpoints`)
- **Author / Lane:** Alice Severi Gonçalves (Cloud Engineering)
- **Changes Delivered:**
  - Seeded the 3 verified São Paulo urban site archetypes (`backend/data/sites.json`) and 10 native *Mata Atlântica* species (`backend/data/species.json`) anchored in *Portaria SVMA nº 26/2024*, *BioSampa (5ª Edição)*, and *PMAU*.
  - Implemented strict Pydantic v2 models (`backend/app/schemas/plan.py`), deterministic wire-safety filtering and seedling cost / Year-3 canopy math (`backend/app/services/recommender.py`), and `/api/v1/sites`, `/api/v1/recommendations`, and `/api/v1/volunteer-plan` routes.
- **Cross-Lane Unblocks:** Unblocked `@Laurine` with live deterministic REST endpoints for UI integration and validated plan payloads for NVIDIA NIM care narratives, and `@Barbara` with verified species cost and canopy projections.
- **Verification:** `pytest -v` (`backend/tests/test_endpoints.py` verifying all 3 sites, 10 native species, exotic/invasive genus ban, `<= 5.0 m` wire-safety enforcement on `site-a-sidewalk-strip`, and `POST /api/v1/volunteer-plan` math).

### [2026-11-04] — PR #5: docs(docs): add system architecture and data schema deliverables (`docs/docs-architecture-schema`)
- **Author / Lane:** Alice Severi Gonçalves (Cloud Engineering)
- **Changes Delivered:**
  - Created `docs/ARCHITECTURE.md` detailing the Python `3.12.7` / FastAPI backend layout, deterministic Python (`recommender.py`) vs. NVIDIA NIM (`backend/app/agent/`) responsibility split, CORS rules, and `$0` Google Cloud Run (`--min-instances 0 --max-instances 2`) + Cloud Firestore (`<= 1 GiB`) deployment architecture.
  - Created `docs/DATA_SCHEMA.md` documenting all strict Pydantic v2 schemas (`ConfigDict(extra="forbid")`), the 3 São Paulo urban site archetypes (`sites.json`), the 10 verified native *Mata Atlântica* species (`species.json`), and REST endpoint payload/error contracts.
- **Cross-Lane Unblocks:**
  - **Frontend (`@Laurine`):** Provides exact request/response JSON contracts, HTTP status codes (`200`/`400`/`404`/`422`), and read-only NVIDIA NIM `care_narrative` boundaries.
  - **Product Brief (`@Barbara`):** Supplies verified municipal compliance tables (*Portaria SVMA nº 26/2024*, *BioSampa*, *PMAU*) and UN SDG 11.7 architecture references without altering `docs/PRODUCT_BRIEF.md`.
  - **Security (`@Idris`):** Documents `SecretStr` isolation for `NVIDIA_API_KEY`, Google Secret Manager runtime injection, and CORS restrictions for `docs/SECURITY.md`.
- **Verification:** Verified GFM tables, Mermaid (`flowchart LR` & `erDiagram`) syntax, schema field parity against `backend/app/schemas/plan.py` and `backend/tests/test_endpoints.py`, and pre-commit secret/budget guardrails.

### [2026-11-05] — PR: feat(backend): add native species catalog endpoints (`feature/backend-species-endpoint`)
- **Author / Lane:** Alice Severi Gonçalves (Cloud Engineering)
- **Changes Delivered:**
  - Implemented `GET /api/v1/species` and `GET /api/v1/species/{species_id}` in `backend/app/api/routes/species.py` backed by `load_species()` and new `get_species_by_id()` / `SpeciesNotFoundError` handling in `backend/app/services/recommender.py`.
  - Added automated unit tests (`test_get_species_returns_all_ten` and `test_get_single_species_and_404`) in `backend/tests/test_endpoints.py` verifying full 10-species catalog integrity and 404 responses.
  - Updated `docs/DATA_SCHEMA.md` and `docs/ARCHITECTURE.md` with REST contracts, route trees, and component interaction flows.
- **Cross-Lane Unblocks:**
  - **Frontend (`@Laurine`):** Unblocks `PlantCatalogue` to fetch all 10 verified native species in a single GET request, eliminating the need to query 3 separate site recommendation endpoints and deduplicate in client JavaScript.
  - **Security (`@Idris`):** Exposes purely read-only endpoints returning static Pydantic-validated botanical catalogs (`ConfigDict(extra="forbid")`) with zero database queries and no credential requirements.
- **Verification:** `pytest -v` (`18 passed` across health, site archetypes, wire safety, and species catalog endpoints).

### [2026-11-07] — feat(backend): add non-root containerization, isolated GCP project, security architecture, and NVIDIA NIM care narrative (`feature/backend-cloud-run-deployment`)
- **Author / Lane:** Alice Severi Gonçalves (Cloud Engineering & Cloud Cybersecurity coverage) & Laurine Ndanu Nzuki (AI Research / Lead)
- **Changes Delivered:**
  - Added hardened containerization files `backend/Dockerfile` (running as unprivileged `USER appuser` on `python:3.12-slim` with dynamic `PORT=8080` binding), `backend/.dockerignore`, and `backend/.gcloudignore`, and deployed `canopycrew-api` (`https://canopycrew-api-sb77peq6bq-uc.a.run.app`) inside isolated Google Cloud project `canopycrew-sp-mvp` (`us-central1` Always Free Tier, `--min-instances 0 --max-instances 2`) under least-privilege service account `canopycrew-runtime`.
  - Implemented the asynchronous NVIDIA NIM care narrative layer (`backend/app/agent/nim_client.py`, `prompts.py`, `narrative.py`) with deterministic Portuguese fallback (`build_fallback_narrative()`), wired `care_narrative` into `POST /api/v1/volunteer-plan?include_narrative=true` and `POST /api/v1/volunteer-plan/narrative`, and added unit/endpoint tests (`backend/tests/test_agent.py`).
  - Authored `docs/SECURITY.md` and `.agents/agents/canopy-steward.md` (indexed in `AGENTS.md`), documenting keyless IAM separation, `SecretStr` + Google Secret Manager isolation for `NVIDIA_API_KEY`, CORS lockdown, and deterministic AI safety guardrails.
- **Cross-Lane Unblocks:**
  - **Frontend (`@Laurine`):** Live public HTTPS endpoint (`https://canopycrew-api-sb77peq6bq-uc.a.run.app`) with wildcard `*.run.app` + `localhost:5173` CORS support, plus `care_narrative` response field on `/api/v1/volunteer-plan/narrative` and `/api/v1/volunteer-plan?include_narrative=true`.
  - **Product Brief (`@Barbara`):** Supplies verified `$0` Always Free Tier Google Cloud Run + NVIDIA NIM (`meta/llama-3.1-70b-instruct`) architecture and security compliance documentation for rubric Pillar 3 & Pillar 4.
  - **Security (`@Idris`):** Completes `docs/SECURITY.md` deliverable with non-root container hardening, runtime vs. build IAM separation, and strict Pydantic `extra="forbid"` input validation.
- **Verification:** Verified live Cloud Run revision `canopycrew-api-00001-fv6` at `https://canopycrew-api-sb77peq6bq-uc.a.run.app`, `test_agent.py` unit/endpoint coverage for NVIDIA NIM and deterministic fallback, and pre-commit secret/budget guardrails.

### [2026-11-07] — feat(frontend): add volunteer plan builder and nim care guide ui (`feature/frontend-volunteer-plan-nim`)
- **Author / Lane:** Laurine Ndanu Nzuki (AI Research / Lead) & Alice Severi Gonçalves (Cloud Engineering)
- **Changes Delivered:**
  - Updated `frontend/src/App.jsx` with a `postJson` API helper and wired `onPostPlan` into `SiteDetail`.
  - Enhanced `frontend/src/components/sitedetail.jsx` and `frontend/src/index.css` with accessible native species selection toggles (`aria-pressed` + CSS `:has()` container styling), a deterministic Volunteer Planting Plan metrics bar (`POST /api/v1/volunteer-plan`), and an interactive **NVIDIA NIM Community Care & Planting Guide** panel (`POST /api/v1/volunteer-plan/narrative`).
  - Hardened `backend/app/core/config.py` (`has_nvidia_api_key`) and `backend/app/agent/nim_client.py` (`_redact_secret()` token scrubber), aligned `backend/app/agent/prompts.py` and `narrative.py` to English with Brazilian Portuguese botanical grounding (`nvidia/nemotron-3-ultra-550b-a55b`), and provisioned `canopycrew-nvidia-api-key` in Google Secret Manager bound to `canopycrew-runtime@canopycrew-sp-mvp.iam.gserviceaccount.com`.
- **Cross-Lane Unblocks:**
  - **Frontend (`@Laurine`):** Completes the end-to-end UI flow connecting the 3 São Paulo site archetypes and 10 native *Mata Atlântica* species to both deterministic cost/canopy math and NVIDIA NIM (`nvidia/nemotron-3-ultra-550b-a55b`) care narratives.
  - **Product Brief (`@Barbara`):** Provides a live browser-demonstrable flow showing deterministic municipal compliance (*Portaria SVMA nº 26/2024* & *PMAU*) paired with read-only NVIDIA NIM stewardship synthesis for GCLP x MMC rubric Pillar 4.
  - **Security (`@Idris`):** Keeps all `NVIDIA_API_KEY` handling strictly server-side (`SecretStr` / Google Secret Manager) with `0` user-managed Service Account JSON keys (`google-cloud-recipe-auth`); the browser client only sends `{site_id, selected_species_ids}`.
- **Verification:** `pytest -v` (`28 passed` across `test_health.py`, `test_endpoints.py`, and `test_agent.py`), live NVIDIA NIM (`nvidia/nemotron-3-ultra-550b-a55b`) care narrative verification, and `npm --prefix frontend run build` (`vite build` succeeded cleanly).

### [2026-11-08] — PR #14: fix(frontend): map unique botanical images to species and site cards (`fix/frontend-card-images-rotation`)
- **Author / Lane:** Alice Severi Gonçalves (Cloud Engineering) & Laurine Ndanu Nzuki (AI Research / Lead)
- **Changes Delivered:**
  - Created `frontend/src/data/plantimages.jsx` with `getPlantImage(plant, index)` mapping all 10 verified native *Mata Atlântica* `species_id` slugs to distinct open-licensed botanical photographs.
  - Replaced the 3-photo modulo rotation in `frontend/src/components/plantcatalogue.jsx` with deterministic `species_id` lookup and `loading="lazy"` image rendering.
  - Added `getSiteImage(site, index)` in `frontend/src/data/siteimages.jsx` and wired consistent `site_id` image resolution across `frontend/src/components/discover.jsx` and `frontend/src/components/sitedetail.jsx`.
- **Cross-Lane Unblocks:**
  - **Frontend (`@Laurine`):** Eliminates duplicate species card thumbnails in `PlantCatalogue` and guarantees identical site archetype imagery between `Discover` cards and the `SiteDetail` drawer.
  - **Product Brief (`@Barbara`):** Enhances visual polish and botanical accuracy for the 10 native *Mata Atlântica* species and 3 São Paulo urban site archetypes in demo walkthroughs.
- **Verification:** `npm --prefix frontend run build` (`vite build` succeeded cleanly) and verified distinct image URLs for all 10 `species_id` and 3 `site_id` keys.

### [2026-11-11] — fix(backend): add security headers, bound input lengths, and resolve F-1..F-7 (`fix/backend-security-hardening`)
- **Author / Lane:** Alice Severi Gonçalves (Cloud Engineering) & Idris Belgore Abiodun (Cloud Cybersecurity)
- **Changes Delivered:**
  - Injected OWASP & review-mandated response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-XSS-Protection`, `Referrer-Policy`, `Cache-Control: no-store`) and environment-conditional disabling of `/docs`, `/redoc`, and `/openapi.json` when `ENVIRONMENT=production` in `backend/app/main.py` (**Resolves F-4 & F-5**).
  - Enforced strict length (`max_length=64`), list size (`max_length=10`), and slug regex (`^[a-z0-9-]+$`) bounds across `VolunteerPlanRequest` (`backend/app/schemas/plan.py`) and path/query parameters (`sites.py`, `species.py`, `plans.py`), scoped the Cloud Run CORS regex to `canopycrew-*` (`backend/app/core/config.py`), and added `nim_daily_call_cap=100` with deterministic fallback in `NIMClient` (**Resolves F-1, F-2, & F-3**).
  - Deduplicated Section 7 in `docs/SECURITY.md` (following PR #20), applied Section 7.4 documentation corrections (`canopycrew-build`, `:latest` secret rotation note, `cecropia-pachystachya` wire-safety verification), and marked `F-1` through `F-7` as **Resolved**.
- **Cross-Lane Unblocks:**
  - **Security (`@Idris`):** Remediates all 6 required items in `docs/SECURITY.md` Section 7.3 with automated regression tests ready for Cloud Run re-test and Section 7.6 sign-off.
  - **Frontend (`@Laurine`):** Explicitly allowlists both production Firebase Hosting domains (`https://canopycrew-sp-mvp.web.app` and `https://canopycrew-sp-mvp.firebaseapp.com`) while blocking third-party `.run.app` origins.
  - **Product Brief (`@Barbara`):** Strengthens GCLP x MMC rubric Pillar 3 & Pillar 4 with verified defense-in-depth perimeter controls and daily NVIDIA NIM quota protection (`nim_daily_call_cap=100`).
- **Verification:** `pytest -v` (`32 passed` across `test_health.py`, `test_endpoints.py`, and `test_agent.py`, including hostile `.run.app` CORS rejection, `422` length-bound validation, OWASP header assertions, and daily NIM cap fallback).

### [2026-11-27] — PR #24 README Verification, Cloud Run Redeploy (`00004-r7m`), and Architecture/Security Doc Sync (`docs/docs-sync-deployed-architecture`)
- **Author / Lane:** Alice Severi Gonçalves (Cloud Engineering & Cloud Cybersecurity coverage)
- **Changes Delivered:**
  - Proofread Barbara's submission README PR (#24, `docs/submission-readme`) and pushed follow-up commits adding the live Cloud Run URL, exact GCP Free Tier / NVIDIA NIM (`nvidia/nemotron-3-ultra-550b-a55b`, daily cap `100`) details, Codespaces CORS & Public port `8000` setup steps, Python `.venv` / Node `22+` guidance, Cloud Security ownership coverage, and GitHub Markdown spacing fixes while preserving Laurine's walkthrough placeholder.
  - Redeployed `main` (PR #21 security hardening) to Google Cloud Run revision **`canopycrew-api-00004-r7m`** (`us-central1`, `canopycrew-sp-mvp`, `canopycrew-runtime` SA, `--min-instances=0 --max-instances=2`, `APP_ENV=production`, `DEBUG=false`, `NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b`, Secret Manager `canopycrew-nvidia-api-key:latest`).
  - Synced `docs/ARCHITECTURE.md`, `docs/DATA_SCHEMA.md`, and `docs/SECURITY.md` to clearly distinguish **Deployed (Live MVP)** from **Planned (Post-MVP)** (Firestore), completed all Section 7.5 live GCP IAM / Secret Manager / zero-SA-keys / full Git-history secret audits, recorded Section 7.7 live black-box verification for revision `canopycrew-api-00004-r7m`, and completed Section 7.6 MVP security sign-off under Cloud Engineering & Cloud Cybersecurity coverage.
- **Cross-Lane Unblocks:**
  - **Product Brief (`@Barbara`):** Unblocks PR #24 (`docs/submission-readme`) and aligns every linked engineering document with the submission deck and 3-page summary.
  - **Frontend (`@Laurine`):** Preserves the exact `"Link pending — recording in progress."` placeholder on `docs/submission-readme` for her walkthrough video edit and keeps Firebase Hosting origins allowlisted on live Cloud Run.
  - **Security:** Closes the Section 7.6 re-review trigger and Section 7.5 audit items with live GCP and Git history verification evidence, elevating `docs/SECURITY.md` to **APPROVED FOR MVP SUBMISSION (2026-11-27)**.
- **Verification:** Live `curl` probes against `https://canopycrew-api-sb77peq6bq-uc.a.run.app` (`canopycrew-api-00004-r7m`) plus read-only `gcloud` IAM/Secret/Key audits (`0` project-level roles on `canopycrew-runtime`, secret-scoped `secretAccessor` on `canopycrew-nvidia-api-key` `versions/1`, `[]` user-managed SA keys) and full Git history secret scan (`0` real credentials or `.env` files).



