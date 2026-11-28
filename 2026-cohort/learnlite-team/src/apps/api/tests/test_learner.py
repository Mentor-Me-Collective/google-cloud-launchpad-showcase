"""Assignments, the student's view and the learning flow (H-*, G-*, I-*, C-02)."""
from datetime import datetime, timedelta, timezone

import pytest

from app.content_models import AnswerError, grade_answer
from test_authoring import ACTIVITIES
from test_phase4_classroom_access import setup_api  # noqa: F401

T = "/api/v1/teacher"
ME = "/api/v1/me"


def day(offset=0):
    return (datetime.now(timezone.utc).date() + timedelta(days=offset)).isoformat()


def enroll(db, uid, cid="grade-7a"):
    db.records[("classrooms", cid, "members", uid)] = {"studentId": uid, "status": "active", "joinedAt": "x"}
    db.records[("users", uid, "classrooms", cid)] = {"classroomId": cid, "status": "active"}


def make_module(client, activities=("multiple-choice",), publish=True):
    """Lesson: theory, <activities...>, closing theory."""
    mid = client.post(f"{T}/modules", json={"title": "Cells", "subject": "Biology"}).json()["id"]
    lid = client.post(f"{T}/modules/{mid}/lessons", json={"title": "Lesson 1"}).json()["id"]
    blocks = [{"kind": "theory", "title": "Intro", "body": "Read me"}]
    blocks += [{"kind": "activity", "title": kind, "activity": ACTIVITIES[kind]} for kind in activities]
    blocks += [{"kind": "theory", "title": "Key idea", "body": "Remember"}]
    ids = []
    for block in blocks:
        r = client.post(f"{T}/modules/{mid}/lessons/{lid}/blocks", json=block)
        assert r.status_code == 201, r.text
        ids.append(r.json()["id"])
    if publish:
        assert client.post(f"{T}/modules/{mid}/publish").status_code == 200
    return mid, lid, ids


def assign(client, mid, classrooms=("grade-7a",), students=(), expect=201):
    r = client.post(f"{T}/assignments", json={"moduleId": mid, "classroomIds": list(classrooms),
                                                "studentIds": list(students), "message": "Go!", "notify": True})
    assert r.status_code == expect, r.text
    return r.json()


