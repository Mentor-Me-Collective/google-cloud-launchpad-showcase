# 🚀 LEARNLITE — PHASE 0
## HACKATHON WARM-UP & MVP BUILD

**Event:** Women in Tech × MMC × Newly Vibe Coding Hackathon
**Date:** 6 November 2026
**Duration:** 2 Hours
**Development Platform:** Newly
**Project:** LearnLite
**Phase:** 0 — Hackathon Prototype
**Mission:** Learning Without Barriers

---

## 🎯 1. OUR MISSION

LearnLite is an **offline-first educational platform** designed to help students continue learning in environments where internet connectivity is unreliable, limited, or expensive.

Our mission is simple:

**Make quality education accessible, even without continuous internet connectivity.**

This hackathon represents the official starting point of the LearnLite development journey.

Our objective is to produce a functional Minimum Viable Product (MVP) that demonstrates real educational value, offline accessibility, secure data handling, and a seamless learning experience.

---

## 🏆 2. HACKATHON OBJECTIVE

During the two-hour hackathon, our team will build and demonstrate a functional LearnLite MVP using Newly.

### The Seven-Step Learning Journey

1. **Download:** A learner downloads educational content while connected to the internet.
2. **Start Learning:** The learner opens a lesson and begins studying.
3. **Lose Connection:** Internet connectivity becomes unavailable.
4. **Continue Offline:** The learner continues accessing downloaded learning material.
5. **Save & Resume:** Learning progress is saved locally and can be restored after reopening the application.
6. **Reconnect & Sync:** When connectivity returns, pending learning progress synchronizes with the backend.
7. **Verify Progress:** The learner's dashboard displays the confirmed synchronized record.

**Primary Goal:** Demonstrate that learning continues even when internet connectivity is lost.

**Minimum Successful MVP:** Offline lesson access, persistent local progress storage, and successful learning resumption.

**Advanced MVP Goal:** Confirmed backend synchronization and an updated progress dashboard.

---

## 🛠️ 3. HACKATHON DEVELOPMENT TOOLS

Our development approach prioritizes simplicity, speed, security, and functionality.

| Platform | Purpose | Requirement |
|---|---|---|
| **Newly** | Primary AI-powered application development | Required |
| **Supabase** | Database, authentication, and progress synchronization | Optional |
| **GitHub** | Version control, collaboration, and documentation | Team repository |
| **Lovable** | Alternative vibe-coding environment | Optional |
| **Google Cloud Platform** | Future cloud infrastructure development | Not required |
| **NVIDIA** | Future AI capabilities and integrations | Not required |

### Important Technical Direction

**No external Google Cloud Platform infrastructure is required for this hackathon.**

The team must not spend hackathon development time configuring:

- Google Cloud Run
- Google Firestore
- Google Kubernetes Engine
- Google Cloud Storage
- Google Cloud IAM
- Terraform

These services remain potential components of LearnLite's future technical architecture.

For Phase 0, we will focus entirely on building the MVP within Newly and using its available integrations where necessary.

---

## 👥 4. HACKATHON TEAM & RESPONSIBILITIES

The LearnLite hackathon team consists of five members, each responsible for a critical component of the MVP.

### 🔐 AASHMA — TEAM LEADERSHIP & SECURITY LEAD

**Primary Responsibility:** Team leadership, application security, privacy, and risk management.

**Key Responsibilities:**

- Coordinate project priorities and support team leadership.
- Ensure the MVP remains aligned with hackathon objectives.
- Establish basic application security requirements.
- Review authentication and access controls where implemented.
- Review Supabase database permissions and Row Level Security if used.
- Ensure demo data does not contain sensitive student information.
- Identify and communicate critical application security risks.
- Validate secure handling of API credentials and environment variables.
- Support final MVP validation and presentation readiness.

**Expected Deliverables:**

✅ Team coordination and security oversight
✅ Basic application security assessment
✅ Data privacy and access-control review
✅ Documented security risks and recommendations

---

### ⚙️ ELVIS — CLOUD ENGINEERING & TECHNICAL INTEGRATION LEAD

**Primary Responsibility:** Application architecture, technical coordination, offline synchronization, and integration.

**Key Responsibilities:**

- Guide the overall MVP technical architecture.
- Coordinate application functionality and feature integration.
- Support persistent offline storage.
- Coordinate synchronization between local and backend data.
- Configure available Newly/Supabase integrations where necessary.
- Verify application data flows.
- Collaborate with Aashma on technical security requirements.
- Support troubleshooting and functional testing.
- Ensure the team produces one integrated application.

