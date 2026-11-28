# Test checklist (run on a phone)

Tests 1 to 4 are the team's main goal. Write Pass or Fail in the last column.

| # | Test | Steps | Pass when | Result |
|---|---|---|---|---|
| 1 | Save and resume | As Amara, answer 3 questions, fully close the app, reopen | Opens on question 4; Progress shows 3 answers | |
| 2 | Learn offline | Airplane mode on, finish the lesson | Pill shows Offline; every answer saved; no error | |
| 3 | Close while offline | Still offline, close mid-lesson, reopen | Resumes on the exact question; nothing lost | |
| 4 | Back online | Airplane mode off | Pill turns green; progress unchanged | |
| 5 | No duplicates | Double-tap an answer; redo one question | Duplicate records 0; attempts goes up by 1 | |
| 6 | Separate learners | Switch to Ravi, then back to Amara | Ravi starts empty; Amara intact | |
| 7 | Badge | Pass the Final challenge with 4 of 5 | AI Smart badge appears | |
| 8 | Reset | Reset Ravi | Ravi back to 0; Amara untouched | |

If a test fails, use the matching line in 03-FIX-PROMPTS.txt, then rerun from test 1.
