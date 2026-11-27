import {
  CONSENT_CHANGE_CONTEXTS,
  CONSENT_TYPES,
  isConsentType,
  type ConsentChangeContext,
  type ConsentState,
  type ConsentType,
} from "../consent/model.js";

const DEFAULT_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";
/** The hosted NVIDIA API catalog. */
const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";

/**
 * The only states a draft may propose. Fixed list (plan phase 4): "not_set" is
 * a starting state a parent cannot move to, so it is not proposable.
 */
export const DRAFT_STATES = ["granted", "withdrawn"] as const;
export type DraftState = (typeof DRAFT_STATES)[number] & ConsentState;

/** Keys the model may return. Anything else makes the output invalid. */
const ALLOWED_KEYS = new Set(["type", "to", "changeContext", "summary"]);

export interface ConsentDraft {
  type: ConsentType;
  to: DraftState;
  changeContext: ConsentChangeContext;
  /** Written by this server from the validated fields, never taken from the model. */
  summary: string;
}

export class NvidiaDraftConfigurationError extends Error {}
export class NvidiaDraftRequestError extends Error {
  /** HTTP status from NVIDIA when there was one (429, 5xx ...). Safe to log. */
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** Shown to the parent whenever the AI helper cannot be used. Exact wording is agreed. */
export const AI_UNAVAILABLE_MESSAGE =
  "The AI helper is unavailable, please use the manual form";

/** How long to wait for NVIDIA before giving up, in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * The model could not tell what the parent meant, or returned something that
 * is not a known consent type and state.
 *
 * Decision 7 in docs/legal-decisions-log.md: "If the message is unclear, the
 * system asks the parent instead of guessing." This is a normal outcome, not a
 * failure: the caller should ask the parent to rephrase or use the toggles.
 */
export class NvidiaDraftUnclearError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------- settings

export interface NimSettings {
  apiKey: string | undefined;
  model: string;
  baseUrl: string;
}

/**
 * Reads the NIM settings. NIM_API_KEY and NIM_MODEL are the names the plan
 * uses; NVIDIA_API_KEY and NVIDIA_MODEL still work as fallbacks. `||`, not
 * `??`: compose passes an empty string for an unset variable, and an empty
 * model id would be sent straight to NVIDIA.
 */
export function nimSettings(
  env: Record<string, string | undefined> = process.env,
): NimSettings {
  return {
    apiKey: env.NIM_API_KEY || env.NVIDIA_API_KEY || undefined,
    model: env.NIM_MODEL || env.NVIDIA_MODEL || DEFAULT_MODEL,
    baseUrl: env.NVIDIA_BASE_URL || DEFAULT_BASE_URL,
  };
}

// ------------------------------------------------------------ prompt safety

const NUMBER_REMOVED = "[number removed]";
const EMAIL_REMOVED = "[email removed]";
const MEDICAL_REMOVED = "[medical detail removed]";

/**
 * Medical terms removed before anything is sent to the model. The word
 * "medical" itself stays, because it names a consent type the parent may be
 * talking about; what goes is the detail (conditions, medicines, treatment).
 */
const MEDICAL_TERMS = [
  "asthma", "asthmatic", "diabet\\w*", "insulin", "epilep\\w*", "seizure\\w*",
  "allerg\\w*", "anaphyla\\w*", "epipen", "inhaler\\w*", "adhd", "autis\\w*",
  "hiv", "aids", "cancer", "leukemi\\w*", "leukaemi\\w*", "tumou?r\\w*",
  "heart condition", "heart defect", "sickle cell", "cystic fibrosis",
  "depress\\w*", "anxiety", "disabilit\\w*", "disorder\\w*", "syndrome",
  "diagnos\\w*", "prescri\\w*", "medication\\w*", "medicine\\w*", "tablet\\w*",
  "dose\\w*", "dosage", "therap\\w*", "surger\\w*", "operation", "chronic",
  "condition", "illness\\w*", "disease\\w*", "symptom\\w*", "treatment\\w*",
  "doctor\\w*", "hospital\\w*", "clinic\\w*", "blood (?:type|group|pressure)",
];
const MEDICAL_PATTERN = new RegExp(`\\b(?:${MEDICAL_TERMS.join("|")})\\b`, "gi");

/**
 * Removes contact numbers, email addresses and medical details from free text
 * before it is placed in a prompt (plan phase 4). Any run of 7 or more digits
 * (with the usual separators) counts as a number, which also catches ID
 * numbers. Removal is deliberately greedy: a lost word is cheaper than a leak.
 */
export function sanitizeForPrompt(text: string): string {
  return text
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, EMAIL_REMOVED)
    .replace(/\+?\d[\d\s().-]{5,}\d/g, (match) =>
      match.replace(/\D/g, "").length >= 7 ? NUMBER_REMOVED : match,
    )
    .replace(MEDICAL_PATTERN, MEDICAL_REMOVED);
}

const SYSTEM_PROMPT =
  `Extract one consent request. Return only a JSON object with keys "type", "to" and "changeContext". ` +
  `"type" must be one of ${CONSENT_TYPES.join(", ")}. ` +
  `"to" must be one of ${DRAFT_STATES.join(", ")}. ` +
  `"changeContext" must be one of ${CONSENT_CHANGE_CONTEXTS.join(", ")}. ` +
  `Use emergency_contact only when the text explicitly concerns an emergency contact. ` +
  `The text may contain markers like ${NUMBER_REMOVED} or ${MEDICAL_REMOVED}; ignore them. ` +
  `If the intent is unclear, do not guess; return an empty object.`;

/**
 * The exact messages sent to the model. Exported so a test can inspect what
 * actually goes into the prompt. Contains no contact numbers or medical
 * details, and never the API key.
 */
