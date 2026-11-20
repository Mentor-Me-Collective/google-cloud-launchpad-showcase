# ProofStack: Evaluating Human-in-the-Loop LLM Assistance for Security Questionnaire Evidence Review

**John Flack | Mentor Me Collective BUILD | November 6, 2026**

*Research artifact: synthetic evidence only; human judgment remains authoritative.*

## Abstract

Security questionnaires frequently ask organizations to assert that controls exist, but the evidence submitted to support those assertions varies widely in quality. A policy can state what should happen without demonstrating what actually happened. ProofStack is a small human-in-the-loop prototype that separates the claim, the evidence, the model's advisory judgment, and the reviewer's final decision. The system was implemented as a Streamlit application on Google Cloud Run, used Gemini 3.8 Flash through Vertex AI for structured advisory assessments, and persisted reviewer decisions in Firestore. A frozen human gold set of 20 synthetic evidence cases was evaluated after the application and security controls were completed. The model achieved 95% accuracy, 94.99% macro F1, 100% parse success, and 100% citation grounding. Its single error was a false support on strong but temporally stale evidence. The result illustrates the project's central finding: grounded evidence does not guarantee correct interpretation, and human judgment remains necessary for scope, timing, and assurance decisions.

## 1. Introduction

Security questionnaires are a common mechanism for evaluating vendors, partners, grant applicants, and other organizations. Their weakness is not that the questions are necessarily poor; it is that a well-written answer can sound persuasive even when the submitted evidence does not prove the stated claim. NIST SP 800-53A frames control assessment around verifying that controls are implemented, meet stated objectives, and achieve intended outcomes [1]. That distinction between control intent and demonstrated operation motivated ProofStack.

ProofStack asks a deliberately narrow research question: can a large language model help a human reviewer triage whether submitted evidence directly supports a security claim while preserving traceability and human authority? The project does not attempt to automate compliance certification. Instead, it treats the model as an advisory reviewer whose output must be structured, citation-grounded, and subordinate to a human decision.

The design also reflects a broader AI-governance concern. NIST AI RMF 1.0 is intended to help organizations manage AI risks throughout design, deployment, and use [2], while NIST's Generative AI Profile extends that risk-management approach to generative systems [3]. ProofStack therefore evaluates not only classification accuracy, but also whether the model response is parseable, whether its cited evidence actually exists, and whether the workflow exposes model disagreement instead of silently converting it into an automated approval.

## 2. Problem Definition and Evidence Model

The prototype uses 10 security questions and 20 synthetic evidence documents. Each question has a canonical claim, reviewer-friendly wording, and a short description of what useful evidence would look like. The evidence corpus intentionally pairs weaker policy, standard, procedure, or plan documents with stronger operational artifacts such as configuration exports, scanner output, joined reports, completed reviews, or after-action records.

The distinction is important because relevance is not sufficient for assurance. A privileged-access policy that requires multi-factor authentication is relevant to an MFA claim, but it does not demonstrate that privileged accounts are enrolled. A production export showing 12 privileged accounts in scope, 12 enrolled, and zero unenrolled is operational evidence that directly addresses the claim. Similar pairs cover account termination, quarterly privileged-access review, encryption at rest, TLS configuration, backup and restore testing, vulnerability remediation, centralized logging, incident-response exercises, and third-party administrative access.

The final label space is intentionally binary: SUPPORTED or UNSUPPORTED. SUPPORTED means the evidence directly demonstrates the specific claim for the relevant environment, population, and time period. UNSUPPORTED includes policy-only intent, missing elements of a compound claim, the wrong scope or period, or any other condition in which the submitted artifact cannot establish the assertion. This binary design sacrifices nuance, but it makes the MVP review task explicit and auditable.

## 3. System Design and Security Controls

The live architecture is deliberately small: a Streamlit reviewer interface runs on Cloud Run; Gemini 3.8 Flash is called through Vertex AI; a strict parser and independent citation-grounding check evaluate the advisory response; the human reviewer records the final decision; and Firestore stores the decision record. The Cloud Run service is private by default and uses a dedicated runtime service identity instead of a downloaded service-account key.

