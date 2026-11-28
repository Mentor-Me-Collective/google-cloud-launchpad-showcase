"""A small in-memory stand-in for Firestore, used by the tests and by dev_server.py.

It supports what the API uses: documents, sub-collections, where(==), order_by, limit,
create (raises Conflict if it exists), set, update, delete and transactions.
Nothing is written to a real database.
"""
from __future__ import annotations

from google.api_core.exceptions import Conflict


class Snapshot:
    def __init__(self, path, data):
        self.id = path[-1]
        self.data = data
        self.exists = data is not None

    def to_dict(self):
        return self.data


class Document:
    def __init__(self, db, path):
        self.db = db
        self.path = path
        self.id = path[-1]

    def get(self, transaction=None):
        return Snapshot(self.path, self.db.records.get(self.path))

    def collection(self, name):
        return Query(self.db, self.path + (name,))

    def create(self, data):
        if self.path in self.db.records:
            raise Conflict("Document already exists")
        self.db.records[self.path] = dict(data)

    def update(self, data):
        if self.path not in self.db.records:
            raise KeyError("Document does not exist")
        self.db.records[self.path].update(data)

    def set(self, data, merge=False):
        if merge and self.path in self.db.records:
            self.db.records[self.path].update(data)
        else:
            self.db.records[self.path] = dict(data)

    def delete(self):
        self.db.records.pop(self.path, None)


class Query:
    def __init__(self, db, path, filters=(), order=None, maximum=None):
        self.db = db
        self.path = path
        self.filters = filters
        self.order = order
        self.maximum = maximum

    def document(self, key=None):
        if key is None:
            self.db.counter += 1
            key = f"generated-{self.db.counter}"
        return Document(self.db, self.path + (key,))

    def where(self, field, op, value):
        assert op == "=="
        return Query(
            self.db, self.path,
            self.filters + ((field, value),),
            self.order, self.maximum
        )

    def order_by(self, field):
        return Query(
            self.db, self.path,
            self.filters, field, self.maximum
        )

    def limit(self, count):
        return Query(
            self.db, self.path,
            self.filters, self.order, count
        )

    def stream(self):
        items = [
            Snapshot(path, data)
            for path, data in self.db.records.items()
            if path[:-1] == self.path
            and all(data.get(k) == v for k, v in self.filters)
        ]
        if self.order:
            items.sort(key=lambda item: item.data[self.order])
        return items[:self.maximum]


class Transaction:
    """Runs writes immediately. Good enough for one request at a time."""

    def create(self, ref, data):
        ref.create(data)

    def set(self, ref, data, merge=False):
        ref.set(data, merge=merge)

    def update(self, ref, data):
        ref.update(data)

    def delete(self, ref):
        ref.delete()


def passthrough_transactional(func):
    """Replacement for google.cloud.firestore.transactional: call the function directly."""
    return lambda transaction, *args, **kwargs: func(transaction, *args, **kwargs)


class MemoryDB:
    def __init__(self):
        self.records = {}
        self.counter = 0

    def collection(self, name):
        return Query(self, (name,))

    def transaction(self):
        return Transaction()
