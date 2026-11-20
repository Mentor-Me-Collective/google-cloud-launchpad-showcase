import os

from proofstack.storage import firestore as firestore_store


class FakeDocumentRef:
    id = "decision-123"


class FakeCollection:
    def __init__(self):
        self.rows = []

    def add(self, row):
        self.rows.append(row)
        return "update-time", FakeDocumentRef()


class FakeClient:
    def __init__(self, project=None):
        self.project = project
        self.requested_collection = None
        self.collection_obj = FakeCollection()

    def collection(self, name):
        self.requested_collection = name
        return self.collection_obj


def test_firestore_uses_project_collection_and_server_timestamp(monkeypatch):
    monkeypatch.setenv("GCP_PROJECT_ID", "proofstack-test")
    monkeypatch.setenv("FIRESTORE_COLLECTION", "decisions")

    created = {}

    def fake_client(project=None):
        created["client"] = FakeClient(project=project)
        return created["client"]

    sentinel = object()
    monkeypatch.setattr(firestore_store.firestore, "Client", fake_client)
    monkeypatch.setattr(firestore_store.firestore, "SERVER_TIMESTAMP", sentinel)

    decision_id = firestore_store.append_decision(
        {
            "question_id": "Q01",
            "evidence_id": "E01",
            "reviewer_label": "SUPPORTED",
        }
    )

    client = created["client"]
    assert decision_id == "decision-123"
    assert client.project == "proofstack-test"
    assert client.requested_collection == "decisions"
    assert client.collection_obj.rows[0]["recorded_at_server"] is sentinel


def test_firestore_rejects_empty_collection(monkeypatch):
    monkeypatch.setenv("FIRESTORE_COLLECTION", "   ")

    try:
        firestore_store.append_decision({"question_id": "Q01"})
    except RuntimeError as exc:
        assert "FIRESTORE_COLLECTION" in str(exc)
    else:
        raise AssertionError("Expected RuntimeError for empty collection")
