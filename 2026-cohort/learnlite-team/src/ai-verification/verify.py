"""
LearnLite - initial verification test for the Nemotron content checker.

Sends each drafted statement + its source text to an NVIDIA Nemotron model
(hosted on build.nvidia.com), collects the verdict using the agreed checker
contract, and compares it with the human label.

Checker contract
  Input : {"statement": "...", "source_id": "...", "source_text": "..."}
  Output: {"verdict": "SUPPORTED | PARTIAL | UNSUPPORTED",
           "reason": "one sentence",
           "evidence_span": "exact words from source_text"}

Usage
  export NVIDIA_API_KEY="nvapi-..."        # Windows: set NVIDIA_API_KEY=nvapi-...
  python verify.py                         # run the eval set
  python verify.py --list-models           # see which Nemotron models your key can use
  python verify.py --model nvidia/<model>  # use a different model
  python verify.py --dry-run               # test the pipeline without calling the API

Outputs
  results.csv  - one row per item: expected vs actual verdict, reason, evidence
  summary printed to the terminal: agreement %, critical errors, confusion table
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from collections import Counter

BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MODEL = os.environ.get("NEMOTRON_MODEL", "nvidia/nemotron-3-ultra-550b-a55b")
VERDICTS = ("SUPPORTED", "PARTIAL", "UNSUPPORTED")

SYSTEM_PROMPT = """You are a strict fact-checker for an educational app used by young learners.
You receive ONE statement and ONE source text. Judge the statement ONLY against the source text.
Do not use outside knowledge, even if you believe the statement is true or false in general.

Verdicts:
- SUPPORTED: the source text clearly states or directly implies everything in the statement.
- PARTIAL: part of the statement is supported, but it adds, drops or over-generalises something
  (for example words like "only", "always", "never" that the source does not support).
- UNSUPPORTED: the source contradicts the statement, or the statement makes a claim the source does not contain.

Reply with ONLY a JSON object, no other text:
{"verdict": "SUPPORTED|PARTIAL|UNSUPPORTED", "reason": "<one sentence>", "evidence_span": "<exact words copied from the source text, or empty string>"}"""


def build_user_message(item):
    payload = {
        "statement": item["statement"],
        "source_id": item["source_id"],
        "source_text": item["source_text"],
    }
    return json.dumps(payload, ensure_ascii=False)


def parse_verdict(text):
    """Pull the JSON object out of the model reply and validate it."""
    match = re.search(r"\{.*\}", text or "", re.DOTALL)
    if not match:
        return {"verdict": "ERROR", "reason": f"No JSON in reply: {text!r:.200}", "evidence_span": ""}
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        return {"verdict": "ERROR", "reason": f"Bad JSON: {exc}", "evidence_span": ""}
    verdict = str(data.get("verdict", "")).strip().upper()
    if verdict not in VERDICTS:
        verdict = "ERROR"
    return {
        "verdict": verdict,
        "reason": str(data.get("reason", "")).strip(),
        "evidence_span": str(data.get("evidence_span", "")).strip(),
    }


def evidence_is_exact(evidence, source_text):
    """The contract says evidence_span must be copied from the source; check it."""
    if not evidence:
        return False
    norm = lambda s: re.sub(r"\s+", " ", s).strip().lower()
    return norm(evidence) in norm(source_text)


def make_client():
    try:
        from openai import OpenAI
    except ImportError:
        sys.exit("Missing package. Run: pip install -r requirements.txt")
    key = os.environ.get("NVIDIA_API_KEY")
    if not key:
        sys.exit("NVIDIA_API_KEY is not set. Create a key at https://build.nvidia.com/settings/api-keys")
    return OpenAI(base_url=BASE_URL, api_key=key)


def call_checker(client, model, item, retries=3):
    for attempt in range(1, retries + 1):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": build_user_message(item)},
                ],
                temperature=0.0,
                max_tokens=400,
                # Turn off visible "thinking" on reasoning Nemotron models; ignored by others.
                extra_body={"chat_template_kwargs": {"enable_thinking": False}},
            )
            return parse_verdict(resp.choices[0].message.content)
        except Exception as exc:  # network, rate limit, bad model id
            if attempt == retries:
                return {"verdict": "ERROR", "reason": f"API error: {exc}", "evidence_span": ""}
            time.sleep(2 * attempt)


def fake_checker(item):
    """Dry-run judge: returns the expected label so you can test the pipeline offline."""
    first_sentence = item["source_text"].split(".")[0]
    return {"verdict": item["expected"], "reason": "dry run", "evidence_span": first_sentence}


def list_models():
    client = make_client()
    names = sorted(m.id for m in client.models.list().data)
    nemotron = [n for n in names if "nemotron" in n.lower()]
    print("Nemotron models available to your key:")
    for n in nemotron or names:
        print("  ", n)


def main():
    parser = argparse.ArgumentParser(description="LearnLite Nemotron checker test")
    parser.add_argument("--eval", default="eval_set.json", help="path to the evaluation set")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="NVIDIA model id")
    parser.add_argument("--out", default="results.csv", help="where to write results")
    parser.add_argument("--dry-run", action="store_true", help="no API calls")
    parser.add_argument("--list-models", action="store_true", help="list Nemotron models and exit")
    args = parser.parse_args()

    if args.list_models:
        list_models()
        return

    with open(args.eval, encoding="utf-8") as f:
        items = json.load(f)["items"]

    client = None if args.dry_run else make_client()
    print(f"Checking {len(items)} items with {'DRY RUN' if args.dry_run else args.model}\n")

    rows = []
    for item in items:
        result = fake_checker(item) if args.dry_run else call_checker(client, args.model, item)
        match = result["verdict"] == item["expected"]
        rows.append({
            "id": item["id"],
            "statement": item["statement"],
            "expected": item["expected"],
            "actual": result["verdict"],
            "match": "yes" if match else "NO",
            "critical_error": "YES" if (item["expected"] == "UNSUPPORTED" and result["verdict"] == "SUPPORTED") else "",
            "evidence_exact": "yes" if evidence_is_exact(result["evidence_span"], item["source_text"]) else "no",
            "reason": result["reason"],
            "evidence_span": result["evidence_span"],
        })
        print(f"{item['id']}: expected {item['expected']:<11} got {result['verdict']:<11} {'OK' if match else '<-- check'}")

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    total = len(rows)
    agree = sum(r["match"] == "yes" for r in rows)
    critical = sum(r["critical_error"] == "YES" for r in rows)
    errors = sum(r["actual"] == "ERROR" for r in rows)
    exact = sum(r["evidence_exact"] == "yes" for r in rows)
    pairs = Counter((r["expected"], r["actual"]) for r in rows)

    print("\n=== Summary ===")
    print(f"Agreement with human labels : {agree}/{total} ({100 * agree / total:.0f}%)   proposed target: 90%")
    print(f"Critical errors             : {critical}   (UNSUPPORTED marked SUPPORTED; target: 0)")
    print(f"Evidence copied exactly     : {exact}/{total}")
    print(f"API or format errors        : {errors}")
    print("\nConfusion (expected -> actual):")
    for exp in VERDICTS:
        line = "  ".join(f"{act[:4]}={pairs.get((exp, act), 0)}" for act in VERDICTS + ("ERROR",))
        print(f"  {exp:<11} -> {line}")
    print(f"\nDetails written to {args.out}")


if __name__ == "__main__":
    main()
