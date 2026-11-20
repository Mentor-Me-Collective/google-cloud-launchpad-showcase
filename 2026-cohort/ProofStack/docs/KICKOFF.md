# ProofStack kickoff

Target: 45–60 minutes. Leave with decisions and owners, not another meeting about meetings.

## 1. Re-state the challenge — 5 min
A small organization answers security questionnaires or grant-eligibility questions with documents that may sound convincing but may not prove the claim. ProofStack should make the evidence relationship visible so a human reviewer can decide.

Guardrails:
- 10 questions, 20 sample documents
- supported vs unsupported
- manual gold labels
- reviewer decision log
- no compliance certification
- no invented controls

## 2. Ask each teammate what they want to own — 10 min
Use `TEAM.md` as a starting point, not a decree.

## 3. Agree on the reviewer journey — 10 min
Minimum journey:
claim → evidence → AI advisory assessment → cited evidence → human decision → decision log.

Question: what would make this genuinely useful to a reviewer in five minutes?

## 4. Labeling protocol — 10 min
Read `LABELING_GUIDE.md`.
Split the 20 docs.
For disagreements, discuss the evidence and record the final human label. Do not change labels to make the model look better.

## 5. Technical decisions — 10 min
Confirm:
- Streamlit acceptable?
- Google Cloud project/access?
- Cloud Run target?
- Firestore decision log?
- Cloud Storage evidence copy?
- NVIDIA registration/access/model?
- what must work without external API access?

## 6. Week-one owners — 10 min
Pick owners for issues/backlog, establish branch/PR convention, and schedule next sync.

## Definition of kickoff success
By the end:
- audience/problem agreed
- lanes confirmed or revised
- MVP boundary agreed
- labeling owners agreed
- cloud/model access checks assigned
- each person has a first GitHub task
