# ProofStack — 3-page brief scaffold

Target: concise, evidence-based, approximately 1,200–1,500 words total unless MMC specifies another format.

## Page 1 — Problem, user, and solution

### Problem
Organizations can answer security questionnaires with documents that sound convincing without actually proving the claim.

Reviewer problem:
- What exactly is being claimed?
- What evidence was submitted?
- Does the evidence support the claim?
- What evidence is missing?
- What decision did the human reviewer make?

### User
Primary user: a reviewer assessing security-questionnaire or eligibility evidence for a small organization.

### ProofStack
ProofStack is a human-in-the-loop claim-to-evidence review workflow.

Core flow:

`question → claim → evidence → AI advisory assessment → cited excerpt → human decision → decision log`

### Scope
- 10 security questions
- 20 synthetic evidence documents
- binary SUPPORTED / UNSUPPORTED gold labels
- advisory AI, not compliance certification
- human final authority

### SDG 1 program context
Keep the connection modest. Smaller organizations and grant applicants can face disproportionate evidence-review friction. ProofStack explores a more transparent, traceable review workflow. Do not claim direct poverty reduction.

## Page 2 — Design and implementation

### Evidence design
Explain the paired evidence pattern:
- policy/procedure/standard artifacts that may describe intent
- operational/configuration/report artifacts that may demonstrate actual operation

Explain why a policy statement alone is not treated as operating evidence.

### Human labeling
Describe:
- 20 manually labeled items
- labels created without model output
- disagreement handling
- labels frozen before final evaluation

Insert actual process here:
**[FINAL LABELING PROCESS]**

### Architecture
Contingency architecture:
- Streamlit reviewer UI
- Vertex AI / Gemini advisory provider
- strict parser
- citation grounding check
- Cloud Run
- Firestore decision log
- dedicated Cloud Run service identity
- human decision authority

NVIDIA and external hackathons are not part of the contingency architecture.

Insert deployed architecture status:
**[VERIFIED CLOUD STATUS]**

### Security / governance
Mention:
- evidence treated as untrusted input
- prompt-injection boundary
- citation grounding
- no autonomous approval
- no invented controls
- no real participant/customer evidence
- least-privilege cloud identity
- model results bound to the exact question/evidence case
- reviewer note required for model override

## Page 3 — Evaluation, findings, limitations, and next steps

### Evaluation question
How often does the configured Vertex model agree with the manually frozen supported/unsupported judgments, and where does it fail?

### Final metrics
Insert only after evaluation:
- n = **[N]**
- model = **[MODEL ID]**
- accuracy = **[VALUE]**
- macro precision = **[VALUE]**
- macro recall = **[VALUE]**
- macro F1 = **[VALUE]**
- parse success = **[VALUE]**

### What failed
Summarize actual error modes:
- **[ERROR MODE 1]**
- **[ERROR MODE 2]**
- **[ERROR MODE 3]**

Include at least one example where disagreement, citation failure or uncertainty demonstrates why human review matters.

### Limitations
Required:
- synthetic evidence
- only 20 cases
- binary labels collapse nuance
- not a compliance engine
- not independently validated
- not production-ready
- model performance cannot be generalized beyond this small evaluation

### Next steps
Only include realistic extensions:
- richer evidence formats
- larger independently labeled set
- reviewer agreement analysis
- more nuanced evidence-gap categories
- stronger semantic citation validation
- production security/privacy review if ever used with real evidence

### Team contributions
List only completed work visible in the repo or otherwise documented:
- John — **[FINAL CONTRIBUTION]**
- Hans — **[FINAL CONTRIBUTION]**
- Kristan — **[FINAL CONTRIBUTION]**
- Maimuna — **[FINAL CONTRIBUTION]**
