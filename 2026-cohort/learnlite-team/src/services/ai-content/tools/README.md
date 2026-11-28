# ai-content tools

**Owner:** Reshma Thomas (Learning Product, Content & AI Evaluation)

Tools that turn LearnLite learning content into the backend contract format
("LearnLite: requisitos y contrato del backend" v1.0, 2026-11-14): Module → Lesson → Block → ActivityDefinition.

| File | What it does |
| --- | --- |
| `convert_pack.py` | Converts `content/module1_pack.json` (content-team item format) into `content/module1_module.json` (contract format) |
| `validate_module.py` | Checks a module against the contract: block kinds, explicit positions, and the section 7 rules for all six activity types |

```bash
python convert_pack.py ../../../content/module1_pack.json ../../../content/module1_module.json
python validate_module.py ../../../content/module1_module.json
```

## Module 1 in the contract format

`content/module1_module.json`: "Inside the AI Chatbot", 7 lessons (positions 0 to 6), 60 blocks, 35 activities (33 multiple-choice, 2 classify). Status `draft`, language `en`. IDs are left to the server, as the contract requires.

## How content items map to blocks

| Content item | Contract block |
| --- | --- |
| `read` | `theory` |
| `single_choice` | `activity` / `multiple-choice` |
| `spot_the_error` | `activity` / `multiple-choice` with instruction "Find the made-up statement." |
| `next_word` | `activity` / `multiple-choice` (+ `aiChoices` for the bar chart) |
| `sort_cards` | `activity` / `classify` |
| `prompt_builder` | `theory` + `activity` / `classify` (Role, Context, Task, Format) + `theory` |
| `token_demo` | `theory` listing the example splits (+ `tokenExamples`) |
| `slider_compare` | `theory` listing the answer per setting (+ `sliderSettings`) |

XP: 10 per multiple-choice, 15 per classify, 0 in the Quick check (it measures prior knowledge).

## Proposed extension fields (for agreement with Harold and Elvis)

All optional; the app works without them.

| Field | On | Why |
| --- | --- | --- |
| `sourceId` | Block | The trusted source the block is based on. Needed for the educator review audit trail. |
| `reviewedBy` | Block | The educator who approved the block (`null` until approved). The README rule "AI-generated learning material must be evaluated and approved before publication" depends on it. |
| `contentKey` | Module, Lesson, Block | Stable content id (e.g. `m1.l4.a1`) so evaluation results and test data map to content across versions. Server ids stay authoritative. |
| `sources` | Module | List of sources with title, publisher, link and reuse terms, for a "Sources" screen. |
| `aiChoices` | Block | Word + probability list to draw the "Guess the next word" bar chart after answering. |
| `illustrative` | Block | Marks example values or example AI answers written for teaching, so the app can show "Example values for teaching". |
| `tokenExamples`, `sliderSettings` | Block | Data for richer interactive versions of the token splitter and creativity slider later. Until then they render as theory text. |
| `settings` | Lesson | Quick check: `show_feedback: false` (do not reveal answers before learning) and `counts_as: pre_test`; Final challenge: `counts_as: post_test`, `badge`. Lets the app show "You improved from X/5 to Y/5". |
| `objective`, `minutes` | Lesson | Shown on the lesson card. |

## Open points for the team

- Several lessons end with a "Key idea" theory block. The contract completes a lesson at its last block; confirm that a final theory block is fine.
- Content is English only. The UI supports es and en; a Spanish version can be produced with the educator pipeline (Gemini translates, Nemotron checks, educator approves).
