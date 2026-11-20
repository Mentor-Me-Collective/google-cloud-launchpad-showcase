import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from proofstack.evaluation import LABELS, classification_metrics
from proofstack.gold_integrity import verify_frozen_gold


def read_csv(path):
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def assert_unique(rows, key, label):
    values = [row[key] for row in rows]
    duplicates = sorted({value for value in values if values.count(value) > 1})
    if duplicates:
        raise SystemExit(f"Duplicate {label} IDs: {duplicates}")


try:
    gold_manifest = verify_frozen_gold(ROOT)
except ValueError as exc:
    raise SystemExit(str(exc)) from exc

gold = read_csv(ROOT / "data/gold_labels.csv")
pred = read_csv(ROOT / "results/predictions.csv")

assert_unique(gold, "evidence_id", "gold")
assert_unique(pred, "evidence_id", "prediction")

gold_by = {row["evidence_id"]: row for row in gold if row["label"]}
if len(gold_by) != 20:
    raise SystemExit(
        f"Gold labels are incomplete; expected 20 completed labels, found {len(gold_by)}."
    )

pred_by = {row["evidence_id"]: row for row in pred}
gold_ids = set(gold_by)
pred_ids = set(pred_by)

missing = sorted(gold_ids - pred_ids)
extra = sorted(pred_ids - gold_ids)
if missing:
    raise SystemExit(f"Missing predictions: {missing}")
if extra:
    raise SystemExit(f"Unexpected prediction IDs: {extra}")
if len(pred_by) != 20:
    raise SystemExit(f"Expected exactly 20 predictions, found {len(pred_by)}.")

providers = {row.get("provider", "") for row in pred}
models = {row.get("model_id", "") for row in pred}
run_starts = {row.get("run_started_utc", "") for row in pred}
if len(providers) != 1 or len(models) != 1 or len(run_starts) != 1:
    raise SystemExit(
        "Prediction provenance is inconsistent across rows; rerun as one clean batch."
    )

ordered_ids = [row["evidence_id"] for row in gold if row["label"]]
gold_labels = [gold_by[evidence_id]["label"] for evidence_id in ordered_ids]
pred_labels = [pred_by[evidence_id]["predicted_label"] for evidence_id in ordered_ids]

metrics = classification_metrics(gold_labels, pred_labels)
parse_success_count = sum(label in LABELS for label in pred_labels)
citation_valid_values = [
    str(pred_by[evidence_id].get("citation_valid", "")).strip().lower() == "true"
    for evidence_id in ordered_ids
]
citation_valid_count = sum(citation_valid_values)

metrics.update({
    "parse_success_count": parse_success_count,
    "parse_failure_count": len(pred_labels) - parse_success_count,
    "parse_success_rate": parse_success_count / len(pred_labels),
    "citation_valid_count": citation_valid_count,
    "citation_invalid_count": len(citation_valid_values) - citation_valid_count,
    "citation_grounding_rate": citation_valid_count / len(citation_valid_values),
    "provider": next(iter(providers)),
    "model_id": next(iter(models)),
    "run_started_utc": next(iter(run_starts)),
    "evaluation_generated_utc": datetime.now(timezone.utc).isoformat(),
    "gold_labels_sha256": gold_manifest["gold_labels_sha256"],
    "gold_frozen_at_utc": gold_manifest.get("frozen_at_utc", ""),
})

results_dir = ROOT / "results"
metrics_path = results_dir / "metrics.json"
metrics_path.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")

errors = []
for evidence_id in ordered_ids:
    gold_row = gold_by[evidence_id]
    pred_row = pred_by[evidence_id]
    predicted = pred_row["predicted_label"]
    citation_valid = str(pred_row.get("citation_valid", "")).strip().lower() == "true"

    if predicted != gold_row["label"] or not citation_valid:
        errors.append({
            "question_id": gold_row["question_id"],
            "evidence_id": evidence_id,
            "title": pred_row.get("title", ""),
            "artifact_type": pred_row.get("artifact_type", ""),
            "gold_label": gold_row["label"],
            "predicted_label": predicted,
            "label_correct": predicted == gold_row["label"],
            "parse_status": pred_row.get("parse_status", ""),
            "citation_valid": citation_valid,
            "rationale": pred_row.get("rationale", ""),
            "cited_excerpt": pred_row.get("cited_excerpt", ""),
            "raw_output": pred_row.get("raw_output", ""),
        })

error_path = results_dir / "error_analysis.csv"
with error_path.open("w", newline="", encoding="utf-8") as f:
    fieldnames = [
        "question_id",
        "evidence_id",
        "title",
        "artifact_type",
        "gold_label",
        "predicted_label",
        "label_correct",
        "parse_status",
        "citation_valid",
        "rationale",
        "cited_excerpt",
        "raw_output",
    ]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(errors)

print(json.dumps(metrics, indent=2))
print(error_path)
