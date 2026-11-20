from abc import ABC, abstractmethod

class ModelProvider(ABC):
    @abstractmethod
    def assess(self, question: dict, evidence: dict, evidence_text: str) -> str:
        raise NotImplementedError
