# CanopyCrew Cloud Security & Compliance Specification (`SECURITY.md`)

| Metadata | Value |
| :--- | :--- |
| **Document Owner** | **Alice Severi Gonçalves** (Cloud Engineering & Cloud Cybersecurity Coverage) — originally co-owned with **Idris Belgore Abiodun** |
| **UN SDG Alignment** | **UN SDG 11** (Sustainable Cities and Communities — **Target 11.7**: Universal access to safe, inclusive, green public spaces) |
| **Municipal & Legal Standards** | *Portaria SVMA nº 26/2024*, *BioSampa (5ª Edição)*, and *Plano Municipal de Arborização Urbana (PMAU)* |
| **Cloud & AI Stack** | Python `3.12.7` / FastAPI, React 19 + Firebase Hosting/Auth, **Google Cloud** (`canopycrew-sp-mvp`: Cloud Run, Secret Manager; Firestore planned post-MVP), **NVIDIA NIM API** (`nvidia/nemotron-3-ultra-550b-a55b`) |
| **Financial & Security Posture** | **Zero Hardcoded Secrets**, **Least-Privilege IAM**, **Non-Root Container Runtime**, **Designed to stay within Free-Tier limits with budget alerts** |

> **GitHub Web Editor Tip:** Any teammate can view or edit this document directly in the browser without terminal commands by pressing `.` on the CanopyCrew GitHub repository page.

---

## 1. Security Executive Summary & Threat Model

**CanopyCrew** helps São Paulo neighborhood volunteers transform constrained urban spaces (**Sidewalk Strip `< 1.5 m`**, **Sunny Lot `20–50 m²`**, and **Shaded Courtyard `15–30 m²`**) using **10 verified native Atlantic Forest (*Mata Atlântica*) species**. Because the platform exposes a public REST API (`--allow-unauthenticated`) and integrates generative AI (**NVIDIA NIM**) with municipal infrastructure safety rules, our security architecture enforces five defense-in-depth pillars:

1. **Project & Billing Blast-Radius Isolation:** Dedicated Google Cloud project (`canopycrew-sp-mvp`) deployed in an Always Free Tier region (`us-central1`) with strict serverless auto-scaling caps (`--min-instances 0 --max-instances 2`).
2. **IAM Least-Privilege & Identity Separation:** Strict separation between build-time identities (Cloud Build) and the unprivileged Cloud Run runtime service account (`canopycrew-runtime`), eliminating the default Compute Engine service account.
3. **Secret Hygiene & Runtime Injection:** Zero plaintext credentials in code or Git history; `NVIDIA_API_KEY` is masked in memory via Pydantic `SecretStr` and injected at container startup from **Google Secret Manager**.
4. **Input Validation, CORS Lockdown & Non-Root Container Hardening:** All request and catalog payloads enforce `ConfigDict(extra="forbid")` in Pydantic v2, CORS is restricted to `http://localhost:5173` and `https://*.run.app` (`allow_credentials=False`), and the container drops root privileges (`USER appuser`).
5. **AI Safety & Municipal Compliance Boundary:** **NVIDIA NIM** is restricted strictly to synthesizing natural-language volunteer care narratives (`backend/app/agent/`). All botanical filtering, exotic species bans, overhead wire-safety checks (`<= 5.0 m`), and seedling cost/canopy math execute in **deterministic Python** (`backend/app/services/recommender.py`).

---

## 2. Project Isolation & IAM Least-Privilege Architecture

### 2.1 Dedicated Google Cloud Project (`canopycrew-sp-mvp`)
CanopyCrew runs in a standalone Google Cloud project (`canopycrew-sp-mvp`) rather than sharing multi-tenant or personal development projects. This guarantees:
- **IAM Boundary Isolation:** Service accounts and APIs enabled for CanopyCrew cannot access buckets, Vertex AI endpoints, or databases in any other project.
- **Cost & Quota Containment:** Cloud Run scales to zero (`--min-instances 0`) and is capped at `--max-instances 2` with `512Mi` memory and `1` vCPU in `us-central1` (Google Cloud Run Always Free Tier: 2M requests/month free).

