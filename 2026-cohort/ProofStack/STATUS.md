# ProofStack Status — contingency path

## Delivery assumption

The verified final build uses Google Cloud as the primary hosting and persistence path. Vertex AI / Gemini remains the provider used for the frozen 20-case evaluation, and NVIDIA NIM is now a verified alternate advisory provider for the product demo.

## Live cloud verification completed — November 19, 2026

- Google Cloud project: `proofstack-build`
- Vertex model: `gemini-3.8-flash`
- Vertex structured assessment smoke test: PASS
- citation grounding in live smoke test: PASS
- Firestore synthetic write/read/delete smoke test: PASS
- Cloud Run service `proofstack` deployed privately in `us-east1`
- final deployed revision `proofstack-00002-p7s` serving 100% of traffic
- final hardened repository revision redeployed successfully
- Cloud Run application smoke-tested after redeploy
- reviewer decision persistence verified

No additional cloud architecture or model-evaluation work is required.

## Ready in repository

- 10 questions / 20 synthetic evidence documents
- reviewer-friendly language plus canonical claims
- completed human gold set
- frozen gold SHA-256 manifest
- 9 SUPPORTED / 11 UNSUPPORTED reference labels
- plain-language reviewer workflow
- inert rendering for untrusted evidence and model rationale
- deterministic mock provider
- Vertex AI / Gemini provider using Application Default Credentials
- verified NVIDIA NIM advisory provider (`nvidia/nemotron-3.5-bolt-e4b`) using the same parser and citation-grounding path
- structured Vertex output schema
- citation grounding checks
- expanded instruction-like evidence detection
- fail-closed model-output parsing
- 20,000-character evidence input boundary
- bounded model output tokens
- 45-second Vertex request timeout / 2-attempt bound
- stale-assessment case binding
- reviewer identity and override-note validation
- local CSV decision logging
- Firestore decision logging
- Cloud Run deployment path with user-managed service identity
- evaluation provenance including citation-valid status
- OWASP/NIST-aligned security test matrix
- live synthetic adversarial provider probes
- dependency update automation
- UI rendering-boundary regression tests
- final evaluation artifacts
- final project brief
- final research paper
- final deck content
- final demo script
- final contribution record
- CI

## Final evaluation completed — November 6, 2026

- gold set completed and frozen: 20/20
- gold distribution: 9 SUPPORTED / 11 UNSUPPORTED
- live security probes: 4/4 passed
- final Vertex evaluation: 19/20 correct (95.0% accuracy)
- macro precision: 95.0%
- macro recall: 95.45%
- macro F1: 94.99%
- parse success: 100%
- citation grounding: 100%
- single error: Q06 / E12 false support caused by missed current-quarter scope
- detailed results: `docs/EVALUATION_RESULTS.md`

## Central finding

**Grounded does not mean correct.**

Gemini cited real Q3 backup/restore evidence but incorrectly treated it as sufficient for a claim requiring evidence from the current quarter. The failure was interpretation of temporal scope, not hallucinated evidence or malformed output.

## Final delivery package

- `deliverables/FINAL_BRIEF.md`
- `deliverables/RESEARCH_PAPER.md`
- `deliverables/FINAL_DECK_CONTENT.md`
- `deliverables/FINAL_DEMO_SCRIPT.md`
- `deliverables/CONTRIBUTIONS.md`
- `deliverables/RESULTS_CHECKLIST.md`
- `deliverables/FINAL_SUBMISSION_CHECKLIST.md`

## Remaining action

1. Wait for contributor access to `Mentor-Me-Collective/google-cloud-launchpad-showcase`.
2. Push the project on `team/proofstack` and open the required PR to `main`; leave the PR open.
3. Record/upload the final walkthrough.
4. Submit the final artifacts through the MMC submission channel/portal.

## NVIDIA verification completed — November 19, 2026

- NVIDIA hosted API credential verified against `https://integrate.api.nvidia.com/v1`
- 32 models visible to the credential
- ProofStack run verified with `nvidia/nemotron-3.5-bolt-e4b`
- parse status returned `json`
- provider metadata returned `nvidia`
- model metadata returned `nvidia/nemotron-3.5-bolt-e4b`
- frozen Vertex evaluation was not rerun or altered

## Optional only

- external hackathon participation
- larger dataset or additional model experiments
