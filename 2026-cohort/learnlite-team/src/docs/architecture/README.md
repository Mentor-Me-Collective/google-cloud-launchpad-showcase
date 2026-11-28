# LearnLite — System Architecture Documentation

## 1. Document Information

Project: LearnLite Cloud Build

Document Type: System Architecture

Primary Technical Owner:
Elvis Ncube — Cloud Services, Integration & Synchronization

Supporting Team:
- Aashma Lama — Team Leadership and Security
- Harold Ormeño — Learner Experience and Offline Application
- Reshma Thomas — Learning Product, Content and AI Evaluation
- Ernest Lukheli — Synthetic Data, Monitoring and Evaluation

Document Status: PROPOSED

Version: 1.0

---

## 2. Project Overview

LearnLite is an offline-first, AI-assisted learning platform
designed to support educational access in low-connectivity
and resource-constrained environments.

The platform aims to allow learners to download lessons,
continue learning without an internet connection, save
progress locally and synchronize their records when
connectivity becomes available.

LearnLite will use Google Cloud for application hosting,
data storage, synchronization and monitoring.

NVIDIA AI capabilities are proposed to support
AI-assisted educational content and learning experiences.

The architecture must prioritize accessibility,
reliability, privacy, security and scalability.

---

## 3. Architecture Objectives

The LearnLite architecture must:

1. Support learning without continuous internet access.
2. Preserve learner progress during network interruptions.
3. Synchronize progress safely after reconnection.
4. Support multiple learner profiles on shared devices.
5. Deliver educational content to low-resource devices.
6. Provide secure backend services.
7. Integrate Google Cloud and NVIDIA capabilities.
8. Support monitoring and operational troubleshooting.
9. Protect learner information.
10. Allow independent development of system components.

---

## 4. Proposed Technology Stack

### 4.1 Frontend

Proposed Technologies:
- React
- TypeScript
- Progressive Web Application (PWA)
- IndexedDB
- Service Workers

Responsibilities:
- Display the learner interface.
- Load educational lessons.
- Cache approved educational content.
- Save learner activity locally.
- Track offline synchronization status.
- Support shared-device learner profiles.
- Communicate with backend APIs.

Owner:
Harold Ormeño

### 4.2 Backend

Proposed Technologies:
- Node.js
- TypeScript
- Google Cloud Run

Responsibilities:
- Expose application APIs.
- Validate incoming requests.
- Enforce authentication and authorization.
- Manage learner records.
- Process synchronization requests.
- Access Firestore and Cloud Storage.
- Integrate AI services.
- Return standardized API responses.

Owner:
Elvis Ncube

### 4.3 Data Storage

Proposed Technologies:
- Google Cloud Firestore
- Google Cloud Storage
- IndexedDB

Firestore:
Stores structured application records such as
learner profiles, lesson metadata, progress records
and synchronization metadata.

Cloud Storage:
Stores approved educational files and downloadable
learning resources.

IndexedDB:
Stores offline learner information, cached lesson
metadata and unsynchronized progress on devices.

### 4.4 AI Services

Proposed Platform:
- NVIDIA AI services

Responsibilities:
- Support approved AI-assisted learning features.
- Process learning-related requests.
- Return structured AI responses.
- Support evaluation of educational output.

Owner:
Reshma Thomas

Backend Integration:
Elvis Ncube

AI-generated educational content must pass
the required validation and educator review
before publication.

### 4.5 Infrastructure

Proposed Google Cloud Services:
- Cloud Run
- Firestore
- Cloud Storage
- Secret Manager
- IAM
- Artifact Registry
- Cloud Logging
- Cloud Monitoring

Owner:
Elvis Ncube

### 4.6 Testing and Observability

Proposed Technologies:
- Playwright
- Vitest or Jest
- GitHub Actions
- Cloud Logging
- Cloud Monitoring

Owner:
Ernest Lukheli

---

## 5. High-Level System Architecture

```text
                  LEARNLITE PLATFORM

                       LEARNER
                          |
                          v
                +--------------------+
                | Learner Web App    |
                | React + TypeScript |
                | PWA                |
                +--------------------+
                          |
              +-----------+-----------+
              |                       |
              v                       v
      +----------------+     +------------------+
      | Local Storage  |     | Service Worker   |
      | IndexedDB      |     | Offline Caching  |
      +----------------+     +------------------+
              |
              v
      +--------------------+
      | Synchronization    |
      | Engine             |
      +--------------------+
              |
              | HTTPS when online
              v
      +--------------------+
      | Google Cloud Run   |
      | Backend API        |
      +--------------------+
              |
      +-------+--------+----------------+
      |                |                |
      v                v                v
 +-----------+  +-------------+  +--------------+
 | Firestore |  | Cloud       |  | NVIDIA AI    |
 | Database  |  | Storage     |  | Integration  |
 +-----------+  +-------------+  +--------------+
              |
              v
      +--------------------+
      | Cloud Logging      |
      | Cloud Monitoring   |
      +--------------------+
```

