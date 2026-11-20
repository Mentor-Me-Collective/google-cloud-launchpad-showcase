# Evaluation plan

## Question
How often does the configured model agree with the team's manual supported/unsupported judgments, and where does it fail?

## Gold set
20 synthetic evidence documents manually labeled by the team before final model evaluation.

## Required outputs
For each item:
- question_id
- evidence_id
- gold_label
- predicted_label
- parse_status
- rationale
- cited_excerpt

## Metrics
- accuracy
- macro precision
- macro recall
- macro F1
- confusion matrix
- parse success rate

With only 20 examples, metrics are descriptive. Do not imply general production performance.

## Error review
Inspect:
- unsupported evidence incorrectly called supported
- supported evidence incorrectly called unsupported
- malformed/unparseable output
- rationale unsupported by evidence
- cited excerpt that does not justify the label

## Governance
Human labels remain authoritative for this capstone evaluation. Model disagreement is logged, not silently corrected.
