"""Validate and cryptographically freeze the completed human gold set."""

import csv
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GOLD_PATH = ROOT / "data/gold_labels.csv"
MANIFEST_PATH = ROOT / "results/gold_set_manifest.json"
VALID_LABELS = {"SUPPORTED", "UNSUPPORTED"}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git_head():
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return ""


def main():
    with GOLD_PATH.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))

    if len(rows) != 20:
        raise SystemExit(f"Expected 20 gold rows, found {len(rows)}.")

    seen = set()
    for row in rows:
        evidence_id = row["evidence_id"].strip()
        if not evidence_id or evidence_id in seen:
            raise SystemExit(f"Duplicate or blank evidence_id: {evidence_id!r}")
        seen.add(evidence_id)

        label = row["label"].strip().upper()
        if label not in VALID_LABELS:
            raise SystemExit(f"{evidence_id}: invalid or missing label {row['label']!r}")
        if not row["reviewer"].strip():
            raise SystemExit(f"{evidence_id}: reviewer is required")
        if not row["notes"].strip():
            raise SystemExit(f"{evidence_id}: human rationale note is required")

    supporting_files = [
        ROOT / "data/questions.json",
        ROOT / "data/evidence_manifest.csv",
        *sorted((ROOT / "data/evidence").glob("E*.md")),
    ]

    manifest = {
        "frozen_at_utc": datetime.now(timezone.utc).isoformat(),
        "gold_labels_file": "data/gold_labels.csv",
        "gold_labels_sha256": sha256(GOLD_PATH),
        "code_commit_sha_at_freeze": git_head(),
        "item_count": len(rows),
        "label_counts": {
            label: sum(row["label"].strip().upper() == label for row in rows)
            for label in sorted(VALID_LABELS)
        },
        "reviewers": sorted({row["reviewer"].strip() for row in rows}),
        "dataset_files": {
            str(path.relative_to(ROOT)): sha256(path)
            for path in supporting_files
        },
        "integrity_rule": (
            "Gold labels were completed without model predictions and must not be "
            "changed to improve evaluation results."
        ),
    }

    MANIFEST_PATH.parent.mkdir(exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    print(f"Frozen gold set: {GOLD_PATH.relative_to(ROOT)}")
    print(f"SHA256: {manifest['gold_labels_sha256']}")
    print(f"Labels: {manifest['label_counts']}")
    print(f"Manifest: {MANIFEST_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
