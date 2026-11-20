import csv
from pathlib import Path


HEADER = [
    "timestamp_utc",
    "question_id",
    "evidence_id",
    "evidence_title",
    "artifact_type",
    "provider",
    "model_id",
    "model_label",
    "model_rationale",
    "cited_excerpt",
    "citation_valid",
    "reviewer_label",
    "reviewer",
    "notes",
]


def append_decision(row: dict, path="local_decisions.csv"):
    target = Path(path)
    new = not target.exists()

    if not new:
        with target.open("r", newline="", encoding="utf-8") as f:
            existing_header = next(csv.reader(f), [])
        if existing_header != HEADER:
            raise RuntimeError(
                "Existing local decision log uses an older schema. "
                "Rename or remove local_decisions.csv before continuing."
            )

    with target.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=HEADER)
        if new:
            writer.writeheader()
        writer.writerow({key: row.get(key, "") for key in HEADER})


def read_decisions(path="local_decisions.csv"):
    target = Path(path)
    if not target.exists():
        return []
    with target.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != HEADER:
            raise RuntimeError("Existing local decision log uses an older schema.")
        return list(reader)
