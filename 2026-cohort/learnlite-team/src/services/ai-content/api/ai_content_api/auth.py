"""
Authentication and teacher authorization.

Authoritative rule: a request is from a teacher only if its Firebase ID token is valid
(signature, expiry, not revoked) AND the token carries the custom claim  role == "teacher".
Nothing else grants teacher access: no Firestore profile field, no request header, no body field.
Custom claims can only be set with the Firebase Admin SDK (see scripts/set_teacher_role.py),
so a user cannot give themselves the role.

When this router is mounted inside the main LearnLite API, the host's own dependency is used
instead (see router.build_router); this module still supplies the safety checks.

Developer shortcut (header "X-Dev-User: <uid>:<role>") works only when ALL of these hold:
  * AUTH_MODE=dev
  * APP_ENV is "local" or "test"   (APP_ENV defaults to "production")
  * no cloud runtime is detected   (Cloud Run, Cloud Run jobs, App Engine, Cloud Functions)
If AUTH_MODE=dev is set anywhere else, the service refuses to start.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from fastapi import Header

from .errors import ApiError

TEACHER_ROLE = "teacher"
ROLE_CLAIM = "role"
SAFE_ENVS = {"local", "test"}
CLOUD_MARKERS = ("K_SERVICE", "CLOUD_RUN_JOB", "GAE_ENV", "GAE_SERVICE", "FUNCTION_TARGET", "FUNCTION_NAME")


@dataclass
class CurrentUser:
    uid: str
    role: str = ""
    name: str = ""
    email: str = ""
    claims: dict = field(default_factory=dict)

    @property
    def is_teacher(self) -> bool:
        return self.role == TEACHER_ROLE


# --------------------------------------------------------------------------
# Environment safety
# --------------------------------------------------------------------------
def app_env() -> str:
    return os.environ.get("APP_ENV", "production").strip().lower()


def cloud_runtime() -> str | None:
    return next((m for m in CLOUD_MARKERS if os.environ.get(m)), None)


def is_safe_env() -> bool:
    """True only on a developer machine or in automated tests."""
    return app_env() in SAFE_ENVS and cloud_runtime() is None


def dev_auth_requested() -> bool:
    return os.environ.get("AUTH_MODE", "").strip().lower() == "dev"


def check_runtime_config() -> None:
    """Fail fast at startup if a test-only switch is on outside local/test. Raises RuntimeError."""
    from .pipeline import mock_mode
    problems = []
    if dev_auth_requested() and not is_safe_env():
        problems.append("AUTH_MODE=dev")
    if mock_mode() and not is_safe_env():
        problems.append("LEARNLITE_MOCK")
    if problems:
        where = cloud_runtime() or f"APP_ENV={app_env()}"
        raise RuntimeError(f"{' and '.join(problems)} cannot be used here ({where}). "
                           "These switches are for APP_ENV=local or APP_ENV=test on a developer machine only.")


def _dev_auth_on() -> bool:
    if not dev_auth_requested():
        return False
    if not is_safe_env():  # second line of defence, checked on every request
        raise ApiError(500, "AUTH_MISCONFIGURED", "Developer authentication is disabled in this environment.")
    return True


# --------------------------------------------------------------------------
# Firebase token verification
# --------------------------------------------------------------------------
_firebase_app = None


def _verify_with_firebase(token: str) -> dict:
    global _firebase_app
    import firebase_admin
    from firebase_admin import auth
    if _firebase_app is None:
        _firebase_app = firebase_admin.get_app() if firebase_admin._apps else firebase_admin.initialize_app()
    return auth.verify_id_token(token, check_revoked=True)


def verify_token(token: str) -> dict:
    """Return verified token claims, or raise 401. Any verification failure is a 401."""
    if not token:
        raise ApiError(401, "UNAUTHENTICATED", "Missing sign-in token.")
    try:
        claims = _verify_with_firebase(token)
    except ApiError:
        raise
    except Exception:
        raise ApiError(401, "UNAUTHENTICATED", "Your session is not valid. Sign in again.")
    if not claims.get("uid"):
        raise ApiError(401, "UNAUTHENTICATED", "Your session is not valid. Sign in again.")
    return claims


def user_from_claims(claims: dict) -> CurrentUser:
    role = claims.get(ROLE_CLAIM)
    return CurrentUser(uid=claims["uid"], role=role if isinstance(role, str) else "",
                       name=claims.get("name", "") or "", email=claims.get("email", "") or "", claims=claims)


# --------------------------------------------------------------------------
# FastAPI dependencies (standalone mode)
# --------------------------------------------------------------------------
def current_user(authorization: str | None = Header(default=None),
                 x_dev_user: str | None = Header(default=None)) -> CurrentUser:
    if _dev_auth_on():
        if not x_dev_user or ":" not in x_dev_user:
            raise ApiError(401, "UNAUTHENTICATED", "Dev mode: send X-Dev-User: <uid>:<role>.")
        uid, role = (p.strip() for p in x_dev_user.split(":", 1))
        if not uid:
            raise ApiError(401, "UNAUTHENTICATED", "Dev mode: empty uid.")
        return CurrentUser(uid=uid, role=role, name=f"Dev {uid}")
    if not authorization:
        raise ApiError(401, "UNAUTHENTICATED", "Missing sign-in token.")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise ApiError(401, "UNAUTHENTICATED", "Use the header Authorization: Bearer <Firebase ID token>.")
    return user_from_claims(verify_token(token.strip()))


def require_teacher(authorization: str | None = Header(default=None),
                    x_dev_user: str | None = Header(default=None)) -> CurrentUser:
    user = current_user(authorization, x_dev_user)
    if not user.is_teacher:
        raise ApiError(403, "FORBIDDEN", "Only teachers can use the AI content tools.")
    return user


# --------------------------------------------------------------------------
# Adapting the host API's user object (integrated mode)
# --------------------------------------------------------------------------
def _get(obj, *names):
    for n in names:
        v = obj.get(n) if isinstance(obj, dict) else getattr(obj, n, None)
        if v not in (None, ""):
            return v
    return None


def adapt_user(user) -> CurrentUser:
    """Read uid, role and name from the host's user object: a dict (e.g. decoded Firebase token),
    a dataclass or a Pydantic model. The role is taken from the token's custom claims only."""
    if isinstance(user, CurrentUser):
        return user
    if user is None:
        raise ApiError(401, "UNAUTHENTICATED", "No signed-in user.")
    uid = _get(user, "uid", "user_id", "id")
    if not uid:
        raise ApiError(401, "UNAUTHENTICATED", "No signed-in user.")
    claims = _get(user, "claims", "custom_claims", "token_claims") or {}
    role = _get(user, ROLE_CLAIM) if isinstance(user, dict) else None  # a decoded token carries claims at top level
    role = role or (claims.get(ROLE_CLAIM) if isinstance(claims, dict) else None)
    return CurrentUser(uid=str(uid), role=role if isinstance(role, str) else "",
                       name=_get(user, "name", "display_name", "displayName") or "",
                       email=_get(user, "email") or "", claims=claims if isinstance(claims, dict) else {})