Note:
Monitoring collects telemetry from the supported
application and cloud components. It is not a
sequential processing step after database storage.

---

## 6. Application Architecture

### 6.1 Frontend Application

Location:
apps/web/

Responsibilities:
- Learner navigation.
- Profile selection.
- Lesson catalogue.
- Offline lesson access.
- Activity completion.
- Progress visualization.
- Synchronization status.
- Error and recovery interfaces.

### 6.2 Backend API

Location:
apps/api/

Responsibilities:
- API request processing.
- Data validation.
- Authentication and authorization.
- Database operations.
- Synchronization processing.
- Cloud Storage access.
- AI service integration.

### 6.3 Shared Packages

Location:
packages/shared/

Responsibilities:
- Shared TypeScript interfaces.
- Standardized data models.
- Validation schemas.
- Common API contracts.
- Shared application constants.

### 6.4 Synchronization Engine

Location:
packages/sync-engine/

Responsibilities:
- Manage pending offline changes.
- Queue synchronization events.
- Track synchronization state.
- Retry failed requests.
- Prevent duplicate operations.
- Handle synchronization conflicts.
- Preserve local progress until acknowledged.

### 6.5 AI Content Services

Location:
services/ai-content/

Responsibilities:
- Define AI learning workflows.
- Establish expected response formats.
- Maintain evaluation criteria.
- Validate educational output.
- Support educator approval requirements.

---

## 7. Offline-First Learning Architecture

Offline operation is a core requirement of LearnLite.

The application must remain functional for supported
learning activities without continuous connectivity.

### 7.1 Offline Learning Workflow

```text
Learner Opens LearnLite
          |
          v
Check Locally Available Content
          |
          v
Open Downloaded Lesson
          |
          v
Complete Learning Activity
          |
          v
Save Progress to IndexedDB
          |
          v
Add Update to Synchronization Queue
          |
          v
Check Network Availability
          |
     +----+----+
     |         |
   OFFLINE    ONLINE
     |         |
     v         v
Keep Data   Attempt Secure
Locally     Synchronization
     |         |
     |         v
     |     Backend API
     |         |
     |         v
     |     Firestore
     |         |
     |         v
     |     Confirm Server Receipt
     |         |
     +---------+
               |
               v
        Update Local Sync State
```

### 7.2 Offline Data Requirements

The local storage system should preserve:

- Learner profile identifiers.
- Downloaded lesson references.
- Lesson completion records.
- Activity responses where appropriate.
- Pending synchronization events.
- Last confirmed synchronization status.

### 7.3 Synchronization Requirements

The synchronization engine must:

1. Detect available connectivity.
2. Identify pending local updates.
3. Send updates through authenticated HTTPS requests.
4. Use unique event identifiers.
5. Prevent duplicate server-side processing.
6. Record successful synchronization.
7. Retain unsynchronized records after failures.
8. Retry recoverable failures.
9. Handle conflicts according to agreed policies.
10. Report synchronization status to the learner.

Connectivity detection does not guarantee that
the backend is reachable.

Synchronization must handle network requests
that fail even when a device reports being online.

### 7.4 Conflict Resolution

Proposed approach:

- Assign stable identifiers to progress events.
- Use unique idempotency keys.
- Record client and server timestamps.
- Preserve accepted progress events.
- Apply server-side validation.
- Reject unauthorized or malformed updates.
- Avoid overwriting confirmed progress blindly.

The exact conflict-resolution policy must be
approved before implementation.

---

## 8. Shared-Device Architecture

LearnLite should support multiple learner profiles
on a shared device.

Requirements:

- Separate progress records per learner.
- Clear profile switching.
- No cross-profile progress contamination.
- Secure access to learner-specific information.
- Correct learner association during synchronization.

A profile identifier alone is not proof of identity.

The team must define an appropriate authentication
or learner access mechanism before releasing
shared-device functionality.

Special consideration is required where learners
may be minors.

---

## 9. Proposed Firestore Data Model

The following is an initial logical model.

Final document structures must be reviewed
before implementation.

### Collection: learners

Example fields:
- learnerId
- displayName
- createdAt
- updatedAt
- profileStatus

### Collection: lessons

Example fields:
- lessonId
- title
- description
- subject
- ageGroup
- contentReference
- publicationStatus
- updatedAt

### Collection: progress

Example fields:
- progressId
- learnerId
- lessonId
- activityId
- completionStatus
- completionPercentage
- updatedAt
- lastSyncedAt