The LLM path is designed around explicit trust boundaries. Submitted evidence is untrusted data. It is bracketed as evidence in the prompt, kept out of the static system instruction, and limited to 20,000 characters before model submission. Vertex responses use a structured response schema with an enum-limited label and required rationale and cited excerpt. Ambiguous output fails closed rather than being silently coerced into a valid label. The cited excerpt is independently checked against the evidence text using whitespace-normalized exact matching.

ProofStack also treats model output as untrusted display content. Evidence and rationale are rendered as inert text rather than active Markdown or HTML. This choice directly addresses improper-output-handling concerns in generative AI applications. The project's security matrix maps relevant controls to OWASP Top 10:2025 web-application risks [4] and the OWASP GenAI LLM Top 10 2026 [5], including prompt injection, sensitive information disclosure, excessive agency, unbounded consumption, supply-chain risk, and improper output handling. The model has no tools, no approval authority, and no capability to change application permissions or execute evidence instructions.

Four live adversarial probes were run against the configured Vertex model. They included direct label-override language, a fake system prompt embedded in weak evidence, role-hijack language, and Markdown-like content combined with operational evidence. All four probes preserved the expected label, returned structured JSON, and produced grounded citations. These tests do not prove general resistance to prompt injection, but they demonstrate that the implemented boundary worked on the specific synthetic cases used in the capstone.

## 4. Human Gold Set and Evaluation Method

The 20-case reference set was labeled by the primary human reviewer before the final model predictions were generated. Each item was reviewed against the exact claim and complete evidence text, with a short rationale recorded for the decision. The final set contained 9 SUPPORTED and 11 UNSUPPORTED cases. The reviewer completed the labels independently before requesting an AI-assisted second review for quality checking; the evaluated Gemini predictions were not used to create or revise the answer key.

After labeling, the gold file was frozen using SHA-256. The freeze manifest recorded the gold-file hash, the dataset-file hashes, the label counts, the reviewer identity, and the code commit at freeze time. The final evaluator refuses to score predictions if the gold hash changes after freezing. This was intended to prevent accidental or motivated label drift after model results became visible.

The final evaluation ran all 20 cases against Gemini 3.8 Flash using Vertex AI. Google documents Gemini 3.8 Flash as a generally available model supporting LOW, MEDIUM, and HIGH thinking levels [6]; ProofStack used LOW to keep the task bounded and cost-conscious. For every case, the evaluator recorded the predicted label, parse status, rationale, cited excerpt, and citation-grounding result. Metrics included accuracy, macro precision, macro recall, macro F1, parse success, and citation-grounding rate. Because n=20 is small and the evidence is synthetic, the results are descriptive rather than a production benchmark.

## 5. Results

Gemini 3.8 Flash agreed with the frozen human label on 19 of 20 cases, producing 95.0% accuracy. Macro precision was 95.0%, macro recall was 95.45%, and macro F1 was 94.99%. All 20 responses parsed successfully, and all 20 cited excerpts were found in the corresponding evidence, yielding 100% parse success and 100% citation grounding.

The confusion matrix contained nine true SUPPORTED decisions, ten true UNSUPPORTED decisions, one UNSUPPORTED case incorrectly classified as SUPPORTED, and no false rejections. That error direction matters. In an assurance workflow, false support is the more consequential failure mode because it can make weak or insufficient evidence appear acceptable. ProofStack therefore does not interpret the 95% result as evidence that the model can replace the reviewer.

## 6. Error Analysis: Grounded Does Not Mean Correct

The single error was Q06/E12, a backup-and-recovery operations report. The claim required successful daily backups and a successful restore test in the current quarter. The evidence was strong on its face: it showed 92 scheduled and 92 successful daily backup jobs and a successful restore test dated September 16, 2026. Gemini cited those facts accurately and returned a clean structured response.

