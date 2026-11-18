import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BQ_PROJECT_ID = "xenon-hub-514707-f9";
const BQ_DATASET = "offerproof_analytics";
const BQ_TABLE = "job_postings";
const BQ_LOCATION = "asia-south1";
const REQUEST_TIMEOUT_MS = 25000;

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
  project_id?: string;
}

interface RequestPayload {
  search?: string;
  filter?: "all" | "fraudulent" | "legitimate";
  limit?: number;
  offset?: number;
  includeSummary?: boolean;
}

function pemToBinary(pem: string): Uint8Array {
  const clean = pem
    .replace(/-----BEGIN[A-Z\s]+-----/g, "")
    .replace(/-----END[A-Z\s]+-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64Url(input: Uint8Array | string): string {
  let b64: string;
  if (typeof input === "string") {
    b64 = btoa(unescape(encodeURIComponent(input)));
  } else {
    let binary = "";
    for (let i = 0; i < input.byteLength; i++) {
      binary += String.fromCharCode(input[i]);
    }
    b64 = btoa(binary);
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGoogleAccessToken(sa: ServiceAccount, signal: AbortSignal): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64Url(
    JSON.stringify({
      iss: sa.client_email,
      scope:
        "https://www.googleapis.com/auth/bigquery.readonly https://www.googleapis.com/auth/cloud-platform.read-only",
      aud: sa.token_uri || "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );

  const unsignedToken = `${header}.${claimSet}`;
  const keyBytes = pemToBinary(sa.private_key);

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  );

  const signature = base64Url(new Uint8Array(signatureBuffer));
  const jwt = `${unsignedToken}.${signature}`;

  const tokenRes = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
    signal,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text().catch(() => "");
    throw new Error(`Google OAuth error (${tokenRes.status}): ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function runBigQueryQuery(
  accessToken: string,
  query: string,
  signal: AbortSignal,
): Promise<{
  schema?: { fields: Array<{ name: string; type: string }> };
  rows?: Array<{ f: Array<{ v: unknown }> }>;
  totalRows?: string;
}> {
  const endpoint = `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT_ID}/queries`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      location: BQ_LOCATION,
      timeoutMs: 15000,
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`BigQuery API error (${res.status}): ${errText}`);
  }

  return await res.json();
}

function parseBigQueryRows(
  schema?: { fields: Array<{ name: string }> },
  rows?: Array<{ f: Array<{ v: unknown }> }>,
): Array<Record<string, unknown>> {
  if (!schema?.fields || !rows || !Array.isArray(rows)) return [];
  const fieldNames = schema.fields.map((f) => f.name);
  return rows.map((r) => {
    const item: Record<string, unknown> = {};
    r.f.forEach((cell, i) => {
      item[fieldNames[i]] = cell?.v ?? null;
    });
    return item;
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")?.trim();
  if (!serviceAccountJson) {
    return new Response(
      JSON.stringify({
        error: "GOOGLE_SERVICE_ACCOUNT_JSON is not configured in Supabase environment secrets.",
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(serviceAccountJson);
    if (!sa.client_email || !sa.private_key) {
      throw new Error("Missing client_email or private_key in service account JSON.");
    }
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({
        error: "Invalid GOOGLE_SERVICE_ACCOUNT_JSON secret format.",
        details: err instanceof Error ? err.message : "Malformed JSON",
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  let payload: RequestPayload = {};
  try {
    payload = await req.json();
  } catch {
    // Body is optional; default to empty payload
  }

  const search = typeof payload.search === "string" ? payload.search.trim() : "";
  const filter =
    payload.filter === "fraudulent" || payload.filter === "legitimate" ? payload.filter : "all";
  const limit = Math.min(Math.max(Number(payload.limit) || 25, 1), 100);
  const offset = Math.max(Number(payload.offset) || 0, 0);
  const includeSummary = payload.includeSummary !== false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const accessToken = await getGoogleAccessToken(sa, controller.signal);

    // Build filtered records query
    const conditions: string[] = ["1=1"];
    if (filter === "fraudulent") {
      conditions.push("IFNULL(LOWER(TRIM(CAST(fraudulent AS STRING))) IN ('1', 'true'), FALSE)");
    } else if (filter === "legitimate") {
      conditions.push(
        "NOT IFNULL(LOWER(TRIM(CAST(fraudulent AS STRING))) IN ('1', 'true'), FALSE)",
      );
    }

    if (search) {
      // Escape single quotes for SQL string literal
      const safeSearch = search.replace(/'/g, "\\'").slice(0, 100);
      conditions.push(`(
        LOWER(CAST(title AS STRING)) LIKE LOWER('%${safeSearch}%')
        OR LOWER(CAST(company_profile AS STRING)) LIKE LOWER('%${safeSearch}%')
        OR LOWER(CAST(description AS STRING)) LIKE LOWER('%${safeSearch}%')
        OR LOWER(CAST(requirements AS STRING)) LIKE LOWER('%${safeSearch}%')
        OR LOWER(CAST(industry AS STRING)) LIKE LOWER('%${safeSearch}%')
      )`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const recordsQuery = `
      SELECT *
      FROM \`${BQ_PROJECT_ID}.${BQ_DATASET}.${BQ_TABLE}\`
      ${whereClause}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const summaryQuery = `
      SELECT
        COUNT(*) AS total_count,
        COUNTIF(IFNULL(LOWER(TRIM(CAST(fraudulent AS STRING))) IN ('1', 'true'), FALSE)) AS fraudulent_count,
        COUNTIF(NOT IFNULL(LOWER(TRIM(CAST(fraudulent AS STRING))) IN ('1', 'true'), FALSE)) AS legitimate_count
      FROM \`${BQ_PROJECT_ID}.${BQ_DATASET}.${BQ_TABLE}\`
    `;

    const queryPromises: [Promise<unknown>, Promise<unknown>?] = [
      runBigQueryQuery(accessToken, recordsQuery, controller.signal),
    ];
    if (includeSummary) {
      queryPromises.push(runBigQueryQuery(accessToken, summaryQuery, controller.signal));
    }

    const [recordsResult, summaryResult] = await Promise.all(queryPromises);
    clearTimeout(timeoutId);

    const bqRecords = recordsResult as {
      schema?: { fields: Array<{ name: string; type: string }> };
      rows?: Array<{ f: Array<{ v: unknown }> }>;
      totalRows?: string;
    };
    const rawRecords = parseBigQueryRows(bqRecords.schema, bqRecords.rows);
    const records = rawRecords.map((r) => {
      const isFraud =
        r.fraudulent === 1 ||
        r.fraudulent === "1" ||
        r.fraudulent === true ||
        (typeof r.fraudulent === "string" &&
          (r.fraudulent.toLowerCase() === "true" || r.fraudulent.trim() === "1"));
      return {
        ...r,
        fraudulent: isFraud ? 1 : 0,
      };
    });

    let summary = null;
    if (summaryResult) {
      const bqSummary = summaryResult as {
        schema?: { fields: Array<{ name: string; type: string }> };
        rows?: Array<{ f: Array<{ v: unknown }> }>;
      };
      const parsedSummary = parseBigQueryRows(bqSummary.schema, bqSummary.rows)[0];
      if (parsedSummary) {
        const total = Number(parsedSummary.total_count) || 0;
        const fraudulent = Number(parsedSummary.fraudulent_count) || 0;
        const rawLegitimate = Number(parsedSummary.legitimate_count);
        const legitimate =
          !isNaN(rawLegitimate) && (rawLegitimate > 0 || fraudulent === total)
            ? rawLegitimate
            : Math.max(0, total - fraudulent);
        summary = {
          total,
          fraudulent,
          legitimate,
          fraudulentRate: total > 0 ? Number(((fraudulent / total) * 100).toFixed(2)) : 0,
        };
      }
    }

    return new Response(
      JSON.stringify({
        table: `${BQ_PROJECT_ID}.${BQ_DATASET}.${BQ_TABLE}`,
        location: BQ_LOCATION,
        summary,
        records,
        count: records.length,
        offset,
        limit,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === "AbortError") {
      return new Response(
        JSON.stringify({ error: "BigQuery request timed out after 25 seconds." }),
        { status: 504, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    console.error("BigQuery Edge Function error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({
        error: "Failed to query BigQuery dataset.",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
