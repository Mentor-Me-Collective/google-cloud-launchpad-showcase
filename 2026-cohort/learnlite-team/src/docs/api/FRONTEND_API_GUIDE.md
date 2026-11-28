# LearnLite API: guide for connecting the Expo app

Base URL: `https://<host>/api/v1`. Every request sends `Authorization: Bearer <Firebase ID token>`.
Collections come back as `{ "items": [...] }`. Errors come back as
`{ "error": { "code", "message", "details", "requestId" } }`. Interactive docs: `/docs`.

Roles come from the Firebase custom claim `role` (`teacher`, anything else is `student`).
Call `POST /me/bootstrap` once after sign-in to create the profile.

## 1. Store action to endpoint

| App action (store) | Endpoint |
|---|---|
| `auth.signIn` / `signUp` | Firebase SDK, then `POST /me/bootstrap` |
| `auth.updateProfile` | `PATCH /me` |
| `settings.setLocale` | `PATCH /me/preferences` |
| `teacher.createClassroom` | `POST /teacher/classrooms` |
| list classrooms (card with student count) | `GET /teacher/classrooms` (has `studentCount`) |
| `teacher.updateClassroom` | `PATCH /teacher/classrooms/{id}` |
| rotate code | `POST /teacher/classrooms/{id}/rotate-code` |
| archive classroom | `DELETE /teacher/classrooms/{id}` |
| students of a classroom | `GET /teacher/classrooms/{id}/members?q=` |
| `teacher.addStudentByEmail` | `POST /teacher/classrooms/{id}/invitations` `{email}` |
| `teacher.addStudents` | `POST /teacher/classrooms/{id}/members` `{studentIds}` |
| `teacher.removeStudent` | `DELETE /teacher/classrooms/{id}/members/{studentId}` |
| `teacher.createModule` | `POST /teacher/modules` `{title, subject}` |
| load the module editor | `GET /teacher/modules/{id}` (lessons and blocks, with solutions) |
| `teacher.updateModule` | `PATCH /teacher/modules/{id}` |
| `teacher.addLesson` | `POST /teacher/modules/{id}/lessons` `{title}` |
| `teacher.updateLesson` | `PATCH /teacher/modules/{id}/lessons/{lessonId}` |
| `teacher.addBlock` | `POST /teacher/modules/{id}/lessons/{lessonId}/blocks` |
| `teacher.updateBlock` | `PATCH .../blocks/{blockId}` |
| `teacher.removeBlock` | `DELETE .../blocks/{blockId}` |
| reorder lessons / blocks | `POST .../lessons/reorder` `{lessonIds}`, `POST .../blocks/reorder` `{blockIds}` |
| `teacher.publishModule` | `POST /teacher/modules/{id}/publish` (422 if a lesson is empty) |
| load Module 1 for the demo | `POST /teacher/modules/import` with `content/module1_module.json` |
| `teacher.assignModule` | `POST /teacher/assignments` |
| assignments list | `GET /teacher/assignments?classroomId=&moduleId=` (has `studentCount`, `completedCount`) |
| `student.joinClassroom` | `POST /me/classrooms/join` `{code}` |
| student classroom list | `GET /me/classrooms` (has `assignmentCount`) |
| leave classroom | `DELETE /me/classrooms/{id}` |
| student assignments | `GET /me/assignments` |
| student modules | `GET /me/modules`, `GET /me/modules/{id}` (no solutions) |
| open a lesson | `POST /me/modules/{mid}/lessons/{lid}/attempts` |
| `student.recordActivity` | `POST /me/attempts/{attemptId}/blocks/{blockId}/answer` |
| "Continue" on a theory block | `POST /me/attempts/{attemptId}/continue` |
| `student.completeLesson` | `POST /me/attempts/{attemptId}/complete` |
| XP, hearts, streak | `GET /me/gamification` |
| `student.restoreHearts` | `POST /me/hearts/restore` |

## 2. Shapes that differ from the app's types

**Block.** The app keeps the activity fields flat; the API nests them under `activity`.

