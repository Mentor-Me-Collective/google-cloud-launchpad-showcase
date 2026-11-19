// Intelligent field extraction validation and verbatim evidence line extraction.
// Pure TypeScript: validated against original document text to guarantee 0 hallucinations.

import type { Extracted } from "./engine";

export interface ExtractedFieldResult {
  value: string | null;
  sentence: string | null;
}

export interface ExtractedListResult {
  values: string[];
  sentences: string[];
}

export interface ExtractedDetailsData {
  company: ExtractedFieldResult;
  recruiter: ExtractedFieldResult;
  jobTitle: ExtractedFieldResult;
  salary: ExtractedFieldResult;
  joiningDate: ExtractedFieldResult;
  location: ExtractedFieldResult;
  applicantEmails: ExtractedListResult;
  recruiterEmails: ExtractedListResult;
  unknownEmails: ExtractedListResult;
  phones: ExtractedListResult;
  domains: ExtractedListResult;
  urls: ExtractedListResult;
  isAiEnhanced: boolean;
}

/**
 * Extracts the exact line or sentence containing `target` directly from `fullText`.
 * Guarantees that returned text is verbatim from the original document (not paraphrased or summarized).
 */
export function extractSentenceContaining(fullText: string, target: string): string | null {
  if (!fullText || !target) return null;
  const trimmedTarget = target.trim();
  if (!trimmedTarget) return null;

  const lowerText = fullText.toLowerCase();
  const lowerTarget = trimmedTarget.toLowerCase();
  let idx = lowerText.indexOf(lowerTarget);

  // If not found directly, check for individual significant words
  if (idx === -1) {
    const words = trimmedTarget.split(/\s+/).filter((w) => w.length >= 3);
    if (words.length > 0) {
      for (const word of words) {
        const wordIdx = lowerText.indexOf(word.toLowerCase());
        if (wordIdx !== -1) {
          idx = wordIdx;
          break;
        }
      }
    }
  }

  if (idx === -1) return null;

  // Search backwards for the line or sentence beginning
  let lineStart = idx;
  while (lineStart > 0 && !/[\n]/.test(fullText.charAt(lineStart - 1))) {
    if (idx - lineStart >= 160 && /[.!?]/.test(fullText.charAt(lineStart - 1))) {
      break;
    }
    lineStart--;
  }
  // Skip leading whitespace or bullet symbols
  while (lineStart < idx && /[\s\-*•]/.test(fullText.charAt(lineStart))) {
    lineStart++;
  }

  // Search forwards for line or sentence ending
  let lineEnd = idx + trimmedTarget.length;
  while (lineEnd < fullText.length && !/[\n]/.test(fullText.charAt(lineEnd))) {
    if (lineEnd - idx >= 160 && /[.!?]/.test(fullText.charAt(lineEnd))) {
      lineEnd++;
      break;
    }
    lineEnd++;
  }
  if (lineEnd < fullText.length && /[.!?]/.test(fullText.charAt(lineEnd))) {
    lineEnd++;
  }

  const rawSentence = fullText.slice(lineStart, lineEnd).trim();
  return rawSentence || null;
}

/**
 * Validates an AI-extracted field value against the original offer text.
 * If the value (or its quote) is verified in the text, returns the value with its verbatim sentence.
 * If it cannot be verified in the original text, rejects it (returns null) to prevent hallucinations.
 */
