import hashlib
import json

import pytest

from proofstack.gold_integrity import verify_frozen_gold


def test_verify_frozen_gold_accepts_matching_hash(tmp_path):
    (tmp_path / "data").mkdir()
    (tmp_path / "results").mkdir()
    gold = tmp_path / "data/gold_labels.csv"
    gold.write_text("evidence_id,label\nE01,SUPPORTED\n", encoding="utf-8")
    digest = hashlib.sha256(gold.read_bytes()).hexdigest()
    (tmp_path / "results/gold_set_manifest.json").write_text(
        json.dumps({"gold_labels_sha256": digest}),
        encoding="utf-8",
    )

    manifest = verify_frozen_gold(tmp_path)
    assert manifest["gold_labels_sha256"] == digest


def test_verify_frozen_gold_rejects_changed_file(tmp_path):
    (tmp_path / "data").mkdir()
    (tmp_path / "results").mkdir()
    gold = tmp_path / "data/gold_labels.csv"
    gold.write_text("original", encoding="utf-8")
    digest = hashlib.sha256(gold.read_bytes()).hexdigest()
    (tmp_path / "results/gold_set_manifest.json").write_text(
        json.dumps({"gold_labels_sha256": digest}),
        encoding="utf-8",
    )

    gold.write_text("changed", encoding="utf-8")
    with pytest.raises(ValueError, match="changed after"):
        verify_frozen_gold(tmp_path)


def test_verify_frozen_gold_requires_manifest(tmp_path):
    (tmp_path / "data").mkdir()
    gold = tmp_path / "data/gold_labels.csv"
    gold.write_text("anything", encoding="utf-8")

    with pytest.raises(ValueError, match="not frozen"):
        verify_frozen_gold(tmp_path)
