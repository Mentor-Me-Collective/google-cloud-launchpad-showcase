# Offline progress and Progress tab (Ernest)

My part of the LearnLite MVP in Newly: learners keep their progress with no internet, pick up at the exact question after closing the app, and can see on screen that nothing was lost.

## Order of work

1. The Newly driver pastes [01-newly-prompt.md](01-newly-prompt.md) **after the lessons from NEWLY-PROMPT.md work**.
2. Test on a phone with [03-test-checklist.md](03-test-checklist.md).
3. If a test fails, send one line from [02-fix-prompts.md](02-fix-prompts.md), then retest.
4. Demo with [04-demo-script.md](04-demo-script.md).

## Files

| File | What it is | Who uses it |
|---|---|---|
| [01-newly-prompt.md](01-newly-prompt.md) | Prompt for Newly (2,336 characters, under the 3,500 limit) | Newly driver |
| [02-fix-prompts.md](02-fix-prompts.md) | One fix line per common problem | Newly driver, only if a test fails |
| [03-test-checklist.md](03-test-checklist.md) | 8 phone tests with pass rules | Whole team |
| [04-demo-script.md](04-demo-script.md) | 40-second demo on the Progress tab | Ernest |
| [05-supabase-sync-optional.md](05-supabase-sync-optional.md) | Cloud sync, only if we add Supabase | Newly driver |
| [06-packages-and-structure.md](06-packages-and-structure.md) | Packages Newly adds and where things live | Reference |
| [reference/](reference/) | Small TypeScript reference for the progress store, online check and status pill | Anyone checking Newly's code |

## What it adds to the app

- Each answer saved on the phone the moment it's tapped (AsyncStorage, no login, no backend)
- Resume at the exact question after the app is closed
- Offline / Online pill on lesson screens that never blocks learning
- 5 synthetic demo learners (Amara, Ravi, Lucía, Tuan, Mr. Okafor) with separate progress
- Progress tab with lesson status, AI Smart badge, and a "Progress intact" check (answers saved, answered offline, 0 duplicates)

These are the MVP versions of the two Reliability measures in the execution plan: progress kept with no loss or duplicates, and recovery to the exact question. All learner data is synthetic.
