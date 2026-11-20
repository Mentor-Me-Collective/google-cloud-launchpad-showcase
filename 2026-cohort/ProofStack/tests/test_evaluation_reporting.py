import csv
import json
import subprocess
import sys
from pathlib import Path


def test_evaluator_reports_citation_grounding(tmp_path):
    """Static regression: evaluator keeps citation validity in metrics and error review."""
    root = Path(__file__).resolve().parents[1]
    source = (root / "scripts/evaluate_results.py").read_text(encoding="utf-8")
    assert '"citation_grounding_rate"' in source
    assert '"citation_valid_count"' in source
    assert '"citation_invalid_count"' in source
    assert '"citation_valid"' in source
    assert '"label_correct"' in source
