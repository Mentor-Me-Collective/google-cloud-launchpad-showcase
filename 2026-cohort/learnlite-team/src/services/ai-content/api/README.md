# LearnLite AI Content API (educator pack)

Teacher-only FastAPI module for drafting lessons from approved sources:
**Gemini drafts → Nemotron checks every claim → a teacher approves → export as a contract v1.0 Lesson.**

Students never call this API. Nothing reaches learners until a teacher approves every block.

## Integrate into the LearnLite FastAPI backend (preferred)

Copy `ai_content_api/` into the backend, add the dependencies from `requirements.txt`, then:

```python
from ai_content_api import build_router, install_error_handlers

app.include_router(build_router(get_current_user=get_current_user), prefix="/api/v1")
install_error_handlers(app)  # skip if the backend already returns contract-format errors
```

`get_current_user` is the backend's existing dependency that verifies the Firebase ID token.
It may return a decoded token dict, a dataclass or a Pydantic model with `uid` (or `user_id`/`id`)
and the token's custom claims (top-level keys of a decoded token, or a `claims` / `custom_claims` field).
The router then requires the custom claim `role == "teacher"`. A `role` attribute read from a
Firestore profile is deliberately ignored.

If the backend already has a teacher-only dependency, use `build_router(require_teacher=require_teacher)`
instead; its decision is used as-is, so it must also rely on the custom claim.

The module stays independent (its own package, tests and Dockerfile), so it can later run as a
separate Cloud Run service with `main.py` and no code changes.

## Authorization rules

| Rule | How |
|---|---|
| Teacher = verified Firebase ID token **and** custom claim `role == "teacher"` | `auth.py`; no other source grants access |
| Tokens are checked for signature, expiry and revocation | `verify_id_token(token, check_revoked=True)` |
| Only admins can set the claim | `scripts/set_teacher_role.py` (Firebase Admin SDK); removing the role revokes sessions |
| Teachers only see their own drafts | 404 `DRAFT_NOT_FOUND`, identical to a draft that does not exist |
| Dev login (`AUTH_MODE=dev`) and fake AI (`LEARNLITE_MOCK`) | Only with `APP_ENV=local` or `test` and no cloud runtime detected (Cloud Run, Cloud Run jobs, App Engine, Cloud Functions). Otherwise `build_router()` raises at startup, and every request is refused as a second check. `APP_ENV` defaults to `production`. |

## Endpoints (base `/api/v1/teacher/ai-content`)

| Method | Path | What it does |
|---|---|---|
| GET | `/status` | Which AI services are configured (never returns keys) |
| POST | `/drafts` | Draft a lesson with Gemini from 1–10 source excerpts |
| GET | `/drafts` | My drafts, paginated (`page`, `pageSize`) |
| GET | `/drafts/{draftId}` | One draft: blocks, claims, checker verdicts, review state |
| POST | `/drafts/{draftId}/check` | Check all blocks with Nemotron, or `{"blockKeys": [...]}` |
| PATCH | `/drafts/{draftId}/blocks/{blockKey}` | Edit a block (clears its check) |
| POST | `/drafts/{draftId}/blocks/{blockKey}/approve` | Approve; `{"note"}` required unless SUPPORTED |
| POST | `/drafts/{draftId}/blocks/{blockKey}/remove` | Leave the block out |
| POST | `/drafts/{draftId}/blocks/{blockKey}/restore` | Back to pending |
| POST | `/drafts/{draftId}/export` | `{lesson, sources, audit}` once every block is decided |

Workflow errors: `CHECK_REQUIRED`, `REVIEW_NOTE_REQUIRED`, `REVIEW_INCOMPLETE`, `INVALID_LESSON`, `DRAFT_EXPORTED`.
All errors use the contract format `{"error": {"code", "message", "details", "requestId"}}`.

## Contract v1.0 compatibility

The export is validated against contract v1.0 (sections 3.3, 3.4 and 7) before it is returned.
Activity types produced: `multiple-choice`, `true-false`, `classify`.

`POST /export` takes `contractMode`:
- `"strict"`: only v1.0 core fields (lesson: `title`, `position`, `blocks`; block: `position`, `kind`,
  `title`, `body`/`activity`). Use this until the extension fields are accepted.
- `"extended"` (default): also the proposed extension fields `contentKey`, `sourceId`, `reviewedBy`
  (blocks) and `contentKey`, `objective`, `minutes` (lesson).

Either way, the audit record keeps the traceability (`lessonBlocks`: position → contentKey, sourceId, reviewer).

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest -q        # 36 tests, no keys or network needed
```

- `tests/test_api.py`: full teacher workflow (draft, check, edit, approve/remove, export).
- `tests/test_security.py`: 401 (missing, malformed, invalid/expired/revoked token, dev header when dev mode is off),
  403 (student, no role claim, malformed claim, on every endpoint), 404 (another teacher's draft, on every endpoint),
  dev/mock switches refused in staging, production, unset `APP_ENV`, Cloud Run, App Engine and Cloud Functions,
  integration with a host `get_current_user` (claims only; a profile `role` is ignored), and contract validation in both modes.

## Run locally

PowerShell:
```powershell
$env:APP_ENV="local"; $env:AUTH_MODE="dev"; $env:LEARNLITE_MOCK="1"
uvicorn main:app --port 8081       # http://127.0.0.1:8081/docs, header X-Dev-User: teacher_1:teacher
```
bash: `APP_ENV=local AUTH_MODE=dev LEARNLITE_MOCK=1 uvicorn main:app --port 8081`

## Deploy (with the backend, or later on its own)

- Gemini through Vertex AI with the service account (`GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`); no Gemini key.
- `NVIDIA_API_KEY` from Secret Manager only.
- `DRAFT_STORE=firestore`; leave `APP_ENV` unset or set it to `production`. Never set `AUTH_MODE` or `LEARNLITE_MOCK`.
- Service account roles: `roles/aiplatform.user`, `roles/datastore.user`, `roles/secretmanager.secretAccessor`.

## Security

- Never commit `.env`, API keys or service-account files (`.gitignore` covers them).
- Use synthetic learner data only.
