#!/usr/bin/env python3
"""Fail if anything that looks like a credential is in the repo (Shiksha's Nov 3 task).
Usage: python scripts/scan_secrets.py [--staged]   Exit 1 on findings.
Install as a git hook:  make hooks"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = {
    "NVIDIA API key": re.compile(r"nvapi-[A-Za-z0-9_\-]{20,}"),
    "Google API key": re.compile(r"AIza[0-9A-Za-z_\-]{30,}"),
    "Private key block": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----"),
    "GCP service account": re.compile(r'"type"\s*:\s*"service_account"'),
    "AWS access key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "Slack token": re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"),
    "GitHub token": re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"),
    "Assigned secret": re.compile(
        r"(?i)\b(?:api[_-]?key|secret|token|password|passwd)\b\s*[:=]\s*['\"]?(?!SET_VIA|TBD|changeme|your-|<|\$|os\.getenv|demo-|None|''|\"\")[A-Za-z0-9_\-/+]{16,}"),
}
SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", ".pytest_cache"}
SKIP_FILES = {"scan_secrets.py"}  # this file contains the patterns themselves


def files(staged: bool):
    if staged:
        out = subprocess.run(["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
                             capture_output=True, text=True, cwd=ROOT).stdout.split()
        return [ROOT / f for f in out]
    return [p for p in ROOT.rglob("*") if p.is_file() and not (set(p.parts) & SKIP_DIRS)]


def main() -> int:
    bad = []
    names = {".env"}
    for f in files("--staged" in sys.argv):
        if f.name in SKIP_FILES or not f.exists():
            continue
        if f.name in names or (f.name.startswith(".env.") and f.name != ".env.example"):
            bad.append((f, "committed env file", ""))
            continue
        try:
            text = f.read_text(errors="ignore")
        except OSError:
            continue
        for label, pat in PATTERNS.items():
            m = pat.search(text)
            if m:
                bad.append((f, label, m.group(0)[:6] + "…"))
    for f, label, hint in bad:
        print(f"SECRET? {f.relative_to(ROOT)}: {label} {hint}")
    print("secret scan:", "FAILED" if bad else "clean")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
