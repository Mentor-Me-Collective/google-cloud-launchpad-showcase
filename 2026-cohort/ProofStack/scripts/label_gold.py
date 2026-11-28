"""Interactively create the 20-case human gold set without showing model output.

The script resumes incomplete work and writes directly to data/gold_labels.csv.
It never reads results/predictions.csv.

Usage:
    python scripts/label_gold.py --reviewer "John Flack"
"""

import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GOLD_PATH = ROOT / "data/gold_labels.csv"


def read_csv(path):
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def write_gold(rows):
    with GOLD_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["question_id", "evidence_id", "label", "reviewer", "notes"],
        )
        writer.writeheader()
        writer.writerows(rows)


def prompt_label():
    while True:
        raw = input("Label [S]UPPORTED / [U]NSUPPORTED / [Q]uit: ").strip().upper()
        if raw in {"S", "SUPPORTED"}:
            return "SUPPORTED"
        if raw in {"U", "UNSUPPORTED"}:
            return "UNSUPPORTED"
        if raw in {"Q", "QUIT"}:
            return None
        print("Enter S, U, or Q.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reviewer", required=True, help="Human reviewer name or initials")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Review all cases, including already completed labels.",
    )
    args = parser.parse_args()

    questions = {
        row["question_id"]: row
        for row in json.loads((ROOT / "data/questions.json").read_text(encoding="utf-8"))
    }
    manifest = {row["evidence_id"]: row for row in read_csv(ROOT / "data/evidence_manifest.csv")}
    gold = read_csv(GOLD_PATH)

    completed = sum(bool(row["label"].strip()) for row in gold)
    print(f"Gold set progress: {completed}/20 completed")
    print("Model predictions are intentionally not loaded or displayed.\n")

    for index, row in enumerate(gold, start=1):
        if row["label"].strip() and not args.all:
            continue

        question = questions[row["question_id"]]
        evidence = manifest[row["evidence_id"]]
        evidence_text = (ROOT / evidence["path"]).read_text(encoding="utf-8")

        print("=" * 78)
        print(f"CASE {index}/20 · {row['question_id']} · {row['evidence_id']}")
        print(f"Question: {question.get('reviewer_friendly_question') or question['question']}")
        print(f"Claim: {question['claim']}")
        print(f"Reviewer guidance: {question.get('reviewer_hint', '')}")
        print(f"Evidence: {evidence['title']} ({evidence['artifact_type']})")
        print("-" * 78)
        print(evidence_text)
        print("-" * 78)

        label = prompt_label()
        if label is None:
            print("Stopped. Completed labels were saved as you went.")
            return

        note = input("Short note supporting your judgment: ").strip()
        while not note:
            print("A short human rationale is required for the gold set.")
            note = input("Short note supporting your judgment: ").strip()

        row["label"] = label
        row["reviewer"] = args.reviewer.strip()
        row["notes"] = note
        write_gold(gold)
        print(f"Saved {row['evidence_id']} = {label}.\n")

    completed = sum(bool(row["label"].strip()) for row in gold)
    print(f"Gold set progress: {completed}/20 completed")
    if completed == 20:
        print("All labels complete. Next: python scripts/freeze_gold.py")


if __name__ == "__main__":
    main()
