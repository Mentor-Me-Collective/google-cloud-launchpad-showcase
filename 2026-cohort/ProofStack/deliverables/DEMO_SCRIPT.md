# ProofStack — 5-minute demo scaffold

Target: 4:30–4:50 in rehearsal so there is margin.

## 0:00–0:30 — Hook

"Security questionnaires are full of statements like 'we use MFA,' 'we test backups,' or 'we review privileged access.' The difficult part isn't making the claim. It's showing a reviewer evidence that actually proves it.

ProofStack is a small human-in-the-loop workflow for that problem."

## 0:30–1:00 — Show the claim

Open one question.

"This is the exact claim we're reviewing. ProofStack keeps the claim separate from the evidence so the reviewer can see what must actually be proven."

Choose a visually simple case.

## 1:00–1:45 — Show weak evidence

Open a policy/procedure artifact.

"This document is relevant, but relevance is not the same as proof. It says what should happen. It does not necessarily show what happened."

Run the Vertex assessment.

Show:
- advisory label
- rationale
- cited excerpt
- citation grounding result

## 1:45–2:30 — Show operational evidence

Switch to the paired operational artifact.

The app must clear the previous assessment.

"This is why we bind every model assessment to the exact evidence case. We do not allow one item's assessment to carry into another review."

Run assessment.

Point to the excerpt that grounds the decision.

## 2:30–3:10 — Human decision

"The model does not approve or certify anything. The reviewer records the final decision."

Record reviewer label and a short note.

If overriding the model, show that a reviewer explanation is required.

Show that the decision is persisted.

If using Firestore in the demo, show only safe metadata or a prepared screenshot. Do not expose credentials or unnecessary cloud-console clutter.

## 3:10–3:45 — Architecture

Show one simple architecture image/slide.

"ProofStack runs as a Streamlit application on Cloud Run. Vertex AI provides the advisory model assessment. Reviewer decisions are stored in Firestore. The runtime uses a dedicated least-privilege service identity."

If any component is not live, state that accurately.

## 3:45–4:30 — Evaluation

Show final measured results.

"We manually labeled all 20 evidence items before running the final model evaluation."

State:
- model **[MODEL ID]**
- accuracy **[VALUE]**
- macro F1 **[VALUE]**
- parse success **[VALUE]**

Then immediately add:
"This is a tiny synthetic set, so those numbers are descriptive, not a production benchmark."

## 4:30–5:00 — Close

"The useful part of ProofStack isn't that AI can say supported or unsupported. It's that the reviewer can trace the claim to the evidence, see what the model relied on, override it when necessary, and preserve the decision.

The pattern is simple: claim, evidence, analysis, human judgment, traceability."

End on the reviewer UI or final takeaway slide.

## Demo safety net

Before recording:
- use synthetic data only
- have one weak-evidence and one strong-evidence case preselected
- verify Vertex access and model ID
- verify Cloud Run URL
- verify Firestore write
- close unrelated browser tabs
- hide bookmarks/account notifications
- have screenshots available if a live cloud-console step fails
- never expose credentials
- do not mention NVIDIA or hackathon participation unless either actually occurred
