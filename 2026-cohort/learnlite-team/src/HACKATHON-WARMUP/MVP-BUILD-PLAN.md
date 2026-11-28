# ⚡ LEARNLITE — TWO-HOUR MVP BUILD PLAN

## PRIMARY OBJECTIVE

Build a functional offline-first learning MVP
using Newly.

Total Hackathon Duration: 120 Minutes.

---

## PHASE 1 — PROJECT INITIALIZATION

TIME: 0–15 MINUTES

Tasks:

- Open the hackathon development environment.
- Confirm platform access.
- Create the LearnLite project.
- Agree on the MVP features.
- Assign feature ownership.
- Generate the initial application.

Expected Result:

A working LearnLite application shell.

---

## PHASE 2 — STUDENT EXPERIENCE

TIME: 15–35 MINUTES

Tasks:

- Create student dashboard.
- Create learning module page.
- Create lesson reader.
- Add Lessons 1 and 4.
- Add Continue Learning functionality.

Expected Result:

A student can open and navigate lessons.

---

## PHASE 3 — OFFLINE LEARNING

TIME: 35–55 MINUTES

Tasks:

- Add lesson download functionality.
- Store lesson content locally.
- Save learning progress locally.
- Display Offline status.
- Retain progress after reopening the app.

Expected Result:

Learning continues without internet access.

IMPORTANT:

Downloaded lessons must actually be available
offline, not merely appear downloaded.

---

## PHASE 4 — SYNCHRONIZATION

TIME: 55–80 MINUTES

Tasks:

- Configure Newly's available backend.
- Use Supabase if needed and available.
- Create progress records.
- Queue unsynchronized progress.
- Sync pending records after reconnection.
- Confirm successful server persistence.

Expected Result:

Learning progress synchronizes after
connectivity returns.

If backend configuration becomes a blocker,
prioritize working offline persistence.

Never show a fake successful sync state.

---

## PHASE 5 — INTEGRATION & TESTING

TIME: 80–100 MINUTES

Tasks:

- Test the complete learner journey.
- Verify the content.
- Test disconnected learning.
- Test application restart.
- Verify progress persistence.
- Verify real synchronization if implemented.
- Fix critical defects.

Expected Result:

One reliable MVP demonstration.

---

## PHASE 6 — POLISH

TIME: 100–110 MINUTES

Tasks:

- Improve interface consistency.
- Check mobile responsiveness.
- Remove broken functionality.
- Verify navigation.
- Prepare presentation.

Expected Result:

A stable, professional prototype.

---

## PHASE 7 — PRESENTATION

TIME: 110–120 MINUTES

Tasks:

- Introduce the problem.
- Demonstrate LearnLite.
- Show offline learning.
- Show saved progress.
- Demonstrate syncing if available.
- Explain future potential.

Expected Result:

A compelling working MVP demonstration.

---

## NON-NEGOTIABLE REQUIREMENTS

The minimum MVP must:

1. Display lesson content.
2. Allow lesson access offline.
3. Save progress persistently.
4. Resume learning correctly.

Backend synchronization is the next priority.

Do not sacrifice the core offline experience
to build unnecessary features.

## IMPORTANT

No external Google Cloud Platform services
are required for this hackathon.
