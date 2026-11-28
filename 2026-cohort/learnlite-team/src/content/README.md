# LearnLite content pack: Module 1

**Module:** Inside the AI Chatbot: how it works and when not to trust it
**Owner:** Reshma Thomas (Learning Product, Content & AI Evaluation)
**Status:** v0.2.0, full module, draft for educator review.

## Lessons

| # | Lesson | Items | Activity |
| --- | --- | --- | --- |
| 0 | Quick check | 6 | 5 questions before the module (no feedback shown) |
| 1 | AI is a next-word guesser | 11 | Guess the next word |
| 2 | Words become tokens | 8 | Token splitter |
| 3 | Ask better, get better | 9 | Prompt makeover; creativity slider |
| 4 | When AI gets it wrong | 9 | Spot the hallucination |
| 5 | Use AI wisely | 9 | Check it or share it? (card sort) |
| 6 | Final challenge | 6 | 5 scenario questions; "AI Smart" badge |

The Quick check and Final challenge test the same five ideas, so the score gain between them is our main learning measure.

## Files

- `module1_pack.json`: the pack the learner app reads.
- `validate_pack.py`: checks the pack before use (`python validate_pack.py module1_pack.json`).

## Item types (for the app)

| Type | Fields | How to show it |
| --- | --- | --- |
| `read` | `heading`, `body` | Title and text |
| `single_choice`, `spot_the_error` | `prompt`, `options`, `correct`, `feedback` | Tap an option, mark right or wrong, show feedback |
| `next_word` | as above + `ai_choices` | After answering, bar chart of the AI's top words |
| `token_demo` | `prompt`, `examples[]` (`text`, `tokens[]`), `feedback` | Tap a sentence to split it into coloured tokens |
| `prompt_builder` | `weak_prompt`, `weak_answer`, `parts[]`, `strong_answer`, `feedback` | Show the weak prompt and answer; learner adds each part; then show the strong answer |
| `slider_compare` | `base_prompt`, `settings[]` (`label`, `answer`), `feedback` | A 3-step slider; show the answer for the chosen setting |
| `sort_cards` | `categories[]`, `cards[]` (`text`, `answer`), `feedback` | Learner places each card in a category; show which were right |

Lesson-level `settings`: `show_feedback: false` on the Quick check (do not reveal answers before learning); `counts_as` marks the pre-test and post-test; `badge` is awarded on finishing the Final challenge.

Every record the app saves should include `item_id` and `pack_version`.

## Content rules

- Lesson text is written in our own words; sources are cited, not copied.
- Items with `illustrative: true` contain example values or example AI answers written for teaching, not real model output.
- Health, money and personal-details items always direct learners to trusted adults or official sources.
- `reviewed_by` stays `null` until an educator approves the item.
