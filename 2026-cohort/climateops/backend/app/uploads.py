"""Proof-of-completion uploads to PRIVATE Google Cloud Storage via short-lived signed URLs
(docs/06-security/access-control.md, evidence-handling.md).

The server picks the object path (tenant/task scoped); clients can never choose it, so one tenant
cannot point evidence at another tenant's objects. GcsSigner is UNTESTED against a real bucket:
Blanca/Shiksha must validate it (needs roles/iam.serviceAccountTokenCreator on the Cloud Run service
account so it can sign). Without STORAGE_BUCKET the demo signer is used and no file leaves the app.
Limit: signed PUT URLs cannot enforce max size; add a POST policy or a size check on finalize (TODO)."""
from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Protocol

ALLOWED_TYPES = {"image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf"}
EXPIRY_MINUTES = 10


class Signer(Protocol):
    mode: str
    def issue(self, object_path: str, content_type: str) -> str | None: ...


class DemoSigner:
    mode = "demo_no_bucket"
    def issue(self, object_path: str, content_type: str) -> str | None:
        return None  # nothing is uploaded in demo mode; the metadata flow is still exercised


class GcsSigner:  # pragma: no cover - needs real GCP
    mode = "gcs"
    def __init__(self, bucket: str) -> None:
        from google.cloud import storage  # lazy import
        self._client = storage.Client()
        self._bucket = self._client.bucket(bucket)

    def issue(self, object_path: str, content_type: str) -> str:
        import google.auth
        from google.auth.transport.requests import Request
        creds, _ = google.auth.default()
        creds.refresh(Request())
        blob = self._bucket.blob(object_path)
        return blob.generate_signed_url(
            version="v4", method="PUT", content_type=content_type, expiration=timedelta(minutes=EXPIRY_MINUTES),
            service_account_email=getattr(creds, "service_account_email", None), access_token=creds.token)


def make_signer(bucket: str) -> Signer:
    return GcsSigner(bucket) if bucket else DemoSigner()


def object_prefix(tenant_id: str, task_id: str) -> str:
    return f"evidence/{tenant_id}/{task_id}/"


def new_object_path(tenant_id: str, task_id: str, content_type: str) -> str:
    return f"{object_prefix(tenant_id, task_id)}{uuid.uuid4().hex}.{ALLOWED_TYPES[content_type]}"
