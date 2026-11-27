# CanopyCrew System Architecture (`ARCHITECTURE.md`)

| Metadata | Value |
| :--- | :--- |
| **Document Owner** | **Alice** (Cloud Engineering Lane) |
| **UN SDG Alignment** | **UN SDG 11** (Sustainable Cities and Communities — **Target 11.7**: Universal access to safe, inclusive, green public spaces) |
| **Municipal Standards** | *Portaria SVMA nº 26/2024*, *BioSampa (5ª Edição)*, and *Plano Municipal de Arborização Urbana (PMAU)* |
| **Runtime & Cloud Stack** | Python `3.12.7` / FastAPI, React 19 + Vite + Tailwind CSS (Firebase Hosting + Firebase Auth), **Google Cloud** (Cloud Run + Secret Manager; Cloud Firestore planned post-MVP), **NVIDIA NIM API** (`nvidia/nemotron-3-ultra-550b-a55b`) |
| **Spend Policy** | Strictly **`$0` Free Tier** (`--min-instances 0 --max-instances 2`, zero SQL databases — no SQLAlchemy or Alembic) |

> **GitHub Web Editor Tip:** Any teammate can view or edit this document directly in the browser without terminal commands by pressing `.` on the CanopyCrew GitHub repository page.

---

## 1. Executive Overview & MVP Scope

**CanopyCrew** is an urban rewilding matchmaker for São Paulo that translates constrained neighborhood planting sites into municipally compliant native Atlantic Forest (*Mata Atlântica*) plant palettes, deterministic 3-year canopy and seedling cost projections, and actionable volunteer maintenance schedules.

### Strict 4-Week MVP Scope Boundaries
To guarantee biological accuracy, municipal legality, and zero cloud spend within the 4-week GCLP x MMC capstone timeline, CanopyCrew enforces strict scope boundaries:
- **In Scope (3 São Paulo Site Archetypes):**
  1. `site-a-sidewalk-strip` — Compact Sidewalk Strip (`< 1.5 m` width, beneath low-voltage Enel distribution wires).
  2. `site-b-sunny-lot` — Sunny Degraded Lot (`20–50 m²`, open wire-free parcel needing rapid pioneer canopy closure).
  3. `site-c-shaded-courtyard` — Shaded Courtyard (`15–30 m²`, low-lux community or school courtyard).
- **In Scope (10 Verified Native Species):** Curated strictly from *Mata Atlântica* flora approved under *Portaria SVMA nº 26/2024*, *BioSampa (5ª Edição)*, and *PMAU*. Exotic or invasive species (*Ficus microcarpa*, *Ligustrum lucidum*, *Eucalyptus*) are permanently excluded.
- **Explicitly Out of Scope:** Dynamic satellite/GIS parcel mapping, paid relational databases (Cloud SQL / managed PostgreSQL), and native iOS/Android mobile apps.

---

## 2. Cloud & AI Platform Roles (Google Cloud + NVIDIA NIM)

CanopyCrew combines **Google Cloud** serverless infrastructure and **NVIDIA NIM** generative inference while enforcing a hard architectural boundary between **deterministic botanical/cost logic** and **LLM narrative synthesis**:

