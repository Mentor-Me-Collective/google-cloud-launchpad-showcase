"""Teacher authoring: modules, lessons and blocks (contract F-03 to F-14)."""
import json
from pathlib import Path

import pytest

from test_phase4_classroom_access import setup_api  # noqa: F401

BASE = "/api/v1/teacher/modules"

ACTIVITIES = {
    "multiple-choice": {
        "type": "multiple-choice", "prompt": "2 + 2?", "options": ["3", "4"],
        "correctIndex": 1, "explanation": "Four.", "xp": 10,
    },
    "true-false": {
        "type": "true-false", "prompt": "The sun is a star.", "correctBool": True, "xp": 5,
    },
    "match-pairs": {
        "type": "match-pairs", "prompt": "Match.", "xp": 10,
        "pairs": [{"left": "cat", "right": "gato"}, {"left": "dog", "right": "perro"}],
    },
    "order-steps": {
        "type": "order-steps", "prompt": "Order.", "steps": ["first", "second", "third"], "xp": 10,
    },
    "fill-blanks": {
        "type": "fill-blanks", "prompt": "The ___ is blue.", "answers": ["sky", "Sky"], "xp": 10,
    },
    "classify": {
        "type": "classify", "prompt": "Classify.", "xp": 15,
        "categories": [{"name": "Fruit", "items": ["apple"]}, {"name": "Veg", "items": ["carrot"]}],
    },
}


def theory(title="Intro"):
    return {"kind": "theory", "title": title, "body": "Some text."}


def activity(kind="multiple-choice", title="Quiz"):
    return {"kind": "activity", "title": title, "activity": ACTIVITIES[kind]}


def new_module(client, title="Cells"):
    r = client.post(BASE, json={"title": title, "subject": "Biology", "description": ""})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def new_lesson(client, mid, title="Lesson 1", **extra):
    r = client.post(f"{BASE}/{mid}/lessons", json={"title": title, **extra})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def add_block(client, mid, lid, block, expect=201):
    r = client.post(f"{BASE}/{mid}/lessons/{lid}/blocks", json=block)
    assert r.status_code == expect, r.text
    return r.json()


def titles(client, mid, lid):
    tree = client.get(f"{BASE}/{mid}").json()
    lesson = next(item for item in tree["lessons"] if item["id"] == lid)
    return [b["title"] for b in lesson["blocks"]]


def test_all_six_activity_types_are_accepted(setup_api):  # noqa: F811
    client, _, _ = setup_api
    mid = new_module(client)
    lid = new_lesson(client, mid)
    for kind in ACTIVITIES:
        add_block(client, mid, lid, activity(kind, title=kind))
    assert titles(client, mid, lid) == list(ACTIVITIES)


@pytest.mark.parametrize("kind,patch", [
    ("multiple-choice", {"correctIndex": 5}),
    ("multiple-choice", {"options": ["only one"]}),
    ("true-false", {"correctBool": None}),
    ("match-pairs", {"pairs": [{"left": "a", "right": "b"}]}),
    ("order-steps", {"steps": ["one"]}),
    ("fill-blanks", {"answers": []}),
    ("classify", {"categories": [{"name": "A", "items": ["x"]}]}),
    ("classify", {"categories": [{"name": "A", "items": ["x"]}, {"name": "B", "items": ["x"]}]}),
])
def test_invalid_activities_are_rejected(setup_api, kind, patch):  # noqa: F811
    client, _, _ = setup_api
    mid = new_module(client)
    lid = new_lesson(client, mid)
    bad = {**ACTIVITIES[kind], **patch}
    bad = {k: v for k, v in bad.items() if v is not None}
    add_block(client, mid, lid, {"kind": "activity", "title": "Bad", "activity": bad}, expect=422)


def test_block_kind_rules(setup_api):  # noqa: F811
    client, _, _ = setup_api
    mid = new_module(client)
    lid = new_lesson(client, mid)
    add_block(client, mid, lid, {"kind": "activity", "title": "No activity"}, expect=422)
    add_block(client, mid, lid, {**theory(), "activity": ACTIVITIES["true-false"]}, expect=422)
    add_block(client, mid, lid, {"kind": "link", "title": "Link"}, expect=422)
    add_block(client, mid, lid, {"kind": "link", "title": "Bad", "url": "javascript:alert(1)"}, expect=422)
    add_block(client, mid, lid, {"kind": "link", "title": "OK", "url": "https://example.com"})


def test_blocks_keep_order_and_insert_in_the_middle(setup_api):  # noqa: F811
    client, _, _ = setup_api
    mid = new_module(client)
    lid = new_lesson(client, mid)
    for name in ("A", "B", "C"):
        add_block(client, mid, lid, theory(name))
    inserted = add_block(client, mid, lid, {**theory("X"), "position": 1})
    assert inserted["position"] == 1
    assert titles(client, mid, lid) == ["A", "X", "B", "C"]
    tree = client.get(f"{BASE}/{mid}").json()
    assert [b["position"] for b in tree["lessons"][0]["blocks"]] == [0, 1, 2, 3]


