# ProofStack — 8-slide deck scaffold

## Slide 1 — ProofStack
**Turn security claims into traceable evidence decisions**

One sentence:
Security questionnaires are easy to answer confidently and hard to verify efficiently.

Visual:
claim → evidence → decision

## Slide 2 — The problem
Show one simple example:

Claim:
"We use MFA for privileged accounts."

Weak evidence:
"Our policy requires MFA."

Stronger evidence:
"12 privileged accounts in scope; 12 enrolled; 0 unenrolled."

Message:
A document can sound relevant without proving the claim.

## Slide 3 — What ProofStack does
Show the reviewer flow:

1. select claim
2. inspect evidence
3. receive AI advisory assessment
4. verify rationale + cited excerpt
5. human reviewer accepts/overrides
6. decision is logged

Emphasize:
AI advises. Human decides.

## Slide 4 — Evidence-first design
Show the 10 questions / 20 synthetic documents.

Explain:
- paired policy/operational artifacts
- manually labeled gold set
- no model-created ground truth
- SUPPORTED / UNSUPPORTED MVP

Insert final labeling status:
**[20/20? VERIFIED DATE?]**

## Slide 5 — Architecture
Keep this diagram simple:

Streamlit reviewer UI
→ Vertex AI / Gemini
→ strict parser + citation grounding
→ human decision
→ Firestore

Cloud Run around the application.

Dedicated service identity underneath.

Do not add services that are not actually used.

## Slide 6 — What we measured
Only populate after final evaluation.

Show:
- model ID
- accuracy
- macro F1
- parse success
- confusion matrix

Add one sentence:
With n=20, these are descriptive results, not production-performance claims.

## Slide 7 — Where the model fails
Use 2–3 actual cases.

Preferred story:
- policy vs operation confusion
- partially supported compound claim
- citation/rationale issue

Message:
The interesting result is not "AI wins." It is where evidence review still requires judgment.

## Slide 8 — Takeaway
ProofStack demonstrates a small, defensible pattern:

**Claim → Evidence → AI analysis → Human decision → Traceable record**

Close with:
Better assurance starts by asking whether the evidence proves the thing we said was true.

Footer:
team names + GitHub