| Platform / Component | Status | Product Feature Powered | Guardrail & `$0` Quota Limit |
| :--- | :--- | :--- | :--- |
| **Firebase Hosting & Firebase Auth** | **Deployed (Live MVP)** | Serves the React 19 + Vite + Tailwind CSS SPA (`https://canopycrew-sp-mvp.web.app/`) and handles account sign-in/sign-up (`firebase/auth`). Workspace selections and care checkoffs persist locally in browser `localStorage`. | Spark / Free Tier static hosting and email/password auth; zero backend database charges. |
| **Google Cloud Run** | **Deployed (Live MVP)** | Hosts the hardened non-root (`USER appuser`) Python `3.12.7` FastAPI backend (`https://canopycrew-api-sb77peq6bq-uc.a.run.app`) running `recommender.py` botanical filtering, wire-safety enforcement, and seedling cost/canopy math. | Serverless scale-to-zero (`--allow-unauthenticated --min-instances 0 --max-instances 2`) in `us-central1` (`canopycrew-sp-mvp`); well within the **2 million requests/month** Always Free Tier. |
| **Google Secret Manager** | **Deployed (Live MVP)** | Stores `canopycrew-nvidia-api-key` and injects `NVIDIA_API_KEY` into Cloud Run at container startup, isolating credentials from source code and `.env` files. | Managed with least-privilege runtime identity (`canopycrew-runtime`, zero static JSON keys). |
| **NVIDIA NIM API** | **Deployed (Live MVP)** | Synthesizes accessible English volunteer care narratives with Brazilian Portuguese botanical names (`backend/app/agent/`, model `nvidia/nemotron-3-ultra-550b-a55b`) via `POST /api/v1/volunteer-plan/narrative`. | Strictly **read-only narrative synthesis** capped at `nim_daily_call_cap = 100`/day with deterministic English fallback; never selects species, overrides wire safety, or computes cost/canopy totals. |
| **Google Cloud Firestore** | **Planned (Post-MVP)** | Designed for future cross-device persistence of saved community `VolunteerPlanResponse` records and shared neighborhood care checklists — **not wired in the live MVP yet**. | Document-store Free Tier (**max 1 GiB storage**, 50k reads / 20k writes per day); zero paid SQL databases. |

```mermaid
flowchart LR
    subgraph Client["Browser Client (Firebase Hosting)"]
        UI["React 19 + Vite + Tailwind UI<br/>canopycrew-sp-mvp.web.app"]
        FA["Firebase Auth<br/>(Sign-In / Sign-Up)"]
        LS[("Browser localStorage<br/>Workspace Selections & Checkoffs")]
    end

    subgraph GCP["Google Cloud Platform — canopycrew-sp-mvp ($0 Free Tier)"]
        CR["Cloud Run Service: canopycrew-api<br/>FastAPI (Python 3.12.7, USER appuser)<br/>min-instances: 0 | max-instances: 2"]
        DET["Deterministic Service Layer<br/>backend/app/services/recommender.py"]
        DATA["Validated Static Catalogs<br/>sites.json (3) & species.json (10)"]
        AGENT["Agent Narrative Adapter<br/>backend/app/agent/"]
        FS[("Cloud Firestore<br/>Planned Post-MVP (<= 1 GiB)")]
        GSM["Google Secret Manager<br/>canopycrew-nvidia-api-key"]
    end

    subgraph NVIDIA["NVIDIA Accelerated Inference"]
        NIM["NVIDIA NIM API<br/>nvidia/nemotron-3-ultra-550b-a55b"]
    end

    UI --> FA
    UI --> LS
    UI -->|"GET /api/v1/sites & /species<br/>GET /api/v1/recommendations<br/>POST /api/v1/volunteer-plan(/narrative)"| CR
    CR --> DET
    DET --> DATA
    DET -.->|"Planned Post-MVP Persistence"| FS
    CR --> AGENT
    GSM -.->|"Runtime Env Injection"| AGENT
    AGENT -->|"Validated Plan Context"| NIM
```

---

## 3. Deterministic Python vs. LLM Responsibility Split

A core engineering principle of CanopyCrew is that **LLMs never make compliance or mathematical decisions**:

1. **Deterministic Python (`backend/app/services/recommender.py`):**
   - **Startup Schema Enforcement:** Validates `backend/data/sites.json` and `backend/data/species.json` through Pydantic v2 `TypeAdapter` with `extra="forbid"` and caches verified models in memory (`@lru_cache`).
   - **Hard Wire-Safety Constraint (*Portaria SVMA nº 26/2024* & *PMAU*):** Whenever `site.constraints.overhead_power_lines == True`, `_satisfies_wire_safety()` enforces both:
     - `species.physical_profile.sidewalk_wire_safe == True`
     - `species.physical_profile.mature_height_meters <= 5.0`
   - **Site Suitability Filtering:** Confirms `site_id in species.site_tolerances.suitable_site_ids` before recommending a species or accepting it in a volunteer plan (`HTTP 400` on violation).
   - **Exact Cost & Canopy Math:** Sums `unit_cost_usd` (rounded to 2 decimals) and `canopy_coverage_m2_at_year_3` (rounded to 1 decimal), and consolidates deduplicated `initial_month`, `maintenance_quarterly`, and `annual` volunteer tasks.
