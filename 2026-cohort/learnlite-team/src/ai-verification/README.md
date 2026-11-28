# LearnLite: Nemotron checker, initial verification test

Tests whether an NVIDIA Nemotron model judges drafted lesson statements the same way we do, using the agreed checker contract.

## Setup (5 minutes)

1. Create a free API key at https://build.nvidia.com/settings/api-keys
2. Install and set the key:

```bash
pip install -r requirements.txt
export NVIDIA_API_KEY="nvapi-..."      # Windows: set NVIDIA_API_KEY=nvapi-...
```

## Run

```bash
python verify.py --dry-run        # checks the pipeline, no API call
python verify.py --list-models    # shows which Nemotron models your key can use
python verify.py                  # real test on E1-E5
```

To try another model: `python verify.py --model nvidia/<model-id>` (pick an id from `--list-models`).

## What the results mean

| Measure | Proposed target | Meaning |
| --- | --- | --- |
| Agreement with human labels | 90% | Nemotron's verdict matches ours |
| Critical errors | 0 | A false statement marked SUPPORTED would reach learners |
| Evidence copied exactly | All | The checker quotes the source, not its own words |

`results.csv` lists every item with the expected and actual verdict, the reason and the evidence.

## Who does what

- **Reshma:** owns `eval_set.json` (statements, sources, human labels) and reviews every disagreement.
- **Elvis:** runs the script, confirms the model id, and later wires the same prompt and contract into the backend.
- **Together:** for each disagreement, decide whether our label, the prompt, or the source text needs fixing. Re-run after each change.

## Next steps

- Grow `eval_set.json` to about 30 items, roughly a third of each verdict.
- Replace the test source texts with the team's approved sources.
- Then add the Gemini drafting step in front of this checker.
