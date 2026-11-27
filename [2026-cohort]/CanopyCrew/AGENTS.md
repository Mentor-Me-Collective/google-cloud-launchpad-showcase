# CanopyCrew — Cross-Agent Rules & Skills Guide (`AGENTS.md`)

This file is the universal entrypoint for AI coding assistants working in **CanopyCrew** (Antigravity, GitHub Copilot, Cursor, OpenAI Codex, Gemini CLI, Windsurf, and others). Every agent MUST follow the core guardrails below and load the linked rules and workflow skills in `.agents/` whenever relevant.

---

## 1. Authoritative Rules Index (`.agents/rules/`)

All project rules live in `.agents/rules/`. If your runtime does not automatically inject `.agents/rules/*.md`, **read the relevant rule file before making changes**:

| Rule File | Scope & When to Read |
| :--- | :--- |
| [`.agents/rules/canopycrew.md`](./.agents/rules/canopycrew.md) | **Always active.** Core mission (UN SDG 11.7), 4-lane ownership, Python 3.12.7 / FastAPI architecture, São Paulo botanical compliance, and `$0` cloud/security guardrails. |
| [`.agents/rules/git-pr-standards.md`](./.agents/rules/git-pr-standards.md) | **Before any Git or PR operation.** Branch naming (`<prefix>/<scope>-<topic>`), directory-scoped Conventional Commits, pre-commit safety checks, and PR template compliance. |
| [`.agents/rules/docs-and-deliverables.md`](./.agents/rules/docs-and-deliverables.md) | **Before editing `docs/` or `README.md`.** Document lane ownership and mandatory alignment with the 5 GCLP x MMC capstone rubric pillars. |

---

## 2. Reusable Workflow Skills (`.agents/skills/`)

CanopyCrew follows the open `SKILL.md` standard under `.agents/skills/`. Whenever a user request matches a trigger below, **open and follow that skill's `SKILL.md` step-by-step**:

| Skill | Path | Trigger / When to Activate |
| :--- | :--- | :--- |
| **`git-commit-pr`** | [`.agents/skills/git-commit-pr/SKILL.md`](./.agents/skills/git-commit-pr/SKILL.md) | Creating a branch, staging/committing code, pushing changes, or drafting/opening a Pull Request using `.github/pull_request_template.md`. |
| **`doc-helper`** | [`.agents/skills/doc-helper/SKILL.md`](./.agents/skills/doc-helper/SKILL.md) | Drafting, formatting, reviewing, or updating markdown deliverables in `docs/` (`PRODUCT_BRIEF.md`, `ARCHITECTURE.md`, `DATA_SCHEMA.md`, `SECURITY.md`) or `README.md`. |
| **`project-journal`** | [`.agents/skills/project-journal/SKILL.md`](./.agents/skills/project-journal/SKILL.md) | Appending a milestone or PR log entry to `docs/PROJECT_JOURNAL.md` or generating a `#mmc-build` Slack status snippet. |

---

## 3. Non-Negotiable Guardrails (Summary)

1. **MVP Scope:** Strictly 3 São Paulo site archetypes (`Sidewalk Strip`, `Sunny Lot`, `Shaded Courtyard`) and 10 verified native Atlantic Forest species. Dynamic GIS/satellite mapping and native mobile apps are out of scope.
2. **4-Lane Ownership:**
   - **Alice (Cloud Engineering):** `backend/`, Pydantic v2 schemas, deterministic matching/cost math, `docs/ARCHITECTURE.md`, `docs/DATA_SCHEMA.md`, Cloud Run.
   - **Laurine (AI Research / Lead):** `frontend/`, UI/UX, and NVIDIA NIM prompt templates (`backend/app/agent/`).
   - **Barbara (AI Cloud Leader):** `docs/PRODUCT_BRIEF.md`, pitch narrative, and SDG 11 metrics (never overwrite her narrative sections without explicit instruction).
   - **Idris (Cloud Cybersecurity):** IAM, Google Secret Manager, API key isolation, and `docs/SECURITY.md`.
3. **Deterministic Python vs. LLM Split:** All botanical filtering (sunlight, root containment, wire safety) and cost/growth math MUST run in deterministic Python (`backend/app/services/`). NVIDIA NIM is used strictly to synthesize natural-language care narratives—never for botanical compliance or math.
4. **Ecological & Legal Hard Constraint:** Comply with *Portaria SVMA nº 26/2024*, *BioSampa (5ª Edição)*, and *PMAU*. Never suggest exotic/invasive species (*Ficus microcarpa*, *Ligustrum lucidum*, *Eucalyptus*). When `overhead_power_lines == true`, every recommended species MUST satisfy `sidewalk_wire_safe == true` and `mature_height_meters <= 5.0`.
5. **Security & `$0` Budget:** Zero hardcoded secrets or `.env` commits (`NVIDIA_API_KEY` injected via Google Secret Manager). Restrict GCP resources to Free Tier quotas (`--allow-unauthenticated --min-instances 0 --max-instances 2`).
6. **Git Hygiene:** Never commit or push directly to `main`. Use `<prefix>/<scope>-<kebab-topic>` branches and `<type>(<scope>): <summary>` Conventional Commits. Do not modify shared files (`README.md`, `LICENSE`, `.gitignore`, `.env.example`, `docs/PRODUCT_BRIEF.md`) unless explicitly instructed.

---

## 4. Custom Workspace Subagents (`.agents/agents/`)

CanopyCrew defines dedicated workspace subagents to enforce guardrails and streamline domain tasks:

| Subagent | Path | Role & Mandate |
| :--- | :--- | :--- |
| **`canopy-steward`** | [`.agents/agents/canopy-steward.md`](./.agents/agents/canopy-steward.md) | Dedicated CanopyCrew development & compliance steward. Strictly enforces 4-lane ownership, UN SDG 11.7 mission, São Paulo municipal botanical compliance (*Portaria SVMA nº 26/2024*, *BioSampa*, *PMAU*), wire-safety invariants, `$0` cloud budget, and Conventional Commits / PR standards. |


