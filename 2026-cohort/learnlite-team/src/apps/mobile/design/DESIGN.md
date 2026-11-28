# LearnLite design plan

## Ground

- **Subject:** a short AI-literacy module, "Inside the AI Chatbot", that works with no connection.
- **Who:** Amara, 16, rural Kenya, on her mother's low-end Android phone. Data runs out mid-lesson.
- **Core action:** move one step forward in a lesson: read a card, guess the next word, spot the made-up sentence.
- **Moment of use:** short bursts on a shared phone, often offline, outdoors, small screen, one thumb.

## Directions considered

1. **Exercise book.** Ruled paper, pencil-grey type, red teacher ticks. Lost: it reads as nostalgic, not "premium and trustworthy".
2. **Night study.** Navy-first dark UI with glowing blue. Lost: the brief asks for white backgrounds, and dark text on white reads best in sunlight.
3. **Signal and ink (chosen).** White pages, deep navy ink for type, one vibrant blue for every action, green kept only for "done/right". The module's own idea, the model's probability bars, is the visual motif. It wins because it matches the brief exactly and turns the lesson's content into the app's look.

## Palette (from the brief; tokens in src/global.css)

| Name        | Hex      | Token                         |
| ----------- | -------- | ----------------------------- |
| Navy ink    | #0B1F4B  | `--foreground` (light), dark `--background` |
| Signal blue | #2F6BFF  | `--accent`                    |
| Fresh green | #2ECC71  | `--success`                   |
| Paper white | #FFFFFF  | `--background` (light)        |
| Mist        | #EEF3FF  | `--surface-secondary`, soft blue fills |
| Ember       | #F08A24  | `--warning` (offline / waiting to sync) |

Dark mode is designed, not inverted: the navy becomes the page, surfaces lift to a lighter navy, and the blue brightens slightly.

## Type

SF Pro / Roboto. Body is 18 pt (`text-lg`) with short lines. The voice comes from large, heavy numerals for percentages and step counts ("3 of 11"), and from SF Rounded on the guess-the-word chips so the activity feels like a game.

## Imagery

No photos: the subject is ideas, not objects. Imagery is SF Symbols plus the probability bars, which are the lesson's own diagram.

## Shell

```
┌──────────────────────────────┐
│ [● Saved on this device] (wifi)│  ← sync chip, top of every screen
│ Large title                  │
│ … content scrolls …          │
│                              │
├──────────────────────────────┤
│  Learn    Module 1   Progress│  ← native Liquid Glass tab bar
└──────────────────────────────┘
Pushed: Welcome (first launch), Lesson reader (full screen, own back chevron)
```

## Screens

**Learn (dashboard), first screen.** Two layouts were sketched.

A (rejected):
```
Welcome back, Amara
[ 45% ] [ 2 offline ] [ 1 done ]   ← stat grid
[ Continue learning ]
```
B (kept): opens on the thing she's in the middle of.
```
chip
Welcome back, Amara
┌ navy "resume" card ──────────┐
│ LESSON 1 · STEP 4 OF 11       │
│ The sun rises in the ___      │  ← the actual next step
│ ▓▓▓▓▓░░░░░  36%               │
│ [ Continue learning ]         │
└──────────────────────────────┘
Module 1 card: title, 25 min, % ring-free bar
"2 lessons saved for offline"
```

**Module 1.** Hero line with the module goal, one "Download Module 1" button (it becomes "Saved for offline ✓"), then one card per lesson: number, title, objective, minutes and status ("Not downloaded", "Available offline", "Completed"). Lessons 2, 3 and 5 appear as locked "Coming soon" cards.

**Lesson reader.** Back chevron, "Lesson 1 · 4 of 11", thin progress bar. One step per screen: a read card, or an activity with big answer buttons (≥ 56 pt). Previous / Next pinned at the thumb. On the last step: "Mark as complete".

**Progress.** Lessons completed / in progress, overall percentage beside what it measures, each lesson's status with its score, last activity, saved-answer check (answers saved, answered offline, duplicates = 0), a "Test offline mode" switch, and "Reset Amara's progress (demo)".

## Signature moment: "Think like the model"

On a guess-the-next-word step, Amara taps her word. The model's own guesses then draw in as horizontal probability bars, one after another (timing.draw, staggered), with the percentages counting beside them. Her word is outlined, and the top word turns green when she matched the model. A success haptic plays when she matched it. This teaches the lesson's idea in one gesture.

**Celebration (fires once):** the first time both lessons are complete, the completion card says "Module 1 complete" with a green seal that scales in and a success haptic.

## Motion dial

`standard`: timing tokens only.

## Unmistakable

The model's probability bars are the lesson, the activity and the app's visual signature, all at once.

## Plan check

The first sketch opened on a stat grid (default look 4), so it was replaced by the resume card that shows the actual next step. The lesson list could have been grey "meta · meta" rows, so each lesson is now its own card that shows its state in words.
