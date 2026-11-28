"""Local development server: the real LearnLite API on an in-memory database.

Use it to build and test the app while the shared staging server runs an older version.

    cd apps/api
    python dev_server.py                 # http://127.0.0.1:8000
    python dev_server.py --host 0.0.0.0  # also reachable from a phone on the same Wi-Fi

* Real Firebase ID tokens are checked (signature, expiry, the `role` claim), so logging in
  with the app works exactly as in production. Revocation is not checked because that needs
  admin credentials.
* Data lives in memory and disappears when the server stops. Nothing touches Firestore.
* The first time a teacher calls the API, Module 1 ("Inside the AI Chatbot") is created for
  them as a published module, so there is content to assign. Use --no-seed to skip it.

This file is for local work only. It is never imported by the real API.
"""
import argparse
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("APP_ENV", "local")

import firebase_admin
import uvicorn
from fastapi import Header, HTTPException
from firebase_admin import auth
from google.cloud import firestore

from memory_firestore import MemoryDB, passthrough_transactional

import main
from app.authoring import create_module_tree
from app.common import now
from app.content_models import ModuleImport

MODULE1 = Path(__file__).resolve().parents[2] / "content" / "module1_module.json"
DB = MemoryDB()
SEEDED: set[str] = set()
SEED = True

firestore.transactional = passthrough_transactional  # type: ignore[assignment]


def seed_for(uid: str) -> None:
    """Give a teacher the Module 1 content the first time we see them."""
    if not SEED or uid in SEEDED or not MODULE1.exists():
        return
    SEEDED.add(uid)
    payload = ModuleImport(**json.loads(MODULE1.read_text()))
    ref = create_module_tree(DB, uid, payload)
    ref.update({"status": "published", "version": 1, "publishedAt": now()})
    print(f"[dev] seeded Module 1 for teacher {uid}")


def dev_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Firebase ID token required")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        try:
            firebase_admin.get_app()
        except ValueError:
            firebase_admin.initialize_app(options={"projectId": main.PROJECT_ID})
        claims = auth.verify_id_token(token)
    except auth.CertificateFetchError:
        raise HTTPException(503, "Could not download Google's signing keys (no internet?)")
    except Exception:
        raise HTTPException(401, "Invalid or expired Firebase ID token")
    if claims.get("role") == "teacher":
        seed_for(claims["uid"])
    return claims


main.app.dependency_overrides[main.get_current_user] = dev_user
main.app.dependency_overrides[main.get_db] = lambda: DB
app = main.app

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-seed", action="store_true", help="do not create Module 1 for teachers")
    args = parser.parse_args()
    SEED = not args.no_seed
    print(f"[dev] in-memory database, project {main.PROJECT_ID}, seed={'on' if SEED else 'off'}")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
