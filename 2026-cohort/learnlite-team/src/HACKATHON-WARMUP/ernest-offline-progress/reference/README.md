# Reference code

Small TypeScript files that show what the Newly prompt should produce. Newly writes its own code, so these are not meant to be copied in over it. Use them to check Newly's version, or as a fallback if a fix prompt keeps failing.

| File | What it does |
|---|---|
| `lib/learners.ts` | The 5 synthetic demo learners |
| `lib/progressStore.ts` | Save answers (one record per question, never a duplicate), resume point, Progress check numbers, recent activity, badge, reset |
| `hooks/useOnline.ts` | Online / offline from NetInfo |
| `components/StatusPill.tsx` | Orange "Offline · Saved on this device" or green "Online · Saved" |

Needs: `npx expo install @react-native-async-storage/async-storage @react-native-community/netinfo`

How the lesson screen uses it, when the learner taps an answer:

```ts
const offline = !(await isOnlineNow());
await saveAnswer({ learnerId, lessonId, questionId, answer, correct, offline });
await setResumePoint(learnerId, nextQuestion); // the question after this one
```

Type-checked with TypeScript in strict mode; not run on a device.
