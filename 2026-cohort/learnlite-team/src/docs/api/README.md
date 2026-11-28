# LearnLite — Backend API Documentation

## 1. Document Information

Project: LearnLite Cloud Build

Document Type: Backend API Specification

Primary Technical Owner:
Elvis Ncube — Cloud Services, Integration & Synchronization

Supporting Engineers:
- Harold Ormeño — Frontend and Offline Application
- Reshma Thomas — AI Content and Learning Requirements
- Ernest Lukheli — Integration Testing and Evaluation
- Aashma Lama — Security and Governance

Document Status: PROPOSED

API Version: v1

---

## 2. API Overview

The LearnLite API provides a secure communication layer
between the learner application and Google Cloud services.

The backend is proposed to run on Google Cloud Run.

Its responsibilities include:

- Learner profile management.
- Lesson catalogue retrieval.
- Learning progress management.
- Offline synchronization.
- Educational content access.
- AI-assisted learning requests.
- Request validation.
- Authentication and authorization.
- Secure database interactions.

The frontend must not access sensitive backend
credentials or privileged cloud operations directly.

---

## 3. Proposed API Architecture

```text
          LEARNER APPLICATION
                  |
                  v
             HTTPS REQUEST
                  |
                  v
          GOOGLE CLOUD RUN
                  |
                  v
             BACKEND API
                  |
       +----------+-----------+
       |          |           |
       v          v           v
   FIRESTORE   CLOUD       NVIDIA
   DATABASE    STORAGE     AI SERVICE
       |          |           |
       +----------+-----------+
                  |
                  v
             API RESPONSE
                  |
                  v
          LEARNER APPLICATION
```

---

## 4. API Base URL

Development:

http://localhost:8080/api/v1

Deployed environment:

https://YOUR-CLOUD-RUN-URL/api/v1

The deployed URL is a placeholder and will be
updated after Cloud Run deployment.

Production traffic must use HTTPS.

---

## 5. API Design Standards

### 5.1 Communication Protocol

Use:
- HTTPS
- REST-style HTTP endpoints
- JSON request and response bodies

### 5.2 Supported HTTP Methods

GET:
Retrieve resources.

POST:
Create resources or submit operations.

PATCH:
Partially update resources.

DELETE:
Delete resources where authorized and appropriate.

### 5.3 Response Format

Proposed successful response:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Proposed error response:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data."
  }
}
```

This response structure is a proposed team convention.

The exact contract must be approved before implementation.

---

## 6. Proposed API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /health | Service health check |
| GET | /lessons | Retrieve available lessons |
| GET | /lessons/:lessonId | Retrieve lesson information |
| GET | /learners/:learnerId | Retrieve authorized learner profile |
| POST | /learners | Create learner profile |
| GET | /learners/:learnerId/progress | Retrieve learner progress |
| POST | /progress | Submit learning progress |
| POST | /sync | Synchronize queued offline events |
| POST | /ai/learning-support | Request AI-assisted learning support |

Except for the health route, these endpoint paths
are provisional and require team approval.

They should not be treated as implemented APIs.

---

## 7. Health Check API

### Endpoint

GET /api/v1/health

### Purpose

Confirm that the backend application is responding.

### Example Request

```http
GET /api/v1/health HTTP/1.1
```

### Example Response

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "learnlite-api",
    "version": "1.0.0"
  },
  "error": null
}
```

### Expected HTTP Status

200 OK

### Security

The public health endpoint must not expose:

- Environment variables.
- API keys.
- Database credentials.
- Internal network information.
- Sensitive configuration.

Dependency readiness checks should be separated
from public health information where appropriate.

---

## 8. Lesson Catalogue API

### Endpoint

GET /api/v1/lessons

### Purpose

Retrieve approved educational lessons available
to an authorized learner.

### Example Response

```json
{
  "success": true,
  "data": {
    "lessons": [
      {
        "lessonId": "LESSON-001",
        "title": "Introduction to Mathematics",
        "subject": "Mathematics",
        "ageGroup": "14-16",
        "availableOffline": true
      },
      {
        "lessonId": "LESSON-002",
        "title": "Basic Reading Skills",
        "subject": "Language",
        "ageGroup": "14-16",
        "availableOffline": true
      }
    ]
  },
  "error": null
}
```

### Expected Behavior

- Return only approved content.
- Support appropriate filtering and pagination.
- Use stable lesson identifiers.
- Avoid exposing unpublished resources.
- Return predictable error responses.

---

## 9. Individual Lesson API

### Endpoint

GET /api/v1/lessons/:lessonId

### Example Request

