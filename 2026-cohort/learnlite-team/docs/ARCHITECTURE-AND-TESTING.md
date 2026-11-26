# LearnLite — Architecture and Validation

## Architecture Overview

```text
Expo / React Native Application
            |
      Firebase Auth
            |
      Authenticated HTTPS
            |
   Google Cloud Run / FastAPI
            |
       Cloud Firestore
            |
  Classrooms / Modules / Users
  Attempts / XP / Offline Items
```

## Offline Sync

Client-side sync engine:
- Queues offline operations
- Retains queued operations after network failures
- Handles retry and conflict responses
- Separates queues for different users

Backend:
- POST /api/v1/sync/push
- GET /api/v1/sync/pull
- Student role verification
- Classroom membership verification
- Firestore transactional writes
- Duplicate operation protection
- Revision-based conflict detection

## Known Integration Boundary

The synchronization service stores revision-aware offline
items separately from the newer lesson completion, attempt
and gamification records.

A successful sync operation does not, by itself, prove
automatic XP awarding or lesson completion.

This behavior must be considered during final frontend
integration and offline user-experience testing.

## Staging Validation

Project: learnlite-514514

Region: africa-south1

Cloud Run service: learnlite-api-staging

Verified revision: learnlite-api-staging-00002-p5x

Source commit: 9c6abac

### Recorded Tests

| Test area | Result |
|---|---|
| Backend regression tests | 123 passed |
| Offline sync-engine tests | 8 passed |
| Live authorization checks | 11 passed |
| Teacher-to-student E2E checks | 13 passed |
| Live synchronization | Passed |
| Staging health | HTTP 200 |
| Configured-origin CORS preflight | Passed |

### Evidence References

Learning workflow run: bd699cc0

Offline synchronization run: 236d5f7b6c

The detailed local test records are stored in the
engineering Cloud Shell environment and are not included
in this public submission.

## Release Considerations

- The staging service is publicly reachable.
- Protected API endpoints enforce Firebase authorization.
- A final security review should include the deployment
  access model and any newly introduced configuration.
- The currently verified browser origin is
  http://localhost:8081.
- Additional frontend origins require CORS configuration.
- Final mobile integration and offline/reconnect tests
  remain application-level acceptance activities.
