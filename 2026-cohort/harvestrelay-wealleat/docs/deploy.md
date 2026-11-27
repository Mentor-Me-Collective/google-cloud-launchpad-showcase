# Deploying WeAllEat to Google Cloud

This puts the app on **Google Cloud Run**, saves its data in **Firestore**, keeps the NVIDIA key in **Secret Manager**, and turns on the **NVIDIA help assistant**.

Everything runs in **Cloud Shell**, the terminal built into the Google Cloud website, so you don't need to install anything. Expect it to take about 30–45 minutes the first time.

---

## 1. Create the Google Cloud project

1. Go to <https://console.cloud.google.com> and sign in.
2. Click the project picker at the top, then **New project**. Name it `harvestrelay` and click **Create**.
3. Copy the **Project ID** shown on the dashboard (it may look like `harvestrelay-123456`).

## 2. Turn on billing and set a budget alert

Cloud Run and Firestore have free tiers, but Google asks for a billing account.

1. Open the menu (☰) → **Billing** and link a billing account to the project.
2. **Billing → Budgets & alerts → Create budget.** Set the amount to **$5** and keep the email alerts on. This warns you before anything costs real money.

## 3. Get an NVIDIA API key

1. Go to <https://build.nvidia.com> and sign in.
2. Open **nvidia/nemotron-3.5-lightning-30b-a3b** (NVIDIA's fast text chat model). Check there's no "deprecated" banner on its page. If there is, pick another text chat model and note its exact name.
3. Click **Get API Key** and copy the key. **Don't paste it into GitHub, Slack or the code.**

## 4. Open Cloud Shell and get the code

Click the **>_** (Activate Cloud Shell) icon at the top right of the Google Cloud console. A terminal opens at the bottom. Run:

```bash
git clone https://github.com/misterkimchi/wealleat.git
cd wealleat
gcloud config set project YOUR_PROJECT_ID
```

## 5. Turn on the services

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com firestore.googleapis.com secretmanager.googleapis.com
```

## 6. Create the Firestore database

```bash
gcloud firestore databases create --location=nam5
```

## 7. Store the NVIDIA key in Secret Manager

This asks for the key without showing it on screen or saving it in your history. Paste the key, then press **Enter**:

```bash
read -s -p "Paste NVIDIA key: " NV && printf "%s" "$NV" | gcloud secrets create nvidia-api-key --data-file=- && unset NV
```

## 8. Give the app permission to use Firestore and the secret

```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/datastore.user"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/run.builder"
```

## 9. Deploy

```bash
gcloud run deploy wealleat --source . --region us-central1 --allow-unauthenticated \
  --set-secrets NVIDIA_API_KEY=nvidia-api-key:latest \
  --set-env-vars NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b \
  --max-instances 2
```

- If it asks to create an Artifact Registry repository, type **Y**.
- If you picked a different model in step 3, change `NVIDIA_MODEL` to its exact name.
- When it finishes, it prints a **Service URL** like `https://wealleat-xxxxx-uc.a.run.app`. That's your live app.

## 10. Check that it works

1. **Shared data (Google Cloud):** open the Service URL in two different browsers, or on your phone and computer. Sign in as a kitchen on one and claim some food. Within a few seconds, the donor or staff view on the other shows it as claimed.
2. **Help assistant (NVIDIA):** open **Help**. You'll see an **Ask a question** box. Try "I missed my pickup, what do I do?"
3. **Health check:** visit `YOUR_SERVICE_URL/api/health`. It should show `"storage":"firestore"` and `"assistant":true`.

Take screenshots of each for the README and your deck.

---

## Updating the app later

After you upload new files to GitHub, run this in Cloud Shell:

```bash
cd ~/wealleat && git pull && gcloud run deploy wealleat --source . --region us-central1
```

## Resetting the demo data

Open the yellow **Demo** button and press **Reset all demo data**. It resets the data for everyone using the app.

## If something goes wrong

| Problem | Fix |
|---|---|
| `PERMISSION_DENIED` during deploy | Wait 2 minutes after step 8 and run the deploy again. |
| The Help box doesn't appear | `/api/health` shows `"assistant":false`, so the secret isn't connected. Recheck steps 7 and 9. |
| The assistant says it's busy | Check the model name in step 9, or look at the logs: `gcloud run services logs read wealleat --region us-central1` |
| Data doesn't save | Check step 6 (database created) and the `datastore.user` role in step 8. |

## Known limits (prototype)

- Anyone with the link can use the demo accounts and change the shared data. Real sign-in (Firebase Authentication) is the next step.
- The matching rules still run in the browser. Moving them to the server is a stretch goal.
