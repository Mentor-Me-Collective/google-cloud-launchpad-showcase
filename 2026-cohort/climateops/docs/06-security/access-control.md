# Tenant isolation and role permissions

**Owner:** Shiksha; implementation Blanca.

| Operation | Demo manager | Demo staff | Data validator | Unauthenticated |
|---|---|---|---|---|
| View own-tenant dashboard | Yes | Scoped | Audit-only scoped | No |
| Onboard sample site | Yes | No | Review only | No |
| Draft/revise brief | Yes | No | Review only | No |
| Approve/reject brief | **Yes** | No | No | No |
| Create tasks from approved plan | Yes | No | No | No |
| Update assigned task | Yes | Assigned only | No | No |
| Submit proof | Yes | Assigned only | No | No |
| Verify proof | Yes | No | No | No |
| Read own-tenant events | Yes | Limited | Scoped audit | No |

## Implementation rules

Identity is authenticated; `tenant_id` and role come from validated server-side claims, not body parameters. Every resource lookup must check tenant ownership even if a UUID is unguessable. API authorization checks must occur before returning metadata or signed download URLs. Use short-lived evidence links, HTTPS, minimal IAM service accounts and rotation policies. Mask keys and session tokens in logs.

## Session and test requirements

Expired session → 401; insufficient role → 403; wrong-tenant record → 403/404 without revealing details; stale CSRF/session protections depend on chosen auth method. Privileged actions require audit records. Confirm exact identity provider at kickoff.
