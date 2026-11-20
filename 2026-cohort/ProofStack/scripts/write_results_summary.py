"""Create a concise human-readable summary from verified evaluation artifacts."""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_errors():
    path = ROOT / "results/error_analysis.csv"
    if not path.exists():
        return []
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def pct(value):
    return f"{100 * float(value):.1f}%"


def main():
    metrics_path = ROOT / "results/metrics.json"
    metadata_path = ROOT / "results/run_metadata.json"
    manifest_path = ROOT / "results/gold_set_manifest.json"

    for path in (metrics_path, metadata_path, manifest_path):
        if not path.exists():
            raise SystemExit(f"Missing required evaluation artifact: {path.relative_to(ROOT)}")

    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    errors = read_errors()

    label_errors = [row for row in errors if row.get("label_correct", "").lower() != "true"]
    citation_errors = [row for row in errors if row.get("citation_valid", "").lower() != "true"]

    lines = [
        "# ProofStack final evaluation summary",
        "",
        "## Provenance",
        "",
        f"- Provider: {metrics.get('provider', '')}",
        f"- Model: {metrics.get('model_id', '')}",
        f"- Evaluation commit: {metadata.get('commit_sha', '')}",
        f"- Model run started: {metrics.get('run_started_utc', '')}",
        f"- Gold set frozen: {metrics.get('gold_frozen_at_utc', '')}",
        f"- Gold SHA-256: {metrics.get('gold_labels_sha256', '')}",
        f"- Evaluation items: {metrics.get('n', 0)}",
        "",
        "## Results",
        "",
        f"- Accuracy: **{pct(metrics.get('accuracy', 0))}**",
        f"- Macro precision: **{pct(metrics.get('macro_precision', 0))}**",
        f"- Macro recall: **{pct(metrics.get('macro_recall', 0))}**",
        f"- Macro F1: **{pct(metrics.get('macro_f1', 0))}**",
        f"- Parse success: **{pct(metrics.get('parse_success_rate', 0))}**",
        f"- Citation grounding: **{pct(metrics.get('citation_grounding_rate', 0))}**",
        "",
        "## Error review",
        "",
        f"- Label disagreements: {len(label_errors)}",
        f"- Ungrounded citations: {len(citation_errors)}",
        "",
        "This is a 20-item synthetic capstone evaluation. These results are descriptive and must not be represented as production performance, certification, or generalized compliance accuracy.",
        "",
        "## Gold-set integrity",
        "",
        f"- Human reviewers: {', '.join(manifest.get('reviewers', []))}",
        f"- Label counts: {manifest.get('label_counts', {})}",
        "- The evaluator verified the frozen gold hash before scoring.",
        "- Gold labels must not be changed because of model disagreements.",
    ]

    output = ROOT / "results/final_summary.md"
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
