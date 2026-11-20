# ProofStack final deliverables

This directory contains the repository-native versions of the final ProofStack capstone package.

All artifacts below use the same verified facts:

- Vertex AI model: `gemini-3.8-flash`
- frozen evaluation set: 20 synthetic cases
- gold labels: 9 SUPPORTED / 11 UNSUPPORTED
- accuracy: 95.0% (19/20)
- macro F1: 94.99%
- parse success: 100%
- citation grounding: 100%
- adversarial live-model probes: 4/4 passed
- single classification error: Q06 / E12, a false support caused by missed current-quarter scope

## Submission artifacts

- [FINAL_BRIEF.md](FINAL_BRIEF.md) — concise three-page project brief source
- [RESEARCH_PAPER.md](RESEARCH_PAPER.md) — four-to-six-page research paper source
- [FINAL_DECK_CONTENT.md](FINAL_DECK_CONTENT.md) — final eight-slide presentation content
- [FINAL_DEMO_SCRIPT.md](FINAL_DEMO_SCRIPT.md) — approximately five-minute narrated demo
- [CONTRIBUTIONS.md](CONTRIBUTIONS.md) — factual implementation/contribution record
- [RESULTS_CHECKLIST.md](RESULTS_CHECKLIST.md) — completed final-results gate

The polished DOCX, PDF, and PPTX exports are generated from these same facts for formal submission.

## Presentation spine

The final story is intentionally simple:

1. Security claims are easy to state and expensive to verify.
2. Policies may be relevant without proving operation.
3. ProofStack separates the claim from the submitted evidence.
4. Vertex AI provides an advisory assessment and exact cited excerpt.
5. ProofStack independently checks whether the citation is grounded.
6. A human reviewer makes the authoritative decision.
7. Final evaluation reached 95% accuracy with 100% parsing and citation grounding.
8. The one miss demonstrates the central lesson: **grounded does not mean correct.**

## Integrity rules

Do not alter the frozen gold labels to improve results.

Do not claim:
- compliance certification
- production readiness
- generalized 95% accuracy
- NVIDIA integration
- external-hackathon participation
- equal team implementation contribution

The final evaluation is a small synthetic capstone experiment, not a production benchmark.
