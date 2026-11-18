import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL_NAME = "nvidia/nemotron-3.5-bolt-e4b";
const REQUEST_TIMEOUT_MS = 25000;

interface VerificationFinding {
  name?: string;
  severity?: string;
  explanation?: string;
  action?: string;
}

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
  mode?: "single" | "compare" | "extract";
  sessionId?: string;
  // Single-offer mode
  offerText?: unknown;
  context?: {
    sessionId?: string;
    assessment?: string;
    findings?: VerificationFinding[];
    company?: string | null;
    jobTitle?: string | null;
    salary?: string | null;
  };
  assessment?: string;
  findings?: VerificationFinding[];
  company?: string | null;
  jobTitle?: string | null;
  // Compare mode
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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // Validate HTTP method
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Retrieve API key safely
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

  // Parse and validate POST JSON payload
  let payload: RequestPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON in request body." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const isCompareMode =
    payload.mode === "compare" || (Array.isArray(payload.offers) && payload.offers.length > 0);
  const isExtractMode = payload.mode === "extract";

  let systemPrompt = "";
  let userPrompt = "";
  let maxTokens = 1024;
  const sessionId =
    (typeof payload.sessionId === "string" ? payload.sessionId : undefined) ||
    (typeof payload.context?.sessionId === "string" ? payload.context.sessionId : undefined);

  if (isExtractMode) {
    const rawOfferText = typeof payload.offerText === "string" ? payload.offerText.trim() : "";
    if (!rawOfferText) {
      return new Response(
        JSON.stringify({
          error: "Missing required field: 'offerText' must be a non-empty string.",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    systemPrompt =
      "You are OfferProof AI, an intelligent document field extractor powered by NVIDIA Nemotron.\n" +
      "Extract employment and verification details from the provided job or internship offer document.\n" +
      "Respond ONLY with a valid JSON object matching this schema:\n" +
      "{\n" +
      '  "company": string | null,\n' +
      '  "companyQuote": string | null,\n' +
      '  "recruiter": string | null,\n' +
      '  "recruiterQuote": string | null,\n' +
      '  "jobTitle": string | null,\n' +
      '  "jobTitleQuote": string | null,\n' +
      '  "salary": string | null,\n' +
      '  "salaryQuote": string | null,\n' +
      '  "joiningDate": string | null,\n' +
      '  "joiningDateQuote": string | null,\n' +
      '  "location": string | null,\n' +
      '  "locationQuote": string | null,\n' +
      '  "applicantEmails": string[],\n' +
      '  "recruiterEmails": string[],\n' +
      '  "phones": string[],\n' +
      '  "domains": string[],\n' +
      '  "urls": string[]\n' +
      "}\n\n" +
      "STRICT EXTRACTION RULES:\n" +
      "1. Extract ONLY facts explicitly stated in the document. If a field is not present, set it to null (or empty array for lists).\n" +
      "2. For all *Quote fields, provide the exact verbatim sentence from the text supporting the extracted value.\n" +
      "3. Distinguish carefully between applicant emails (candidate/recipient) and recruiter/company emails.\n" +
      "4. Include all phone numbers, email domains, and website links found.\n" +
      "5. Output valid JSON only, without markdown fences, explanation, or conversational text.";

    userPrompt =
      `Please extract all employment details from the following offer document:\n\n` +
      `--- Offer Text ---\n${rawOfferText.slice(0, 15000)}`;
    maxTokens = 1200;
  } else if (isCompareMode) {
    if (!Array.isArray(payload.offers) || payload.offers.length < 2) {
      return new Response(
        JSON.stringify({
          error: "Comparison mode requires at least two offers in the 'offers' array.",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    systemPrompt =
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

    userPrompt =
      `Please provide an AI Career Advisor evaluation comparing the following ${payload.offers.length} job offers:\n` +
      prefBlock +
      `\n--- Job Offers to Compare ---\n${offerDescriptions}\n\n` +
      `Evaluate them according to your guidelines and output the five structured sections.`;
    maxTokens = 1536;
  } else {
    // Single-offer verification mode
    const rawOfferText = typeof payload.offerText === "string" ? payload.offerText.trim() : "";
    if (!rawOfferText) {
      return new Response(
        JSON.stringify({
          error: "Missing required field: 'offerText' must be a non-empty string.",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // Redact personally-identifiable details before sending to NVIDIA API.
    const offerText = redactText(rawOfferText);

    // Extract optional verification context
    const assessment = payload.context?.assessment || payload.assessment;
    const findings = payload.context?.findings || payload.findings;
    const company = payload.context?.company || payload.company;
    const jobTitle = payload.context?.jobTitle || payload.jobTitle;

    const contextSummaryParts: string[] = [];
    if (company) contextSummaryParts.push(`Company name: ${company}`);
    if (jobTitle) contextSummaryParts.push(`Job title: ${jobTitle}`);
    if (assessment) contextSummaryParts.push(`Heuristic assessment: ${assessment}`);
    if (Array.isArray(findings) && findings.length > 0) {
      const list = findings
        .map(
          (f) => `- ${f.name ?? "Indicator"} (${f.severity ?? "notice"}): ${f.explanation ?? ""}`,
        )
        .join("\n");
      contextSummaryParts.push(`Existing detected indicators:\n${list}`);
    }

    const contextBlock =
      contextSummaryParts.length > 0
        ? `\n\n--- Verification Context ---\n${contextSummaryParts.join("\n")}`
        : "";

    systemPrompt =
      "You are OfferProof AI, an objective career advisor specializing in job and internship offer reviews.\n" +
      "Provide clear, professional, and practical next-step recommendations for the candidate.\n" +
      "Guidelines:\n" +
      "1. Never alter or override OfferProof's rule-based findings or risk assessment.\n" +
      "2. Recommend concrete questions the candidate should ask the recruiter or hiring contact.\n" +
      "3. Highlight specific clauses, onboarding procedures, or verification steps to double-check.\n" +
      "4. Structure your response into concise bullet points under exactly these three headings:\n" +
      "### Verification Steps\n" +
      "### Recruiter Questions\n" +
      "### Important Precautions\n" +
      "5. Keep the tone calm, empowering, and pragmatic.";

    userPrompt =
      `Please provide AI recommendations for the following job offer:\n\n` +
      `--- Offer Text ---\n${offerText.slice(0, 15000)}` +
      contextBlock;
    maxTokens = 1024;
  }

  // Prepare call to NVIDIA API with timeout
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
        temperature: isExtractMode ? 0.1 : 0.3,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!nvidiaResponse.ok) {
      const errText = await nvidiaResponse.text().catch(() => "");
      console.error(`NVIDIA API HTTP ${nvidiaResponse.status}:`, errText);
      return new Response(
        JSON.stringify({
          error: "Failed to generate AI response from NVIDIA service.",
          status: nvidiaResponse.status,
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const data = await nvidiaResponse.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() || "";

    if (!rawContent) {
      return new Response(
        JSON.stringify({
          error: "NVIDIA service returned an empty response.",
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    if (isExtractMode) {
      let extracted: unknown = null;
      try {
        const cleaned = rawContent
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
        extracted = JSON.parse(cleaned);
      } catch (e) {
        console.error("Failed to parse Nemotron extraction JSON:", e, rawContent);
      }

      return new Response(
        JSON.stringify({
          extracted,
          model: MODEL_NAME,
          sessionId,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // Return AI recommendations separately without mutating verification logic or scores
    return new Response(
      JSON.stringify({
        recommendations: rawContent,
        model: MODEL_NAME,
        sessionId,
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
