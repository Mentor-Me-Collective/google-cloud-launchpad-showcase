import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL_NAME = "nvidia/nemotron-3.5-bolt-e4b";
const REQUEST_TIMEOUT_MS = 25000;

interface CompareOfferItem {
  id?: string;
  title?: string;
  company?: string | null;
  job_title?: string | null;
  salary_amount?: number | null;
  salary_currency?: string | null;
  salary_period?: string | null;
  location?: string | null;
  work_mode?: string | null;
  employment_type?: string | null;
  employment_terms?: string | null;
  benefits?: string | null;
  growth_rating?: number | null;
  work_life_rating?: number | null;
  safety?: {
    assessment?: string;
    warnings?: string[];
  } | null;
}

interface RequestPayload {
  sessionId?: string;
  offers?: CompareOfferItem[];
  preferences?: {
    priority?: string;
    careerGoals?: string;
  };
}

function redactText(text: string): string {
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[EMAIL REDACTED]")
    .replace(/(?:\+91[\s-]?)?(?:\(?0?\d{2,4}\)?[\s-]?)?\d{5}[\s-]?\d{5}/g, "[PHONE REDACTED]")
    .replace(/\b\d{10,12}\b/g, "[PHONE REDACTED]");
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

  const apiKey = Deno.env.get("NVIDIA_API_KEY")?.trim();
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "NVIDIA_API_KEY is not configured in Supabase environment secrets.",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON in request body." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(payload.offers) || payload.offers.length < 2) {
    return new Response(
      JSON.stringify({ error: "Comparison requires at least two offers in the 'offers' array." }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  const systemPrompt =
    "You are OfferProof AI Career Advisor, an expert career strategist and compensation advisor powered by NVIDIA Nemotron.\n" +
    "You analyze multiple job offers side-by-side to help candidates make informed, high-confidence career decisions.\n" +
    "Guidelines:\n" +
    "1. Clearly separate career suitability from offer safety and verification. Safety signals provided by OfferProof are heuristic indicators only; never declare an offer genuine or fraudulent.\n" +
    "2. Evaluate how well each offer aligns with the candidate's stated priorities (compensation, career growth, work-life balance, flexibility, etc.).\n" +
    "3. Provide concrete, balanced pros and cons for every offer compared.\n" +
    "4. Provide realistic salary and career growth insights, taking into account normalized compensation, benefits, and long-term career progression.\n" +
    "5. Identify missing details and formulate sharp, professional questions the candidate should ask recruiters to clarify ambiguous terms.\n" +
    "6. Provide a decisive, personalized recommendation explaining which offer represents the best overall fit and why.\n" +
    "7. Structure your response under EXACTLY these five headings:\n" +
    "### Best Career Fit\n" +
    "### Comparison Summary & Pros/Cons\n" +
    "### Salary & Career Growth Insights\n" +
    "### Missing Information & Recruiter Questions\n" +
    "### Personalized Recommendations\n" +
    "8. Keep the tone professional, objective, empowering, and pragmatic.";

  const prefParts: string[] = [];
  if (payload.preferences?.priority) {
    prefParts.push(`Primary Candidate Priority: ${payload.preferences.priority}`);
  }
  if (payload.preferences?.careerGoals) {
    prefParts.push(
      `Candidate Career Goals / Constraints: ${redactText(payload.preferences.careerGoals)}`,
    );
  }
  const prefBlock =
    prefParts.length > 0
      ? `\n--- Candidate Priorities & Preferences ---\n${prefParts.join("\n")}\n`
      : "";

  const offerDescriptions = payload.offers
    .map((o, idx) => {
      const lines = [
        `Offer #${idx + 1}: ${o.title || `Offer ${idx + 1}`} (${o.company ? redactText(o.company) : "Company not specified"})`,
        `- Role: ${o.job_title ? redactText(o.job_title) : "Not specified"}`,
        `- Compensation: ${o.salary_amount != null ? `${o.salary_amount} ${o.salary_currency || ""} per ${o.salary_period || "year"}` : "Not provided"}`,
        `- Location & Work Mode: ${o.location ? redactText(o.location) : "Not specified"} (${o.work_mode || "Not specified"})`,
        `- Employment Type: ${o.employment_type || "Not specified"}`,
        `- Benefits: ${o.benefits ? redactText(o.benefits) : "Not specified"}`,
        `- Employment Terms: ${o.employment_terms ? redactText(o.employment_terms) : "Not specified"}`,
        `- Candidate Growth Rating (1-5): ${o.growth_rating ?? "Not rated"}`,
        `- Candidate Work-Life Balance Rating (1-5): ${o.work_life_rating ?? "Not rated"}`,
        `- OfferProof Safety Status: ${o.safety?.assessment ? o.safety.assessment.replace(/_/g, " ") : "Not evaluated"}${o.safety?.warnings?.length ? ` (${o.safety.warnings.join("; ")})` : ""}`,
      ];
      return lines.join("\n");
    })
    .join("\n\n");

  const userPrompt =
    `Please provide an AI Career Advisor evaluation comparing the following ${payload.offers.length} job offers:\n` +
    prefBlock +
    `\n--- Job Offers to Compare ---\n${offerDescriptions}\n\n` +
    `Evaluate them according to your guidelines and output the five structured sections.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const nvidiaResponse = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1536,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!nvidiaResponse.ok) {
      const errText = await nvidiaResponse.text().catch(() => "");
      console.error(`NVIDIA API HTTP ${nvidiaResponse.status}:`, errText);
      return new Response(
        JSON.stringify({
          error: "Failed to generate AI recommendations from NVIDIA service.",
          status: nvidiaResponse.status,
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const data = await nvidiaResponse.json();
    const recommendations = data.choices?.[0]?.message?.content?.trim() || "";

    if (!recommendations) {
      return new Response(
        JSON.stringify({
          error: "NVIDIA service returned an empty recommendation.",
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        recommendations,
        model: MODEL_NAME,
        sessionId: payload.sessionId,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === "AbortError") {
      return new Response(JSON.stringify({ error: "NVIDIA API request timed out." }), {
        status: 504,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    console.error("Error invoking NVIDIA API:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred while generating recommendations." }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
