import csv
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from proofstack.evidence import citation_is_grounded
from proofstack.parser import parse_model_output
from proofstack.providers import get_provider


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def write_rows(path, rows, fieldnames):
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


questions = {
    q["question_id"]: q
    for q in json.loads((ROOT / "data/questions.json").read_text(encoding="utf-8"))
}
with (ROOT / "data/evidence_manifest.csv").open(encoding="utf-8", newline="") as f:
    evidence = list(csv.DictReader(f))

provider_name = os.getenv("PROOFSTACK_PROVIDER", "mock").strip().lower()
provider = get_provider()
model_id = getattr(provider, "model", "") or provider_name
run_started_utc = utc_now()

results_dir = ROOT / "results"
results_dir.mkdir(exist_ok=True)
predictions_path = results_dir / "predictions.csv"
partial_path = results_dir / "predictions.partial.csv"

fieldnames = [
    "run_started_utc",
    "provider",
    "model_id",
    "question_id",
    "evidence_id",
    "title",
    "artifact_type",
    "predicted_label",
    "parse_status",
    "rationale",
    "cited_excerpt",
    "citation_valid",
    "raw_output",
]

rows = []
total = len(evidence)

for index, item in enumerate(evidence, start=1):
    evidence_text = (ROOT / item["path"]).read_text(encoding="utf-8")
    print(
        f"[{index}/{total}] {item['evidence_id']} · {item.get('title', '')} — sending to {model_id}",
        flush=True,
    )

    try:
        raw = provider.assess(
            questions[item["question_id"]],
            item,
            evidence_text,
        )
    except Exception:
        if rows:
            write_rows(partial_path, rows, fieldnames)
            print(
                f"Saved {len(rows)} completed case(s) to {partial_path.relative_to(ROOT)} before failure.",
                flush=True,
            )
        raise

    parsed = parse_model_output(raw)
    citation_valid = citation_is_grounded(parsed.cited_excerpt, evidence_text)

    rows.append({
        "run_started_utc": run_started_utc,
        "provider": provider_name,
        "model_id": model_id,
        "question_id": item["question_id"],
        "evidence_id": item["evidence_id"],
        "title": item.get("title", ""),
        "artifact_type": item.get("artifact_type", ""),
        "predicted_label": parsed.label,
        "parse_status": parsed.parse_status,
        "rationale": parsed.rationale,
        "cited_excerpt": parsed.cited_excerpt,
        "citation_valid": citation_valid,
        "raw_output": raw,
    })

    write_rows(partial_path, rows, fieldnames)
    print(
        f"[{index}/{total}] {item['evidence_id']} — "
        f"{parsed.label} · parse={parsed.parse_status} · citation_grounded={citation_valid}",
        flush=True,
    )

write_rows(predictions_path, rows, fieldnames)
if partial_path.exists():
    partial_path.unlink()

metadata = {
    "run_started_utc": run_started_utc,
    "run_completed_utc": utc_now(),
    "provider": provider_name,
    "model_id": model_id,
    "item_count": len(rows),
    "commit_sha": os.getenv("PROOFSTACK_COMMIT_SHA", "").strip(),
    "predictions_file": str(predictions_path.relative_to(ROOT)),
}
metadata_path = results_dir / "run_metadata.json"
metadata_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")

print(f"Completed {len(rows)}/{total} cases.", flush=True)
print(predictions_path)
print(metadata_path)
