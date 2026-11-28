"""Create a classroom, join it with the code, rotate the code (uses Firestore transactions)."""
from test_phase4_classroom_access import setup_api  # noqa: F401

T = "/api/v1/teacher/classrooms"
ME = "/api/v1/me/classrooms"
NEW = {"name": "Maths 7A", "grade": "Grade 7", "subject": "Maths", "color": "#2F6BFF"}


def create(client, **extra):
    r = client.post(T, json={**NEW, **extra})
    assert r.status_code == 201, r.text
    return r.json()


def test_create_join_and_list(setup_api):  # noqa: F811
    client, db, switch = setup_api
    room = create(client)
    assert room["ownerId"] == "teacher-1" and room["code"].startswith("LL-") and len(room["code"]) == 15
    assert [c["id"] for c in client.get(T).json()["items"]].count(room["id"]) == 1

    switch("student-5", "student")
    db.records[("users", "student-5")].update(name="Eve Diaz", email="eve@school.edu")
    code = room["code"].lower()[:3] + " " + room["code"][3:]  # lower case + stray space: still works
    joined = client.post(f"{ME}/join", json={"code": code})
    assert joined.status_code == 200, joined.text
    assert joined.json()["alreadyMember"] is False
    assert "code" not in joined.json()["classroom"] and "ownerId" not in joined.json()["classroom"]
    assert client.post(f"{ME}/join", json={"code": room["code"]}).json()["alreadyMember"] is True

    assert [c["id"] for c in client.get(ME).json()["items"]] == [room["id"]]

    switch("teacher-1", "teacher")
    members = client.get(f"{T}/{room['id']}/members").json()["items"]
    assert [(m["studentId"], m["name"]) for m in members] == [("student-5", "Eve Diaz")]
    assert client.get(f"{T}/{room['id']}").json()["studentCount"] == 1


def test_join_rules(setup_api):  # noqa: F811
    client, db, switch = setup_api
    closed = create(client, allowJoinByCode=False)
    switch("student-5", "student")
    assert client.post(f"{ME}/join", json={"code": "LL-AAAAAAAAAAAA"}).status_code == 404
    assert client.post(f"{ME}/join", json={"code": "nope"}).status_code == 404
    assert client.post(f"{ME}/join", json={"code": closed["code"]}).status_code == 403
    switch("teacher-1", "teacher")
    assert client.post(f"{ME}/join", json={"code": closed["code"]}).status_code == 403  # teachers cannot join


def test_rotating_the_code_invalidates_the_old_one(setup_api):  # noqa: F811
    client, db, switch = setup_api
    room = create(client)
    rotated = client.post(f"{T}/{room['id']}/rotate-code")
    assert rotated.status_code == 200, rotated.text
    new_code = rotated.json()["code"]
    assert new_code != room["code"]

    switch("student-5", "student")
    assert client.post(f"{ME}/join", json={"code": room["code"]}).status_code == 404
    assert client.post(f"{ME}/join", json={"code": new_code}).status_code == 200

    switch("teacher-2", "teacher")
    assert client.post(f"{T}/{room['id']}/rotate-code").status_code == 404


def test_update_and_validation(setup_api):  # noqa: F811
    client, _, switch = setup_api
    room = create(client)
    patched = client.patch(f"{T}/{room['id']}", json={"name": "  Maths 7B "})
    assert patched.status_code == 200 and patched.json()["name"] == "Maths 7B"
    assert client.post(T, json={**NEW, "color": "blue"}).status_code == 422
    assert client.post(T, json={**NEW, "name": ""}).status_code == 422
    switch("student-5", "student")
    assert client.post(T, json=NEW).status_code == 403