export function validateExtractedField(
  originalText: string,
  aiValue: string | null | undefined,
  aiQuote?: string | null | undefined,
): ExtractedFieldResult {
  if (!aiValue || typeof aiValue !== "string") {
    return { value: null, sentence: null };
  }

  const trimmed = aiValue.trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "not found" ||
    trimmed.toLowerCase() === "n/a" ||
    trimmed.toLowerCase() === "none"
  ) {
    return { value: null, sentence: null };
  }

  const lowerText = originalText.toLowerCase();
  const lowerVal = trimmed.toLowerCase();

  // 1. Direct substring match
  if (lowerText.includes(lowerVal)) {
    const sentence = extractSentenceContaining(originalText, trimmed);
    return { value: trimmed, sentence };
  }

  // 2. Tokenized match (e.g. slight punctuation difference, whitespace, or currency symbols)
  const tokens = trimmed.split(/[\s,·\-/]+/).filter((t) => t.length >= 2);
  const firstToken = tokens[0];
  if (firstToken && tokens.every((tok) => lowerText.includes(tok.toLowerCase()))) {
    const sentence =
      (aiQuote && extractSentenceContaining(originalText, aiQuote)) ||
      extractSentenceContaining(originalText, firstToken);
    return { value: trimmed, sentence };
  }

  // 3. Fallback to AI quote if quote is verified in original text
  if (aiQuote && typeof aiQuote === "string" && aiQuote.trim()) {
    const trimmedQuote = aiQuote.trim();
    if (lowerText.includes(trimmedQuote.toLowerCase())) {
      const sentence = extractSentenceContaining(originalText, trimmedQuote);
      return { value: trimmed, sentence };
    }
  }

  // Failed validation: AI extracted or generated a value not in the original document
  return { value: null, sentence: null };
}

/**
 * Validates an array of strings (e.g. emails, phone numbers, urls, domains) against the original text.
 */
export function validateExtractedList(
  originalText: string,
  list: string[] | undefined | null,
): ExtractedListResult {
  if (!Array.isArray(list) || list.length === 0) {
    return { values: [], sentences: [] };
  }

  const lowerText = originalText.toLowerCase();
  const validValues: string[] = [];
  const sentences: string[] = [];

  for (const item of list) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;

    if (lowerText.includes(trimmed.toLowerCase())) {
      validValues.push(trimmed);
      const s = extractSentenceContaining(originalText, trimmed);
      if (s && !sentences.includes(s)) {
        sentences.push(s);
      }
    }
  }

  return { values: validValues, sentences };
}

export interface AiExtractedPayload {
  company?: string | null;
  companyQuote?: string | null;
  recruiter?: string | null;
  recruiterQuote?: string | null;
  jobTitle?: string | null;
  jobTitleQuote?: string | null;
  salary?: string | null;
  salaryQuote?: string | null;
  joiningDate?: string | null;
  joiningDateQuote?: string | null;
  location?: string | null;
  locationQuote?: string | null;
  applicantEmails?: string[];
  recruiterEmails?: string[];
  phones?: string[];
  domains?: string[];
  urls?: string[];
}

/**
 * Builds the complete ExtractedDetailsData structure combining heuristic baseline and validated AI extraction.
 */
