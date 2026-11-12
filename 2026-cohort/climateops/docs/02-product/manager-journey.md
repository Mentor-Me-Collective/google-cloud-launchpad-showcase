# Manager journey and screen contract

**Persona:** facility manager with limited staff; grounded in NYC Emergency Management (NYCEM) Heat Emergency Operations Protocols.

## Journey

1. **Open readiness queue:** see last NWS sync, whether live or fixture replay, active heat-related conditions and affected demo facilities.
2. **Review ranking:** see each facility's priority and underlying weather, gaps, neighborhood vulnerability and urgency, including unknown data flags.
3. **Open generated brief:** show summary, source identifiers/URLs, freshness, recommended safe task candidates and uncertainty disclosures.
4. **Decide:** approve exact version, reject, or send for changes. No assignment on merely opening the page.
5. **Assign approved tasks:** staff role and deadline, derived from approved tasks only; no autonomous field dispatch.
6. **Review completion:** checklist or sample proof, verification, reopen if insufficient.
7. **Inspect history:** weather retrieval, score version, brief revision, approval, assignment, proof and verification timestamps.

## Primary dashboard components

- Status banner: `DEMO / LIVE`, `LAST VERIFIED`, `STALE`.
- Top priorities: title, rank, traceable rationale, unknowns.
- Pending approval card: brief version, summarized tasks, `Approve`, `Request changes`, `Reject`.
- Approved work board: assignees are *synthetic roles*, due dates, completion status.
- Audit timeline: decisions and evidence reference, not raw secrets.

## Usability constraints

Avoid unexplained numerical risk scores, small tap targets, lengthy text and warnings that rely solely on color. Always expose weather issued/fetched time and why the AI recommendation was included. Any unavailable data must be plainly identified.
