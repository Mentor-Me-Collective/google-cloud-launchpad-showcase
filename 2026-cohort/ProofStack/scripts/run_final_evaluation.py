"""Run the frozen 20-case ProofStack evaluation end to end.

Requires:
- completed/frozen human gold set
- PROOFSTACK_PROVIDER=vertex
- configured GCP project/location/model

This script verifies the gold-set hash before and after model inference.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from proofstack.gold_integrity import verify_frozen_gold


def run(*args):
    subprocess.run(args, cwd=ROOT, check=True)


def git_head():
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        text=True,
    ).strip()


def main():
    provider = os.getenv("PROOFSTACK_PROVIDER", "").strip().lower()
    if provider != "vertex":
        raise SystemExit(
            "Final evaluation requires PROOFSTACK_PROVIDER=vertex. "
            "Mock output is not a final model evaluation."
        )

    model = os.getenv("VERTEX_MODEL", "").strip()
    if not model:
        raise SystemExit("VERTEX_MODEL is required for final evaluation.")

    manifest_before = verify_frozen_gold(ROOT)
    commit_sha = git_head()
    os.environ["PROOFSTACK_COMMIT_SHA"] = commit_sha

    print("Frozen gold verified.")
    print(f"Gold SHA256: {manifest_before['gold_labels_sha256']}")
    print(f"Provider: {provider}")
    print(f"Model: {model}")
    print(f"Commit: {commit_sha}")
    print()

    run(sys.executable, "scripts/run_batch.py")
    manifest_after = verify_frozen_gold(ROOT)

    if manifest_after["gold_labels_sha256"] != manifest_before["gold_labels_sha256"]:
        raise SystemExit("Gold-set hash changed during model inference; evaluation aborted.")

    run(sys.executable, "scripts/evaluate_results.py")
    run(sys.executable, "scripts/write_results_summary.py")

    metrics = json.loads((ROOT / "results/metrics.json").read_text(encoding="utf-8"))
    print()
    print("FINAL EVALUATION COMPLETE")
    print(f"Accuracy: {metrics['accuracy']:.3f}")
    print(f"Macro F1: {metrics['macro_f1']:.3f}")
    print(f"Parse success: {metrics['parse_success_rate']:.3f}")
    print(f"Citation grounding: {metrics['citation_grounding_rate']:.3f}")
    print("See results/final_summary.md and results/error_analysis.csv")


if __name__ == "__main__":
    main()
