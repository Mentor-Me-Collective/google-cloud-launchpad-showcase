# LearnLite — Security & Access Control Documentation

## 1. Document Information

Project: LearnLite Cloud Build

Document Type: Security Architecture and Governance

Primary Security Owner:
Aashma Lama — Team Lead & Security

Cloud Security Implementation:
Elvis Ncube — Cloud Services, Integration & Synchronization

Supporting Members:
- Harold Ormeño — Frontend and Offline Application Security
- Reshma Thomas — AI Content Safety and Evaluation
- Ernest Lukheli — Security Testing and Monitoring

Document Status: PROPOSED

Version: 1.0

---

## 2. Security Overview

LearnLite is an offline-first learning platform
that may process learner profiles, educational
activities and learning progress.

The platform must protect learner information
while supporting low-connectivity environments,
shared devices and cloud-based services.

Security requirements apply to:

- GitHub repositories.
- Application source code.
- Frontend applications.
- Backend APIs.
- Cloud infrastructure.
- Firestore databases.
- Cloud Storage resources.
- AI integrations.
- Offline device storage.
- Automated deployments.
- Logging and monitoring.

Security is a shared engineering responsibility.

---

## 3. Security Objectives

The LearnLite security framework must:

1. Protect learner information.
2. Prevent unauthorized system access.
3. Secure API credentials.
4. Protect cloud resources.
5. Minimize unnecessary data collection.
6. Prevent exposure of sensitive information.
7. Maintain reliable access controls.
8. Secure application communication.
9. Support security monitoring.
10. Establish clear incident-response procedures.

---

## 4. Security Responsibilities

| Member | Security Responsibility |
|--------|--------------------------|
| Aashma Lama | Security governance and approvals |
| Elvis Ncube | Cloud IAM, backend security and secrets |
| Harold Ormeño | Frontend security and offline data handling |
| Reshma Thomas | AI safety and educational content evaluation |
| Ernest Lukheli | Security testing and monitoring |

All team members must report suspected
security incidents promptly.

---

## 5. GitHub Repository Security

### 5.1 Repository Visibility

The LearnLite repository must remain private
unless the project leadership explicitly
approves a change.

### 5.2 Organization Access

Access must follow the principle of
least privilege.

Recommended access:

Project Leadership:
Maintain

Application Engineering:
Write

Quality Evaluation:
Write

Organization Owners:
Only authorized project administrators.

### 5.3 Access Management

- Use individual GitHub accounts.
- Do not share account passwords.
- Enable two-factor authentication.
- Remove access when no longer required.
- Review permissions periodically.
- Avoid unnecessary organization owners.
- Review direct collaborator permissions.

### 5.4 Branch Management

The team should:

- Use feature branches.
- Open Pull Requests.
- Request peer reviews.
- Run applicable automated tests.
- Avoid direct changes to main.
- Review infrastructure and security changes.

Important:

GitHub Free may not enforce branch rulesets
for private organization repositories.

Where enforcement is unavailable, these
requirements remain team procedures rather
than technically enforced restrictions.

---

## 6. Secret Management Policy

Secrets must never be committed to GitHub.

Examples of prohibited secrets:

- NVIDIA API keys.
- Google Cloud service account private keys.
- Application passwords.
- Database credentials.
- Authentication signing secrets.
- Private certificates.
- Production access tokens.

### 6.1 Local Development

Use environment variables for local
development configuration.

Example:

.env

The .env file must be excluded from Git.

Use:

.env.example

to document required configuration keys
without including real secret values.

### 6.2 Cloud Runtime Secrets

Use Google Cloud Secret Manager for
sensitive backend credentials.

Example architecture:

```text
Cloud Run Backend
       |
       v
Service Account Identity
       |
       v
Secret Manager
       |
       v
Authorized Secret Access
       |
       v
NVIDIA API Integration
```

Only authorized runtime identities should
receive access to required secrets.

### 6.3 GitHub Actions Authentication

Prefer Google Cloud Workload Identity Federation.

Avoid storing downloadable service account
JSON keys in GitHub Actions secrets.

Restrict cloud deployment permissions to
approved repositories and workflows.

---

## 7. Google Cloud IAM Security

Google Cloud Identity and Access Management
controls permissions to cloud resources.

### Principles

- Least privilege.
- Separate human and workload identities.
- Avoid unnecessary project-wide roles.
- Avoid broad Owner permissions.
- Use dedicated service accounts.
- Review permissions before deployment.
- Remove unused access.

### Proposed Service Identities

Backend Runtime Service Account:
Used by Cloud Run.

Deployment Service Account:
Used by approved CI/CD workflows.

Monitoring Service Identity:
Used only where monitoring integrations
require additional permissions.

Each identity should receive only
the permissions required for its functions.

### Administrative Permissions

Human administrators should use their
own authenticated Google Cloud identities.

Shared service accounts must not be used
as substitutes for human accountability.

---

## 8. Backend API Security

The LearnLite backend must protect
all sensitive operations.

### 8.1 Authentication

Protected endpoints require an approved
authentication mechanism.

