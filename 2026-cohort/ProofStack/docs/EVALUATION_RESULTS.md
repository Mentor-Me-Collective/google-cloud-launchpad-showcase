# ProofStack evaluation results

## Final frozen-gold evaluation

Date: November 6, 2026

Provider: Vertex AI  
Model: `gemini-3.8-flash`  
Evaluation items: 20 synthetic evidence cases  
Gold-set SHA-256: `1317a4c5cd1b0d02575d2e54d62d8cc03c7508805dd043cf44dc67e2503d6b74`

The gold set was completed before final model scoring and then frozen with a SHA-256 manifest. The final evaluator verified the frozen hash before scoring.

## Metrics

- Accuracy: **95.0%**
- Macro precision: **95.0%**
- Macro recall: **95.45%**
- Macro F1: **94.99%**
- Parse success: **100% (20/20)**
- Citation grounding: **100% (20/20)**
- Gold labels: 9 SUPPORTED / 11 UNSUPPORTED

Confusion summary:
- SUPPORTED → SUPPORTED: 9
- SUPPORTED → UNSUPPORTED: 0
- UNSUPPORTED → SUPPORTED: 1
- UNSUPPORTED → UNSUPPORTED: 10
- Other/unparseable predictions: 0

These results are descriptive for a 20-item synthetic capstone evaluation. They are not a production-performance claim or compliance certification.

## Error analysis

### Q06 / E12 — Backup Jobs and Restore Test

Human gold label: **UNSUPPORTED**  
Model label: **SUPPORTED**  
Parse status: **json**  
Citation grounded: **true**

The claim required:
- successful daily backups, and
- a successful restore test in the **current quarter**.

E12 contained strong operational evidence:
- 92 scheduled / 92 successful daily backup jobs
- a successful restore test dated 2026-09-16

However, the artifact is explicitly scoped to **Q3 2026**. On November 6, 2026, the current quarter is Q4. The evidence therefore demonstrates a successful prior-quarter control result, but not the exact current-quarter claim.

The model cited real evidence and parsed cleanly, yet still made the wrong decision because it failed to apply the claim's temporal scope.

## Key takeaway

**Grounded does not mean correct.**

ProofStack's citation check can verify that the model quoted real evidence, but citation grounding alone cannot guarantee that the model interpreted scope, timing, or control criteria correctly. That is why the human reviewer remains authoritative in the workflow.
