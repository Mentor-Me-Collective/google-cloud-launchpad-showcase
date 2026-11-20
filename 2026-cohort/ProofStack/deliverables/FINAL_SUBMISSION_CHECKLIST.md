# ProofStack — Final Submission Checklist

## Product and technical evidence

- [x] Working product and codebase complete
- [x] Google Cloud integration complete: Cloud Run, Firestore, Vertex AI
- [x] Final hardened Cloud Run revision `proofstack-00002-p7s` deployed and serving 100% of traffic
- [x] Post-deploy smoke test complete
- [x] NVIDIA NIM advisory integration verified with `nvidia/nemotron-3.5-bolt-e4b`
- [x] Frozen 20-case evaluation: 95.0% accuracy / 94.99% macro F1
- [x] 100% parse success / 100% citation grounding
- [x] 4/4 live adversarial probes passed
- [x] Security controls and OWASP/NIST mapping documented
- [x] Automated tests, CI, secret scanning, and sample data included

## Rubric documentation

- [x] Problem and target reviewer clearly defined
- [x] SDG 1 connection documented without overclaiming
- [x] Google Cloud contribution to product explained and reproducible
- [x] NVIDIA contribution to product explained and reproducible
- [x] Four-week implementation timeline explicit
- [x] Resources explicit
- [x] Risks and mitigations explicit
- [x] Testing strategy explicit
- [x] Next steps explicit
- [x] Team credits and individual contributions documented
- [x] Rubric crosswalk added at `deliverables/RUBRIC_MAPPING.md`

## Final artifacts

- [x] Final project brief content
- [x] Final project brief polished PDF
- [x] Research paper content
- [x] Research paper polished PDF
- [x] Final 8-slide deck content
- [x] Final 8-slide PowerPoint
- [x] 5-minute demo script
- [x] MMC showcase branch `team/proofstack` created
- [x] PR #5 opened against `main` and intentionally left unmerged
- [x] Final deck, paper, and project brief uploaded to the MMC branch

## Only remaining submission actions

- [ ] Record the final walkthrough in no more than five minutes.
- [ ] Upload/host the recording.
- [ ] Add the walkthrough link to the README/submission.
- [ ] Complete the final MMC submission before November 28, 2026 at 11:59 PM ET.

## Guardrails

- Do not rerun or re-freeze the 20-case evaluation.
- Do not expose NVIDIA or Google Cloud credentials.
- Do not attribute the frozen 95% metrics to NVIDIA; those are Vertex/Gemini results.
- Do not claim production readiness or compliance certification.
- Do not merge the MMC showcase PR unless MMC instructs the team to do so.
