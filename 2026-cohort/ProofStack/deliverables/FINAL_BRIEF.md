# ProofStack — Final Project Brief

**Turn security-questionnaire claims into traceable evidence decisions.**

**MMC BUILD capstone | John Flack | November 6, 2026**

## At a glance

- 10 security questions / 20 synthetic evidence documents
- Human gold set frozen before final model evaluation: 9 SUPPORTED / 11 UNSUPPORTED
- Vertex AI model: `gemini-3.8-flash`
- Accuracy: **95.0%**
- Macro F1: **94.99%**
- Parse success: **100%**
- Citation grounding: **100%**
- Live adversarial security probes: **4/4 passed**

## Problem and user

Security questionnaires are easy to answer confidently and expensive to verify well. A reviewer must determine what is actually being claimed, what evidence was submitted, whether that evidence demonstrates the claim for the right scope and period, and what decision should be preserved for later review.

ProofStack is built for a reviewer assessing security-questionnaire or eligibility evidence for a small organization. It is not a compliance engine. It is a traceable claim-to-evidence workflow that makes weak evidence visible and keeps the human reviewer authoritative.

## Solution

The workflow is:

`question → canonical claim → submitted evidence → AI advisory assessment → rationale + cited excerpt → independent citation check → human reviewer decision → traceable decision record`

The MVP contains 10 security questions and 20 synthetic evidence documents. Each question is paired with a weaker policy/procedure artifact and a stronger operational/configuration artifact. This tests the difference between statements of intent and evidence of operation.

## Architecture and controls

ProofStack runs as a Streamlit application on Google Cloud Run, with reviewer decisions stored in Firestore. Gemini 3.8 Flash through Vertex AI was used for the frozen evaluation. The product also supports NVIDIA NIM as an alternate advisory provider; that integration was verified with `nvidia/nemotron-3.5-bolt-e4b` on November 19, 2026. Both providers feed the same fail-closed parser, citation check, and human-review workflow. A dedicated Google Cloud runtime service identity is used instead of downloaded service-account keys.

Evidence is treated as untrusted input. The application separates evidence from system instructions, limits evidence size, warns on instruction-like text, requests structured model output, fails closed on ambiguous labels, verifies cited excerpts against evidence, and renders untrusted evidence and model rationale as inert text. The model has no tools and no approval authority.

Four live adversarial probes passed with the expected label, structured output, and grounded citation: direct label override, fake system prompt, role hijack, and Markdown-like evidence.

## Human labeling and evaluation

John Flack independently labeled all 20 cases before the final model run and recorded a short rationale for each judgment. The set was frozen with SHA-256 before scoring. An AI-assisted second review was used only after the primary labels were completed to challenge the judgments; the evaluated Gemini predictions did not create the answer key.

Gemini 3.8 Flash achieved 95.0% accuracy, 95.0% macro precision, 95.45% macro recall, 94.99% macro F1, 100% parse success, and 100% citation grounding on the 20-case synthetic set. These are descriptive capstone results, not production-performance claims.

## The useful failure

The only error was Q06/E12. Gemini correctly cited a report showing 92 of 92 successful daily backups and a successful restore test dated September 16, 2026. It nevertheless labeled the case SUPPORTED. The claim required a successful restore test in the **current quarter**; the artifact was explicitly Q3 evidence, while the evaluation date was November 6, 2026 in Q4.

That case captures the project's central lesson: **grounded does not mean correct**. Citation checks can prove that a model quoted real evidence. They cannot prove that it applied scope, timing, or assurance criteria correctly. Human review remains necessary.

## SDG 1 context and limitations

ProofStack's connection to SDG 1, No Poverty, is intentionally modest. Smaller organizations, nonprofits, and grant applicants may have limited assurance capacity and can face disproportionate friction when assembling and reviewing evidence. A transparent review aid could help scarce reviewers focus attention, but this capstone does not demonstrate direct poverty reduction.

Limitations include synthetic evidence, only 20 evaluation cases, binary labels, a single primary human labeler, and no production security/privacy validation. Future work would require a larger independently labeled corpus, reviewer-agreement analysis, richer evidence formats, and a production review before real organizational evidence is introduced.

## Contribution record

- **John Flack:** project lead; contingency architecture; Streamlit workflow; Google Cloud / Vertex / Firestore integration; security hardening; adversarial tests; gold labeling; evaluation; error analysis; documentation and final integration.
- **Hans Rony:** reviewer-workflow and readability improvements, including review queue, decision history, prior-decision visibility, reviewer guidance, theme configuration, and decision-log read support.
- **Kristan Mack:** reviewer-language discussion and questions that informed the review workflow and wording.
- **Maimuna Chowdhury:** security hardening for parser ambiguity, reviewer-decision integrity, regression tests, read-only CI permissions, full-history secret scanning, and security documentation.

## Final takeaway

**Grounded does not mean correct.**

ProofStack demonstrates a bounded pattern:

`claim → evidence → AI analysis → human decision → traceable record`