def test_patch_block_validates_the_whole_block(setup_api):  # noqa: F811
    client, _, _ = setup_api
    mid = new_module(client)
    lid = new_lesson(client, mid)
    block = add_block(client, mid, lid, activity("multiple-choice"))
    url = f"{BASE}/{mid}/lessons/{lid}/blocks/{block['id']}"

    ok = client.patch(url, json={"title": "Renamed"})
    assert ok.status_code == 200, ok.text
    assert ok.json()["title"] == "Renamed"
    assert ok.json()["activity"]["correctIndex"] == 1  # untouched

    bad = client.patch(url, json={"activity": {**ACTIVITIES["multiple-choice"], "correctIndex": 9}})
    assert bad.status_code == 422
    assert client.get(f"{BASE}/{mid}").json()["lessons"][0]["blocks"][0]["title"] == "Renamed"


def test_delete_block_compacts_positions(setup_api):  # noqa: F811
    client, _, _ = setup_api
    mid = new_module(client)
    lid = new_lesson(client, mid)
    ids = [add_block(client, mid, lid, theory(n))["id"] for n in ("A", "B", "C")]
    assert client.delete(f"{BASE}/{mid}/lessons/{lid}/blocks/{ids[1]}").status_code == 204
    assert titles(client, mid, lid) == ["A", "C"]
    blocks = client.get(f"{BASE}/{mid}").json()["lessons"][0]["blocks"]
    assert [b["position"] for b in blocks] == [0, 1]
    assert client.delete(f"{BASE}/{mid}/lessons/{lid}/blocks/{ids[1]}").status_code == 404


def test_reorder_blocks_and_lessons(setup_api):  # noqa: F811
    client, _, _ = setup_api
    mid = new_module(client)
    lid = new_lesson(client, mid, "L1")
    lid2 = new_lesson(client, mid, "L2")
    ids = [add_block(client, mid, lid, theory(n))["id"] for n in ("A", "B", "C")]

    ok = client.post(f"{BASE}/{mid}/lessons/{lid}/blocks/reorder", json={"blockIds": [ids[2], ids[0], ids[1]]})
    assert ok.status_code == 200, ok.text
    assert titles(client, mid, lid) == ["C", "A", "B"]
    missing = client.post(f"{BASE}/{mid}/lessons/{lid}/blocks/reorder", json={"blockIds": ids[:2]})
    assert missing.status_code == 422

    swapped = client.post(f"{BASE}/{mid}/lessons/reorder", json={"lessonIds": [lid2, lid]})
    assert swapped.status_code == 200, swapped.text
    lessons = client.get(f"{BASE}/{mid}").json()["lessons"]
    assert [l["title"] for l in lessons] == ["L2", "L1"]
    assert client.post(f"{BASE}/{mid}/lessons/reorder", json={"lessonIds": [lid]}).status_code == 422


def test_lesson_defaults_update_and_delete(setup_api):  # noqa: F811
    client, db, _ = setup_api
    mid = new_module(client)
    first = new_lesson(client, mid, "L1")
    second = new_lesson(client, mid, "L2")
    third = new_lesson(client, mid, "L3")
    assert [l["position"] for l in client.get(f"{BASE}/{mid}").json()["lessons"]] == [0, 1, 2]

    patched = client.patch(f"{BASE}/{mid}/lessons/{second}", json={"title": "Second", "minutes": 7})
    assert patched.status_code == 200, patched.text
    assert patched.json()["minutes"] == 7

    add_block(client, mid, first, theory())
    assert client.delete(f"{BASE}/{mid}/lessons/{first}").status_code == 204
    assert not [p for p in db.records if "blocks" in p]  # blocks went away with the lesson
    lessons = client.get(f"{BASE}/{mid}").json()["lessons"]
    assert [(l["title"], l["position"]) for l in lessons] == [("Second", 0), ("L3", 1)]
    assert third in [l["id"] for l in lessons]


def test_patch_and_unpublish_module(setup_api):  # noqa: F811
    client, _, _ = setup_api
    mid = new_module(client)
    lid = new_lesson(client, mid)
    add_block(client, mid, lid, theory())
    assert client.patch(f"{BASE}/{mid}", json={"title": "Renamed", "subject": "Chemistry"}).json()["title"] == "Renamed"
    assert client.patch(f"{BASE}/{mid}", json={"title": "  "}).status_code == 422

    first = client.post(f"{BASE}/{mid}/publish")
    assert first.status_code == 200 and first.json()["version"] == 1
    assert client.post(f"{BASE}/{mid}/unpublish").json()["status"] == "draft"
    assert client.post(f"{BASE}/{mid}/publish").json()["version"] == 2


def test_cannot_publish_empty_module_or_empty_lesson(setup_api):  # noqa: F811
    client, _, _ = setup_api
    mid = new_module(client)
    assert client.post(f"{BASE}/{mid}/publish").status_code == 422
    lid = new_lesson(client, mid, "Empty lesson")
    assert client.post(f"{BASE}/{mid}/publish").status_code == 422
    add_block(client, mid, lid, theory())
    assert client.post(f"{BASE}/{mid}/publish").status_code == 200


