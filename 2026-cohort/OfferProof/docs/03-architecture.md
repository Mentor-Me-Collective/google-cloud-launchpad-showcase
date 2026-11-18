# System Architecture

## Component Map

```mermaid
flowchart TD
    ROOT["__root.tsx\n(SiteShell, ThemeToggle, navigation)"]

    ROOT --> INDEX["/ — index.tsx\n(Hero3D, feature cards, FAQ)"]
    ROOT --> VERIFY["/verify — verify.tsx\n(VerificationFlow → VerifyPage)"]
    ROOT --> AWARE["/scam-awareness — scam-awareness.tsx\n(Learn tab, Explore Data tab)"]
    ROOT --> AUTH_ROUTE["/_authenticated/route.tsx\n(auth guard redirect)"]

    AUTH_ROUTE --> HISTORY["history.tsx\n(offers, reports, comparisons)"]
    AUTH_ROUTE --> COMPARE["compare.tsx\n(side-by-side comparison)"]
    COMPARE --> AI_ADVISOR["AiCompareAdvisor.tsx\n(NVIDIA Career Advisor)"]
    AUTH_ROUTE --> REPORT_VIEW["reports.$id.tsx\n(view saved report)"]

    VERIFY --> UPLOAD["UploadEvidence.tsx\n(PDF.js / Tesseract)"]
    VERIFY --> REPORT_VIEW2["ReportView.tsx\n(findings, extracted, checklist)"]
    REPORT_VIEW2 --> AI_REC["AiRecommendations.tsx\n(NVIDIA Edge Function)"]
```

---

## Data Flow: Offer Verification

```mermaid
sequenceDiagram
    actor User
    participant Browser as React App (Browser)
    participant Engine as Verification Engine
    participant Supabase as Supabase DB
    participant NVIDIA as NVIDIA API (Edge Fn)

    User->>Browser: Paste text or upload file
    Browser->>Engine: analyze(text) — pure TypeScript
    Engine-->>Browser: Report {assessment, findings, extracted, phrases}
    Browser->>Browser: Save to sessionStorage (session-scoped)
    Browser-->>User: Display Concern Signals, Extracted Details

    Browser->>NVIDIA: functions.invoke("offerproof-ai-recommendations")\n{sessionId, offerText, context}
    NVIDIA-->>Browser: {recommendations, sessionId}
    Browser-->>User: Display AI Recommendations (async)

    opt User is signed in
        User->>Browser: Click "Save report"
        Browser->>Supabase: INSERT into offers + verification_reports\n(Row Level Security enforces user_id)
        Supabase-->>Browser: Saved offer.id
        Browser-->>User: "Saved to your history"
    end
```

---

## Security Boundary Summary

| Layer                        | Mechanism                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Browser ↔ Supabase DB**    | Publishable key + JWT Bearer token; Row Level Security on every table                                 |
| **Browser ↔ Edge Functions** | Supabase `functions.invoke()` (auto-attaches user JWT)                                                |
| **Edge Function ↔ NVIDIA**   | `NVIDIA_API_KEY` Supabase secret — never exposed to client                                            |
| **Edge Function ↔ BigQuery** | `GOOGLE_SERVICE_ACCOUNT_JSON` Supabase secret; short-lived OAuth2 access token minted at request time |
| **SSR server auth**          | `requireSupabaseAuth` middleware validates JWT before any server function runs                        |
