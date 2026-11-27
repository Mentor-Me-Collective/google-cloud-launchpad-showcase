# GitHub Copilot Instructions: CanopyCrew

CanopyCrew uses a shared cross-agent rule and skill architecture rooted in [`AGENTS.md`](../AGENTS.md) and `.agents/`. Follow every guardrail below and inspect the linked rule/skill files whenever performing specialized tasks.

## 1. Rules & Workflow Skills Lookup
- **Cross-Agent Entrypoint:** [`AGENTS.md`](../AGENTS.md)
- **Detailed Rule Files (read when working in matching areas):**
  - [`.agents/rules/canopycrew.md`](../.agents/rules/canopycrew.md) — Core architecture, ecological rules, and `$0` GCP guardrails.
  - [`.agents/rules/git-pr-standards.md`](../.agents/rules/git-pr-standards.md) — Branch naming, directory-to-scope Conventional Commits, and PR standards.
  - [`.agents/rules/docs-and-deliverables.md`](../.agents/rules/docs-and-deliverables.md) — Document ownership and 5 GCLP x MMC capstone rubric pillars.
- **Workflow Skills (read the `SKILL.md` file before executing the workflow):**
  - **Git / Commits / PRs:** [`.agents/skills/git-commit-pr/SKILL.md`](../.agents/skills/git-commit-pr/SKILL.md) (mandatory when creating branches, committing, or drafting PRs with [`.github/pull_request_template.md`](./pull_request_template.md)).
  - **Documentation Drafting:** [`.agents/skills/doc-helper/SKILL.md`](../.agents/skills/doc-helper/SKILL.md) (mandatory when editing `docs/*.md` or `README.md`).
  - **Milestone Logging & Slack Updates:** [`.agents/skills/project-journal/SKILL.md`](../.agents/skills/project-journal/SKILL.md) (mandatory when updating `docs/PROJECT_JOURNAL.md` or drafting `#mmc-build` updates).

## 2. Project Context & Scope
- **Project:** CanopyCrew (UN SDG 11: Sustainable Cities and Communities — Target 11.7).
- **Core Product:** An urban rewilding matchmaker for São Paulo translating urban site constraints into verified native plant selections, growth/cost estimates, and recurring volunteer care tasks.
- **Scope Limit (4-Week MVP):** Exactly 3 site archetypes (`Sidewalk Strip`, `Sunny Lot`, `Shaded Courtyard`) and 10 reviewed native Atlantic Forest species. Dynamic satellite GIS mapping and native mobile apps are out of scope.

## 3. Lane Ownership & Operational Boundaries
- **Alice (Cloud Engineering):** Owns `backend/`, data modeling, Pydantic schemas, municipal compliance, `docs/ARCHITECTURE.md`, `docs/DATA_SCHEMA.md`, and Cloud Run deployment.
- **Laurine (AI Research / Lead):** Owns `frontend/`, UI/UX, and NVIDIA NIM prompt templates (`backend/app/agent/`).
- **Barbara (AI Cloud Leader):** Owns `docs/PRODUCT_BRIEF.md`, pitch narrative, and SDG 11 metrics. Never overwrite her markdown sections without explicit instructions.
- **Idris (Cloud Cybersecurity):** Owns IAM, Google Secret Manager, API key isolation, and `docs/SECURITY.md`. Never hardcode credentials.

## 4. Backend Technical Standards (Python 3.12.7 & FastAPI)
- `app/api/routes/`: Route controllers and HTTP status code definitions.
- `app/schemas/`: Pure Pydantic v2 models for request/response payloads.
- `app/services/`: Deterministic business logic, cost calculations, and plant filtering.
- `app/core/`: Configuration, CORS settings, and environment loading via `pydantic-settings`.
- `backend/data/`: Static JSON datasets (`sites.json`, `species.json`).
- **Deterministic Separation:** All biological matchings (sunlight, wire safety, root containment) and cost/growth math MUST execute in deterministic Python service code—never delegate factual botanical rules or math totals to an LLM.
- **CORS Requirements:** Explicitly allow `http://localhost:5173` and production Cloud Run domains in `main.py`.

## 5. Ecological Grounding & Legal Compliance
- All species must match São Paulo municipal standards: *Portaria SVMA nº 26/2024*, *BioSampa* (5ª Edição), and the *Plano Municipal de Arborização Urbana (PMAU)*.
- Never suggest exotic or invasive species (e.g., *Ficus microcarpa*, *Ligustrum lucidum*, *Eucalyptus*).
- **Hard Constraint:** If `overhead_power_lines == true`, all recommended species MUST have `sidewalk_wire_safe == true` and `mature_height_meters <= 5.0`.

## 6. Security, $0 Budget & Git Norms
- **Zero Hardcoded Secrets:** Never write API keys (`NVIDIA_API_KEY`, service accounts) into `.env`, code, or Git history. Inject via Google Secret Manager.
- **Cost Protection:** Keep resources within Google Cloud Free Tier (`--allow-unauthenticated --min-instances 0 --max-instances 2`).
- **Git & PRs:** Never push directly to `main`. Use `<prefix>/<scope>-<kebab-topic>` branches, `<type>(<scope>): <summary>` Conventional Commits, and populate every section of `.github/pull_request_template.md`.
