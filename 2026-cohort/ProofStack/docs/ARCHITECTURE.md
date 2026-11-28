# Architecture

## Design principle
The model is an adviser inside a reviewer workflow, not the workflow owner.

## Components

### Reviewer UI
Streamlit MVP:
- select question and mapped evidence
- view claim and evidence side by side
- run advisory assessment
- capture human decision and notes

### Data
- `questions.json`: question, claim, reviewer hint
- `evidence_manifest.csv`: evidence metadata and question mapping
- `data/evidence/*.md`: synthetic artifacts
- `gold_labels.csv`: manually created team gold set

### Model provider boundary
Provider interface returns raw model text. The parser converts that into:
- SUPPORTED
- UNSUPPORTED
- UNPARSEABLE

Local development uses a deterministic mock provider. BUILD integration uses an NVIDIA NIM-compatible endpoint after the team verifies model/API access.

### Google Cloud target
- Cloud Run: containerized application
- Cloud Storage: optional evidence-object copy for cloud demonstration
- Firestore: reviewer decision log
- IAM: least-privilege service identity

### Security boundary
Evidence text is untrusted input. It must not be treated as instructions to the application or model controller. The model cannot approve, reject, change permissions or take external actions.

## Why this is intentionally small
The capstone has four weeks. A transparent reviewer workflow with measurable evaluation is more valuable than a large stack nobody can reproduce.
