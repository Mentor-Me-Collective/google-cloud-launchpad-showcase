"""Storage abstraction. MemoryStore is what tests/demos use. FirestoreStore is a thin,
UNTESTED-against-real-Firestore adapter for Blanca to wire (see TODOs).
Every document carries tenant_id where the entity is tenant-scoped; the API layer enforces it."""
from __future__ import annotations

import threading
from contextlib import contextmanager
from copy import deepcopy
from typing import Any, Iterator


class MemoryStore:
    def __init__(self) -> None:
        self._data: dict[str, dict[str, dict[str, Any]]] = {}
        self._lock = threading.RLock()

    @contextmanager
    def transaction(self) -> Iterator[None]:
        """Serialises read-check-write sequences (approval, task creation)."""
        with self._lock:
            yield

    def get(self, kind: str, id_: str) -> dict[str, Any] | None:
        with self._lock:
            doc = self._data.get(kind, {}).get(id_)
            return deepcopy(doc) if doc is not None else None

    def put(self, kind: str, id_: str, doc: dict[str, Any]) -> None:
        with self._lock:
            self._data.setdefault(kind, {})[id_] = deepcopy(doc)

    def list(self, kind: str, **filters: Any) -> list[dict[str, Any]]:
        with self._lock:
            out = [
                deepcopy(d)
                for d in self._data.get(kind, {}).values()
                if all(d.get(k) == v for k, v in filters.items())
            ]
        return out


class FirestoreStore:  # pragma: no cover - needs real GCP; Blanca to validate
    """TODO(Blanca): test against a real Firestore project. transaction() below is a
    process-local lock only; replace with firestore.transactional for multi-instance Cloud Run
    (data-model.md: 'Use Firestore transactions to check brief version, record approval and
    write audit event')."""

    def __init__(self, project: str) -> None:
        from google.cloud import firestore  # lazy import

        self._db = firestore.Client(project=project or None)
        self._lock = threading.RLock()

    @contextmanager
    def transaction(self) -> Iterator[None]:
        with self._lock:
            yield

    def get(self, kind: str, id_: str) -> dict[str, Any] | None:
        snap = self._db.collection(kind).document(id_).get()
        return snap.to_dict() if snap.exists else None

    def put(self, kind: str, id_: str, doc: dict[str, Any]) -> None:
        self._db.collection(kind).document(id_).set(doc)

    def list(self, kind: str, **filters: Any) -> list[dict[str, Any]]:
        q = self._db.collection(kind)
        for k, v in filters.items():
            q = q.where(k, "==", v)
        return [s.to_dict() for s in q.stream()]


def make_store(backend: str, project: str = ""):
    if backend == "firestore":
        return FirestoreStore(project)
    return MemoryStore()
