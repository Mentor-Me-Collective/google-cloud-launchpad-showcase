# ClimateOps — SDG 13 Extreme Heat Readiness MVP (8-Slide Deck)

> **Format:** Official 8-Slide Hackathon / Capstone Presentation Deck  
> **Target Audience:** Hackathon Judges, Climate Resilience Operators, Municipal Stakeholders  
> **Production Service:** [https://climateops-api-4twvqq3jta-uc.a.run.app](https://climateops-api-4twvqq3jta-uc.a.run.app)  
> **OpenAPI Contract:** [https://climateops-api-4twvqq3jta-uc.a.run.app/docs](https://climateops-api-4twvqq3jta-uc.a.run.app/docs)  
> **Repository:** [https://github.com/creova-gif/climateops-mvp](https://github.com/creova-gif/climateops-mvp)

---

## Slide 1: Cover & Mission

### Header
**ClimateOps: Extreme Heat Readiness MVP**  
*Closing the coordination gap between National Weather Service alerts and verified facility readiness in the South Bronx.*

### Metadata & Team
- **UN Sustainable Development Goal:** SDG 13: Climate Action (Target 13.1 — Resilience & Adaptive Capacity)
- **Live Cloud Run Service:** `https://climateops-api-4twvqq3jta-uc.a.run.app`
- **Team Roster:**
  - **Justin** (`@creova-gif`) — Product Lead, Governance & GCP Architecture
  - **Blanca** (`@bcperez14`) — Cloud Run, NVIDIA NIM & Ingestion Pipeline
  - **Kseniya** (`@ksen-nm`) — Bronx Facility Datasets, Provenance & Scoring
  - **Shiksha** (`@Shiksha99`) — STRIDE Security, RBAC & Cloud Storage Uploads

### The One-Sentence Takeaway
> **"Turning raw weather alerts into accountable, human-approved readiness actions before extreme heat hits vulnerable urban communities."**

### Speaker Notes (0:00 – 0:30)
> *"Judges and colleagues, welcome to ClimateOps. Extreme heat is the deadliest weather-related threat in America, but the breakdown isn't the weather forecast—it's operational coordination. ClimateOps is a human-centered, approval-first readiness platform built on Google Cloud and NVIDIA NIM that translates National Weather Service warnings into prioritized, verified physical building preparations in the South Bronx."*

---

## Slide 2: The Problem & South Bronx Grounding

### Header
**Extreme Heat Creates Fatal Coordination Friction in Vulnerable Neighborhoods**

### Visual Layout: 3 Operational Friction Points
```
┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
│     1. Alert Lag          │  │  2. Priority Paralysis    │  │ 3. Unaccountable Actions  │
│  Weather text is detached │  │ Operations teams balance  │  │ Checklists sent on group  │
│ from real physical sites. │  │ sites without clear risk. │  │ chats lack verified proof.│
└─────────────┬─────────────┘  └─────────────┬─────────────┘  └─────────────┬─────────────┘
              ▼                              ▼                              ▼
    NWS CAP Text Alerts            8 Dispersed Facilities          "Did anyone check AC?"
  No building context or HVAC    Senior centers vs youth gyms     No photo proof or audit trail
```

### Context & Credible Evidence
- **Geographic Grounding:** Mott Haven / Melrose (Bronx Community District 1).
- **NYC Heat Vulnerability Index (HVI):** **5 out of 5** (highest heat-mortality risk tier in New York City; Source: NYC DOHMH).
- **Urban Heat Island Intensity:** Up to $8.6^\circ\text{F}$ hotter than coastal NYC areas due to low tree canopy ($<7\%$) and high impervious surface ratio.
- **The Operations Gap:** Small non-profit facility teams manage multiple physical sites with mixed occupant vulnerabilities (seniors, toddlers) and aging HVAC infrastructure.

### Boundary of this MVP
- Focused strictly on **pre-event readiness coordination** (24–48 hours prior to heat wave).
- 8 verified South Bronx public facilities; 2 fictional tenant workspaces for isolated evaluation.
- Honest disclaimer: **No simulated claims of lives saved or automated emergency response.**

### Speaker Notes (0:30 – 1:05)
> *"In the South Bronx neighborhood of Mott Haven, the Heat Vulnerability Index is 5 out of 5—the highest in NYC. When the National Weather Service issues an Excessive Heat Warning, facility managers face three critical friction points: Alert Lag, Priority Paralysis across multiple aging buildings, and Unaccountable Execution where vital steps are coordinated over chaotic text chats without proof. ClimateOps bridges this exact gap."*

---

## Slide 3: Solution & 7-Stage Manager Journey

### Header
**From Warning to Verified Readiness: The Approval-First Lifecycle**

### Core Product Paradigm
> **AI accelerates synthesis and drafting, but authorized humans must approve all physical actions.**

### Friction-to-Feature Mapping
| Friction Point | ClimateOps Feature | Architectural Safety Gate |
|---|---|---|
| **Alert Lag** | Automated NWS Geo-Ingest | Scheduled every 5 min via Cloud Scheduler |
| **Priority Paralysis** | Deterministic 5-Factor Scorer | Formulaic 0–100 score; zero black-box AI guessing |
| **Uncertain Synthesis** | Evidence-Grounded Brief (NVIDIA NIM) | 100% cited source IDs (`[SRC-*]`, `[FAC:*]`) with validator |
| **Unaccountable Action** | **Mandatory Human Approval Gate** | **ADR-001:** No tasks without cryptographic hash signoff |
| **Verification Void** | Tamper-Evident Photo Proof | Direct GCS upload via short-lived signed URLs |

### The 7-Stage Operational Journey
1. **Ingest:** Scheduled polling of NWS CAP heat alerts & hourly temperatures.
2. **Rank:** Deterministic formula calculates 0–100 urgency score with complete factor transparency.
3. **Brief:** NVIDIA NIM synthesizes cited operational brief strictly constrained to evidence bundle.
4. **Gate (ADR-001):** Manager reviews, rejects/edits, and approves exact version and content hash.
5. **Dispatch:** Due-dated operational tasks generated only upon manager approval.
6. **Execute & Prove:** Field staff execute task, capture photo proof, and upload via signed URL.
7. **Verify & Audit:** Manager verifies photo proof, signs off, and logs immutable audit trail.

### Speaker Notes (1:05 – 1:40)
> *"Here is how ClimateOps works in practice. We reject autonomous AI dispatch. Instead, we implement a 7-stage manager journey: weather is ingested, facilities are deterministically ranked, and NVIDIA NIM synthesizes an evidence-cited brief. But then we hit our hard architectural rule: ADR-001. No tasks can be dispatched until an authorized manager approves the exact content hash. Once approved, tasks are issued, staff upload tamper-evident photo proof via Cloud Storage signed URLs, and managers sign off on an immutable audit ledger."*

---

## Slide 4: Real Architecture: Google Cloud + NVIDIA NIM

### Header
**Production-Grade Dual Cloud Integration: Resilient, Serverless & Secure**

### Architectural Topology
```
 [api.weather.gov] (NWS Alerts & Forecasts)
        │
        ▼ (every 5 min)
 [Google Cloud Scheduler] ──(X-Ingest-Token)──┐
                                              ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │  Google Cloud Run (us-central1): climateops-api (FastAPI + Modern Web UI)   │
 │                                                                             │
 │  ┌─────────────────────┐   ┌────────────────────────┐   ┌─────────────────┐ │
 │  │ Deterministic Scorer│──▶│ NVIDIA NIM Integration │──▶│Citation Verifier│ │
 │  │ (5-Factor Formula)  │   │ nemotron-3.5-bolt-e4b  │   │ (AST & Regex)   │ │
 │  └─────────────────────┘   └───────────┬────────────┘   └─────────────────┘ │
 │                                        │                                    │
 │                                        ▼ (OpenAI-compatible client)         │
 │                        [NVIDIA NIM API Catalog]                             │
 │                        (Latency: ~10.6s | Fallback: Deterministic Template) │
 └──────────────────┬─────────────────────┬──────────────────────────┬─────────┘
                    │                     │                          │
                    ▼                     ▼                          ▼
       [Google Cloud Firestore]  [Google Cloud Storage]  [Google Secret Manager]
       - Multi-tenant data       - Private proof bucket  - nvidia-api-key
       - Versioned brief store   - Short-lived signed    - ingest-token
       - Immutable audit log       HMAC upload URLs      - Zero secrets in git
```

### Live Infrastructure Telemetry
- **Compute:** Google Cloud Run (`climateops-api` in `us-central1`, containerized via multi-stage Dockerfile).
- **AI Inference:** NVIDIA NIM API Catalog (`nvidia/nemotron-3.5-bolt-e4b`), benchmarked at ~10.6s latency.
- **Resilience:** Automatic fallback to deterministic evidence templates if the model endpoint is unavailable.
- **Persistence:** Cloud Firestore (Native Mode) with multi-tenant data isolation and event sourcing.
- **Proof Storage:** Google Cloud Storage private bucket with time-limited HMAC signed upload URLs.
- **Security:** Google Secret Manager provisions production keys directly into container environment.

### Speaker Notes (1:40 – 2:20)
> *"ClimateOps is not a local prototype—it is fully deployed on Google Cloud and NVIDIA production infrastructure. Cloud Scheduler triggers NWS alert ingestion into FastAPI on Cloud Run. Facilities are scored deterministically, and the evidence bundle is sent to NVIDIA NIM's Nemotron-3.5-Bolt model via server-side client. If NIM ever experiences network interruption, our deterministic fallback ensures operational continuity. Sensitive credentials live in Google Secret Manager, data is persisted in Firestore, and photo proofs are uploaded to private Cloud Storage buckets via signed URLs."*

---

## Slide 5: Explainable Ranking & Cited AI Brief

### Header
**Deterministic 0–100 Prioritization + Source-Grounded Synthesis**

### Deterministic Scoring Formula (Zero Black-Box AI)
$$\text{Priority Score} = \sum (\text{Hazard}_{30} + \text{Vulnerability}_{25} + \text{Cooling Risk}_{20} + \text{Occupancy}_{15} + \text{Staffing}_{10})$$

| Factor Name | Max Pts | Evaluation Criteria |
|---|---|---|
| **NWS Hazard Level** | 30 pts | Warning = 30 pts \| Watch = 20 pts \| Advisory = 10 pts \| Normal = 0 pts |
| **Occupant Vulnerability** | 25 pts | Senior centers / childcare = 25 pts \| General public = 12 pts |
| **Cooling / AC Risk** | 20 pts | Defective chillers = 20 pts \| Unknown status = 15 pts \| Working = 0 pts |
| **Occupancy Load** | 15 pts | $\ge 100$ people = 15 pts \| $50-99$ people = 10 pts \| $<50$ people = 5 pts |
| **Staffing Readiness** | 10 pts | Reduced staff ($<50\%$) = 10 pts \| Normal staffing = 0 pts |

### NVIDIA NIM Cited Readiness Brief
```json
{
  "summary": "NWS Excessive Heat Warning in effect. Heat index projected at 104F [SRC-NWS-OKX].",
  "actions": [
    "Verify primary and backup chiller refrigerant pressure [FAC:FAC-PATTERSON-CC].",
    "Stage 200 gallons potable water in shaded ground-floor gymnasium [FAC:FAC-PATTERSON-CC]."
  ],
  "provenance": {
    "model": "nvidia/nemotron-3.5-bolt-e4b",
    "citations_valid": true,
    "fallback_used": false
  }
}
```
- **Strict Evidence Guardrail:** The model is prohibited from citing unprovided sources or making autonomous claims.
- **Citation Validator:** Validates every citation tag against the input evidence bundle before presentation.

### Speaker Notes (2:20 – 3:00)
> *"Notice our algorithmic integrity. AI never scores or ranks facilities. Scoring is 100% deterministic and transparent: hazard, occupant vulnerability, AC status, occupancy, and staffing sum to a 0-100 score. Next, NVIDIA NIM synthesizes the actionable brief, but under strict prompt containment: every single recommendation must cite a verified source tag like [SRC-NWS-OKX] or [FAC:FAC-PATTERSON-CC]. Our backend AST validator rejects any brief containing phantom citations."*

---

## Slide 6: Hard Rule: Manager Approval Gate (ADR-001)

### Header
**Human-in-the-Loop Governance: Enforced at the API Kernel Level**

### The Core Architectural Invariant (ADR-001)
> **"No operational task may be created or assigned until an authorized manager approves the exact immutable version and cryptographic content hash of the readiness brief."**

### Architectural Enforcement Matrix
```
             ┌────────────────────────────────────────────────────────┐
             │ Manager Drafts or Edits Brief (Version N, Hash X)       │
             └──────────────────────────┬─────────────────────────────┘
                                        │
             ┌──────────────────────────▼─────────────────────────────┐
             │ Staff Attempts /tasks/generate                         │
             │ ──▶ HTTP 409 CONFLICT: Brief must be APPROVED first    │
             └──────────────────────────┬─────────────────────────────┘
                                        │
             ┌──────────────────────────▼─────────────────────────────┐
             │ Staff Attempts /briefs/{id}/approve                    │
             │ ──▶ HTTP 403 FORBIDDEN: Role 'staff' cannot approve    │
             └──────────────────────────┬─────────────────────────────┘
                                        │
             ┌──────────────────────────▼─────────────────────────────┐
             │ Manager Calls /briefs/{id}/approve                     │
             │ ──▶ Validates (brief_id, version, content_hash)        │
             │ ──▶ Locks brief to APPROVED, writes immutable audit log│
             └──────────────────────────┬─────────────────────────────┘
                                        │
             ┌──────────────────────────▼─────────────────────────────┐
             │ System Calls /tasks/generate                           │
             │ ──▶ HTTP 201 CREATED: Tasks dispatched with deadlines  │
             └────────────────────────────────────────────────────────┘
```

### Verification & Tamper-Evident Proof
- **Role-Based Access Control:** Strict separation between Manager, Staff, and Auditor roles.
- **Hash Binding:** Modifying any character of the brief changes the SHA-256 hash, immediately invalidating approvals and reverting to `DRAFT`.
- **Proof of Execution:** Staff cannot mark tasks complete with a checkbox—they must upload timestamped photo proof to Cloud Storage.

### Speaker Notes (3:00 – 3:45)
> *"Slide 6 demonstrates our proudest architectural contribution: ADR-001. We do not trust AI to command physical operations autonomously. If a staff member tries to approve a brief, the API returns HTTP 403 Forbidden. If anyone attempts to generate tasks before approval, the API returns HTTP 409 Conflict. When a manager approves, the system cryptographically binds the brief version, its SHA-256 content hash, and the manager's identity. If a draft is edited by even one character, the approval is revoked and must be re-certified."*

---

## Slide 7: Verification & Security Integrity

### Header
**Production Verification, Security Hardening & Zero-Leak Credential Hygiene**

### Quality & Verification Ratchet
- **Live Cloud Run Deployment:** Verified live in `us-central1` with auto-scaling and health probes (`/healthz`).
- **Automated Test Suite:** **44 of 44 automated backend tests passing** in `0.47s` covering:
  - Gate invariants, RBAC authorization, and HTTP 403/409 barriers.
  - Multi-tenant data segregation (preventing cross-tenant data leakage).
  - Deterministic scoring math and edge cases.
  - Citation validation and model fallback resiliency.
- **E2E Integration Flow:** `scripts/demo_flow.py` verifies all 12 operational stages against live Cloud Run.
- **Secret Hygiene:** `scripts/scan_secrets.py` enforces zero hardcoded API keys, tokens, or credentials across the git tree.

### Comprehensive Governance: 10 Architectural Decision Records (ADRs)
1. **ADR-001:** Manager Approval Gate for Readiness Briefs
2. **ADR-002:** Multi-Tenant Isolation with Tenant Header Context
3. **ADR-003:** GCS Signed Upload URLs for Tamper-Evident Proof
4. **ADR-004:** Immutable Event Sourcing for Firestore Audit Ledger
5. **ADR-005:** Deterministic 5-Factor Vulnerability Scoring Formula
6. **ADR-006:** NVIDIA NIM Inference with Deterministic Template Fallback
7. **ADR-007:** Strict In-Memory Test Fixture Engine for Fast CI
8. **ADR-008:** Semantic HTML & WCAG 2.1 AA Accessibility Standards
9. **ADR-009:** Direct Storage Upload Pattern for Zero-Buffer Scalability
10. **ADR-010:** Secret Manager Key Rotation & Least-Privilege IAM

### Speaker Notes (3:45 – 4:20)
> *"Every single feature in ClimateOps is backed by empirical verification. We have 44 automated tests running in CI that guard our security invariants, scoring math, and tenant isolation. Our secret scanner confirms zero leaked credentials. We conducted full STRIDE threat modeling and documented ten formal Architectural Decision Records. You can open our live Cloud Run endpoint right now, inspect our OpenAPI documentation, and run our automated test suite in under one second."*

---

## Slide 8: Team Contributions, Limits & Roadmap

### Header
**Disciplined Engineering, Honest Boundaries & Sustainable Roadmap**

### Team Ownership & Contributions
| Team Member | Role | Core Contributions |
|---|---|---|
| **Justin** (`@creova-gif`) | Product Lead & GCP Architect | Problem framing, SDG 13 alignment, approval workflow governance, frontend UI/UX engineering, Cloud Run deployment. |
| **Blanca** (`@bcperez14`) | Cloud Infrastructure & AI Lead | FastAPI service architecture, NVIDIA NIM integration & benchmarking, Cloud Scheduler ingestion pipeline, Docker containerization. |
| **Kseniya** (`@ksen-nm`) | Data & Provenance Lead | South Bronx facility research, data schemas, simulated weather fixtures, deterministic scoring algorithms. |
| **Shiksha** (`@Shiksha99`) | Security & Compliance Lead | STRIDE threat modeling, RBAC policy enforcement, Secret Manager integration, GCS signed URL proof security, audit ledger. |

### Honest Boundaries & Disclosures
- **Operational Grounding:** Operational protocols and checklist templates are grounded in published NYC Emergency Management (NYCEM) Heat Emergency Plans and CDC/OSHA facility guidelines; direct municipal operator fieldwork was excluded to adhere to strict institutional research boundaries.
- **No Medical Claims:** The system coordinates building operational readiness; it does not claim to replace emergency medical services.

### Future Roadmap
- **Phase 2 (Q1 2027):** Live IoT smart thermostat and chiller vibration telemetry ingestion via Google Cloud Pub/Sub.
- **Phase 3 (Q2 2027):** Direct integration with NYC 311 Cooling Center directory and local Mutual Aid SMS networks.

### Speaker Notes (4:20 – 4:55)
> *"To conclude: ClimateOps was built through tight interdisciplinary collaboration across our four team members. We are proud of our technical depth and equally proud of our honesty: our facilities are currently simulated demo records, and we make no exaggerated claims. Our roadmap expands into live IoT telemetry via Cloud Pub/Sub and direct NYC 311 cooling center integration. Thank you for your time, and we look forward to your questions."*
