#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${CLOUD_RUN_SERVICE_ACCOUNT:?Set CLOUD_RUN_SERVICE_ACCOUNT to a user-managed service account}"

GCP_REGION="${GCP_REGION:-us-east1}"
CLOUD_RUN_SERVICE="${CLOUD_RUN_SERVICE:-proofstack}"
FIRESTORE_COLLECTION="${FIRESTORE_COLLECTION:-proofstack_decisions}"
PROOFSTACK_PROVIDER="${PROOFSTACK_PROVIDER:-mock}"
PUBLIC_DEMO="${PUBLIC_DEMO:-false}"

ENV_VARS="PROOFSTACK_STORAGE=firestore,GCP_PROJECT_ID=${GCP_PROJECT_ID},FIRESTORE_COLLECTION=${FIRESTORE_COLLECTION},PROOFSTACK_PROVIDER=${PROOFSTACK_PROVIDER}"

args=(
  gcloud run deploy "${CLOUD_RUN_SERVICE}"
  --source .
  --project "${GCP_PROJECT_ID}"
  --region "${GCP_REGION}"
  --service-account "${CLOUD_RUN_SERVICE_ACCOUNT}"
)

if [[ "${PROOFSTACK_PROVIDER}" == "nvidia" ]]; then
  : "${NVIDIA_MODEL:?Set NVIDIA_MODEL when PROOFSTACK_PROVIDER=nvidia}"
  : "${NVIDIA_SECRET_NAME:?Set NVIDIA_SECRET_NAME to an existing Secret Manager secret}"

  ENV_VARS+=",NVIDIA_MODEL=${NVIDIA_MODEL},NVIDIA_API_BASE=${NVIDIA_API_BASE:-https://integrate.api.nvidia.com/v1}"
  args+=(
    --set-secrets "NVIDIA_API_KEY=${NVIDIA_SECRET_NAME}:latest"
  )
elif [[ "${PROOFSTACK_PROVIDER}" == "vertex" ]]; then
  : "${VERTEX_MODEL:?Set VERTEX_MODEL when PROOFSTACK_PROVIDER=vertex}"

  ENV_VARS+=",GOOGLE_CLOUD_PROJECT=${GCP_PROJECT_ID},GOOGLE_CLOUD_LOCATION=${GOOGLE_CLOUD_LOCATION:-global},VERTEX_MODEL=${VERTEX_MODEL},VERTEX_MAX_TOKENS=${VERTEX_MAX_TOKENS:-800},VERTEX_THINKING_LEVEL=${VERTEX_THINKING_LEVEL:-LOW}"
fi

args+=(
  --set-env-vars "${ENV_VARS}"
)

if [[ "${PUBLIC_DEMO}" == "true" ]]; then
  args+=(--allow-unauthenticated)
else
  args+=(--no-allow-unauthenticated)
fi

echo "Deploying ${CLOUD_RUN_SERVICE} to ${GCP_PROJECT_ID}/${GCP_REGION}"
echo "Runtime identity: ${CLOUD_RUN_SERVICE_ACCOUNT}"
echo "Provider: ${PROOFSTACK_PROVIDER}"
echo "Public demo: ${PUBLIC_DEMO}"

"${args[@]}"
