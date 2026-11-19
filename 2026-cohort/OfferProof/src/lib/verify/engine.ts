// Explainable, rule-based offer checks. Pure TypeScript: no React, no DOM.
// Results are heuristic signals, never a guarantee or a fraud probability.

export type Severity = "low" | "medium" | "high";
export type Assessment = "low_concern" | "needs_review" | "high_concern";

export interface Finding {
  id: string;
  name: string;
  severity: Severity;
  evidence: string[];
  explanation: string;
  action: string;
}

export interface Extracted {
  company: string | null;
  recruiter: string | null;
  jobTitle: string | null;
  salary: string | null;
  joiningDate: string | null;
  location: string | null;
  emails: string[];
  applicantEmails?: string[];
  recruiterEmails?: string[];
  unknownEmails?: string[];
  domains: string[];
  urls: string[];
  phones: string[];
}

export interface Report {
  assessment: Assessment;
  points: number;
  findings: Finding[];
  extracted: Extracted;
  phrases: string[];
}

const FREE_MAIL = [
  "gmail.com",
  "yahoo.com",
  "yahoo.in",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "rediffmail.com",
  "aol.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "yandex.com",
  "gmx.com",
];

const SHORTENERS = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "rb.gy",
  "cutt.ly",
  "is.gd",
  "shorturl.at",
  "tiny.cc",
];

const RISKY_TLDS = [
  ".xyz",
  ".top",
  ".click",
  ".buzz",
  ".work",
  ".live",
  ".icu",
  ".online",
  ".site",
  ".info",
];

function findAll(text: string, re: RegExp): string[] {
  const out = new Set<string>();

  for (const match of text.matchAll(re)) {
    out.add(match[0].trim());
  }

  return [...out];
}

function firstGroup(text: string, re: RegExp): string | null {
  const match = text.match(re);
  const value = match?.[1]?.trim().replace(/[.,;]+$/, "");

  return !value ||
    /^(?:not (?:found|provided|stated|specified|available)|n\/?a|unknown|tbd|to be (?:confirmed|discussed)|[-–—]+)$/i.test(
      value,
    )
    ? null
    : value;
}

