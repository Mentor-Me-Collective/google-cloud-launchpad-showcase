# Deploy to Google Cloud Run (Blanca owns; NOT yet tested by the team)

Replace `$PROJECT` and `$REGION`. Run from the repo root. Nothing here puts a secret in Git.

```bash
gcloud config set project $PROJECT
gcloud services enable run.googleapis.com cloudscheduler.googleapis.com firestore.googleapis.com \
  secretmanager.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

# 1. secrets (pipe from your shell, never commit the value)
printf '%s' "$NVIDIA_API_KEY" | gcloud secrets create nvidia-api-key --data-file=-
openssl rand -hex 24 | tr -d '\n' | gcloud secrets create ingest-token --data-file=-

# 1b. data + files (Firestore native mode, private bucket, runtime service account roles)
gcloud firestore databases create --location=$REGION
gsutil mb -l $REGION -b on gs://$PROJECT-climateops-proof     # uniform access = private by default
SA=$(gcloud iam service-accounts list --filter="displayName:Compute Engine default" --format='value(email)')
for R in roles/datastore.user roles/secretmanager.secretAccessor roles/storage.objectAdmin roles/iam.serviceAccountTokenCreator; do
  gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=$R; done
# (use a dedicated least-privilege service account instead of the default one if time allows: Shiksha)

# 2. deploy (Firestore + Storage are what make the Google Cloud integration real; if Firestore misbehaves, fall back to STORE_BACKEND=memory with --max-instances 1 and say so in the demo)
gcloud run deploy climateops-api --source . --region $REGION --allow-unauthenticated \
  --set-env-vars DEMO_MODE=true,STORE_BACKEND=firestore,STORAGE_BUCKET=$PROJECT-climateops-proof,NVIDIA_MODEL_ID=<exact id from smoke test>,NWS_USER_AGENT="ClimateOps/0.1 (team-email)" \
  --set-secrets NVIDIA_API_KEY=nvidia-api-key:latest,INGEST_TOKEN=ingest-token:latest \
  --min-instances 1

# 3. scheduler (only meaningful when DEMO_MODE=false)
gcloud scheduler jobs create http climateops-ingest --location $REGION --schedule "*/5 * * * *" \
  --uri "https://<service-url>/internal/ingest" --http-method POST \
  --headers "X-Ingest-Token=$(gcloud secrets versions access latest --secret=ingest-token)"

# 4. verify (DEMO_MODE=true re-seeds the fictional orgs on every start, including into Firestore)
python scripts/demo_flow.py https://<service-url>
```
Notes: `--allow-unauthenticated` is acceptable only because the app has its own bearer auth and DEMO data; put it behind IAM/IAP before any real use. Set a Billing budget alert (Shiksha).