The team must confirm the authentication
provider before implementation.

Potential option:
Firebase Authentication.

### 8.2 Authorization

Authentication confirms identity.

Authorization determines which resources
that identity may access.

The backend must:

- Verify the caller's identity.
- Validate access to learner records.
- Prevent cross-learner data exposure.
- Restrict administrative actions.
- Reject unauthorized modifications.

A learnerId supplied by a browser must
never be accepted as proof of ownership.

### 8.3 Input Validation

Validate:

- Required fields.
- Data types.
- Allowed values.
- Request size.
- Resource identifiers.
- Authentication context.

Reject malformed requests safely.

### 8.4 API Error Handling

Application errors must not expose:

- API keys.
- Private credentials.
- Internal stack traces to end users.
- Sensitive environment variables.
- Private learner records.

Detailed diagnostic information should
be restricted to approved operational logs.

### 8.5 Rate Limiting

Sensitive endpoints should use appropriate
rate limits and abuse prevention.

Particular attention is required for:

- Authentication requests.
- Learner profile creation.
- Synchronization endpoints.
- AI service requests.

---

## 9. Firestore Database Security

Firestore will store structured
application information.

### Requirements

- Restrict database access.
- Apply appropriate IAM permissions.
- Minimize personal data collection.
- Validate application input.
- Enforce backend authorization.
- Prevent unauthorized document access.
- Avoid exposing private learner records.

### Backend Access

If Cloud Run uses server-side Firestore
libraries, authorization must be enforced
by the backend application.

Firestore Security Rules do not replace
backend authorization for privileged
server-side access.

### Development Data

Use synthetic learner records during
development and automated testing.

Do not copy real learner databases into
developer environments without an approved
and adequately protected process.

---

## 10. Cloud Storage Security

Educational files stored in Google Cloud
Storage must have appropriate access controls.

### Requirements

- Restrict bucket access.
- Disable unnecessary public access.
- Use least-privilege service identities.
- Validate uploaded content.
- Protect unpublished learning material.
- Prevent unauthorized file modifications.
- Apply approved file download controls.

### Download Security

Where protected content is downloaded,
the backend should validate authorization
before providing access.

Time-limited signed URLs may be considered
where appropriate.

Downloaded content may remain available
locally while offline.

The team must define how content expiration,
updates and withdrawal are handled.

---

## 11. Offline Application Security

Offline learning introduces additional
security and privacy considerations.

### Risks

- Shared-device access.
- Unauthorized profile switching.
- Local data exposure.
- Device loss or theft.
- Persistent authentication state.
- Stale or compromised cached data.
- Unsynchronized activity records.

### Required Controls

- Separate learner data logically.
- Minimize sensitive local information.
- Protect authentication credentials.
- Avoid storing backend secrets.
- Define session expiration behavior.
- Provide secure profile-switching procedures.
- Validate synchronized records server-side.
- Protect against cross-profile data access.

### Shared-Device Requirements

The team must define:

- Learner identification.
- Profile access controls.
- Session switching.
- Device recovery.
- Local data removal.
- Consent and privacy requirements.

A device profile identifier alone does
not provide secure authentication.

### Browser Storage

IndexedDB is proposed for local data.

Browser storage is not automatically
protected against all device-level threats.

Sensitive local data requires risk assessment
and appropriate protection measures.

---

## 12. NVIDIA AI Integration Security

AI service requests must pass through
an approved backend integration.

### Requirements

- Store NVIDIA API credentials securely.
- Never expose secret keys in frontend code.
- Validate requests before forwarding.
- Restrict unnecessary personal information.
- Apply request limits.
- Handle AI service failures safely.
- Validate returned content.
- Apply educational quality requirements.

### AI Content Safety

AI-generated educational content may contain:

- Inaccurate information.
- Inappropriate material.
- Misleading explanations.
- Unsupported claims.
- Unintended bias.

Required measures:

- Define acceptable educational content.
- Evaluate output quality.
- Review generated learning materials.
- Apply appropriate safeguards for minors.
- Provide educator oversight where required.
- Establish procedures for reporting unsafe output.

---

## 13. Data Privacy Requirements

LearnLite must follow applicable data
protection requirements.

For South African deployments, the team
should assess obligations under the
Protection of Personal Information Act (POPIA).

Additional legal requirements may apply
depending on where learners are located.

### Principles

- Collect only necessary information.
- Define legitimate processing purposes.
- Establish appropriate authorization.
- Protect learner records.
- Minimize retention.
- Restrict access.
- Establish deletion procedures.
- Avoid unnecessary third-party disclosures.

Special protection considerations apply
when processing children's personal information.

The team must confirm applicable legal
requirements before processing real learner data.

---

## 14. Data Classification

Proposed classification model:

### Public

Examples:
- Approved public documentation.
- Published educational descriptions.

### Internal

Examples:
- Internal engineering documentation.
- Non-sensitive architecture information.
- Development plans.

### Confidential

Examples:
- Private learner information.
- Internal security assessments.
- Restricted application records.

### Restricted