export function buildDraftMessages(
  requestText: string,
): Array<{ role: "system" | "user"; content: string }> {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: sanitizeForPrompt(requestText) },
  ];
}

/** Plain-language summary written from validated fields only. */
export function summariseDraft(
  type: ConsentType,
  to: DraftState,
  changeContext: ConsentChangeContext,
): string {
  const verb = to === "granted" ? "Grant" : "Withdraw";
  const emergency = changeContext === "emergency_contact" ? " (emergency contact)" : "";
  return `${verb} ${type} consent${emergency}`;
}

/**
 * Accepts model output only if it is a known consent type, a known proposable
 * state and a known context, with no unexpected keys. Returns undefined for
 * anything else. A model-supplied "summary" is ignored, never trusted.
 */
export function validateDraftOutput(parsed: unknown): ConsentDraft | undefined {
  if (!isRecord(parsed)) return undefined;
  if (Object.keys(parsed).some((k) => !ALLOWED_KEYS.has(k))) return undefined;

  const { type, to } = parsed;
  if (typeof type !== "string" || !isConsentType(type)) return undefined;
  if (typeof to !== "string" || !(DRAFT_STATES as readonly string[]).includes(to)) {
    return undefined;
  }
  const rawContext = parsed.changeContext ?? "standard";
  if (
    typeof rawContext !== "string" ||
    !(CONSENT_CHANGE_CONTEXTS as readonly string[]).includes(rawContext)
  ) {
    return undefined;
  }
  const changeContext = rawContext as ConsentChangeContext;
  // Emergency contact only means something for Contact Details.
  if (changeContext === "emergency_contact" && type !== "Contact Details") {
    return undefined;
  }
  const state = to as DraftState;
  return { type, to: state, changeContext, summary: summariseDraft(type, state, changeContext) };
}

// ----------------------------------------------------------------- service

export class NvidiaDraftService {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly model = DEFAULT_MODEL,
    private readonly fetchImpl: typeof fetch = fetch,
    /**
     * OpenAI-compatible base URL. Defaults to the hosted NVIDIA API catalog;
     * point it at a self-hosted NIM container to run without the hosted
     * service. Must end without a trailing slash.
     */
    private readonly baseUrl: string = DEFAULT_BASE_URL,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  private get chatCompletionsUrl(): string {
    return `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  }

  async createDraft(requestText: string): Promise<ConsentDraft> {
    if (!this.apiKey) {
      throw new NvidiaDraftConfigurationError(
        "NIM_API_KEY is not configured on the server. Set it in the server environment and restart the app.",
      );
    }
    if (!requestText.trim() || requestText.length > 2000) {
      throw new NvidiaDraftRequestError(
        "Enter a request between 1 and 2000 characters.",
      );
    }

    let response: Response;
    // A ref'd timer, cleared in finally. AbortSignal.timeout() uses an unref'd
    // timer, which lets Node 22 exit before a hanging request is aborted.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      response = await this.fetchImpl(this.chatCompletionsUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.1,
          max_tokens: 300,
          // Thinking mode OFF: a short JSON answer needs no reasoning trace.
          chat_template_kwargs: { enable_thinking: false },
          messages: buildDraftMessages(requestText),
        }),
        signal: controller.signal,
      });
    } catch {
      // The caught error is dropped on purpose: a transport error can echo
      // request headers, and the key must not reach a log or the browser.
      throw new NvidiaDraftRequestError(
        "Could not reach NVIDIA NIM to create the draft.",
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new NvidiaDraftRequestError(
        `NVIDIA NIM returned HTTP ${response.status}.`,
        response.status,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new NvidiaDraftRequestError(
        "NVIDIA NIM returned an unreadable response.",
      );
    }
    const firstChoice =
      isRecord(body) && Array.isArray(body.choices) ? body.choices[0] : undefined;
    const message = isRecord(firstChoice) ? firstChoice.message : undefined;
    const content = isRecord(message) ? message.content : undefined;
    if (typeof content !== "string") {
      throw new NvidiaDraftRequestError(
        "NVIDIA NIM returned no usable draft text.",
      );
    }

    // From here on, anything that is not a valid draft is rejected and the
    // parent is asked to clarify. Nothing the model says is acted on.
    let parsed: unknown;
    try {
      parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      throw new NvidiaDraftUnclearError("The model output was not a valid draft.");
    }

    // The prompt tells the model to return `{}` rather than guess.
    if (isRecord(parsed) && Object.keys(parsed).length === 0) {
      throw new NvidiaDraftUnclearError(
        "The message was not clear enough to draft a request from.",
      );
    }

    const draft = validateDraftOutput(parsed);
    if (!draft) {
      throw new NvidiaDraftUnclearError(
        "The model output was not a known consent type and state.",
      );
    }
    return draft;
  }
}

export function createNvidiaDraftService(): NvidiaDraftService {
  const s = nimSettings();
  const timeout = Number(process.env.NIM_TIMEOUT_MS);
  return new NvidiaDraftService(
    s.apiKey,
    s.model,
    fetch,
    s.baseUrl,
    Number.isFinite(timeout) && timeout >= 1000 ? timeout : DEFAULT_TIMEOUT_MS,
  );
}

/**
 * Whether the server has a NIM key. The dashboard uses this to hide the draft
 * panel rather than offer a control that cannot work. The key itself is never
 * sent to the browser.
 */
export function isNvidiaDraftConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(nimSettings(env).apiKey);
}

/** The model id actually in use, for the audit entry. */
export function nvidiaModelId(
  env: Record<string, string | undefined> = process.env,
): string {
  return nimSettings(env).model;
}
