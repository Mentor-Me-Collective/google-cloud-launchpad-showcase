"""
LearnLite educator pipeline (backend contract format).

  approved sources -> Gemini drafts blocks -> Nemotron checks every claim
  -> educator reviews -> approved lesson exported as a contract Lesson (Module -> Lesson -> Block)

Output follows "LearnLite: requisitos y contrato del backend" v1.0 (sections 3.3, 3.4, 7),
plus the optional content fields proposed in services/ai-content/tools/README.md
(sourceId, reviewedBy, contentKey).

No web framework is imported here, so the same functions can back the Streamlit
studio, FastAPI endpoints, or a standalone Cloud Run service.

Settings: environment variables or .env (see .env.example). LEARNLITE_MOCK=1 runs without keys.
"""
from __future__ import annotations

import copy
import datetime as dt
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
NEMOTRON_MODEL = os.environ.get("NEMOTRON_MODEL", "nvidia/nemotron-3-ultra-550b-a55b")
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
VERDICTS = ("SUPPORTED", "PARTIAL", "UNSUPPORTED")
SEVERITY = {"SUPPORTED": 0, "PARTIAL": 1, "UNSUPPORTED": 2, "ERROR": 3}

# Block "styles" the drafter can produce. Each maps to a contract block.
STYLES = ("theory", "multiple-choice", "spot-the-error", "true-false", "classify")
XP = {"multiple-choice": 10, "spot-the-error": 10, "true-false": 5, "classify": 15}


def mock_mode() -> bool:
    return os.environ.get("LEARNLITE_MOCK", "").strip().lower() in ("1", "true", "yes")


def gemini_backend() -> str:
    if mock_mode():
        return "mock"
    if os.environ.get("GOOGLE_CLOUD_PROJECT"):
        return "vertex"
    if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
        return "api_key"
    return "missing"


def nemotron_ready() -> bool:
    return mock_mode() or bool(os.environ.get("NVIDIA_API_KEY"))


# --------------------------------------------------------------------------
# Sources
# --------------------------------------------------------------------------
def clean_sources(sources: list[dict]) -> list[dict]:
    out, seen = [], set()
    for s in sources:
        sid = str(s.get("source_id") or s.get("sourceId") or "").strip()
        text = str(s.get("text", "")).strip()
        if not sid or not text or sid in seen:
            continue
        seen.add(sid)
        out.append({"source_id": sid, "title": str(s.get("title", "")).strip() or sid,
                    "publisher": str(s.get("publisher", "")).strip(), "url": str(s.get("url", "")).strip(),
                    "reuse": str(s.get("reuse", "")).strip(), "text": text})
    return out


# --------------------------------------------------------------------------
# Drafting with Gemini
# --------------------------------------------------------------------------
DRAFT_SYSTEM = """You write lesson content for LearnLite, an offline learning app for learners aged 14 to 20 in rural and low-income communities worldwide.

Rules:
- Use ONLY facts stated in the SOURCES. Never add facts, numbers, names, dates, studies or real events that are not in the sources.
- You may use simple everyday examples (school, home, farming, a small shop) if they make no factual claim beyond the sources.
- Simple English, about Grade 6 reading level, sentences under 20 words. Friendly and respectful. No stereotypes.
- Every block cites exactly one source_id from the list: the source its facts come from.
- "claims": every factual statement the block makes or implies, each as one short standalone sentence. They are checked against the source, so list them all.

Block styles:
- theory: "title" (max 6 words) and "body" (max 60 words).
- multiple-choice: "title", "prompt", exactly 3 "options", "correct_index" (0-based), "explanation" (1-2 sentences saying why). claims = the correct answer written as a statement, plus facts in the explanation.
- spot-the-error: "title", "prompt", exactly 3 "options" of which exactly ONE is a plausible but false statement, "correct_index" = index of the FALSE one, "planted_error" = that false statement copied exactly, "explanation" says why it is false and how to check. claims = only the TRUE options and facts in the explanation, never the planted error.
- true-false: "title", "prompt" (one statement), "correct_bool", "explanation". claims = the statement if it is true; if it is false, the corrected TRUE statement.
- classify: "title", "prompt", "categories" (2 or 3, each with "name" and 2-3 "items"), "explanation". Each item belongs to exactly one category. claims = one sentence per item stating why it belongs where it does, when that is a factual matter.

Order: start with theory, put each activity after the idea it practises, and end with a theory block titled "Key idea" that sums up the lesson.
Return JSON only."""

