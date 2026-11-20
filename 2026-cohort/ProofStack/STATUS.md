# ProofStack Status — final submission state

## Delivery assumption

The verified final build uses Google Cloud as the primary hosting and persistence path. Vertex AI / Gemini remains the provider used for the frozen 20-case evaluation, and NVIDIA NIM is a verified alternate advisory provider.

## Live cloud verification completed

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

No additional cloud architecture, model evaluation, or product-build work is required.

## Final evaluation

- gold set: 20/20 cases frozen before scoring
- gold distribution: 9 SUPPORTED / 11 UNSUPPORTED
- Vertex evaluation: 19/20 correct (95.0% accuracy)
- macro precision: 95.0%
- macro recall: 95.45%
- macro F1: 94.99%
- parse success: 100%
- citation grounding: 100%
- live security probes: 4/4 passed
- single error: Q06/E12 false support caused by missed current-quarter scope

## Submission package

Complete:
- working code/product
- Google Cloud integration
- NVIDIA NIM integration
- README/setup/reproduction guidance
- synthetic sample data
- automated tests and CI
- evaluation results and error analysis
- security documentation and threat/test matrix
- final project brief
- research paper
- 8-slide deck
- demo script
- team contribution record
- MMC showcase branch `team/proofstack`
- open PR #5 to `main` (intentionally unmerged)
- polished deck/brief/paper uploaded to the MMC branch

## Remaining action

1. Record the final walkthrough (maximum 5 minutes).
2. Upload/host the walkthrough and add its link to the README/submission.
3. Complete the final MMC submission step by November 28, 2026 at 11:59 PM ET.

## NVIDIA verification

- hosted API path: `https://integrate.api.nvidia.com/v1`
- verified model: `nvidia/nemotron-3.5-bolt-e4b`
- parse status: `json`
- provider/model provenance visible in the UI
- same parser and citation-grounding controls as the Vertex path
- frozen Vertex evaluation was not rerun or reassigned

## Central finding

**Grounded does not mean correct.**

The model cited real Q3 backup/restore evidence but incorrectly treated it as sufficient for a current-quarter Q4 claim. The failure was interpretation of temporal scope, not hallucinated evidence or malformed output.
