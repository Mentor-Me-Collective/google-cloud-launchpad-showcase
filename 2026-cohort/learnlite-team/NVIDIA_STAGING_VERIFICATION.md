# LearnLite — NVIDIA AI Staging Verification

Verification date: 28 November 2026

## Verified Google Cloud integration

- Google Cloud project: learnlite-514514
- Cloud Run region: africa-south1
- Staging service: learnlite-api-staging
- Verified staging revision: learnlite-api-staging-00004-pvb
- NVIDIA model: nvidia/nemotron-3-ultra-550b-a55b
- API credentials supplied through Google Cloud Secret Manager

## Successful end-to-end test

1. Staging health endpoint returned HTTP 200.
2. Firebase teacher authentication succeeded.
3. Teacher classroom listing returned HTTP 200.
4. An existing classroom was identified.
5. POST /api/v1/classrooms/{cid}/ai/generate returned HTTP 200.
6. NVIDIA returned a non-empty educational draft.
7. Response metadata indicated draft status and required teacher review.
8. An unauthenticated AI generation request returned HTTP 401.

## Verification boundaries

The results establish teacher-facing NVIDIA draft generation
on staging. They do not establish production readiness.

The separate Gemini/Nemotron claim-checking pipeline,
mobile end-to-end integration, offline synchronization,
and complete regression coverage require separate verification.

No credentials are included in this document.
