# OfferProof — Project Overview

## What Is OfferProof?

OfferProof is a **job and internship offer verification tool** built for students and job seekers. It analyses the text of an offer letter, email, or screenshot and identifies common patterns used in employment scams — things like upfront fee requests, free email recruiters, suspicious domains, urgency pressure, or requests for sensitive documents.

It is **not** a fraud classifier. It is an explainable, heuristic-based tool: every warning it raises is backed by the exact phrase or data point that triggered it, so the user can make their own informed decision.

---

## The Problem It Solves

Employment scams are widespread, particularly targeting:

- Students and freshers looking for their first job or internship
- Remote-work seekers who cannot easily verify a physical office
- Job seekers in markets where informal hiring is common

Typical scam patterns include:

1. Requesting a "refundable" registration, security or processing fee before joining
2. Using `@gmail.com` or similar free-email addresses to impersonate HR
3. Using look-alike or unrelated domains (e.g. `acmeglobal-careers.net` for Acme Corp)
4. Sending shortened links (bit.ly) that hide the destination
5. Demanding Aadhaar/PAN/bank details or OTPs upfront
6. Making unrealistic promises ("₹45,000/month, no experience needed, work from home")
7. Applying artificial urgency ("reply within 24 hours or the offer lapses")

OfferProof scans for these patterns using regular-expression-based rules running entirely in the browser and presents findings with evidence and actionable next steps.

---

## Core Principles

| Principle                | Implementation                                                  |
| ------------------------ | --------------------------------------------------------------- |
| **Explainable**          | Every finding shows the exact text that triggered it            |
| **Privacy-first**        | Heuristic analysis runs in the browser with no server upload    |
| **Non-judgemental**      | Results are labelled as signals, never as proof of fraud        |
| **Actionable**           | Each warning includes a specific next step the user can take    |
| **Accurate about scope** | The tool clearly states it cannot guarantee an offer is genuine |

---

## Feature List (Implemented)

### Verification

- Paste offer text directly (up to 50,000 characters)
- Upload a PDF — text is extracted client-side using **PDF.js** (up to 20 pages)
- Upload a JPG/PNG screenshot — OCR via **Tesseract.js** runs in the browser
- Run the fictional **sample offer** to understand how results look
- Reset and check another offer in the same session

### Results

- **Assessment badge**: Low Concern / Needs Review / High Concern
- **Concern Signals**: every triggered rule with evidence, severity and what to do
- **Extracted Details**: auto-parsed company, recruiter, job title, salary, joining date, location, emails, domains, URLs, phones
- **AI Recommendations** (NVIDIA-powered): structured into Verification Steps, Recruiter Questions, Important Precautions — fetched asynchronously, non-blocking
- **Action Guide (Checklist)**: general pre-acceptance checklist

### Account Features (requires sign-in)

- **Save reports** — stored in Supabase under the user's account with Row Level Security
- **History** — browse all saved offers, reports and comparisons
- **Compare offers** — side-by-side comparison featuring an **AI Career Advisor powered by NVIDIA Nemotron** (analyzing best career fit, balanced pros/cons, salary and career growth insights, recruiter questions, and personalized recommendations) alongside verified safety signals from each offer
- **AI Career Advisor (NVIDIA Integration)** — multi-offer strategic guidance powered by `nvidia/nemotron-3.5-bolt-e4b` through Supabase Edge Functions, strictly separating career suitability from heuristic offer safety signals
- **Guest pending queue** — verify an offer as a guest, then sign in and pending offers are imported automatically

### Scam Awareness Centre

- **Learn tab**: educational content about four scam categories, warning signs, fictional examples and safety advice
- **Explore Data tab**: live preview of a real BigQuery dataset (`offerproof_analytics.job_postings`, ~17,880 records) with search, filter by label (Fraudulent/Legitimate), pagination, and dataset summary statistics

---

## Pages / Routes

| Route             | Description                                | Auth required |
| ----------------- | ------------------------------------------ | ------------- |
| `/`               | Landing page with hero, feature list, FAQ  | No            |
| `/verify`         | Offer verification (paste or upload)       | No            |
| `/scam-awareness` | Scam education + BigQuery dataset explorer | No            |
| `/how-it-works`   | Step-by-step explanation                   | No            |
| `/features`       | Detailed feature descriptions              | No            |
| `/about`          | Project background                         | No            |
| `/faq`            | Frequently asked questions                 | No            |
| `/contact`        | Contact information                        | No            |
| `/privacy`        | Privacy policy                             | No            |
| `/terms`          | Terms of service                           | No            |
| `/login`          | Email magic-link / OAuth sign-in           | No            |
| `/history`        | Saved offers, reports and comparisons      | **Yes**       |
| `/compare`        | Side-by-side offer comparison              | **Yes**       |
| `/reports/:id`    | View a specific saved report               | **Yes**       |
