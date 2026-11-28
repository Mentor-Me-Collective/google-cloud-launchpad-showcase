#  LEARNLITE — AI BUILD PROMPTS

## HACKATHON MVP PROMPT LIBRARY

Development Platform: Newly

Application: LearnLite

Mission: Learning Without Barriers.

IMPORTANT:

Use these prompts sequentially.

Wait for each feature to be generated,
then test it before proceeding.

Do not use Google Cloud Platform.

---

# PROMPT 1 — BUILD THE LEARNLITE MVP

Build a beautiful, functional, mobile-first
educational application called LearnLite.

PROJECT VISION:

LearnLite empowers students in communities
with unreliable internet connectivity to
continue learning anytime and anywhere.

The application must prioritize offline
learning, educational accessibility,
simplicity and reliability.

TARGET USERS:

Students with:
- Unreliable internet connectivity.
- Limited mobile data.
- Entry-level smartphones.
- Limited access to digital learning resources.

DESIGN STYLE:

Create a premium, modern educational UI.

Use:
- Deep navy blue.
- Vibrant blue.
- Fresh green accents.
- White backgrounds.
- Rounded cards.
- Clean typography.
- Smooth, subtle transitions.

The interface must feel polished,
friendly, trustworthy and inspiring.

APPLICATION SCREENS:

1. Welcome Screen

Include:
- LearnLite branding.
- Tagline: Learning Without Barriers.
- Welcome message.
- Get Started button.

2. Student Dashboard

Include:
- Student welcome message.
- My Learning Modules.
- Continue Learning button.
- Learning progress percentage.
- Offline/Online status indicator.
- Lessons available offline.

3. Learning Modules

Create Module 1.

Include:
- Lesson 1.
- Lesson 4.
- Lesson titles.
- Lesson descriptions.
- Download lesson buttons.
- Completion status.

4. Lesson Reader

Include:
- Clean reading interface.
- Learning objectives.
- Lesson sections.
- Previous and Next navigation.
- Mark as Complete button.
- Progress-saving functionality.

5. Learning Progress

Include:
- Completed lessons.
- Lessons in progress.
- Progress percentage.
- Last learning activity.
- Sync status.

CORE FUNCTIONALITY:

The application must allow learners to:

- Open learning modules.
- Download lessons.
- Read downloaded lessons offline.
- Continue from saved progress.
- Mark lessons as complete.
- View learning progress.

Use persistent local storage.

Do not rely only on temporary application state.

Use accessible, responsive components.

TECHNICAL REQUIREMENTS:

- Build a functional application.
- Prioritize the core learning journey.
- Avoid unnecessary dependencies.
- Keep components organized.
- Make offline functionality testable.
- Use demo student information.
- Avoid external Google Cloud services.

CRITICAL:

This is a two-hour hackathon MVP.

Build working functionality before
adding advanced features.

Start by generating the application.

---

# PROMPT 2 — OFFLINE LEARNING ENGINE

Improve the existing LearnLite application.

Do not rebuild the application from scratch.

Implement real offline learning functionality.

REQUIREMENTS:

1. LESSON DOWNLOAD

Allow users to save lessons for offline access.

Use persistent storage supported by
the generated application environment.

2. OFFLINE ACCESS

Downloaded lessons must remain accessible
after internet connectivity is disabled.

3. PROGRESS PERSISTENCE

Save:
- Learner ID.
- Lesson ID.
- Completion status.
- Progress percentage.
- Last updated timestamp.

4. RESUME LEARNING

When a learner closes and reopens the app,
restore their saved lesson and progress.

5. CONNECTION STATUS

Display:
- Online.
- Offline.
- Pending Sync.
- Synced.

Do not confuse local saving with
successful cloud synchronization.

6. ERROR HANDLING

If internet connectivity disappears:

- Do not erase saved lessons.
- Do not erase progress.
- Do not block offline learning.
- Explain that progress is saved locally.

IMPORTANT:

If the application is web-based,
use appropriate persistent browser storage
such as IndexedDB.

If the application is native mobile,
use supported persistent device storage.

Do not use localStorage as the only storage
mechanism for large lesson downloads.

TEST:

Simulate internet disconnection.

Verify that downloaded lessons remain readable.

Verify that progress survives app restart.

Return a summary of what is implemented
and what has actually been tested.

---

# PROMPT 3 — SUPABASE PROGRESS SYNCHRONIZATION

Enhance the existing LearnLite application.

Do not replace or damage offline functionality.

Use Newly's supported Supabase integration
if available.

OBJECTIVE:

Synchronize offline learning progress when
internet connectivity is restored.

DATA STRUCTURE:

Create a learner progress record containing:

- event_id
- learner_id
- lesson_id
- progress_percentage
- completed
- updated_at
- synced_at

FUNCTIONAL REQUIREMENTS:

1. Save progress locally first.

2. Queue unsynchronized changes.

3. Detect when internet connectivity returns.

4. Attempt to upload pending progress records.

5. Confirm successful server persistence.

6. Mark records Synced only after
   confirmed successful synchronization.

7. Keep unsynchronized changes if a
   synchronization attempt fails.

8. Prevent duplicate records from retries
   using a unique event ID.

9. Display accurate sync status.

SECURITY:

- Use demo accounts or synthetic data.
- Enable Row Level Security where appropriate.
- Protect private learner records.
- Do not expose service-role credentials.
- Never place secret keys in client code.

IMPORTANT:

If backend connectivity is unavailable,
preserve the fully functional offline MVP.

Do not generate fake synchronization results.

Show real synchronization evidence
when the integration works.

---

# PROMPT 4 — FINAL HACKATHON POLISH & TEST

Review the complete LearnLite MVP.

Your objective is to make the application
demonstration-ready.

Do not rebuild working features.

PRIORITIES:

1. Fix broken navigation.
2. Fix lesson-loading problems.
3. Verify persistent offline progress.
4. Verify progress synchronization if enabled.
5. Improve mobile responsiveness.
6. Improve visual consistency.
7. Remove unnecessary placeholder content.
8. Ensure clear connection-status indicators.
9. Add meaningful empty and error states.
10. Make the interface accessible and readable.

DEMONSTRATION JOURNEY:

Step 1:
Open LearnLite.

Step 2:
Download Module 1 Lesson 1.

Step 3:
Start learning.

Step 4:
Disable internet connectivity.

Step 5:
Continue learning and save progress.

Step 6:
Reopen the application and reconnect.

Step 7:
Display preserved progress and, if available,
the confirmed synchronized progress record.

CRITICAL RULE:

Do not simulate working functionality
by changing labels without saving real data.

Do not report features as completed unless
their behavior has been verified.

Keep the MVP simple, stable and impressive.

Provide a final report showing:

- Working features.
- Features tested.
- Known limitations.
- Features deferred until after the hackathon.
