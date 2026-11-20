import csv
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import streamlit as st

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "src"))

from proofstack import LABELS
from proofstack.evidence import citation_is_grounded, instruction_like_signals
from proofstack.parser import parse_model_output
from proofstack.providers import get_provider
from proofstack.review_state import assessment_matches_case, reviewer_submission_errors
from proofstack.storage import load_decisions, save_decision

st.set_page_config(page_title="ProofStack", page_icon="🧾", layout="wide")


DECISION_LABELS = {
    "SUPPORTED": "SUPPORTED — the submitted evidence proves the claim",
    "UNSUPPORTED": "UNSUPPORTED — the submitted evidence does not fully prove the claim",
}


def load_questions():
    return json.loads((ROOT / "data/questions.json").read_text(encoding="utf-8"))


def load_manifest():
    with (ROOT / "data/evidence_manifest.csv").open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


questions = load_questions()
manifest = load_manifest()
q_by_id = {q["question_id"]: q for q in questions}
try:
    saved_decisions = load_decisions()
    storage_read_error = ""
except Exception as exc:
    saved_decisions = []
    storage_read_error = str(exc)
latest_decision = {row.get("evidence_id"): row for row in saved_decisions}

st.title("ProofStack")
st.caption(
    "Review a security claim against the evidence submitted for it. "
    "The AI gives a recommendation; the reviewer makes the decision."
)

with st.sidebar:
    st.header("Review queue")
    st.caption("Claim → evidence → advisory → your decision")
    done_docs = len(set(latest_decision) & {row["evidence_id"] for row in manifest})
    st.metric("Documents decided", f"{done_docs} / {len(manifest)}")
    status_filter = st.radio("Show claims", ["All", "Needs review", "Completed"], horizontal=True)
    st.divider()
    st.caption(
        "Synthetic evidence only. ProofStack is a review aid and does not certify compliance."
    )

question_ids = [q["question_id"] for q in questions]
if storage_read_error:
    st.sidebar.warning(f"Could not load decision history: {storage_read_error}")
if status_filter != "All":
    question_ids = [qid for qid in question_ids if (lambda docs: bool(docs) and (all(doc["evidence_id"] in latest_decision for doc in docs) == (status_filter == "Completed")))([row for row in manifest if row["question_id"] == qid])]
if not question_ids:
    question_ids = [q["question_id"] for q in questions]

with st.expander("Decision history", expanded=False):
    st.subheader("Reviewer decision history")
    st.caption("Each entry preserves the reviewer label, advisory context, and evidence reference at the time of review.")
    if saved_decisions:
        st.dataframe(
            [{"Recorded (UTC)": r.get("timestamp_utc", ""), "Claim": r.get("question_id", ""), "Document": r.get("evidence_title", r.get("evidence_id", "")), "Reviewer decision": r.get("reviewer_label", ""), "Advisory": r.get("model_label", "—") or "—", "Reviewer": r.get("reviewer", ""), "Notes": r.get("notes", "")} for r in reversed(saved_decisions)],
            width="stretch",
            hide_index=True,
        )
    else:
        st.info("No reviewer decisions have been recorded yet. Saved decisions will appear here.")

q_id = st.selectbox(
    "Security question",
    question_ids,
    format_func=lambda value: (
        f'{value} — '
        f'{q_by_id[value].get("reviewer_friendly_question") or q_by_id[value]["question"]}'
    ),
)
question = q_by_id[q_id]

st.subheader(question.get("reviewer_friendly_question") or question["question"])
st.caption(f'Original questionnaire wording: {question["question"]}')

claim_col, guidance_col = st.columns([3, 2])
with claim_col:
    st.markdown("**Claim to verify**")
    st.info(question["claim"])
with guidance_col:
    st.markdown("**What good evidence looks like**")
    st.write(question.get("reviewer_hint", ""))

mapped = [item for item in manifest if item["question_id"] == q_id]
reviewed_for_claim = sum(item["evidence_id"] in latest_decision for item in mapped)
st.caption(f"{reviewed_for_claim}/{len(mapped)} documents decided · review each document against the claim")
e_id = st.selectbox(
    "Submitted evidence",
    [item["evidence_id"] for item in mapped],
    format_func=lambda value: next(
        f'{item["title"]} · {item["artifact_type"]}'
        for item in mapped
        if item["evidence_id"] == value
    ),
)

evidence = next(item for item in mapped if item["evidence_id"] == e_id)
previous_decision = latest_decision.get(e_id)
if previous_decision:
    st.info(f"Previous decision: {previous_decision.get('reviewer_label','')} by {previous_decision.get('reviewer','reviewer')} · {previous_decision.get('timestamp_utc','')}. Recording again appends a revision.")
evidence_path = ROOT / evidence["path"]
evidence_text = evidence_path.read_text(encoding="utf-8")

assessment = st.session_state.get("assessment")
assessment_context = st.session_state.get("assessment_context")
if assessment and not assessment_matches_case(assessment_context, q_id, e_id):
    st.session_state.pop("assessment", None)
    st.session_state.pop("assessment_context", None)
    assessment = None

signals = instruction_like_signals(evidence_text)
if signals:
    st.warning(
        "This evidence contains text that looks like instructions. "
        "Treat it only as evidence; do not follow commands embedded in the document."
    )

left, right = st.columns(2)