```http
GET /api/v1/lessons/LESSON-001 HTTP/1.1
```

### Example Response

```json
{
  "success": true,
  "data": {
    "lessonId": "LESSON-001",
    "title": "Introduction to Mathematics",
    "subject": "Mathematics",
    "contentVersion": 1,
    "downloadable": true,
    "contentReference": "lesson-content-001"
  },
  "error": null
}
```

### Requirements

The backend must:

- Validate the lesson identifier.
- Check content publication status.
- Enforce applicable access restrictions.
- Return approved content metadata.
- Handle missing lessons safely.

Content downloads may require a separate
authorized download mechanism.

The team must define that mechanism before release.

---

## 10. Learner Profile API

### Endpoint

POST /api/v1/learners

### Purpose

Create a learner profile using the approved
identity and authorization model.

### Example Request

```json
{
  "displayName": "Synthetic Learner A",
  "profileType": "learner"
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "learnerId": "LRN-001",
    "displayName": "Synthetic Learner A",
    "profileType": "learner"
  },
  "error": null
}
```

### Requirements

- Validate submitted information.
- Generate server-controlled identifiers.
- Prevent unauthorized profile creation.
- Protect learner personal information.
- Enforce shared-device access rules.
- Minimize collection of personal information.

The authentication and learner identity
mechanism must be agreed before implementation.

---

## 11. Learner Progress API

### Endpoint

POST /api/v1/progress

### Purpose

Record learner activity and lesson progress.

### Example Request

```json
{
  "eventId": "EVENT-001",
  "learnerId": "LRN-001",
  "lessonId": "LESSON-001",
  "activityId": "ACTIVITY-001",
  "completionPercentage": 60,
  "completionStatus": "in_progress",
  "clientUpdatedAt": "2026-11-06T08:30:00Z"
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "eventId": "EVENT-001",
    "status": "saved",
    "serverReceivedAt": "2026-11-06T08:30:02Z"
  },
  "error": null
}
```

### Required Validation

The backend must verify:

- The caller is authorized for the learner.
- The lesson exists.
- The activity identifier is valid.
- Completion percentage is within 0-100.
- Required fields are present.
- Submitted values use expected types.
- Repeated events are processed safely.

Client-provided timestamps must not be treated
as authoritative proof of when learning occurred.

---

## 12. Offline Synchronization API

### Endpoint

POST /api/v1/sync

### Purpose

Synchronize locally stored learner activity
with the backend after connectivity returns.

### Example Request

```json
{
  "deviceId": "DEVICE-001",
  "learnerId": "LRN-001",
  "events": [
    {
      "eventId": "EVENT-001",
      "lessonId": "LESSON-001",
      "activityId": "ACTIVITY-001",
      "completionPercentage": 60,
      "clientUpdatedAt": "2026-11-06T08:30:00Z"
    },
    {
      "eventId": "EVENT-002",
      "lessonId": "LESSON-001",
      "activityId": "ACTIVITY-002",
      "completionPercentage": 100,
      "clientUpdatedAt": "2026-11-06T08:45:00Z"
    }
  ]
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "acceptedEventIds": [
      "EVENT-001",
      "EVENT-002"
    ],
    "rejectedEvents": [],
    "serverTimestamp": "2026-11-06T08:46:00Z"
  },
  "error": null
}
```

### Synchronization Requirements

The backend must:

1. Authenticate the caller.
2. Verify learner access permissions.
3. Validate the event batch.
4. Identify previously processed events.
5. Process accepted events safely.
6. Reject invalid or unauthorized changes.
7. Return event-level acknowledgements.
8. Preserve data integrity during retries.
9. Avoid unintended duplicate progress updates.
10. Provide information needed for recovery.

### Idempotency

Every synchronization event must contain
a stable unique event identifier.

Repeated delivery of the same event must not
create duplicated progress.

The backend must maintain sufficient processing
state to recognize repeated event submissions.

### Partial Failures

A batch may contain both valid and invalid events.

The client must remove only acknowledged events
from its local pending queue.

Rejected or unacknowledged events must be
handled according to the defined retry policy.

### Conflict Resolution

The final synchronization model must establish:

- Event ordering rules.
- Version comparison.
- Server-side validation.
- Conflict detection.
- Accepted update behavior.
- Retry handling.
- Learner progress preservation.

These rules are not finalized.

---

## 13. Retrieve Learner Progress

### Endpoint

GET /api/v1/learners/:learnerId/progress

### Example Response

```json
{
  "success": true,
  "data": {
    "learnerId": "LRN-001",
    "progress": [
      {
        "lessonId": "LESSON-001",
        "completionPercentage": 60,
        "completionStatus": "in_progress"
      }
    ]
  },
  "error": null
}
```

