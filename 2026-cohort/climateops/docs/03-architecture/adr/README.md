# Architecture decisions

**All ADRs are Proposed, awaiting kickoff.** Review scope, security and implementation tests before acceptance.

- [ADR-001 — Manager approval is the mandatory gate before task creation](ADR-001-manager-approval-gate.md)
- [ADR-002 — Limit MVP to extreme heat and two demo tenants](ADR-002-heat-only-mvp.md)
- [ADR-003 — Use NWS for operational weather with cache-aware scheduling](ADR-003-nws-polling.md)
- [ADR-004 — Use deterministic and inspectable priority ranking](ADR-004-transparent-prioritization.md)
- [ADR-005 — Separate public facility facts from synthetic tenant operations](ADR-005-facility-provenance.md)
- [ADR-006 — Store completion proof privately with tracked integrity and event history](ADR-006-evidence-audit.md)
- [ADR-007 — Give Google Cloud and NVIDIA separate functional responsibilities](ADR-007-gcp-nvidia.md)
- [ADR-008 — Validate AI-generated briefs against a versioned evidence bundle](ADR-008-ai-grounding.md)
- [ADR-009 — Enforce tenant boundaries and server-side role checks](ADR-009-tenant-rbac.md)
- [ADR-010 — Use conventional state documents with append-only logical events](ADR-010-audit-projection.md)

Do not rewrite an accepted ADR to reverse a decision: supersede with a new ADR and links.