def start(client, mid, lid, **body):
    r = client.post(f"{ME}/modules/{mid}/lessons/{lid}/attempts", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def answer(client, attempt, bid, payload, expect=200, **extra):
    r = client.post(f"{ME}/attempts/{attempt}/blocks/{bid}/answer", json={"answer": payload, **extra})
    assert r.status_code == expect, r.text
    return r.json()


RIGHT, WRONG = {"selectedIndex": 1}, {"selectedIndex": 0}


# ---------------------------------------------------------------- assignments
def test_assign_rules(setup_api):  # noqa: F811
    client, db, switch = setup_api
    draft, _, _ = make_module(client, publish=False)
    assign(client, draft, expect=409)
    mid, _, _ = make_module(client)
    assign(client, "nope", expect=404)
    assign(client, mid, classrooms=["grade-9"], expect=404)
    db.records[("classrooms", "grade-9")] = {"id": "grade-9", "ownerId": "teacher-2", "status": "active"}
    assign(client, mid, classrooms=["grade-9"], expect=404)  # someone else's classroom
    enroll(db, "student-1")
    assign(client, mid, students=["student-77"], expect=422)  # not a member

    switch("teacher-2", "teacher")
    assign(client, mid, classrooms=["grade-9"], expect=404)  # someone else's module
    switch("student-1", "student")
    assign(client, mid, expect=403)


def test_assign_to_two_classrooms_and_to_selected_students(setup_api):  # noqa: F811
    client, db, _ = setup_api
    mid, _, _ = make_module(client)
    enroll(db, "student-1", "grade-7a")
    enroll(db, "student-2", "grade-7b")

    both = assign(client, mid, classrooms=("grade-7a", "grade-7b"))
    assert [a["classroomId"] for a in both["items"]] == ["grade-7a", "grade-7b"]
    assert all(a["studentIds"] == [] and a["authorId"] == "teacher-1" and a["title"] == "Cells" for a in both["items"])

    picked = assign(client, mid, classrooms=("grade-7a", "grade-7b"), students=["student-2"])
    assert [a["classroomId"] for a in picked["items"]] == ["grade-7b"]
    assert picked["skippedClassroomIds"] == ["grade-7a"]


def test_teacher_assignment_list_update_and_cancel(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, _, _ = make_module(client)
    enroll(db, "student-1")
    aid = assign(client, mid)["items"][0]["id"]

    listed = client.get(f"{T}/assignments").json()["items"]
    assert len(listed) == 1 and listed[0]["studentCount"] == 1 and listed[0]["moduleTitle"] == "Cells"
    assert client.get(f"{T}/assignments?classroomId=grade-7b").json()["items"] == []
    assert client.get(f"{T}/assignments?moduleId={mid}").json()["items"][0]["id"] == aid

    patched = client.patch(f"{T}/assignments/{aid}", json={"message": "New text", "dueAt": "2030-01-01T10:00:00Z"})
    assert patched.status_code == 200 and patched.json()["message"] == "New text"
    assert patched.json()["dueAt"].startswith("2030-01-01")

    switch("teacher-2", "teacher")
    assert client.get(f"{T}/assignments/{aid}").status_code == 404
    assert client.delete(f"{T}/assignments/{aid}").status_code == 404

    switch("student-1", "student")
    assert len(client.get(f"{ME}/assignments").json()["items"]) == 1
    switch("teacher-1", "teacher")
    assert client.delete(f"{T}/assignments/{aid}").status_code == 204
    assert client.get(f"{T}/assignments").json()["items"] == []  # a removed assignment leaves the list
    assert [a["id"] for a in client.get(f"{T}/assignments?status=cancelled").json()["items"]] == [aid]
    assert client.patch(f"{T}/assignments/{aid}", json={"message": "x"}).status_code == 409
    switch("student-1", "student")
    assert client.get(f"{ME}/assignments").json()["items"] == []
    assert client.get(f"{ME}/modules").json()["items"] == []


# ------------------------------------------------------------ student's view
def test_student_sees_assigned_module_without_solutions(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, lid, _ = make_module(client, activities=("multiple-choice", "true-false", "classify"))
    enroll(db, "student-1")
    assign(client, mid)
    switch("student-1", "student")

    assigned = client.get(f"{ME}/assignments").json()["items"][0]
    assert assigned["moduleId"] == mid and assigned["module"]["lessonCount"] == 1
    assert "authorId" not in assigned and "studentIds" not in assigned

    modules = client.get(f"{ME}/modules").json()["items"]
    assert [m["id"] for m in modules] == [mid] and modules[0]["completedLessons"] == 0

    detail = client.get(f"{ME}/modules/{mid}")
    assert detail.status_code == 200, detail.text
    lesson = detail.json()["lessons"][0]
    assert lesson["progress"]["status"] == "not_started"
    assert [b["position"] for b in lesson["blocks"]] == [0, 1, 2, 3, 4]
    text = str(detail.json())
    for secret in ("correctIndex", "correctBool", "Four."):
        assert secret not in text, secret
    assert lesson["blocks"][1]["activity"]["options"] == ["3", "4"]

    switch("teacher-1", "teacher")  # the author still sees solutions
    assert "correctIndex" in str(client.get(f"{T}/modules/{mid}").json())


def test_students_without_access_get_404(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, lid, _ = make_module(client)
    enroll(db, "student-1")
    enroll(db, "student-2")
    assign(client, mid, students=["student-1"])

    switch("student-2", "student")  # in the class, but not targeted
    assert client.get(f"{ME}/modules/{mid}").status_code == 404
    assert client.get(f"{ME}/modules").json()["items"] == []
    assert client.post(f"{ME}/modules/{mid}/lessons/{lid}/attempts", json={}).status_code == 404

    switch("student-outsider", "student")  # not in any class
    assert client.get(f"{ME}/modules/{mid}").status_code == 404

    switch("teacher-1", "teacher")
    assert client.get(f"{ME}/modules").status_code == 403
    assert client.get(f"{ME}/gamification").status_code == 403

    client.post(f"{T}/modules/{mid}/unpublish")  # draft modules disappear
    switch("student-1", "student")
    assert client.get(f"{ME}/modules/{mid}").status_code == 404


# ------------------------------------------------------------- learning flow
def setup_lesson(setup_api, activities=("multiple-choice",)):  # noqa: F811
    client, db, switch = setup_api
    mid, lid, ids = make_module(client, activities)
    enroll(db, "student-1")
    assign(client, mid)
    switch("student-1", "student")
    return client, db, switch, mid, lid, ids


def test_full_lesson_flow_with_xp_hearts_and_streak(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api)
    attempt = start(client, mid, lid)
    aid = attempt["attemptId"]
    assert attempt["totalBlocks"] == 3 and attempt["currentPosition"] == 0
    assert attempt["hearts"] == {"current": 5, "max": 5}
    assert "correctIndex" not in str(attempt)

    assert client.post(f"{ME}/attempts/{aid}/complete").status_code == 409  # too early
    assert client.post(f"{ME}/attempts/{aid}/continue").json()["currentPosition"] == 1
    assert client.post(f"{ME}/attempts/{aid}/continue").status_code == 409  # activity pending

    wrong = answer(client, aid, ids[1], WRONG)
    assert wrong["correct"] is False and wrong["canContinue"] is False and wrong["earnedXp"] == 0
    assert wrong["hearts"]["current"] == 4 and wrong["nextPosition"] == 1
    assert wrong["explanation"] == "Four."

    right = answer(client, aid, ids[1], RIGHT)
    assert right["correct"] and right["earnedXp"] == 10 and right["attemptNumber"] == 2
    assert right["nextPosition"] == 2 and right["hearts"]["current"] == 4

    assert client.post(f"{ME}/attempts/{aid}/continue").status_code == 409  # last block: complete
    done = client.post(f"{ME}/attempts/{aid}/complete")
    assert done.status_code == 200, done.text
    body = done.json()
    assert body["completed"] and body["moduleCompleted"] is True
    assert body["score"] == {"correct": 0, "total": 1}  # needed two tries
    assert body["earnedXp"] == 10
    assert body["gamification"]["xp"] == 10 and body["gamification"]["streak"] == 1

    assert client.post(f"{ME}/attempts/{aid}/complete").json()["earnedXp"] == 10  # idempotent
    progress = client.get(f"{ME}/modules/{mid}/progress").json()
    assert progress["completedLessons"] == 1 and progress["lessons"][0]["status"] == "completed"
    assert client.get(f"{ME}/modules").json()["items"][0]["completedLessons"] == 1


def test_repeating_a_lesson_keeps_history_and_never_repeats_xp(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api)
    first = start(client, mid, lid)["attemptId"]
    client.post(f"{ME}/attempts/{first}/continue")
    answer(client, first, ids[1], RIGHT)
    assert client.post(f"{ME}/attempts/{first}/complete").status_code == 200
    completed_at = db.records[("users", "student-1", "lessonProgress", f"{mid}__{lid}")]["completedAt"]

    second = start(client, mid, lid, restart=True)
    assert second["attemptId"] != first and second["currentPosition"] == 0
    client.post(f"{ME}/attempts/{second['attemptId']}/continue")
    again = answer(client, second["attemptId"], ids[1], RIGHT)
    assert again["correct"] and again["earnedXp"] == 0  # XP only once per activity
    done = client.post(f"{ME}/attempts/{second['attemptId']}/complete").json()
    assert done["gamification"]["xp"] == 10
    progress = db.records[("users", "student-1", "lessonProgress", f"{mid}__{lid}")]
    assert progress["completedAt"] == completed_at and progress["bestScore"] == 1 and progress["version"] == 2
    assert db.records[("users", "student-1", "attempts", first)]["status"] == "completed"


def test_start_resumes_a_running_attempt(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api)
    one = start(client, mid, lid)
    client.post(f"{ME}/attempts/{one['attemptId']}/continue")
    resumed = start(client, mid, lid)
    assert resumed["attemptId"] == one["attemptId"] and resumed["currentPosition"] == 1
    fresh = start(client, mid, lid, restart=True)
    assert fresh["attemptId"] != one["attemptId"]
    assert db.records[("users", "student-1", "attempts", one["attemptId"])]["status"] == "abandoned"
    assert client.post(f"{ME}/attempts/{one['attemptId']}/continue").status_code == 409


def test_answers_must_follow_the_lesson_order(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api, ("multiple-choice", "true-false"))
    aid = start(client, mid, lid)["attemptId"]
    skip = client.post(f"{ME}/attempts/{aid}/blocks/{ids[2]}/answer", json={"answer": {"value": True}})
    assert skip.status_code == 409 and skip.json()["error"]["code"] == "NOT_CURRENT_BLOCK"
    theory = client.post(f"{ME}/attempts/{aid}/blocks/{ids[0]}/answer", json={"answer": {}})
    assert theory.status_code == 422  # the current block is theory: nothing to answer
    client.post(f"{ME}/attempts/{aid}/continue")
    assert client.post(f"{ME}/attempts/{aid}/blocks/nope/answer", json={"answer": {}}).status_code == 404
    bad = client.post(f"{ME}/attempts/{aid}/blocks/{ids[1]}/answer", json={"answer": {"selectedIndex": 99}})
    assert bad.status_code == 422
    # Rejected or malformed answers never cost a heart or touch the statistics.
    assert ("users", "student-1", "stats", "summary") not in db.records


def test_losing_all_hearts_restarts_the_lesson(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api)
    aid = start(client, mid, lid)["attemptId"]
    client.post(f"{ME}/attempts/{aid}/continue")
    for left in (4, 3, 2, 1):
        result = answer(client, aid, ids[1], WRONG)
        assert result["hearts"]["current"] == left and result["lessonFailed"] is False
    last = answer(client, aid, ids[1], WRONG)
    assert last["hearts"]["current"] == 0 and last["lessonFailed"] is True

    # The run is over: nothing more can be answered, continued or completed.
    out = client.post(f"{ME}/attempts/{aid}/blocks/{ids[1]}/answer", json={"answer": RIGHT})
    assert out.status_code == 409 and out.json()["error"]["code"] == "ATTEMPT_CLOSED"
    assert client.post(f"{ME}/attempts/{aid}/complete").status_code == 409

    # Starting again begins at the first block with five fresh hearts.
    again = start(client, mid, lid, restart=True)
    assert again["attemptId"] != aid and again["currentPosition"] == 0
    assert again["hearts"] == {"current": 5, "max": 5}
    # Picking up (no restart) after a failed run also starts from zero.
    resumed = start(client, mid, lid)
    assert resumed["currentPosition"] == 0 and resumed["hearts"]["current"] == 5

    # Hearts belong to the lesson run, not to the account.
    assert client.get(f"{ME}/gamification").json()["hearts"]["current"] == 5


def test_hearts_do_not_carry_over_to_another_lesson_run(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api)
    aid = start(client, mid, lid)["attemptId"]
    client.post(f"{ME}/attempts/{aid}/continue")
    answer(client, aid, ids[1], WRONG)
    answer(client, aid, ids[1], WRONG)
    assert start(client, mid, lid)["hearts"]["current"] == 3  # same run, resumed
    assert start(client, mid, lid, restart=True)["hearts"]["current"] == 5  # a new run


def test_a_retry_with_the_same_event_id_costs_nothing_extra(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api)
    aid = start(client, mid, lid)["attemptId"]
    client.post(f"{ME}/attempts/{aid}/continue")
    first = answer(client, aid, ids[1], WRONG, clientEventId="evt-1", source="offline")
    again = answer(client, aid, ids[1], WRONG, clientEventId="evt-1", source="offline")
    assert first == again and first["hearts"]["current"] == 4
    assert start(client, mid, lid)["hearts"]["current"] == 4  # the run lost one heart, not two


def test_nobody_else_can_use_my_attempt(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api)
    aid = start(client, mid, lid)["attemptId"]
    enroll(db, "student-2")
    switch("student-2", "student")
    assert client.post(f"{ME}/attempts/{aid}/continue").status_code == 404
    assert client.post(f"{ME}/attempts/{aid}/complete").status_code == 404
    assert client.post(f"{ME}/attempts/{aid}/blocks/x/answer", json={"answer": {}}).status_code == 404
    switch("teacher-1", "teacher")
    assert client.post(f"{ME}/attempts/{aid}/continue").status_code == 403


def test_streak_grows_per_day_and_breaks_after_a_gap(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api)
    key = ("users", "student-1", "stats", "summary")
    base = {"xp": 0, "hearts": 5, "maxHearts": 5, "totalAnswers": 0, "correctAnswers": 0}

    db.records[key] = {**base, "streak": 4, "lastActiveDate": day(-1)}
    assert client.get(f"{ME}/streak").json()["streak"] == 4
    aid = start(client, mid, lid)["attemptId"]
    client.post(f"{ME}/attempts/{aid}/continue")
    answer(client, aid, ids[1], RIGHT)
    streak = client.get(f"{ME}/streak").json()
    assert streak == {"streak": 5, "lastActiveDate": day(), "activeToday": True}

    db.records[key] = {**base, "streak": 9, "lastActiveDate": day(-3)}
    assert client.get(f"{ME}/streak").json()["streak"] == 0  # shown as broken
    again = start(client, mid, lid, restart=True)["attemptId"]
    client.post(f"{ME}/attempts/{again}/continue")
    answer(client, again, ids[1], RIGHT)
    assert db.records[key]["streak"] == 1


# ------------------------------------------------------------------- grading
@pytest.mark.parametrize("kind,right,wrong", [
    ("multiple-choice", {"selectedIndex": 1}, {"selectedIndex": 0}),
    ("true-false", {"value": True}, {"value": False}),
    ("match-pairs",
     {"matches": [{"left": "cat", "right": "gato"}, {"left": "dog", "right": "perro"}]},
     {"matches": [{"left": "cat", "right": "perro"}, {"left": "dog", "right": "gato"}]}),
    ("order-steps", {"order": ["first", "second", "third"]}, {"order": ["second", "first", "third"]}),
    ("fill-blanks", {"values": ["  SKY "]}, {"value": "sea"}),
    ("classify",
     {"assignments": [{"item": "apple", "category": "Fruit"}, {"item": "carrot", "category": "Veg"}]},
     {"assignments": [{"item": "apple", "category": "Veg"}, {"item": "carrot", "category": "Fruit"}]}),
])
def test_each_activity_type_is_graded_on_the_server(kind, right, wrong):
    assert grade_answer(ACTIVITIES[kind], right) is True
    assert grade_answer(ACTIVITIES[kind], wrong) is False


@pytest.mark.parametrize("kind,bad", [
    ("multiple-choice", {"selectedIndex": "1"}),
    ("multiple-choice", {"selectedIndex": 7}),
    ("true-false", {"value": "yes"}),
    ("match-pairs", {"matches": [{"left": "cat", "right": "gato"}]}),
    ("match-pairs", {"matches": [{"left": "cat", "right": "gato"}, {"left": "cat", "right": "gato"}]}),
    ("order-steps", {"order": ["first", "first", "third"]}),
    ("order-steps", {"order": ["first"]}),
    ("fill-blanks", {"values": ["a", "b"]}),
    ("classify", {"assignments": [{"item": "ghost", "category": "Fruit"}]}),
    ("classify", {"assignments": [{"item": "apple", "category": "Fruit"}]}),
])
def test_malformed_answers_are_rejected(kind, bad):
    with pytest.raises(AnswerError):
        grade_answer(ACTIVITIES[kind], bad)


def test_answered_activities_are_remembered_for_the_student(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api)
    assert client.get(f"{ME}/modules/{mid}").json()["activityResults"] == {}

    aid = start(client, mid, lid)["attemptId"]
    client.post(f"{ME}/attempts/{aid}/continue")
    answer(client, aid, ids[1], WRONG)  # a wrong answer does not count as done
    assert client.get(f"{ME}/modules/{mid}").json()["activityResults"] == {}
    answer(client, aid, ids[1], RIGHT)

    # "Signing out and in again" is just another request: the progress comes from the server.
    done = client.get(f"{ME}/modules/{mid}").json()["activityResults"]
    assert list(done) == [ids[1]] and done[ids[1]]["xp"] == 10

    enroll(db, "student-2")
    switch("student-2", "student")
    assert client.get(f"{ME}/modules/{mid}").json()["activityResults"] == {}  # never another student's


def finish_lesson(client, mid, lid, ids, **start_options):
    """Play a lesson of [theory, multiple-choice, theory] to the end."""
    attempt = start(client, mid, lid, **start_options)
    aid = attempt["attemptId"]
    client.post(f"{ME}/attempts/{aid}/continue")
    answer(client, aid, ids[1], RIGHT)
    assert client.post(f"{ME}/attempts/{aid}/complete").status_code == 200
    return attempt


def teacher_adds_block(client, switch, mid, lid, block):
    switch("teacher-1", "teacher")
    r = client.post(f"{T}/modules/{mid}/lessons/{lid}/blocks", json=block)
    assert r.status_code == 201, r.text
    switch("student-1", "student")
    return r.json()["id"]


def test_new_blocks_after_completion_only_ask_for_the_new_ones(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api)
    finish_lesson(client, mid, lid, ids)
    lesson = client.get(f"{ME}/modules/{mid}").json()["lessons"][0]
    assert lesson["progress"]["status"] == "completed" and lesson["progress"]["newBlockCount"] == 0

    # Nothing new yet: asking for "only new" plays the whole lesson (review).
    assert start(client, mid, lid, restart=True, onlyNew=True)["totalBlocks"] == 3

    new_id = teacher_adds_block(client, switch, mid, lid, {
        "kind": "activity", "title": "Extra", "activity": ACTIVITIES["true-false"]})
    lesson = client.get(f"{ME}/modules/{mid}").json()["lessons"][0]
    assert lesson["progress"]["status"] == "completed" and lesson["progress"]["newBlockCount"] == 1
    assert len(lesson["blocks"]) == 4

    attempt = start(client, mid, lid, restart=True, onlyNew=True)
    assert attempt["onlyNew"] is True and attempt["totalBlocks"] == 1
    assert [b["id"] for b in attempt["blocks"]] == [new_id]
    assert "correctBool" not in str(attempt)

    aid = attempt["attemptId"]
    assert client.post(f"{ME}/attempts/{aid}/complete").status_code == 409  # the new activity is still open
    result = answer(client, aid, new_id, {"value": True})
    assert result["correct"] and result["earnedXp"] == 5
    done = client.post(f"{ME}/attempts/{aid}/complete")
    assert done.status_code == 200 and done.json()["score"] == {"correct": 1, "total": 1}

    lesson = client.get(f"{ME}/modules/{mid}").json()["lessons"][0]
    assert lesson["progress"]["newBlockCount"] == 0  # caught up
    assert start(client, mid, lid, restart=True, onlyNew=True)["totalBlocks"] == 4


def test_start_again_still_replays_the_whole_lesson(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api)
    finish_lesson(client, mid, lid, ids)
    teacher_adds_block(client, switch, mid, lid, {"kind": "theory", "title": "More", "body": "text"})
    full = start(client, mid, lid, restart=True)  # no onlyNew: the "Start again" button
    assert full["onlyNew"] is False and full["totalBlocks"] == 4


def test_a_lesson_not_finished_yet_is_never_trimmed(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api)
    teacher_adds_block(client, switch, mid, lid, {"kind": "theory", "title": "More", "body": "text"})
    attempt = start(client, mid, lid, restart=True, onlyNew=True)
    assert attempt["onlyNew"] is False and attempt["totalBlocks"] == 4


def test_sending_the_same_correct_answer_twice_is_harmless(setup_api):  # noqa: F811
    client, db, switch, mid, lid, ids = setup_lesson(setup_api, ("multiple-choice", "true-false"))
    aid = start(client, mid, lid)["attemptId"]
    client.post(f"{ME}/attempts/{aid}/continue")
    first = answer(client, aid, ids[1], RIGHT, clientEventId="a")
    assert first["correct"] and first["earnedXp"] == 10

    # A double tap arrives with a different event id after the lesson already moved on.
    again = answer(client, aid, ids[1], RIGHT, clientEventId="b")
    assert again["correct"] is True and again["earnedXp"] == 0 and again["alreadyAnswered"] is True
    assert again["nextPosition"] == 2 and again["canContinue"] is True
    assert client.get(f"{ME}/gamification").json()["xp"] == 10  # counted once
    assert db.records[("users", "student-1", "stats", "summary")]["totalAnswers"] == 1

    # A wrong repeat of an already-solved block is not "correct" proof: still just ignored safely.
    wrong_again = answer(client, aid, ids[1], WRONG, clientEventId="c")
    assert wrong_again["earnedXp"] == 0 and client.get(f"{ME}/gamification").json()["hearts"]["current"] == 5

    # Blocks never answered correctly still have to be answered in order.
    skip = client.post(f"{ME}/attempts/{aid}/blocks/{ids[3]}/answer", json={"answer": {"value": True}})
    assert skip.status_code == 409 and skip.json()["error"]["code"] == "NOT_CURRENT_BLOCK"
