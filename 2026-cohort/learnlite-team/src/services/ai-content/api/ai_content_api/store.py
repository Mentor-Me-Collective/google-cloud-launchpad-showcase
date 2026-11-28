"""
Draft storage.

DRAFT_STORE=firestore  keeps drafts in Firestore (collection AI_DRAFTS_COLLECTION, default "aiContentDrafts").
DRAFT_STORE=memory     keeps drafts in memory (tests and local development; lost on restart).

Each Firestore document stores ownerId, lessonKey, status, timestamps and the full draft as a JSON
string in "data", so nested block data never hits Firestore's nested-array limits.
"""
import json
import os
import threading


class MemoryStore:
    def __init__(self):
        self._docs: dict[str, dict] = {}
        self._lock = threading.Lock()

    def get(self, draft_id: str) -> dict | None:
        with self._lock:
            d = self._docs.get(draft_id)
            return json.loads(json.dumps(d)) if d else None

    def put(self, draft: dict) -> None:
        with self._lock:
            self._docs[draft["draftId"]] = json.loads(json.dumps(draft))

    def list_for_owner(self, owner_id: str, limit: int, offset: int) -> tuple[list[dict], int]:
        with self._lock:
            mine = sorted((d for d in self._docs.values() if d["ownerId"] == owner_id),
                          key=lambda d: d["updatedAt"], reverse=True)
            return [json.loads(json.dumps(d)) for d in mine[offset:offset + limit]], len(mine)


class FirestoreStore:
    def __init__(self, collection: str):
        from google.cloud import firestore
        self._col = firestore.Client().collection(collection)

    def get(self, draft_id: str) -> dict | None:
        snap = self._col.document(draft_id).get()
        return json.loads(snap.to_dict()["data"]) if snap.exists else None

    def put(self, draft: dict) -> None:
        self._col.document(draft["draftId"]).set({
            "ownerId": draft["ownerId"], "lessonKey": draft["meta"]["lesson_key"], "status": draft["status"],
            "createdAt": draft["createdAt"], "updatedAt": draft["updatedAt"],
            "data": json.dumps(draft, ensure_ascii=False)})

    def list_for_owner(self, owner_id: str, limit: int, offset: int) -> tuple[list[dict], int]:
        q = self._col.where("ownerId", "==", owner_id)
        docs = sorted((json.loads(s.to_dict()["data"]) for s in q.stream()),
                      key=lambda d: d["updatedAt"], reverse=True)
        return docs[offset:offset + limit], len(docs)


_store = None


def get_store():
    global _store
    if _store is None:
        kind = os.environ.get("DRAFT_STORE", "memory").lower()
        _store = FirestoreStore(os.environ.get("AI_DRAFTS_COLLECTION", "aiContentDrafts")) if kind == "firestore" \
            else MemoryStore()
    return _store


def set_store(store) -> None:
    """Swap the store (used by tests, or by a host app that wants its own)."""
    global _store
    _store = store
