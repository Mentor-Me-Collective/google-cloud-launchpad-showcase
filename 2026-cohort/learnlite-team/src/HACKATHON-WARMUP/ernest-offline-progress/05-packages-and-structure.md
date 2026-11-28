

## Packages
| Package | What it does |
|---|---|
| @react-native-async-storage/async-storage | Saves answers and the resume point on the phone |
| @react-native-community/netinfo | Detects online or offline for the status pill |

Outside Newly only: npx expo install @react-native-async-storage/async-storage @react-native-community/netinfo

## Likely files (Newly may name them differently; that's fine if the tests pass)
| Piece | Where | Does |
|---|---|---|
| Progress store | lib/progressStore.ts | saveAnswer(), loadProgress(), getResumePoint(), duplicate count |
| Demo learners | lib/learners.ts | The 5 learners |
| Online check | hooks/useOnline.ts | Wraps NetInfo |
| Status pill | components/StatusPill.tsx | Orange offline / green online |
| Who's learning? | app/learners.tsx | First-launch learner picker |
| Progress tab | app/(tabs)/progress.tsx | Lesson rows, badge, Progress intact card, activity, reset |
| Lesson screen | team's existing screen | Calls saveAnswer() on tap, disables the button, shows the pill |
| Startup | app/_layout.tsx | Loads current learner, jumps to resume point |

## Saved on the phone
| Key | Holds |
|---|---|
| currentLearner | Who's using the app now |
| progress:<learnerId> | One record per question |
| resume:<learnerId> | Last lesson and question |