2. **NVIDIA NIM Narrative Layer (`backend/app/agent/`):**
   - Receives only the **already-validated** site archetype, verified species subset, and deterministic totals.
   - Generates an encouraging, plain-language neighborhood planting and stewardship guide tailored for community volunteers.
   - Degrades gracefully to the deterministic structured `consolidated_care_schedule` whenever `NVIDIA_API_KEY` is absent in offline or local test environments.

---

## 4. Repository Structure & 4-Lane Ownership

### Backend Architecture (`backend/`)
```text
backend/
├── app/
│   ├── main.py                  # FastAPI app initialization, router mounting, CORS policy
│   ├── agent/                   # Laurine: NVIDIA NIM prompt templates & narrative synthesis
│   │   ├── nim_client.py        # Async httpx client for NVIDIA NIM API (nvidia/nemotron-3-ultra-550b-a55b)
│   │   ├── prompts.py           # English SDG 11.7 & wire-safety prompt templates with PT-BR botanical names
│   │   └── narrative.py         # Care narrative synthesis with deterministic fallback
│   ├── api/routes/
│   │   ├── health.py            # GET /, GET /health, GET /api/v1/health
│   │   ├── sites.py             # GET /api/v1/sites, GET /api/v1/sites/{site_id}
│   │   ├── species.py           # GET /api/v1/species, GET /api/v1/species/{species_id}
│   │   └── plans.py             # GET /api/v1/recommendations, POST /api/v1/volunteer-plan, POST /api/v1/volunteer-plan/narrative
│   ├── core/
│   │   └── config.py            # pydantic-settings env loader (SecretStr for NVIDIA_API_KEY)
│   ├── schemas/
│   │   └── plan.py              # Pure Pydantic v2 request/response & catalog models
│   └── services/
│       └── recommender.py       # Deterministic wire-safety filter & cost/canopy calculator
├── data/
│   ├── sites.json               # 3 canonical São Paulo urban site archetypes
│   └── species.json             # 10 verified native Atlantic Forest species
├── tests/
│   ├── test_health.py           # Health probe tests
│   ├── test_endpoints.py        # Site, recommendation, wire-safety & plan math unit tests
│   └── test_agent.py            # NVIDIA NIM client, prompt, and fallback unit/endpoint tests
├── pytest.ini
└── requirements.txt             # Pinned lightweight Python 3.12.7 dependencies
```

### 4-Lane Team Ownership & 4-Week Delivery Plan

| Lane Owner | Role | Owned Directories & Deliverables | 4-Week Milestone Focus |
| :--- | :--- | :--- | :--- |
| **Alice** | Cloud Engineering | `backend/` (routes, schemas, services, core, data), `docs/ARCHITECTURE.md`, `docs/DATA_SCHEMA.md`, Cloud Run & Firestore (Planned) | **W1:** Schemas & catalogs -> **W2:** Deterministic endpoints & unit tests -> **W3:** Cloud Run deployment -> **W4:** Load & reliability verification |
| **Laurine** | AI Research / Lead | `frontend/` (React + Vite UI/UX), `backend/app/agent/` (NVIDIA NIM prompt templates) | **W1:** UI wireframes -> **W2:** Site selector & API integration -> **W3:** NVIDIA NIM care narrative integration -> **W4:** UX polish & demo flow |
| **Barbara** | AI Cloud Leader | `docs/PRODUCT_BRIEF.md`, pitch narrative, UN SDG 11.7 impact metrics | **W1:** Problem grounding -> **W2:** Stakeholder & PMAU alignment -> **W3:** Impact metrics synthesis -> **W4:** Final capstone pitch deck |
| **Idris** | Cloud Cybersecurity | GCP IAM, Google Secret Manager, CORS/input hardening, `docs/SECURITY.md` | **W1:** Secret hygiene baseline -> **W2:** IAM & Secret Manager setup -> **W3:** Cloud Run & CORS audit -> **W4:** Final security sign-off |

---

## 5. REST API Surface Summary

