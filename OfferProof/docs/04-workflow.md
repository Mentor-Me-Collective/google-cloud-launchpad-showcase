# Working Workflow

This section explains the step-by-step journey of an offer through OfferProof, from input to result.

---

## Step 1 — The User Provides the Offer

The user visits `/verify`. They have two input methods:

### Option A: Paste Text

The user pastes the raw email, message or offer letter into the textarea (up to 50,000 characters).  
A "Try a fictional sample" button loads a built-in scam example for demonstration.

### Option B: Upload a File

The user uploads a **PDF** or a **JPG/PNG screenshot**.

**PDF extraction** (browser-side, via PDF.js Web Worker):

```
file.arrayBuffer()
  → pdfjs.getDocument(data)
  → iterate up to 20 pages
  → page.getTextContent() → line reconstruction by Y-coordinate
  → joined pages with "\n\n"
```

**Image OCR** (browser-side, via Tesseract.js Web Worker):

```
createWorker("eng")
  → worker.recognize(imageFile)
  → data.text (plain string)
```

> **Privacy note:** No file bytes leave the browser during this step. Extraction is entirely local.

---

## Step 2 — Session Initialisation

Before the first render, `VerificationFlow` calls `getOrCreateSessionId()`. This creates a UUID (via `crypto.randomUUID()`) stored in `sessionStorage` — unique to this browser tab. All subsequent state reads and writes are scoped to this ID.

If the user refreshes mid-flow, their text, tab selection, upload state and report are restored from `sessionStorage`.

---

## Step 3 — The Verification Engine Runs

When the user clicks **"Check this offer"**, the browser calls:

```ts
import { analyze } from "@/lib/verify/engine";
const report = analyze(text);
```

This is a **pure TypeScript function** — no network, no React, no DOM. It runs synchronously in the browser main thread and returns a `Report` object in milliseconds.

### What the engine does:

1. **Normalises** carriage returns.
2. **Extracts structured data** using regex patterns (`extract(text)`):
   - Emails → classified as recruiter, applicant, or unknown by surrounding context
   - URLs → parsed for hostname
   - Domains → derived from emails and URLs
   - Company, job title, salary, joining date, location, recruiter name → `firstGroup()` regex matching
3. **Runs all detection rules** (see [Fraud Detection](./05-fraud-detection.md)) and builds a `findings[]` array.
4. **Calculates a risk score**: `low=1 point, medium=3, high=6`. Total points and presence of any `high` severity finding determine the assessment.
5. **Returns** `{ assessment, points, findings, extracted, phrases }`.

---

## Step 4 — Results Are Displayed

`ReportView` renders:

- **Assessment banner** (Low Concern / Needs Review / High Concern) with a summary message
- **Concern Signals** — vertically scrollable list (420px max on desktop); each finding shows name, severity badge, evidence chips, explanation, and recommended action
- **Extracted Details** — two-column compact grid of everything the engine parsed
- **OfferProof AI Recommendations** — asynchronously fetched (see Step 5)
- **Action Guide (Checklist)** — static list of things to verify before accepting

---

## Step 5 — AI Recommendations Are Fetched (Asynchronously)

`AiRecommendations` triggers a Supabase Edge Function call in the background immediately after results are displayed. The UI shows a loading skeleton; errors are non-blocking with a retry button.

**Request payload** (sent via `supabase.functions.invoke()`):

```json
{
  "sessionId": "abc-uuid-...",
  "offerText": "...(up to 15,000 chars)...",
  "context": {
    "sessionId": "abc-uuid-...",
    "assessment": "high_concern",
    "findings": [...],
    "company": "GlobalTech Solutions",
    "jobTitle": "Data Entry Executive",
    "salary": "₹45,000 per month"
  }
}
```

**Edge Function** (`offerproof-ai-recommendations/index.ts`) on Supabase:

1. Reads `NVIDIA_API_KEY` from Deno environment secrets.
2. Builds a system prompt instructing the NVIDIA model to structure output under exactly three headings.
3. Sends a POST to `https://integrate.api.nvidia.com/v1/chat/completions` with model `nvidia/nemotron-3.5-bolt-e4b`, temperature 0.3, max 1024 tokens, and a 25-second AbortController timeout.
4. Returns `{ recommendations: "...", model: "...", sessionId: "..." }`.

**Client validation**: the `sessionId` in the response is compared to `effectiveSessionId`. If they differ (indicating a race condition from another session), the response is silently discarded.

**Parsing**: `parseStructuredRecommendations()` splits the raw markdown text into three arrays: `verificationSteps`, `recruiterQuestions`, `precautions`. It handles multiple heading formats and falls back to keyword-based categorisation if no headers are found.

**Deduplication**: a cache key `${sessionId}::${trimmedText}::${assessment}::${findings.length}` prevents refetching for identical inputs within the same session.

---

## Step 6 — Saving the Report (Signed-in Users)

When the user clicks **"Save report"**:

1. `saveOfferWithReport(text, report)` is called.
2. `parseSalary()` from `compare/engine.ts` converts the salary string to `{ amount, currency, period }`.
3. `supabase.from("offers").insert(...)` creates the offer row. Row Level Security enforces `auth.uid() = user_id`.
4. `supabase.from("verification_reports").insert(...)` creates the linked report row.
5. The `offer.id` is returned; the UI shows "Saved" and prevents duplicate saves for the same text.

---

## Step 7 — Guest Pending Queue

If the user is not signed in but wants to save or compare offers:

1. `addPending(text)` stores the offer text in `localStorage` (key `offerproof:pending-offers`).
2. The user is redirected to `/login`.
3. After sign-in, `importPending()` is called (via `useImportPending()` hook on authenticated pages), which runs `saveOfferWithReport()` for each queued offer and clears the queue.

---

## Step 8 — Comparing Offers (Signed-in Users)

On the `/compare` route:

1. The user selects two or more saved offers by ticking checkboxes.
2. `compareOffers(rows)` from `compare/engine.ts` runs — also pure TypeScript, no network.
3. Salaries are annualised using `PERIOD_FACTOR` (month×12, week×52, day×260, hour×2080) for fair comparison.
4. The **AI Career Advisor powered by NVIDIA Nemotron** (`AiCompareAdvisor.tsx`) evaluates the selected offers alongside candidate priorities and personal career goals to generate:
   - **Best Career Fit**: Decisive recommendation on the strongest career match.
   - **Comparison Summary & Pros/Cons**: Objective breakdown of each offer's trade-offs.
   - **Salary & Career Growth Insights**: Analysis of total compensation, progression, and purchasing power.
   - **Missing Information & Recruiter Questions**: Clear list of ambiguities and specific questions to ask recruiters.
   - **Personalized Recommendations**: Concrete negotiation and decision advice.
5. **Safety Warnings** display heuristic findings from each offer's verification report, keeping safety validation completely decoupled from career fit.
6. The comparison can be named and saved to the `comparisons` table.
