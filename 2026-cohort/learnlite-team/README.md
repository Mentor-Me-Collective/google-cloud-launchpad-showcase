# LearnLite
## Offline-First AI-Assisted Learning Platform

**Mentor Me Collective | Google Cloud Launchpad | 2026 Cohort**

### 1. Project Overview

LearnLite is an offline-first educational platform designed
to make structured digital learning more accessible in
communities where reliable internet connectivity cannot
always be guaranteed.

The application helps teachers organize learning materials
and classrooms while enabling students to study, complete
activities and track their learning progress.

### 2. Target Audience

- Students in underserved and low-connectivity communities
- Teachers managing digital classrooms and assignments
- Schools and learning organizations seeking accessible
  mobile-first learning solutions

### 3. Problem Statement

Students with unreliable connectivity may lose access to
digital resources and experience interruptions in learning.

Teachers also require accessible tools for managing content,
classrooms, assignments and student performance.

### 4. Sustainable Development Goal

**SDG 4 — Quality Education**

LearnLite supports the goal of improving access to inclusive
and equitable learning opportunities through technology.

### 5. Our Solution

LearnLite combines:

- Teacher and student authentication
- Classroom management and student enrollment
- Learning modules and interactive activities
- Six supported activity types
- Assignments and learning progress
- XP, streaks and hearts
- Community learning modules
- Offline study and later synchronization
- AI-assisted educational content workflows

Mobile features require final real-device acceptance testing.

### 6. Technology Stack

| Technology | Purpose |
|---|---|
| Google Cloud Run | Backend hosting |
| Python / FastAPI | Application API |
| Cloud Firestore | Application data and offline records |
| Firebase Authentication | Identity and authorization |
| Expo / React Native | Mobile and web frontend |
| GitHub | Collaboration, CI and source control |
| Google Gemini | AI content workflow components |
| NVIDIA Nemotron | AI checking components in the merged repository |

The Gemini/Nemotron implementation and live execution
status must be confirmed by the AI engineering team before
final submission.

### 7. Google Cloud Architecture

The mobile/web application authenticates users through
Firebase and communicates with FastAPI over HTTPS.

FastAPI runs on Google Cloud Run and accesses Cloud Firestore
to manage users, classrooms, modules, assignments, learning
attempts and synchronized records.

Deployment region: africa-south1

Cloud project: learnlite-514514

Architecture and test details:
[Architecture and Testing](docs/ARCHITECTURE-AND-TESTING.md)

### 8. Source Code

Main development repository:

https://github.com/LearnLite-Cloud-Build/LearnLite

The full submission package includes application,
infrastructure, services, tests and documentation under src/.

Source snapshot: 240c5a7

### 9. Setup and Run Instructions

#### Backend

Requirements:
- Python and pip
- Project dependencies
- A configured Google Cloud/Firebase environment
- Authorized access to the relevant development resources

Backend source: src/apps/api/

For a local container build, from the submission root:

```bash
docker build -t learnlite-api ./src/apps/api
```

To run locally, configure the required development
environment and follow the backend configuration in source.

#### Mobile

Requirements:
- Node.js and npm
- Expo development tooling
- Firebase client configuration

From the submission root:

```bash
cd src/apps/mobile
npm install
npx expo start
```

The exact setup commands and required environment variables
must be validated against the final release by Harold.

Never commit secrets, Firebase service-account private keys,
passwords or private application credentials.

### 10. Staging Backend

API URL:

https://learnlite-api-staging-669554395089.africa-south1.run.app

Health:
GET /health

API contract:
GET /openapi.json

Protected endpoints require valid Firebase credentials.

### 11. Testing and Verification

Validated backend and infrastructure work includes:

- 147 backend tests passed
- 8 offline sync-engine tests passed
- 11 live authorization checks passed
- 13 live teacher-to-student workflow checks passed
- Live offline sync push, pull, retries and conflicts verified
- Successful Cloud Run deployment and API health checks

These are engineering validation results, not a claim
that all final mobile functionality passed device testing.

### 12. Application Screenshots

Final approved screenshots:
[ADD SCREENSHOT LINKS]

### 13. Product Demonstration

Recorded walkthrough (maximum five minutes):
[ADD PUBLICLY ACCESSIBLE VIDEO LINK]

Presentation (maximum eight slides):
[View LearnLite Final Presentation](https://docs.google.com/presentation/d/1fBXGhE0Bb7SXsQ4TPOhIih-HsKxrqYipIHWOblvSJ5Y/edit?usp=sharing)

### 14. Project Team and Contributions

| Member | Contribution |
|---|---|
| Elvis Ncube | Cloud engineering, FastAPI backend, deployment, API integration and testing |
| Harold Ormeño Meneses | Mobile/frontend engineering, application integration and Android build |
| Aashma Lama | Project leadership, security coordination and final delivery |
| Reshma Thomas | AI-assisted learning content, evaluation and content integration |
| Ernest Lukheli | Quality assurance, test evaluation and release verification |

Final individual contributions and GitHub usernames
must be confirmed by the team.

### 15. Project Summary

[Written Project Summary](docs/PROJECT-SUMMARY.md)

### 16. Known Limitations

- Final mobile/device testing requires QA confirmation.
- Offline synchronization behavior must be verified
  through the final application build.
- Some offline synchronization records are separate from
  server-side lesson progress and gamification.
- Final AI integration and production-readiness claims
  require engineering verification.

### 17. Future Improvements

- Expanded multilingual learning content
- Enhanced accessibility
- Improved offline learning analytics
- More AI-assisted teacher tools
- Advanced classroom reporting
- Production scaling and monitoring

### 18. License

Open-source license: pending team approval.

Do not assume permission to redistribute third-party images,
sounds, models or other assets until rights are verified.

---

Built by the LearnLite Team for the 2026 MMC Google Cloud
Launchpad Program.


## Final MVP Release and Submission References

- **Source repository:** https://github.com/LearnLite-Cloud-Build/LearnLite
- **Android MVP releases:** https://github.com/LearnLite-Cloud-Build/LearnLite/releases
- **Backend staging API:** https://learnlite-api-staging-669554395089.africa-south1.run.app
- **Release and testing:** [Release evidence](docs/RELEASE-AND-TESTING.md)
- **Project summary:** [Written summary](docs/PROJECT-SUMMARY.md)

### GitHub Team Contributions

| Member | GitHub profile | Primary responsibility |
|---|---|---|
| Elvis Ncube | [EXMARK-DESIGNS](https://github.com/EXMARK-DESIGNS) | Cloud and backend engineering |
| Harold Ormeño Meneses | [haroldom](https://github.com/haroldom) | Mobile app and integration |
| Aashma Lama | [Aashmalama](https://github.com/Aashmalama) | Leadership and coordination |
| Reshma Thomas | [rshmthomas-cyber](https://github.com/rshmthomas-cyber) | AI content and evaluation |
| Ernest Lukheli | [elukheli-beep](https://github.com/elukheli-beep) | Quality assurance |

### Final Presentation Materials

- **Presentation deck (maximum 8 slides):** [View LearnLite Final Presentation](https://docs.google.com/presentation/d/1fBXGhE0Bb7SXsQ4TPOhIih-HsKxrqYipIHWOblvSJ5Y/edit?usp=sharing)
- **Recorded walkthrough (maximum 5 minutes):** Pending final approved link
- **Android real-device QA report:** Pending team sign-off

The iOS build has not been completed for this MVP.
AI integration status must be verified against the final
approved code and live deployment results.
