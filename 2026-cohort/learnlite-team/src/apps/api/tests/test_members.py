"""Classroom members, invitations, leaving and archiving (D-05, D-07, D-08, D-12, D-13, E-03, E-04)."""
from test_phase4_classroom_access import setup_api  # noqa: F401

CLASS = "/api/v1/teacher/classrooms/grade-7a"


def student(db, uid, name, email):
    db.records[("users", uid)] = {"id": uid, "role": "student", "status": "active", "name": name, "email": email}


def stats(db, uid, **values):
    base = {"xp": 0, "hearts": 5, "maxHearts": 5, "streak": 0, "lastActiveDate": None,
            "totalAnswers": 0, "correctAnswers": 0}
    db.records[("users", uid, "stats", "summary")] = {**base, **values}


def test_teacher_lists_members_with_stats_and_health(setup_api):  # noqa: F811
    client, db, _ = setup_api
    student(db, "student-1", "Ana Gomez", "ana@school.edu")
    stats(db, "student-1", xp=120, streak=0, totalAnswers=10, correctAnswers=9)
    student(db, "student-2", "Ben Ruiz", "ben@school.edu")
    db.records[("classrooms", "grade-7a", "members", "student-2")] = {
        "studentId": "student-2", "status": "active", "joinedAt": "2026-11-01T00:00:00Z"}
    stats(db, "student-2", xp=30, streak=4, totalAnswers=10, correctAnswers=4, lastActiveDate="2000-01-01")
    db.records[("classrooms", "grade-7a", "members", "student-1")]["studentId"] = "student-1"

    items = client.get(f"{CLASS}/members").json()["items"]
    assert [i["name"] for i in items] == ["Ana Gomez", "Ben Ruiz"]
    ana, ben = items
    assert (ana["xp"], ana["accuracy"], ana["status"]) == (120, 90, "broken-streak")
    assert (ben["accuracy"], ben["status"]) == (40, "needs-help")
    assert [i["name"] for i in client.get(f"{CLASS}/members?q=ben").json()["items"]] == ["Ben Ruiz"]


def test_member_endpoints_are_teacher_and_owner_only(setup_api):  # noqa: F811
    client, db, switch = setup_api
    student(db, "student-9", "Zed", "z@school.edu")
    calls = [
        ("get", f"{CLASS}/members", None),
        ("post", f"{CLASS}/members", {"studentIds": ["student-9"]}),
        ("post", f"{CLASS}/invitations", {"email": "x@school.edu"}),
        ("delete", f"{CLASS}/members/student-1", None),
        ("delete", CLASS, None),
    ]

    def call(method, url, body):
        return getattr(client, method)(url, **({"json": body} if body else {}))

    switch("teacher-2", "teacher")
    for method, url, body in calls:
        assert call(method, url, body).status_code == 404, (method, url)
    switch("student-1", "student")
    for method, url, body in calls:
        assert call(method, url, body).status_code == 403, (method, url)


def test_add_members_validates_and_is_idempotent(setup_api):  # noqa: F811
    client, db, _ = setup_api
    student(db, "student-1", "Ana", "ana@school.edu")
    student(db, "student-3", "Cy", "cy@school.edu")
    db.records[("users", "teacher-9")] = {"id": "teacher-9", "role": "teacher", "status": "active"}

    assert client.post(f"{CLASS}/members", json={"studentIds": ["nobody"]}).status_code == 404
    assert client.post(f"{CLASS}/members", json={"studentIds": ["teacher-9"]}).status_code == 404
    assert client.post(f"{CLASS}/members", json={"studentIds": []}).status_code == 422

    first = client.post(f"{CLASS}/members", json={"studentIds": ["student-3", "student-1", "student-3"]})
    assert first.status_code == 200, first.text
    assert first.json() == {"added": ["student-3"], "alreadyMembers": ["student-1"]}
    assert client.post(f"{CLASS}/members", json={"studentIds": ["student-3"]}).json()["added"] == []
    assert db.records[("users", "student-3", "classrooms", "grade-7a")]["status"] == "active"


def test_invitations(setup_api):  # noqa: F811
    client, db, _ = setup_api
    student(db, "student-4", "Dee", "dee@school.edu")
    db.records[("users", "teacher-9")] = {"id": "teacher-9", "role": "teacher", "status": "active",
                                          "email": "boss@school.edu"}

    known = client.post(f"{CLASS}/invitations", json={"email": " Dee@School.edu "})
    assert known.status_code == 201 and known.json()["status"] == "active"
    assert db.records[("classrooms", "grade-7a", "members", "student-4")]["status"] == "active"

    unknown = client.post(f"{CLASS}/invitations", json={"email": "new@school.edu"})
    assert unknown.status_code == 201 and unknown.json()["status"] == "pending"
    assert [p for p in db.records if "invitations" in p]

    assert client.post(f"{CLASS}/invitations", json={"email": "boss@school.edu"}).status_code == 409
    assert client.post(f"{CLASS}/invitations", json={"email": "not-an-email"}).status_code == 422


def test_removing_a_member_keeps_their_history(setup_api):  # noqa: F811
    client, db, switch = setup_api
    student(db, "student-1", "Ana", "ana@school.edu")
    stats(db, "student-1", xp=50)

    assert client.delete(f"{CLASS}/members/student-1").status_code == 204
    assert client.delete(f"{CLASS}/members/student-1").status_code == 404
    assert client.get(f"{CLASS}/members").json()["items"] == []
    assert db.records[("users", "student-1")]["name"] == "Ana"
    assert db.records[("users", "student-1", "stats", "summary")]["xp"] == 50

    switch("student-1", "student")
    assert client.get("/api/v1/classrooms/grade-7a/modules").status_code == 403

    switch("teacher-1", "teacher")  # the teacher can bring them back
    assert client.post(f"{CLASS}/members", json={"studentIds": ["student-1"]}).json()["added"] == ["student-1"]