Examples:
- Production credentials.
- Private keys.
- Authentication signing secrets.
- Highly sensitive administrative information.

Restricted information must not be
committed to GitHub.

---

## 15. Logging and Monitoring Security

Application monitoring must support
reliability without exposing sensitive data.

### Recommended Logs

- Request failures.
- API validation failures.
- Authentication failures.
- Authorization failures.
- Synchronization errors.
- Cloud service failures.
- Deployment failures.

### Prohibited Logging

Do not log:

- Passwords.
- API keys.
- Access tokens.
- Private keys.
- Unnecessary learner personal information.
- Sensitive request payloads.

### Monitoring Responsibilities

Ernest:
Monitoring requirements and evaluation.

Elvis:
Cloud implementation and operational logging.

Aashma:
Security oversight.

---

## 16. Security Testing

The team should test:

### Authentication
- Invalid credentials.
- Expired sessions.
- Missing authentication.

### Authorization
- Access to another learner's records.
- Unauthorized profile modification.
- Restricted administrative operations.

### API Security
- Invalid payloads.
- Excessive requests.
- Unexpected error conditions.
- Sensitive error messages.

### Offline Security
- Shared-device profile isolation.
- Cached data exposure.
- Session switching.
- Local progress separation.

### Cloud Security
- Service account permissions.
- Secret access restrictions.
- Storage access controls.
- Deployment identity restrictions.

### AI Security
- API key exposure.
- Malformed AI responses.
- Excessive requests.
- Unsafe generated educational content.

Security findings must be tracked and
resolved before production release.

---

## 17. Dependency and Supply Chain Security

The project must manage software
dependencies responsibly.

Recommended measures:

- Review package dependencies.
- Use lockfiles.
- Monitor dependency vulnerabilities.
- Avoid unnecessary packages.
- Review third-party GitHub Actions.
- Pin sensitive workflow dependencies
  to reviewed commit identifiers where practical.
- Review updates before merging.
- Remove unused packages.

---

## 18. Deployment Security

Production deployment must be controlled.

### Requirements

1. Use approved deployment workflows.
2. Authenticate securely to Google Cloud.
3. Restrict deployment permissions.
4. Validate configuration.
5. Run required tests.
6. Protect secrets.
7. Record deployment versions.
8. Monitor deployment health.
9. Define rollback procedures.
10. Review production access periodically.

### Environment Separation

Development and production resources
should use separate configuration and
access controls.

Development must not rely on production
learner information.

---

## 19. Security Incident Response

A security incident may include:

- Exposed API credentials.
- Unauthorized repository access.
- Compromised service accounts.
- Unauthorized data access.
- Sensitive information appearing in logs.
- Unexpected infrastructure changes.
- Compromised application dependencies.

### Response Procedure

1. Identify the suspected incident.
2. Notify the security owner immediately.
3. Assess affected systems and information.
4. Contain the immediate risk.
5. Revoke or rotate compromised credentials.
6. Preserve relevant evidence securely.
7. Investigate the cause.
8. Restore affected services safely.
9. Document remediation actions.
10. Review preventive improvements.

### Incident Coordination

Primary:
Aashma Lama

Technical Response:
Elvis Ncube

Testing and Monitoring:
Ernest Lukheli

Other team members assist as required.

### Important

Deleting an exposed secret from a GitHub file
does not automatically invalidate it.

Compromised credentials must be revoked
or rotated.

Repository history may also require remediation.

Applicable legal or contractual notification
requirements must be assessed.

---

## 20. Security Review Checklist

Before approving a major implementation:

- [ ] No secrets committed to GitHub.
- [ ] Authentication requirements satisfied.
- [ ] Authorization checks implemented.
- [ ] API inputs validated.
- [ ] IAM permissions reviewed.
- [ ] Firestore access reviewed.
- [ ] Storage access reviewed.
- [ ] Offline data risks considered.
- [ ] Logs exclude sensitive information.
- [ ] Dependency vulnerabilities assessed.
- [ ] Critical security tests completed.
- [ ] Relevant reviewers approved changes.

---

## 21. Security Acceptance Criteria

The security milestone is ready when:

- Security responsibilities are assigned.
- Required identities and permissions are documented.
- Secrets are stored securely.
- Authentication and authorization are implemented.
- Cloud access is restricted appropriately.
- Offline learner privacy risks are addressed.
- Critical security tests pass.
- No unresolved release-blocking vulnerabilities remain.
- Incident-response responsibilities are understood.
- Production deployment has appropriate approval.

---

## 22. Open Security Decisions

The team must confirm:

1. Authentication provider.
2. Shared-device authentication approach.
3. Learner data retention policy.
4. Offline data protection strategy.
5. Production IAM assignments.
6. Cloud Storage access model.
7. AI content approval procedures.
8. Monitoring retention requirements.
9. Incident notification procedures.
10. Applicable privacy and child-data requirements.

---

## 23. Current Status

Status: PROPOSED

Initial security architecture and governance
requirements have been documented.

Security implementation and validation
remain ongoing team responsibilities.

Production readiness requires evidence
that applicable controls have been implemented
and tested.
