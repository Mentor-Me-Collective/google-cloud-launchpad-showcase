"""
Validate a LearnLite module against the backend contract (Module -> Lesson -> Block).

Follows "LearnLite - requisitos y contrato del backend" v1.0 (2026-11-14):
  section 3.3  Module / Lesson / Block
  section 3.4  ActivityDefinition
  section 7    validation rules per activity type

Extension fields proposed by the content team (sourceId, reviewedBy, contentKey,
aiChoices, illustrative, sources, settings, language) are allowed and reported.

Usage:  python validate_module.py ../../../content/module1_module.json
"""
import json
import sys

BLOCK_KINDS = {"theory", "material", "link", "activity"}
ACTIVITY_TYPES = {"multiple-choice", "true-false", "match-pairs", "order-steps", "fill-blanks", "classify"}
MODULE_STATUS = {"draft", "published", "archived"}
LIMITS = {"title": 120, "prompt": 500, "body": 2000, "instruction": 200, "explanation": 600}
EXTENSIONS = {"sourceId", "reviewedBy", "contentKey", "aiChoices", "illustrative",
              "tokenExamples", "sliderSettings"}


def _text_ok(value, field, where, errors, required=False):
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            errors.append(f"{where}: '{field}' is required")
        return
    if not isinstance(value, str):
        errors.append(f"{where}: '{field}' must be text")
    elif len(value) > LIMITS.get(field, 2000):
        errors.append(f"{where}: '{field}' is longer than {LIMITS.get(field, 2000)} characters")


def validate_activity(act, where, errors):
    t = act.get("type")
    if t not in ACTIVITY_TYPES:
        errors.append(f"{where}: unknown activity type {t!r}")
        return
    _text_ok(act.get("prompt"), "prompt", where, errors, required=True)
    _text_ok(act.get("instruction"), "instruction", where, errors)
    _text_ok(act.get("explanation"), "explanation", where, errors)
    xp = act.get("xp")
    if not isinstance(xp, (int, float)) or xp < 0:
        errors.append(f"{where}: 'xp' must be a number >= 0")

    if t == "multiple-choice":
        opts = act.get("options") or []
        if len([o for o in opts if isinstance(o, str) and o.strip()]) < 2:
            errors.append(f"{where}: multiple-choice needs at least 2 non-empty options")
        if not isinstance(act.get("correctIndex"), int) or not (0 <= act["correctIndex"] < len(opts)):
            errors.append(f"{where}: correctIndex is outside the options")
        if len(set(opts)) != len(opts):
            errors.append(f"{where}: duplicate options")
    elif t == "true-false":
        if not isinstance(act.get("correctBool"), bool):
            errors.append(f"{where}: true-false needs correctBool")
    elif t == "match-pairs":
        pairs = act.get("pairs") or []
        if len(pairs) < 2:
            errors.append(f"{where}: match-pairs needs at least 2 pairs")
        lefts = [p.get("left", "").strip() for p in pairs]
        if any(not p.get("left", "").strip() or not p.get("right", "").strip() for p in pairs):
            errors.append(f"{where}: match-pairs has an empty side")
        if len(set(lefts)) != len(lefts):
            errors.append(f"{where}: match-pairs has duplicate left items")
    elif t == "order-steps":
        if len([s for s in act.get("steps") or [] if str(s).strip()]) < 2:
            errors.append(f"{where}: order-steps needs at least 2 steps")
    elif t == "fill-blanks":
        if "___" not in act.get("prompt", ""):
            errors.append(f"{where}: fill-blanks prompt needs a ___ marker")
        if not [a for a in act.get("answers") or [] if str(a).strip()]:
            errors.append(f"{where}: fill-blanks needs at least one answer")
    elif t == "classify":
        cats = act.get("categories") or []
        if len(cats) < 2:
            errors.append(f"{where}: classify needs at least 2 categories")
        items = [i for c in cats for i in c.get("items", [])]
        if len(set(items)) != len(items):
            errors.append(f"{where}: an item appears in more than one category")
        if any(not c.get("name", "").strip() for c in cats):
            errors.append(f"{where}: a category has no name")
        if not items:
            errors.append(f"{where}: classify has no items")


