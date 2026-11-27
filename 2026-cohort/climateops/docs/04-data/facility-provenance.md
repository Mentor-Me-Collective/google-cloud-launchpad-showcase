# Public facilities and demo data provenance

**Owner:** Kseniya · **Status:** location selection pending.

## Allowed field classifications

- `PUBLIC_VERIFIED`: a public, attributable source confirms that **specific fact** (e.g., location name and address).
- `DEMO_SYNTHETIC`: invented scenario data belonging to fictional demo organization A or B (e.g., role `staff_demo_02`, checklist status).
- `UNKNOWN`: not evidenced and not inferred.

## Why the separation matters

A listing does not establish that a site is a working cooling center, affiliated with ClimateOps, short on water, without air conditioning or available for public entry. A valid location record is not permission to represent private operations.

## Acquisition and review

1. Collect candidates from documented public facility listings in Mott Haven/Melrose.
2. Verify name, address, coordinates, listing date, permitted use and neighborhood boundary from sources.
3. Select 5–10 sites; record sources and explicitly mark uncertain facts.
4. Assign fictional tenants only within simulation metadata; avoid statements that fictional tenant owns/operates real site.
5. Review public claims manually before publication.

## Demo data dictionary

`public_facility_id` is the reference place. `scenario_site_id` is a simulated site in organization A/B. Connect them only as `example_geography_reference` and display a banner: **SIMULATED workflow anchored to public location data; no real facility association claimed**.

## Sample dataset

See `data/sample_facilities/README.md`. No actual facility listings are populated because the source list has not been verified in this writing session.
