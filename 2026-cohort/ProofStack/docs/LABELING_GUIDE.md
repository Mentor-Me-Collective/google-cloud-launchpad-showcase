# Manual gold-set labeling guide

The 20-document gold set is the human reference set for the final ProofStack evaluation.

## Integrity rule

Do not use model output to create or revise the gold labels.

A model disagreement is an evaluation result, not a reason to change the answer key.

## Label definitions

### SUPPORTED

Use SUPPORTED when the submitted evidence directly demonstrates the specific claim for the relevant environment, population, and period.

Examples:
- system export showing privileged accounts and MFA state
- joined HR/IAM timestamps demonstrating disablement timing
- vulnerability records showing critical findings closed within the SLA
- after-action report demonstrating an exercise occurred

### UNSUPPORTED

Use UNSUPPORTED when the evidence:
- describes policy, intent, or a requirement without proving operation
- is missing any required element of the claim
- covers the wrong scope or time period
- otherwise cannot establish the assertion

Examples:
- policy says MFA is required but no operational MFA state is shown
- backup policy exists but there is no successful restore-test evidence
- incident-response plan requires exercises but there is no completed exercise record

## Recommended workflow

Use the blind interactive labeler:

    python scripts/label_gold.py --reviewer "John Flack"

For each case it shows:
- reviewer-friendly security question
- canonical claim
- reviewer guidance
- evidence title/type
- complete synthetic evidence text

It does **not** load or display model predictions.

Enter:
- `S` for SUPPORTED
- `U` for UNSUPPORTED
- `Q` to stop and resume later

A short human rationale is required for every label. Progress is saved after each case.

## Freeze before model scoring

After all 20 labels are complete:

    python scripts/freeze_gold.py

The freeze step:
- validates exactly 20 completed labels
- requires reviewer identity and rationale for every row
- records SUPPORTED/UNSUPPORTED counts
- hashes `data/gold_labels.csv`
- hashes the questions, manifest, and evidence corpus
- writes `results/gold_set_manifest.json`

The final evaluation verifies the frozen gold hash before calculating metrics. If the gold file changes after freezing, evaluation fails closed until the change is deliberately reviewed and re-frozen.

## Final sequence

1. Complete all 20 labels without model predictions.
2. Freeze the gold set.
3. Commit the gold labels and freeze manifest.
4. Run the final model batch.
5. Run evaluation.
6. Inspect disagreements and citation failures.
7. Never change the gold set merely to improve the score.