const RECRUITER_PATTERN =
  /\b(?:recruiter(?:'s)?|recruitment(?:\s+team)?|talent\s+acquisition|hr\s+representative|hr\s+rep|hr\s+manager|hr\s+team|hr\s+department|human\s+resources|hr|hiring\s+contact|hiring\s+manager|hiring\s+team|contact\s+person|contact(?:\s+us)?|from|sender|sent\s+by)\b/i;

const APPLICANT_PATTERN =
  /\b(?:applicant(?:'s)?|candidate(?:'s)?|recipient(?:'s)?)\b|\b(?:sent\s+)?to(?:\s*[:-]|(?=\s+[A-Z0-9._%+-]+@))/i;

/** Attribute explicitly labelled addresses using surrounding context; ambiguous addresses remain unknown. */
export function classifyEmails(text: string, emails: string[]) {
  const roles = new Map<string, Set<"applicant" | "recruiter">>();
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const matches = [...text.matchAll(emailRegex)];

  for (const match of matches) {
    if (match.index === undefined) continue;

    const email = match[0].toLowerCase();
    const start = match.index;
    const end = start + match[0].length;

    const lineStart = text.lastIndexOf("\n", start) + 1;
    const nextNewline = text.indexOf("\n", end);
    const lineEnd = nextNewline === -1 ? text.length : nextNewline;

    const sameLineBefore = text.slice(lineStart, start);
    const sameLineAfter = text.slice(end, lineEnd);

    const prevEmailOnLine = [...sameLineBefore.matchAll(emailRegex)].at(-1);

    const effectiveBefore =
      prevEmailOnLine && prevEmailOnLine.index !== undefined
        ? sameLineBefore.slice(prevEmailOnLine.index + prevEmailOnLine[0].length)
        : sameLineBefore;

    const precedingLines: string[] = [];
    const linesBefore = text.slice(0, lineStart).split(/\r?\n/);

    for (let i = linesBefore.length - 2; i >= 0 && precedingLines.length < 3; i--) {
      const line = linesBefore[i] ?? "";

      if (line.trim() === "") break;
      if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line)) break;

      precedingLines.unshift(line);
    }

    const beforeContext = [...precedingLines, effectiveBefore].join("\n");

    type LabelMatch = {
      role: "applicant" | "recruiter";
      end: number;
    };

    const beforeLabels: LabelMatch[] = [];

    for (const label of beforeContext.matchAll(new RegExp(RECRUITER_PATTERN.source, "gi"))) {
      if (label.index !== undefined) {
        beforeLabels.push({
          role: "recruiter",
          end: label.index + label[0].length,
        });
      }
    }

    for (const label of beforeContext.matchAll(new RegExp(APPLICANT_PATTERN.source, "gi"))) {
      if (label.index !== undefined) {
        beforeLabels.push({
          role: "applicant",
          end: label.index + label[0].length,
        });
      }
    }

    let detectedRole: "applicant" | "recruiter" | null = null;

    if (beforeLabels.length > 0) {
      beforeLabels.sort((a, b) => a.end - b.end);
      detectedRole = beforeLabels.at(-1)?.role ?? null;
    } else {
      const nextEmailOnLine = sameLineAfter.match(emailRegex);

      const effectiveAfter =
        nextEmailOnLine && nextEmailOnLine.index !== undefined
          ? sameLineAfter.slice(0, nextEmailOnLine.index)
          : sameLineAfter;

      const followingLines: string[] = [];
      const linesAfter = text.slice(lineEnd).split(/\r?\n/);

      for (let i = 1; i < linesAfter.length && followingLines.length < 2; i++) {
        const line = linesAfter[i] ?? "";

        if (line.trim() === "") break;
        if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line)) break;

        followingLines.push(line);
      }

      const afterContext = [effectiveAfter, ...followingLines].join("\n");
      const afterLabels: {
        role: "applicant" | "recruiter";
        index: number;
      }[] = [];

      for (const label of afterContext.matchAll(new RegExp(RECRUITER_PATTERN.source, "gi"))) {
        if (label.index !== undefined) {
          afterLabels.push({
            role: "recruiter",
            index: label.index,
          });
        }
      }

      for (const label of afterContext.matchAll(new RegExp(APPLICANT_PATTERN.source, "gi"))) {
        if (label.index !== undefined) {
          afterLabels.push({
            role: "applicant",
            index: label.index,
          });
        }
      }

      if (afterLabels.length > 0) {
        afterLabels.sort((a, b) => a.index - b.index);
        detectedRole = afterLabels[0]?.role ?? null;
      }
    }

    if (detectedRole) {
      const set = roles.get(email) ?? new Set<"applicant" | "recruiter">();

      set.add(detectedRole);
      roles.set(email, set);
    }
  }

  const applicantEmails = emails.filter(
    (email) => roles.get(email)?.size === 1 && roles.get(email)?.has("applicant"),
  );

  const recruiterEmails = emails.filter(
    (email) => roles.get(email)?.size === 1 && roles.get(email)?.has("recruiter"),
  );

  const unknownEmails = emails.filter(
    (email) => !applicantEmails.includes(email) && !recruiterEmails.includes(email),
  );

  return { applicantEmails, recruiterEmails, unknownEmails };
}

export function extract(text: string): Extracted {
  const emails = findAll(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi).map((email) =>
    email.toLowerCase(),
  );

  const urls = findAll(text, /\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi).map((url) =>
    url.replace(/[.,;]+$/, ""),
  );

  const domains = new Set<string>();

  emails.forEach((email) => domains.add(email.split("@")[1] ?? ""));

  urls.forEach((url) => {
    const host = hostOf(url);
    if (host) domains.add(host);
  });

  return {
    company:
      firstGroup(
        text,
        /(?:company|organi[sz]ation|employer)\s*(?:name)?\s*[:-]\s*([^\n]{2,60})/i,
      ) ??
      firstGroup(
        text,
        /\b(?:at|join|with)\s+([A-Z][\w&.]*(?:\s+[A-Z][\w&.]*){0,3}\s+(?:Pvt\.?\s*Ltd\.?|Ltd\.?|Inc\.?|LLC|Technologies|Solutions|Corp(?:oration)?|Limited))/,
      ),
    recruiter: firstGroup(
      text,
      /(?:[Rr]egards|[Ss]incerely|[Rr]ecruiter|HR [Mm]anager|[Hh]iring [Mm]anager)\s*[,:-]?\s*\n?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
    ),
    jobTitle: firstGroup(
      text,
      /(?:position|role|designation|job title)\s*(?:of)?\s*[:-]?\s*([^\n,.]{2,60})/i,
    ),
    salary: firstGroup(
      text,
      /\b(?:salary|stipend|ctc|compensation|package|pay)\b\s*(?:of|is)?\s*[:-]?\s*((?:(?:₹|rs\.?|inr|\$|usd|£|€|gbp|eur)\s*)?\d[\d,]*(?:\.\d+)?(?:[ \t]*(?:inr|usd|gbp|eur))?(?:\s*(?:per\s+(?:year|annum|month|week|day|hour)|annual(?:ly)?|monthly|lpa))?[^\n;]{0,40})/i,
    ),
    joiningDate: firstGroup(
      text,
      /(?:joining date|start date|date of joining|report(?:ing)? on|commence on)\s*[:-]?\s*([^\n]{2,40})/i,
    ),
    location: firstGroup(
      text,
      /(?:location|work location|based in|office)\s*[:-]\s*([^\n]{2,50})/i,
    ),
    emails,
    ...classifyEmails(text, emails),
    domains: [...domains],
    urls,
    phones: findAll(
      text,
      /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)\d{3,5}[\s-]?\d{3,5}/g,
    ).filter((phone) => phone.replace(/\D/g, "").length >= 10),
  };
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return null;
  }
}