def validate_block(block, where, errors):
    kind = block.get("kind")
    if kind not in BLOCK_KINDS:
        errors.append(f"{where}: unknown block kind {kind!r}")
        return
    _text_ok(block.get("title"), "title", where, errors, required=True)
    if kind == "theory":
        _text_ok(block.get("body"), "body", where, errors, required=True)
    if kind == "link" and not str(block.get("url", "")).startswith("https://"):
        errors.append(f"{where}: link blocks need an https:// url")
    if kind == "activity":
        if not isinstance(block.get("activity"), dict):
            errors.append(f"{where}: activity block needs 'activity'")
        else:
            validate_activity(block["activity"], where, errors)
    elif "activity" in block:
        errors.append(f"{where}: only activity blocks may carry 'activity'")


def validate_module(module):
    errors, notes = [], []
    _text_ok(module.get("title"), "title", "module", errors, required=True)
    _text_ok(module.get("subject"), "title", "module.subject", errors, required=True)
    if module.get("status") not in MODULE_STATUS:
        errors.append("module: status must be draft, published or archived")
    source_ids = {s.get("sourceId") for s in module.get("sources", [])}
    keys, used_ext = set(), set()
    lessons = module.get("lessons") or []
    if not lessons:
        errors.append("module: no lessons")
    for li, lesson in enumerate(lessons):
        lw = f"lesson[{li}] {lesson.get('title', '')!r}"
        _text_ok(lesson.get("title"), "title", lw, errors, required=True)
        if lesson.get("position") != li:
            errors.append(f"{lw}: position should be {li} (explicit and in order)")
        blocks = lesson.get("blocks") or []
        if not blocks:
            errors.append(f"{lw}: no blocks")
        for bi, block in enumerate(blocks):
            bw = f"{lw} block[{bi}]"
            if block.get("position") != bi:
                errors.append(f"{bw}: position should be {bi}")
            validate_block(block, bw, errors)
            used_ext |= EXTENSIONS & set(block)
            k = block.get("contentKey")
            if k:
                if k in keys:
                    errors.append(f"{bw}: duplicate contentKey {k}")
                keys.add(k)
            if source_ids and block.get("sourceId") and block["sourceId"] not in source_ids:
                errors.append(f"{bw}: sourceId {block['sourceId']} not listed in module sources")
        if lessons and blocks and blocks[-1].get("kind") != "activity" and lesson.get("position", 0) > 0:
            notes.append(f"{lw}: ends with a {blocks[-1].get('kind')} block; the contract completes a lesson at its last block")
    if used_ext:
        notes.append("extension fields used (proposed, not yet in the contract): " + ", ".join(sorted(used_ext)))
    return errors, notes


def main(path):
    module = json.load(open(path, encoding="utf-8"))
    errors, notes = validate_module(module)
    n_blocks = sum(len(l.get("blocks", [])) for l in module.get("lessons", []))
    acts = [b["activity"]["type"] for l in module.get("lessons", []) for b in l.get("blocks", []) if b.get("kind") == "activity"]
    print(f"{module.get('title')} ({module.get('status')}): {len(module.get('lessons', []))} lessons, "
          f"{n_blocks} blocks, {len(acts)} activities")
    for l in module.get("lessons", []):
        print(f"  {l['position']}. {l['title']}: {len(l.get('blocks', []))} blocks")
    print("  activity types:", {t: acts.count(t) for t in sorted(set(acts))})
    for n in notes:
        print("Note:", n)
    if errors:
        print("ERRORS:")
        for e in errors:
            print("  -", e)
        sys.exit(1)
    print("OK: module matches the backend contract")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "module.json")
