# LearnLite — Written Project Summary
**MMC Google Cloud Launchpad | 2026 Cohort**

## 1. Research and Problem

Reliable access to digital learning remains a challenge for
students in environments with limited connectivity. Online
learning platforms may depend on continuous access to the
internet, restricting when and where learners can study.

Teachers also need practical tools to distribute educational
content, manage assignments and evaluate learner progress.

LearnLite addresses these challenges through an offline-first
approach aligned with SDG 4: Quality Education.

This problem statement describes the project's motivation;
formal user-research evidence should be added where available.

The project addresses a practical design constraint: many learners cannot depend on uninterrupted connectivity throughout the school day. LearnLite therefore treats offline access as an architectural requirement rather than an optional enhancement. Its educational objective is to help students maintain learning continuity while giving teachers structured ways to organize activities and monitor participation.

## 2. Solution

LearnLite is a mobile-first learning platform connecting
teachers and students through structured digital classrooms.

Teachers can manage classrooms, create or assign learning
modules and support learner progress. Students can access
lessons, complete interactive activities, earn rewards and
study downloaded content while offline.

The platform also includes AI-assisted learning content
capabilities, subject to final integration verification.

The learner experience combines classroom participation, structured modules, interactive activities, assignments and motivational progress indicators. Teachers are supported through classroom and assignment workflows. The MVP prioritizes essential learning journeys, straightforward navigation and a backend that can support additional educational services without requiring a complete architectural redesign.

## 3. Technical Implementation

The frontend uses Expo and React Native.

The backend uses Python FastAPI deployed to Google Cloud Run
in the africa-south1 region.

Firebase Authentication provides user identity, while
Cloud Firestore manages application records.

The backend exposes authenticated APIs for classrooms,
modules, learning activities, assignments, student
progress, gamification and synchronization.

Offline synchronization includes queued operations,
duplicate detection and revision conflict handling.

The merged AI services contain Gemini and NVIDIA
Nemotron-related functionality; final live execution
must be confirmed before publication.

The backend uses Python and FastAPI, deployed on Google Cloud Run in the africa-south1 region. Firebase Authentication supplies identity verification, while Firestore stores application records. Protected API routes validate authentication and enforce role-aware operations. Cloud-managed services reduce infrastructure administration, allowing the team to concentrate on application functionality, integration and reliability.

## 4. Implementation Plan and Timeline

LearnLite development followed eight structured phases:

1. **Repository and Architecture Foundations** - Project structure, engineering workflows and architecture.
2. **Authentication and User Profiles** - Secure login, user profiles and role-based access.
3. **Classroom Management and Enrollment** - Classroom creation and learner enrollment.
4. **Learning Modules and Assignments** - Educational content and assignment workflows.
5. **Assessment and Gamification** - Learning progress, assessments, XP and engagement features.
6. **Offline Synchronization** - Offline-first functionality and synchronization services.
7. **AI Services, Community and Notifications** - Supporting application services and AI integration preparation.
8. **Security, Testing and Release Readiness** - Authorization checks, integration testing and deployment verification.

Development was coordinated through GitHub pull requests, team reviews and Google Cloud staging deployments during November 2026.

Each implementation phase established a foundation for the next: repository governance preceded feature integration, identity preceded protected classroom operations, and learning APIs supported progress tracking and offline workflows. GitHub pull requests provided a collaborative mechanism for reviewing and integrating engineering contributions.

## 5. Resources and Responsibilities

Core resources:
- Google Cloud Run and Cloud Firestore
- Firebase Authentication
- Expo/React Native and FastAPI
- GitHub collaborative development
- AI content development and evaluation tooling

Team responsibilities:
- Elvis Ncube: Cloud engineering and backend
- Harold Ormeño Meneses: Mobile/frontend engineering
- Aashma Lama: Project leadership and coordination
- Reshma Thomas: AI learning content
- Ernest Lukheli: Quality assurance

The team divided responsibilities across project leadership and security, mobile development, backend and cloud engineering, AI content development, and quality assurance. The implementation relied on GitHub for source control and collaboration, Google Cloud for the deployed backend, and Firebase services for authentication and application data. This division of responsibility supported parallel development while maintaining shared integration objectives.

## 6. Testing and Results

The team verified the backend using automated regression
tests, authenticated staging requests and end-to-end
teacher-to-student scenarios.

Recorded results include:
- 147 backend tests passed
- 8 offline sync-engine tests passed
- 11 live authorization checks passed
- 13 live learning-workflow checks passed
- Successful live sync push, retry, conflict and pull tests

The backend was deployed from commit 4148666 and passed
health checks. The later submission source snapshot is
240c5a7, which includes mobile build changes.

Final real-device test outcomes should be recorded separately
by the QA team.

Major delivery risks included unreliable connectivity, authorization mistakes, synchronization conflicts, integration delays and cloud configuration errors. The engineering response emphasized verified identity tokens, role-based checks, API validation, staged deployments and retry-aware offline synchronization. The distinction between locally queued data and authoritatively recorded learner progress remains important when evaluating synchronization behavior.

## 7. Risks and Mitigations

**Connectivity:** Offline access and queued synchronization
reduce reliance on constant connectivity.

**Security:** Firebase authorization, role restrictions and
Cloud IAM support controlled resource access.

**Synchronization:** Duplicate and conflict protection
reduce inconsistent offline updates.

**Integration:** Final device testing is needed to identify
differences between working APIs and the user experience.

**Delivery:** Repository access, content licensing and
submission documentation require final coordination.

Staging verification covered API availability, authentication behavior, classroom and learning workflows, and offline synchronization operations. Previously recorded backend checks included 147 passing automated tests for the verified staging revision, together with live authorization and end-to-end workflow checks. These results describe the tested revision; subsequent changes require their own verification. Final real-device acceptance and AI-service approval are tracked separately.

## 8. Outcomes and Conclusion

LearnLite represents the successful development of a functional, cloud-native educational MVP built to support accessible digital learning, particularly in environments with limited connectivity.

The delivered MVP brings together mobile learning, secure authentication, classroom management, interactive educational activities, progress tracking, gamification and offline-first functionality.

Through Google Cloud infrastructure, backend engineering, application development and collaborative testing, the team translated an educational challenge into a practical technology solution aligned with United Nations Sustainable Development Goal 4: Quality Education.

LearnLite stands as a tangible achievement of the MMC Google Cloud Launchpad 2026 Cohort. It establishes a foundation for further innovation in AI-assisted learning, accessibility, educational analytics and broader adoption.

The project demonstrates the team's technical collaboration, engineering capabilities and commitment to building technology with meaningful social impact.

The resulting MVP provides a working foundation for accessible, engaging digital learning and demonstrates the team's ability to translate a social challenge into a cloud-based software product. Its value is not limited to the initial release: the architecture supports continued improvement in accessibility, learning analytics, content availability and AI-assisted educational experiences. These future enhancements build on the delivered MVP rather than defining it as incomplete.

