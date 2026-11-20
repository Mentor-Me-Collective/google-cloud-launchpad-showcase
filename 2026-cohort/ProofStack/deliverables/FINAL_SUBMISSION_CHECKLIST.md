# ProofStack — Final Submission Checklist

## Complete

- [x] Working product and codebase in GitHub
- [x] Google Cloud integration: Cloud Run, Firestore, Vertex AI
- [x] NVIDIA NIM advisory integration verified with `nvidia/nemotron-3.5-bolt-e4b`
- [x] Frozen 20-case evaluation: 95.0% accuracy / 94.99% macro F1
- [x] 100% parse success / 100% citation grounding
- [x] 4/4 live adversarial probes passed
- [x] Team contribution record current
- [x] Final project brief content
- [x] Research paper content
- [x] Final 8-slide deck content
- [x] 5-minute demo script

## Final account / recording actions

- [ ] Pull current `main` and redeploy the final hardened revision to the existing private Cloud Run service.
- [ ] Smoke test: app loads, one advisory works, and one reviewer decision writes to Firestore.
- [ ] Record the final walkthrough in under five minutes.
- [ ] Upload/host the recording and add the final link where MMC requests it.
- [ ] Submit the final package in the MMC portal before the deadline.

## Guardrails

- Do not rerun or re-freeze the 20-case evaluation.
- Do not expose NVIDIA or Google Cloud credentials.
- Do not attribute the frozen 95% metrics to NVIDIA; those are Vertex/Gemini results.
- Do not claim production readiness or compliance certification.