### Requirements

- Verify caller authorization.
- Return only permitted learner records.
- Use stable lesson identifiers.
- Support the agreed pagination strategy.
- Prevent cross-learner data exposure.

---

## 14. AI Learning Support API

### Endpoint

POST /api/v1/ai/learning-support

### Purpose

Provide access to approved AI-assisted
learning functionality through the backend.

### Example Request

```json
{
  "lessonId": "LESSON-001",
  "requestType": "explanation",
  "question": "Explain fractions using simple examples."
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "status": "pending_review",
    "contentId": "AI-CONTENT-001",
    "content": "A fraction represents part of a whole."
  },
  "error": null
}
```

### Requirements

- Validate request fields.
- Enforce authentication and authorization.
- Prevent API key exposure.
- Apply request size and usage limits.
- Handle external AI service failures.
- Validate response structure.
- Apply educational safety requirements.
- Support educator approval where required.
- Avoid sending unnecessary learner personal data.

The example response represents a proposed
review workflow, not an implemented service.

The team must decide whether AI-generated content
is delivered directly, reviewed before delivery,
or restricted to educator-facing workflows.

---

## 15. Authentication and Authorization

The backend must not trust learnerId or deviceId
values as proof of identity.

Protected operations require an approved
authentication mechanism.

Authorization must confirm:

- Who is making the request.
- Which learner records they may access.
- Which operations they may perform.
- Whether their current session is valid.

Potential authentication technology:
Firebase Authentication or another approved provider.

The final provider has not been selected.

---

## 16. HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Successful request |
| 201 | Resource successfully created |
| 400 | Invalid request |
| 401 | Authentication required or invalid |
| 403 | Access denied |
| 404 | Resource not found |
| 409 | Conflict |
| 429 | Too many requests |
| 500 | Internal server error |
| 503 | Service temporarily unavailable |

All error responses should avoid disclosing
sensitive system information.

---

## 17. API Security Requirements

All APIs must:

- Use HTTPS in deployed environments.
- Validate request payloads.
- Enforce authorization.
- Protect against excessive requests.
- Avoid exposing secrets.
- Apply appropriate CORS restrictions.
- Return safe error messages.
- Use least-privilege cloud identities.
- Protect access to learner records.

Publicly reachable Cloud Run endpoints
must still enforce application-level
authentication where required.

---

## 18. API Testing Requirements

Integration tests should verify:

- Valid API requests.
- Invalid payload rejection.
- Unauthorized access rejection.
- Database write and read operations.
- Duplicate synchronization handling.
- Partial synchronization failures.
- AI service timeouts.
- Missing educational content.
- Backend recovery after failures.

Related documentation:

tests/integration/README.md

tests/e2e/README.md

tests/fixtures/README.md

---

## 19. API Versioning

Initial proposed API version:

v1

Base path:

/api/v1

Breaking changes must be documented and
coordinated with frontend and testing teams.

API contracts must be updated before
dependent integrations are merged.

---

## 20. Developer Collaboration

### Elvis

Responsible for:
- Backend implementation.
- API endpoint development.
- Firestore integration.
- Cloud Storage integration.
- Synchronization services.
- Cloud deployment.

### Harold

Responsible for:
- Frontend API consumption.
- Offline request handling.
- Local storage.
- Synchronization status interfaces.

### Reshma

Responsible for:
- AI learning requirements.
- Educational content specifications.
- AI response evaluation criteria.

### Ernest

Responsible for:
- API integration tests.
- Synthetic test fixtures.
- Error scenario validation.
- Reliability testing.

### Aashma

Responsible for:
- Security requirements.
- Access-control oversight.
- Governance and approvals.

---

## 21. API Acceptance Criteria

An API component is ready for integration when:

- Endpoint behavior is documented.
- Request schema is agreed.
- Response schema is agreed.
- Authentication is implemented where required.
- Authorization is validated.
- Error handling is implemented.
- Integration tests pass.
- No secrets are exposed.
- Dependent teams have reviewed the contract.

---

## 22. Open API Decisions

The team must confirm:

1. Authentication provider.
2. Exact endpoint naming.
3. Final request and response schemas.
4. Firestore collection structure.
5. Synchronization conflict rules.
6. Pagination strategy.
7. API rate limits.
8. AI content approval workflow.
9. Download authorization mechanism.
10. API deployment URL.

---

## 23. Current Status

Status: PROPOSED

The initial LearnLite API specification
has been documented.

No endpoint should be considered implemented
until corresponding application code,
tests and deployment evidence exist.
