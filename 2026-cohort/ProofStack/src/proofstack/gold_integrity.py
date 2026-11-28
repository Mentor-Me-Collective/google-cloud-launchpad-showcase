import hashlib
import json
from pathlib import Path


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_frozen_gold(root: Path) -> dict:
    manifest_path = root / "results/gold_set_manifest.json"
    gold_path = root / "data/gold_labels.csv"

    if not manifest_path.exists():
        raise ValueError(
            "Gold set is not frozen. Run python scripts/freeze_gold.py before evaluation."
        )

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected = str(manifest.get("gold_labels_sha256", "")).strip()
    actual = file_sha256(gold_path)

    if not expected or actual != expected:
        raise ValueError(
            "Frozen gold labels changed after the manifest was created. "
            "Do not evaluate until the change is reviewed and the gold set is deliberately re-frozen."
        )

    return manifest
