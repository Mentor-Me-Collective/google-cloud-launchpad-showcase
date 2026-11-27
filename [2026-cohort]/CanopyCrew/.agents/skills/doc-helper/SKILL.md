---
name: doc-helper
description: >-
  Drafts, formats, or updates CanopyCrew project documentation (Product Brief,
  Architecture, Data Schema, Security, or README) while enforcing GCLP x MMC
  rubric rules and lane ownership. Use when creating, reviewing, or editing
  markdown documents in docs/ or README.md.
---

# CanopyCrew Document Helper Skill (`doc-helper`)

## When to Use
Use when a teammate asks to draft, format, review, or update a markdown document in `docs/` or `README.md`.

## Execution Steps
1. **Check Lane Ownership:**
   - Verify which file is being edited (`PRODUCT_BRIEF.md`, `DATA_SCHEMA.md`, `ARCHITECTURE.md`, `SECURITY.md`, or `README.md`).
   - If editing `docs/PRODUCT_BRIEF.md`, preserve Barbara's narrative voice and only populate or refine the requested section.
2. **Enforce Fact & Scope Constraints:**
   - **Sites:** Strictly limit to the 3 archetypes (`site-a-sidewalk-strip`, `site-b-sunny-lot`, `site-c-shaded-courtyard`).
   - **Flora:** Strictly limit to the 10 verified native Atlantic Forest species (*Portaria SVMA nº 26/2024* / *BioSampa*).
   - **Tech Split:** Explicitly document that **Google Cloud Run** executes deterministic Python filtering/cost math and **NVIDIA NIM** synthesizes the natural-language volunteer care narrative.
   - **Budget:** State the `$0` spend policy (`--min-instances 0 --max-instances 2`, no paid SQL databases).
3. **Output Format:**
   - Generate ready-to-commit Markdown that works cleanly in the GitHub Web Editor (pressing `.` in the repo) so non-technical teammates can copy-paste without terminal commands.
