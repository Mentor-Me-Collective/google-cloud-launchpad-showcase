import json
from proofstack.providers.base import ModelProvider

class MockProvider(ModelProvider):
    """Deterministic local provider for UI development only."""

    policy_like = ("policy", "standard", "procedure", "plan")

    def assess(self, question: dict, evidence: dict, evidence_text: str) -> str:
        artifact = str(evidence.get("artifact_type", "")).lower()
        title = str(evidence.get("title", "")).lower()
        unsupported = any(x in artifact or x in title for x in self.policy_like)
        label = "UNSUPPORTED" if unsupported else "SUPPORTED"
        rationale = (
            "This artifact describes a requirement or intended process but does not by itself demonstrate operation."
            if unsupported else
            "This artifact contains an operational record or configuration that directly addresses the claim."
        )
        excerpt = next((line.strip() for line in evidence_text.splitlines() if line.strip() and not line.startswith("#")), "")
        return json.dumps({"label": label, "rationale": rationale, "cited_excerpt": excerpt[:240]})
