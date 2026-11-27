# Documentation index and architecture

**Navigation and review map.** Documents are living drafts until their owners accept them. `TBD` means missing evidence/decision, not a verified fact.

| File | Purpose | Owner track | Audience |
|---|---|---|---|
| [Charter](00-governance/charter.md) | Goals, constraints, acceptance | Justin | Team/judges |
| [Kickoff](00-governance/kickoff.md) | Timed agenda and required decisions | Justin | Team |
| [Decision log](00-governance/decision-log.md) | Recorded decisions and open issues | Justin | Team/reviewers |
| [Problem evidence](01-research/problem-evidence.md) | Research and SDG framing | Justin/AI research | Judges/managers |
| [Research workflow](01-research/user-research.md) | Interview script and claims discipline | Justin | Users/reviewers |
| [Source register](01-research/source-register.md) | Reproducible citations | Kseniya | Validators |
| [PRD](02-product/prd.md) | Requirements and non-goals | Justin | Engineers |
| [User journey](02-product/manager-journey.md) | Manager-first tasks and screens | Justin | Manager/designers |
| [Approval workflow](02-product/approval-workflow.md) | State transitions/invariants | Justin/Blanca | Engineers/security |
| [Heat playbook](02-product/task-playbook.md) | Suggested safe demo tasks | Justin | Managers |
| [Architecture](03-architecture/system.md) | System diagram, boundaries and flow | Blanca | Engineers/judges |
| [API contract](03-architecture/interfaces/api-contract.md) | Endpoint proposal | Blanca | Engineers |
| [ADRs](03-architecture/adr/README.md) | Ten numbered decisions | Decision owners | Reviewers |
| [Data model](04-data/data-model.md) | Entities and consistency | Kseniya/Blanca | Engineers |
| [Weather ingestion](04-data/weather-ingestion.md) | NWS integration, freshness | Blanca/Kseniya | Engineers |
| [Provenance](04-data/facility-provenance.md) | Real vs synthetic records | Kseniya | Validators |
| [AI grounding](05-ai-evaluation/grounding-policy.md) | Safe AI generation | AI research/Justin | Validators |
| [Evaluation plan](05-ai-evaluation/evaluation-plan.md) | Tests and baselines | Justin/AI research | Judges |
| [Threat model](06-security/threat-model.md) | Threats and controls | Shiksha | Security |
| [Access policy](06-security/access-control.md) | Tenant and role enforcement | Shiksha | Engineers |
| [Proof handling](06-security/evidence-handling.md) | File safety and retention | Shiksha | Security |
| [Roadmap](07-implementation/roadmap.md) | Four weeks and gates | Justin | All |
| [Test plan](07-implementation/test-plan.md) | Test specification | Blanca/Kseniya/Shiksha | QA |
| [Operations](08-operations/runbook.md) | Deploy/observe/rollback | Blanca/Shiksha | Engineers |
| [Summary](09-submission/summary.md) | ≤3 page export-ready outline | Justin | Judges |
| [Slides](09-submission/presentation.md) | ≤8 slides | Justin | Judges |
| [Demo](09-submission/demo-script.md) | ≤5 minute script | Justin/Blanca | Judges |

## Review rules

- Put factual references in `source-register.md` and retain individual evidence identifiers in data and briefs.
- Each ADR is ≤1 page where rendered, with title, status, context, decision, consequences and owner.
- Merge via PR, link decisions to acceptance tests, do not silently rewrite accepted decisions. Add superseding ADRs.
- Public facility facts and synthetic tenant/demo metadata MUST remain distinguishable.
- `README.md` is the external entry point; this index is the contributor entry point.
