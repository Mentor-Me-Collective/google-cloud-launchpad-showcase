# ProofStack

[![CI](https://github.com/jtflack-grc/proofstack/actions/workflows/ci.yml/badge.svg)](https://github.com/jtflack-grc/proofstack/actions/workflows/ci.yml)

**Turn security-questionnaire claims into traceable evidence decisions.**

ProofStack is a human-in-the-loop evidence-review capstone built for the question that matters after a security questionnaire is answered:

> **Does the submitted evidence actually prove the claim?**

The MVP contains **10 security questions** and **20 synthetic evidence documents**. ProofStack supports advisory assessment through either Vertex AI or NVIDIA NIM, citations are independently grounded against the submitted evidence, and a human reviewer remains the final authority.

## Verified result

| Measure | Final result |
|---|---:|
| Model | `gemini-3.8-flash` on Vertex AI |
| Frozen evaluation set | 20 cases |
| Accuracy | **95.0% (19/20)** |
| Macro precision | **95.0%** |
| Macro recall | **95.45%** |
| Macro F1 | **94.99%** |
| Parse success | **100% (20/20)** |
| Citation grounding | **100% (20/20)** |
| Live adversarial probes | **4/4 passed** |
| Gold labels | 9 SUPPORTED / 11 UNSUPPORTED |

The single model error was **Q06 / E12**. The evidence showed successful backups and a successful restore test, but the artifact was scoped to **Q3 2026** while the claim required evidence from the **current quarter (Q4)**. Gemini cited real evidence and still made the wrong judgment.

> ## Grounded does not mean correct.

That failure is the central ProofStack result: citation grounding improves traceability, but it does not replace human interpretation of scope, timing, or control criteria.

## Reviewer flow

`question → claim → evidence → AI advisory → citation check → human decision → traceable record`

1. Select a questionnaire claim.
2. Inspect the submitted evidence.
3. Ask the configured model for SUPPORTED / UNSUPPORTED.
4. Show the model rationale and cited excerpt.
5. Independently verify that the excerpt exists in the evidence.
6. Require a human reviewer to make the final decision.
7. Preserve the decision and provenance for later review.

ProofStack does **not** certify compliance, invent missing controls, or replace professional judgment.

## Architecture

![ProofStack architecture](docs/images/proofstack-architecture.svg)

The application runs on **Cloud Run** and persists reviewer decisions in **Firestore**. Advisory model assessment can be provided by **Vertex AI / Gemini** or **NVIDIA NIM** through the same strict parsing and citation-grounding path. The runtime uses a dedicated Google Cloud service identity rather than downloaded service-account keys.

## Evidence design

The synthetic corpus intentionally pairs weaker governance artifacts with stronger operational artifacts.

Example:

- **Claim:** privileged accounts use MFA.
- **Relevant but weak evidence:** a policy requiring MFA.
- **Operational evidence:** a production export showing the privileged population and current MFA enrollment state.

The distinction is deliberate: **control intent is not the same thing as demonstrated operation.**

## Security posture

ProofStack treats both submitted evidence and model output as untrusted boundaries.

Implemented controls include:

- explicit untrusted-evidence prompt boundary
- dynamic evidence kept out of the static system instruction
- 20,000-character evidence input limit
- bounded model output
- bounded Vertex request timeout/retry behavior
- structured Vertex response schema
- fail-closed parsing
- exact / whitespace-normalized citation grounding
- inert rendering of evidence and model rationale
- assessment state cleared when the evidence case changes
- reviewer identity required
- reviewer explanation required for model override
- no model tools or approval authority
- private Cloud Run deployment by default
- dedicated runtime service identity
- OWASP Top 10:2025, OWASP GenAI LLM Top 10 2026, NIST AI RMF, and NIST AI 600-1 mapping

Four live synthetic adversarial probes passed against the final Vertex configuration: direct label override, fake system prompt, role hijack, and Markdown-like evidence.

See [Security posture](docs/SECURITY.md) and [Security test matrix](docs/SECURITY_TEST_MATRIX.md).

## Implementation plan

ProofStack was executed as a bounded four-week BUILD delivery rather than an open-ended prototype.

| Phase | Delivery focus | Evidence |
|---|---|---|
| Week 1 | problem framing, synthetic dataset, reviewer workflow, architecture | `docs/KICKOFF.md`, `docs/WEEK1_BACKLOG.md`, `data/` |
| Week 2 | vertical slice, Cloud Run/Firestore path, provider abstraction, human-decision controls | `app.py`, `src/proofstack/`, `docs/ARCHITECTURE.md` |
| Week 3 | Google Cloud + NVIDIA integration, reliability/security testing, evaluation preparation | `docs/GCP_DEPLOYMENT.md`, `scripts/check_nvidia.py`, `tests/` |
| Week 4 | frozen evaluation, error analysis, polish, final brief/paper/deck/demo package | `results/`, `deliverables/` |

**Resources:** Streamlit, Google Cloud Run, Firestore, Vertex AI / Gemini 3.8 Flash, NVIDIA NIM, GitHub Actions, pytest, gitleaks, and a synthetic 20-case evidence corpus.

**Key risks and mitigations:** model misinterpretation → human final authority; prompt injection → explicit untrusted-evidence boundary; fabricated citations → independent grounding check; ambiguous output → fail closed; secret exposure → ADC/runtime-only secrets + full-history secret scan; stale case state → assessment binding and reset controls.

**Testing:** automated unit/regression tests, dataset validation, Cloud Run/Firestore smoke tests, a frozen 20-case human gold evaluation, and four live adversarial provider probes.

**Next steps if extended beyond the capstone:** independent labelers and inter-rater agreement, larger/less synthetic evidence sets, richer document formats, dedicated rate limiting, production privacy/security review, and broader temporal/scope adversarial testing.

## Frozen human reference set

All 20 reference labels were completed before final model scoring. Each contains a human rationale.

Frozen gold SHA-256:

`1317a4c5cd1b0d02575d2e54d62d8cc03c7508805dd043cf44dc67e2503d6b74`

The evaluator verifies the frozen hash before scoring and refuses to score a modified reference set without a deliberate re-freeze.

See [gold_set_manifest.json](results/gold_set_manifest.json).

## Final deliverables

| Artifact | Repository version |
|---|---|
| Final project brief | [FINAL_BRIEF.md](deliverables/FINAL_BRIEF.md) |
| Research paper | [RESEARCH_PAPER.md](deliverables/RESEARCH_PAPER.md) |
| 8-slide presentation content | [FINAL_DECK_CONTENT.md](deliverables/FINAL_DECK_CONTENT.md) |
| 5-minute demo narration | [FINAL_DEMO_SCRIPT.md](deliverables/FINAL_DEMO_SCRIPT.md) |
| Contribution record | [CONTRIBUTIONS.md](deliverables/CONTRIBUTIONS.md) |
| Final results gate | [RESULTS_CHECKLIST.md](deliverables/RESULTS_CHECKLIST.md) |
| Rubric crosswalk | [RUBRIC_MAPPING.md](deliverables/RUBRIC_MAPPING.md) |

The polished PPTX/PDF exports are part of the MMC showcase submission branch. The recorded walkthrough is the only remaining media artifact.

## Evaluation record

- [predictions.csv](results/predictions.csv) — all 20 final model predictions
- [run_metadata.json](results/run_metadata.json) — provider/model/commit provenance
- [metrics.json](results/metrics.json) — classification, parsing, and citation metrics
- [error_analysis.csv](results/error_analysis.csv) — the Q06/E12 disagreement
- [security_probes.csv](results/security_probes.csv) — adversarial live-model probes
- [final_summary.md](results/final_summary.md) — compact final summary
- [EVALUATION_RESULTS.md](docs/EVALUATION_RESULTS.md) — findings and interpretation

This is a **20-item synthetic capstone evaluation**. Results are descriptive and are not presented as production performance, certification, or generalized compliance accuracy.

## SDG 1 context

ProofStack's BUILD connection to **SDG 1: No Poverty** is intentionally modest. Smaller organizations, nonprofits, and grant applicants can have limited assurance capacity and may face disproportionate evidence-review friction. ProofStack explores whether a transparent review aid can focus scarce reviewer attention without lowering the assurance standard. It does not claim direct poverty reduction.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python scripts/validate_dataset.py
pytest -q
streamlit run app.py
```

The default provider is `mock`, so local development does not require cloud credentials.

## NVIDIA NIM integration

NVIDIA NIM integration was verified locally on November 19, 2026 using `nvidia/nemotron-3.5-bolt-e4b`. The live ProofStack UI returned JSON-parsed advisory output with:

- provider: `nvidia`
- model: `nvidia/nemotron-3.5-bolt-e4b`
- the same fail-closed parser and citation-grounding checks used by the rest of the application

The frozen 20-case evaluation and published 95.0% accuracy result remain tied to `gemini-3.8-flash` on Vertex AI; the NVIDIA verification demonstrates product integration and is not a replacement evaluation.

To reproduce locally, obtain an NVIDIA API key and set it only in the runtime environment:

```text
PROOFSTACK_PROVIDER=nvidia
NVIDIA_API_BASE=https://integrate.api.nvidia.com/v1
NVIDIA_API_KEY=<runtime secret; never commit>
NVIDIA_MODEL=nvidia/nemotron-3.5-bolt-e4b
```

Then run `python scripts/check_nvidia.py` and launch ProofStack normally.

## Vertex / Google Cloud configuration

Verified final configuration:

```text
PROOFSTACK_PROVIDER=vertex
GOOGLE_CLOUD_PROJECT=proofstack-build
GOOGLE_CLOUD_LOCATION=global
VERTEX_MODEL=gemini-3.8-flash
VERTEX_MAX_TOKENS=800
VERTEX_THINKING_LEVEL=LOW
VERTEX_TIMEOUT_MS=45000
VERTEX_RETRY_ATTEMPTS=2
PROOFSTACK_MAX_EVIDENCE_CHARS=20000
PROOFSTACK_STORAGE=firestore
GCP_REGION=us-east1
FIRESTORE_COLLECTION=proofstack_decisions
```

Never commit API keys, service-account keys, real customer evidence, or personal data.

## Repository map

| Path | Purpose |
|---|---|
| `app.py` | reviewer-facing Streamlit MVP |
| `src/proofstack/` | prompting, parsing, providers, storage, evaluation logic |
| `data/questions.json` | 10 questionnaire questions |
| `data/evidence/` | 20 synthetic evidence artifacts |
| `data/gold_labels.csv` | frozen human reference labels |
| `docs/` | security, evaluation, deployment, and methodology |
| `results/` | frozen evaluation and security-test evidence |
| `deliverables/` | submission-ready written artifacts and presentation content |

## Contributions

ProofStack was developed as part of the MMC GCLP Fall 2026 BUILD. The repository reflects work incorporated into the final build across the four-person team.

See [CONTRIBUTIONS.md](deliverables/CONTRIBUTIONS.md).

## Future ideas

- Expand the reference set with independent human labelers and measure inter-rater agreement.
- Support richer evidence formats while preserving strict trust boundaries and citation traceability.
- Add production-grade privacy controls, rate limiting, and operational monitoring before any real organizational evidence is introduced.

## Verified vs. not claimed

**Verified:** Cloud Run, Vertex AI, Firestore persistence, NVIDIA NIM advisory integration, frozen human labels, final metrics, citation grounding, adversarial probes, CI.

**Not claimed:** compliance certification, production readiness, generalized accuracy, NVIDIA evaluation parity with the frozen Vertex run, or external-hackathon participation.

## Project status

The substantive build, final hardened Cloud Run deployment, post-deploy smoke test, security verification, frozen evaluation, polished deck, project brief, research paper, and MMC showcase PR are complete.

**Remaining:** record/upload the <=5-minute walkthrough, add its link to the README/submission, and complete the final MMC submission step.

See [STATUS.md](STATUS.md).
