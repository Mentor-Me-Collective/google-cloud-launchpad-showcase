# Technology Stack

## Frontend

| Technology                               | Version | Role                                                               |
| ---------------------------------------- | ------- | ------------------------------------------------------------------ |
| **React**                                | 19.x    | UI component library                                               |
| **TypeScript**                           | 5.8.x   | Type-safe language for all source code                             |
| **TanStack Start**                       | 1.168.x | Full-stack React framework (SSR + file-based routing)              |
| **TanStack Router**                      | 1.170.x | Type-safe client-side routing with file-based route tree           |
| **TanStack Query**                       | 5.x     | Server-state management and data fetching for Supabase queries     |
| **Tailwind CSS**                         | 4.x     | Utility-first CSS; Vite plugin integration (no config file needed) |
| **shadcn/ui**                            | —       | Accessible component library built on Radix UI primitives          |
| **Radix UI**                             | Various | Headless accessible UI primitives (Dialog, Tabs, Accordion, etc.)  |
| **Lucide React**                         | 0.575.x | Icon library                                                       |
| **Sonner**                               | 2.x     | Toast notification system                                          |
| **Vite**                                 | 8.1.x   | Build tool and dev server                                          |
| **three.js / @react-three/fiber / drei** | 0.187.x | 3D hero scene on the landing page                                  |
| **Recharts**                             | 2.x     | Charting (available but used selectively)                          |

## Document Processing (Browser-side)

| Library                   | Role                                                                          |
| ------------------------- | ----------------------------------------------------------------------------- |
| **PDF.js** (`pdfjs-dist`) | Extracts selectable text from PDFs, up to 20 pages, runs in a Web Worker      |
| **Tesseract.js**          | OCR for JPG/PNG screenshots; runs in a Web Worker with English language model |

Both libraries run entirely in the browser. No file bytes are sent to any server during extraction.

## Backend / BaaS

| Technology                  | Role                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| **Supabase**                | Postgres database, authentication (magic links + OAuth), Row Level Security, Edge Functions runtime |
| **Supabase Auth**           | Email magic-link sign-in; session tokens stored with a custom brokered preview storage adapter      |
| **Supabase Edge Functions** | Deno-based serverless functions that call external APIs (NVIDIA, BigQuery)                          |
| **Nitro**                   | Server-side rendering engine bundled by TanStack Start; targets Cloudflare Workers by default       |

## External APIs

| API                              | Used by                                       | Purpose                                                                                                                                            |
| -------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NVIDIA Inference API**         | `offerproof-ai-recommendations` Edge Function | Powers AI Verification Recommendations, Intelligent Field Extraction, and the **AI Career Advisor** using the `nvidia/nemotron-3.5-bolt-e4b` model |
| **Google BigQuery REST API**     | `offerproof-job-postings` Edge Function       | Queries `xenon-hub-514707-f9.offerproof_analytics.job_postings` dataset                                                                            |
| **Google OAuth2 token endpoint** | `offerproof-job-postings` Edge Function       | Mints a short-lived access token from a service account JWT (RS256)                                                                                |

## AI Model

| Model                          | Provider             | Usage                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nvidia/nemotron-3.5-bolt-e4b` | NVIDIA Inference API | **1. Single-Offer Verification:** Verification Steps, Recruiter Questions, Important Precautions.<br>**2. Intelligent Extraction:** High-accuracy field and verbatim quote extraction.<br>**3. AI Career Advisor:** Multi-offer comparative analysis, trade-offs, salary growth insights, and career fit. |

The model is hosted on NVIDIA's inference platform and accessed securely through the `offerproof-ai-recommendations` Supabase Edge Function using the server-side `NVIDIA_API_KEY` secret. In verification mode, the model receives redacted offer text and heuristic context. In comparison mode, it evaluates side-by-side job offer compensation, terms, benefits, and candidate preferences while keeping career suitability strictly decoupled from safety verification.

## Database

| Technology                    | Role                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| **PostgreSQL** (via Supabase) | Stores offers, verification reports and comparisons                                   |
| **Google BigQuery**           | Analytics dataset (`job_postings`) used by the Scam Awareness Centre Explore Data tab |

## Testing

| Tool                          | Role                                                    |
| ----------------------------- | ------------------------------------------------------- |
| **Vitest**                    | 4.x — Test runner                                       |
| **@testing-library/react**    | Component rendering in tests                            |
| **jsdom**                     | DOM environment for Vitest                              |
| **@testing-library/jest-dom** | Custom matchers (`.toBeDefined()`, `.toBeNull()`, etc.) |

## Code Quality

| Tool                       | Role                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| **ESLint**                 | 9.x — Linting (with TypeScript, React Hooks, Prettier plugins)    |
| **Prettier**               | Code formatting                                                   |
| **TypeScript** strict mode | `exactOptionalPropertyTypes: true` and strict null checks enabled |

## Deployment

| Tool                               | Role                                                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Lovable-managed deployment**     | Application development and publishing/hosting through Lovable's publishable link                                            |
| **Supabase CLI**                   | Deploying and managing Edge Functions                                                                                        |
| **Lovable Cloud**                  | Primary managed hosting platform; `@lovable.dev/vite-tanstack-config` pre-wires the Vite + TanStack + Nitro + Tailwind stack |
