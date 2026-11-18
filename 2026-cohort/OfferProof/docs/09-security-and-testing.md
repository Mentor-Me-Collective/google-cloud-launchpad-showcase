# Security & Testing

---

## Data Protection & Privacy

OfferProof is designed with a **privacy-first architecture**:

### 1. Client-Side Analysis by Default

- The core heuristic engine runs 100% in the user's browser in pure TypeScript.
- When an offer is uploaded as a PDF or image, text extraction runs entirely locally using **PDF.js** and **Tesseract.js** in browser Web Workers.
- Raw files, screenshots, or unparsed documents are **never uploaded** to any server.

### 2. Selective Cloud Storage

- Verification reports and offer details are stored in Supabase **only when the user explicitly clicks "Save report"** while logged in.
- Guest verification leaves zero traces on the server. If a guest user chooses to keep an offer for comparison, the text is kept locally in `localStorage` (`offerproof:pending-offers`) until they authenticate.

### 3. Row Level Security (RLS)

- Every table in PostgreSQL (`offers`, `verification_reports`, `comparisons`) has PostgreSQL Row Level Security enabled.
- All CRUD policies strictly enforce `auth.uid() = user_id`.
- The public Supabase client uses an anonymous publishable key; without a valid JWT containing the matching `sub` claim, no user can read or modify another user's records.

### 4. Secret Isolation

- API credentials (`NVIDIA_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`) are stored exclusively in Supabase Edge Function environment secrets.
- Secrets are never embedded in the frontend bundle, client network requests, or source code.
- BigQuery queries are mediated through a short-lived OAuth2 bearer token minted server-side using Google Service Account RS256 JWT claims.

---

## Multi-User Session Isolation

### The Problem

In multi-user or multi-tab web applications, shared state (global variables, broad cache keys, un-scoped event listeners, or cross-tab storage) can cause data leakage where User A's input in one browser/tab is overwritten or cleared when User B performs an action.

### The Solution: Scoped `sessionStorage`

OfferProof implements comprehensive multi-user session isolation:

1. **Unique Session Identifiers:**
   - Every browser window/tab initializes a unique session ID via `getOrCreateSessionId()`:
     ```ts
     // src/lib/verify/session.ts
     let id = sessionStorage.getItem("offerproof:session:id");
     if (!id) {
       id = crypto.randomUUID();
       sessionStorage.setItem("offerproof:session:id", id);
     }
     ```
   - Each browser instance (e.g., Firefox, Chrome, Edge) maintains an isolated `sessionStorage` sandbox that cannot be accessed or modified by other browsers or tabs.

2. **Scoped State Persistence:**
   - Active input text, current reports, file upload state, and active tabs are stored under `offerproof:session:state:${sessionId}`.
   - Restoring, updating, or clearing state affects **only the current session ID**.

3. **Router Revalidation Guard:**
   - Same-route navigation listeners (`router.subscribe("onResolved")`) clear and reset only the active tab's session ID and attempt counter:
     ```ts
     clearSessionState(sessionId);
     setAttempt((v) => v + 1);
     ```

4. **Edge Function Session Tagging:**
   - AI recommendation calls include `sessionId` in the payload body and context.
   - The Edge Function echoes `sessionId` back in the response.
   - The frontend validates `response.data.sessionId === effectiveSessionId` before updating state, preventing cross-session race conditions or stale responses from overwriting the view.

---

## Testing Strategy

OfferProof uses **Vitest** and **React Testing Library** with a comprehensive suite of unit and integration tests.

### Test Suites Overview

| Test Suite                | Location                                   | Focus                                                                                                                  |
| ------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Heuristic Engine**      | `src/lib/verify/engine.test.ts`            | 21 test cases validating all regex rules, point allocations, edge cases, and negation patterns                         |
| **Session Isolation**     | `src/test/session-isolation.test.tsx`      | Verifies UUID generation, concurrent multi-browser state isolation, independent resets, and session-tagged AI requests |
| **AI Recommendations**    | `src/test/ai-recommendations.test.tsx`     | Tests NVIDIA function invocation, retry mechanisms, non-blocking error display, and payload caching                    |
| **Results Page Layout**   | `src/test/results-layout.test.tsx`         | Tests layout responsiveness and element structure across 0, 1, 3, 5, and 10+ warning signals                           |
| **File Extraction & OCR** | `src/lib/verify/upload-batch.test.ts`      | File validation, MIME-type checks, and batch size constraints                                                          |
| **Upload Preview**        | `src/test/verify-upload-preview.test.tsx`  | Tests preview URLs, dialog presentation, and collapsible text preview                                                  |
| **Offer Comparison**      | `src/lib/compare/engine.test.ts`           | Salary annualization, period multipliers, ranking logic, and missing data alerts                                       |
| **Comparison UI**         | `src/test/compare-discoverability.test.ts` | Discoverability and navigation tests for the compare workflow                                                          |
| **Reset Flow**            | `src/test/verify-reset.test.tsx`           | Validates that clearing state allows repeated checks without remounting the router                                     |
| **Scam Awareness & BQ**   | `src/test/scam-awareness.test.tsx`         | BigQuery preview, filtering by fraudulent/legitimate status, and API error recovery                                    |
| **App Routing**           | `src/test/app-routing.test.tsx`            | Route definitions and authentication redirection                                                                       |

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run a specific test suite
npx vitest run src/test/session-isolation.test.tsx
```

---

## Troubleshooting Guide

### 1. "NVIDIA_API_KEY is not configured"

- **Cause:** Supabase Edge Function environment secret is missing.
- **Fix:** Run `supabase secrets set NVIDIA_API_KEY=your_key_here`.

### 2. BigQuery 502 / Authentication Error

- **Cause:** Invalid format or expired permissions in `GOOGLE_SERVICE_ACCOUNT_JSON`.
- **Fix:** Ensure the service account JSON has `roles/bigquery.dataViewer` and `roles/bigquery.jobUser` on GCP project `xenon-hub-514707-f9`. Re-set the secret using `supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='...'`.

### 3. File Upload "PDF has no selectable text"

- **Cause:** Scanned PDF containing image-only pages.
- **Fix:** OfferProof detects non-selectable PDFs and prompts the user to upload a JPG/PNG screenshot instead to activate Tesseract.js OCR.

### 4. Cross-browser Input Clearing Bug

- **Cause:** Occurs if global state or un-scoped localStorage is used across sessions.
- **Fix:** The system uses `sessionStorage` scoped via `getOrCreateSessionId()` in `src/lib/verify/session.ts` so distinct browser processes (Firefox, Chrome) and different tabs remain strictly isolated.