BLOCK_SCHEMA = {
    "type": "object",
    "properties": {"blocks": {"type": "array", "items": {
        "type": "object",
        "properties": {
            "style": {"type": "string", "enum": list(STYLES)},
            "title": {"type": "string"}, "body": {"type": "string"},
            "prompt": {"type": "string"},
            "options": {"type": "array", "items": {"type": "string"}},
            "correct_index": {"type": "integer"}, "correct_bool": {"type": "boolean"},
            "categories": {"type": "array", "items": {"type": "object", "properties": {
                "name": {"type": "string"}, "items": {"type": "array", "items": {"type": "string"}}},
                "required": ["name", "items"]}},
            "explanation": {"type": "string"}, "planted_error": {"type": "string"},
            "source_id": {"type": "string"},
            "claims": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["style", "title", "source_id", "claims"]}}},
    "required": ["blocks"],
}


def build_draft_prompt(meta: dict, sources: list[dict], counts: dict) -> str:
    src = "\n\n".join(f"[{s['source_id']}] {s['title']} ({s['publisher']})\n{s['text']}" for s in sources)
    wants = ", ".join(f"{n} {style}" for style, n in counts.items() if n)
    return (f"LESSON\nTitle: {meta['title']}\nObjective: {meta['objective']}\n"
            f"Learners: aged 14 to 20, low-connectivity communities\n\n"
            f"WRITE these blocks (theory count includes the final 'Key idea'): {wants}.\n\n"
            f"SOURCES (use only these facts; cite by id):\n{src}")


def _gemini_client():
    from google import genai
    route = gemini_backend()
    if route == "vertex":
        return genai.Client(enterprise=True, project=os.environ["GOOGLE_CLOUD_PROJECT"],
                            location=os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"))
    if route == "api_key":
        return genai.Client(api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))
    raise RuntimeError("Gemini is not configured. Set GOOGLE_CLOUD_PROJECT (Vertex AI) or GEMINI_API_KEY.")


def _parse_json(text: str) -> dict:
    text = re.sub(r"^```(?:json)?|```$", "", (text or "").strip(), flags=re.MULTILINE).strip()
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        raise ValueError("Gemini did not return JSON")
    return json.loads(m.group(0))


def call_gemini(prompt: str) -> list[dict]:
    from google.genai import types
    resp = _gemini_client().models.generate_content(
        model=GEMINI_MODEL, contents=prompt,
        config=types.GenerateContentConfig(system_instruction=DRAFT_SYSTEM,
                                           response_mime_type="application/json",
                                           response_json_schema=BLOCK_SCHEMA, temperature=0.3))
    data = resp.parsed if isinstance(getattr(resp, "parsed", None), dict) else _parse_json(resp.text)
    return data.get("blocks", [])


def mock_gemini(meta: dict, sources: list[dict], counts: dict) -> list[dict]:
    """Offline stand-in for Gemini. Uses source sentences and plants one unsupported claim."""
    sents = [(s, [x.strip() for x in re.split(r"(?<=[.!?])\s+", s["text"]) if x.strip()]) for s in sources]
    out = []
    for s, ss in sents[: max(1, counts.get("theory", 2) - 1)]:
        out.append({"style": "theory", "title": s["title"][:40], "body": " ".join(ss[:2]),
                    "source_id": s["source_id"], "claims": ss[:2]})
    out.append({"style": "theory", "title": "Did you know?", "body": "Chatbots always search the internet before they answer.",
                "source_id": sents[0][0]["source_id"], "claims": ["Chatbots always search the internet before they answer."]})
    for s, ss in sents[: counts.get("multiple-choice", 0)]:
        out.append({"style": "multiple-choice", "title": "Question", "prompt": "Which sentence matches the lesson?",
                    "options": [ss[0], "Computers never make mistakes.", "None of these."], "correct_index": 0,
                    "explanation": ss[0], "source_id": s["source_id"], "claims": [ss[0]]})
    for s, ss in sents[: counts.get("true-false", 0)]:
        out.append({"style": "true-false", "title": "True or false?", "prompt": ss[0], "correct_bool": True,
                    "explanation": "This matches the source.", "source_id": s["source_id"], "claims": [ss[0]]})
    for s, ss in sents[: counts.get("spot-the-error", 0)]:
        if len(ss) >= 2:
            out.append({"style": "spot-the-error", "title": "Spot the hallucination", "prompt": "Which sentence is made up?",
                        "options": [ss[0], ss[1], "Chatbots are always correct."], "correct_index": 2,
                        "planted_error": "Chatbots are always correct.",
                        "explanation": "Chatbots can be wrong. Check important facts.",
                        "source_id": s["source_id"], "claims": ss[:2]})
    if counts.get("classify"):
        s, ss = sents[0]
        out.append({"style": "classify", "title": "Sort it", "prompt": "Sort each sentence.",
                    "categories": [{"name": "From the lesson", "items": ss[:2]},
                                   {"name": "Not from the lesson", "items": ["The moon is made of cheese."]}],
                    "explanation": "Only the first group appears in the lesson.", "source_id": s["source_id"],
                    "claims": ss[:2]})
    out.append({"style": "theory", "title": "Key idea", "body": sents[0][1][0],
                "source_id": sents[0][0]["source_id"], "claims": [sents[0][1][0]]})
    return out


def _new_state():
    return ({"status": "not_checked", "verdict": None, "results": [], "problems": []},
            {"status": "pending", "note": "", "edited_after_check": False})


def to_block(raw: dict, key: str, source_ids: set) -> dict | None:
    """Turn one drafted item into an internal block (contract block + claims + check/review state)."""
    style = raw.get("style")
    if style not in STYLES:
        return None
    sid = raw.get("source_id") if raw.get("source_id") in source_ids else sorted(source_ids)[0]
    claims = [str(c).strip() for c in raw.get("claims", []) if str(c).strip()]
    title = str(raw.get("title", "")).strip()
    if style == "theory":
        if not (title and str(raw.get("body", "")).strip()):
            return None
        block = {"kind": "theory", "title": title, "body": raw["body"].strip()}
    else:
        act = {"prompt": str(raw.get("prompt", "")).strip(), "explanation": str(raw.get("explanation", "")).strip(),
               "xp": XP[style]}
        if not act["prompt"]:
            return None
        if style in ("multiple-choice", "spot-the-error"):
            opts = [str(o).strip() for o in raw.get("options", []) if str(o).strip()]
            ci = raw.get("correct_index")
            if len(opts) < 2 or not isinstance(ci, int) or not 0 <= ci < len(opts):
                return None
            act.update(type="multiple-choice", options=opts, correctIndex=ci)
            if style == "spot-the-error":
                act["instruction"] = "Find the made-up statement."
                planted = str(raw.get("planted_error") or opts[ci]).strip()
                claims = [c for c in claims if c != planted]
        elif style == "true-false":
            if not isinstance(raw.get("correct_bool"), bool):
                return None
            act.update(type="true-false", correctBool=raw["correct_bool"])
        elif style == "classify":
            cats = [{"name": str(c.get("name", "")).strip(),
                     "items": [str(i).strip() for i in c.get("items", []) if str(i).strip()]}
                    for c in raw.get("categories", [])]
            cats = [c for c in cats if c["name"] and c["items"]]
            if len(cats) < 2:
                return None
            act.update(type="classify", categories=cats)
        block = {"kind": "activity", "title": title or "Activity", "activity": act}
    check, review = _new_state()
    block.update(contentKey=key, style=style, sourceId=sid, claims=claims, check=check, review=review)
    return block


def draft_lesson(meta: dict, sources: list[dict], counts: dict) -> list[dict]:
    sources = clean_sources(sources)
    if not sources:
        raise ValueError("Add at least one source with text before drafting.")
    raw = mock_gemini(meta, sources, counts) if mock_mode() else call_gemini(build_draft_prompt(meta, sources, counts))
    ids = {s["source_id"] for s in sources}
    blocks = []
    for r in raw:
        b = to_block(r, f"{meta['lesson_key']}.b{len(blocks) + 1}", ids)
        if b:
            blocks.append(b)
    if not blocks:
        raise ValueError("The draft came back empty or malformed. Try again.")
    return blocks


# --------------------------------------------------------------------------
# Checking with Nemotron (same contract as ai-verification/verify.py)
# --------------------------------------------------------------------------
CHECK_SYSTEM = """You are a strict fact-checker for an educational app used by young learners.
You receive ONE statement and ONE source text. Judge the statement ONLY against the source text.
Do not use outside knowledge, even if you believe the statement is true or false in general.

Verdicts:
- SUPPORTED: the source text clearly states or directly implies everything in the statement.
- PARTIAL: part of the statement is supported, but it adds, drops or over-generalises something
  (for example words like "only", "always", "never" that the source does not support).
- UNSUPPORTED: the source contradicts the statement, or the statement makes a claim the source does not contain.

Reply with ONLY a JSON object, no other text:
{"verdict": "SUPPORTED|PARTIAL|UNSUPPORTED", "reason": "<one sentence>", "evidence_span": "<exact words copied from the source text, or empty string>"}"""


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip().lower()


def evidence_is_exact(evidence: str, source_text: str) -> bool:
    return bool(evidence) and _norm(evidence) in _norm(source_text)


def parse_verdict(text: str) -> dict:
    m = re.search(r"\{.*\}", text or "", re.DOTALL)
    if not m:
        return {"verdict": "ERROR", "reason": "No JSON in checker reply", "evidence_span": ""}
    try:
        d = json.loads(m.group(0))
    except json.JSONDecodeError:
        return {"verdict": "ERROR", "reason": "Checker reply was not valid JSON", "evidence_span": ""}
    v = str(d.get("verdict", "")).strip().upper()
    return {"verdict": v if v in VERDICTS else "ERROR", "reason": str(d.get("reason", "")).strip(),
            "evidence_span": str(d.get("evidence_span", "")).strip()}


_nvidia = None


def _nemotron(statement: str, source: dict) -> dict:
    global _nvidia
    from openai import OpenAI
    if _nvidia is None:
        _nvidia = OpenAI(base_url=NVIDIA_BASE_URL, api_key=os.environ["NVIDIA_API_KEY"])
    payload = json.dumps({"statement": statement, "source_id": source["source_id"], "source_text": source["text"]},
                         ensure_ascii=False)
    err = None
    for _ in range(3):
        try:
            r = _nvidia.chat.completions.create(
                model=NEMOTRON_MODEL, temperature=0.0, max_tokens=400,
                messages=[{"role": "system", "content": CHECK_SYSTEM}, {"role": "user", "content": payload}],
                extra_body={"chat_template_kwargs": {"enable_thinking": False}})
            return parse_verdict(r.choices[0].message.content)
        except Exception as exc:
            err = exc
    return {"verdict": "ERROR", "reason": f"Checker API error: {err}", "evidence_span": ""}


def _mock_nemotron(statement: str, source: dict) -> dict:
    words = [w for w in re.findall(r"[a-z]+", statement.lower()) if len(w) > 3]
    src = _norm(source["text"])
    if not words:
        return {"verdict": "PARTIAL", "reason": "Too short to check (mock).", "evidence_span": ""}
    share = sum(w in src for w in words) / len(words)
    sentences = re.split(r"(?<=[.!?])\s+", source["text"])
    best = max(sentences, key=lambda s: sum(w in s.lower() for w in words))
    if share >= 0.85 and not re.search(r"\b(always|never|only)\b", statement.lower()):
        return {"verdict": "SUPPORTED", "reason": "Matches the source (mock check).", "evidence_span": best}
    if share >= 0.6:
        return {"verdict": "PARTIAL", "reason": "Partly matches the source (mock check).", "evidence_span": best}
    return {"verdict": "UNSUPPORTED", "reason": "Not found in the source (mock check).", "evidence_span": ""}


def check_claim(statement: str, source: dict) -> dict:
    r = _mock_nemotron(statement, source) if mock_mode() else _nemotron(statement, source)
    r["claim"] = statement
    r["evidence_exact"] = evidence_is_exact(r["evidence_span"], source["text"])
    return r


def block_problems(block: dict, source_ids: set) -> list[str]:
    """Rule-based checks that need no AI: contract rules plus missing claims."""
    from .validate_module import validate_block
    errs: list[str] = []
    validate_block(contract_block(block, 0, None), "block", errs)
    probs = [e.replace("block: ", "") for e in errs]
    if block.get("sourceId") not in source_ids:
        probs.append("Cites a source that is not in the source list.")
    if not block.get("claims"):
        probs.append("No claims listed, so nothing was checked. Add the facts this block states.")
    return probs


def check_blocks(blocks: list[dict], sources: list[dict], only_keys: set | None = None,
                 progress=None, workers: int = 4) -> list[dict]:
    srcs = {s["source_id"]: s for s in clean_sources(sources)}
    blocks = copy.deepcopy(blocks)
    jobs = []
    for i, b in enumerate(blocks):
        if (only_keys and b["contentKey"] not in only_keys) or b["review"]["status"] == "removed":
            continue
        b["check"] = {"status": "checking", "verdict": None, "results": [None] * len(b["claims"]), "problems": []}
        src = srcs.get(b["sourceId"])
        if src:
            jobs += [(i, c, claim, src) for c, claim in enumerate(b["claims"])]
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = {pool.submit(check_claim, claim, src): (i, c) for i, c, claim, src in jobs}
        for f in as_completed(futs):
            i, c = futs[f]
            blocks[i]["check"]["results"][c] = f.result()
            done += 1
            if progress:
                progress(done, len(jobs))
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    for b in blocks:
        if b["check"]["status"] != "checking":
            continue
        results = [r for r in b["check"]["results"] if r]
        probs = block_problems(b, set(srcs))
        verdict = "ERROR" if probs or not results else max((r["verdict"] for r in results), key=lambda v: SEVERITY.get(v, 3))
        b["check"] = {"status": "checked", "verdict": verdict, "results": results, "problems": probs, "checked_at": now}
        b["review"]["edited_after_check"] = False
        if b["review"]["status"] == "approved" and verdict != "SUPPORTED":
            b["review"]["status"] = "pending"
    return blocks


# --------------------------------------------------------------------------
# Review rules
# --------------------------------------------------------------------------
def can_approve(block: dict, note: str) -> tuple[bool, str]:
    if block["check"]["status"] != "checked" or block["review"]["edited_after_check"]:
        return False, "Check this block with Nemotron first (it is new or was edited)."
    if block["check"]["verdict"] == "SUPPORTED":
        return True, ""
    if block["check"].get("problems"):
        return False, "Fix the problems listed for this block, then re-check."
    if not note.strip():
        return False, "This block was flagged. Fix it and re-check, or write a note explaining why it is safe to approve."
    return True, ""


def review_counts(blocks: list[dict]) -> dict:
    c = {"total": 0, "approved": 0, "pending": 0, "removed": 0, "flagged": 0, "unchecked": 0}
    for b in blocks:
        c["total"] += 1
        c[b["review"]["status"]] += 1
        if b["review"]["status"] != "removed":
            if b["check"]["status"] != "checked" or b["review"]["edited_after_check"]:
                c["unchecked"] += 1
            elif b["check"]["verdict"] != "SUPPORTED":
                c["flagged"] += 1
    return c


# --------------------------------------------------------------------------
# Export in the contract format
# --------------------------------------------------------------------------
def contract_block(block: dict, position: int, approver: str | None) -> dict:
    out = {"position": position, "kind": block["kind"], "title": block["title"]}
    if block["kind"] == "theory":
        out["body"] = block["body"]
    else:
        out["activity"] = copy.deepcopy(block["activity"])
    out.update(contentKey=block["contentKey"], sourceId=block["sourceId"], reviewedBy=approver)
    return out


def export_lesson(meta: dict, blocks: list[dict], sources: list[dict], approver: str,
                  content_version: str) -> tuple[dict, dict]:
    if not approver.strip():
        raise ValueError("Enter the approver's name.")
    c = review_counts(blocks)
    if c["pending"]:
        raise ValueError(f"{c['pending']} block(s) still pending. Approve or remove every block first.")
    approved = [b for b in blocks if b["review"]["status"] == "approved"]
    if not approved:
        raise ValueError("No approved blocks to export.")
    lesson = {"title": meta["title"], "position": int(meta.get("position", 0)), "contentKey": meta["lesson_key"],
              "objective": meta["objective"], "minutes": int(meta.get("minutes", 5)),
              "blocks": [contract_block(b, i, approver.strip()) for i, b in enumerate(approved)]}
    used = {b["sourceId"] for b in approved}
    audit = {
        "lessonKey": meta["lesson_key"], "contentVersion": content_version,
        "exportedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "approvedBy": approver.strip(), "mode": "mock" if mock_mode() else "live",
        "models": {"drafting": "mock" if mock_mode() else GEMINI_MODEL,
                   "checking": "mock" if mock_mode() else NEMOTRON_MODEL, "geminiRoute": gemini_backend()},
        "sources": module_sources(sources, used),
        "blocks": [{"contentKey": b["contentKey"], "style": b["style"], "decision": b["review"]["status"],
                    "finalVerdict": b["check"].get("verdict"),
                    "overrideNote": b["review"]["note"] if b["check"].get("verdict") != "SUPPORTED" else "",
                    "claims": [{k: r.get(k) for k in ("claim", "verdict", "reason", "evidence_span")}
                               for r in b["check"].get("results", [])]} for b in blocks],
    }
    return lesson, audit


LESSON_CORE = ("title", "position", "blocks")
BLOCK_CORE = ("position", "kind", "title", "body", "url", "activity")


def strict_lesson(lesson: dict) -> dict:
    """The lesson with only contract v1.0 core fields (no proposed extension fields).
    Traceability (contentKey, sourceId, reviewer) stays in the audit record."""
    out = {k: copy.deepcopy(lesson[k]) for k in LESSON_CORE if k in lesson}
    out["blocks"] = [{k: copy.deepcopy(b[k]) for k in BLOCK_CORE if k in b} for b in lesson["blocks"]]
    return out


def module_sources(sources: list[dict], used: set) -> list[dict]:
    return [{"sourceId": s["source_id"], "title": s["title"], "publisher": s["publisher"], "url": s["url"],
             "reuse": s["reuse"]} for s in clean_sources(sources) if s["source_id"] in used]


def new_module(title: str, subject: str, key: str) -> dict:
    return {"title": title, "subject": subject, "status": "draft", "version": 1, "language": "en",
            "contentKey": key, "sources": [], "lessons": []}


def merge_into_module(module: dict, lesson: dict, sources: list[dict]) -> dict:
    """Add or replace `lesson` (matched by contentKey), renumber positions, add missing sources.
    The module stays a draft: publishing happens in the app/backend (contract F-05)."""
    module = copy.deepcopy(module)
    lessons = [l for l in module.get("lessons", []) if l.get("contentKey") != lesson["contentKey"]]
    lessons.append(copy.deepcopy(lesson))
    lessons.sort(key=lambda l: (l.get("position", 0), l.get("contentKey", "")))
    for i, l in enumerate(lessons):
        l["position"] = i
    module["lessons"] = lessons
    have = {s["sourceId"] for s in module.get("sources", [])}
    used = {b.get("sourceId") for b in lesson["blocks"]}
    module.setdefault("sources", []).extend(s for s in module_sources(sources, used) if s["sourceId"] not in have)
    module["version"] = int(module.get("version", 1)) + 1
    module["status"] = "draft"
    return module


def validate(module: dict) -> list[str]:
    from .validate_module import validate_module
    errors, _ = validate_module(module)
    return errors
