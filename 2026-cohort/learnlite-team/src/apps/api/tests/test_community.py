"""Community: modules their teachers chose to share are open to every student."""
from test_learner import ME, RIGHT, T, answer, make_module, start
from test_phase4_classroom_access import setup_api  # noqa: F401

COMMUNITY = "/api/v1/community/modules"


def share(client, mid, visibility="public"):
    r = client.patch(f"{T}/modules/{mid}", json={"visibility": visibility})
    assert r.status_code == 200, r.text
    return r.json()


def test_modules_are_private_until_shared(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, _, _ = make_module(client)

    switch("student-1", "student")
    assert client.get(COMMUNITY).json()["items"] == []
    assert client.get(f"{ME}/modules/{mid}").status_code == 404  # not assigned, not shared

    switch("teacher-1", "teacher")
    assert share(client, mid)["visibility"] == "public"
    db.records[("users", "teacher-1")]["name"] = "Maria Lopez"  # the teacher's own request resets it
    switch("student-1", "student")
    items = client.get(COMMUNITY).json()["items"]
    assert [m["id"] for m in items] == [mid]
    item = items[0]
    assert (item["lessonCount"], item["activityCount"], item["assigned"]) == (1, 1, False)
    assert item["authorName"] == "Maria L."  # a first name and an initial, never the e-mail
    assert "authorId" not in item and "@" not in str(item)

    # Stop sharing: it disappears at once.
    switch("teacher-1", "teacher")
    share(client, mid, "private")
    switch("student-1", "student")
    assert client.get(COMMUNITY).json()["items"] == []
    assert client.get(f"{ME}/modules/{mid}").status_code == 404


def test_a_student_can_play_a_public_module_without_an_assignment(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, lid, ids = make_module(client)
    share(client, mid)
    switch("student-9", "student")  # in no classroom at all

    detail = client.get(f"{ME}/modules/{mid}")
    assert detail.status_code == 200, detail.text
    assert "correctIndex" not in str(detail.json())  # the solutions stay on the server

    attempt = start(client, mid, lid)
    aid = attempt["attemptId"]
    client.post(f"{ME}/attempts/{aid}/continue")
    assert answer(client, aid, ids[1], RIGHT)["earnedXp"] == 10
    assert client.post(f"{ME}/attempts/{aid}/complete").status_code == 200

    progress = client.get(f"{ME}/modules/{mid}/progress").json()
    assert progress["completedLessons"] == 1
    listed = client.get(COMMUNITY).json()["items"][0]
    assert listed["completedLessons"] == 1  # the student's own progress shows in the list
    assert client.get(f"{ME}/gamification").json()["xp"] == 10


def test_only_published_modules_are_shared(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, _, _ = make_module(client, publish=False)
    share(client, mid)  # public, but still a draft
    switch("student-1", "student")
    assert client.get(COMMUNITY).json()["items"] == []
    assert client.get(f"{ME}/modules/{mid}").status_code == 404

    switch("teacher-1", "teacher")
    client.post(f"{T}/modules/{mid}/publish")
    switch("student-1", "student")
    assert len(client.get(COMMUNITY).json()["items"]) == 1

    switch("teacher-1", "teacher")
    client.post(f"{T}/modules/{mid}/unpublish")
    switch("student-1", "student")
    assert client.get(COMMUNITY).json()["items"] == []


def test_modules_from_different_teachers_filters_and_search(setup_api):  # noqa: F811
    client, db, switch = setup_api
    first, _, _ = make_module(client)  # "Cells", Biology
    share(client, first)

    switch("teacher-2", "teacher")
    second = client.post(f"{T}/modules", json={"title": "Volcanoes", "subject": "Geography"}).json()["id"]
    lesson = client.post(f"{T}/modules/{second}/lessons", json={"title": "L"}).json()["id"]
    client.post(f"{T}/modules/{second}/lessons/{lesson}/blocks", json={"kind": "theory", "title": "t", "body": "b"})
    client.post(f"{T}/modules/{second}/publish")
    share(client, second)

    switch("student-1", "student")
    body = client.get(COMMUNITY).json()
    assert {m["id"] for m in body["items"]} == {first, second}
    assert body["subjects"] == ["Biology", "Geography"]
    assert [m["id"] for m in client.get(f"{COMMUNITY}?q=volc").json()["items"]] == [second]
    assert [m["id"] for m in client.get(f"{COMMUNITY}?subject=biology").json()["items"]] == [first]
    assert client.get(f"{COMMUNITY}?q=nothing-like-this").json()["items"] == []


def test_community_permissions_and_validation(setup_api):  # noqa: F811
    client, db, switch = setup_api
    mid, _, _ = make_module(client)
    assert client.patch(f"{T}/modules/{mid}", json={"visibility": "everyone"}).status_code == 422

    switch("teacher-2", "teacher")
    assert client.patch(f"{T}/modules/{mid}", json={"visibility": "public"}).status_code == 404  # not theirs
    assert client.get(COMMUNITY).status_code == 403  # the community is for students

    switch("student-1", "student")
    assert client.patch(f"{T}/modules/{mid}", json={"visibility": "public"}).status_code == 403
