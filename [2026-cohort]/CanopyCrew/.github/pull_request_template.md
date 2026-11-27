## 📌 Summary of Changes
<!-- Provide a 2–3 bullet summary of what was added, changed, or fixed -->
- 

**Related Issue / Dependencies:** <!-- e.g., Closes #12, or N/A -->

## 🎯 Program & SDG Alignment
- **Component Affected:** <!-- e.g., backend/, frontend/, data/, docs/, infra -->
- **SDG Target:** UN SDG 11: Sustainable Cities & Communities (Target 11.7)
- **Municipal Standards Checked:** *Portaria SVMA nº 26/2024*, *BioSampa* (5ª Edição), and *PMAU*

## 👥 What This Means for Each Lane
- **@Alice (Cloud Engineering / Backend):** <!-- e.g., New endpoints, Pydantic schema updates, Cloud Run config -->
- **@Laurine (AI Research / Frontend):** <!-- e.g., UI fields available, API contract or NIM prompt changes -->
- **@Barbara (AI Cloud Leader):** <!-- e.g., Impact on docs/PRODUCT_BRIEF.md, SDG 11 metrics, Codespaces -->
- **@Idris (Cloud Cybersecurity):** <!-- e.g., Input validation, IAM, Google Secret Manager needs -->

## 🧪 How to Test & Verify
1. Open this branch in **GitHub Codespaces** (or local VS Code).
2. Run backend checks:
   ```bash
   cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
   ```
3. Run frontend checks:
   ```bash
   cd frontend && npm install && npm run dev
   ```
4. Verify expected behavior:
   - <!-- Describe specific endpoint, payload, or UI flow tested -->

## 📸 Screenshots (UI Changes Only)
<!-- Attach before/after screenshots if frontend UI was modified, or write N/A -->

## 🔒 Security, Ecology & Budget Checklist
- [ ] **Zero Secrets:** No API keys (`NVIDIA_API_KEY`, service accounts) or credentials committed in plaintext or `.env`
- [ ] **$0 Budget & Dependencies:** Free-tier verified (`--min-instances 0 --max-instances 2` on Cloud Run, GitHub Codespaces quota) with no unpinned heavy dependencies
- [ ] **Deterministic Guardrails:** Botanical matching and cost/growth math run in deterministic Python (not delegated to an LLM)
- [ ] **Ecological Compliance:** Native Atlantic Forest species only (zero exotic/invasive species); `overhead_power_lines` sites enforce `sidewalk_wire_safe == true` and `mature_height_meters <= 5.0`
- [ ] **Lane Boundaries:** Shared files and `docs/PRODUCT_BRIEF.md` were not modified without team coordination

## 📋 Governance Notes (AI Cloud CoP)
- This change was coordinated with the AI Cloud CoP (Barbara, Laurinne, Alice, Idris).
- **Product Brief Impact:** `docs/PRODUCT_BRIEF.md` was updated to reflect the new capability and ensure alignment with the product vision.
