# LearnLite — End-to-End Testing

## 1. Overview

This directory contains end-to-end (E2E) tests
for the LearnLite learning platform.

End-to-end tests simulate realistic learner and
educator interactions with the complete application.

The objective is to confirm that LearnLite delivers
a reliable learning experience across online,
offline and shared-device environments.

## 2. Ownership

Primary Owner:
Ernest Lukheli — Synthetic Data, Monitoring & Evaluation

Supporting Engineers:
- Harold Ormeño — Learner interface and offline functionality
- Elvis Ncube — Backend, cloud infrastructure and synchronization
- Reshma Thomas — Learning workflows and AI content evaluation
- Aashma Lama — Security requirements and delivery oversight

## 3. Testing Objectives

End-to-end testing must validate:

- Application accessibility.
- Learner profile selection.
- Lesson discovery and navigation.
- Lesson downloads.
- Offline lesson access.
- Learning activity completion.
- Local progress persistence.
- Network disconnection and reconnection.
- Automatic or user-initiated synchronization.
- Shared-device learner separation.
- Recovery from unexpected application closure.
- Appropriate handling of application errors.

## 4. Critical Learner Journeys

### Journey 1: First-Time Learner Access

Scenario:
A learner opens LearnLite for the first time.

Steps:
1. Open the application.
2. Access the learner profile flow.
3. Create or select a synthetic learner profile.
4. Navigate to the lesson catalogue.
5. Open an available lesson.

Expected Result:
The learner reaches the lesson successfully.

### Journey 2: Download a Lesson

Scenario:
A learner prepares educational content
for offline use.

Steps:
1. Connect the device to the internet.
2. Open the lesson catalogue.
3. Select an approved lesson.
4. Start the download.
5. Wait for download completion.
6. Verify the lesson is marked as available offline.

Expected Result:
The lesson becomes available for offline access.

### Journey 3: Complete a Lesson Offline

Scenario:
A learner studies without internet connectivity.

Steps:
1. Download a lesson while online.
2. Disconnect the device from the internet.
3. Open the downloaded lesson.
4. Complete learning activities.
5. Save or submit progress locally.
6. Close the application.
7. Reopen the application while still offline.

Expected Result:
Completed activities and progress remain available
without requiring internet connectivity.

### Journey 4: Synchronize Progress After Reconnection

Scenario:
A learner completes an activity offline
and reconnects later.

Steps:
1. Open a previously downloaded lesson.
2. Disconnect the internet connection.
3. Complete an activity.
4. Verify that progress is stored locally.
5. Restore network connectivity.
6. Trigger or wait for synchronization.
7. Verify synchronization status.
8. Confirm saved progress through the backend.

Expected Result:
The progress record synchronizes successfully
without duplicate or missing activity records.

### Journey 5: Multiple Learners on One Device

Scenario:
Two learners share the same device.

Steps:
1. Create or select Learner A.
2. Complete an activity as Learner A.
3. Switch to Learner B.
4. Complete a different activity.
5. Return to Learner A.
6. Review Learner A's progress.
7. Return to Learner B.
8. Review Learner B's progress.

Expected Result:
Each learner sees only their own progress,
and records remain correctly separated.

### Journey 6: Interrupted Synchronization

Scenario:
The internet disconnects during synchronization.

Steps:
1. Complete an offline learning activity.
2. Restore connectivity.
3. Start synchronization.
4. Interrupt the network during transmission.
5. Confirm the application remains usable.
6. Restore connectivity.
7. Retry synchronization.

Expected Result:
No completed learner progress is lost or duplicated.

### Journey 7: Application Recovery

Scenario:
The application closes unexpectedly.

Steps:
1. Open an offline lesson.
2. Complete part of an activity.
3. Allow the application to persist progress.
4. Close the application unexpectedly.
5. Reopen the application.
6. Return to the learner profile.
7. Inspect saved progress.

Expected Result:
All previously persisted progress remains available.

### Journey 8: AI-Assisted Learning

Scenario:
A learner requests an AI-assisted learning experience.

Steps:
1. Open the relevant learning activity.
2. Submit a valid learning request.
3. Verify the application handles the request.
4. Inspect the displayed response.
5. Confirm appropriate error handling if AI is unavailable.

Expected Result:
The application responds correctly, without exposing
credentials or displaying unapproved learning material.

Note:
AI output quality and educational suitability
require separate evaluation and educator review.

## 5. End-to-End Test Cases

| Test ID | Test Scenario | Expected Result | Priority |
|---------|---------------|-----------------|----------|
| E2E-001 | Application launches | Application loads | Critical |
| E2E-002 | Learner profile selected | Correct profile displayed | Critical |
| E2E-003 | Lesson downloaded | Available offline | Critical |
| E2E-004 | Lesson opened offline | Content accessible | Critical |
| E2E-005 | Offline activity completed | Progress saved locally | Critical |
| E2E-006 | App restarted offline | Progress preserved | Critical |
| E2E-007 | Connectivity restored | Synchronization completes | Critical |
| E2E-008 | Two learners share device | Profiles remain isolated | Critical |
| E2E-009 | Connection fails during sync | Progress recoverable | Critical |
| E2E-010 | AI service unavailable | Graceful error handling | High |

## 6. Device and Connectivity Testing

LearnLite should be tested under realistic conditions.

### Device Conditions
- Mobile devices.
- Small-screen devices.
- Desktop browsers.
- Devices with limited storage.
- Shared-device usage scenarios.

### Network Conditions
- Stable Wi-Fi connection.
- Slow connection.
- High latency.
- Intermittent connectivity.
- Complete offline mode.
- Reconnection after extended offline use.

### Browser Conditions
- Chrome.
- Edge.
- Firefox.
- Other supported browsers agreed by the team.

Note:
Browser compatibility requirements should be confirmed
before defining the final test matrix.

## 7. Proposed Automation Tools

Recommended options:

- Playwright
- TypeScript
- GitHub Actions

Playwright can automate browser interactions
and simulate network interruptions.

Some device, browser and connectivity scenarios
will still require manual or specialized testing.

## 8. Test Execution Process

1. Deploy the test application.
2. Prepare synthetic learner profiles.
3. Confirm backend test services are available.
4. Run automated learner journeys.
5. Run required manual device checks.
6. Collect test results.
7. Record defects.
8. Assign issues to responsible engineers.
9. Retest completed fixes.
10. Publish the E2E testing report.

## 9. Acceptance Criteria

The E2E testing milestone is complete when:

- All critical learner journeys pass.
- Offline lessons remain accessible.
- Saved progress survives application restarts.
- Synchronization does not lose completed activities.
- Shared learner profiles remain isolated.
- Critical security scenarios pass.
- No unresolved release-blocking defects remain.

## 10. Defect Reporting

All defects should be recorded as GitHub Issues.

Recommended issue fields:

- Test case ID.
- Description.
- Steps to reproduce.
- Expected behavior.
- Actual behavior.
- Device or browser.
- Network conditions.
- Screenshots or logs where appropriate.
- Severity.
- Assigned engineer.
- Resolution status.

## 11. Current Status

Status: PLANNED

End-to-end testing architecture initialized.

Automated tests will be implemented as the
frontend, backend and synchronization features
become available.
