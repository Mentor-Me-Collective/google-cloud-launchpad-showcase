# API keys and secrets (Secret Manager)

**Owner:** Shiksha (`@Shiksha99`) · **Status:** design implemented; Google Cloud evidence screenshots to be added in `docs/assets/security/`.

## What the secrets are

| Secret | Used for | Where it lives | Who can read it |
|---|---|---|---|
| `nvidia-api-key` | Calls NVIDIA NIM to write briefs | Google Secret Manager | Cloud Run service account only (`roles/secretmanager.secretAccessor`) |
| `ingest-token` | Lets Cloud Scheduler call `/internal/ingest` | Google Secret Manager | Cloud Run service account; value also set in the Scheduler job header |

Nothing else in the app is secret. The demo sign-in tokens are public fixtures by design.

## How a key reaches the app

1. The key is created by piping it into Secret Manager from a shell, so it is never written to a file (`deploy/README.md` step 1).
2. Cloud Run mounts it as an environment variable with `--set-secrets NVIDIA_API_KEY=nvidia-api-key:latest,INGEST_TOKEN=ingest-token:latest`.
3. The app reads secrets in one place only, `backend/app/config.py`, and never logs them.
4. The browser never receives a key: all NVIDIA calls happen on the server. `/api/v1/integrations/status` reports only whether a key is present (true/false), never the value.

## How we keep keys out of GitHub

- `.env` and other env files, `*.pem`, `*.key` and service-account JSON files are in `.gitignore`.
- `.env.example` contains placeholders only (`SET_VIA_SECRET_MANAGER_NOT_GIT`).
- `scripts/scan_secrets.py` looks for NVIDIA, Google, AWS, GitHub and Slack keys, private key blocks, service account files and assigned secrets. Run it with `make scan`, and install it as a pre-commit hook with `make hooks`. Last run on this branch: **clean**.

## Rotation (how to change a key)

```bash
# NVIDIA key: add a new version, redeploy so Cloud Run picks up :latest, then revoke the old key at build.nvidia.com
printf '%s' "$NEW_NVIDIA_API_KEY" | gcloud secrets versions add nvidia-api-key --data-file=-
gcloud run services update climateops-api --region $REGION --update-secrets NVIDIA_API_KEY=nvidia-api-key:latest
gcloud secrets versions disable <OLD_VERSION> --secret=nvidia-api-key

# Ingest token: new random value, redeploy, then update the Scheduler header
openssl rand -hex 24 | tr -d '\n' | gcloud secrets versions add ingest-token --data-file=-
```

Rotate immediately if a key is ever pasted into chat, a screenshot, a commit or a log.

## Recommended hardening (if time allows)

- Use a dedicated least-privilege service account for Cloud Run instead of the Compute Engine default account, and grant `secretAccessor` on the two secrets only, not the whole project.
- Grant Cloud Storage access on the proof bucket only (`roles/storage.objectCreator` plus `objectViewer`), not `storage.objectAdmin` project-wide.
- Have Cloud Scheduler authenticate with an OIDC token instead of a static header, so the token value is not stored in the job config.
- Set a Billing budget alert so a polling or generation loop cannot run up costs.

## Evidence checklist (add screenshots)

- [ ] Secret Manager list showing `nvidia-api-key` and `ingest-token` (values hidden)
- [ ] Permissions tab of each secret showing only the Cloud Run service account
- [ ] Cloud Run service "Variables & Secrets" tab showing the secrets referenced, not pasted
- [ ] `python scripts/scan_secrets.py` output: `secret scan: clean`
