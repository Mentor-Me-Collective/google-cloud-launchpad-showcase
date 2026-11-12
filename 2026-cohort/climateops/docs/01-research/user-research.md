# User research protocol and evidence discipline

**Owner:** Justin (`@creova-gif`); **Status:** Grounded in published municipal operational protocols; direct human subject fieldwork ethically excluded.

## Research Strategy & Data Boundaries

To adhere to strict capstone ethical boundaries, data privacy rules, and institutional access limitations, **direct fieldwork and human-subject interviews with municipal facility directors were intentionally excluded from this MVP scope**. Hackathon guidelines explicitly state:
> *"Do not fabricate user quotes, simulate interview findings, or claim unverified partnerships with city agencies."*

In place of unconsented interviews, ClimateOps grounds its persona models, operational decision trees, and task checklists in **authoritative published municipal and institutional emergency management directives**:

1. **NYC Emergency Management (NYCEM) Heat Emergency Plan:**
   - Operational alert triggers (Heat Advisory $\ge 95^\circ\text{F}$ for 2 days or $\ge 100^\circ\text{F}$ for 1 day; Excessive Heat Warning $\ge 105^\circ\text{F}$).
   - Standard municipal cooling center readiness checklists and chiller setpoint verification.
2. **NYC Department of Health and Mental Hygiene (NYC DOHMH):**
   - Heat Vulnerability Index (HVI) neighborhood risk distribution (Mott Haven / Melrose HVI = 5/5).
   - High-risk demographic vulnerability weighting (elderly occupants, toddlers, chronic respiratory conditions).
3. **CDC / National Institute for Occupational Safety and Health (NIOSH):**
   - Facility maintenance heat-stress mitigation standards and indoor wet-bulb globe temperature thresholds.
4. **NYC 311 Public Facility Directories:**
   - Real-world geospatial coordinates, address metadata, and facility types for our 8 South Bronx community and recreation centers.

## Evaluative Persona & Workflow Walkthrough

We validated the operational workflow using an **expert heuristic walkthrough** against a standardized municipal heat wave scenario:

| Evaluated Dimension | Grounding Source | Heuristic Invariant in ClimateOps | Verification Result |
|---|---|---|---|
| **Alert Timeliness** | NYCEM CAP Protocol | Weather polled every 5 min via Cloud Scheduler | ✅ Automated cache refresh |
| **Site Prioritization** | NYC DOHMH HVI Factors | 5-Factor formula (Hazard, Occupants, AC, Load, Staff) | ✅ Deterministic 0–100 score |
| **Operational Feasibility** | NYCEM Facility Checklist | Readiness brief actions cited to verified building fixtures | ✅ NVIDIA NIM cited actions |
| **Governance & Safety** | NYC Municipal Chain of Command | Manager authorization required before task dispatch | ✅ ADR-001 Approval Gate (403/409) |
| **Execution Verifiability** | Public Works Inspection Standards | Timestamped visual photo proof required | ✅ Private GCS signed PUT URLs |

## Future Expansion

Any future live facility operator testing will require formal municipal administrative partnership, an IRB data ethics exemption, and anonymized consent protocols. For this MVP, all facility operational states are maintained as transparent, labeled DEMO records.
