"""Asynchronous NVIDIA NIM client for generative care narrative synthesis.

Owned by Laurine (AI Research / Lead).
Connects to NVIDIA NIM accelerated inference endpoints using OpenAI-compatible format.
Injects credentials strictly via environment variables / Google Secret Manager.
"""

import logging
import re
from datetime import date
from typing import Optional

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger("canopycrew.agent.nim")

_NVAPI_TOKEN_PATTERN = re.compile(r"nvapi-[A-Za-z0-9_\-]+")
_daily_call_date: date = date.today()
_daily_call_count: int = 0


def reset_daily_nim_counter() -> None:
    """Reset the in-memory daily NIM call counter (used in tests)."""
    global _daily_call_date, _daily_call_count
    _daily_call_date = date.today()
    _daily_call_count = 0


def _redact_secret(text: str, raw_key: Optional[str] = None) -> str:
    """Scrub any NVIDIA API key or Bearer token from error and log strings."""
    if not text:
        return text
    sanitized = _NVAPI_TOKEN_PATTERN.sub("nvapi-[REDACTED]", text)
    if raw_key and raw_key.strip():
        sanitized = sanitized.replace(raw_key.strip(), "[REDACTED]")
    return sanitized


class NIMClientError(Exception):
    """Base exception for NVIDIA NIM client failures."""


class NIMClient:
    """Async client wrapper for NVIDIA NIM API."""

    def __init__(self, settings: Optional[Settings] = None):
        self._settings = settings or get_settings()

    @property
    def is_configured(self) -> bool:
        """Return True if NVIDIA API key is available."""
        return self._settings.has_nvidia_api_key

    @property
    def base_url(self) -> str:
        """NVIDIA NIM base URL (defaults to NVIDIA API catalog if not set)."""
        if self._settings.nvidia_base_url and self._settings.nvidia_base_url.strip():
            return self._settings.nvidia_base_url.rstrip("/")
        return "https://integrate.api.nvidia.com/v1"

    @property
    def model(self) -> str:
        """Model identifier for NIM inference."""
        if self._settings.nvidia_model and self._settings.nvidia_model.strip():
            return self._settings.nvidia_model.strip()
        return "nvidia/nemotron-3-ultra-550b-a55b"

    async def generate_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 800,
    ) -> str:
        """Call NVIDIA NIM chat completions API and return text response."""
        global _daily_call_date, _daily_call_count
        if not self.is_configured:
            raise NIMClientError("NVIDIA_API_KEY is not configured in environment.")

        today = date.today()
        if _daily_call_date != today:
            _daily_call_date = today
            _daily_call_count = 0

        cap = self._settings.nim_daily_call_cap
        if _daily_call_count >= cap:
            raise NIMClientError(
                f"Daily NVIDIA NIM call cap ({cap}) reached; degrading to deterministic guide."
            )
        _daily_call_count += 1

        api_key = self._settings.nvidia_api_key.get_secret_value()
        endpoint = f"{self.base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                choices = data.get("choices", [])
                if not choices:
                    raise NIMClientError("NVIDIA NIM response contained no choices.")
                message = choices[0].get("message", {})
                content = message.get("content") or message.get("reasoning_content")
                if not content or not str(content).strip():
                    raise NIMClientError("NVIDIA NIM response contained empty message content.")
                return str(content).strip()
        except httpx.HTTPStatusError as exc:
            safe_body = _redact_secret(exc.response.text, api_key)
            logger.error(
                "NVIDIA NIM returned HTTP %s: %s",
                exc.response.status_code,
                safe_body,
            )
            raise NIMClientError(
                f"NVIDIA NIM HTTP error {exc.response.status_code}: {safe_body}"
            ) from None
        except httpx.RequestError as exc:
            safe_err = _redact_secret(str(exc), api_key)
            logger.error("NVIDIA NIM network error: %s", safe_err)
            raise NIMClientError(f"NVIDIA NIM connection error: {safe_err}") from None
