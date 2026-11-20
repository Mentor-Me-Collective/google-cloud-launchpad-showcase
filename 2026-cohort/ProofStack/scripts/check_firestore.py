"""Verify ProofStack can write, read, and delete one synthetic Firestore decision.

Uses Application Default Credentials and the configured GCP project.
No real questionnaire or personal data is used.

Usage:
    export GCP_PROJECT_ID=proofstack-build
    export FIRESTORE_COLLECTION=proofstack_decisions
    python scripts/check_firestore.py
"""

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from google.cloud import firestore

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from proofstack.storage.firestore import append_decision


def main():
    project = os.getenv("GCP_PROJECT_ID", "").strip()
    collection = os.getenv("FIRESTORE_COLLECTION", "proofstack_decisions").strip()

    if not project:
        raise SystemExit("Set GCP_PROJECT_ID before running this check.")
    if not collection:
        raise SystemExit("FIRESTORE_COLLECTION must not be empty.")

    probe = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "question_id": "SMOKE-Q1",
        "evidence_id": "SMOKE-E1",
        "evidence_title": "Firestore synthetic smoke test",
        "artifact_type": "system_export",
        "provider": "vertex",
        "model_id": os.getenv("VERTEX_MODEL", ""),
        "model_label": "SUPPORTED",
        "model_rationale": "Synthetic Firestore persistence probe.",
        "cited_excerpt": "MFA enrolled: 4",
        "citation_valid": True,
        "reviewer_label": "SUPPORTED",
        "reviewer": "firestore-smoke-test",
        "notes": "Synthetic test record; deleted after verification.",
    }

    document_id = append_decision(probe)
    client = firestore.Client(project=project)
    ref = client.collection(collection).document(document_id)

    try:
        snap = ref.get()
        if not snap.exists:
            raise SystemExit("Firestore write returned an ID but the document could not be read back.")

        data = snap.to_dict() or {}
        checks = {
            "question_id": "SMOKE-Q1",
            "evidence_id": "SMOKE-E1",
            "model_label": "SUPPORTED",
            "reviewer_label": "SUPPORTED",
            "reviewer": "firestore-smoke-test",
        }
        failures = [
            f"{key}: expected {expected!r}, got {data.get(key)!r}"
            for key, expected in checks.items()
            if data.get(key) != expected
        ]
        if failures:
            raise SystemExit("Firestore read-back verification failed: " + "; ".join(failures))

        print(f"Project: {project}")
        print(f"Collection: {collection}")
        print(f"Document ID: {document_id}")
        print("PASS: Firestore write and read-back succeeded.")
    finally:
        ref.delete()
        print("Cleanup: synthetic probe document deleted.")


if __name__ == "__main__":
    main()
