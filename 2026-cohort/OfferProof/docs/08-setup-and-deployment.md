# Setup & Deployment

---

## Prerequisites

| Tool               | Minimum version | Purpose                                  |
| ------------------ | --------------- | ---------------------------------------- |
| Node.js            | 18.x            | Runtime for building and running the app |
| npm                | 9.x             | Package manager                          |
| Supabase CLI       | Latest          | Deploying and managing Edge Functions    |
| A Supabase project | —               | Database, Auth, Edge Functions           |

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd OfferProof-mmc
npm install
```

---

## 2. Environment Configuration

The application reads environment variables in two places:

### 2a. Browser (Vite public env)

The Supabase URL and publishable key are **hardcoded** in the auto-generated file `src/integrations/supabase/client.ts`. These are public (anon/publishable) credentials — they are safe to expose as Row Level Security controls access.

```ts
const SUPABASE_URL = "https://<your-project-ref>.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_...";
```

If you are connecting to your own Supabase project, update this file or use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` env vars if the config is wired to read from them.

### 2b. SSR Server

The middleware (`auth-middleware.ts`) reads from `process.env`:

```
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Create a `.env` file in the project root (not committed to git):

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### 2c. Supabase Edge Function Secrets

Edge Functions read secrets from Deno's environment. Set them via the Supabase CLI or dashboard:

```bash
supabase secrets set NVIDIA_API_KEY=<your-nvidia-api-key>
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='<json-string>'
```

> **Never commit secrets to source control.** The `.gitignore` excludes `.env`.

---

## 3. Database Migration

Apply the migration to create all tables, indexes, RLS policies and triggers:

```bash
supabase db push
# or for a linked project:
supabase migration up
```

The single migration file is at:

```
supabase/migrations/20261106103220_ca6ff263-667d-4611-bfd9-ecafcc910582.sql
```

It creates:

- `public.offers` with RLS
- `public.verification_reports` with RLS
- `public.comparisons` with RLS
- `set_updated_at()` trigger function used by all three tables

---

## 4. Running Locally

```bash
npm run dev
```

This starts the Vite + TanStack Start dev server on `http://localhost:3000` (or the next available port).

> **Note:** Edge Functions do not run locally unless you start the Supabase local stack with `supabase start`. When running locally, AI recommendations and BigQuery calls will fail unless you proxy to the hosted Supabase project.

---

## 5. Running Tests

```bash
npm test
# or watch mode:
npm run test:watch
```

Runs all 11 test files using Vitest in a jsdom environment.

**Current test suite (64 tests):**

| File                                       | What it tests                                    |
| ------------------------------------------ | ------------------------------------------------ |
| `src/lib/verify/engine.test.ts`            | 21 engine rules, extraction, scoring             |
| `src/lib/verify/upload-batch.test.ts`      | 7 file validation and batch upload               |
| `src/lib/compare/engine.test.ts`           | 8 comparison calculations, salary parsing        |
| `src/test/ai-recommendations.test.tsx`     | 3 AI component: invocation, error, deduplication |
| `src/test/results-layout.test.tsx`         | 7 results page layout across 0–10+ signals       |
| `src/test/session-isolation.test.tsx`      | 5 multi-user session isolation                   |
| `src/test/scam-awareness.test.tsx`         | 4 Explore Data tab: BigQuery, filters, errors    |
| `src/test/verify-reset.test.tsx`           | 1 reset clears state without remounting router   |
| `src/test/verify-upload-preview.test.tsx`  | 2 upload file preview and extracted text toggle  |
| `src/test/app-routing.test.tsx`            | 1 authenticated route redirects                  |
| `src/test/compare-discoverability.test.ts` | 5 comparison engine edge cases                   |

---

## 6. Building for Production

```bash
npm run build
```

Output is written to `.output/`:

- `.output/public/` — static assets, served from CDN
- `.output/server/` — Nitro server bundle targeting Cloudflare Workers

---

## 7. Deploying Edge Functions

```bash
# Deploy both functions:
supabase functions deploy offerproof-ai-recommendations
supabase functions deploy offerproof-job-postings
```

Confirm secrets are set before deploying:

```bash
supabase secrets list
```

---

## 8. Deploying the Frontend / SSR Server

### On Lovable Cloud (primary)

Push to your connected GitHub repository. Lovable Cloud automatically builds and deploys on every push.

### On Cloudflare Workers (manual)

```bash
npx nitro deploy --prebuilt
```

This uses the `.output/server/wrangler.json` generated by the build.

### Preview Locally

```bash
npm run preview
```

---

## 9. Linting

```bash
npm run lint
```

---

## Configuration Files Summary

| File                   | Purpose                                                 |
| ---------------------- | ------------------------------------------------------- |
| `vite.config.ts`       | Vite + TanStack Start configuration                     |
| `vitest.config.ts`     | Vitest test runner configuration                        |
| `tsconfig.json`        | TypeScript compiler options (strict mode, path aliases) |
| `components.json`      | shadcn/ui component library configuration               |
| `supabase/config.toml` | Supabase project configuration                          |
| `bunfig.toml`          | Bun package manager configuration (optional)            |
| `package.json`         | npm scripts, dependencies, overrides                    |
