# ClimateOps — Turnkey Video Demonstration Script (≤5:00 Minutes)

> **Submission Requirement:** Recorded demonstration of the working system, strictly $\le 5:00$ minutes.  
> **Target Rehearsal Runtime:** **4 minutes 45 seconds** (15-second safety buffer).  
> **Production Service:** [https://climateops-api-4twvqq3jta-uc.a.run.app](https://climateops-api-4twvqq3jta-uc.a.run.app)  
> **Local Demo Fallback:** `http://localhost:8080` (via `uvicorn app.main:app --port 8080`)  
> **Presenter:** Justin (`@creova-gif`, AI Cloud Leader) or team representative.

---

## 1. Pre-Recording Technical Setup Checklist

Before pressing the record button, ensure the following steps are prepared:
- [ ] **Browser Resolution:** Set browser window to clean 1080p (1920×1080) or 16:9 landscape aspect ratio.
- [ ] **Clean Tab Bar:** Hide bookmarks bar; close personal tabs. Have two tabs open:
  - Tab 1: ClimateOps Dashboard (`https://climateops-api-4twvqq3jta-uc.a.run.app` or `http://localhost:8080`)
  - Tab 2: OpenAPI Contract (`/docs`)
- [ ] **Reset Fixture State:** Reset demo tenant `demo-a` to a clean state by running `python scripts/demo_flow.py` beforehand or starting fresh with standard fixtures.
- [ ] **Audio & Screen Check:** Verify microphone level and enable mouse click highlighting.
- [ ] **Timer:** Place a stopwatch / phone timer next to your monitor set to count up to 4:45.

---

## 2. Master Demonstration Timeline (Total: 4:45)

| Timestamp | Phase / Topic | Active Persona | Key UI Action | Primary Rubric Evidence |
|---|---|---|---|---|
| **0:00 – 0:30** | Cover, Persona & SDG 13 Mission | Justin (Manager) | Dashboard Header & Title | Problem grounding, Mott Haven / Melrose, HVI 5/5 |
| **0:30 – 1:05** | Real-Time Weather & Provenance | Justin (Manager) | Top Status Bar & Weather Banner | NWS OKX feed, as-of timestamps, DEMO label |
| **1:05 – 1:45** | Explainable 5-Factor Ranking | Justin (Manager) | Facilities Table & Score breakdown | Deterministic formula (0–100), zero black-box AI |
| **1:45 – 2:30** | NVIDIA NIM AI Brief & Telemetry | Justin (Manager) | AI Brief Card & Telemetry Panel | `nvidia/nemotron-3.5-bolt-e4b`, citation tags, GCP |
| **2:30 – 3:20** | **Human Approval Gate (ADR-001)** | Justin (Manager) | Reject/Revise v1 ➔ Approve v2 | 409 Conflict barrier, hash binding, version bump |
| **3:20 – 4:05** | Staff Dispatch & Photo Proof Upload | Marcus (Staff) | Switch Persona ➔ Upload Proof | GCS signed URLs, 403 test, proof verification |
| **4:05 – 4:35** | Manager Sign-Off & Audit Ledger | Justin (Manager) | Tasks Table ➔ Audit Log Modal | Firestore event sourcing, immutable trail |
| **4:35 – 4:45** | Limitations, Team Credits & Close | Justin (Manager) | OpenAPI Docs & Footer | Honest boundaries, 44 tests, credits |

---

## 3. Second-by-Second Cue Sheet & Verbatim Script

---

### Act 1: Cover, Problem & SDG 13 Mission (0:00 – 0:30)

- **Timestamp:** `0:00 – 0:30` (30 seconds)
- **Active Persona:** `Justin (Manager, South Bronx Resilience - demo-a)`
- **Visual Focus:** Full screen dashboard view showing the emerald ClimateOps header, SDG 13 badge, and tenant badge.

#### Action & Mouse Cue
1. Mouse hovers gently over the **ClimateOps** title and the **SDG 13** badge in the top navigation.
2. Highlight the active persona badge at bottom-left: `Justin (Manager, South Bronx Resilience - demo-a)`.

#### Verbatim Spoken Narrative
> *"Hello hackathon judges and evaluators. I am Justin, Product Lead for ClimateOps. 
> 
> Extreme heat is the deadliest climate event in the United States. In the South Bronx neighborhood of Mott Haven and Melrose, the Heat Vulnerability Index is 5 out of 5—the highest in New York City. 
> 
> But the core problem isn't meteorological forecasting—it's operational coordination. Community centers and senior day facilities face alert lag, priority paralysis across multiple aging buildings, and chaotic execution over group chats. ClimateOps is a human-in-the-loop readiness engine built on Google Cloud and NVIDIA NIM that turns weather warnings into verified physical building actions before extreme heat hits."*

---

### Act 2: Live Weather Ingest & Provenance (0:30 – 1:05)

- **Timestamp:** `0:30 – 1:05` (35 seconds)
- **Active Persona:** `Justin (Manager)`
- **Visual Focus:** Weather Status banner at top of dashboard.

#### Action & Mouse Cue
1. Mouse moves to the top **Weather Ingestion Banner**.
2. Point out the orange **EXCESSIVE HEAT WARNING** badge, current temperature ($96^\circ\text{F}$), Heat Index ($104^\circ\text{F}$), the source link `SRC-NWS-OKX`, the fresh timestamp, and the transparent `SIMULATED REPLAY` badge.

#### Verbatim Spoken Narrative
> *"Let's look at the live dashboard. Across the top, our ingestion engine polls the National Weather Service station OKX. 
> 
> You can see an active Excessive Heat Warning with a projected heat index of 104 degrees Fahrenheit. Every data point displays its authoritative source ID—here, SRC-NWS-OKX—with an exact as-of timestamp. 
> 
> In accordance with hackathon ethics, notice our transparent DEMO badge: this alert uses real NWS warning geometry replayed against our verified South Bronx public facilities."*

---

### Act 3: Explainable Deterministic Ranking (1:05 – 1:45)

- **Timestamp:** `1:05 – 1:45` (40 seconds)
- **Active Persona:** `Justin (Manager)`
- **Visual Focus:** The **Verified Facilities** ranking list on the left side of the dashboard.

#### Action & Mouse Cue
1. Click on `#1 Patterson Community Center` (Score: 89.5/100).
2. Hover over the score chip to reveal the factor breakdown tooltip or inspect the 5 pill badges: Hazard (30w), Vulnerability (25w), AC Risk (20w), Occupancy (15w), Staffing (10w).
3. Scroll down briefly to show `#2 Betances Community Center` and `#3 Mill Pond Park Recreation Center`.

#### Verbatim Spoken Narrative
> *"Next, our deterministic scoring engine prioritizes facilities. Notice that Patterson Community Center ranks number one with an urgency score of 89.5 out of 100. 
> 
> Crucially, this score is NOT generated by a black-box AI model. It is computed via our transparent 5-factor mathematical formula: 30 points for the NWS hazard level, 25 points because this site serves senior citizens, 20 points because the primary chiller is unconfirmed, 15 points for peak occupancy over 100 people, and reduced staffing. 
> 
> Operations teams can immediately understand and trust exactly why one facility ranks above another."*

---

### Act 4: NVIDIA NIM Cited Readiness Brief & Cloud Telemetry (1:45 – 2:30)

- **Timestamp:** `1:45 – 2:30` (45 seconds)
- **Active Persona:** `Justin (Manager)`
- **Visual Focus:** The **AI Readiness Brief** card in the center and the **Infrastructure Telemetry** panel at bottom.

#### Action & Mouse Cue
1. Mouse highlights the **AI Readiness Brief** section header.
2. Hover over the citations `[SRC-NWS-OKX]` and `[FAC:FAC-PATTERSON-CC]` embedded directly in the action sentences.
3. Scroll smoothly down to the **Infrastructure Telemetry** panel:
   - Highlight row 1: `NVIDIA NIM Model: nvidia/nemotron-3.5-bolt-e4b (Latency: 10.6s | Fallback: False)`.
   - Highlight row 2: `Google Cloud Run: climateops-api (us-central1 | 100% Healthy)`.
   - Highlight row 3: `Cloud Firestore (Native Mode)` & `Cloud Storage (Private Bucket)`.

#### Verbatim Spoken Narrative
> *"Once facilities are ranked, ClimateOps generates an evidence-grounded operational brief. 
> 
> Here in the center panel, our NVIDIA NIM model—specifically `nvidia/nemotron-3.5-bolt-e4b`—synthesizes clear, actionable building instructions. 
> 
> Look at the citations: every single claim references a verified source ID, such as SRC-NWS-OKX or the facility ID FAC-PATTERSON-CC. Our backend citation validator confirms every tag against the input evidence bundle. 
> 
> If we glance down at our live Infrastructure Telemetry panel, you can see our production environment: NVIDIA NIM responding with 10.6 second latency, running alongside our containerized FastAPI service on Google Cloud Run in us-central1, with multi-tenant Cloud Firestore and private Cloud Storage buckets. If NIM is ever unreachable, our engine automatically falls back to deterministic templates with zero downtime."*

---

### Act 5: Hard Rule: The Manager Approval Gate (ADR-001) (2:30 – 3:20)

- **Timestamp:** `2:30 – 3:20` (50 seconds)
- **Active Persona:** `Justin (Manager)`
- **Visual Focus:** The Brief Action Buttons: **Reject / Revise**, **Manager Signoff**, and the **Approval Gate Banner**.

#### Action & Mouse Cue
1. Mouse points to the yellow status badge: `Status: DRAFT (v1) | Hash: a7f8...`.
2. Click the button: **Reject / Revise**.
3. In the modal, add a brief operational note: *"Require backup chiller inspection by 10:00 AM EDT"*. Click **Save Revision**.
4. Show that the status updates to `DRAFT (v2)` with a new SHA-256 hash.
5. Click **Approve & Lock Brief (ADR-001)**.
6. Observe the green confirmation alert: `Brief Approved: v2 locked by manager_demo_a1`.
7. Click **Dispatch Operational Tasks**.
8. The Operational Tasks table animates and populates with 3 concrete work orders.

#### Verbatim Spoken Narrative
> *"Now we reach our most critical safety feature: ADR-001, the Manager Approval Gate. 
> 
> Under our architecture, no AI model is ever permitted to dispatch physical work orders autonomously. Notice the brief is currently in DRAFT version 1. 
> 
> Watch what happens if I click 'Reject / Revise': I can add an operational directive—'Inspect backup chiller by 10 AM'—and save. Immediately, the version increments to v2, and its SHA-256 content hash updates. 
> 
> If anyone tried to dispatch tasks right now, the API would block them with HTTP 409 Conflict. 
> 
> Now, as an authenticated Manager, I click 'Approve & Lock Brief'. The approval binds the exact version, content hash, and my manager ID. Only now can I click 'Dispatch Operational Tasks'—and three prioritized work orders are instantly issued with hard completion deadlines."*

---

### Act 6: Staff Dispatch & Tamper-Evident Photo Proof (3:20 – 4:05)

- **Timestamp:** `3:20 – 4:05` (45 seconds)
- **Active Persona:** Switch from `Justin (Manager)` ➔ `Marcus (Staff, South Bronx Resilience)`
- **Visual Focus:** The Bottom-Left Persona Switcher, followed by the **Operational Tasks** list.

#### Action & Mouse Cue
1. Click the **Active Persona dropdown** at bottom-left and select `Marcus (Staff, South Bronx Resilience - demo-a)`.
2. Notice the UI adapts: approval buttons are now disabled with lock badges.
3. In the Tasks list, find Task `#TSK-001: Verify Chiller Refrigerant Pressure`.
4. Click **Upload Proof Image**.
5. Select a demo chiller pressure gauge photo (`chiller_gauge_demo.jpg`).
6. Show the upload progress indicator connecting to Google Cloud Storage signed URL.
7. The task status transitions to `PROOF_SUBMITTED` with a timestamped thumbnail.

#### Verbatim Spoken Narrative
> *"Now let's switch personas to field staff. At the bottom-left, I switch to Marcus, our on-site facility technician. 
> 
> Notice that all manager approval buttons are immediately disabled. If Marcus attempted to approve a brief via curl, our API enforces an HTTP 403 Forbidden barrier. 
> 
> In the tasks table, Marcus sees Task 001: 'Verify chiller refrigerant pressure'. Rather than checking a simple honor-system box, Marcus must upload physical evidence. 
> 
> He clicks 'Upload Proof', selects an on-site photo of the pressure gauge, and uploads it. The browser communicates directly with Google Cloud Storage via a short-lived, 15-minute HMAC signed PUT URL. The proof is securely stored in a private bucket, and the task status updates to PROOF_SUBMITTED."*

---

### Act 7: Manager Verification & Immutable Audit Ledger (4:05 – 4:35)

- **Timestamp:** `4:05 – 4:35` (30 seconds)
- **Active Persona:** Switch back to `Justin (Manager)`
- **Visual Focus:** The Task Inspection Modal and the **Audit Ledger** section.

#### Action & Mouse Cue
1. Switch persona back to `Justin (Manager)`.
2. Click **Inspect Proof** on Task `#TSK-001`. A modal opens showing the high-resolution chiller gauge image with timestamp and file hash.
3. Click **Verify & Sign Off**. Task badge turns green: `VERIFIED`.
4. In the left navigation, click **Audit Ledger**.
5. Scroll through the chronological event stream:
   - `WEATHER_INGESTED`
   - `BRIEF_REVISED (v2)`
   - `BRIEF_APPROVED (Justin, Hash: 8b3c...)`
   - `TASK_DISPATCHED`
   - `PROOF_UPLOADED (Marcus, GCS URI)`
   - `TASK_VERIFIED (Justin)`

#### Verbatim Spoken Narrative
> *"Switching back to Justin, the facility manager, I inspect Marcus's uploaded photo proof. Supported by NVIDIA's `meta/llama-3.2-90b-vision-instruct` multimodal model, the system visually inspects uploaded inspection tags and chiller gauges to verify operating conditions. I click 'Verify & Sign Off'. 
> 
> Finally, we navigate to the Audit Ledger. Powered by Google Cloud Firestore native mode event sourcing, every single event in this lifecycle is recorded with microsecond timestamps, actor IDs, content hashes, and Cloud Storage URIs. 
> 
> This provides city agencies, building owners, and emergency coordinators with a tamper-evident audit trail of exactly what was done to protect vulnerable residents before the heat wave peaked."*

---

### Act 8: Limitations, Team Credits & Closing (4:35 – 4:45)

- **Timestamp:** `4:35 – 4:45` (10 seconds)
- **Active Persona:** `Justin (Manager)`
- **Visual Focus:** OpenAPI Contract tab (`/docs`) and Footer.

#### Action & Mouse Cue
1. Briefly flip to Tab 2 (`/docs`) showing the FastAPI OpenAPI interactive documentation and health endpoint `/healthz`.
2. Return to the dashboard footer displaying team credits.

#### Verbatim Spoken Narrative
> *"ClimateOps has 44 automated backend tests passing in CI, zero hardcoded credentials, and a live production endpoint on Cloud Run. Built with love by Blanca, Kseniya, Shiksha, and myself, Justin. Thank you for evaluating ClimateOps!"*

---

## 4. Post-Recording Quality Assurance Checklist

After recording your take:
- [ ] **Check Total Video Duration:** Open the file in QuickTime or VLC. Verify the duration is $\le 5:00$ (e.g. 4:42). **If it is 5:01 or higher, re-trim or re-record to avoid immediate disqualification.**
- [ ] **Audio Clarity:** Ensure voiceover is crisp, synchronized with mouse movements, and has no background hum.
- [ ] **Visual Clarity:** Verify text is readable at 1080p, specifically the citation tags, telemetry table, and audit log entries.
- [ ] **Upload:** Upload the MP4 video to YouTube (as "Unlisted") or Loom/Google Drive with public view access.
- [ ] **Link from README.md:** Paste the video link into the top section of `README.md` under `## Demonstration Video`.
