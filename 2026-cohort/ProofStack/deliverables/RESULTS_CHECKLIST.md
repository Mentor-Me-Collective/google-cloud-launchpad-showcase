# Final-results gate

## Dataset
- [x] 20/20 manual labels complete
- [x] gold labels frozen before final model run
- [x] reviewer name and rationale recorded
- [x] gold SHA-256 manifest created
- [x] gold distribution recorded: 9 SUPPORTED / 11 UNSUPPORTED

## Vertex AI
- [x] GCP project confirmed: `proofstack-build`
- [x] final model confirmed: `gemini-3.8-flash`
- [x] structured Vertex smoke test passed
- [x] final 20-case model run completed

## NVIDIA NIM
- [x] NVIDIA API credential verified without committing the key
- [x] hosted model inventory queried successfully
- [x] ProofStack advisory verified with `nvidia/nemotron-3.5-bolt-e4b`
- [x] parse status verified as JSON
- [x] provider/model provenance visible in the UI
- [x] frozen Vertex evaluation left unchanged

## Google Cloud
- [x] Cloud Run deployment verified
- [x] Firestore persistence verified
- [x] private access choice intentional
- [x] no downloaded service-account key used
- [x] synthetic-only evidence used
- [x] final hardened branch redeployed as `proofstack-00002-p7s`
- [x] post-deploy smoke check completed

## Security
- [x] prompt-injection boundary implemented
- [x] inert evidence/model rendering implemented
- [x] structured output schema implemented
- [x] citation grounding implemented
- [x] oversized evidence fails closed
- [x] bounded Vertex timeout/retry behavior implemented
- [x] 4/4 live adversarial probes passed
- [x] OWASP / NIST security mapping documented

## Evaluation
- [x] predictions generated for all 20 cases
- [x] accuracy calculated: 95.0%
- [x] macro precision calculated: 95.0%
- [x] macro recall calculated: 95.45%
- [x] macro F1 calculated: 94.99%
- [x] parse success calculated: 100%
- [x] citation grounding calculated: 100%
- [x] confusion matrix reviewed
- [x] false support case inspected: Q06/E12
- [x] no false rejection cases
- [x] limitations documented

## Contribution record
- [x] John contribution recorded
- [x] Hans contribution recorded based on delivered/documented work
- [x] Kristan contribution recorded based on delivered/documented work
- [x] Maimuna contribution recorded based on delivered/documented work

## Submission consistency
- [x] brief uses verified model ID and metrics
- [x] research paper uses verified model ID and metrics
- [x] deck content uses verified model ID and metrics
- [x] demo script uses verified model ID and metrics
- [x] architecture matches deployed services
- [x] limitations are explicit
- [x] no compliance/certification claim
- [x] no production-readiness claim
- [x] NVIDIA integration claim limited to verified live advisory path; frozen metrics remain attributed to Vertex
- [x] no external-hackathon claim

## MMC submission
- [x] Showcase repository identified: `Mentor-Me-Collective/google-cloud-launchpad-showcase`
- [x] Team GitHub usernames submitted in `#mmc-build`
- [ ] Contributor access granted
- [ ] `team/proofstack` branch pushed
- [ ] PR to `main` opened and intentionally left unmerged
- [ ] final walkthrough recorded/uploaded
- [ ] final MMC submission completed
