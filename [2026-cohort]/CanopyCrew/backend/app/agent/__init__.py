"""CanopyCrew Agent Narrative Layer.

Owned by Laurine (AI Research / Lead).
Synthesizes natural-language volunteer care guides using NVIDIA NIM with
deterministic fallback.
"""

from app.agent.narrative import (
    build_fallback_narrative,
    generate_volunteer_care_narrative,
)
from app.agent.nim_client import NIMClient, NIMClientError
from app.agent.prompts import NIM_SYSTEM_PROMPT, build_user_prompt

__all__ = [
    "NIMClient",
    "NIMClientError",
    "NIM_SYSTEM_PROMPT",
    "build_fallback_narrative",
    "build_user_prompt",
    "generate_volunteer_care_narrative",
]