### Collection: syncEvents

Example fields:
- eventId
- learnerId
- deviceId
- operationType
- payloadVersion
- processingStatus
- receivedAt
- processedAt

Important:
The final database structure must support
authorization, efficient queries and safe
synchronization.

The team must decide whether progress records
should be stored in top-level collections or
learner-scoped subcollections.

---

## 10. Google Cloud Infrastructure Architecture

### Proposed Services

Cloud Run:
Hosts the backend API.

Firestore:
Stores structured application data.

Cloud Storage:
Stores approved downloadable learning content.

Secret Manager:
Stores sensitive backend credentials.

IAM:
Controls identities and service permissions.

Artifact Registry:
Stores application container images.

Cloud Logging:
Collects application and infrastructure logs.

Cloud Monitoring:
Tracks service performance and reliability.

### Proposed Deployment Flow

```text
GitHub Repository
       |
       v
GitHub Actions
       |
       v
Automated Tests
       |
       v
Build Container
       |
       v
Artifact Registry
       |
       v
Cloud Run
       |
       v
Application Backend
```

GitHub Actions should authenticate to Google Cloud
using Workload Identity Federation.

Long-lived service account keys should not be
stored in GitHub.

---

## 11. Security Architecture

Security must be integrated into every component.

Core controls:

- HTTPS communication.
- Authentication and authorization.
- Least-privilege IAM.
- Secure secret storage.
- Input validation.
- Safe error handling.
- Protected learner information.
- Controlled administrative access.
- Security-focused code reviews.
- Appropriate logging and monitoring.

Client-side offline storage requires additional
privacy and access-control considerations.

See:
docs/security/README.md

---

## 12. Observability Architecture

LearnLite must provide enough operational data
to diagnose problems.

### Logging

Capture:
- Backend request failures.
- Synchronization errors.
- Service exceptions.
- Cloud integration failures.
- Deployment failures.

Avoid logging:
- API keys.
- Authentication tokens.
- Passwords.
- Sensitive learner information.
- Private lesson responses unnecessarily.

### Monitoring

Recommended metrics:
- API error rate.
- API latency.
- Cloud Run availability.
- Synchronization success rate.
- Synchronization failure rate.
- Pending synchronization events.
- AI service failures.

Browser-side offline metrics require
application instrumentation.

### Alerting

Proposed alerts:
- Elevated backend error rate.
- Repeated synchronization failures.
- Unavailable backend service.
- Excessive AI request failures.
- Unexpected resource consumption.

---

## 13. Infrastructure Environments

Recommended initial environment:

Development

Purpose:
- Feature integration.
- API testing.
- Cloud service validation.
- Synthetic learner data.

Recommended future environment:

Production

Purpose:
- Approved deployment.
- Controlled learner access.
- Operational monitoring.

Production must use separate credentials,
appropriate IAM permissions and controlled
deployment procedures.

---

## 14. Component Ownership

| Component | Primary Owner | Supporting Owner |
|-----------|---------------|------------------|
| Project governance | Aashma | All members |
| Frontend application | Harold | Elvis |
| Backend API | Elvis | Harold |
| Synchronization engine | Elvis | Harold |
| Shared data contracts | Elvis | Harold |
| AI content evaluation | Reshma | Ernest |
| Cloud infrastructure | Elvis | Aashma |
| Security governance | Aashma | Elvis |
| Synthetic data | Ernest | Reshma |
| Integration testing | Ernest | Elvis |
| End-to-end testing | Ernest | Harold |
| Observability | Ernest | Elvis |

---

## 15. Architecture Review Process

Major architecture changes should:

1. Be documented.
2. Identify affected components.
3. Explain the reason for the change.
4. Identify security and reliability implications.
5. Be reviewed by affected technical owners.
6. Receive leadership approval where appropriate.
7. Be implemented through the agreed GitHub workflow.

---

## 16. Architecture Acceptance Criteria

The architecture is ready for implementation when:

- Core components are identified.
- Responsibilities are assigned.
- API contracts are agreed.
- Shared data models are documented.
- Offline synchronization rules are defined.
- Authentication requirements are agreed.
- Cloud service configuration is approved.
- Security requirements are documented.
- Testing requirements are defined.
- Open architecture decisions are tracked.

---

## 17. Open Architecture Decisions

The team must confirm:

- Frontend framework.
- Backend framework.
- Authentication solution.
- Firestore document structure.
- Offline synchronization conflict policy.
- Shared-device identity model.
- AI integration approach.
- Deployment environments.
- Infrastructure-as-Code strategy.
- Monitoring and alerting thresholds.

---

## 18. Current Status

Status: PROPOSED

The initial LearnLite system architecture
has been documented.

Implementation remains subject to technical
review and agreement by the project team.
