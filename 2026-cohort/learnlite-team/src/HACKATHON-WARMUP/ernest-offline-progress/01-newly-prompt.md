# Newly prompt: offline progress and Progress tab

```text
In the existing LearnLite app, add offline progress tracking, a connection status pill, demo learners and a Progress tab. Keep the existing lessons and questions as they are.

1. Save progress on the device
- Use AsyncStorage. No login and no backend needed.
- Save the answer the moment the learner taps it, before showing the next question.
- Keep one record per learner + question: id, learnerId, lessonId, questionId, answer, correct (true/false), attempts, offline (true/false), savedAt. Answering again updates that record and adds 1 to attempts. It must never create a second record.
- Also save a resume point: current lesson and question. When the app is closed and reopened, go straight back to that question.
- Ignore double taps on an answer button (disable it after the first tap).

2. Connection status
- Use @react-native-community/netinfo.
- On every lesson screen show a small pill: "Offline · Saved on this device" (orange) or "Online · Saved" (green).
- Never block learning when offline.

3. Demo learners
- On first launch show "Who's learning?" with 5 synthetic learners: Amara (16, Kenya), Ravi (19, India), Lucía (19, Peru), Tuan (15, Vietnam), Mr. Okafor (teacher, Nigeria).
- Each learner has separate progress. Default to Amara. Add a "Switch learner" link on Home.

4. Progress tab
- Header: learner name, lessons completed out of the total, overall score %.
- One row per lesson: Not started / In progress (x of y answered) / Completed (score).
- Show an "AI Smart" badge when the Final challenge is passed with 4 or more correct.
- "Progress check" card: answers saved, answered offline, duplicate records (count records sharing learnerId + questionId; must be 0), and resume point. Show a green tick "Progress intact" when duplicates = 0 and the resume point is the first unanswered question.
- Recent activity: last 15 answers, newest first, with time, question, correct or wrong, and an "offline" tag.
- "Reset this learner (demo)" button with a confirm dialog.

Design: simple, large tap targets, readable on small low-end Android phones.

Self-test before finishing: as Amara answer 2 questions, switch the device offline, answer 2 more, then close and reopen the app. It must reopen on the next unanswered question, and Progress must show 4 answers, 2 offline, 0 duplicates and "Progress intact".
```
