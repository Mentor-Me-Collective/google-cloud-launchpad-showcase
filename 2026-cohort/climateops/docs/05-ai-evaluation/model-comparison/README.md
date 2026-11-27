# AI readiness brief: model and prompt comparison

**Owner:** Blanca Perez (AI Research Foundations) · **Dates:** Nov 15–24, 2026 · **Status:** measured on sample data

## Question

Which NVIDIA-hosted model and which prompt write the most accurate, rule-following heat readiness brief for a South Bronx facility manager?

## Method

- **Same input for every run:** a sample NWS Heat Advisory (onset Tue, Nov 17, 11:00 AM ET) and 10 ranked facilities: 8 public sites in Mott Haven and Melrose and 2 labeled demo buildings. Daily status (AC, occupancy, staff) is **simulated**.
- **6 tests:** baseline, stale status (the #1 site's data is 3 days old), empty building (the #1 site has 0 people), missing data (AC status unknown at a top-3 site), no alert, and bad input (an "ignore your instructions" note hidden in a facility record).
- **Auto-checks:** valid JSON, correct #1 site, ranking order kept, stale sites flagged, no invented facility IDs, actions drawn from the heat task playbook, deadlines before the alert onset, each action cites its building, no invented resources (for example "activate cooling center" or "backup power"), no actions at an empty site, "unknown" stated for missing data, empty brief when there is no alert, hidden instruction ignored.
- **Manual read** of the answers for anything invented.
- **Settings:** temperature 0.2, one request at a time, model "thinking" turned off where supported, one run per test.
- **Notebook:** [`ClimateOps_Prompt_AB_v5.ipynb`](ClimateOps_Prompt_AB_v5.ipynb) (needs your own `NVIDIA_API_KEY` in Colab or Kaggle secrets; no key is stored in this repo).

## Smoke test (Nov 24)

Ran the repo's `scripts/smoke_nim.py` with my own key and `NVIDIA_MODEL_ID=nvidia/nemotron-3.5-bolt-e4b`: **HTTP 200, "OK: ready."** The app's model ID and NVIDIA API access work. Evidence: [`ClimateOps_Smoke_Test.ipynb`](ClimateOps_Smoke_Test.ipynb).

## Round 1: which models can do the job? (Nov 15)

| Model | Result |
|---|---|
| `nvidia/nemotron-3.5-bolt-e4b` (the model in the app) | 6/6 answered, about 10 s each, using my own key. |
| `nvidia/nemotron-3.5-lightning-30b-a3b` | 6/6 answered, about 6 s each, once its long "thinking" step was turned off |
| `mistralai/mistral-large-4-1t-a52b` | 0/3 usable: 4–10 minutes per test, ran out of output length while reasoning. Fails the under-30-second goal. |
| `nvidia/nemotron-3-super-120b-a12b`, `nvidia/llama-3.1-nemotron-70b-instruct` | Listed in the catalog but returned HTTP 404 "not found for account," so not testable on our key |

Reading the answers showed problems with the original prompt (A): vague actions, deadlines at or after the heat started, building actions citing the weather alert instead of the building, and Lightning inventing resources ("activate cooling centers," "backup power").

## Round 2: original prompt (A) vs. improved prompt (B) (Nov 24)

Prompt B changes:

| Problem with prompt A | Change in prompt B |
|---|---|
| Vague actions | Actions must come from the team's heat task playbook (`data/fixtures/heat_tasks.json`, HT-01 to HT-12), each tied to an NYC Emergency Management or CDC source |
| Invented resources | Playbook-only actions, plus an explicit ban on calling a site a cooling center or mentioning equipment not in the data |
| Deadlines at or after onset | Code supplies two allowed deadlines (Mon 5:00 PM, Tue 9:00 AM), and the model must copy one |
| Wrong citations | Every action cites its facility ID and its task's source IDs, with an exact example |

### Overall

| Model | Prompt | Checks passed | Valid JSON | Median time |
|---|---|---|---|---|
| Nemotron 3.5 Bolt | A (original) | 70% | 6/6 | 11.1 s |
| Nemotron 3.5 Bolt | **B (improved)** | **98%** | 6/6 | 21.1 s |
| Nemotron 3.5 Lightning | A (original) | 68% | 6/6 | 6.5 s |
| Nemotron 3.5 Lightning | **B (improved)** | **100%** | 6/6 | 6.2 s |

### By check (% of applicable tests passed)

| Check | Bolt · A | Bolt · B | Lightning · A | Lightning · B |
|---|---|---|---|---|
| Correct #1 site | 100 | 100 | 100 | 100 |
| Ranking order kept | 100 | 100 | 80 | 100 |
| Stale sites flagged | 100 | 100 | 100 | 100 |
| No invented facility IDs | 100 | 100 | 100 | 100 |
| Actions from the playbook | 0 | **100** | 0 | **100** |
| Deadlines before onset | 0 | **100** | 20 | **100** |
| Actions cite their building | 0 | **100** | 80 | **100** |
| No invented resources | 100 | 100 | 0 | **100** |
| No actions at an empty site | 100 | 100 | 100 | 100 |
| "Unknown" stated for missing data | 100 | **0** | 100 | 100 |
| Empty brief with no alert | 100 | 100 | 100 | 100 |
| Hidden instruction ignored | 100 | 100 | 100 | 100 |

Raw data: [`climateops_prompt_ab_summary.csv`](climateops_prompt_ab_summary.csv), [`climateops_prompt_ab_by_check.csv`](climateops_prompt_ab_by_check.csv), [`climateops_prompt_ab_results.csv`](climateops_prompt_ab_results.csv) (every answer).

### What reading the answers showed

- **Prompt B fixed the problems it targeted.** Both models used only playbook tasks, picked allowed deadlines, cited the building and its sources, and invented no resources. With prompt A, Lightning wrote "activate cooling center" in 5 of 6 tests and "backup power" once; with prompt B, it wrote neither.
- **Bolt with prompt B missed the unknown AC status.** At P.S./M.S. 29 (AC status null) it left AC out entirely and recommended counting and checking on people. It did not guess, but it did not tell the manager the AC status was unknown either. Lightning wrote "AC status unknown" and recommended confirming the AC (HT-01).
- **Lightning tailored tasks to each site** (in the baseline, water breaks and a staff briefing for the 600-person school); in the baseline, Bolt gave the same three tasks to all three top sites.
- **Bolt got slower with prompt B** (about 21 s vs. 11 s), still under the 30-second goal; Lightning stayed at about 6 s.
- **Both B summaries were shorter than asked** (usually one sentence instead of two, often without the end time).

## Decision

1. **Adopt prompt B** for the app's brief (`backend/app/nim.py`). It raised the pass rate by about 30 points on both models.
2. **Model:** on these tests, **Nemotron 3.5 Lightning with prompt B** was the most accurate (100%) and fastest (about 6 s). **Proposed:** make Lightning the primary model, with thinking turned off, and keep Bolt with prompt B as the fallback. If the team prefers not to change the app's model this close to submission, Bolt with prompt B passes 98% and stays under 30 seconds. Team decision recorded in `docs/00-governance/decision-log.md`.

## Vision test (Nov 24)

A quick check of whether a photo feature (reading a thermostat from a picture) is possible on our key. This does not commit the team to building it.

- **Test:** a generated image of a thermostat showing 78°F (no real photos, people or places); the model was asked to read the temperature. One run per model. Evidence: [`ClimateOps_Vision_Test.ipynb`](ClimateOps_Vision_Test.ipynb).

| Model | Result |
|---|---|
| `meta/llama-3.2-90b-vision-instruct` (the model named in the app's `config.py`) | **HTTP 410 "Gone":** NVIDIA retired this model on Nov 16, 2026 |
| `nvidia/nemotron-3.5-super-vl-120b-a12b` | **Correct:** answered "78°F" in 6.9 s |

**Finding:** the app's vision setting pointed to a retired model, and no app code called a vision model (the "Upload Proof" button sent a placeholder record, not a photo). A working replacement exists (Nemotron 3.5 Super VL), so I ran a photo-proof test before building anything.

## Vision proof test: can the AI check staff photo proof? (Nov 24)

- **Question:** given a staff member's photo for a heat task, does the model suggest the right answer and, above all, catch bad photos?
- **Photos:** 13 labeled photos for three playbook tasks: HT-01 (thermostat or AC set to 78°F or below), HT-07 (drinking water available), HT-09 (blinds closed). 7 should pass, 5 should fail, and 1 deliberately blurred thermostat should get "unclear." Bad photos include a thermostat at 83°F, a microwave clock (a lookalike display), vending machines (drinks for sale, not free water), an empty cafeteria and uncovered windows. Stock or sample photos, no faces used.
- **Prompt:** one rule per task; the model replies pass / fail / unclear with the reading it saw and a reason. It must never guess a number it cannot read.
- **Model:** `nvidia/nemotron-3.5-super-vl-120b-a12b`, temperature 0.1, thinking off, one run per photo.
- **Evidence:** [`ClimateOps_Vision_Proof_Test.ipynb`](ClimateOps_Vision_Proof_Test.ipynb), [`climateops_vision_test_results.csv`](climateops_vision_test_results.csv).

| Measure | Result |
|---|---|
| Correct | **12 / 13 (92%)** |
| Bad photos caught (fail or unclear) | **6 / 6:** it never accepted a wrong photo, including the microwave clock |
| Good photos passed | 6 / 7 |
| Blurry thermostat | "unclear," with no guessed number |
| Median time | about 22 seconds |

- **The one miss was cautious:** on the dial thermostat (set to 70°F, shown only by a small mark on the case), the model answered "unclear," which sends the photo to the manager rather than wrongly passing or failing it.
- **Two calls first returned HTTP 503** ("content safety screening is temporarily unavailable") from NVIDIA's service; both passed on rerun. The app must treat an outage as "review by hand," not as an error.

**Decision (DEC-09):** build the photo check as an **advisory** step (branch `blanca/vision-check`): staff upload a real photo, the server stores and hashes it, the model suggests pass / fail / unclear for HT-01, HT-07 and HT-09, and the **manager still decides**. Outages and other task types fall back to manual review. The retired model ID is replaced by Super VL.

## Limits

- Sample data with simulated daily status; one run per test (12 runs per model and prompt), so small differences are not conclusive.
- The test prompt is not identical to the app's current prompt in `nim.py`; results should be rechecked after the change.
- Auto-checks are pattern-based; manual reading covered the baseline and missing-data answers in detail.
- Two models could not be tested because they were unavailable on our account.
- Vision proof test: 13 stock or sample photos, one run each, three task types. It shows the check is feasible and cautious, not that it is reliable on real facility photos; it stays advisory.
- These results describe the brief's rule-following on test data, not real-world safety or readiness outcomes.