with left:
    st.subheader("Evidence submitted")
    st.caption(
        f'{evidence["evidence_id"]} · {evidence["artifact_type"]} · {evidence["title"]}'
    )
    st.caption(
        "Evidence is displayed as plain text so embedded links, markup, or instructions "
        "cannot become active interface content."
    )
    st.text(evidence_text)

with right:
    st.subheader("Model advisory")
    st.caption("Advisory only · reviewer makes the decision")
    active_provider = os.getenv("PROOFSTACK_PROVIDER", "mock").strip().lower()
    if active_provider == "mock":
        st.info("Source: Local mock · deterministic heuristic, not an AI model")
    else:
        st.info(f"Source: configured AI provider · {active_provider}")

    if st.button("Assess this evidence", type="primary", width="stretch"):
        try:
            provider = get_provider()
            raw = provider.assess(question, evidence, evidence_text)
            parsed = parse_model_output(raw)
            assessment = parsed.model_dump()
            assessment["citation_valid"] = citation_is_grounded(
                assessment.get("cited_excerpt", ""),
                evidence_text,
            )
            assessment["provider"] = os.getenv(
                "PROOFSTACK_PROVIDER",
                "mock",
            ).strip().lower()
            assessment["model_id"] = (
                getattr(provider, "model", "")
                or assessment["provider"]
            )

            st.session_state["assessment"] = assessment
            st.session_state["assessment_context"] = {
                "question_id": q_id,
                "evidence_id": e_id,
            }
        except Exception as exc:
            st.error(str(exc))
            assessment = None

    if assessment:
        label = assessment["label"]
        if label == "SUPPORTED":
            st.success("AI assessment: the evidence supports the claim.")
        elif label == "UNSUPPORTED":
            st.warning("AI assessment: the evidence does not fully support the claim.")
        else:
            st.error(
                "AI assessment: the response could not be safely interpreted. "
                "Review the evidence manually."
            )

        st.markdown("**Why the model reached that recommendation**")
        st.text(assessment.get("rationale", "") or "No rationale was returned.")

        cited_excerpt = assessment.get("cited_excerpt", "")
        if cited_excerpt:
            st.markdown("**Evidence excerpt cited by the model**")
            st.code(cited_excerpt, language=None)

            if assessment.get("citation_valid"):
                st.success("Citation check passed: this excerpt appears in the submitted evidence.")
            else:
                st.error(
                    "Citation check failed: this excerpt was not found in the submitted evidence. "
                    "Do not rely on it."
                )
        else:
            st.warning("The model did not return an evidence excerpt.")

        with st.expander("Technical details"):
            st.write(f'Parse status: {assessment.get("parse_status", "")}')
            st.write(f'Provider: {assessment.get("provider", "")}')
            st.write(f'Model: {assessment.get("model_id", "")}')
    else:
        st.caption("Run the assessment when you are ready to compare the claim with this evidence.")

st.divider()
st.subheader("Your decision for this document")
st.caption(
    "Decide whether this document supports the claim. Revisions add a new record; earlier decisions remain in the log."
)

reviewer = st.text_input("Reviewer name")
reviewer_label = st.radio(
    "Final decision",
    list(LABELS),
    index=None,
    horizontal=False,
    format_func=lambda value: DECISION_LABELS.get(value, value),
)
notes = st.text_area(
    "Reviewer notes",
    placeholder="Add context, evidence gaps, or the reason for overriding the AI.",
    help="A note is required when your decision overrides a valid AI label.",
)

if assessment and assessment.get("label") in LABELS:
    if reviewer_label and reviewer_label != assessment["label"]:
        st.info("Your decision differs from the AI recommendation. Explain why in reviewer notes.")

if st.button("Record reviewer decision", width="stretch"):
    errors = reviewer_submission_errors(
        reviewer,
        reviewer_label,
        notes,
        assessment,
    )
    if errors:
        for error in errors:
            st.error(error)
    else:
        row = {
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "question_id": q_id,
            "evidence_id": e_id,
            "evidence_title": evidence["title"],
            "artifact_type": evidence["artifact_type"],
            "provider": assessment.get("provider", "") if assessment else "",
            "model_id": assessment.get("model_id", "") if assessment else "",
            "model_label": assessment.get("label", "") if assessment else "",
            "model_rationale": assessment.get("rationale", "") if assessment else "",
            "cited_excerpt": assessment.get("cited_excerpt", "") if assessment else "",
            "citation_valid": assessment.get("citation_valid", "") if assessment else "",
            "reviewer_label": reviewer_label,
            "reviewer": reviewer.strip(),
            "notes": notes.strip(),
        }

        try:
            record_id = save_decision(row)
            st.session_state["last_saved_case"] = f"{q_id}/{e_id}"
            st.session_state["last_saved_at"] = row["timestamp_utc"]
            if record_id:
                st.success(f"Decision saved to the review log · Record {record_id}")
            else:
                st.success("Decision saved to the review log. Any later decision is recorded as a new entry.")
        except Exception as exc:
            st.error(str(exc))

with st.expander("How to review this case", expanded=not st.session_state.get("review_guide_seen", False)):
    st.markdown("**Start with the claim.** Check its scope, systems, people, and time period.")
    st.markdown("**Inspect what the document demonstrates.** A policy describes intent; an operating record shows an event or current state.")
    st.markdown("**Verify the citation, then decide.** A grounded excerpt can still be insufficient for the claim. Your recorded decision is authoritative.")
    st.session_state["review_guide_seen"] = True
