from fastapi.testclient import TestClient
from main import app, get_current_user, get_db

class Snapshot:
    def __init__(self, data):
        self._data = data
        self.exists = data is not None
    def to_dict(self):
        return self._data

class Document:
    def __init__(self, store, key):
        self.store, self.key = store, key
    def get(self):
        return Snapshot(self.store.get(self.key))
    def create(self, data):
        assert self.key not in self.store
        self.store[self.key] = dict(data)
    def update(self, changes):
        data = self.store[self.key]
        for key, value in changes.items():
            if key.startswith("preferences."):
                data["preferences"][key.split(".", 1)[1]] = value
            else:
                data[key] = value

class Collection:
    def __init__(self, store):
        self.store = store
    def document(self, key):
        return Document(self.store, key)

class Database:
    def __init__(self):
        self.store = {}
    def collection(self, name):
        assert name == "users"
        return Collection(self.store)


def test_health_and_auth_and_profiles():
    db = Database()
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)
    try:
        assert client.get("/health").status_code == 200
        assert client.get("/api/v1/me").status_code == 401
        app.dependency_overrides[get_current_user] = lambda: {"uid": "abc", "email": "STUDENT@example.com", "name": "Student"}
        r = client.post("/api/v1/me/bootstrap")
        assert r.status_code == 200
        assert r.json()["role"] == "student"
        assert r.json()["email"] == "student@example.com"
        assert client.patch("/api/v1/me", json={"role": "teacher"}).status_code == 422
        assert client.get("/api/v1/me").json()["role"] == "student"
        assert client.patch("/api/v1/me/preferences", json={"locale": "fr"}).status_code == 422
        assert client.patch("/api/v1/me/preferences", json={"locale": "es"}).json()["locale"] == "es"
        app.dependency_overrides[get_current_user] = lambda: {"uid": "abc", "email": "STUDENT@example.com", "name": "Student", "role": "teacher"}
        assert client.get("/api/v1/me").json()["role"] == "teacher"
    finally:
        app.dependency_overrides.clear()
