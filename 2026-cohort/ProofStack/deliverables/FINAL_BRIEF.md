# ProofStack — Final Project Brief

**Turn security-questionnaire claims into traceable evidence decisions.**

**MMC BUILD capstone | John Flack | November 20, 2026**

## At a glance

- 10 security questions / 20 synthetic evidence documents
- Human gold set frozen before final model evaluation: 9 SUPPORTED / 11 UNSUPPORTED
- Vertex AI model: `gemini-3.8-flash`
- NVIDIA NIM path verified with `nvidia/nemotron-3.5-bolt-e4b`
- Accuracy: **95.0%**
- Macro F1: **94.99%**
- Parse success: **100%**
- Citation grounding: **100%**
- Live adversarial security probes: **4/4 passed**

## Problem, user, and SDG context

Security questionnaires are easy to answer confidently and expensive to verify well. A reviewer must determine what is actually being claimed, what evidence was submitted, whether that evidence demonstrates the claim for the right scope and period, and what decision should be preserved for later review.

ProofStack is built for a reviewer assessing security-questionnaire or eligibility evidence, especially where assurance capacity is limited. Its connection to SDG 1, No Poverty, is an access-and-capacity argument rather than a direct poverty-reduction claim: smaller organizations, nonprofits, and grant applicants can face disproportionate evidence-review friction. ProofStack explores whether a transparent review aid can focus scarce reviewer attention without lowering the assurance standard.

## Solution

The workflow is:

`question → canonical claim → submitted evidence → AI advisory assessment → rationale + cited excerpt → independent citation check → human reviewer decision → traceable decision record`

The MVP contains 10 security questions and 20 synthetic evidence documents. Each question is paired with a weaker policy/procedure artifact and a stronger operational/configuration artifact, explicitly testing the difference between statements of intent and evidence of operation.

ProofStack is not a compliance engine and does not certify controls. The model advises; the human reviewer decides.

## Architecture, Google Cloud, NVIDIA, and security

ProofStack runs as a Streamlit application on Google Cloud Run, with reviewer decisions stored in Firestore. Gemini 3.8 Flash through Vertex AI was used for the frozen evaluation. The same product flow was also verified with NVIDIA NIM using `nvidia/nemotron-3.5-bolt-e4b`. Both providers feed the same fail-closed parser, citation-grounding check, and human-review workflow. A dedicated Google Cloud runtime service identity is used instead of downloaded service-account keys.

Evidence is treated as untrusted input. The application separates evidence from system instructions, limits evidence size, warns on instruction-like text, requests structured output, fails closed on ambiguous labels, independently verifies cited excerpts, renders evidence/model rationale inertly, and gives the model no tools or approval authority.

Four live adversarial probes passed with the expected label, structured output, and grounded citation: direct label override, fake system prompt, role hijack, and Markdown-like evidence.

## Implementation plan and execution

The capstone followed a bounded four-week delivery plan:

- **Week 1 — Research and framing:** define the reviewer problem, create the 10-question/20-document synthetic corpus, establish canonical claims and the human-authority design.
- **Week 2 — Working vertical slice:** build the Streamlit workflow, provider abstraction, decision capture, Cloud Run/Firestore path, and core validation.
- **Week 3 — Integration and reliability:** complete Google Cloud and NVIDIA integrations, harden parser/reviewer behavior, expand regression/security tests, verify persistence and deployment.
- **Week 4 — Evidence of value and submission:** freeze the human gold set, run the final Vertex evaluation, inspect the single error, complete security probes, redeploy the hardened build, and package the brief, research paper, deck, demo script, and MMC showcase PR.

**Resources:** Streamlit, Cloud Run, Firestore, Vertex AI/Gemini, NVIDIA NIM, GitHub Actions, pytest, gitleaks, and a fully synthetic dataset.

**Primary risks and mitigations:** model misinterpretation → human final authority; prompt injection → explicit untrusted-evidence boundary; fabricated citations → independent grounding; ambiguous output → fail closed; secret exposure → ADC/runtime-only secrets and full-history secret scan; stale case state → question/evidence binding and reset controls.

**Testing:** automated unit/regression tests, dataset validation, live Cloud Run/Firestore smoke tests, a frozen 20-case human-reference evaluation, and four live adversarial probes.

**Next steps beyond the capstone:** independent labelers and inter-rater agreement, larger and less synthetic corpora, richer evidence formats, dedicated rate limiting, stronger temporal/scope adversarial testing, and production security/privacy review before real organizational evidence is introduced.

## Human labeling, evaluation, and the useful failure

John Flack independently labeled all 20 cases before final model scoring and recorded a rationale for each judgment. The set was frozen with SHA-256 before scoring. Gemini 3.8 Flash achieved 95.0% accuracy, 95.0% macro precision, 95.45% macro recall, 94.99% macro F1, 100% parse success, and 100% citation grounding.

The only error was Q06/E12. The evidence showed 92 of 92 successful daily backups and a successful restore test dated September 16, 2026, but the artifact was explicitly Q3 evidence while the claim required a successful restore test in the current quarter. On the November 6 evaluation date, the current quarter was Q4. Gemini cited real evidence and still returned SUPPORTED.

That case captures the project’s central lesson: **grounded does not mean correct**. Citation checks can prove that a model quoted real evidence. They cannot prove that it applied scope, timing, or assurance criteria correctly.

## Limitations and team contributions

Limitations include synthetic evidence, only 20 evaluation cases, binary labels, one primary human labeler, and no production security/privacy validation. Results are descriptive capstone evidence, not production-performance or compliance claims.

- **John Flack:** project framing, architecture, Google Cloud/Vertex/Firestore integration, security hardening, evaluation, error analysis, documentation, and final integration.
- **Hans Rony:** reviewer-workflow/readability improvements including queue, decision history, prior-decision visibility, guidance, theme, and decision-log read support.
- **Kristan Mack:** reviewer-language discussion and workflow questions.
- **Maimuna Chowdhury:** fail-closed parsing, explicit reviewer-decision integrity, regression tests, read-only CI permissions, full-history secret scanning, and security documentation.

## Final takeaway

**Grounded does not mean correct.**

`claim → evidence → AI analysis → human decision → traceable record`