def test_other_teacher_and_students_have_no_access(setup_api):  # noqa: F811
    client, _, switch = setup_api
    mid = new_module(client)
    lid = new_lesson(client, mid)
    block = add_block(client, mid, lid, theory())
    urls = [
        ("get", f"{BASE}/{mid}", None),
        ("patch", f"{BASE}/{mid}", {"title": "Hacked"}),
        ("post", f"{BASE}/{mid}/unpublish", None),
        ("patch", f"{BASE}/{mid}/lessons/{lid}", {"title": "Hacked"}),
        ("post", f"{BASE}/{mid}/lessons/{lid}/blocks", theory()),
        ("patch", f"{BASE}/{mid}/lessons/{lid}/blocks/{block['id']}", {"title": "Hacked"}),
        ("delete", f"{BASE}/{mid}/lessons/{lid}/blocks/{block['id']}", None),
        ("delete", f"{BASE}/{mid}/lessons/{lid}", None),
    ]

    def call(method, url, body):
        kwargs = {"json": body} if body is not None else {}
        return getattr(client, method)(url, **kwargs)

    switch("teacher-2", "teacher")
    for method, url, body in urls:
        assert call(method, url, body).status_code == 404, (method, url)

    switch("student-1", "student")
    for method, url, body in urls:
        assert call(method, url, body).status_code == 403, (method, url)
    assert client.post(f"{BASE}/import", json={"title": "T", "subject": "S", "lessons": []}).status_code == 403

    switch("teacher-1", "teacher")
    assert client.get(f"{BASE}/{mid}").json()["lessons"][0]["blocks"][0]["title"] == "Intro"


def test_import_whole_module_with_extension_fields(setup_api):  # noqa: F811
    client, _, _ = setup_api
    payload = {
        "title": "Imported", "subject": "AI", "status": "published", "version": 9,
        "language": "en", "contentKey": "m1", "sources": [{"sourceId": "S1", "title": "Doc"}],
        "lessons": [
            {"title": "L2", "position": 1, "objective": "Learn", "minutes": 5,
             "settings": {"show_feedback": False, "counts_as": "post_test"},
             "blocks": [{**theory("B"), "contentKey": "m1.l2.b", "sourceId": "S1", "reviewedBy": None,
                         "illustrative": True}]},
            {"title": "L1", "position": 0, "blocks": [
                {**activity("classify", "Second"), "position": 1},
                {**theory("First"), "position": 0},
            ]},
        ],
    }
    r = client.post(f"{BASE}/import", json=payload)
    assert r.status_code == 201, r.text
    tree = r.json()
    assert tree["status"] == "draft" and tree["authorId"] == "teacher-1"
    assert [l["title"] for l in tree["lessons"]] == ["L1", "L2"]
    assert [b["title"] for b in tree["lessons"][0]["blocks"]] == ["First", "Second"]
    assert tree["lessons"][1]["blocks"][0]["sourceId"] == "S1"
    assert tree["lessons"][1]["settings"]["counts_as"] == "post_test"


def test_import_with_an_invalid_block_writes_nothing(setup_api):  # noqa: F811
    client, db, _ = setup_api
    bad = {"title": "T", "subject": "S", "lessons": [
        {"title": "L", "blocks": [theory(), {"kind": "activity", "title": "x"}]}]}
    assert client.post(f"{BASE}/import", json=bad).status_code == 422
    assert not [p for p in db.records if p[0] == "modules"]


MODULE1 = Path(__file__).resolve().parents[3] / "content" / "module1_module.json"


@pytest.mark.skipif(not MODULE1.exists(), reason="content/module1_module.json is not in this branch")
def test_module1_round_trip(setup_api):  # noqa: F811
    client, _, _ = setup_api
    source = json.loads(MODULE1.read_text())
    r = client.post(f"{BASE}/import", json=source)
    assert r.status_code == 201, r.text
    tree = client.get(f"{BASE}/{r.json()['id']}").json()
    assert len(tree["lessons"]) == 7
    assert sum(len(l["blocks"]) for l in tree["lessons"]) == 60
    for original, stored in zip(source["lessons"], tree["lessons"]):
        assert [b["title"] for b in original["blocks"]] == [b["title"] for b in stored["blocks"]]
        assert [b.get("activity", {}).get("type") for b in original["blocks"]] == \
               [b.get("activity", {}).get("type") for b in stored["blocks"]]
    assert client.post(f"{BASE}/{tree['id']}/publish").status_code == 200


def test_import_has_a_size_limit(setup_api):  # noqa: F811
    client, db, _ = setup_api
    lessons = [{"title": f"L{i}", "blocks": [theory() for _ in range(101)]} for i in range(7)]
    r = client.post(f"{BASE}/import", json={"title": "Huge", "subject": "S", "lessons": lessons})
    assert r.status_code == 422
    assert not [p for p in db.records if p[0] == "modules"]