All versioned endpoints are mounted under `/api/v1` (configured via `Settings.api_v1_prefix` in `backend/app/core/config.py`). Full JSON payload schemas and field constraints are documented in [`docs/DATA_SCHEMA.md`](./DATA_SCHEMA.md).

| Method | Path | Handler | Status Codes | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | `health.root` | `200` | Root welcome banner (`{"message": "Welcome to CanopyCrew API 🌱"}`). |
| `GET` | `/health` | `health.health` | `200` | Cloud Run liveness/readiness probe (`{"status": "healthy", "app": "CanopyCrew API"}`). |
| `GET` | `/api/v1/health` | `health.health` | `200` | Versioned health check alias for frontend API clients. |
| `GET` | `/api/v1/sites` | `sites.list_sites` | `200` | Returns all 3 verified São Paulo `SiteArchetype` objects. |
| `GET` | `/api/v1/sites/{site_id}` | `sites.retrieve_site` | `200`, `404`, `422` | Returns a single `SiteArchetype` by `site_id` (`max_length=64`, `^[a-z0-9-]+$`) or `404` if unknown. |
| `GET` | `/api/v1/species` | `species.list_species` | `200` | Returns all 10 verified native Atlantic Forest `NativeSpecies` objects. |
| `GET` | `/api/v1/species/{species_id}` | `species.retrieve_species` | `200`, `404`, `422` | Returns a single `NativeSpecies` by `species_id` (`max_length=64`, `^[a-z0-9-]+$`) or `404` if unknown. |
| `GET` | `/api/v1/recommendations?site_id=...` | `plans.recommend_species` | `200`, `404`, `422` | Deterministically filters the 10-species catalog for municipal wire safety and site suitability. |
| `POST` | `/api/v1/volunteer-plan` | `plans.create_volunteer_plan` | `200`, `400`, `404`, `422` | Validates selected species against site rules and computes seedling cost, Year-3 canopy (`m²`), volunteer care tasks, and optional `?include_narrative=true` care narrative. |
| `POST` | `/api/v1/volunteer-plan/narrative` | `plans.create_volunteer_plan_with_narrative` | `200`, `400`, `404`, `422` | Computes the deterministic volunteer plan and synthesizes `care_narrative` via NVIDIA NIM (or deterministic English fallback when unconfigured or capped at `nim_daily_call_cap=100`). |

---

## 6. CORS, Security & `$0` Cloud Run Deployment

### CORS, Security Headers & Input Hardening
- **Explicit Allowed Origins (`backend/app/main.py` & `config.py`):**
  - Local Vite development server: `http://localhost:5173` and `http://127.0.0.1:5173` (always preserved even when custom `CORS_ORIGINS` are supplied).
  - Production Firebase Hosting origins: `https://canopycrew-sp-mvp.web.app` and `https://canopycrew-sp-mvp.firebaseapp.com`.
  - Service-scoped Google Cloud Run domains via regex: `^https://canopycrew-[a-z0-9-]+(\.[a-z0-9-]+)*\.run\.app$`.
- **Method & Credential Restrictions:** `allow_methods=["GET", "POST", "OPTIONS"]` and `allow_credentials=False`.
- **OWASP Response Headers & Production Docs Toggle:** Middleware injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Cache-Control: no-store`. Interactive `/docs`, `/redoc`, and `/openapi.json` endpoints are automatically disabled when `APP_ENV` / `ENVIRONMENT == "production"`.
- **Secret Isolation & Daily NIM Cap:** `Settings.nvidia_api_key` uses Pydantic's `SecretStr` so credentials never leak in stack traces or repr logs, and `NIMClient` enforces `nim_daily_call_cap = 100` calls/day (degrading gracefully to the deterministic care guide). `.env` files are strictly gitignored; production secrets are mounted exclusively from Google Secret Manager.

### Serverless Cloud Run Deployment Template (`$0` Spend Guardrail)
Deployments bind to `PORT` (injected automatically by Cloud Run as `8080`, mapped via `AliasChoices("PORT", "API_PORT")` in `config.py`), run as an unprivileged container user (`appuser`), and enforce zero-instance scale-down in an **Always Free Tier** region (`us-central1`) inside the isolated `canopycrew-sp-mvp` project:

```bash
gcloud run deploy canopycrew-api \
  --source=./backend \
  --project=canopycrew-sp-mvp \
  --region=us-central1 \
  --service-account=canopycrew-runtime@canopycrew-sp-mvp.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=2 \
  --memory=512Mi \
  --cpu=1 \
  --set-env-vars="APP_ENV=production,DEBUG=false,NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b" \
  --set-secrets="NVIDIA_API_KEY=canopycrew-nvidia-api-key:latest" \
  --quiet
