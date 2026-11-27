---
trigger: always_on
---

# Documentation & Deliverable Constraints (`docs-and-deliverables.md`)

## 1. Document Ownership & Lane Guardrails
- `docs/PRODUCT_BRIEF.md`: Owned by **Barbara (AI Cloud Leader)**. Agents and teammates in other lanes must NEVER overwrite narrative sections; provide technical inputs via PR comments or `docs/DATA_SCHEMA.md` and `docs/ARCHITECTURE.md`.
- `docs/DATA_SCHEMA.md` & `docs/ARCHITECTURE.md`: Owned by **Alice (Cloud Engineering)**. Single source of truth for REST endpoints, JSON fields, and Cloud Run deployment.
- `docs/SECURITY.md`: Owned by **Idris (Cloud Cybersecurity)**. Covers IAM least-privilege, Secret Manager (`NVIDIA_API_KEY`), and CORS/input sanitization.
- `docs/PROJECT_JOURNAL.md`: Shared chronological log of PRs, architectural decisions, and weekly #mmc-build updates.

## 2. Mandatory Capstone Rubric Alignment
Every outward-facing document (`PRODUCT_BRIEF.md`, `README.md`, slide outlines) MUST explicitly address the 5 graded rubric pillars:
1. **Problem Grounding (20%):** Cite UN SDG 11 (Target 11.7) and São Paulo municipal standards (*Portaria SVMA nº 26/2024*, *BioSampa 5ª Edição*, *PMAU*).
2. **Solution Quality (25%):** Emphasize the 3 site archetypes (Sidewalk Strip <1.5m, Sunny Lot 20–50m², Shaded Courtyard 15–30m²) and 10 native Atlantic Forest species.
3. **Implementation Plan (20%):** Clear 4-lane ownership, $0 budget guardrails, and 4-week milestone tracking.
4. **Codebase & Architecture (25%):** Explicitly state how **both Google Cloud (Cloud Run + Firestore) and NVIDIA (NIM API)** power meaningful product features, while keeping botanical filtering and cost math strictly in deterministic Python.
5. **Documentation & Presentation (10%):** Zero-install browser reproducibility (GitHub Codespaces) and step-by-step verification commands.

## 3. Formatting & Zero-Friction Rules
- Use clean GitHub-Flavored Markdown (tables, task lists `- [ ]`, fenced code blocks).
- Never include real API keys, `.env` values, or personal billing IDs in any documentation example.