"""
Convert a LearnLite content pack (content/module1_pack.json, item format)
into the backend contract format (Module -> Lesson -> Block -> ActivityDefinition).

Mapping
  read            -> theory block
  single_choice   -> activity: multiple-choice
  spot_the_error  -> activity: multiple-choice ("Find the made-up statement")
  next_word       -> activity: multiple-choice  (+ aiChoices extension for the bar chart)
  sort_cards      -> activity: classify
  prompt_builder  -> theory (weak prompt) + classify (role/context/task/format) + theory (improved answer)
  token_demo      -> theory block listing the example splits (+ tokenExamples extension)
  slider_compare  -> theory block listing the answers per setting (+ sliderSettings extension)

IDs are left to the server (contract 2.1). Each block keeps our stable item id as
`contentKey`, plus `sourceId` and `reviewedBy`, so audit and progress mapping survive.

Usage:
  python convert_pack.py ../../../content/module1_pack.json ../../../content/module1_module.json
"""
import json
import sys

XP = {"multiple-choice": 10, "classify": 15}
PRE_TEST_XP = 0  # Quick check measures prior knowledge; no XP for guessing


def ext(item, **extra):
    """Extension fields proposed by the content team (see README)."""
    out = {"contentKey": item["item_id"], "sourceId": item.get("source_id"),
           "reviewedBy": item.get("reviewed_by")}
    if item.get("illustrative"):
        out["illustrative"] = True
    out.update(extra)
    return out


def mc(item, title, instruction=None, xp=10, **extra):
    act = {"type": "multiple-choice", "prompt": item["prompt"], "options": item["options"],
           "correctIndex": item["correct"], "explanation": item["feedback"], "xp": xp}
    if instruction:
        act["instruction"] = instruction
    return [{"kind": "activity", "title": title, "activity": act, **ext(item, **extra)}]


def convert_item(item, pre_test):
    t = item["type"]
    q_xp = PRE_TEST_XP if pre_test else XP["multiple-choice"]
    if t == "read":
        return [{"kind": "theory", "title": item["heading"], "body": item["body"], **ext(item)}]
    if t == "single_choice":
        return mc(item, "Quick check" if pre_test else "Question", xp=q_xp)
    if t == "spot_the_error":
        return mc(item, "Spot the hallucination", instruction="Find the made-up statement.", xp=q_xp)
    if t == "next_word":
        return mc(item, "Guess the next word", instruction="Which word would the AI most likely pick?",
                  xp=q_xp, aiChoices=item["ai_choices"])
    if t == "sort_cards":
        cats = [{"name": name, "items": [c["text"] for c in item["cards"] if c["answer"] == i]}
                for i, name in enumerate(item["categories"])]
        return [{"kind": "activity", "title": "Check it or share it?",
                 "activity": {"type": "classify", "instruction": "Sort each AI answer.",
                              "prompt": item["prompt"], "categories": cats,
                              "explanation": item["feedback"], "xp": XP["classify"]},
                 **ext(item)}]
    if t == "prompt_builder":
        names = {"role": "Role", "context": "Context", "task": "Task", "format": "Format"}
        k = item["item_id"]
        return [
            {"kind": "theory", "title": "A weak prompt",
             "body": f"Prompt: \"{item['weak_prompt']}\"\n\nExample answer: {item['weak_answer']}",
             **ext(item, contentKey=f"{k}.weak")},
            {"kind": "activity", "title": "Prompt makeover",
             "activity": {"type": "classify",
                          "instruction": "Match each part of the better prompt to its job.",
                          "prompt": item["prompt"],
                          "categories": [{"name": names[p["part"]], "items": [p["text"]]} for p in item["parts"]],
                          "explanation": "Role, context, task and format together make a clear prompt.",
                          "xp": XP["classify"]},
             **ext(item, contentKey=f"{k}.parts")},
            {"kind": "theory", "title": "The better prompt",
             "body": "Prompt: \"" + " ".join(p["text"] for p in item["parts"]) + "\"\n\n"
                     f"Example answer:\n{item['strong_answer']}\n\n{item['feedback']}",
             **ext(item, contentKey=f"{k}.strong")},
        ]
    if t == "token_demo":
        lines = [f"\"{e['text']}\" -> " + " | ".join(f"[{tok}]" for tok in e["tokens"]) for e in item["examples"]]
        body = item["prompt"].replace("Tap each sentence to see", "Here is") + "\n\n" + "\n".join(lines) + \
            f"\n\n{item['feedback']}\n\n(Example splits for teaching; real models may split differently.)"
        return [{"kind": "theory", "title": "Token splitter", "body": body,
                 **ext(item, tokenExamples=item["examples"])}]
    if t == "slider_compare":
        lines = [f"{s['label']} temperature: \"{s['answer']}\"" for s in item["settings"]]
        body = f"Prompt: \"{item['base_prompt']}\"\n\n" + "\n".join(lines) + \
            f"\n\n{item['feedback']}\n\n(Example answers written for teaching.)"
        return [{"kind": "theory", "title": "The creativity setting in action", "body": body,
                 **ext(item, sliderSettings=item["settings"])}]
    raise ValueError(f"Unknown item type {t!r} in {item['item_id']}")


def convert(pack):
    lessons = []
    for pos, lesson in enumerate(sorted(pack["lessons"], key=lambda l: l["number"])):
        pre_test = lesson.get("settings", {}).get("counts_as") == "pre_test"
        blocks = [b for item in lesson["items"] for b in convert_item(item, pre_test)]
        for i, b in enumerate(blocks):
            b["position"] = i
        title = lesson["title"] if lesson["number"] in (0, 6) else f"Lesson {lesson['number']}: {lesson['title']}"
        out = {"title": title, "position": pos, "contentKey": lesson["lesson_id"],
               "objective": lesson.get("objective"), "minutes": lesson.get("minutes"), "blocks": blocks}
        if lesson.get("settings"):
            out["settings"] = lesson["settings"]
        lessons.append(out)
    return {
        "title": pack["title"].split(":")[0].strip(),
        "subtitle": pack["title"].split(":", 1)[1].strip() if ":" in pack["title"] else "",
        "subject": "AI literacy",
        "status": "draft",
        "version": 1,
        "language": pack.get("language", "en"),
        "audience": pack.get("audience"),
        "contentKey": pack["pack_id"],
        "contentVersion": pack["pack_version"],
        "sources": [{"sourceId": s["source_id"], "title": s["title"], "publisher": s["publisher"],
                     "url": s["url"], "reuse": s.get("reuse", "")} for s in pack["sources"]],
        "lessons": lessons,
    }


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "module1_pack.json"
    dst = sys.argv[2] if len(sys.argv) > 2 else "module1_module.json"
    module = convert(json.load(open(src, encoding="utf-8")))
    json.dump(module, open(dst, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"Wrote {dst}: {len(module['lessons'])} lessons, "
          f"{sum(len(l['blocks']) for l in module['lessons'])} blocks")
