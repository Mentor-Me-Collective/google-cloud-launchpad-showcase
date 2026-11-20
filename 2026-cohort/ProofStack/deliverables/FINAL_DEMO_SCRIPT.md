# ProofStack — Final 5-Minute Demo Script

Target runtime: 4:30–4:50.

## Slide 1 / 0:00–0:30

Security questionnaires are full of claims like, “we use MFA,” “we test backups,” or “we review privileged access.” The hard part isn’t making the claim. It’s showing evidence that actually proves it. ProofStack is a human-in-the-loop evidence-review workflow built for that gap. The model advises; the reviewer decides.

## Slide 2 / 0:30–1:00

Here is the simplest example. A policy that says privileged accounts must use MFA is relevant, but it is not proof that the accounts are actually enrolled. An operational export showing 12 privileged accounts, 12 enrolled, and zero unenrolled is much stronger. ProofStack keeps the exact claim separate from the evidence so the reviewer can see what has to be demonstrated.

For the BUILD capstone, the SDG 1 connection is modest: smaller organizations and grant applicants may have fewer assurance resources, so transparent evidence review can reduce friction without lowering the standard.

## Slide 3 / 1:00–1:35

The reviewer selects a question and evidence item, reads the source, and asks the configured provider for an advisory assessment. The frozen evaluation used Gemini through Vertex AI, and the product also supports a verified NVIDIA NIM advisory path. The model returns SUPPORTED or UNSUPPORTED, a short rationale, and an exact cited excerpt. ProofStack then independently checks that the citation actually exists in the evidence. The reviewer can accept or override the model, and an override requires an explanation.

## Slide 4 / 1:35–2:05

The architecture is intentionally small: Streamlit on Cloud Run, either Gemini 3.8 Flash through Vertex AI or NVIDIA NIM for the advisory, a strict parser and citation-grounding check, a human decision, and Firestore for the decision record. The NVIDIA path was verified with `nvidia/nemotron-3.5-bolt-e4b`; the published 95 percent evaluation remains the frozen Vertex result. The runtime uses a dedicated service identity. The model has no tools and no approval authority.

## Slide 5 / 2:05–2:40

I also treated both evidence and model output as untrusted. Evidence is isolated from the system instruction, oversized evidence is rejected, instruction-like text is surfaced, and the UI renders untrusted text inertly rather than as active Markdown.

Four live adversarial probes — label override, fake system prompt, role hijack, and Markdown-like evidence — all passed with the expected label, structured JSON, and grounded citation.

## Slide 6 / 2:40–3:20

For evaluation, I independently labeled all 20 synthetic evidence cases and froze that gold set before the final model run. Gemini agreed on 19 of 20: 95 percent accuracy, about 95 percent macro F1, 100 percent parse success, and 100 percent citation grounding.

With only 20 synthetic cases, those numbers are descriptive, not a production benchmark.

## Slide 7 / 3:20–4:10

The one miss is the most useful result. The backup report showed 92 of 92 successful backups and a successful restore test on September 16. Gemini cited all of that correctly and called the claim supported.

But the claim required a restore test in the current quarter. The evidence was explicitly Q3, and the evaluation date was November 6, in Q4. The citation was real; the judgment was wrong.

That is the point: **grounded does not mean correct.**

## Slide 8 / 4:10–4:45

ProofStack’s pattern is deliberately restrained: claim, evidence, AI analysis, human judgment, traceable record.

The useful result isn’t that an LLM can say supported or unsupported. It’s that we can make its reasoning inspectable, test its citation, preserve disagreement, and keep a person accountable for the final assurance decision.

AI can accelerate the review. It should not silently become the reviewer.

## Demo safety net

Before recording or presenting:

- use synthetic data only
- pull and redeploy the final hardened branch once
- verify the private Cloud Run service responds
- preselect one weak-evidence and one strong-evidence case
- keep Q06/E12 available for the evaluation story
- verify one reviewer decision writes to Firestore
- close unrelated browser tabs
- hide account notifications and bookmarks
- never expose credentials
- do not rerun the final 20-case evaluation
- demonstrate NVIDIA integration only with the verified NIM provider path; do not imply NVIDIA produced the frozen 20-case metrics
- do not claim external hackathon participation