```ts
// app (flat)                         // API
{ kind: 'activity', title,            { kind: 'activity', title,
  activityType: 'multiple-choice',      activity: { type: 'multiple-choice',
  prompt, options, correctIndex,                    prompt, options, correctIndex,
  explanation, xp, hint, ... }                      explanation, xp, hint, ... } }
```

`instruction`, `prompt`, `options`, `answers`, `correctIndex`, `correctBool`, `explanation`, `pairs`, `steps`, `categories`, `xp`, `hint` all move inside `activity`. The other block fields (`kind`, `title`, `body`, `imageDescription`, `lumiComment`, `attachAsSupport`, `fileName`, `fileSize`, `url`) stay at the top. The server adds `id`, `position`, `lessonId`, `moduleId`.

| App | API |
|---|---|
| `Classroom.allowCommunity` | `allowJoinByCode` (not the same idea; map or add a toggle) |
| `Classroom.studentIds` | `studentCount` (list via `/members`) |
| `Classroom.code` `LUM-4821` | `LL-` plus 12 characters. Change the placeholder in the join screen. |
| `Assignment.dueDate` | `dueAt` (ISO 8601) |
| `Student.status`, `accuracy`, `streak`, `xp`, `lastActive` | same names in `/members` (`lastActive` is a date, format it) |
| ids like `c1`, `m1` | opaque strings from the server |

**What a student never receives:** `correctIndex`, `correctBool`, `answers`, `explanation`. The app must stop checking answers locally and use the answer endpoint. `explanation` arrives in the answer response.

## 3. Answering an activity

`POST /me/attempts/{attemptId}/blocks/{blockId}/answer`

```jsonc
{ "answer": { ... }, "clientEventId": "evt-123", "source": "online" }
```

| Activity | `answer` |
|---|---|
| `multiple-choice` | `{ "selectedIndex": 1 }` (a number; the app holds it as a string today) |
| `true-false` | `{ "value": true }` |
| `match-pairs` | `{ "matches": [{ "left": "cat", "right": "gato" }] }` |
| `order-steps` | `{ "order": ["first", "second"] }` |
| `fill-blanks` | `{ "values": ["sky"] }` (case, accents and extra spaces are ignored) |
| `classify` | `{ "assignments": [{ "item": "apple", "category": "Fruit" }] }` |

Response: `{ correct, earnedXp, explanation, hearts: {current, max}, attemptNumber, nextPosition, canContinue, serverSequence }`.
Send the same `clientEventId` when retrying: the server returns the stored answer and does not charge another heart.

**Lesson rules (same as the current screen):** a wrong answer costs a heart and the student retries the same block; a correct one moves forward; theory blocks use `/continue`; the last block ends with `/complete`. XP is earned once per activity, ever. Repeating a lesson never erases history.

## 4. Error codes worth handling

| Status | `error.code` | Meaning |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Missing or expired token: refresh it |
| 403 | `FORBIDDEN` | Wrong role |
| 404 | `NOT_FOUND` | Missing, or not yours (the API never says which) |
| 409 | `HEARTS_EXHAUSTED` | Show "Restore hearts" |
| 409 | `NOT_CURRENT_BLOCK` / `ACTIVITY_PENDING` / `LESSON_END` / `LESSON_INCOMPLETE` | The app and server disagree on the position: reload the attempt |
| 409 | `LESSON_EMPTY` | The lesson has no blocks |
| 409 | `ATTEMPT_CLOSED` | Already completed or restarted |
| 422 | `VALIDATION_ERROR` | Invalid body or answer shape |

## 5. Known limits of this MVP

- Match-pairs, order-steps and classify activities send the data needed to render them, so a technical user could read the solution from the response. Multiple choice, true/false and fill-in-the-blank are fully hidden.
- Pending e-mail invitations are stored but not accepted automatically when that person signs up; they can join with the class code.
- A student who leaves a classroom must be added again by the teacher.
- Hearts refill for free and instantly; streak days use UTC.
- Statistics are updated without a database transaction (fine for one student at a time).
- Not built yet: teacher dashboard, student home, community, downloads, notifications, file uploads, pagination.