**Expected Deliverables:**

✅ Functional MVP architecture
✅ Verified offline progress persistence
✅ Synchronization integration where implemented
✅ Technical integration and testing support

**Note:** Google Cloud deployment is outside the scope of this hackathon.

---

### 🎨 HAROLD — FRONTEND & OFFLINE LEARNING LEAD

**Primary Responsibility:** Student-facing application and offline learning experience.

**Key Responsibilities:**

- Build the LearnLite learner interface.
- Create the student dashboard.
- Develop learning module navigation.
- Integrate lesson content.
- Implement lesson download and offline access.
- Support local progress saving.
- Ensure the application is mobile-responsive.
- Improve interface usability and accessibility.

**Expected Deliverables:**

✅ Student dashboard
✅ Module and lesson navigation
✅ Offline lesson reader
✅ Functional learner experience

---

### 📊 ERNEST — TESTING, ANALYTICS & DASHBOARD LEAD

**Primary Responsibility:** Learning activity tracking, progress verification, and functional testing.

**Key Responsibilities:**

- Develop progress tracking indicators.
- Display completed lessons.
- Track learner activity.
- Display synchronization status.
- Verify learning-progress records.
- Test offline learning scenarios.
- Support end-to-end MVP validation.
- Identify and document functional defects.

**Expected Deliverables:**

✅ Learner progress dashboard
✅ Activity tracking functionality
✅ Verified learning progress
✅ Functional testing results

---

### 🧠 RESHMA — AI & EDUCATIONAL CONTENT LEAD

**Primary Responsibility:** Educational content, lesson integration, and AI-assisted content verification.

**Key Responsibilities:**

- Provide Module 1 educational content.
- Integrate Lessons 1 and 4.
- Validate content quality and readability.
- Support content loading within the application.
- Provide the Nemotron verification kit.
- Review educational consistency.
- Support demonstration preparation.

**Existing Contribution: GitHub PR #1**

- `content/module1-pack.json`
- `content/README.md`
- `ai-verification/`

**Expected Deliverables:**

✅ Educational lesson content
✅ AI-assisted content verification
✅ Functional learning material integration

---

## 🏗️ 5. MVP FUNCTIONAL REQUIREMENTS

The LearnLite MVP will prioritize five essential components.

### A. Student Dashboard

- Student welcome interface.
- Learning module overview.
- Continue Learning functionality.
- Lesson completion indicators.
- Offline/online connectivity status.

### B. Educational Content

- Module 1.
- Lesson 1.
- Lesson 4.
- Lesson navigation.
- Readable learning material.

### C. Offline Learning

- Downloadable lesson content.
- Persistent local lesson storage.
- Offline reading.
- Locally saved learning progress.
- Learning resumption after application restart.

### D. Progress Synchronization

If backend functionality is configured:

- Queue unsynchronized progress.
- Detect connectivity restoration.
- Submit pending progress records.
- Confirm successful backend storage.
- Update synchronization status.
- Prevent duplicate records.

### E. Learning Progress Dashboard

- Completed lessons.
- Progress percentages.
- Recent learning activity.
- Accurate synchronization indicators.

---

## 🔐 6. SECURITY & DATA PROTECTION

**Security Lead: Aashma**
**Technical Support: Elvis**

LearnLite will apply security-by-design principles throughout development.

### Essential Security Requirements

1. Use synthetic learner information during the hackathon.
2. Do not expose passwords or private API keys.
3. Validate learner progress before storing records.
4. Protect learner information from unauthorized access.
5. Use secure authentication where required.
6. Apply Supabase Row Level Security if the database integration is implemented.
7. Avoid unnecessary collection of personal information.
8. Review critical security risks before the final demonstration.

Security assessments will be conducted alongside development.

**Our Principle: Security is part of the architecture, not an afterthought.**

---

## ⏱️ 7. TWO-HOUR HACKATHON EXECUTION PLAN

| Time | Phase | Primary Focus |
|---|---|---|
| 00–15 min | Initialization | Newly project setup and feature alignment |
| 15–35 min | Application Interface | Student dashboard and lessons |
| 35–55 min | Offline Functionality | Local storage and offline access |
| 55–80 min | Synchronization | Backend connectivity, if feasible |
| 80–100 min | Testing | End-to-end verification and security checks |
| 100–110 min | Final Polish | UI improvements and critical fixes |
| 110–120 min | Presentation | Live MVP demonstration |

