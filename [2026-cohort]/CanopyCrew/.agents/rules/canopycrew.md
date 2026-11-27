---
trigger: always_on
---

# Antigravity Agent Rules: CanopyCrew

## 1. Project Context & Mission
- **Project:** CanopyCrew (UN SDG 11: Sustainable Cities and Communities — Target 11.7).
- **Core Product:** An urban rewilding matchmaker for São Paulo that translates urban site constraints into verified native plant selections, growth/cost estimates, and recurring volunteer care tasks.
- **Scope Limit (4-Week MVP):** Exactly 3 site archetypes (Sidewalk Strip, Sunny Lot, Shaded Courtyard) and 10 reviewed native Atlantic Forest species. Dynamic satellite GIS mapping and native mobile apps are explicitly out of scope.

## 2. Lane Ownership & Operational Boundaries
- **Alice (Cloud Engineering):** Owns `backend/`, data modeling, Pydantic schemas, municipal compliance, and Cloud Run deployment.
- **Laurine (AI Research / Lead):** Owns `frontend/`, UI/UX, and NVIDIA NIM prompt templates.
- **Barbara (AI Cloud Leader):** Owns `docs/PRODUCT_BRIEF.md`, pitch narrative, and SDG 11 metrics. Do not overwrite her markdown sections without explicit instructions.
- **Idris (Cloud Cybersecurity):** Owns IAM, Google Secret Manager, and API key isolation. Never hardcode credentials.

## 3. Backend Technical Standards (Python & FastAPI)
- **Runtime:** Python 3.12.7 (enforced by `.python-version`).
- **Architecture Pattern:**
  - `app/api/routes/`: Route controllers and HTTP status code definitions.
  - `app/schemas/`: Pure Pydantic v2 models for request/response payloads.
  - `app/services/`: Deterministic business logic, cost calculations, and plant filtering.
  - `app/core/`: Configuration, CORS settings, and environment loading via `pydantic-settings`.
  - `backend/data/`: Static JSON datasets (`sites.json`, `species.json`).
- **Deterministic Separation:** All biological matchings (sunlight, wire safety, root containment) and cost/growth math must execute in deterministic Python service code—never delegate factual botanical rules or mathematical totals to an LLM.
- **CORS Requirements:** Explicitly allow `http://localhost:5173` and production Cloud Run domains in `main.py`.

## 4. Ecological Grounding & Legal Compliance
- All species must match São Paulo municipal standards: *Portaria SVMA nº 26/2024*, *BioSampa* (5ª Edição), and the *Plano Municipal de Arborização Urbana (PMAU)*.
- Never suggest exotic or invasive species (e.g., *Ficus microcarpa*, *Ligustrum lucidum*, *Eucalyptus*).
- Hard constraint: If a site has `overhead_power_lines == true`, all recommended species MUST have `sidewalk_wire_safe == true` and `mature_height_meters <= 5.0`.

## 5. Security & Financial Guardrails ($0 Spend)
- **Zero Hardcoded Secrets:** Never write API keys (`NVIDIA_API_KEY`, service accounts) into `.env`, code, or Git history. Load via environment variables injected by Google Secret Manager.
- **Cost Protection:** Restrict cloud resources to Google Cloud Free Quotas (Cloud Run: max 2 million requests/mo; Firestore: 1 GiB storage). Always use `--allow-unauthenticated` and serverless auto-scale to zero instances (`--min-instances 0 --max-instances 2`).

## 6. Git & File Generation Norms
- Never push directly to `main`. Create semantic feature branches: `feature/backend-<feature-name>`.
- Commit messages must follow Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Code changes must keep existing package installations operational without introducing unpinned heavy dependencies.

