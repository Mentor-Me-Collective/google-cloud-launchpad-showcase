# Week 1 starting backlog

These are candidate tasks. Confirm owners at kickoff.

## P0 — team alignment
- confirm audience/problem/MVP
- confirm or revise ownership lanes
- confirm communication cadence and PR workflow

## P0 — manual gold set
- split 20 evidence documents across teammates
- label SUPPORTED/UNSUPPORTED independently of model output
- resolve disagreements
- commit completed `gold_labels.csv`

## P0 — product flow
- review the Streamlit skeleton
- improve claim → evidence → advisory → decision flow
- decide what evidence gap looks like visually
- ensure decision logging is understandable

## P0 — provider/access
- verify NVIDIA event registration and API/model access
- choose model only after access is confirmed
- preserve mock path so development never blocks

## P0 — security
- review threat model
- add prompt-injection/secret/error tests
- define cloud IAM needed for the demo

## P1 — Google Cloud
- create/confirm project
- choose Cloud Run service name
- create Storage bucket if used
- create Firestore database/collection
- deploy minimum working app

## P1 — evaluation
- run model over all 20 examples after labels are frozen
- compute metrics
- review failures
- select 2–3 demo examples that illustrate the product honestly

## P1 — Nov. 6 hackathon slice
A reviewer should be able to open one claim, inspect evidence, run the advisory model, record a final decision and see the decision persisted.
