# Google Cloud deployment — contingency path

ProofStack intentionally uses a small Google Cloud footprint:

- **Cloud Run** — reviewer application
- **Firestore** — reviewer decision log
- **Vertex AI / Gemini** — primary live model provider and frozen evaluation provider

The repository also contains a verified NVIDIA NIM advisory path. The production-style contingency deployment remains Google Cloud based; the NVIDIA path is used to demonstrate the required alternate advisory integration without changing the frozen Vertex evaluation.

Cloud Storage is unnecessary for the MVP because the synthetic evidence is packaged with the application.

## Security model

Use a dedicated, user-managed Cloud Run service account. Do not download a service-account JSON key and do not set `GOOGLE_APPLICATION_CREDENTIALS` on Cloud Run.

The application uses Google Cloud Application Default Credentials through the attached Cloud Run service identity.

Runtime permissions:
- `roles/datastore.user` for Firestore read/write
- `roles/aiplatform.user` for Vertex AI inference

Keep deployer permissions separate from runtime permissions. Do not grant Owner or Editor to the runtime identity.

## 1. Select the project

```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-east1"
gcloud config set project "$GCP_PROJECT_ID"
```

Use project and locations approved for the BUILD environment.

## 2. Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  iam.googleapis.com \
  aiplatform.googleapis.com
```

Cloud Run source deployment uses Cloud Build and Artifact Registry behind the scenes.

## 3. Create or confirm Firestore

Check first:

```bash
gcloud firestore databases list --project "$GCP_PROJECT_ID"
```

If there is no suitable default database, create one only after confirming the location:

```bash
gcloud firestore databases create \
  --database="(default)" \
  --location="$GCP_REGION" \
  --edition=standard \
  --type=firestore-native \
  --project="$GCP_PROJECT_ID"
```

Do not casually recreate or relocate an existing database.

## 4. Create the runtime identity

```bash
export CLOUD_RUN_SERVICE_ACCOUNT="proofstack-runtime@$GCP_PROJECT_ID.iam.gserviceaccount.com"

gcloud iam service-accounts create proofstack-runtime \
  --display-name="ProofStack Cloud Run runtime" \
  --project="$GCP_PROJECT_ID"

gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:$CLOUD_RUN_SERVICE_ACCOUNT" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:$CLOUD_RUN_SERVICE_ACCOUNT" \
  --role="roles/aiplatform.user"
```

## 5. Verify Vertex before deployment

Choose a model actually available to the project.

```bash
export GOOGLE_CLOUD_PROJECT="$GCP_PROJECT_ID"
export GOOGLE_CLOUD_LOCATION="global"
export VERTEX_MODEL="confirmed-model-id"

python scripts/check_vertex.py
```

The smoke test must succeed on synthetic data before the final report claims a live Vertex integration.

## 6. Deploy the live contingency build

```bash
export PROOFSTACK_PROVIDER=vertex
export VERTEX_MODEL="confirmed-model-id"
export GOOGLE_CLOUD_LOCATION="global"
export PUBLIC_DEMO=false

bash scripts/deploy_cloud_run.sh
```

The deployment script is private by default. Set `PUBLIC_DEMO=true` only if an unauthenticated judging/demo URL is intentionally required.

## 7. Offline/cloud-platform safety net

Model access and cloud deployment can be tested independently.

To verify Cloud Run + Firestore before Vertex is available:

```bash
export PROOFSTACK_PROVIDER=mock
bash scripts/deploy_cloud_run.sh
```

Local development also defaults to mock mode.

## 8. Verify the vertical slice

Minimum verification:

1. Cloud Run revision becomes ready.
2. Reviewer page loads.
3. One weak-evidence case can be assessed.
4. One operational-evidence case can be assessed.
5. Switching evidence clears the prior assessment.
6. A hallucinated cited excerpt is visibly rejected.
7. Human overrides require a note.
8. A reviewer decision is persisted to Firestore.
9. No credential is present in the repository, UI, logs or screenshots.

## Verified NVIDIA NIM advisory path

NVIDIA NIM integration was verified on November 19, 2026 using `nvidia/nemotron-3.5-bolt-e4b` through `https://integrate.api.nvidia.com/v1`. The ProofStack UI returned JSON-parsed advisory output with provider/model provenance visible and the same parser and citation-grounding controls used elsewhere in the application.

The NVIDIA path is an integration proof, not a replacement evaluation. The frozen 20-case metrics remain the Vertex AI / Gemini 3.8 Flash results.

Keep NVIDIA credentials in runtime environment variables only and never commit the API key.
