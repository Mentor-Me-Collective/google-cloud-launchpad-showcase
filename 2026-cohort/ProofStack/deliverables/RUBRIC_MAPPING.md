# ProofStack — MMC BUILD Rubric Crosswalk

This file maps the final ProofStack submission directly to the MMC BUILD grading rubric so reviewers can locate evidence quickly.

## 1. Problem Grounding — 20%

**Rubric intent:** clearly define the problem, target user/context, research grounding, and SDG connection.

**ProofStack evidence**
- Problem statement and reviewer need: `README.md`, `deliverables/FINAL_BRIEF.md`
- Synthetic evidence design and operational-vs-policy distinction: `data/`, `docs/PRODUCT_BRIEF.md`
- SDG 1 connection and limitations: `README.md`, `deliverables/FINAL_BRIEF.md`, `deliverables/RESEARCH_PAPER.md`
- Clear non-claims: no compliance certification, production-readiness, or direct poverty-reduction claim

**Why it meets the criterion**
ProofStack addresses a bounded assurance problem: reviewers must decide whether submitted evidence actually demonstrates a security claim for the right scope and period. The capstone makes that decision inspectable rather than treating relevance or model confidence as proof.

## 2. Solution Quality — 25%

**Rubric intent:** useful, coherent, functioning solution with meaningful Google Cloud and NVIDIA technology use.

**ProofStack evidence**
- Working reviewer application: `app.py`
- Cloud Run hosting and Firestore persistence: `docs/GCP_DEPLOYMENT.md`, `src/proofstack/storage/firestore.py`
- Vertex AI/Gemini advisory path: `src/proofstack/providers/google_vertex.py`
- NVIDIA NIM advisory path: `src/proofstack/providers/nvidia_nim.py`, `scripts/check_nvidia.py`
- Human authority and fail-closed control design: `src/proofstack/parser.py`, `src/proofstack/review_state.py`
- Citation grounding: `src/proofstack/evidence.py`
- Architecture: `docs/images/proofstack-architecture.svg`
- Product screenshots: `docs/images/proofstack-reviewer-workflow.png`, `docs/images/proofstack-advisory-grounding.png`

**Verified product evidence**
- final Cloud Run revision: `proofstack-00002-p7s`
- NVIDIA NIM verified with `nvidia/nemotron-3.5-bolt-e4b`
- 95.0% frozen Vertex accuracy
- 100% parse success
- 100% citation grounding
- 4/4 live adversarial probes passed

## 3. Implementation Plan — 20%

**Rubric intent:** credible implementation approach covering timeline, resources, risks, testing, and next steps.

**Timeline**
- Week 1: framing, synthetic corpus, canonical claims, reviewer workflow
- Week 2: vertical slice, Cloud Run/Firestore path, provider abstraction, human-decision controls
- Week 3: Google Cloud + NVIDIA integrations, security/reliability testing, evaluation preparation
- Week 4: frozen evaluation, error analysis, final hardened deploy, submission artifacts

**Resources**
- Streamlit
- Google Cloud Run
- Firestore
- Vertex AI / Gemini 3.8 Flash
- NVIDIA NIM / Nemotron
- GitHub Actions
- pytest
- gitleaks
- synthetic 20-case evidence corpus

**Risks and mitigations**
- model misinterpretation → human final authority
- prompt injection → untrusted-evidence boundary
- fabricated citation → independent grounding check
- ambiguous output → fail closed
- secret exposure → ADC/runtime-only secrets + full-history secret scan
- stale assessment → claim/evidence binding + state reset

**Testing**
- automated unit/regression tests
- dataset validation
- Cloud Run/Firestore smoke tests
- frozen 20-case human-gold evaluation
- four live adversarial provider probes

**Next steps**
- independent labelers and inter-rater agreement
- larger and less synthetic evidence corpus
- richer evidence formats
- rate limiting/operational monitoring
- production privacy/security review
- stronger scope/time adversarial testing

Primary evidence: `README.md`, `deliverables/FINAL_BRIEF.md`, `docs/SECURITY.md`, `docs/EVALUATION_RESULTS.md`, `STATUS.md`.

## 4. Codebase — 25%

**Rubric intent:** complete, understandable, reproducible codebase and supporting assets.

**ProofStack evidence**
- application: `app.py`
- modular source: `src/proofstack/`
- tests: `tests/`
- sample/synthetic data: `data/`
- evaluation artifacts: `results/`
- deployment and validation scripts: `scripts/`
- documentation: `docs/`
- CI and dependency management: `.github/`
- containerization: `Dockerfile`
- setup/reproduction: `README.md`
- license: `LICENSE`

The repository contains the product code, sample data, test evidence, architecture, security rationale, deployment instructions, and evaluation provenance required to reproduce and inspect the capstone.

## 5. Documentation & Presentation — 10%

**Rubric intent:** clear README, concise written summary, deck, recorded walkthrough, and visible team contribution record.

**Complete**
- README with problem, SDG context, solution, setup/run, Google Cloud integration, NVIDIA integration, evaluation, limitations, team contributions, future ideas
- final project brief within 3-page limit
- research paper
- 8-slide presentation
- demo narration script
- individual contribution record
- polished PPTX/PDF artifacts uploaded to the MMC showcase branch
- open MMC PR #5 to `main`, intentionally left unmerged
- product screenshots showing the reviewer workflow and citation-grounding state

**Remaining**
- final recorded walkthrough, maximum 5 minutes
- walkthrough link added to README/submission
- final MMC submission action

## Final rubric posture

| Category | Weight | Submission evidence status |
|---|---:|---|
| Problem Grounding | 20% | Complete |
| Solution Quality | 25% | Complete |
| Implementation Plan | 20% | Complete and explicitly documented |
| Codebase | 25% | Complete |
| Documentation & Presentation | 10% | Complete except final video |

The remaining work is presentation media only; no additional product, architecture, evaluation, or security build work is required.
