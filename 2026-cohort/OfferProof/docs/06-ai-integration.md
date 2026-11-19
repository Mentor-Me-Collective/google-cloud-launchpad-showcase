# AI Integration

## Overview

OfferProof uses AI as a **supplementary, non-blocking layer** on top of its rule-based verification engine. The AI never modifies, overrides or replaces the heuristic findings or risk score. Its sole job is to generate contextual, human-readable guidance for the user.

---

## Architecture

```
Browser (React)
  │
  ├─ analyze(text)  ──────►  Heuristic Engine (pure TypeScript, synchronous)
  │                               │ returns: { assessment, findings, extracted }
  │                               │
  └─ AiRecommendations.tsx ──►  Supabase Edge Function (Deno)
                                    │
                                    └─ NVIDIA Inference API
                                         model: nvidia/nemotron-3.5-bolt-e4b
```

The heuristic result is shown immediately. The AI recommendations card loads asynchronously in parallel — a loading skeleton is shown and an error is displayed non-blocking if the call fails.

---

## The Edge Function: `offerproof-ai-recommendations`

**File:** `supabase/functions/offerproof-ai-recommendations/index.ts`  
**Runtime:** Deno (Supabase Edge Functions)  
**Endpoint:** Called via `supabase.functions.invoke("offerproof-ai-recommendations")`

### Request Payload

```ts
{
  sessionId?: string;          // current browser session ID
  offerText: string;           // full offer text, up to 50,000 chars (truncated to 15,000 sent to AI)
  context?: {
    sessionId?: string;
    assessment?: string;       // "low_concern" | "needs_review" | "high_concern"
    findings?: Finding[];      // heuristic findings array
    company?: string | null;
    jobTitle?: string | null;
    salary?: string | null;
  }
}
```

### Response

```ts
{
  recommendations: string;     // raw AI output (markdown with three headings)
  model: string;               // "nvidia/nemotron-3.5-bolt-e4b"
  sessionId?: string;          // echoed back for client-side session validation
}
```

### NVIDIA API Call

```ts
POST https://integrate.api.nvidia.com/v1/chat/completions
Authorization: Bearer <NVIDIA_API_KEY>
Content-Type: application/json

{
  "model": "nvidia/nemotron-3.5-bolt-e4b",
  "messages": [
    { "role": "system", "content": "<system prompt>" },
    { "role": "user",   "content": "<offer text + context block>" }
  ],
  "temperature": 0.3,
  "max_tokens": 1024
}
```

A 25-second `AbortController` timeout cancels the request if the API is slow; a 504 response is returned.

### System Prompt

The system prompt instructs the model to:

1. Never alter or override OfferProof's rule-based findings or risk assessment
2. Recommend concrete questions to ask the recruiter
3. Highlight specific clauses or onboarding steps to double-check
4. Structure output under exactly these three headings: `### Verification Steps`, `### Recruiter Questions`, `### Important Precautions`
5. Keep tone calm, empowering and pragmatic

### Context Block

The context block appended to the user message contains:

- Company name
- Job title
- Heuristic assessment level
- Each finding: `- [name] ([severity]): [explanation]`

This gives the AI model the full picture without it re-doing the heuristic analysis.

---

## Parsing AI Output: `parseStructuredRecommendations()`

**File:** `src/components/verify/AiRecommendations.tsx`

The raw markdown string from the model is split into sections. The parser handles all common heading formats the model might produce:

| Heading style example     | Detected as        |
| ------------------------- | ------------------ |
| `### Verification Steps`  | verificationSteps  |
| `**Verification Steps:**` | verificationSteps  |
| `## Recruiter Questions`  | recruiterQuestions |
| `Important Precautions:`  | precautions        |

Bullet markers (`- `, `* `, `• `, `1. `) and markdown bold (`**...**`) are stripped from each item.

**Fallback:** If no section headers are found (e.g. the model returns a plain numbered list), items are categorised by keyword:

