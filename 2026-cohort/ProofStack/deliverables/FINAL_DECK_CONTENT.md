# ProofStack — Final 8-Slide Deck Content

## Slide 1 — ProofStack

**Turn security-questionnaire claims into traceable evidence decisions**

Core flow:

`CLAIM → EVIDENCE → AI → HUMAN → RECORD`

Message:

**MODEL ADVISES. HUMAN DECIDES.**

Final snapshot:

- 95% accuracy
- 100% parse success
- 100% citation grounding
- 20 synthetic cases
- frozen human gold set
- 4/4 adversarial probes passed

## Slide 2 — Relevant is not the same as proof

Claim:

> Privileged accounts use MFA in production.

Weak evidence:

**Privileged Access Standard**

> All privileged accounts must use multi-factor authentication.

Relevant? Yes. Demonstrates operation? No.

Stronger evidence:

**Privileged Account MFA Export**

- Production accounts in scope: 12
- MFA enrolled: 12
- MFA not enrolled: 0

SDG 1 context:

Smaller organizations, nonprofits and grant applicants can face disproportionate evidence-review friction. ProofStack explores a transparent review aid; it does not claim direct poverty reduction.

## Slide 3 — Make the evidence decision inspectable

1. Read the claim.
2. Inspect the evidence.
3. Run the AI advisory.
4. Verify the cited excerpt.
5. Human reviewer decides.
6. Persist the traceable record.

Human authority:

The model cannot approve, certify, change permissions or execute evidence instructions.

## Slide 4 — Small by design

Architecture:

`Streamlit UI → Vertex AI / Gemini 3.8 Flash OR NVIDIA NIM → strict parser + citation check → human reviewer → Firestore`

Cloud boundary:

- Cloud Run
- private by default
- scales to zero
- source-deployed container

Runtime identity:

- dedicated service account
- Application Default Credentials
- Firestore + Vertex roles
- no downloaded JSON key

## Slide 5 — Treat evidence and model output as untrusted

Prompt injection:

- evidence explicitly marked untrusted
- instruction-like text surfaced
- model has no tools or approval authority

Output handling:

- structured JSON schema
- ambiguity fails closed
- evidence and rationale rendered inertly

Resource bounds:

- 20k-character evidence cap
- bounded output tokens
- 45-second request timeout / 2 attempts

Human control:

- reviewer owns final label
- override note required
- decision provenance retained

Live adversarial probes: **4/4 passed**

- direct label override
- fake system prompt
- role hijack
- Markdown-like evidence

## Slide 6 — 19 of 20 human judgments matched

Frozen gold set: 9 SUPPORTED / 11 UNSUPPORTED.

- Accuracy: **95.0%**
- Macro F1: **94.99%**
- Parse success: **100%**
- Citation grounding: **100%**

Confusion matrix:

| | Pred SUPPORTED | Pred UNSUPPORTED |
|---|---:|---:|
| Gold SUPPORTED | 9 | 0 |
| Gold UNSUPPORTED | 1 | 10 |

The single error was a false support, the riskier direction for an assurance workflow.

## Slide 7 — Grounded does not mean correct

Claim:

> Successful daily backups + a successful restore test in the current quarter.

E12 showed:

- 92 scheduled / 92 successful daily backup jobs
- restore test successful on 2026-09-16
- artifact period: Q3 2026

Evaluation date: 2026-11-06, in Q4.

Gemini correctly cited the evidence but labeled the claim SUPPORTED.

Human gold label: **UNSUPPORTED**.

**A real quote can still support the wrong conclusion.**

## Slide 8 — Takeaway

**AI can accelerate review. It should not silently become the reviewer.**

Pattern:

`CLAIM → EVIDENCE → AI ANALYSIS → HUMAN JUDGMENT → TRACEABLE RECORD`

What ships:

- working Cloud Run app
- Vertex + Firestore integration
- verified NVIDIA NIM advisory path (`nvidia/nemotron-3.5-bolt-e4b`)
- frozen gold set + evaluation results
- OWASP/NIST security mapping
- research paper + project brief
- demo deck + script

Final principle:

**Better assurance starts by asking whether the evidence proves the thing we actually claimed.**
