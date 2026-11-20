# ProofStack — Final 5-Minute Demo Script

**Target runtime: 4:30–4:50. Maximum allowed: 5:00.**

The recording should show the working product, the reviewer journey, meaningful Google Cloud + NVIDIA use, evidence of value, impact/context, and the key learning.

## 0:00–0:25 — Problem and user

Security questionnaires are full of claims like “we use MFA,” “we test backups,” or “we review privileged access.” The hard part is not making the claim. It is showing evidence that actually proves it for the right scope and period.

ProofStack is a human-in-the-loop evidence-review workflow built for that gap. **The model advises; the reviewer decides.**

## 0:25–0:55 — Evidence quality and SDG context

A policy saying privileged accounts must use MFA is relevant, but it is not proof that the accounts are actually enrolled. An operational export showing 12 privileged accounts, 12 enrolled, and zero unenrolled directly addresses the claim.

For BUILD, the SDG 1 connection is deliberately modest: smaller organizations, nonprofits, and grant applicants may have fewer assurance resources, so a transparent evidence-review aid may reduce review friction without lowering the standard.

## 0:55–1:40 — Show the working user journey

**On screen: open the deployed ProofStack reviewer UI.**

1. Select a claim/evidence pair.
2. Show the original evidence.
3. Run the configured AI advisory.
4. Point out the SUPPORTED/UNSUPPORTED label, rationale, and cited excerpt.
5. Point out the independent citation-grounding result.
6. Make the human reviewer decision.
7. Briefly show that the decision is recorded/persisted.

Say:

The reviewer sees the claim and source evidence first. The configured provider returns an advisory label, rationale, and exact cited excerpt. ProofStack independently checks whether that excerpt actually exists in the evidence. The reviewer then makes the final decision; the model cannot approve or certify anything.

## 1:40–2:15 — Google Cloud and NVIDIA integration

**On screen: architecture slide or provider provenance in the UI.**

The live architecture is intentionally small: Streamlit on Google Cloud Run, Firestore for the reviewer decision record, and an advisory-provider boundary.

The frozen 20-case evaluation used Gemini 3.8 Flash through Vertex AI. The same product workflow was separately verified through NVIDIA NIM using `nvidia/nemotron-3.5-bolt-e4b`.

Both providers use the same strict parser, citation-grounding check, and human-review path. The published 95 percent result remains the frozen Vertex evaluation; I am not attributing those metrics to NVIDIA.

## 2:15–2:45 — Security and reliability

ProofStack treats both evidence and model output as untrusted.

Evidence is separated from the static system instruction, oversized input is rejected, ambiguous model output fails closed, citations are checked independently, and evidence/model rationale are rendered inertly. The model has no tools or approval authority.

Four live adversarial probes — direct label override, fake system prompt, role hijack, and Markdown-like evidence — all passed.

## 2:45–3:20 — Evaluation and evidence of value

I independently labeled all 20 synthetic evidence cases before final scoring and froze that gold set with SHA-256.

Gemini agreed with 19 of 20 human judgments:
- **95.0% accuracy**
- **94.99% macro F1**
- **100% parse success**
- **100% citation grounding**

With only 20 synthetic cases, those numbers are descriptive capstone evidence, not a production benchmark.

## 3:20–4:05 — The useful failure

The one miss is the most important result.

The backup report showed 92 of 92 successful daily backups and a successful restore test on September 16. Gemini cited those facts correctly and returned SUPPORTED.

But the claim required a successful restore test in the **current quarter**. The artifact was explicitly Q3 evidence, and the evaluation date was November 6, in Q4.

The citation was real. The judgment was wrong.

**Grounded does not mean correct.**

That is why citation grounding improves traceability but does not replace human interpretation of scope, timing, or assurance criteria.

## 4:05–4:35 — What shipped and what was learned

ProofStack shipped as a working Cloud Run application with Firestore persistence, Vertex and verified NVIDIA NIM advisory paths, a frozen evaluation set, security regression evidence, and a traceable human decision workflow.

The main learning is not that an LLM can produce a binary label. It is that we can make its reasoning inspectable, verify its evidence reference, preserve disagreement, and keep a person accountable for the final assurance decision.

## 4:35–4:50 — Close

ProofStack's pattern is deliberately restrained:

`claim -> evidence -> AI analysis -> human judgment -> traceable record`

AI can accelerate review. **It should not silently become the reviewer.**

## Recording checklist

Before recording:

- [ ] use only synthetic data
- [ ] verify the deployed Cloud Run app loads
- [ ] preselect one strong evidence example
- [ ] keep Q06/E12 ready for the error-analysis story
- [ ] show provider/model provenance once
- [ ] show one citation-grounding result
- [ ] show one human decision/persistence action
- [ ] mention both Google Cloud and NVIDIA explicitly
- [ ] state that the frozen 95% metrics belong to Vertex/Gemini
- [ ] mention the SDG 1 connection without claiming direct poverty reduction
- [ ] mention the key learning: grounded does not mean correct
- [ ] close unrelated tabs and hide account notifications/bookmarks
- [ ] never expose credentials
- [ ] do not rerun or re-freeze the final evaluation
- [ ] do not claim production readiness, compliance certification, or external hackathon participation
- [ ] keep final runtime under 5:00
