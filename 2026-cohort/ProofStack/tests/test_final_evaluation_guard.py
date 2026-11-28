from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_final_evaluation_requires_vertex_and_frozen_gold():
    source = (ROOT / "scripts/run_final_evaluation.py").read_text(encoding="utf-8")
    assert 'provider != "vertex"' in source
    assert "verify_frozen_gold(ROOT)" in source
    assert "PROOFSTACK_COMMIT_SHA" in source


def test_final_summary_contains_scope_caveat_and_citation_metric():
    source = (ROOT / "scripts/write_results_summary.py").read_text(encoding="utf-8")
    assert "Citation grounding" in source
    assert "20-item synthetic capstone evaluation" in source
    assert "production performance" in source
