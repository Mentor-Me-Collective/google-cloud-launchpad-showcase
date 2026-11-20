"""Run one synthetic ProofStack assessment through Google Vertex AI.

Uses Application Default Credentials.

Usage:
    export GCP_PROJECT_ID=...
    export GOOGLE_CLOUD_LOCATION=global
    export VERTEX_MODEL=<confirmed-model-id>
    python scripts/check_vertex.py
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from proofstack.evidence import citation_is_grounded
from proofstack.parser import parse_model_output
from proofstack.providers.google_vertex import GoogleVertexProvider


def main():
    provider = GoogleVertexProvider()

    question = {
        "question_id": "SMOKE-Q1",
        "question": "Is privileged access protected by MFA?",
        "claim": "All privileged accounts use MFA.",
    }
    evidence = {
        "evidence_id": "SMOKE-E1",
        "title": "Privileged account MFA configuration export",
        "artifact_type": "system_export",
    }
    evidence_text = (
        "Privileged accounts in scope: 4. "
        "MFA enrolled: 4. MFA not enrolled: 0."
    )

    raw = provider.assess(question, evidence, evidence_text)
    parsed = parse_model_output(raw)
    grounded = citation_is_grounded(parsed.cited_excerpt, evidence_text)

    print(f"Project: {provider.project}")
    print(f"Location: {provider.location}")
    print(f"Model: {provider.model}")
    print(f"Thinking level: {provider.thinking_level}")
    print(f"Label: {parsed.label}")
    print(f"Parse status: {parsed.parse_status}")
    print(f"Rationale: {parsed.rationale}")
    print(f"Cited excerpt: {parsed.cited_excerpt}")
    print(f"Citation grounded: {grounded}")

    failures = []
    if parsed.parse_status != "json":
        failures.append(f"expected parse_status=json, got {parsed.parse_status}")
    if parsed.label != "SUPPORTED":
        failures.append(f"expected SUPPORTED, got {parsed.label}")
    if not parsed.cited_excerpt:
        failures.append("model returned no cited excerpt")
    elif not grounded:
        failures.append("cited excerpt was not found in the synthetic evidence")

    if failures:
        print(f"Raw response: {raw}")
        raise SystemExit(
            "Vertex request succeeded but the ProofStack smoke test failed: "
            + "; ".join(failures)
        )

    print("PASS: Vertex structured assessment is parseable, supported, and citation-grounded.")


if __name__ == "__main__":
    main()
