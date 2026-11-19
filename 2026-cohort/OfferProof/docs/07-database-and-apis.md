# Database, APIs & Data Flow

---

## Supabase PostgreSQL Database

### Tables

#### `offers`

Stores a saved offer with parsed career metadata.

| Column             | Type                 | Description                                                     |
| ------------------ | -------------------- | --------------------------------------------------------------- |
| `id`               | uuid (PK)            | Auto-generated UUID                                             |
| `user_id`          | uuid                 | `auth.uid()` — set automatically on insert                      |
| `title`            | text (1–200 chars)   | Auto-generated from `job_title at company` or date              |
| `company`          | text                 | Extracted company name                                          |
| `job_title`        | text                 | Extracted job title                                             |
| `offer_text`       | text (≤50,000 chars) | Full offer text                                                 |
| `salary_amount`    | numeric              | Parsed numeric salary                                           |
| `salary_currency`  | text                 | `INR`, `USD`, `GBP`, `EUR`                                      |
| `salary_period`    | text                 | `year`, `month`, `week`, `day`, `hour`                          |
| `benefits`         | text                 | User-entered (can be edited)                                    |
| `location`         | text                 | Extracted location                                              |
| `work_mode`        | text                 | `onsite`, `hybrid`, `remote`                                    |
| `employment_type`  | text                 | `full_time`, `part_time`, `contract`, `internship`, `freelance` |
| `employment_terms` | text                 | User-entered (probation, notice period)                         |
| `growth_rating`    | smallint (1–5)       | User's subjective growth rating                                 |
| `work_life_rating` | smallint (1–5)       | User's subjective work-life balance rating                      |
| `notes`            | text                 | Free notes                                                      |
| `created_at`       | timestamptz          | Auto-set                                                        |
| `updated_at`       | timestamptz          | Updated by trigger `offers_updated`                             |

#### `verification_reports`

Stores the output of `analyze()` for a saved offer.

| Column       | Type                 | Description                                   |
| ------------ | -------------------- | --------------------------------------------- |
| `id`         | uuid (PK)            | Auto-generated UUID                           |
| `user_id`    | uuid                 | `auth.uid()`                                  |
| `offer_id`   | uuid                 | FK → `offers.id` (CASCADE DELETE)             |
| `assessment` | text                 | `low_concern`, `needs_review`, `high_concern` |
| `points`     | integer              | Total risk score                              |
| `findings`   | jsonb                | Array of `Finding` objects                    |
| `extracted`  | jsonb                | `Extracted` object (emails, domains, etc.)    |
| `phrases`    | jsonb                | Array of matched evidence strings             |
| `offer_text` | text (≤50,000 chars) | Full offer text at time of analysis           |
| `created_at` | timestamptz          | Auto-set                                      |
| `updated_at` | timestamptz          | Updated by trigger `reports_updated`          |

#### `comparisons`

Stores a named set of offer IDs that the user selected for side-by-side comparison.

| Column       | Type               | Description                              |
| ------------ | ------------------ | ---------------------------------------- |
| `id`         | uuid (PK)          | Auto-generated UUID                      |
| `user_id`    | uuid               | `auth.uid()`                             |
| `name`       | text (1–200 chars) | User-given name for the comparison       |
| `offer_ids`  | uuid[]             | 2–10 offer IDs                           |
| `created_at` | timestamptz        | Auto-set                                 |
| `updated_at` | timestamptz        | Updated by trigger `comparisons_updated` |

---

## Row Level Security (RLS)

All three tables have RLS enabled. Every policy follows the same pattern:

