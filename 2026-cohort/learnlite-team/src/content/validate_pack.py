"""
Validate a LearnLite content pack before handing it to the app.

Checks: unique item_ids, valid item types, answer indexes inside options,
every source_id listed in sources[], illustrative probabilities sum to about 1,
and the extra fields each activity type needs.

Usage:  python validate_pack.py module1_pack.json
"""
import json
import sys

TYPES = {"read", "next_word", "single_choice", "spot_the_error",
         "token_demo", "prompt_builder", "slider_compare", "sort_cards"}
ANSWERED = {"next_word", "single_choice", "spot_the_error"}


def check_item(lesson, item, sources, seen, errors):
    iid = item.get("item_id", "?")
    if iid in seen:
        errors.append(f"{iid}: duplicate item_id")
    seen.add(iid)
    if not iid.startswith(lesson["lesson_id"] + "."):
        errors.append(f"{iid}: id does not start with {lesson['lesson_id']}.")
    t = item.get("type")
    if t not in TYPES:
        errors.append(f"{iid}: unknown type {t!r}")
    if item.get("source_id") not in sources:
        errors.append(f"{iid}: source_id {item.get('source_id')!r} not in sources[]")
    if t == "read" and not (item.get("heading") and item.get("body")):
        errors.append(f"{iid}: read item needs heading and body")
    if t in ANSWERED:
        opts = item.get("options", [])
        if not (0 <= item.get("correct", -1) < len(opts)):
            errors.append(f"{iid}: 'correct' index outside options")
    if t != "read" and not item.get("feedback"):
        errors.append(f"{iid}: missing feedback")
    if t == "next_word":
        total = sum(c["p"] for c in item.get("ai_choices", []))
        if abs(total - 1.0) > 0.02:
            errors.append(f"{iid}: ai_choices probabilities sum to {total:.2f}")
    if t == "token_demo":
        for ex in item.get("examples", []):
            if "".join(ex["tokens"]) != ex["text"]:
                errors.append(f"{iid}: tokens do not rebuild {ex['text']!r}")
        if not item.get("examples"):
            errors.append(f"{iid}: token_demo needs examples")
    if t == "prompt_builder":
        for k in ("weak_prompt", "weak_answer", "parts", "strong_answer"):
            if not item.get(k):
                errors.append(f"{iid}: prompt_builder missing {k}")
    if t == "slider_compare" and len(item.get("settings", [])) < 2:
        errors.append(f"{iid}: slider_compare needs at least 2 settings")
    if t == "sort_cards":
        n = len(item.get("categories", []))
        for c in item.get("cards", []):
            if not (0 <= c.get("answer", -1) < n):
                errors.append(f"{iid}: card answer outside categories: {c.get('text', '')[:30]}")


def main(path):
    with open(path, encoding="utf-8") as f:
        pack = json.load(f)
    errors, seen = [], set()
    sources = {s["source_id"] for s in pack.get("sources", [])}
    used = set()
    count = 0
    for lesson in pack["lessons"]:
        for item in lesson["items"]:
            count += 1
            used.add(item.get("source_id"))
            check_item(lesson, item, sources, seen, errors)
    unused = sources - used
    print(f"{pack['pack_id']} v{pack['pack_version']}: {len(pack['lessons'])} lessons, {count} items")
    for lesson in pack["lessons"]:
        print(f"  L{lesson['number']} {lesson['title']}: {len(lesson['items'])} items")
    if unused:
        print("Note: sources listed but not used:", ", ".join(sorted(unused)))
    if errors:
        print("ERRORS:")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print("OK: pack is valid")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "module1_pack.json")
