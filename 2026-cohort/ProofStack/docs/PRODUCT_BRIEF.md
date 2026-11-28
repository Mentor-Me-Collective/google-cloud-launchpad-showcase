# Product brief

## Working name
ProofStack

## Audience
A reviewer evaluating a small organization's security questionnaire or eligibility package who needs to trace a claim to the evidence submitted for it.

## Problem
Questionnaire responses often contain confident assertions backed by policies, procedures, screenshots or reports that vary greatly in evidentiary value. Reviewers spend time determining whether a document actually supports the specific claim.

## User need
"I need to see the claim, the evidence and the gap quickly enough to make a defensible decision without treating an AI response as the decision."

## MVP
For 10 questions and 20 synthetic evidence documents:
- display the claim and evidence
- request an advisory model assessment
- show label, rationale and cited excerpt
- make unsupported/gap conditions visible
- require the reviewer to record the final decision
- preserve a decision log
- compare model predictions with a hand-labeled evaluation set

## Value
Reduce reviewer friction and make evidence gaps explicit while preserving human accountability.

## Success measures
- all 20 evidence items can be reviewed end to end
- every model result is parseable or explicitly marked unparseable
- every final reviewer decision is logged
- model performance can be measured against the manual labels
- a reviewer can trace a decision back to source evidence
- teammates can reproduce the demo from the README

## SDG 1 framing
MMC assigned Goal 1: No Poverty. The defensible connection is indirect: resource-constrained small organizations and grant applicants can be disproportionately burdened by opaque evidence-review processes. ProofStack explores a more transparent review workflow. The project should **not** claim that it measures or reduces poverty directly.

## Non-goals
- compliance certification
- legal or audit opinion
- autonomous approval/rejection
- real customer evidence
- production-grade document ingestion
- exhaustive questionnaire coverage