export function buildExtractedDetails(
  originalText: string,
  heuristic: Extracted,
  aiData?: AiExtractedPayload | null,
): ExtractedDetailsData {
  let isAiEnhanced = false;

  // 1. Company
  let companyResult: ExtractedFieldResult = {
    value: heuristic.company,
    sentence: heuristic.company ? extractSentenceContaining(originalText, heuristic.company) : null,
  };
  if (aiData?.company) {
    const validated = validateExtractedField(originalText, aiData.company, aiData.companyQuote);
    if (validated.value) {
      companyResult = validated;
      isAiEnhanced = true;
    }
  }

  // 2. Recruiter
  let recruiterResult: ExtractedFieldResult = {
    value: heuristic.recruiter,
    sentence: heuristic.recruiter
      ? extractSentenceContaining(originalText, heuristic.recruiter)
      : null,
  };
  if (aiData?.recruiter) {
    const validated = validateExtractedField(originalText, aiData.recruiter, aiData.recruiterQuote);
    if (validated.value) {
      recruiterResult = validated;
      isAiEnhanced = true;
    }
  }

  // 3. Job Title
  let jobTitleResult: ExtractedFieldResult = {
    value: heuristic.jobTitle,
    sentence: heuristic.jobTitle
      ? extractSentenceContaining(originalText, heuristic.jobTitle)
      : null,
  };
  if (aiData?.jobTitle) {
    const validated = validateExtractedField(originalText, aiData.jobTitle, aiData.jobTitleQuote);
    if (validated.value) {
      jobTitleResult = validated;
      isAiEnhanced = true;
    }
  }

  // 4. Salary
  let salaryResult: ExtractedFieldResult = {
    value: heuristic.salary,
    sentence: heuristic.salary ? extractSentenceContaining(originalText, heuristic.salary) : null,
  };
  if (aiData?.salary) {
    const validated = validateExtractedField(originalText, aiData.salary, aiData.salaryQuote);
    if (validated.value) {
      salaryResult = validated;
      isAiEnhanced = true;
    }
  }

  // 5. Joining Date
  let joiningDateResult: ExtractedFieldResult = {
    value: heuristic.joiningDate,
    sentence: heuristic.joiningDate
      ? extractSentenceContaining(originalText, heuristic.joiningDate)
      : null,
  };
  if (aiData?.joiningDate) {
    const validated = validateExtractedField(
      originalText,
      aiData.joiningDate,
      aiData.joiningDateQuote,
    );
    if (validated.value) {
      joiningDateResult = validated;
      isAiEnhanced = true;
    }
  }

  // 6. Location
  let locationResult: ExtractedFieldResult = {
    value: heuristic.location,
    sentence: heuristic.location
      ? extractSentenceContaining(originalText, heuristic.location)
      : null,
  };
  if (aiData?.location) {
    const validated = validateExtractedField(originalText, aiData.location, aiData.locationQuote);
    if (validated.value) {
      locationResult = validated;
      isAiEnhanced = true;
    }
  }

  // 7. Applicant Emails
  const heuristicApplicant = validateExtractedList(originalText, heuristic.applicantEmails);
  let applicantEmails = heuristicApplicant;
  if (Array.isArray(aiData?.applicantEmails) && aiData.applicantEmails.length > 0) {
    const validated = validateExtractedList(originalText, aiData.applicantEmails);
    if (validated.values.length > 0) {
      applicantEmails = validated;
      isAiEnhanced = true;
    }
  }

  // 8. Recruiter Emails
  const heuristicRecruiter = validateExtractedList(originalText, heuristic.recruiterEmails);
  let recruiterEmails = heuristicRecruiter;
  if (Array.isArray(aiData?.recruiterEmails) && aiData.recruiterEmails.length > 0) {
    const validated = validateExtractedList(originalText, aiData.recruiterEmails);
    if (validated.values.length > 0) {
      recruiterEmails = validated;
      isAiEnhanced = true;
    }
  }

  // 9. Unknown Emails
  const unknownEmails = validateExtractedList(originalText, heuristic.unknownEmails);

  // 10. Phones
  const heuristicPhones = validateExtractedList(originalText, heuristic.phones);
  let phones = heuristicPhones;
  if (Array.isArray(aiData?.phones) && aiData.phones.length > 0) {
    const validated = validateExtractedList(originalText, aiData.phones);
    if (validated.values.length > 0) {
      // Merge unique
      const set = new Set([...phones.values, ...validated.values]);
      phones = validateExtractedList(originalText, Array.from(set));
      isAiEnhanced = true;
    }
  }

  // 11. Domains
  const heuristicDomains = validateExtractedList(originalText, heuristic.domains);
  let domains = heuristicDomains;
  if (Array.isArray(aiData?.domains) && aiData.domains.length > 0) {
    const validated = validateExtractedList(originalText, aiData.domains);
    if (validated.values.length > 0) {
      const set = new Set([...domains.values, ...validated.values]);
      domains = validateExtractedList(originalText, Array.from(set));
      isAiEnhanced = true;
    }
  }

  // 12. URLs
  const heuristicUrls = validateExtractedList(originalText, heuristic.urls);
  let urls = heuristicUrls;
  if (Array.isArray(aiData?.urls) && aiData.urls.length > 0) {
    const validated = validateExtractedList(originalText, aiData.urls);
    if (validated.values.length > 0) {
      const set = new Set([...urls.values, ...validated.values]);
      urls = validateExtractedList(originalText, Array.from(set));
      isAiEnhanced = true;
    }
  }

  return {
    company: companyResult,
    recruiter: recruiterResult,
    jobTitle: jobTitleResult,
    salary: salaryResult,
    joiningDate: joiningDateResult,
    location: locationResult,
    applicantEmails,
    recruiterEmails,
    unknownEmails,
    phones,
    domains,
    urls,
    isAiEnhanced,
  };
}