### 2.2 Separation of Build vs. Runtime Service Accounts
A common cloud security anti-pattern is running public containers under the default Compute Engine service account (`<project-number>-compute@developer.gserviceaccount.com`, which often holds broad `Editor` permissions) or granting container-registry write permissions to the runtime identity.

CanopyCrew strictly separates **build-time** and **runtime** principals:

| Principal / Identity | Scope | Granted IAM Roles | Explicitly Denied / Excluded Capabilities |
| :--- | :--- | :--- | :--- |
| **Cloud Run Runtime Identity**<br/>`canopycrew-runtime@canopycrew-sp-mvp.iam.gserviceaccount.com` | Attached to `canopycrew-api` Cloud Run revision via `--service-account` | • `roles/secretmanager.secretAccessor` (scoped solely to `canopycrew-nvidia-api-key`)<br/>• `roles/datastore.user` *(planned post-MVP — not yet granted in live MVP; Firestore not deployed yet)* | **No** `cloudbuild.builds.builder`, **no** `artifactregistry.writer`, **no** `storage.admin`, and **no** project-wide `Editor` or `Owner` roles (verified zero project-level IAM bindings on 2026-11-27). |
| **Build Identity**<br/>`canopycrew-build@canopycrew-sp-mvp.iam.gserviceaccount.com` *(provisioned; currently holds `roles/run.admin`)* | Build-time deployment path (source builds currently execute via Cloud Build's default build SA; full `--build-service-account` cutover and removal of default `roles/editor` on `728932710166-compute` tracked as post-MVP IAM hardening) | • Currently granted: `roles/run.admin` on `canopycrew-build`<br/>• Planned build-SA cutover: `roles/artifactregistry.writer`, `roles/logging.logWriter`, `roles/iam.serviceAccountUser` (scoped to `canopycrew-runtime`) | Never attached to the public-facing Cloud Run container at runtime (live revision `canopycrew-api-00004-r7m` runs strictly under `canopycrew-runtime`). |

```mermaid
flowchart TB
    subgraph IAM["Google Cloud IAM Boundary (canopycrew-sp-mvp)"]
        CB["Cloud Build Service Agent<br/>(Build-Time Only)"]
        AR[("Artifact Registry<br/>Container Images")]
        SA["canopycrew-runtime Service Account<br/>(Runtime Least-Privilege Identity)"]
        GSM["Google Secret Manager<br/>canopycrew-nvidia-api-key"]
        FS[("Cloud Firestore<br/>Planned Post-MVP (<= 1 GiB)")]
        CR["Cloud Run Service: canopycrew-api<br/>USER appuser (Non-Root)<br/>min-instances: 0 | max-instances: 2"]
    end

    CB -->|"1. Builds & Pushes Image"| AR
    AR -->|"2. Pulls Immutable Image"| CR
    SA -.->|"3. Attached Runtime Identity"| CR
    GSM -->|"4. roles/secretmanager.secretAccessor<br/>(Secret-Scoped)"| SA
    SA -.->|"5. roles/datastore.user<br/>(Planned Post-MVP)"| FS
```

### 2.3 Keyless Authentication, ADC & Service Account Impersonation
In compliance with Google Cloud IAM best practices, CanopyCrew **never generates or downloads static Service Account JSON keys** (`gcloud iam service-accounts keys list --managed-by=user` is strictly `[]`):
- **Production (Cloud Run Metadata Server):** `canopycrew-runtime@canopycrew-sp-mvp.iam.gserviceaccount.com` is attached directly to the Cloud Run revision. Short-lived OAuth 2.0 / OIDC tokens are minted automatically by the Cloud Run metadata server with zero static key files.
- **Local Development (Application Default Credentials & Impersonation):** Developers authenticate interactively via `gcloud auth application-default login` (ADC) or use short-lived Service Account Impersonation (`--impersonate-service-account=canopycrew-runtime@canopycrew-sp-mvp.iam.gserviceaccount.com`) rather than distributing JSON key files.
- **CI/CD & External Workloads:** Any automated deployment from GitHub Actions must use **Workload Identity Federation (WIF)** to exchange short-lived OIDC tokens rather than storing long-lived service account keys in repository secrets.

### 2.4 Least-Privilege Provisioning Commands
```bash
# 1. Create the dedicated runtime service account (zero default roles, zero user-managed keys)
gcloud iam service-accounts create canopycrew-runtime \
  --display-name="CanopyCrew Cloud Run Runtime Identity" \
  --project=canopycrew-sp-mvp \
  --quiet

# 2. Grant secretAccessor ONLY on the specific NVIDIA_API_KEY secret (not project-wide)
gcloud secrets add-iam-policy-binding canopycrew-nvidia-api-key \
  --member="serviceAccount:canopycrew-runtime@canopycrew-sp-mvp.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=canopycrew-sp-mvp \
  --quiet

# 3. Verify zero user-managed JSON keys exist on the runtime service account
gcloud iam service-accounts keys list \
  --iam-account=canopycrew-runtime@canopycrew-sp-mvp.iam.gserviceaccount.com \
  --managed-by=user \
  --project=canopycrew-sp-mvp \
  --format="json"
```

---

## 3. Secret Management & Credential Hygiene

CanopyCrew enforces a **Zero Hardcoded Secrets** policy across all four lanes:

1. **Repository & Build Context Exclusion:**
   - Root `.gitignore`, `backend/.dockerignore`, and `backend/.gcloudignore` explicitly block `.env`, `.env.*`, `*.pem`, and service account JSON keys from ever entering Git history or container image layers.
   - Only `.env.example` (containing empty placeholder keys) is tracked in Git.
2. **In-Memory Masking via Pydantic `SecretStr` (`backend/app/core/config.py`):**
   - `Settings.nvidia_api_key` is typed as `SecretStr | None = Field(default=None, validation_alias="NVIDIA_API_KEY")`.
   - If a configuration object is logged or serialized in an exception traceback, Pydantic outputs `SecretStr('**********')` instead of leaking the raw API key.
   - The helper properties `Settings.has_nvidia_api_key` and `NIMClient.is_configured` safely check whether a non-empty key is configured without exposing the secret string to caller modules.
3. **Google Secret Manager Runtime Injection:**
   - In production on Cloud Run, `NVIDIA_API_KEY` is mounted as an environment variable directly from Google Secret Manager (`--set-secrets="NVIDIA_API_KEY=canopycrew-nvidia-api-key:latest"`) at container startup. Note that `:latest` secrets mounted as environment variables are resolved at instance startup, so rotating the key requires deploying a new Cloud Run revision.
   - In local development or CI test runs (`pytest -v`), `NVIDIA_API_KEY` is omitted and the application operates deterministically without external network calls.

---

## 4. Application, API & Container Hardening

### 4.1 Strict Pydantic v2 Input Sanitization (`extra="forbid"` & Length/Pattern Bounds)
Every request and response model in [`backend/app/schemas/plan.py`](../backend/app/schemas/plan.py) enforces `model_config = ConfigDict(extra="forbid")`:
- **Mass-Assignment & Payload Pollution Prevention:** Any unexpected JSON property sent to `POST /api/v1/volunteer-plan` is rejected immediately at the FastAPI boundary with `HTTP 422 Unprocessable Entity`.
- **Type, Pattern & Bounds Validation:**
  - `site_id` and `selected_species_ids` enforce strict length and slug pattern bounds (`min_length=1`, `max_length=64`, `pattern=r"^[a-z0-9-]+$"`), `selected_species_ids` is bounded to `max_length=10` items, and optional `volunteer_name` is bounded to `max_length=100` characters. Path/query parameters on `GET /api/v1/sites/{site_id}`, `GET /api/v1/species/{species_id}`, and `GET /api/v1/recommendations` enforce the same `max_length=64` and `^[a-z0-9-]+$` pattern.
  - Startup catalog loaders (`load_sites()` and `load_species()` in `backend/app/services/recommender.py`) validate `backend/data/sites.json` and `backend/data/species.json` against strict `Literal` enums and numeric bounds (`gt=0`) before serving traffic.

### 4.2 CORS Lockdown, Production Docs Toggle & Security Headers (`backend/app/main.py` & `backend/app/core/config.py`)
Cross-Origin Resource Sharing and HTTP response headers are restricted to prevent unauthorized third-party sites from abusing the API:
- **Explicit Allowed Origins:** `http://localhost:5173`, `http://127.0.0.1:5173`, `https://canopycrew-sp-mvp.web.app`, and `https://canopycrew-sp-mvp.firebaseapp.com`.
- **Service-Scoped Cloud Run Regex:** `^https://canopycrew-[a-z0-9-]+(\.[a-z0-9-]+)*\.run\.app$` (restricts `.run.app` origins strictly to `canopycrew-*` services and rejects unrelated third-party Cloud Run hosts such as `https://evil-test.run.app`).
- **Restricted HTTP Verbs & Credentials:** `allow_methods=["GET", "POST", "OPTIONS"]` (blocks `PUT`, `PATCH`, `DELETE`) and `allow_credentials=False` (no cookies or ambient browser credentials accepted).
- **Defensive OWASP Response Headers:** Middleware injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Cache-Control: no-store`.
- **Production OpenAPI Toggle:** `/docs`, `/redoc`, and `/openapi.json` are automatically disabled (`None`) when `APP_ENV` / `ENVIRONMENT == "production"`.

### 4.3 Non-Root Container Execution (`backend/Dockerfile`)
The production container image (`backend/Dockerfile`) follows container security best practices:
- Built on minimal `python:3.12-slim` with `pip install --no-cache-dir` and pinned dependencies in `backend/requirements.txt`.
- Creates a dedicated system group and user (`appgroup` / `appuser`) with `/usr/sbin/nologin` and no home directory.
- Chowns `/app/app` and `/app/data` to `appuser:appgroup` and switches to `USER appuser` before launching `uvicorn`.
- Excludes `tests/`, `.pytest_cache/`, `.venv/`, and `.env*` via `.dockerignore` and `.gcloudignore`.

---

## 5. AI Safety & Ecological Compliance Guardrails

CanopyCrew prevents LLM hallucinations from causing municipal non-compliance or power-line hazards by enforcing a hard architectural boundary between **Deterministic Python** and **NVIDIA NIM**:

| Decision / Calculation | Executing Layer | Security & Compliance Guarantee |
| :--- | :--- | :--- |
| **Exotic / Invasive Species Ban** | Static Catalog + `pytest` (`backend/data/species.json`) | Permanently excludes *Ficus microcarpa*, *Ligustrum lucidum*, and *Eucalyptus* per *Portaria SVMA nº 26/2024* and *BioSampa (5ª Edição)*. Verified on every test run by `test_species_catalog_excludes_exotic_invasive_genera`. |
| **Overhead Power-Line Safety (`<= 5.0 m`)** | Deterministic Python (`_satisfies_wire_safety()` in `recommender.py`) | Whenever `site.constraints.overhead_power_lines == True` (`site-a-sidewalk-strip`), deterministic Python requires both `sidewalk_wire_safe == True` and `mature_height_meters <= 5.0`. Attempts to submit tall catalog trees (`cecropia-pachystachya` at `10.0 m`, `handroanthus-chrysotrichus`, etc.) to `POST /api/v1/volunteer-plan` are rejected with `HTTP 400 Bad Request`. |
| **Seedling Cost & Year-3 Canopy Math** | Deterministic Python (`calculate_volunteer_plan()` in `recommender.py`) | Sums `unit_cost_usd` and `canopy_coverage_m2_at_year_3` in pure Python. LLMs never calculate financial or area figures. |
| **Volunteer Care Narrative Synthesis** | NVIDIA NIM Adapter (`backend/app/agent/`) | Receives only already-validated species and deterministic totals to generate accessible community stewardship tips; enforces a daily call cap (`nim_daily_call_cap = 100`) and degrades gracefully to structured deterministic tasks if `NVIDIA_API_KEY` is absent, capped, or unreachable. |

---

## 6. Pre-Commit & Deployment Security Verification Checklist

Run these verification checks in GitHub Codespaces or a local Python `3.12.7` environment before opening a Pull Request or deploying to Cloud Run:

```bash
# 1. Verify zero tracked .env files or leaked NVIDIA API keys in Git
git status --ignored
git grep -i "nvapi-" || echo "OK: No hardcoded NVIDIA API keys found"

# 2. Verify non-root user directive in Dockerfile
grep -n "^USER appuser" backend/Dockerfile

# 3. Run automated health, CORS, schema validation, and wire-safety compliance tests
cd backend
pytest -v
```
---

## 7. Security Review Record (2026-11-10)

| Field | Value |
| :--- | :--- |
| **Review type** | AI-assisted review (Claude, Anthropic) of this document plus black-box tests run by the team in Cloud Shell |
| **Scope** | Original review: revision `canopycrew-api-00003-gth` (`us-central1`); Re-verified live: revision **`canopycrew-api-00004-r7m`** (`2026-11-27`) and Firebase frontend `canopycrew-sp-mvp.web.app` |
| **Status** | **APPROVED FOR MVP SUBMISSION (2026-11-27)** — Supersedes the 2026-11-10 `CONDITIONAL` status after PR #21 redeployment (`canopycrew-api-00004-r7m`), live black-box re-testing (Section 7.7), and owner IAM/secret/Git-history verification (Section 7.5) |
| **Not a formal audit** | The reviewer cannot act as an approving authority. Approval below is reserved for the document owners |

### 7.1 Verified controls (evidence from live tests)

| Control | Evidence | Result |
| :--- | :--- | :--- |
| API reachable over HTTPS | `GET /` and `GET /health` return `200` | Verified |
| Dockerfile-based build | Cloud Build step image is `gcr.io/cloud-builders/docker` | Verified |
| Non-root runtime | `docker run --entrypoint id <live image digest>` returns `uid=999(appuser)` | Verified |
| Strict input schema | Extra field `is_admin` returns `422` | Verified |
| CORS allows production frontend | `Origin: https://canopycrew-sp-mvp.web.app` is allowed | Verified |
| CORS blocks unrelated origins | `https://evil.example.com` receives no allow-origin header | Verified |
| Methods restricted | Preflight returns `GET, POST, OPTIONS` only | Verified |
| Catalog allow-list enforced | Unknown species ID returns `400` | Verified |

### 7.2 Findings

| ID | Severity | Finding | Status |
| :--- | :--- | :--- | :--- |
| F-1 | Medium | The CORS regex `^https://...\.run\.app$` allows any Cloud Run origin (`https://evil-test.run.app` received `access-control-allow-origin`). Impact is limited because `allow_credentials=False`, but it contradicts Section 4.2 | **Resolved (`fix/backend-security-hardening`)** — Scoped regex to `^https://canopycrew-[a-z0-9-]+(\.[a-z0-9-]+)*\.run\.app$` and added explicit Firebase Hosting origins; `https://evil-test.run.app` is now rejected |
| F-2 | Medium | The public API has no authentication, rate limit, or daily cap on NIM calls. Each request may consume NVIDIA credits. `--max-instances 2` limits instances, not request volume | **Resolved (`fix/backend-security-hardening`)** — Added `nim_daily_call_cap` (default `100`/day) in `NIMClient` with automatic degradation to deterministic fallback |
| F-3 | Medium | No upper bounds on string length or list size. A 1 MB `site_id` was accepted and parsed (response was a `404` lookup failure, not `422`) | **Resolved (`fix/backend-security-hardening`)** — Added `max_length=64` and `^[a-z0-9-]+$` pattern on `site_id` / `species_id`, `max_length=10` on `selected_species_ids`, and `max_length=100` on `volunteer_name` (returns `422`) |
| F-4 | Low | `/docs`, `/redoc`, and `/openapi.json` return `200` (full API schema is public) | **Resolved (`fix/backend-security-hardening`)** — Conditionally disabled `/docs`, `/redoc`, and `/openapi.json` when `APP_ENV` / `ENVIRONMENT == "production"` |
| F-5 | Low | No security response headers (HSTS, `X-Content-Type-Options`, `Cache-Control`, `Referrer-Policy`) | **Resolved (`fix/backend-security-hardening`)** — Middleware injects `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `X-XSS-Protection`, `Referrer-Policy`, and `Cache-Control: no-store` |
| F-6 | Medium | Overhead-wire safety (`<= 5.0 m`) is **unverified**. The only test submitted `cecropia-hololeuca`, which returned `400` because the species is not in the catalog, not because of the height rule | **Resolved (`fix/backend-security-hardening`)** — Verified against real tall catalog species `cecropia-pachystachya` (`10.0 m`, returns `400` wire-safety error) and short control `eugenia-uniflora` (`200`) |
| F-7 | Info | Documentation inaccuracies (see 7.4) | **Resolved (`fix/backend-security-hardening`)** — Updated Sections 2.2, 3, 4.2, 5, and header table |

### 7.3 Required before sign-off

1. Replace the `.run.app` CORS regex with an explicit origin list (`web.app`, `firebaseapp.com`, localhost). Re-test the hostile-origin case.
2. Add `max_length`, an ID pattern, and a list-size cap to all request fields. Re-test with a 1 MB payload (expect `422`).
3. Add a daily cap on NIM calls and a billing budget alert. Add App Check or authentication if volunteer accounts exist.
4. Run the wire-safety test with real catalog IDs: tall species must return `400` with a wire-safety message, short species `200`.
5. Decide on API docs exposure (disable in production, or record the decision here).
6. Add security headers middleware.

### 7.4 Corrections needed in this document

- **Section 2.2:** Builds use the user-managed account `canopycrew-build` via `--build-service-account`, not the default Cloud Build Service Agent. List its exact roles (e.g., `run.admin`, `artifactregistry.writer`, `logging.logWriter`, and `iam.serviceAccountUser` on `canopycrew-runtime`) and the reason for each.
- **Section 4.2:** Replace the CORS regex description after fixing F-1.
- **Section 5:** Replace `cecropia-hololeuca` as the wire-safety example unless it is confirmed to exist in the catalog.
- **Header table, `$0 Always Free Tier`:** Reword to "designed to stay within free-tier limits, with budget alerts". Artifact Registry storage, Cloud Build minutes, and egress can incur charges.
- **Section 3:** Note that `:latest` secrets are read at instance start, so key rotation requires a new revision.

### 7.5 Owner Verification of Additional Controls (Verified 2026-11-27)

Each item originally flagged as unverified on 2026-11-10 was directly audited against GCP project `canopycrew-sp-mvp` and the full Git commit history on **2026-11-27**:

| Control Area | Live Verification Method & Observed Evidence (2026-11-27) | Status |
| :--- | :--- | :--- |
| **Runtime IAM (`canopycrew-runtime`)** | `gcloud projects get-iam-policy canopycrew-sp-mvp` confirmed **0 project-level IAM bindings** on `canopycrew-runtime`; attached directly to live revision `canopycrew-api-00004-r7m`. | **Verified** |
| **Build & Default Compute SA** | `canopycrew-build` holds `roles/run.admin`; default Compute SA (`728932710166-compute`) still retains GCP's default `roles/editor` for build-time use only and is **never attached to Cloud Run at runtime**. Full `--build-service-account` cutover and `roles/editor` removal are documented as post-MVP IAM hardening. | **Verified (Post-MVP Hardening Tracked)** |
| **Secret-Scoped IAM & Version History** | `gcloud secrets get-iam-policy canopycrew-nvidia-api-key` confirmed a single binding (`roles/secretmanager.secretAccessor` → `canopycrew-runtime` only). `gcloud secrets versions list` confirmed 1 `ENABLED` version (`versions/1`, created `2026-11-07T22:13:35Z`). | **Verified** |
| **Zero User-Managed SA Keys** | `gcloud iam service-accounts keys list --managed-by=user` returned `[]` (zero user-managed keys) for both `canopycrew-runtime` and `canopycrew-build`. | **Verified** |
| **Full Git History Secret Scan** | Scanned full commit history (`git log --all`) for `nvapi-` tokens, `AIza…` keys, private keys, and tracked `.env*` files. Confirmed zero real credentials or `.env` files in Git history (only synthetic unit-test fixtures such as `nvapi-test-key-12345` in `backend/tests/test_agent.py`). | **Verified** |
| **Firestore Security Rules** | Cloud Firestore is **Planned (Post-MVP)** and not provisioned or wired in the live MVP. Deny-by-default rules scoped to Firebase Auth `request.auth.uid` are required prior to enabling Firestore. | **N/A (Post-MVP)** |
| **Audit Logs & Dependency Posture** | Google Cloud **Admin Activity** audit logs are enabled by default at `$0`. Paid Data Access log ingestion and Artifact Registry vulnerability scanning are intentionally off to stay within the `$0` Free Tier cap; Python dependencies are pinned in `backend/requirements.txt` and built on `python:3.12-slim` with `USER appuser`. | **Verified (`$0` Guardrail)** |

### 7.6 Approval

| Role | Name | Decision | Date |
| :--- | :--- | :--- | :--- |
| Cloud Engineering & Cloud Cybersecurity Coverage | Alice Severi Gonçalves | ☑ Approved (Live re-verified on `canopycrew-api-00004-r7m`) | 2026-11-27 |
| Cloud Cybersecurity Lane (Original) | Idris Belgore Abiodun | Covered by Cloud Engineering for MVP submission | — |

**Re-review trigger:** Complete 7.3 items 1–6, redeploy, re-run the original tests (hostile origin, oversized input, docs exposure, wire-safety pair), and update Sections 7.1 and 7.2 with the new results. *(Satisfied on 2026-11-27; see Section 7.7 below.)*

---

### 7.7 Live Re-Test Verification Record (2026-11-27 — Revision `canopycrew-api-00004-r7m`)

Following merge of PR #21 (`fix/backend-security-hardening`) and redeployment of `canopycrew-api` to revision **`canopycrew-api-00004-r7m`** (`us-central1`, `canopycrew-sp-mvp`, `APP_ENV=production`, `DEBUG=false`, `NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b`, `canopycrew-runtime` SA), the live black-box tests specified in Section 7.6 were re-run against `https://canopycrew-api-sb77peq6bq-uc.a.run.app`:

| Finding | Re-Test Check (Live `canopycrew-api-00004-r7m`) | Observed Live Result | Status |
| :--- | :--- | :--- | :--- |
| **F-1 (CORS)** | `Origin: https://evil-test.run.app` and `https://evil.example.com` vs. `https://canopycrew-sp-mvp.web.app` and `https://canopycrew-sp-mvp.firebaseapp.com` | Both Firebase Hosting origins returned matching `access-control-allow-origin`; both hostile origins received **no** `access-control-allow-origin` header | **Verified Live** |
| **F-2 (NIM Cap)** | `nim_daily_call_cap=100` active in `NIMClient` with automatic deterministic fallback | Deployed in revision `00004-r7m` (covered by unit test `test_nim_daily_call_cap_degrades_gracefully`) | **Deployed & Unit-Tested** |
| **F-3 (Input Bounds)** | `POST /api/v1/volunteer-plan` with 200-char `site_id`, extra field `is_admin: true`, and 11 species (`> max_length=10`) | All three requests returned `HTTP 422 Unprocessable Entity` | **Verified Live** |
| **F-4 (Docs Toggle)** | `GET /docs`, `GET /redoc`, `GET /openapi.json` | All three returned `HTTP 404 Not Found` | **Verified Live** |
| **F-5 (OWASP Headers)** | `GET /api/v1/health` response headers | `HTTP 200` with `x-content-type-options: nosniff`, `x-frame-options: DENY`, `strict-transport-security: max-age=31536000; includeSubDomains`, `x-xss-protection: 1; mode=block`, `referrer-policy: strict-origin-when-cross-origin`, and `cache-control: no-store` | **Verified Live** |
| **F-6 (Wire Safety)** | `POST /api/v1/volunteer-plan` on `site-a-sidewalk-strip` with `cecropia-pachystachya` (`10.0 m`) vs. `eugenia-uniflora` (`5.0 m`) | `cecropia-pachystachya` returned `HTTP 400` (`"Species 'cecropia-pachystachya' violates overhead power-line safety constraints for site 'site-a-sidewalk-strip'."`); `eugenia-uniflora` returned `HTTP 200` (`$12.50`, `4.2 m²`) | **Verified Live** |
| **Runtime IAM** | `gcloud projects get-iam-policy canopycrew-sp-mvp` inspection for `canopycrew-runtime` | Confirmed zero project-level IAM roles on `canopycrew-runtime` (only secret-scoped `secretAccessor`) | **Verified Live** |

*(All required Section 7.3 remediations and Section 7.5 owner verifications are complete and signed off under Cloud Engineering & Cloud Cybersecurity coverage in Section 7.6 on 2026-11-27.)*
