"""Phase 4 review follow-ups: authorId, duplicates, draft visibility, isolation."""

from test_phase4_classroom_access import setup_api  # noqa: F401

BASE = "/api/v1"


def make_published_module(client):
    created = client.post(
        f"{BASE}/teacher/modules",
        json={"title": "Fractions", "subject": "Math", "description": ""},
    )
    assert created.status_code == 201, created.text
    mid = created.json()["id"]
    lesson = client.post(
        f"{BASE}/teacher/modules/{mid}/lessons",
        json={"title": "L1", "content": "text", "position": 0},
    )
    assert lesson.status_code == 201, lesson.text
    assert client.post(f"{BASE}/teacher/modules/{mid}/publish").status_code == 200
    return mid


def assign(client, cid, mid):
    result = client.post(
        f"{BASE}/classrooms/{cid}/assignments",
        json={"title": "Task", "instructions": "Do it", "moduleId": mid},
    )
    assert result.status_code == 201, result.text
    return result.json()


def test_assignment_records_author_id(setup_api):  # noqa: F811
    client, _, _ = setup_api
    mid = make_published_module(client)
    assignment = assign(client, "grade-7a", mid)
    assert assignment["authorId"] == "teacher-1"
    assert "teacherId" not in assignment


def test_duplicate_submission_returns_409(setup_api):  # noqa: F811
    client, _, switch = setup_api
    mid = make_published_module(client)
    aid = assign(client, "grade-7a", mid)["id"]

    switch("student-1", "student")
    url = f"{BASE}/classrooms/grade-7a/assignments/{aid}/submit"
    first = client.post(url, json={"answer": "my answer"})
    assert first.status_code == 201, first.text
    second = client.post(url, json={"answer": "another answer"})
    assert second.status_code == 409, second.text


def test_student_cannot_see_draft_module(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid = make_published_module(client)
    assign(client, "grade-7a", mid)

    # Module goes back to draft after being assigned.
    db.records[("modules", mid)]["status"] = "draft"

    switch("student-1", "student")
    listed = client.get(f"{BASE}/classrooms/grade-7a/modules")
    assert listed.status_code == 200, listed.text
    assert listed.json()["items"] == []

    lessons = client.get(
        f"{BASE}/classrooms/grade-7a/modules/{mid}/lessons"
    )
    assert lessons.status_code == 404


def test_unpublished_module_cannot_be_assigned(setup_api):  # noqa: F811
    client, _, _ = setup_api
    created = client.post(
        f"{BASE}/teacher/modules",
        json={"title": "Draft", "subject": "Math", "description": ""},
    )
    mid = created.json()["id"]
    result = client.post(
        f"{BASE}/classrooms/grade-7a/assignments",
        json={"title": "Task", "instructions": "Do it", "moduleId": mid},
    )
    assert result.status_code == 409


def test_not_enrolled_student_is_denied(setup_api):  # noqa: F811
    client, _, switch = setup_api
    mid = make_published_module(client)
    assign(client, "grade-7a", mid)

    switch("student-outsider", "student")
    for path in ("modules", "assignments"):
        denied = client.get(f"{BASE}/classrooms/grade-7a/{path}")
        assert denied.status_code == 403, (path, denied.text)


def test_other_teacher_cannot_assign_module(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid = make_published_module(client)

    switch("teacher-2", "teacher")
    db.records[("classrooms", "grade-9")] = {
        "id": "grade-9", "ownerId": "teacher-2", "status": "active",
    }
    result = client.post(
        f"{BASE}/classrooms/grade-9/assignments",
        json={"title": "Task", "instructions": "Do it", "moduleId": mid},
    )
    assert result.status_code == 404