```sql
-- Example for `offers` table
CREATE POLICY "Own offers select"
  ON public.offers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Own offers insert"
  ON public.offers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

This means:

- Users can **only read their own rows** — no cross-user data leakage possible at the database level.
- The `service_role` key (used only by Supabase's own backend) has unrestricted access.
- The browser Supabase client uses the `publishable` key — it can only perform operations that pass the user's JWT.

The `verification_reports` insert policy also checks that the linked `offer_id` (if provided) belongs to the same user.

---

## Supabase Authentication

OfferProof uses Supabase Auth:

- **Sign-in method**: Email magic link (and any OAuth providers enabled in the Supabase project dashboard)
- **Session storage**: Custom `brokeredPreviewStorage` adapter (auto-generated by Lovable Cloud) handles session persistence across the preview iframe boundary
- **Auto-refresh**: Sessions are refreshed automatically via `autoRefreshToken: true`

### SSR Auth Middleware (`auth-middleware.ts`)

For server-side route functions, the `requireSupabaseAuth` middleware:

1. Reads `Authorization: Bearer <JWT>` from the request header.
2. Validates the JWT format (must be a 3-part dot-separated string).
3. Creates a Supabase client using the token.
4. Calls `supabase.auth.getClaims(token)` to verify the token and extract `sub` (user ID).
5. Passes `{ supabase, userId, claims }` to the next server function.

---

## Supabase Edge Functions

Edge Functions run as Deno processes on Supabase's infrastructure. They are the only components that hold external API credentials.

### `offerproof-ai-recommendations`

| Property | Value                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------- |
| Runtime  | Deno                                                                                                |
| Trigger  | `POST /functions/v1/offerproof-ai-recommendations`                                                  |
| Auth     | Supabase JWT (attached by `supabase.functions.invoke()`)                                            |
| Secret   | `NVIDIA_API_KEY`                                                                                    |
| Timeout  | 25 seconds (AbortController)                                                                        |
| Modes    | `single` (Verification Advisory), `extract` (Intelligent Extraction), `compare` (AI Career Advisor) |

**Data flow:**

```
Client → Supabase Edge → NVIDIA API (`nvidia/nemotron-3.5-bolt-e4b`) → Client
```

**CORS:** All origins allowed (`Access-Control-Allow-Origin: *`). `OPTIONS` preflight returns `200 ok`.

### `offerproof-job-postings`

| Property         | Value                                                    |
| ---------------- | -------------------------------------------------------- |
| Runtime          | Deno                                                     |
| Trigger          | `POST /functions/v1/offerproof-job-postings`             |
| Auth             | Supabase JWT (attached by `supabase.functions.invoke()`) |
| Secret           | `GOOGLE_SERVICE_ACCOUNT_JSON`                            |
| Timeout          | 25 seconds (AbortController)                             |
| BigQuery project | `xenon-hub-514707-f9`                                    |
| Dataset          | `offerproof_analytics`                                   |
| Table            | `job_postings`                                           |
| Region           | `asia-south1`                                            |

**Data flow:**

```
Client → Supabase Edge → Google OAuth2 (JWT Bearer) → BigQuery REST API → Client
```

**Google OAuth2 token minting (manual JWT, no SDK):**

1. Parse `GOOGLE_SERVICE_ACCOUNT_JSON` → `{ client_email, private_key }`.
2. Build JWT header + claim set (scope: `bigquery.readonly`, `cloud-platform.read-only`).
3. Sign with `crypto.subtle.sign("RSASSA-PKCS1-v1_5", ...)` using the PEM private key.
4. POST to `https://oauth2.googleapis.com/token` to exchange for a short-lived access token.
5. Use the access token as `Authorization: Bearer <token>` in BigQuery API requests.

**Supported request parameters:**

| Parameter        | Type                                        | Default      | Description                                                                              |
| ---------------- | ------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| `search`         | string                                      | `""`         | Full-text LIKE search across title, company_profile, description, requirements, industry |
| `filter`         | `"all"` \| `"fraudulent"` \| `"legitimate"` | `"all"`      | Label filter                                                                             |
| `limit`          | number                                      | 25 (max 100) | Records per page                                                                         |
| `offset`         | number                                      | 0            | Pagination offset                                                                        |
| `includeSummary` | boolean                                     | true         | Whether to also fetch total/fraudulent/legitimate counts                                 |

**Response shape:**

```json
{
  "table": "xenon-hub-514707-f9.offerproof_analytics.job_postings",
  "location": "asia-south1",
  "summary": {
    "total": 17880,
    "fraudulent": 866,
    "legitimate": 17014,
    "fraudulentRate": 4.84
  },
  "records": [ { "job_id": ..., "title": ..., "fraudulent": 0, ... } ],
  "count": 25,
  "offset": 0,
  "limit": 25
}
```

The `fraudulent` field is normalised to `0` or `1` (integer) in the Edge Function, regardless of how BigQuery returns it (string `"0"/"1"`, boolean `true/false`, integer `0/1`).

---

## Client-Side Data Layer (`src/lib/offers.ts`)

```ts
// Save an offer + its report
saveOfferWithReport(text: string, report?: Report): Promise<OfferRow>

// Guest pending queue
addPending(text: string): number      // adds to localStorage, returns new length
getPending(): string[]                // reads from localStorage
clearPending(): void                  // removes from localStorage
importPending(): Promise<number>      // saves all pending offers after sign-in

// Convert a saved DB row back to a Report object
rowToReport(r: ReportRow): Report
```

---

## TypeScript Types (`src/integrations/supabase/types.ts`)

Auto-generated from the Supabase schema. All `supabase.from()` calls are fully type-checked against the generated `Database` type, including column names, value types, and RLS constraints.

Usage:

```ts
import type { Tables } from "@/integrations/supabase/types";
type OfferRow = Tables<"offers">;
type ReportRow = Tables<"verification_reports">;
```
