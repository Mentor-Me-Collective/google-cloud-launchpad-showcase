# LearnLite — Offline-First AI-Assisted Learning Platform

**MMC × Google Cloud Launchpad | 2026 Cohort**

## Project Overview

LearnLite is an offline-first educational application designed
to support learners and teachers in environments with limited
or unreliable internet connectivity.

The platform combines classroom management, structured learning
modules, assessments, student progress tracking, gamification,
offline synchronization and AI-assisted educational content.

The application uses Expo/React Native for the client and
Python FastAPI on Google Cloud Run for backend services.

## Problem and Solution

Unreliable internet connectivity can interrupt learning and
limit access to digital educational resources.

LearnLite aims to provide accessible learning materials,
classroom assignments and progress tracking, with an
offline-first approach that supports synchronization when
connectivity becomes available.

## Team

| Member | Responsibility |
|---|---|
| Elvis Ncube | Cloud Engineering, Backend and Integration |
| Harold Ormeño Meneses | Mobile and Frontend Engineering |
| Aashma | Project Leadership and Security |
| Reshma Thomas | AI Learning Content and Evaluation |
| Ernest | Testing and Quality Assurance |

## Technology Stack

- **Google Cloud Run:** FastAPI application hosting
- **Cloud Firestore:** Application and synchronization data
- **Firebase Authentication:** User identity and access
- **Expo / React Native:** Mobile and web frontend
- **Python / FastAPI:** Backend API
- **GitHub:** Source control, pull requests and collaboration
- **Gemini / NVIDIA Nemotron:** AI content pipeline components
  represented in the merged AI API work; end-to-end integration
  is subject to final application verification

## Verified Backend Capabilities

- Firebase teacher and student authentication
- Role-based authorization
- Classroom management and student enrollment APIs
- Modules, lessons and learning blocks
- Module publishing and classroom assignment
- Student lesson attempts and activity grading
- Lesson completion and persisted progress
- XP gamification
- Authenticated offline synchronization API
- Revision conflict detection and duplicate operation prevention
- Cloud Run staging deployment

## Validation Results

- 123 backend regression tests passed
- 8 offline synchronization engine tests passed
- 11 live authentication and authorization checks passed
- 13 live teacher-to-student workflow checks passed
- Live sync push, retry, conflict handling and pull passed
- Cloud Run health endpoint returned HTTP 200
- CORS preflight verified for http://localhost:8081

These results validate the staging backend and synchronization
API. Final frontend integration and mobile offline/reconnection
behavior require separate application-level testing.

## Project Source Code

**Main LearnLite repository:**

https://github.com/LearnLite-Cloud-Build/LearnLite

The main repository contains the application, backend,
AI content, synchronization engine, infrastructure,
tests and project documentation.

## Staging Backend

https://learnlite-api-staging-669554395089.africa-south1.run.app

Health endpoint:

`GET /health`

API specification:

`GET /openapi.json`

Protected endpoints require valid Firebase authentication.

## Local Development

Refer to the main repository for full application setup.

Backend development generally requires:

1. Python and project dependencies
2. A configured Google Cloud/Firebase development environment
3. Appropriate application credentials and permissions
4. FastAPI application configuration
5. A separately configured Expo frontend

Do not commit private keys, service-account credentials,
Firebase passwords or other secrets.

## Architecture and Testing

See [Architecture and Validation](docs/ARCHITECTURE-AND-TESTING.md).

## MVP Completion Status

**Backend:** Core functionality deployed and validated.

**Frontend:** Integration and application-level verification
are being finalized by the team.

**AI:** Merged AI content API and learning materials require
final demonstration-level verification.

**Presentation:** Final slides and demonstration materials
are being prepared for the 27 November completion target.

## Future Ideas

- Improved low-bandwidth content delivery
- Offline learning analytics and progress reconciliation
- More learning languages and accessibility features
- Expanded AI-assisted teacher workflows
- Additional classroom and reporting features
- Production hardening and monitoring

## Cohort

Mentor Me Collective — Google Cloud Launchpad, 2026.

Project completion target: 27 November 2026.
