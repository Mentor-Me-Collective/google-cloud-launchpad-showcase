# Evaluation plan, baselines and report template

**Owners:** Justin + AI Research; Kseniya validates data; Shiksha validates security. **Status:** targets, not test results.

## Baseline comparison

| Variant | Description | Compare on |
|---|---|---|
| Manual | Person reads equivalent NWS/evidence and drafts priorities/tasks | time, omissions, factual support |
| Rules-only | Same deterministic ranking with template summary | readability, time, complete sources |
| Integrated | Ranking + NVIDIA structured brief + manager gate | accuracy, editing, flow completion |

## Proposed targets, pending results

| Metric | Target | Protocol |
|---|---|---|
| Unauthorized approval/task creation | 0 successful attempts | Negative API tests |
| Cross-tenant data access | 0 successful attempts | Two-tenant test suite |
| Citation coverage | 100% operational weather claims sourced | Extract claims and verify IDs |
| Claim support on curated set | 100% or block output | Manual source entailment review |
| Rank determinism | 100% stable for fixed rule/input version | Repeat N identical fixtures |
| Required critical user journey | 100% defined cases pass | End-to-end playwright/API checks |
| Manager review time | Under 2 min as prototype goal | Scripted usability task; report measured times |

## Minimum scenario set

S01 forecast extreme heat; S02 active advisory; S03 missing readiness; S04 stale weather; S05 updated contradictory alert; S06 revised/rejected brief; S07 role spoofing; S08 cross-tenant read/write; S09 bad evidence upload; S10 NIM unavailable; S11 double-click/duplicate approval; S12 superseded approved plan.

## Experiment procedure

1. Freeze evidence fixture and priority-rule version.
2. Define exact tasks and output rubric; blind-check unsupported statements against source snippets.
3. Run each baseline using identical data and note differences in workflow.
4. Capture time, incorrect claims, number of edits and task completion.
5. Report all sample sizes, failures, confidence limits, fallback incidents and limitations.

## Results table — blank until measured

| Metric | Manual | Rules-only | NVIDIA integrated | Method and sample size |
|---|---|---|---|---|
| Brief time | Not tested | Not tested | Not tested | TBD |
| Supported claims | Not tested | Not tested | Not tested | TBD |
| Manager edits | Not tested | Not tested | Not tested | TBD |

Do not state measured uplift, heat-risk reduction, lives saved or verified on-site readiness until genuinely supported.
