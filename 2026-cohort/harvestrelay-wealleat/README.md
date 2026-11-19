# WeAllEat (WAE)

> **Nobody deserves to go hungry. That's our WAE.**

WeAllEat connects businesses that have extra food (restaurants, grocers, caterers, campus dining) with nearby shelters and community kitchens that can use it right away, and lets neighbors reserve a free meal close to home.

**UN SDG:** 1 – No Poverty
**Team:** HarvestRelay
**Program:** Mentor Me Collective × Google Cloud Launchpad, BUILD 2026

---

## The problem

Good food gets thrown away every day while people nearby go without. The hard part isn't goodwill. It's logistics:

- Donors have a short window before food has to be tossed, and no quick way to find someone who can take it **now**.
- Kitchens can only accept food they can **store** (cold, hot, dry, frozen), have **room** for, and can **reach in time**.
- Handoffs get lost: nobody confirms the food actually changed hands.

*(Add your research and sources here: local food-waste numbers, shelter interviews, etc.)*

## What it does

| Who | What they can do |
|---|---|
| **Donor** | Post a batch in under a minute (storage type, servings, allergens, pickup cutoff up to 2 hours). See which kitchen is coming and call them. Check the kitchen's 4-digit PIN at pickup. |
| **Kitchen / shelter** | See only food it can store, has room for, and can reach in time. Reserve it, choose a pickup time, and confirm the handoff with a PIN. Serve walk-ins and hand out reserved meals. |
| **Neighbor** | See meals being served nearby within their chosen mile radius, hold a few servings, and show a code at pickup. |
| **Staff** | A short "needs your help" list: repeated PIN lockouts, food nobody can take, and support tickets. |

### Design rules we hold to

- **Rule-based matching only.** A kitchen is offered food only if its storage, open capacity, distance radius and travel time all fit. No AI decides whether food is safe or who gets it.
- **Every handoff is confirmed in person** with a 4-digit PIN (3 tries, then a lock).
- **People can fix most problems themselves** (new PIN once, automatic re-offer when a kitchen cancels, holds that expire automatically), so it works even without staff on hand.

### Batch lifecycle

`AVAILABLE → RESERVED → HANDOFF_CONFIRMED`, with `EXPIRED`, `CANCELED` and `UNMATCHED` as end states.

## Current status

| Part | Status |
|---|---|
| Clickable prototype (all four roles, matching, PINs, holds, walk-ins, help center) | ✅ Done: `src/web/index.html` |
| Shared, saved data on Google Cloud (Cloud Run + Firestore) | ✅ Live on Cloud Run (`server/`) |
| NVIDIA help assistant (Nemotron) | ✅ Live: Help → "Ask a question" |
| Real sign-in (Firebase Authentication) | 🔲 Planned |
| Real address → distance | 🔲 Planned (prototype uses simulated locations) |

The prototype runs entirely in the browser with sample data: 5 donors, 5 kitchens and 20 batches. Accounts you create only last until the page reloads.

## Run it

**Live app (Google Cloud Run):** https://wealleat-108914034539.us-central1.run.app
**Quick preview (GitHub Pages, demo data only):** https://misterkimchi.github.io/wealleat/

To deploy the full app with Google Cloud and NVIDIA, follow **[docs/deploy.md](docs/deploy.md)**.

To preview it locally with no install (demo data only, no cloud features):

1. Download or clone this repo.
2. Open `src/web/index.html` in any browser.
3. Pick a role and click **Use demo account**, or create a test account.

The yellow **Demo** button (bottom-left) lets you move the clock forward and trigger test cases such as a PIN lockout, a missed pickup and an expiring batch.

## Google Cloud + NVIDIA

```
Browser (src/web/index.html)
      │
      ▼
Cloud Run server (server/index.js)
      ├── /api/state ──► Firestore         shared, saved app data
      └── /api/help  ──► NVIDIA API        help assistant
                         (key from Secret Manager)
```

**Google Cloud**
- **Cloud Run** hosts the app and a small Node.js API (`server/index.js`).
- **Firestore** saves all donations, pickups, reservations and accounts, so every device sees the same data. A donor can post on one phone and a kitchen sees it on another within seconds. Saves use a transaction, so two devices can't overwrite each other.
- **Secret Manager** stores the NVIDIA API key. It never reaches the browser or GitHub.

**NVIDIA**
- The **Help** panel has an **Ask a question** box. The server sends the question to an NVIDIA-hosted model (default `nvidia/nemotron-3.5-lightning-30b-a3b`, through the NVIDIA API catalog) along with WeAllEat's own help articles (`server/help-articles.js`).
- The model is told to answer **only from those articles**, never to judge food safety or allergens, and to point to 911 or Poison Control for emergencies. Matching, PINs and pickups are never decided by AI.
- Questions are limited to 500 characters and 10 per minute per visitor.

**Reproduce it:** follow [docs/deploy.md](docs/deploy.md), then open the app in two browsers and try the Help box.

API keys live in server-side secrets only. Never commit them.

## Team

**Team HarvestRelay**

| Name | GCLP track | Focus |
|---|---|---|
| Babafemi Ajetunmobi (Lead) | AI Cloud Leader | Workflow, product direction and the NVIDIA feature |
| Chad Kim | Cloud Cybersecurity | Matching rules, prototype and app architecture |
| Scott Li | Cloud Cybersecurity | Security testing, sign-in and PIN checks |
| Gerson Boch | Cloud Engineering | Cloud services, deployment and reliability (timers, expiry) |

*(Add each person's individual contributions as the project goes.)*

## Links

- Demo video: *(add)*
- Presentation deck: *(add)*
- Written summary: *(add)*

## Future ideas

*Breadcrumbs for the next cohort: good places to build on WeAllEat.*


- Real address lookup, with live traffic shown as information only (never used for matching).
- Text-message alerts when food is posted nearby.
- Donor tax receipts and monthly impact reports.
- Real sign-in with Firebase Authentication, and moving the matching rules onto the server.
- Better impact numbers: food weight from meals (about 1.2 lb per meal) and emissions avoided, using published factors.

## License

[MIT](LICENSE)
