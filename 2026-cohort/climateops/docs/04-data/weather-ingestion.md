# NWS ingestion, matching and freshness

**Owners:** Blanca and Kseniya.

## Endpoints and methods

- Read NWS API documentation: https://www.weather.gov/documentation/services-web-api
- Read alerts docs: https://www.weather.gov/documentation/services-web-alerts
- Select representative facility coordinates using validated public directory records; call NWS `/points/{lat},{lon}` to discover grid forecast URLs, then use the returned `forecastHourly` URL.
- Retrieve applicable alerts via officially supported active-alert geographic filtering. Confirm that an alert applies to the target area; do not assume a neighborhood substring proves applicability.

## Suggested schedule — to validate

Alerts every **5 minutes**; hourly forecast every **30 minutes**; respect NWS caching and service guidance and include an appropriate User-Agent. Treat these as design defaults, not official mandated intervals.

## Pipeline

1. Cloud Scheduler triggers authenticated ingestion.
2. Fetch only needed NWS area/point resources; throttle and retry transient failures with exponential backoff.
3. Validate schema, IDs, timestamp fields, applicable geography and weather types.
4. Normalize heat-relevant conditions; store original source reference and hash.
5. Deduplicate by provider ID/version; calculate freshness and alert validity.
6. Match to validated facility locations; set ambiguity flags for unverified coverage.
7. Recompute priority snapshots only on materially changed evidence.
8. Publish status and update history without implying that polling failure means no hazard.

## Source freshness policy

Use `fetched_at` for retrieval and NWS `expires`/validity fields for alert relevance. If polling exceeds tolerance (TBD; start with twice expected schedule), show `STALE`. The last observation may be displayed as historical context, never as a newly verified current state.

## Replay fixture behavior

Store a small, clearly labeled replay fixture with synthetic task-readiness values and exact copied or fabricated-for-demo weather labels. A fabricated weather record must be marked `SIMULATED`, not attributed to NWS as a real issued alert.

## Failure scenarios

HTTP 429 → backoff; timeout → mark fetch failure; contradictory/newer event → record both versions; invalid geometry → omit matching and escalate; missing issue time → flag invalid record; outdated forecast URL → rediscover `/points` endpoint.
