"""DEMO authentication. Tenant and role come from server-side claims, never from the request body
(docs/06-security/access-control.md). Replace TOKEN_TABLE with a real identity provider once the
team picks one (open item for Shiksha). The tokens in data/fixtures/demo_auth.json are public DEMO
values, not secrets."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from fastapi import Depends, Header, HTTPException

from .config import get_settings

ROLES = {"manager", "staff", "validator"}


@dataclass(frozen=True)
class Principal:
    actor_id: str
    tenant_id: str
    role: str


def load_tokens(fixtures_dir: Path) -> dict[str, Principal]:
    raw = json.loads((fixtures_dir / "demo_auth.json").read_text())
    return {t: Principal(**claims) for t, claims in raw["tokens"].items()}


_TOKENS: dict[str, Principal] | None = None


def _tokens() -> dict[str, Principal]:
    global _TOKENS
    if _TOKENS is None:
        _TOKENS = load_tokens(get_settings().fixtures_dir)
    return _TOKENS


def err(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message})


def current_principal(authorization: str | None = Header(default=None)) -> Principal:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise err(401, "unauthenticated", "Missing bearer token")
    p = _tokens().get(authorization.split(" ", 1)[1].strip())
    if p is None:
        raise err(401, "unauthenticated", "Invalid or expired token")
    return p


def require_role(*roles: str):
    def dep(p: Principal = Depends(current_principal)) -> Principal:
        if p.role not in roles:
            raise err(403, "forbidden_role", f"Role '{p.role}' cannot perform this action")
        return p

    return dep