- Contains `ask`, `question`, `inquire`, `confirm with` → `recruiterQuestions`
- Contains `never`, `caution`, `warning`, `scam`, `do not`, `avoid` → `precautions`
- Anything else → `verificationSteps`

### Result Structure

```ts
interface StructuredSections {
  verificationSteps: string[];
  recruiterQuestions: string[];
  precautions: string[];
  summaryIntro?: string; // any intro text before the first heading
}
```

---

## Session Isolation for AI Requests

Each request includes the browser session ID in both the top-level body and the context. The Edge Function echoes `sessionId` back in the response. The client checks:

```ts
if (data?.sessionId && data.sessionId !== effectiveSessionId) {
  return; // discard response from a different session
}
```

This prevents a delayed response from one session overwriting the AI recommendations displayed in another session (race condition protection).

---

## Deduplication / Caching

A cache key is computed per component instance:

```
`${effectiveSessionId}::${trimmedText}::${report.assessment}::${report.findings.length}`
```

If the same offer is re-rendered with identical inputs (e.g. tab switch, same-route navigation), the existing recommendations are shown and no new API call is made.

---

## How AI Differs from Rule-Based Detection

| Aspect                 | Rule-based Engine                    | AI Recommendations                              |
| ---------------------- | ------------------------------------ | ----------------------------------------------- |
| **Purpose**            | Detect scam signals                  | Give personalised guidance                      |
| **Speed**              | Synchronous, milliseconds            | Asynchronous, 2–10 seconds                      |
| **Determinism**        | 100% deterministic                   | Probabilistic (temperature 0.3)                 |
| **Output**             | Structured `Finding[]` with evidence | Natural language prose in three categories      |
| **Override behaviour** | Defines the official risk score      | Cannot change findings or score                 |
| **Privacy**            | Runs in browser, no upload           | Offer text sent to NVIDIA API via Edge Function |
| **Failure mode**       | Cannot fail (pure logic)             | Non-blocking: shows error card with retry       |

---

## AI Career Advisor: Compare Offers Mode

**Component:** `src/components/compare/AiCompareAdvisor.tsx`  
**Parser:** `src/lib/compare/advisor-parser.ts`  
**Route:** `src/routes/_authenticated/compare.tsx`

When comparing two or more saved offers, candidates can invoke the **AI Career Advisor powered by NVIDIA Nemotron** (`nvidia/nemotron-3.5-bolt-e4b`).

### Capabilities

- **Best Career Fit**: Recommends the strongest option based on candidate's chosen priority (Balanced, Compensation, Growth, Work-Life Balance, Flexibility) and personal career goals.
- **Comparison Summary & Pros/Cons**: Outlines distinct trade-offs for each offer being compared.
- **Salary & Career Growth Insights**: Evaluates normalized earnings, equity, progression trajectory, and purchasing power.
- **Missing Information & Recruiter Questions**: Points out missing offer terms and provides concrete questions to ask hiring managers.
- **Personalized Recommendations**: Concrete next steps on negotiation, timeline, and final decision-making.

### Safety Separation Principle

Career suitability is strictly decoupled from offer safety:

1. The AI receives OfferProof's heuristic signals (`low_concern`, `needs_review`, `high_concern`) for reference, but is instructed never to alter them or declare an offer authentic or fraudulent based on generative AI prediction.
2. The UI maintains clear visual boundaries between Career Fit comparison and Safety Verification warnings.

---

## Error Handling

| Error                     | HTTP status | UI behaviour                              |
| ------------------------- | ----------- | ----------------------------------------- |
| Missing API key           | 500         | Error card shown; retry button available  |
| NVIDIA returns non-2xx    | 502         | Error card with status code shown         |
| NVIDIA returns empty text | 502         | Error card shown                          |
| Request timeout (>25s)    | 504         | "NVIDIA API request timed out" error card |
| Invalid JSON body         | 400         | Error card shown                          |
| Network / unknown error   | 500         | Generic error card                        |
