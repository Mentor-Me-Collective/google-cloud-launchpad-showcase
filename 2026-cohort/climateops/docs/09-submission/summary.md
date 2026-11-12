# ClimateOps: SDG 13 Extreme Heat Readiness MVP
## Comprehensive Submission Summary (≤3 Pages)

**Production Service:** [https://climateops-api-4twvqq3jta-uc.a.run.app](https://climateops-api-4twvqq3jta-uc.a.run.app)  
**OpenAPI Specification:** [https://climateops-api-4twvqq3jta-uc.a.run.app/docs](https://climateops-api-4twvqq3jta-uc.a.run.app/docs)  
**Verification Date:** 7 November 2026  
**Target SDG:** UN Sustainable Development Goal 13: Climate Action (Target 13.1 — Climate Resilience & Adaptive Capacity)  
**Team:** Blanca (`@bcperez14`, Team Lead · AI Research Foundations), Justin (`@creova-gif`, AI Cloud Leader), Kseniya (`@ksen-nm`, Cloud Data Analytics Lead), Shiksha (`@Shiksha99`, Cloud Cybersecurity Lead)

---

### 1. Problem Grounding, Audience, and SDG 13 Alignment

Extreme heat is the single deadliest weather-related phenomenon in the United States, causing more fatalities annually than hurricanes, tornadoes, and floods combined. This mortality burden falls overwhelmingly on low-income, historically disinvested urban neighborhoods where aging physical infrastructure, minimal urban tree canopy, and dense asphalt create severe urban heat islands. 

In New York City, the epicenter of this crisis is the South Bronx neighborhood of Mott Haven / Melrose (Bronx Community District 1). According to the New York City Department of Health and Mental Hygiene (NYC DOHMH), this district bears a **Heat Vulnerability Index (HVI) of 5 out of 5**—the highest risk classification in the city. Surface temperatures regularly exceed coastal neighborhoods by up to $8.6^\circ\text{F}$, and emergency department visits for heat-related illnesses are more than double the municipal average.

#### The Operational Coordination Breakdown
While meteorological tracking by the National Weather Service (NWS) has reached unprecedented precision, **operational translation at the ground level remains severely broken**. Facility managers operating community centers, senior day-care facilities, public housing complexes, and youth gyms face three crippling friction points:
1. **Alert Lag & Context Disconnect:** NWS heat advisories and warnings are broadcast as raw Common Alerting Protocol (CAP) or unstructured text bulletins. These alerts contain no building context, occupancy telemetry, or HVAC operating status.
2. **Priority Paralysis:** Small municipal and non-profit operations teams are forced to balance multiple physical facilities simultaneously without an objective, explainable method to triage site urgency. Critical factors—such as defective chillers, unconfirmed water supplies, and high concentrations of vulnerable seniors or children—are evaluated on ad-hoc intuition.
3. **Unaccountable Execution (The "Chat-App Void"):** Facility instructions are routinely disseminated across ephemeral group chats and text messages. Important tasks (verifying backup generators, confirming chiller setpoints, stocking hydration) lack verifiable proof of execution, role authorization, or an immutable audit trail.

**Scope & MVP Boundary:** ClimateOps explicitly defines its boundaries: we provide extreme heat readiness coordination across 8 verified public facilities in the Mott Haven/Melrose corridor, evaluated across two isolated tenant workspaces (`demo-a` and `demo-b`). We make no unsubstantiated claims of lives saved or automated 911 dispatch; our engine enforces accountable physical building preparation before heat emergencies peak.

---

### 2. Solution Overview & The Approval-First Gate (ADR-001)

ClimateOps introduces a **human-centered, approval-first readiness coordination paradigm**. Rather than relying on autonomous AI agents to dispatch physical tasks or generate black-box scores, ClimateOps enforces strict architectural separation between deterministic risk scoring, cited AI brief synthesis, and mandatory human authorization.

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  1. Ingest NWS  │────▶│ 2. Deterministic    │────▶│ 3. NVIDIA NIM Cited  │
│  Alerts & Temps │     │    5-Factor Scorer  │     │    Readiness Brief   │
└─────────────────┘     └─────────────────────┘     └──────────┬───────────┘
                                                               │
                                                    [ADR-001 Approval Gate]
                                                    Mandatory Human Signoff
                                                               │
┌─────────────────┐     ┌─────────────────────┐     ┌──────────▼───────────┐
│ 6. Manager Sign-│◀────│ 5. Staff Proof      │◀────│ 4. Operational Tasks │
│    off & Ledger │     │    Upload (GCS)     │     │    Dispatched        │
└─────────────────┘     └─────────────────────┘     └──────────────────────┘
```

#### Friction-to-Feature Matrix
| Operational Friction Point | ClimateOps Solution Feature | Architectural Invariant |
|---|---|---|
| Alert Lag & Context Disconnect | Automated 5-min NWS Alert Ingestion | Geo-targeted bounding box (`SRC-NWS-OKX`) |
| Priority Paralysis | Deterministic 5-Factor Vulnerability Scorer | Transparent 0–100 score; zero black-box AI |
| Uncertain / Halting Synthesis | Evidence-Grounded Brief (NVIDIA NIM) | 100% cited source tags (`[SRC-*]`, `[FAC:*]`) |
| Unaccountable Task Dispatch | **Mandatory Manager Approval Gate (ADR-001)** | Cryptographic SHA-256 content hash binding |
| Verification Void | Tamper-Evident Photo Proof Direct Upload | Short-lived (15-min) GCS signed HMAC PUT URLs |
| Compliance & Dispute Risk | Immutable Event-Sourced Audit Ledger | Append-only Firestore audit trail |

#### Hard Rule: Manager Approval Gate (ADR-001)
> **"No operational task may be created or assigned until an authorized manager approves the exact immutable version and cryptographic content hash of the readiness brief."**

This rule is enforced directly within the API kernel:
- **Role Invariant:** Field staff or external observers attempting to approve a brief receive an immediate `HTTP 403 Forbidden`.
- **Precondition Invariant:** Invoking `/tasks/generate` against a brief in `DRAFT` or `REVISED` status returns `HTTP 409 Conflict`.
- **Tamper Invariant:** If a manager edits even a single character of a brief, the system increments the version, recalculates the SHA-256 hash, and immediately reverts status to `DRAFT`, revoking any prior approval.
- **Proof-of-Work Invariant:** Tasks cannot be closed with a simple checkbox. Staff must capture and upload timestamped photo evidence to private Cloud Storage, which the manager must inspect before marking the task verified.

---

### 3. Architecture & Production Integration: Google Cloud + NVIDIA NIM

ClimateOps bridges Google Cloud's serverless infrastructure with NVIDIA's accelerated generative AI inference:

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

1. **Google Cloud Run:** Hosts the containerized FastAPI backend and responsive emerald web dashboard in `us-central1`. Configured with automated health checking (`/healthz`), auto-scaling, and container execution timeouts tailored for model inference.
2. **NVIDIA NIM API Catalog (`nvidia/nemotron-3.5-bolt-e4b` & `meta/llama-3.2-90b-vision-instruct`):**
   - **Operational Briefing:** `nvidia/nemotron-3.5-bolt-e4b` generates structured, evidence-grounded operational briefs in ~10.6s. The model is strictly constrained to the verified evidence bundle JSON. Every claim and action item must cite explicit source identifiers (`[SRC-NWS-OKX]`, `[FAC:FAC-PATTERSON-CC]`). The model cannot autonomously approve tasks or invent unverified scores.
   - **Multimodal Visual Inspection:** `meta/llama-3.2-90b-vision-instruct` provides visual reasoning and verification over uploaded facility completion evidence (HVAC compressor service tags, chiller pressure gauges, cooling center thermostat photos), ensuring physical proof matches assigned readiness tasks before final sign-off.
3. **Citation Validator & Fallback Resiliency:** A post-inference verification engine parses model output with regular expressions and AST traversal, verifying that every citation exists in the evidence bundle. If the NVIDIA NIM endpoint is unreachable, ClimateOps automatically falls back to an evidence-grounded deterministic template, ensuring zero operational downtime.
4. **Google Cloud Firestore (Native Mode):** Stores multi-tenant facility profiles, versioned readiness briefs, cryptographic approvals, operational tasks, and an immutable event-sourced audit ledger.
5. **Private Google Cloud Storage:** Staff proof images are uploaded directly from client browsers to a private bucket using time-limited (15-minute) HMAC-signed PUT URLs, eliminating proxy memory bottlenecks on Cloud Run.
6. **Google Secret Manager:** Securely provisions `nvidia-api-key` and `ingest-token` directly into the container runtime. Zero API keys, service account credentials, or secrets exist in the git repository.
7. **Google Cloud Scheduler:** Executes automated 5-minute cron invocations against `/internal/ingest` with secure token headers to maintain fresh NWS weather data.

---

### 4. Deterministic Scoring & Operational Task Lifecycle

#### Transparent 5-Factor Vulnerability Scoring (0–100)
To eliminate black-box hallucinations in emergency triage, facility prioritization is computed via a transparent, formulaic model:
$$\text{Priority Score} = \text{Hazard}_{30} + \text{Vulnerability}_{25} + \text{Cooling Risk}_{20} + \text{Occupancy}_{15} + \text{Staffing}_{10}$$

- **Hazard Level (30 pts):** NWS Excessive Heat Warning (30 pts), Watch (20 pts), Advisory (10 pts), Normal (0 pts).
- **Occupant Vulnerability (25 pts):** High concentration of seniors or young children (25 pts), mixed/general public (12 pts).
- **Cooling / AC Risk (20 pts):** Confirmed chiller/AC failure (20 pts), unverified cooling status (15 pts), fully functional (0 pts).
- **Occupancy Load (15 pts):** Peak capacity $\ge 100$ occupants (15 pts), $50-99$ (10 pts), $<50$ (5 pts).
- **Staffing Deficit (10 pts):** Reduced on-site staff ($<50\%$ coverage) (10 pts), normal staffing (0 pts).

#### The Operational Task & Verification Lifecycle
Once a readiness brief is approved by an authenticated manager:
1. **Task Instantiation:** Specific tasks with strict completion deadlines (e.g., "Verify primary and backup chiller refrigerant pressure by 11:00 AM EDT") are created in Firestore.
2. **Staff Assignment & Proof Upload:** A field staff member captures on-site visual evidence and requests an upload URL. The API issues a short-lived signed GCS PUT URL.
3. **Direct Binary Upload:** The client uploads the binary image directly to Google Cloud Storage.
4. **Manager Verification:** The manager views the proof image in the web console, confirms physical compliance, and marks the task verified. Every action records an immutable audit event with timestamps, actor IDs, and hash references.

---

### 5. Engineering Rigor, Verification, and Security Integrity

ClimateOps was engineered under strict software quality and security controls:
- **Comprehensive Automated Test Suite:** **44 out of 44 automated backend tests** pass in `0.47s` via pytest, validating gate invariants, RBAC authorization boundaries, multi-tenant isolation, scoring math, and grounding policies.
- **End-to-End Walkthrough Script (`demo_flow.py`):** Verified live against the deployed Cloud Run endpoint, executing all 12 operational stages from ingestion to manager proof signoff.
- **Zero-Leak Secret Hygiene:** `scripts/scan_secrets.py` confirms clean git history with zero leaked credentials, certificates, or tokens.
- **STRIDE Threat Modeling:** Formal mitigations for Spoofing (RBAC token headers), Tampering (content hash binding), Repudiation (immutable audit ledger), Information Disclosure (private GCS signed URLs), Denial of Service (stateless Cloud Run auto-scaling), and Elevation of Privilege (kernel-level 403 barriers).
- **Architectural Decision Records (ADRs):** Ten formal ADRs govern the codebase, ensuring full architectural traceability from inception to release.

---

### 6. Team Contributions, Honest Boundaries, and Future Roadmap

#### Team Ownership & Specific Contributions
- **Blanca (`@bcperez14`, Team Lead · AI Research Foundations):** End-to-end pipeline from forecast to cited readiness brief, NVIDIA NIM models (`nvidia/nemotron-3.5-bolt-e4b` for briefing & `meta/llama-3.2-90b-vision-instruct` for visual inspection), model behavior, Cloud Scheduler ingestion pipeline, and visible prioritization.
- **Justin (`@creova-gif`, AI Cloud Leader):** Workflow definition, requirements, feature priorities, manager approval flow, value framing, UI/UX console engineering, Cloud Run container deployment, and end-to-end acceptance testing.
- **Kseniya (`@ksen-nm`, Cloud Data Analytics Lead):** South Bronx public facility research, Mott Haven & Melrose data validation, data schemas, simulated weather fixtures, deterministic scoring algorithms, and data provenance auditing.
- **Shiksha (`@Shiksha99`, Cloud Cybersecurity Lead):** STRIDE threat modeling, access security and RBAC roles, Secret Manager integration, GCS signed upload security, and immutable event ledger design.

#### Honest Boundaries & Disclosures
1. **Operational Grounding & Data Boundaries:** Operational workflows and task templates are grounded in published NYC Emergency Management (NYCEM) Heat Emergency Plans, NYC DOHMH cooling center protocols, and CDC/OSHA facility heat safety guidelines. Direct municipal operator fieldwork was explicitly excluded from scope to respect institutional research boundaries, while facility telemetry is maintained as transparent DEMO records.
2. **No Medical Claims:** The system coordinates building operational readiness; it does not claim to replace emergency medical services or 911 dispatch.

#### Future Roadmap
- **Phase 2 (Q1 2027):** Real-time building telemetry ingestion via Google Cloud Pub/Sub and IoT sensors for automated chiller temperature and vibration tracking.
- **Phase 3 (Q2 2027):** Direct integration with NYC 311 Cooling Center directory and local Mutual Aid SMS networks for automated community refuge notifications.
