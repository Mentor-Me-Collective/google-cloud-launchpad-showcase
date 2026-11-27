# Architecture plan

Where the prototype is today and what it needs to become a real, working product for the BUILD submission.

## Today

- `src/web/index.html`: the full app (all four roles, matching rules, timers, PIN checks).
- `server/index.js`: a Cloud Run server that serves the app, saves shared data in Firestore (`/api/state`) and runs the NVIDIA help assistant (`/api/help`).
- Opened without the server (as a file or on GitHub Pages), the app falls back to local demo data that resets on reload.

## Target

```
Browser (the same page, split into HTML/CSS/JS)
        │  HTTPS
        ▼
Firebase Hosting ──► Cloud Run API (Node or Python)
                        │
                        ├── Firestore: donors, kitchens, batches, holds, tickets, audit log
                        ├── Firebase Authentication: sign-in for all four roles
                        ├── Cloud Scheduler: runs expiry and hold timers every minute
                        ├── Secret Manager: NVIDIA API key, other secrets
                        └── NVIDIA API catalog (NIM): see "NVIDIA feature" below
```

| Piece | Google Cloud service | Replaces in the prototype | Suggested owner |
|---|---|---|---|
| Hosting the page | Firebase Hosting | Opening the HTML file | Gerson |
| API and rules | Cloud Run | `evaluate()`, `transition()` in the page | Chad |
| Saved data | Firestore | The in-memory `S` object | Chad / Gerson |
| Sign-in | Firebase Authentication | Demo accounts | Scott |
| PIN hashing and lockouts | Cloud Run (server side) | `pinMaterial()` in the browser | Scott |
| Timers (holds, expiry) | Cloud Scheduler → Cloud Run | `runJobs()` and the simulated clock | Gerson |
| Secrets | Secret Manager | n/a | Scott |

**Rule to keep:** the matching rules (storage, capacity, radius, travel time) must run on the server, so nobody can change them from the browser.

## NVIDIA feature (must be meaningful, must not decide food safety)

Options that fit the "no AI judges food safety" rule:

1. **Help-center assistant** *(recommended)*: answers "how do I…" questions grounded only in our own help articles. Clear user value, easy to demo, and low risk.
2. **Post helper:** a donor types "3 trays of chicken alfredo, has dairy and wheat" and the model pre-fills servings and allergen boxes. **The donor must confirm every field**; the model never sets a field on its own.
3. **Label photo reader:** a photo of a package label pre-fills allergens, again only as a suggestion the donor confirms.

Confirm the chosen model is currently available in the NVIDIA API catalog before building on it.

## Open questions

- Address → coordinates: Google Maps Geocoding requires a billing account. Alternatives: ZIP-code centroids, or keep simulated locations for the demo.
- How do we verify that a kitchen is a real organization before it can claim food?
- What happens to personal data (phone numbers, names) after a handoff, and how long do we keep it?