```

### Isolated GCP Project & Least-Privilege Runtime Architecture
- **Live Production API URL:** `https://canopycrew-api-sb77peq6bq-uc.a.run.app` (verified live on revision **`canopycrew-api-00004-r7m`**, 2026-11-27)
- **Live Production Frontend URL:** `https://canopycrew-sp-mvp.web.app/` (Firebase Hosting + Firebase Auth)
- **Isolated Project Boundary:** `canopycrew-sp-mvp` (dedicated strictly to CanopyCrew MVP workloads, isolated from personal/external GCP projects).
- **Always Free Tier Region:** `us-central1` (eligible for Google Cloud Run's Always Free quota of 2 million requests/month, 180,000 vCPU-seconds, and 360,000 GiB-seconds).
- **Container Runtime Hardening:** `backend/Dockerfile` builds on `python:3.12-slim` and drops root privileges (`USER appuser`) prior to starting `uvicorn`.
- **Service Account Separation:** Builds execute separately from the running container, which executes exclusively under the least-privilege `canopycrew-runtime@canopycrew-sp-mvp.iam.gserviceaccount.com` identity (holding zero project-level IAM roles and zero user-managed JSON keys — only secret-scoped `roles/secretmanager.secretAccessor` on `canopycrew-nvidia-api-key`). See [`docs/SECURITY.md`](./SECURITY.md) for the complete IAM and live verification record.
- **Health Probe:** `curl -s https://canopycrew-api-sb77peq6bq-uc.a.run.app/api/v1/health` -> `{"status":"healthy","app":"CanopyCrew API"}`

> **Budget Guardrail:** Never increase `--min-instances` above `0`, never increase `--max-instances` above `2`, and never provision Cloud SQL or paid VPC connectors.

---

## 7. Zero-Install Reproducibility & Verification Commands

### Option A: Zero-Install Browser Setup (GitHub Codespaces)
1. Click **Code -> Codespaces -> Create codespace on `main`** (or your feature branch).
2. `.devcontainer/devcontainer.json` automatically provisions **Python 3.12** + **Node.js 22**, installs `frontend` npm packages and `backend/requirements.txt`, and forwards ports `8000` (FastAPI) and `5173` (Vite).
3. In the Codespaces **Ports** tab, set forwarded port `8000` to **Public**, pass `CORS_ORIGINS="https://<your-codespace>-5173.app.github.dev"` when starting `uvicorn`, and set `VITE_API_BASE_URL=https://<your-codespace>-8000.app.github.dev/api/v1` in `frontend/.env.local`.

### Option B: Step-by-Step CLI Verification
Run the deterministic test suite and verify live endpoints from the repository root:

```bash
# 1. Run automated unit and municipal compliance tests (Python 3.12.7)
cd backend
pytest -v

# 2. Start the FastAPI development server on port 8000
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal, verify health, wire-safe filtering, and volunteer plan math:

```bash
# Health check
curl -s http://127.0.0.1:8000/api/v1/health

# Fetch wire-safe recommendations for Compact Sidewalk Strip (returns 5 species <= 5.0 m)
curl -s "http://127.0.0.1:8000/api/v1/recommendations?site_id=site-a-sidewalk-strip"

# Generate a deterministic volunteer plan ($25.50 total, 7.6 m² Year-3 canopy)
curl -s -X POST http://127.0.0.1:8000/api/v1/volunteer-plan \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "site-a-sidewalk-strip",
    "selected_species_ids": [
      "eugenia-uniflora",
      "calliandra-tweediei",
      "salvia-splendens"
    ]
  }'
```

