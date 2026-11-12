# Source register and citation policy

**Owner:** Kseniya. Every displayed weather/availability/facility claim must map to immutable claim evidence or a cached source snapshot with retrieval time.

| Source ID | Issuer | Source | Usage | Limits / required verification |
|---|---|---|---|---|
| SRC-NWS-API | NWS | https://www.weather.gov/documentation/services-web-api | API contracts and endpoints | Check current API behavior and caching |
| SRC-NWS-ALERT | NWS | https://www.weather.gov/documentation/services-web-alerts | Alerts | Include issued/effective/expires/fetched timestamps |
| SRC-NYC-HVI | NYC DOHMH | https://a816-dohbesp.nyc.gov/IndicatorPublic/data-features/hvi/ | Neighborhood heat vulnerability | Not individual-facility condition; note dataset date |
| SRC-NYC-COOL | NYC 311 | https://portal.311.nyc.gov/article/?kanumber=KA-02663 | Cooling-center public context | No automatic inference of current operation |
| SRC-PUBLIC-FAC | TBD | TBD | 5–10 facility names/address/coords | Validate license, locations and source dates |

## Record requirements

`source_id, publisher, url, retrieved_at, published_at, license_or_terms, geography, claim_ids[], dataset_version, raw_hash, limitations, verifier`.

**Citation check:** each displayed claim points to a source record and relevant field/path. A source URL alone does not substantiate a summary that makes an unsupported inference. When status is unknown, label unknown.
