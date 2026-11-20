"""Validate NVIDIA endpoint access without exposing credentials.

Usage:
    NVIDIA_API_KEY=... python scripts/check_nvidia.py

Optional:
    NVIDIA_MODEL=<model-id> python scripts/check_nvidia.py --smoke
"""

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from proofstack.providers.nvidia_nim import NvidiaNimProvider
from proofstack.parser import parse_model_output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--smoke",
        action="store_true",
        help="Run one synthetic ProofStack assessment using NVIDIA_MODEL.",
    )
    args = parser.parse_args()

    provider = NvidiaNimProvider(require_model=False)
    models = provider.list_models()

    print(f"NVIDIA endpoint: {provider.base}")
    print(f"Models visible to this credential: {len(models)}")
    for model in models:
        marker = "  *" if model == provider.model else "   "
        print(f"{marker} {model}")

    if not args.smoke:
        if not provider.model:
            print("\nSet NVIDIA_MODEL to one of the listed IDs before running ProofStack.")
        return

    if not provider.model:
        raise SystemExit("--smoke requires NVIDIA_MODEL to be set")

    question = {
        "question_id": "SMOKE-Q1",
        "question": "Is privileged access protected by MFA?",
        "claim": "All privileged accounts use MFA.",
    }
    evidence = {
        "evidence_id": "SMOKE-E1",
        "title": "Synthetic MFA configuration export",
        "artifact_type": "system_export",
    }
    evidence_text = (
        "Synthetic test data only. Privileged accounts in scope: 4. "
        "MFA enrolled: 4. MFA not enrolled: 0."
    )

    raw = provider.assess(question, evidence, evidence_text)
    parsed = parse_model_output(raw)

    print("\nSmoke assessment:")
    print(f"  model: {provider.model}")
    print(f"  label: {parsed.label}")
    print(f"  parse_status: {parsed.parse_status}")
    print(f"  rationale: {parsed.rationale}")
    print(f"  cited_excerpt: {parsed.cited_excerpt}")

    if parsed.label == "UNPARSEABLE":
        raise SystemExit("Smoke request succeeded but model output was not parseable")


if __name__ == "__main__":
    main()
