# LearnLite — Release and Testing Evidence

## Source
- Repository: https://github.com/LearnLite-Cloud-Build/LearnLite
- Submission source commit: 3d9c3d69779a8f074d24a4af86e011705ddf8255
- Android releases: https://github.com/LearnLite-Cloud-Build/LearnLite/releases

## Backend Deployment
- Google Cloud project: learnlite-514514
- Region: africa-south1
- Service: learnlite-api-staging
- API: https://learnlite-api-staging-669554395089.africa-south1.run.app

## Previously Verified Results
- 147 backend tests passed on deployed commit 4148666
- 8 offline sync-engine tests passed
- 11 live authorization checks passed
- 13 teacher-to-student E2E checks passed
- Live sync push/pull, retry and conflict checks passed
- Cloud Run revision 00003-qg6 deployed successfully

## Release Verification Notes
The historical test results above were obtained before
later source changes. They do not automatically certify
the latest Android APK or subsequent code commits.

Final Android testing and AI feature testing must be
recorded separately.

## Current Dependencies
- Real-device acceptance results from Ernest and the team
- NVIDIA AI credential and end-to-end AI validation
- Final written summary and presentation approval
- MMC contributor access and submission confirmation
