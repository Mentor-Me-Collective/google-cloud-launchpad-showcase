# ProofStack contribution record

This file summarizes contributions documented during the MMC BUILD sprint and can be updated as additional work is incorporated into the project record.

## John Flack

Contributions included:

- project framing and integration leadership
- final claim/evidence workflow and reviewer UX
- contingency branch architecture and implementation
- Google Cloud project setup and deployment path
- Cloud Run deployment
- Vertex AI / Gemini integration
- Firestore decision persistence
- structured-output parsing and fail-closed behavior
- citation-grounding validation
- evidence input boundaries and timeout/retry handling
- prompt-injection / output-handling hardening
- OWASP / NIST security mapping
- live adversarial regression probes
- human gold labeling and freeze protocol
- final 20-case Vertex evaluation
- error analysis of Q06/E12
- final documentation, brief, paper, deck and demo packaging

## Hans Rony

- Participated in early project, product, and UI discussions.
- Delivered reviewer-workflow and readability improvements, including the review queue, decision-history view, prior-decision visibility, clearer reviewer guidance, Streamlit theme configuration, and decision-log read support for local and Firestore storage.

## Kristan Mack

- Contributed reviewer-language discussion and questions during team conversation.

## Maimuna Chowdhury

Contributions included:

- security test design and threat-focused review
- fail-closed model-output parsing for ambiguous prose and invalid labels
- explicit reviewer decision selection to prevent accidental default decisions
- regression tests covering parser ambiguity, invalid labels, and missing reviewer decisions
- read-only GitHub Actions permissions
- full-history secret scanning with gitleaks
- container-build exclusions for local environment and decision files
- security documentation and test-matrix updates

## Ongoing attribution

This record is intended to remain open to updates as additional teammate contributions, artifacts, or implementation work are incorporated into the project.
