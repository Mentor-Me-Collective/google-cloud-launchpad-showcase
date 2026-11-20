from pathlib import Path


APP = (Path(__file__).resolve().parents[1] / "app.py").read_text(encoding="utf-8")


def test_untrusted_evidence_is_rendered_as_plain_text():
    assert "st.text(evidence_text)" in APP
    assert "st.markdown(evidence_text)" not in APP
    assert "st.html(evidence_text)" not in APP


def test_model_rationale_is_rendered_as_plain_text():
    assert 'st.text(assessment.get("rationale"' in APP


def test_app_does_not_enable_unsafe_html():
    assert "unsafe_allow_html=True" not in APP


def test_final_decision_has_no_preselected_default():
    start = APP.index('"Final decision"')
    radio_call = APP[start:APP.index("\n)", start)]
    assert "index=None" in radio_call
