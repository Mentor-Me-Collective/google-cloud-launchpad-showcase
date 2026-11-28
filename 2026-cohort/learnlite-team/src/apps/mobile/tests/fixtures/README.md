# LearnLite — Synthetic Data & Test Fixtures

## 1. Overview

This directory contains synthetic datasets,
test fixtures and sample learning records used
to validate the LearnLite application.

Synthetic data consists of fictional information
created specifically for testing.

The objective is to evaluate application behavior,
data integrity, synchronization and learner progress
without exposing real personal information.

## 2. Ownership

Primary Owner:
Ernest Lukheli — Synthetic Data, Monitoring & Evaluation

Supporting Engineers:
- Reshma Thomas — Educational scenarios and content evaluation
- Elvis Ncube — Backend data models and Firestore integration
- Harold Ormeño — Offline learner profiles and local storage
- Aashma Lama — Privacy and security oversight

## 3. Objectives

The synthetic data framework must support:

- Functional application testing.
- Learner profile testing.
- Shared-device testing.
- Offline synchronization testing.
- API integration testing.
- Firestore data validation.
- Progress tracking evaluation.
- AI content evaluation.
- Reliability and recovery testing.
- Reproducible automated test execution.

## 4. Synthetic Learner Profiles

Create fictional learner records representing
different learning and technology environments.

Recommended scenarios:

### Profile A: Stable Connectivity

Characteristics:
- Reliable internet connection.
- Personal device.
- Regular lesson completion.
- Frequent synchronization.

Testing Objective:
Verify the standard online learning workflow.

### Profile B: Intermittent Connectivity

Characteristics:
- Internet connection disconnects frequently.
- Learner completes activities offline.
- Progress synchronizes later.

Testing Objective:
Verify interrupted-network recovery.

### Profile C: Shared Device

Characteristics:
- Multiple fictional learners use one device.
- Separate learner profiles.
- Different learning progress records.

Testing Objective:
Verify learner data separation and profile switching.

### Profile D: Low-Storage Device

Characteristics:
- Limited device storage.
- Several downloaded lessons.
- Insufficient storage during additional downloads.

Testing Objective:
Verify storage-limit handling and recovery.

### Profile E: Extended Offline Usage

Characteristics:
- Learner remains offline for an extended period.
- Multiple activities are completed locally.
- Several progress updates await synchronization.

Testing Objective:
Verify queued progress persistence and safe recovery.

## 5. Recommended Fixture Categories

### 5.1 Learner Profiles

Contains fictional learner identities
and profile configurations.

Suggested filename:
learners.json

### 5.2 Lesson Data

Contains sample educational lesson metadata.

Suggested filename:
lessons.json

### 5.3 Learning Activities

Contains fictional questions, exercises
and activity definitions.

Suggested filename:
activities.json

### 5.4 Progress Records

Contains simulated lesson completion
and progress tracking information.

Suggested filename:
progress.json

### 5.5 Synchronization Events

Contains sample offline and online
synchronization records.

Suggested filename:
sync-events.json

### 5.6 Error Scenarios

Contains invalid or incomplete records
used to test error handling.

Suggested filename:
invalid-records.json

## 6. Data Structure Guidelines

Synthetic learner records should use stable
unique identifiers.

Example fields:

- learnerId
- profileId
- deviceId
- lessonId
- activityId
- progressStatus
- completionPercentage
- updatedAt
- syncStatus

The final schema must match the shared data models
defined by the application engineering team.

## 7. Data Privacy Requirements

All datasets committed to this directory must
be synthetic and safe for repository storage.

Do not include:

- Real learner names.
- Real learner contact information.
- Real learner identification numbers.
- Passwords.
- Authentication tokens.
- API credentials.
- Private service account keys.
- Production database exports.

Synthetic datasets must not be derived from
identifiable learner records without an approved
privacy-preserving process.

## 8. Data Quality Requirements

Each dataset should be:

- Valid according to the approved schema.
- Reproducible.
- Clearly documented.
- Consistent across related records.
- Suitable for automated tests.
- Independent of production systems.
- Version controlled.

## 9. Test Scenarios

| Test ID | Dataset | Objective |
|---------|---------|-----------|
| FIX-001 | Standard learner | Validate profile creation |
| FIX-002 | Offline learner | Validate local progress |
| FIX-003 | Shared-device learners | Validate profile separation |
| FIX-004 | Multiple offline updates | Validate synchronization queue |
| FIX-005 | Duplicate sync event | Validate idempotency |
| FIX-006 | Invalid progress record | Validate API error handling |
| FIX-007 | Missing lesson record | Validate missing-content handling |
| FIX-008 | AI test content | Evaluate learning output |
| FIX-009 | Low-storage scenario | Validate storage errors |
| FIX-010 | Extended offline history | Validate recovery and synchronization |

## 10. Fixture Maintenance

The owner should:

1. Define the required test scenarios.
2. Create synthetic datasets.
3. Validate data structure.
4. Commit approved datasets.
5. Review changes when schemas evolve.
6. Remove obsolete test records.
7. Maintain reproducible test results.
8. Coordinate fixture updates with application engineers.

## 11. Proposed Directory Expansion

As development progresses, this directory may
contain:

tests/fixtures/
├── README.md
├── learners.json
├── lessons.json
├── activities.json
├── progress.json
├── sync-events.json
└── invalid-records.json

These files should only be introduced once
the relevant data schemas are agreed upon.

## 12. Completion Criteria

The fixture framework is ready when:

- Required synthetic learner scenarios exist.
- Test data matches agreed application schemas.
- Shared-device scenarios are represented.
- Offline synchronization cases are represented.
- Invalid data scenarios are available.
- Dataset validation passes.
- No real learner personal information is present.

## 13. Current Status

Status: PLANNED

Synthetic data documentation initialized.

Fixture implementation will begin once the
learner, lesson and synchronization data models
have been agreed upon.
