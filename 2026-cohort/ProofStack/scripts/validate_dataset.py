import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

questions = json.loads(
    (ROOT / "data/questions.json").read_text(encoding="utf-8")
)
with (ROOT / "data/evidence_manifest.csv").open(
    encoding="utf-8",
    newline="",
) as f:
    evidence = list(csv.DictReader(f))

assert len(questions) == 10, f"Expected 10 questions, found {len(questions)}"
assert len(evidence) == 20, f"Expected 20 evidence docs, found {len(evidence)}"

required_question_fields = {
    "question_id",
    "question",
    "claim",
    "reviewer_friendly_question",
    "reviewer_hint",
}
for question in questions:
    missing = required_question_fields - set(question)
    assert not missing, f'{question.get("question_id", "?")} missing fields: {sorted(missing)}'
    assert all(str(question[field]).strip() for field in required_question_fields)

qids = {question["question_id"] for question in questions}
assert len(qids) == 10, "Question IDs must be unique"

counts = Counter(item["question_id"] for item in evidence)
assert set(counts) == qids
assert all(value == 2 for value in counts.values()), counts

evidence_ids = [item["evidence_id"] for item in evidence]
assert len(set(evidence_ids)) == 20, "Evidence IDs must be unique"

paths = [item["path"] for item in evidence]
assert len(set(paths)) == 20, "Evidence paths must be unique"

for item in evidence:
    assert item["question_id"] in qids
    target = ROOT / item["path"]
    assert target.exists(), item["path"]
    assert target.read_text(encoding="utf-8").strip(), f'Empty evidence file: {item["path"]}'

print("OK: 10 questions, 20 evidence documents, 2 documents per question")
