---
name: git-commit-pr
description: >-
  Standardizes Git branch creation, directory-scoped Conventional Commits, pre-commit
  compliance checks, and Pull Request generation using .github/pull_request_template.md.
  Use this skill whenever the user asks to stage, commit, push changes, create a branch,
  or draft/open a Pull Request in CanopyCrew.
---

# CanopyCrew Git Commit & Pull Request Workflow

Follow these steps in order whenever committing changes or preparing a Pull Request.

## Step 1: Inspect Modified Directories & Map Scope
1. Run `git status` and `git diff --stat` (plus `git diff --cached --stat`) to list all modified and untracked files.
2. Map the changed file paths to their canonical `<scope>` and lane owner:
   - `backend/app/api/`, `schemas/`, `services/`, `core/`, `models/` -> scope: `backend` (Lane: Alice)
   - `backend/app/agent/` -> scope: `agent` (Lane: Laurine / Alice)
   - `backend/data/` or `data/species/` -> scope: `data` (Lane: Alice)
   - `frontend/` -> scope: `frontend` (Lane: Laurine)
   - `docs/` -> scope: `docs` (Lane: Barbara)
   - `.devcontainer/`, `.github/`, deployment scripts -> scope: `infra` or `ci`
   - `.agents/` -> scope: `rules` or `skills`
3. If unrelated directories across multiple lanes are modified together, split them into separate atomic commits unless they form a single coordinated contract change.

## Step 2: Enforce Branch Pattern
1. Check the active branch with `git branch --show-current`.
2. If on `main`, **stop and switch** to a compliant branch before committing:
   - Backend feature: `git checkout -b feature/backend-<kebab-topic>`
   - Frontend feature: `git checkout -b feature/frontend-<kebab-topic>`
   - Bugfix: `git checkout -b fix/<scope>-<kebab-issue>`
   - Docs / Infra / Tooling: `git checkout -b docs/<kebab-topic>` or `chore/<scope>-<kebab-topic>`

## Step 3: Run Pre-Commit Guardrail Audit
Inspect `git diff` (and untracked file contents) against CanopyCrew's non-negotiable guardrails:
1. **Secrets & Credentials:** Confirm zero API keys (`NVIDIA_API_KEY`), tokens, service account JSONs, or `.env` files are staged.
2. **Shared & Protected Files:** Check if `README.md`, `LICENSE`, `.gitignore`, `.env.example`, or `docs/PRODUCT_BRIEF.md` are modified. Only stage them if explicitly requested by the user.
3. **Ecological & Deterministic Rules (when `backend/` or `data/` changed):**
   - Botanical filtering, height/wire checks (`overhead_power_lines == true` -> `sidewalk_wire_safe == true` and `mature_height_meters <= 5.0`), and cost/growth math execute in deterministic Python, never via LLM prompts.
   - Zero exotic/invasive species (*Ficus microcarpa*, *Ligustrum lucidum*, *Eucalyptus*).
4. **Budget & Dependencies:** Confirm no unpinned heavy packages were added and Cloud Run flags keep `--min-instances 0 --max-instances 2`.

## Step 4: Stage & Commit Using Standard Pattern
1. Stage only the intended files explicitly (`git add <paths>` — avoid blind `git add .` when untracked scratch or local config files exist).
2. Format the commit message strictly as:
   ```text
   <type>(<scope>): <imperative lowercase summary under 72 chars>

   - <concise bullet describing key change and why>
   - <concise bullet describing validation or compliance impact>
   ```
   - Allowed `<type>`: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`
   - Examples:
     - `feat(backend): add wire-safe species filter for sidewalk strips`
     - `chore(infra): configure codespaces devcontainer and pr template`
     - `docs(api): document site archetype request schema`
3. Verify the commit succeeded via `git log -n 1 --stat`.

## Step 5: Draft or Create the Pull Request
1. Read `.github/pull_request_template.md` first so the PR body matches the exact latest template structure.
2. Construct the **PR Title** using Conventional Commits: `<type>(<scope>): <summary>`.
3. Populate **every section** of `.github/pull_request_template.md` without deleting headings or checkboxes:
   - **📌 Summary of Changes:** 2–3 concrete bullets summarizing what changed + issue/dependency reference.
   - **🎯 Program & SDG Alignment:** Specify exact **Component Affected** (`backend/`, `frontend/`, `infra`, etc.) and relevant municipal standards checked.
   - **👥 What This Means for Each Lane:** Write specific, actionable notes for `@Alice`, `@Laurine`, `@Barbara`, and `@Idris` (write `No action required — no impact on <lane>` when unaffected, rather than leaving blank HTML comments).
   - **🧪 How to Test & Verify:** Keep the standard backend/frontend commands and fill step `4` with concrete endpoints, commands, or UI checks for this branch.
   - **📸 Screenshots:** Attach UI screenshots or explicitly mark `N/A (non-UI change)`.
   - **🔒 Security, Ecology & Budget Checklist:** Mark `[x]` ONLY for items you actually verified in Step 3; leave `[ ]` for items requiring human sign-off and note why.
4. If the user asks to open the PR on GitHub and `gh` CLI is available and authenticated, push the feature branch (`git push -u origin <branch>`) and create the PR using `gh pr create --base main --title "<title>" --body-file <temp-body-file>`. Otherwise, present the ready-to-paste PR Title and Markdown Body directly.