The evidence, however, was explicitly scoped to Q3 2026. The evaluation occurred on November 6, 2026, which is in Q4. The human reviewer therefore labeled the case UNSUPPORTED because the artifact demonstrated a successful prior-quarter result rather than the exact current-quarter claim. Gemini labeled it SUPPORTED.

This failure is more instructive than an ungrounded hallucination would have been. The model did not invent a date, fabricate a quote, or fail to parse. It selected real evidence and still made the wrong assurance judgment because it failed to apply temporal scope. Citation grounding can establish that a model relied on text that exists; it cannot establish that the model interpreted the claim correctly. That distinction is the strongest empirical argument for ProofStack's human-in-the-loop design.

## 7. Human Authority, Limitations, and Practical Use

The reviewer remains the final authority in ProofStack. The model cannot certify compliance or approve evidence. A reviewer can accept or override the advisory label, and an override of a valid model label requires an explanatory note. Model/provider metadata, rationale, citation, citation-valid status, reviewer identity, and final decision are preserved in the decision record. This supports traceability without implying that logging alone makes the decision correct.

The project has important limitations. The evidence is synthetic; the corpus contains only 20 evaluation cases; labels are binary; there was one primary human labeler rather than an independently measured multi-reviewer agreement process; and the application has not undergone production security, privacy, legal, or operational validation. The 95% result should not be generalized to real questionnaires, other domains, other models, or larger evidence sets. A larger study should include independent labelers, inter-rater agreement, more ambiguous compound claims, richer evidence formats, and adversarial cases designed specifically around scope and time boundaries.

The project's Sustainable Development Goal connection is intentionally modest. Mentor Me Collective's BUILD program asks scholars to connect projects to UN Sustainable Development Goals and to document and present what they ship [7]. ProofStack maps to SDG 1, No Poverty, through an access-and-capacity argument rather than a direct poverty-reduction claim: smaller organizations, nonprofits, and grant applicants can face disproportionate evidence-review burden and may lack specialized assurance staff. A transparent, bounded review aid could reduce friction or help scarce reviewers focus attention. That potential remains a hypothesis, not a demonstrated social-impact outcome.

## 8. Conclusion

ProofStack demonstrates a small but defensible pattern for AI-assisted assurance: separate the claim from the evidence, treat both evidence and model output as untrusted, require structured output, verify citations independently, preserve a human decision, and evaluate the model against a frozen reference set. The prototype's 95% accuracy, 100% parse success, and 100% citation grounding show that a modern LLM can provide useful evidence-review assistance on a narrow synthetic task.

The one failure is the most important result. Gemini cited the correct backup evidence and still missed the current-quarter requirement. In assurance work, correctness depends on more than finding relevant text. It requires applying scope, timing, and criteria to the claim being tested. ProofStack therefore supports an intentionally restrained conclusion: AI can accelerate evidence review, but grounded output remains advisory until a human reviewer decides whether the evidence proves the thing that was actually claimed.

## References

[1] National Institute of Standards and Technology. (2022). *Assessing Security and Privacy Controls in Information Systems and Organizations (NIST SP 800-53A Rev. 5).* https://doi.org/10.6028/NIST.SP.800-53Ar5

[2] National Institute of Standards and Technology. (2023). *Artificial Intelligence Risk Management Framework (AI RMF 1.0) (NIST AI 100-1).* https://doi.org/10.6028/NIST.AI.100-1

[3] Autio, C., Schwartz, R., Dunietz, J., Jain, S., Stanley, M., Tabassi, E., Hall, P., & Roberts, K. (2024). *Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile (NIST AI 600-1).* https://doi.org/10.6028/NIST.AI.600-1

[4] OWASP Foundation. (2025). *OWASP Top 10:2025.* https://top10.owasp.org/2025/

[5] OWASP Gen AI Security Project. (2026). *OWASP GenAI LLM Top 10 2026.* https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/

[6] Google Cloud. (2026). *Gemini 3.8 Flash model documentation.* https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash

[7] Mentor Me Collective. (2026). *BUILD: four-week cross-functional capstone experience.* https://www.mentormecollective.org/build
