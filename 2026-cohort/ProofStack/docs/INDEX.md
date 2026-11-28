# ProofStack Documentation Index

This index is the fastest way for reviewers, contributors, and future maintainers to locate the evidence behind the final MMC BUILD submission.

## Start here

| Need | Document |
|---|---|
| What ProofStack is, why it exists, final metrics, setup, and submission links | [README](../README.md) |
| Rubric-by-rubric grading evidence | [MMC BUILD rubric crosswalk](../deliverables/RUBRIC_MAPPING.md) |
| Concise final project brief | [Final brief](../deliverables/FINAL_BRIEF.md) |
| Full research narrative | [Research paper](../deliverables/RESEARCH_PAPER.md) |
| Final presentation content | [8-slide deck content](../deliverables/FINAL_DECK_CONTENT.md) |
| Team attribution | [Contribution record](../deliverables/CONTRIBUTIONS.md) |
| Final completion gate | [Results checklist](../deliverables/RESULTS_CHECKLIST.md) |

## Product and architecture

| Topic | Evidence |
|---|---|
| Product framing and reviewer workflow | [Product brief](PRODUCT_BRIEF.md) |
| System architecture | [Architecture](ARCHITECTURE.md) |
| Google Cloud deployment | [GCP deployment](GCP_DEPLOYMENT.md) |
| Reviewer workflow screenshot | [Reviewer workflow](images/proofstack-reviewer-workflow.png) |
| Advisory + citation-grounding screenshot | [Advisory grounding](images/proofstack-advisory-grounding.png) |
| Architecture diagram | [Architecture SVG](images/proofstack-architecture.svg) |

## Security, responsible AI, and assurance boundaries

| Topic | Evidence |
|---|---|
| Threat model, trust boundaries, IAM, prompt-injection controls | [Security posture](SECURITY.md) |
| Control/test mapping | [Security test matrix](SECURITY_TEST_MATRIX.md) |
| Final evaluation methodology and error analysis | [Evaluation results](EVALUATION_RESULTS.md) |
| Frozen evaluation artifacts | [results/](../results/) |

## Reproducibility

- Local setup and run instructions: [README](../README.md#run-locally)
- Dataset validation: `python scripts/validate_dataset.py`
- Automated tests: `pytest -q`
- Vertex smoke test: `python scripts/check_vertex.py`
- NVIDIA endpoint/model check: `python scripts/check_nvidia.py`
- Final evaluation provenance: [results/](../results/)
- Frozen gold-set integrity: [gold_set_manifest.json](../results/gold_set_manifest.json)

## Final submission evidence

- Recorded walkthrough: https://drive.google.com/file/d/1Gosrkt3_wKbyLtygz-5LiWwbghcfr-gM/view?usp=sharing
- MMC showcase PR: https://github.com/Mentor-Me-Collective/google-cloud-launchpad-showcase/pull/5
- PR must remain open/unmerged for review.

## Core finding

**Grounded does not mean correct.**

ProofStack verifies whether the model cited real evidence, then deliberately leaves the final assurance judgment with the human reviewer because scope, timing, and control interpretation still require accountable judgment.
