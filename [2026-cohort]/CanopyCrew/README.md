# CanopyCrew

Google Cloud Launchpad × Mentor Me Collective Capstone Project

## Demo and submission materials

- **Live MVP (Web App):** [https://canopycrew-sp-mvp.web.app/](https://canopycrew-sp-mvp.web.app/) (Firebase Hosting)
- **Live Backend API:** [https://canopycrew-api-sb77peq6bq-uc.a.run.app/api/v1/health](https://canopycrew-api-sb77peq6bq-uc.a.run.app/api/v1/health) (Google Cloud Run)
- **Presentation deck:** Open `CanopyCrew_Presentation.pptx` in the [Product Brief and Deck folder](https://drive.google.com/drive/folders/1aBnbM3tLjXYjOd_5hko-z-eBdd98buj5).
- **Recorded walkthrough:** Open `CanopyCrew Walk-through` in the [Walk-Through_folder]
(https://drive.google.com/file/d/16BO8_S8Tj_HOWs15IKDOagATUU-RHGRZ/view?usp=drive_link)

## About CanopyCrew

CanopyCrew helps neighborhood groups and volunteer coordinators in São Paulo choose suitable native plants, estimate seedling costs and future canopy, and plan for ongoing care.

Community planting projects require decisions about sunlight, available space, overhead wires, costs, and maintenance. CanopyCrew brings these decisions together in one guided workflow so volunteers can move from an idea to an initial planting plan.

The project supports **UN Sustainable Development Goal 11, Target 11.7**, which focuses on access to safe, inclusive, accessible green and public spaces.

## How CanopyCrew works

1. **Discover.** Choose the sample site that most closely resembles your space: a compact sidewalk strip with overhead wires (`< 1.5 m` width), a sunny degraded lot (`20–50 m²`), or a shaded courtyard (`15–30 m²`).
2. **Select.** Review recommended native Atlantic Forest (*Mata Atlântica*) species and see why they suit the selected site.
3. **Plan.** Select plants and review the estimated seedling cost (USD) and projected Year 3 canopy (`m²`).
4. **Care.** Review the initial month, quarterly, and annual care tasks, and request an optional AI-generated volunteer guide for your selected plants.

The four-week MVP covers three predefined São Paulo site archetypes and ten native Atlantic Forest species. The [site catalog](backend/data/sites.json) and [species catalog](backend/data/species.json) are versioned directly in the repository. Botanical selection and infrastructure rules draw on São Paulo's *Portaria SVMA nº 26/2024*, *BioSampa (5ª Edição)*, and *Plano Municipal de Arborização Urbana (PMAU)*.

Seedling prices are indicative, and Year 3 canopy figures are projections. Planting at an actual site requires local checks and any applicable municipal approvals.

## Technology overview

### Deployed in the live MVP

| Component | Live MVP implementation |
| --- | --- |
| **Frontend** | React 19, Vite, JavaScript, and Tailwind CSS deployed on Firebase Hosting (`https://canopycrew-sp-mvp.web.app/`). Firebase Authentication (`firebase/auth`) handles account sign-in and sign-up. |
| **Backend & Cloud** | Python 3.12, FastAPI, Pydantic v2, `uvicorn`, and async `httpx` running inside a hardened non-root container (`USER appuser`) on Google Cloud Run (`us-central1`, isolated GCP project `canopycrew-sp-mvp`, least-privilege `canopycrew-runtime` service account with zero static JSON keys). Scales to zero (`--min-instances 0 --max-instances 2`) to stay within the `$0` Always Free Tier budget, with no SQL database (no SQLAlchemy or Alembic). |
| **Data & Workspace** | Canonical site and species JSON catalogs (`backend/data/sites.json`, `backend/data/species.json`) are validated with strict Pydantic v2 (`extra="forbid"`) on load and cached in memory (`@lru_cache`). User workspace selections and care checkoffs are stored in the current browser via `localStorage`. |
| **AI Care Guide** | NVIDIA NIM (`nvidia/nemotron-3-ultra-550b-a55b` via the OpenAI-compatible Chat Completions API) generates accessible English volunteer guides with Brazilian Portuguese botanical names from a plan already validated by Python. `NVIDIA_API_KEY` is stored in Google Secret Manager (`canopycrew-nvidia-api-key`) and injected into Cloud Run at runtime. |

When a volunteer clicks **Generate NVIDIA NIM care guide**, the frontend calls `POST /api/v1/volunteer-plan/narrative` on Cloud Run with the site and selected species IDs. Deterministic Python runs first (`backend/app/services/recommender.py`): it verifies every selected species is native and suitable for the site, enforces the hard overhead power-line constraint (`sidewalk_wire_safe == true` and `mature_height_meters <= 5.0` on wired sidewalks), calculates exact seedling cost and projected Year 3 canopy, and compiles the structured care schedule.

NVIDIA NIM receives only that pre-validated plan context and writes the plain-language volunteer guide — it never chooses species, overrides safety rules, or recalculates totals. A daily request cap (`nim_daily_call_cap = 100`) protects credits; if NIM is unavailable, unconfigured, or capped, the backend gracefully returns a deterministic English care guide built from the structured schedule.

### Planned (post-MVP, not deployed yet)

- **Google Cloud Firestore (`<= 1 GiB` Free Tier):** Designed in [ARCHITECTURE.md](docs/ARCHITECTURE.md) and [SECURITY.md](docs/SECURITY.md) for future cross-device persistence of saved community planting plans and shared neighborhood care checklists.

## Run and verify

### Option A: GitHub Codespaces (zero local install)

1. In the repository, select **Code → Codespaces → Create codespace**.
2. The dev container ([`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json)) automatically provisions **Python 3.12** and **Node.js 22**, installs backend and frontend dependencies, and forwards port `8000` (FastAPI) and port `5173` (Vite).
3. In the **Ports** tab, set forwarded port `8000` visibility to **Public** so browser requests from port `5173` can reach the API without hitting a GitHub auth redirect.
4. Start the backend with your forwarded frontend origin added to `CORS_ORIGINS`:

```bash
cd backend
python -m pytest -v
CORS_ORIGINS="https://<your-codespace>-5173.app.github.dev" \
  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. Set `VITE_API_BASE_URL` in `frontend/.env.local` to `https://<your-codespace>-8000.app.github.dev/api/v1`, then start the frontend:

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

### Option B: Local setup

Use **Python 3.12.7** (`.python-version`) and **Node.js 22+** (`.nvmrc` targets Node.js 24). From the repository root, start the backend in one terminal:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pytest -v
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal, verify the API health check and wire-safe filtering:

```bash
curl -fsS http://localhost:8000/api/v1/health
curl -fsS "http://localhost:8000/api/v1/recommendations?site_id=site-a-sidewalk-strip"
```

Create `frontend/.env.local` (gitignored) to point the frontend to your local backend — if omitted, the app defaults to the live Cloud Run API:

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

For Workspace account sign-in/sign-up (and clean Firebase Auth initialization on app load), add your six development Firebase web config values listed in [frontend/src/firebase/config.js](frontend/src/firebase/config.js) to `frontend/.env.local` (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`). Keep local `.env*` files out of Git.

From the repository root, start the frontend:

```bash
cd frontend
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

Open `http://localhost:5173` locally (or the forwarded port `5173` URL in Codespaces).

### Try the reviewer journey

Open the [live MVP](https://canopycrew-sp-mvp.web.app/), select **Compact Sidewalk Strip** (the wired sidewalk), and inspect **Why it suits this site** for **Surinam Cherry / Pitanga** (*Eugenia uniflora*). Toggle your desired plants, click **Calculate deterministic plan** to review the estimated seedling cost and projected Year 3 canopy, or click **Generate NVIDIA NIM care guide** to open the volunteer care guidance.

## Testing and next steps

A walkthrough on 22 November 2026 covered all three sample sites. Recommendations varied with site conditions, and the totals in the plans checked matched the displayed plant values. All three AI care guides tested ended early, and changing a selection sometimes left an older estimate visible. The engineering team subsequently confirmed that the live Cloud Run service received a response from NVIDIA NIM.

The next priorities are to verify that generated guides cover every care period and that estimates refresh immediately when plant selections change. A proposed community pilot would record who can reach and use the space before planting, check pedestrian accessibility after planting, and count surviving seedlings at six and twelve months.

## Project team

- **Laurine Ndanu Nzuki — AI Research & Frontend.** Led frontend development, user experience, and AI research.
- **Alice Severi Gonçalves — Cloud Engineering, Backend & Cloud Security.** Led backend development, ecological data integration, recommendation logic, Cloud Run deployment, and cloud security hardening & sign-off.
- **Barbara Roberto Mulu — Product Narrative Lead & AI Cloud Leader.** Led the product narrative, product brief, volunteer journey, SDG alignment, and presentation storytelling.
- **Idris Belgore Abiodun — Cloud Cybersecurity.** Supported security review, access controls, and secure cloud development.

## Further documentation

- [Product brief](docs/PRODUCT_BRIEF.md)
- [Architecture and API verification](docs/ARCHITECTURE.md)
- [Data schema](docs/DATA_SCHEMA.md)
- [Security](docs/SECURITY.md)
- [Project journal and build milestones](docs/PROJECT_JOURNAL.md)
