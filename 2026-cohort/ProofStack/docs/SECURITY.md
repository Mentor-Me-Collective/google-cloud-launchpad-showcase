# Security and threat model

## Security objective

ProofStack is intentionally non-agentic. It reviews evidence and recommends a binary label; it does not execute tools, alter controls, approve access, or certify compliance. The security objective is to keep evidence, model output, reviewer authority, and cloud permissions in separate trust boundaries.

The detailed framework/test mapping is in `docs/SECURITY_TEST_MATRIX.md`.

## Data boundary

All committed evidence is synthetic. Do not upload or commit real organizational evidence, credentials, customer data, employee data or confidential questionnaire responses.

## Trust boundaries

### Evidence is untrusted input

Evidence may contain text that resembles instructions to the model. It remains data. It cannot change application permissions, select providers, write records, call tools, or authorize a decision.

Controls:
- model prompt explicitly marks evidence as untrusted
- dynamic evidence is kept out of the static Vertex system instruction
- evidence sent to a model is capped by `PROOFSTACK_MAX_EVIDENCE_CHARS`
- instruction-like phrases are surfaced to the reviewer
- evidence is displayed as plain text rather than rendered Markdown/HTML

### Model output is untrusted advisory output

A valid model label does not make the underlying rationale or citation trustworthy.

Controls:
- Vertex uses a response schema with a two-value label enum
- parser ambiguity fails closed to UNPARSEABLE; a label word inside prose ("does not show the claim is SUPPORTED") or an invalid JSON label is never treated as a valid label
- exact/whitespace-normalized citation grounding is checked independently
- rationale is displayed as inert text and the citation as code
- model/provider metadata is retained for evaluation

### Human decision is authoritative

The reviewer makes the final SUPPORTED/UNSUPPORTED decision. No decision is pre-selected, and a decision cannot be recorded until the reviewer explicitly chooses one. When the reviewer overrides a valid model label, ProofStack requires a note to preserve the reason for disagreement.

## Primary threats and controls

### Secret exposure

Risk: API keys or service-account material enter Git history or model prompts.

Controls:
- Application Default Credentials for Vertex and Cloud Run
- no downloaded service-account keys
- synthetic-only evidence boundary
- repository review before demo
- no secrets in screenshots
- private Cloud Run by default

### Prompt injection in evidence

Risk: evidence contains text such as "ignore previous instructions", fake system prompts, role hijacks, or requested labels.

Controls:
- evidence is explicitly marked as untrusted in the prompt and system instruction
- model has no external tools or approval authority
- reviewer sees the source evidence
- UI warns when instruction-like phrases are detected
- adversarial unit tests
- live synthetic provider probes in `scripts/run_security_probes.py`

### Hallucinated citation

Risk: model returns an excerpt not found in the evidence.

Controls:
- exact/whitespace-normalized citation grounding
- failed citations are visibly marked invalid
- batch evaluation records `citation_valid`
- reviewer remains authoritative

### Unsupported model confidence

Risk: model asserts support not present in evidence.

Controls:
- structured Vertex response schema
- binary parser fails closed on ambiguity
- human final decision
- final evaluation against a manually frozen gold set
- live adversarial probes

### Unbounded model consumption

Risk: oversized evidence or repeated use increases cost and attack surface.

Controls:
- default 20,000-character model-input cap
- bounded provider output tokens
- small fixed synthetic evaluation corpus
- private capstone deployment

Residual risk: no general user-level rate limiter is implemented.

### Evidence/claim mismatch

Risk: document is mapped to the wrong question.

Controls:
- explicit manifest
- question/evidence IDs in records
- validation script checks 10 questions, 20 unique evidence IDs and paths, and exactly two documents per question

### Stale assessment crossing cases

Risk: assessment for one evidence item is accidentally written against another.

Controls:
- assessment state is bound to question_id + evidence_id
- switching cases clears stale model state
- unit tests cover question/evidence mismatch

### Decision-log integrity

Risk: final decisions cannot be traced or reviewer overrides are unexplained.

Controls:
- append-style local logging
- Firestore server timestamps in cloud mode
- reviewer identity required
- explicit final decision required (no pre-selected default)
- override note required
- provider/model, rationale, cited excerpt and citation-valid flag retained

### Excess permissions

Risk: cloud runtime identity has unnecessary access.

Controls:
- dedicated user-managed Cloud Run service identity
- `roles/datastore.user` for Firestore
- `roles/aiplatform.user` for Vertex
- no Owner/Editor runtime grant
- model has no application tools

## Abuse/regression coverage

Automated tests cover:
- direct prompt-injection language
- fake system/developer instructions
- role-hijack language
- embedded and malformed model output
- ambiguous SUPPORTED/UNSUPPORTED text
- label words inside prose, including negation, and invalid JSON labels
- hallucinated citation
- oversized evidence
- stale assessment context
- reviewer missing identity
- reviewer missing final decision
- human override without explanation
- provider configuration and malformed-response failure
- Firestore configuration behavior
- Vertex structured-output configuration and empty response handling

## Deployment review

Before final demo:
- verify no secrets in repo/history (CI runs gitleaks over the full history on every push and pull request)
- confirm IAM remains least privilege
- verify synthetic-only dataset
- run CI
- run the selected live-provider smoke test
- run live security probes
- verify Firestore persistence
- rehearse one weak-evidence and one strong-evidence case
- document known limitations
