import os

def save_decision(row: dict):
    mode = os.getenv("PROOFSTACK_STORAGE", "local").lower()
    if mode == "local":
        from proofstack.storage.local import append_decision
    elif mode == "firestore":
        from proofstack.storage.firestore import append_decision
    else:
        raise ValueError(f"Unknown PROOFSTACK_STORAGE: {mode}")
    return append_decision(row)


def load_decisions():
    mode = os.getenv("PROOFSTACK_STORAGE", "local").lower()
    if mode == "local":
        from proofstack.storage.local import read_decisions
    elif mode == "firestore":
        from proofstack.storage.firestore import read_decisions
    else:
        raise ValueError(f"Unknown PROOFSTACK_STORAGE: {mode}")
    return read_decisions()