def test_student_can_see_and_leave_a_classroom(setup_api):  # noqa: F811
    client, db, switch = setup_api
    db.records[("users", "teacher-1")] = {"id": "teacher-1", "role": "teacher", "status": "active", "name": "Ms Lee"}
    switch("student-1", "student")

    seen = client.get("/api/v1/me/classrooms/grade-7a")
    assert seen.status_code == 200, seen.text
    assert seen.json()["teacherName"] == "Ms Lee"
    assert "code" not in seen.json() and "ownerId" not in seen.json()

    assert client.delete("/api/v1/me/classrooms/grade-7a").status_code == 204
    assert client.get("/api/v1/me/classrooms/grade-7a").status_code == 404
    assert client.delete("/api/v1/me/classrooms/grade-7a").status_code == 404
    switch("teacher-1", "teacher")
    assert client.get(f"{CLASS}/members").json()["items"] == []


def test_archiving_a_classroom_closes_it_without_deleting(setup_api):  # noqa: F811
    client, db, switch = setup_api
    assert client.delete(CLASS).status_code == 204
    assert db.records[("classrooms", "grade-7a")]["status"] == "archived"
    assert ("classrooms", "grade-7a", "members", "student-1") in db.records
    assert client.get(f"{CLASS}/members").status_code == 409
    switch("student-1", "student")
    assert client.get("/api/v1/classrooms/grade-7a/modules").status_code == 404
    assert client.get("/api/v1/me/classrooms/grade-7a").status_code == 404


def test_classroom_lists_carry_counts_for_the_cards(setup_api):  # noqa: F811
    from test_learner import assign, enroll, make_module  # reuse the flow helpers

    client, db, switch = setup_api
    enroll(db, "student-1")
    enroll(db, "student-2")
    db.records[("classrooms", "grade-7a", "members", "student-2")]["status"] = "removed"
    mid, _, _ = make_module(client)
    assign(client, mid)

    mine = client.get("/api/v1/teacher/classrooms").json()["items"]
    counts = {c["id"]: c["studentCount"] for c in mine}
    assert counts == {"grade-7a": 1, "grade-7b": 1}
    assert client.get(CLASS).json()["studentCount"] == 1

    switch("student-1", "student")
    rooms = client.get("/api/v1/me/classrooms").json()["items"]
    assert [(r["id"], r["assignmentCount"]) for r in rooms] == [("grade-7a", 1)]


def test_a_student_sees_being_added_without_signing_in_again(setup_api):  # noqa: F811
    from test_learner import assign, make_module  # reuse the flow helpers

    client, db, switch = setup_api
    mid, _, _ = make_module(client)

    switch("student-7", "student")
    student(db, "student-7", "Gus", "gus@school.edu")  # after switch(), which resets the profile
    assert client.get("/api/v1/me/classrooms").json()["items"] == []
    assert client.get("/api/v1/me/modules").json()["items"] == []

    switch("teacher-1", "teacher")  # the teacher adds the student by e-mail and assigns a module
    # The fake token has no e-mail, so the student's own requests blanked it; a real token carries it.
    student(db, "student-7", "Gus", "gus@school.edu")
    assert client.post(f"{CLASS}/invitations", json={"email": "gus@school.edu"}).json()["status"] == "active"
    assign(client, mid)

    switch("student-7", "student")  # same session: the next request already sees both changes
    assert [c["id"] for c in client.get("/api/v1/me/classrooms").json()["items"]] == ["grade-7a"]
    assert [m["id"] for m in client.get("/api/v1/me/modules").json()["items"]] == [mid]

    switch("teacher-1", "teacher")  # and removing them takes it away again
    assert client.delete(f"{CLASS}/members/student-7").status_code == 204
    switch("student-7", "student")
    assert client.get("/api/v1/me/classrooms").json()["items"] == []
    assert client.get("/api/v1/me/modules").json()["items"] == []


def test_classroom_league_ranks_classmates_privately(setup_api):  # noqa: F811
    client, db, switch = setup_api
    from test_learner import enroll

    enroll(db, "student-1")
    enroll(db, "student-2")
    db.records[("classrooms", "grade-7a", "members", "student-3")] = {"studentId": "student-3", "status": "removed"}
    student(db, "student-1", "Ana Gomez", "ana@school.edu")
    student(db, "student-2", "bruno.diaz@school.edu", "bruno.diaz@school.edu")
    stats(db, "student-1", xp=40)
    stats(db, "student-2", xp=90, streak=3, lastActiveDate="2000-01-01")

    switch("student-1", "student")
    student(db, "student-1", "Ana Gomez", "ana@school.edu")
    board = client.get("/api/v1/me/classrooms/grade-7a/leaderboard")
    assert board.status_code == 200, board.text
    items = board.json()["items"]
    assert [(i["rank"], i["name"], i["xp"], i["isMe"]) for i in items] == [(1, "Bruno D.", 90, False), (2, "Ana G.", 40, True)]
    assert items[0]["streak"] == 0  # an old streak is shown as broken
    assert "email" not in str(items) and "@" not in str(items)

    switch("student-outsider", "student")
    assert client.get("/api/v1/me/classrooms/grade-7a/leaderboard").status_code == 404
    switch("teacher-1", "teacher")
    assert client.get("/api/v1/me/classrooms/grade-7a/leaderboard").status_code == 403