function rootDomain(host: string): string {
  const parts = host.split(".");

  if (
    parts.length > 2 &&
    ["co", "com", "org", "net", "ac", "gov"].includes(parts[parts.length - 2] ?? "")
  ) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

function matchPhrases(text: string, patterns: RegExp[]): string[] {
  const out = new Set<string>();

  for (const pattern of patterns) {
    const regex = new RegExp(
      pattern.source,
      pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
    );

    for (const match of text.matchAll(regex)) {
      out.add(match[0]);
    }
  }

  return [...out];
}

function paymentPhrases(text: string, patterns: RegExp[]): string[] {
  // Negation stays within its clause: a separate positive request must still be flagged.
  const clauses = text.split(/\n|[;!?]|\.(?=\s|$)|\b(?:but|however|instead)\b/i);

  return clauses.flatMap((clause) => {
    if (
      /\b(?:do(?:es)? not|don['’]t|never|not required to|no need to|will not|won['’]t)\b[^,]{0,60}\b(?:pay|deposit|transfer|send|forward)\b/i.test(
        clause,
      ) ||
      /\bno\s+(?:\w+\s+){0,3}(?:fees?|charges?|payments?)\b/i.test(clause) ||
      /\b(?:fees?|charges?|payments?)\s+(?:are\s+)?(?:not required|not payable|waived)\b/i.test(
        clause,
      ) ||
      /\b(?:employer|company|we)\s+(?:will\s+)?(?:pay|cover|bear)\b/i.test(clause)
    ) {
      return [];
    }

    return matchPhrases(clause, patterns);
  });
}

const FEE = [
  /\b(?:registration|security|processing|refundable|application|joining|verification|documentation|kit|uniform|deposit)\s+(?:fee|fees|charge|charges|amount|deposit)\b/i,
  /\bpay(?:ment)?\s+(?:of\s+)?(?:₹|rs\.?|inr|\$|usd)\s?[\d,]+/i,
  /\b(?:deposit|transfer|send)\s+(?:the\s+)?(?:amount|money|fee)/i,
  /\bpay\s+(?:a\s+|the\s+)?fees?\b/i,
  /\bmandatory\s+(?:processing|registration|activation|verification|employment)\s+(?:and\s+\w+\s+)?(?:fee|fees|charge|charges)\b/i,
];

const TRAINING = [
  /\b(?:training|onboarding|certification|laptop|equipment)\s+(?:fee|fees|cost|charges|payment)\b/i,
  /\bpay\s+for\s+(?:your\s+)?(?:training|laptop|certification)/i,
];

const URGENCY = [
  /\bwithin\s+(?:24|48|12|2|6)\s*(?:hours|hrs)\b/i,
  /\b(?:immediately|urgent(?:ly)?|asap|today itself|last chance|limited (?:seats|slots)|offer expires)\b/i,
  /\bfailing which\b/i,
  /\bdo not share (?:this|with anyone)\b/i,
  /\bwithin\s+(?:24|48|72|12|2|6)\s*(?:hours|hrs)\b/i,
];

const SENSITIVE = [
  /\b(?:aadhaar|aadhar|pan card|passport|ssn|social security)(?:\s+(?:number|copy|card))?\b/i,
  /\b(?:bank account (?:number|details)|account number|ifsc|cvv|debit card|credit card|otp|upi pin|net ?banking password|password|pin)\b/i,
];

const UNREALISTIC = [
  /\b(?:earn|salary of|make)\s+(?:₹|rs\.?|\$)?\s?[\d,]+\s*(?:per day|\/day|daily|a day)\b/i,
  /\bno (?:experience|interview|qualification)s? (?:required|needed)\b/i,
  /\b(?:work from home|part[- ]time)\b.*\b(?:₹|rs\.?|\$)\s?[\d,]{5,}/i,
  /\bguaranteed (?:income|salary|placement|job)\b/i,
];

export function analyze(text: string): Report {
  const t = text.replace(/\r/g, "");
  const x = extract(t);
  const findings: Finding[] = [];

  const fee = paymentPhrases(t, FEE);

  if (fee.length) {
    findings.push({
      id: "payment_request",
      name: "Payment or fee requested",
      severity: "high",
      evidence: fee,
      explanation:
        "Legitimate employers almost never ask candidates to pay registration, security or processing fees to receive or accept an offer.",
      action:
        "Do not pay. Contact the company through the phone or email listed on its official website and ask whether this fee is real.",
    });
  }

  const training = paymentPhrases(t, TRAINING);

  if (training.length) {
    findings.push({
      id: "training_payment",
      name: "Training or equipment payment",
      severity: "high",
      evidence: training,
      explanation:
        "Asking new hires to pay for training, certification or a laptop is a common pattern in fake internships and job scams.",
      action:
        "Ask for the company's written policy on training costs and confirm it with HR via an official channel before paying anything.",
    });
  }

  const chequeDeposit = paymentPhrases(t, [
    /\b(?:deposit|cash)\s+(?:(?:this|the|a|your)\s+)?(?:cheque|check)\b/i,
  ]);

  const forwardMoney = paymentPhrases(t, [
    /\b(?:forward|send|transfer|wire)\s+(?:(?:the|remaining|remaining balance|some|excess)\s+)?(?:money|funds|balance|payment)\b[^\n.!?]{0,100}\b(?:vendor|supplier|third[- ]party)\b/i,
  ]);

  if (chequeDeposit.length && forwardMoney.length) {
    findings.push({
      id: "cheque_fraud",
      name: "Potential cheque fraud",
      severity: "high",
      evidence: [...chequeDeposit, ...forwardMoney],
      explanation:
        "A request to deposit a cheque and forward funds to a vendor is a fake-cheque scam pattern. Funds may appear available before the bank discovers the cheque is invalid; this is a warning, not proof of fraud.",
      action:
        "Do not forward funds. Ask your bank to investigate the cheque and verify the request independently with the employer.",
    });
  }

  const urgency = matchPhrases(t, URGENCY);

  if (urgency.length) {
    findings.push({
      id: "urgency",
      name: "Pressure or urgency language",
      severity: urgency.length >= 2 ? "medium" : "low",
      evidence: urgency,
      explanation:
        "Tight deadlines and secrecy discourage you from checking the offer. Real employers usually give reasonable time to decide.",
      action:
        "Take the time you need. Ask for a deadline extension; a genuine recruiter will rarely refuse.",
    });
  }

  // Updated sensitive-information severity classification.
  const sensitive = matchPhrases(t, SENSITIVE);

  const highRiskSensitive = sensitive.filter((phrase) =>
    /\b(?:otp|cvv|upi pin|pin|password|net ?banking password|debit card|credit card|bank account details)\b/i.test(
      phrase,
    ),
  );

  if (sensitive.length) {
    findings.push({
      id: "sensitive_info",
      name: "Sensitive information requested",
      severity: highRiskSensitive.length > 0 ? "high" : "medium",
      evidence: sensitive,
      explanation:
        "Requests for identity documents or financial information can carry privacy and fraud risks. Passwords, OTPs, PINs, and CVVs should never be shared with recruiters.",
      action:
        "Never share OTPs, PINs, CVVs, or passwords. Verify the employer independently before submitting identity documents, and use an official, secure HR channel.",
    });
  }

  const unreal = matchPhrases(t, UNREALISTIC);

  if (unreal.length) {
    findings.push({
      id: "unrealistic_pay",
      name: "Unrealistic promises",
      severity: "medium",
      evidence: unreal,
      explanation:
        "High pay for little work, guaranteed income or 'no interview required' claims are typical of bait offers.",
      action:
        "Compare the salary with published ranges for the same role and city on trusted job sites.",
    });
  }

  const senderEmails = x.recruiterEmails ?? [];
  const freeMail = senderEmails.filter((email) => FREE_MAIL.includes(email.split("@")[1] ?? ""));

  if (freeMail.length) {
    findings.push({
      id: "personal_email",
      name: "Recruiter uses a personal email",
      severity: "medium",
      evidence: freeMail,
      explanation:
        "Established companies usually recruit from their own domain (e.g. name@company.com), not from free email services.",
      action:
        "Find the company's official careers or HR email on its website and forward the offer there to confirm it.",
    });
  }

  const employerDomains = [
    ...senderEmails.map((email) => email.split("@")[1] ?? ""),
    ...x.urls.map(hostOf).filter((domain): domain is string => !!domain),
  ];

  const corpDomains = [
    ...new Set(
      employerDomains
        .filter((domain) => !FREE_MAIL.includes(domain) && !SHORTENERS.includes(domain))
        .map(rootDomain),
    ),
  ];

  if (x.company && corpDomains.length) {
    const key = x.company
      .toLowerCase()
      .replace(/(pvt|ltd|inc|llc|technologies|solutions|limited|corp(oration)?|[^a-z])/g, "");

    const mismatched = corpDomains.filter(
      (domain) =>
        key.length >= 3 &&
        !domain.replace(/[^a-z]/g, "").includes(key.slice(0, Math.min(5, key.length))),
    );

    if (mismatched.length && mismatched.length === corpDomains.length) {
      findings.push({
        id: "domain_mismatch",
        name: "Company and domain don't match",
        severity: "medium",
        evidence: [`Company: ${x.company}`, ...mismatched.map((domain) => `Domain: ${domain}`)],
        explanation:
          "The email or website domain does not resemble the company name. Scammers often use look-alike or unrelated domains.",
        action:
          "Search for the company's official website independently and compare its domain with the one in this offer.",
      });
    }
  }

  if (
    corpDomains.length > 1 &&
    new Set(senderEmails.map((email) => rootDomain(email.split("@")[1] ?? ""))).size > 1
  ) {
    findings.push({
      id: "multiple_domains",
      name: "Multiple sender domains",
      severity: "low",
      evidence: senderEmails,
      explanation:
        "The offer mentions emails from more than one domain, which can indicate an inconsistent or copied document.",
      action: "Confirm which domain the company actually uses.",
    });
  }

  const badLinks = x.urls.filter((url) => {
    const host = hostOf(url) ?? "";

    return (
      SHORTENERS.includes(host) ||
      RISKY_TLDS.some((tld) => host.endsWith(tld)) ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
      url.startsWith("http://") ||
      /(forms\.gle|docs\.google\.com\/forms|wa\.me|t\.me)/.test(url)
    );
  });

  if (badLinks.length) {
    findings.push({
      id: "suspicious_links",
      name: "Suspicious links",
      severity: "medium",
      evidence: badLinks,
      explanation:
        "Shortened links, unencrypted links, messaging links or unusual domain endings hide where you are being sent.",
      action:
        "Don't enter personal or payment details through these links. Navigate to the company's site by typing its address yourself.",
    });
  }

  const missing: string[] = [];

  if (!x.company) missing.push("Company name");
  if (!x.jobTitle) missing.push("Job title");
  if (!x.salary) missing.push("Salary / stipend");
  if (!x.location) missing.push("Work location");

  if (!x.emails.length && !x.phones.length) {
    missing.push("Contact details");
  }

  if (missing.length >= 2) {
    findings.push({
      id: "missing_details",
      name: "Missing key details",
      severity: missing.length >= 4 ? "medium" : "low",
      evidence: missing.map((detail) => `Not found: ${detail}`),
      explanation:
        "Formal offers normally state the employer, role, pay, location and contact details. Vague offers are harder to verify.",
      action:
        "Ask the recruiter for a formal offer letter that includes these details on company letterhead.",
    });
  }

  const weight = { low: 1, medium: 3, high: 6 } as const;
  const points = findings.reduce((s, f) => s + weight[f.severity], 0);

  const assessment: Assessment =
    findings.some((f) => f.severity === "high") || points >= 8
      ? "high_concern"
      : findings.length >= 2
        ? "needs_review"
        : "low_concern";

  const phrases = [
    ...new Set(
      findings
        .filter((f) => !["missing_details", "domain_mismatch"].includes(f.id))
        .flatMap((f) => f.evidence),
    ),
  ];

  return { assessment, points, findings, extracted: x, phrases };
}

export const ASSESSMENT_META: Record<Assessment, { label: string; summary: string }> = {
  low_concern: {
    label: "Low Concern",
    summary:
      "We found few or no common warning signs. This does not prove the offer is genuine; still verify independently.",
  },
  needs_review: {
    label: "Needs Review",
    summary:
      "Some warning signs appeared. Verify the details below with the company before you proceed.",
  },
  high_concern: {
    label: "High Concern",
    summary:
      "Several or serious warning signs appeared. Do not pay or share sensitive data until you have verified the employer.",
  },
};
