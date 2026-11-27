---
trigger: always_on
---

# Git Commit & Pull Request Standards

All branches, commits, and Pull Requests in the CanopyCrew repository MUST follow these standardized patterns. Whenever creating a branch, committing changes, or drafting/opening a Pull Request, activate and follow the `git-commit-pr` skill.

## 1. Branch Naming Standard
- **Never commit or push directly to `main`.** If currently on `main`, create and switch to a semantic branch first.
- Use `<prefix>/<scope>-<kebab-case-topic>`:
  - `feature/backend-<feature-name>` (Alice — Backend / Cloud Run / Data Modeling)
  - `feature/frontend-<feature-name>` (Laurine — Frontend / NIM Prompts)
  - `fix/<scope>-<issue-name>`
  - `docs/<scope>-<doc-name>`
  - `test/<scope>-<test-name>`
  - `chore/<scope>-<task-name>`

## 2. Directory-to-Scope Commit Pattern (Conventional Commits)
Format every commit header as:
`<type>(<scope>): <imperative lowercase summary>` (max 72 characters)

- **Allowed `<type>` values:** `feat`, `fix`, `docs`, `refactor`, `chore`, `test`
- **Canonical `<scope>` mapped from modified directory:**
  - `backend/` (routes, schemas, services, core) -> `backend`
  - `backend/app/agent/` -> `agent`
  - `backend/data/` or `data/species/` -> `data`
  - `frontend/` -> `frontend`
  - `docs/` or root markdown -> `docs`
  - `.github/`, `.devcontainer/`, Cloud Run configs -> `infra` or `ci`
  - `.agents/` -> `chore(rules)` or `chore(skills)`
- Keep commits atomic by directory/lane. Do not bundle uncoordinated cross-lane changes into a single commit.

## 3. Pre-Commit Safety Gate
Before running `git commit`:
- Verify zero plaintext secrets, API keys (`NVIDIA_API_KEY`), or `.env` files are staged.
- Verify shared files (`README.md`, `LICENSE`, `.gitignore`, `.env.example`, `docs/PRODUCT_BRIEF.md`) were not altered without explicit instruction.
- Verify no unpinned heavy dependencies were introduced.

## 4. Pull Request Standard
- **PR Title:** Must match Conventional Commits format (`<type>(<scope>): <summary>`).
- **PR Body:** Must strictly use `.github/pull_request_template.md` with all sections completed—including concrete lane impact notes for `@Alice`, `@Laurine`, `@Barbara`, and `@Idris`, runnable test commands, and verified compliance checkboxes.