**Security Lead Aashma will conduct security checks throughout the execution process.**

The team will prioritize functional quality over unnecessary features.

---

## 🧠 8. AI-ASSISTED MVP DEVELOPMENT

The team will use structured AI prompts within Newly to accelerate development.

### Our Five Core Prompts

| Prompt | Purpose | Responsible |
|---|---|---|
| Prompt 1 | Generate the LearnLite MVP | Harold + Team |
| Prompt 2 | Implement offline learning | Harold + Elvis |
| Prompt 3 | Configure progress synchronization | Elvis |
| Prompt 4 | Final application testing and polish | Entire Team |
| Prompt 5 | Application security review | Aashma + Elvis |

### Development Approach

1. Generate the initial application.
2. Verify working functionality.
3. Add offline capabilities.
4. Implement synchronization if feasible.
5. Conduct integration and security testing.
6. Prepare the final demonstration.

**Do not generate every feature simultaneously without validating the previous implementation.**

The complete prompts are documented in:

[NEWLY-PROMPTS.md](./NEWLY-PROMPTS.md)

---

## 📂 9. HACKATHON DOCUMENTATION

This directory serves as the official Phase 0 Hackathon Command Centre.

| Document | Purpose |
|---|---|
| [README.md](./README.md) | Hackathon overview, objectives, and strategy |
| [TEAM-ROLES.md](./TEAM-ROLES.md) | Team responsibilities and coordination |
| [MVP-BUILD-PLAN.md](./MVP-BUILD-PLAN.md) | Two-hour execution plan |
| [NEWLY-PROMPTS.md](./NEWLY-PROMPTS.md) | AI prompts for MVP development and security |
| [DEMO-CHECKLIST.md](./DEMO-CHECKLIST.md) | Functional and security validation |
| [POST-HACKATHON.md](./POST-HACKATHON.md) | Transition into the full LearnLite engineering project |

---

## ✅ 10. MVP SUCCESS CRITERIA

### Minimum Requirements

- [ ] LearnLite application launches.
- [ ] Student dashboard loads successfully.
- [ ] Module 1 educational content is accessible.
- [ ] Learners can download or save lessons.
- [ ] Downloaded lessons work without internet connectivity.
- [ ] Progress is saved locally.
- [ ] Progress remains available after restarting the application.

### Advanced Requirements

- [ ] Pending progress synchronizes after reconnection.
- [ ] Backend confirms successful data storage.
- [ ] Learning dashboard displays synchronized progress.
- [ ] Duplicate progress submissions are handled.
- [ ] Basic application security checks are completed.

Features will only be marked complete after successful verification.

---

## 🚀 11. POST-HACKATHON DEVELOPMENT

The hackathon represents the starting point of the wider LearnLite engineering roadmap.

### Phase 0 — Hackathon Prototype

Build and demonstrate the first functional MVP using Newly.

### Phase 1 — Technical Review

Review the generated source code, assess functionality, and document limitations.

### Phase 2 — GitHub Integration

Integrate reusable application code into the existing LearnLite repository using appropriate branches and pull requests.

### Phase 3 — Cloud Engineering

Evaluate Google Cloud Platform infrastructure for long-term production requirements.

### Phase 4 — AI Development

Explore NVIDIA-supported AI capabilities and future intelligent learning features.

### Phase 5 — Security & Scalability

Expand application security, authentication, monitoring, reliability, and platform scalability.

**Aashma will lead security oversight, working with the engineering team throughout these phases.**

---

## 🌍 12. OUR LONG-TERM VISION

LearnLite is more than a hackathon application.

It is the foundation of an educational platform designed to remove connectivity barriers from learning.

We envision an application where:

- Students can learn anywhere.
- Internet interruptions do not stop progress.
- Learning materials remain accessible.
- Educational progress is preserved.
- Technology supports inclusive education.
- Student information is protected.
- AI enhances learning opportunities.

The hackathon provides the opportunity to validate this vision through a functional product.

---

## 🏆 OUR TEAM COMMITMENT

**Aashma:** Leadership and Security
**Elvis:** Technical Architecture and Integration
**Harold:** Student Experience and Offline Learning
**Ernest:** Testing, Analytics and Dashboard
**Reshma:** AI and Educational Content

**ONE TEAM. ONE MISSION. ONE FUNCTIONAL MVP.**

### LEARNLITE
**LEARNING WITHOUT BARRIERS.**

*This is the beginning of our engineering journey.*
