"""Phase 7 classroom access: community and announcements use ownerId."""

from test_phase4_classroom_access import setup_api  # noqa: F401

BASE = "/api/v1/classrooms/grade-7a"


def test_owner_teacher_can_post_and_list(setup_api):  # noqa: F811
    client, _, _ = setup_api

    posted = client.post(
        f"{BASE}/announcements",
        json={"title": "Welcome", "message": "First day"},
    )
    assert posted.status_code == 201, posted.text
    assert posted.json()["authorId"] == "teacher-1"

    discussion = client.post(f"{BASE}/discussions", json={"message": "Hi"})
    assert discussion.status_code == 201, discussion.text

    listed = client.get(f"{BASE}/announcements")
    assert listed.status_code == 200, listed.text
    assert len(listed.json()["items"]) == 1


def test_non_owner_teacher_is_denied(setup_api):  # noqa: F811
    client, _, switch = setup_api
    switch("teacher-2", "teacher")

    for method, path, body in (
        ("get", "discussions", None),
        ("get", "announcements", None),
        ("post", "discussions", {"message": "Hi"}),
        ("post", "announcements", {"title": "T", "message": "M"}),
    ):
        result = getattr(client, method)(
            f"{BASE}/{path}", **({"json": body} if body else {})
        )
        assert result.status_code == 404, (method, path, result.text)


def test_enrolled_student_participates_but_cannot_announce(setup_api):  # noqa: F811
    client, _, switch = setup_api
    client.post(
        f"{BASE}/announcements",
        json={"title": "Welcome", "message": "First day"},
    )

    switch("student-1", "student")
    discussion = client.post(f"{BASE}/discussions", json={"message": "Hello"})
    assert discussion.status_code == 201, discussion.text
    assert discussion.json()["authorId"] == "student-1"
    assert discussion.json()["authorRole"] == "student"

    seen = client.get(f"{BASE}/announcements")
    assert seen.status_code == 200, seen.text
    assert len(seen.json()["items"]) == 1

    denied = client.post(
        f"{BASE}/announcements", json={"title": "T", "message": "M"}
    )
    assert denied.status_code == 403


def test_non_enrolled_student_is_denied(setup_api):  # noqa: F811
    client, _, switch = setup_api
    switch("student-outsider", "student")
    for path in ("discussions", "announcements"):
        assert client.get(f"{BASE}/{path}").status_code == 403, path
