---
name: project-journal
description: >-
  Appends a structured milestone or PR entry to docs/PROJECT_JOURNAL.md and
  generates a ready-to-post Slack update for #mmc-build. Use after completing a
  Pull Request, finishing a weekly team meeting, or preparing a status update.
---

# CanopyCrew Project Journal & Update Skill (`project-journal`)

## When to Use
Use after completing a Pull Request, finishing a weekly team meeting, or preparing a Tuesday/Friday status thread for `#mmc-build`.

## Execution Steps
1. **Gather Context:**
   - Inspect recent git commits (`git log -n 5 --oneline`) or the PR summary provided by the user.
2. **Update `docs/PROJECT_JOURNAL.md`:**
   - Append a new dated entry under `## Chronological Log` using this exact template:
     ```markdown
     ### [YYYY-MM-DD] — <PR Title or Milestone Name> (`<branch-name>`)
     - **Author / Lane:** <Name & Track>
     - **Changes Delivered:** 2–3 concise bullets of technical or documentation deliverables.
     - **Cross-Lane Unblocks:** How this helps Frontend (Laurine), Product Brief (Barbara), Backend (Alice), or Security (Idris).
     - **Verification:** Commands or tests passed (e.g., `pytest -v`).
     ```
3. **Generate the `#mmc-build` Slack Snippet:**
   - Output a copy-pasteable Slack block tagging `@Laurine Ndanu Nzuki`, `@Alice Severi Gonçalves`, `@Barbara Roberto Mulu`, and `@Idris Belgore Abiodun` summarizing:
     - ✅ **Completed:** What just shipped
     - 🚧 **Next Up:** Immediate next sprint item
     - 🛡️ **Blockers / Risks:** Any blockers (or "None — Codespaces & $0 guardrails active")
