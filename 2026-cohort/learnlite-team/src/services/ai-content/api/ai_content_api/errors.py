"""Errors in the backend contract format (section 2.3):

{"error": {"code": "...", "message": "...", "details": {...}, "requestId": "req_..."}}
"""
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def _request_id(request: Request) -> str:
    return request.headers.get("x-request-id") or f"req_{uuid.uuid4().hex[:16]}"


class ApiError(HTTPException):
    """Raise with a stable code. Works even if the host app has not installed the handlers."""

    def __init__(self, status: int, code: str, message: str, details: dict | None = None):
        super().__init__(status_code=status, detail={"code": code, "message": message, "details": details or {}})
        self.code, self.message, self.details = code, message, details or {}


def _body(code: str, message: str, details: dict, request: Request) -> dict:
    return {"error": {"code": code, "message": message, "details": details, "requestId": _request_id(request)}}


def install_error_handlers(app: FastAPI) -> None:
    """Register contract-format error responses on an app (call once)."""

    @app.exception_handler(ApiError)
    async def _api_error(request: Request, exc: ApiError):
        return JSONResponse(status_code=exc.status_code, content=_body(exc.code, exc.message, exc.details, request))

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        fields = [".".join(str(p) for p in e["loc"] if p != "body") for e in exc.errors()]
        return JSONResponse(status_code=400, content=_body(
            "VALIDATION_ERROR", "The request is not valid.", {"fields": fields}, request))
