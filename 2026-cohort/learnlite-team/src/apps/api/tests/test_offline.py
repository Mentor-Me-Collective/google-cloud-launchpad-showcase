"""Offline study: download a module with its solutions, play without internet, sync later."""
from test_learner import ME, RIGHT, WRONG, make_module
from test_phase4_classroom_access import setup_api  # noqa: F401

SYNC = f"{ME}/offline/sync"


def download(client, mid):
    r = client.get(f"{ME}/modules/{mid}/download")
    assert r.status_code == 200, r.text
    return r.json()


def run(mid, lid, answers, run_id="run-1"):
    return {"runs": [{"clientRunId": run_id, "moduleId": mid, "lessonId": lid, "answers": answers}]}


def public(client, mid):
    assert client.patch(f"/api/v1/teacher/modules/{mid}", json={"visibility": "public"}).status_code == 200


def test_download_carries_solutions_but_the_normal_module_does_not(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, lid, ids = make_module(client)
    public(client, mid)
    switch("student-1", "student")

    plain = client.get(f"{ME}/modules/{mid}").json()
    assert "correctIndex" not in str(plain)
    full = download(client, mid)
    activity = full["lessons"][0]["blocks"][1]["activity"]
    assert activity["correctIndex"] == 1
    assert full["downloadedAt"] and full["version"] >= 1
    assert [b["id"] for b in full["lessons"][0]["blocks"]] == ids


def test_download_follows_the_same_access_rules(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, _, _ = make_module(client)  # published but private, never assigned
    switch("student-1", "student")
    assert client.get(f"{ME}/modules/{mid}/download").status_code == 404
    switch("teacher-1", "teacher")
    assert client.get(f"{ME}/modules/{mid}/download").status_code == 403  # students only


def test_an_offline_lesson_is_graded_again_and_completed(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, lid, ids = make_module(client)
    public(client, mid)
    switch("student-1", "student")

    body = run(mid, lid, [{"blockId": ids[1], "answer": RIGHT, "wrongAttempts": 2}])
    first = client.post(SYNC, json=body)
    assert first.status_code == 200, first.text
    item = first.json()["items"][0]
    assert (item["status"], item["completed"], item["earnedXp"]) == ("synced", True, 10)
    assert item["score"] == {"correct": 0, "total": 1}  # two wrong tries first: not a first-try hit
    stats = first.json()["gamification"]
    assert stats["xp"] == 10 and stats["totalAnswers"] == 3 and stats["streak"] == 1

    assert client.get(f"{ME}/modules/{mid}/progress").json()["completedLessons"] == 1
    assert client.get(f"{ME}/modules/{mid}").json()["activityResults"][ids[1]]["xp"] == 10

    again = client.post(SYNC, json=body).json()  # the same run sent twice (a retry): nothing changes
    assert again["items"][0] == item and again["gamification"]["xp"] == 10


def test_the_server_never_trusts_the_phones_verdict(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, lid, ids = make_module(client)
    public(client, mid)
    switch("student-1", "student")

    cheat = client.post(SYNC, json=run(mid, lid, [{"blockId": ids[1], "answer": WRONG}])).json()
    item = cheat["items"][0]
    assert (item["completed"], item["earnedXp"], item["rejectedBlocks"]) == (False, 0, [ids[1]])
    assert cheat["gamification"]["xp"] == 0
    assert client.get(f"{ME}/modules/{mid}/progress").json()["completedLessons"] == 0

    missing = client.post(SYNC, json=run(mid, lid, [], run_id="run-2")).json()["items"][0]
    assert missing["completed"] is False  # an activity was never answered

    junk = client.post(SYNC, json=run(mid, lid, [
        {"blockId": ids[0], "answer": RIGHT},          # theory: not an activity
        {"blockId": "nope", "answer": RIGHT},          # not in the lesson
        {"blockId": ids[1], "answer": {"selectedIndex": 99}},  # impossible answer
    ], run_id="run-3")).json()["items"][0]
    assert junk["earnedXp"] == 0 and len(junk["rejectedBlocks"]) == 3


def test_xp_is_paid_once_even_across_online_and_offline_play(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, lid, ids = make_module(client)
    public(client, mid)
    switch("student-1", "student")
    first = client.post(SYNC, json=run(mid, lid, [{"blockId": ids[1], "answer": RIGHT}], "a")).json()
    second = client.post(SYNC, json=run(mid, lid, [{"blockId": ids[1], "answer": RIGHT}], "b")).json()
    assert first["items"][0]["earnedXp"] == 10 and second["items"][0]["earnedXp"] == 0
    assert second["gamification"]["xp"] == 10


def test_runs_for_modules_no_longer_available_are_refused_not_failed(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, lid, ids = make_module(client)
    public(client, mid)
    switch("student-1", "student")
    # The phone synced late; meanwhile the teacher stopped sharing the module.
    switch("teacher-1", "teacher")
    client.patch(f"/api/v1/teacher/modules/{mid}", json={"visibility": "private"})
    switch("student-1", "student")
    item = client.post(SYNC, json=run(mid, lid, [{"blockId": ids[1], "answer": RIGHT}])).json()["items"][0]
    assert (item["status"], item["reason"], item["earnedXp"]) == ("rejected", "MODULE_UNAVAILABLE", 0)


def test_offline_sync_validation_and_roles(setup_api):  # noqa: F811
    client, db, switch = setup_api
    switch("student-1", "student")
    assert client.post(SYNC, json={"runs": []}).status_code == 422
    assert client.post(SYNC, json={"runs": [{"clientRunId": "x", "moduleId": "m", "lessonId": "l",
                                             "answers": [], "extra": 1}]}).status_code == 422
    switch("teacher-1", "teacher")
    assert client.post(SYNC, json=run("m", "l", [])).status_code == 403
