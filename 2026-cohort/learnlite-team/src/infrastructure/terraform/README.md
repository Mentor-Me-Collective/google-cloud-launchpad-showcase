# LearnLite — Google Cloud Infrastructure

## Technical Owner
Elvis Ncube

## Purpose
Contains infrastructure configuration for deploying
and managing LearnLite on Google Cloud.

## Planned Cloud Services
- Cloud Run
- Firestore
- Cloud Storage
- Secret Manager
- IAM
- Cloud Logging
- Cloud Monitoring
- Artifact Registry

## Infrastructure Management
Terraform is the proposed Infrastructure-as-Code tool.

## Security Requirements
- Never commit service account credentials.
- Never commit API keys.
- Use least-privilege IAM permissions.
- Store application secrets in Secret Manager.
- Keep Terraform state outside the Git repository.

## Status
Infrastructure configuration pending.
