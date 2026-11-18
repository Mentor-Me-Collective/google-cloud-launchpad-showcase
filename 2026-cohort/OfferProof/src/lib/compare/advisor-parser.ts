export interface CompareAdvisorSections {
  bestCareerFit: string[];
  prosAndCons: string[];
  salaryAndGrowth: string[];
  missingAndQuestions: string[];
  personalizedRecommendations: string[];
  summaryIntro?: string;
}

export function parseCompareAdvisorRecommendations(raw: string): CompareAdvisorSections {
  const lines = raw.split("\n");
  const result: CompareAdvisorSections = {
    bestCareerFit: [],
    prosAndCons: [],
    salaryAndGrowth: [],
    missingAndQuestions: [],
    personalizedRecommendations: [],
  };

  type SectionKey =
    | "bestCareerFit"
    | "prosAndCons"
    | "salaryAndGrowth"
    | "missingAndQuestions"
    | "personalizedRecommendations"
    | "none";

  let currentSection: SectionKey = "none";
  const introLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect Best Career Fit heading
    if (
      /^(?:#+\s*|\*{1,2}\s*|\d+[.)]\s*)?best\s+career\s+fit(?::|\*{1,2})?$/i.test(line) ||
      (/best\s+career\s+fit/i.test(line) &&
        line.length < 50 &&
        (line.startsWith("#") || line.startsWith("*") || line.endsWith(":")))
    ) {
      currentSection = "bestCareerFit";
      continue;
    }

    // Detect Comparison Summary / Pros & Cons heading
    if (
      /^(?:#+\s*|\*{1,2}\s*|\d+[.)]\s*)?(?:comparison\s+summary|pros\s+(?:and|&)\s+cons|summary\s+(?:and|&)\s+pros)(?::|\*{1,2})?$/i.test(
        line,
      ) ||
      (/(?:comparison\s+summary|pros\s+(?:and|&)\s+cons)/i.test(line) &&
        line.length < 60 &&
        (line.startsWith("#") || line.startsWith("*") || line.endsWith(":")))
    ) {
      currentSection = "prosAndCons";
      continue;
    }

    // Detect Salary & Career Growth Insights heading
    if (
      /^(?:#+\s*|\*{1,2}\s*|\d+[.)]\s*)?(?:salary\s+(?:and|&)\s+career\s+growth|salary\s+insights|career\s+growth\s+insights)(?::|\*{1,2})?$/i.test(
        line,
      ) ||
      (/(?:salary\s+(?:and|&)\s+career\s+growth|salary\s+insights)/i.test(line) &&
        line.length < 60 &&
        (line.startsWith("#") || line.startsWith("*") || line.endsWith(":")))
    ) {
      currentSection = "salaryAndGrowth";
      continue;
    }

    // Detect Missing Information & Recruiter Questions heading
    if (
      /^(?:#+\s*|\*{1,2}\s*|\d+[.)]\s*)?(?:missing\s+information|questions\s+to\s+ask|recruiter\s+questions)(?::|\*{1,2})?$/i.test(
        line,
      ) ||
      (/(?:missing\s+information|questions\s+to\s+ask|recruiter\s+questions)/i.test(line) &&
        line.length < 60 &&
        (line.startsWith("#") || line.startsWith("*") || line.endsWith(":")))
    ) {
      currentSection = "missingAndQuestions";
      continue;
    }

    // Detect Personalized Recommendations heading
    if (
      /^(?:#+\s*|\*{1,2}\s*|\d+[.)]\s*)?(?:personalized|personalised|final)?\s*recommendations(?::|\*{1,2})?$/i.test(
        line,
      ) ||
      (/(?:personalized|personalised)\s+recommendations/i.test(line) &&
        line.length < 60 &&
        (line.startsWith("#") || line.startsWith("*") || line.endsWith(":")))
    ) {
      currentSection = "personalizedRecommendations";
      continue;
    }

    // Clean bullet markers: "- ", "* ", "1. ", "• "
    const cleaned = line
      .replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, "")
      .replace(/^\*{1,2}|\*{1,2}$/g, "")
      .trim();
    if (!cleaned) continue;

    if (currentSection === "bestCareerFit") {
      result.bestCareerFit.push(cleaned);
    } else if (currentSection === "prosAndCons") {
      result.prosAndCons.push(cleaned);
    } else if (currentSection === "salaryAndGrowth") {
      result.salaryAndGrowth.push(cleaned);
    } else if (currentSection === "missingAndQuestions") {
      result.missingAndQuestions.push(cleaned);
    } else if (currentSection === "personalizedRecommendations") {
      result.personalizedRecommendations.push(cleaned);
    } else {
      introLines.push(cleaned);
    }
  }

  // Fallback: if no section headers were found in raw text
  if (
    result.bestCareerFit.length === 0 &&
    result.prosAndCons.length === 0 &&
    result.salaryAndGrowth.length === 0 &&
    result.missingAndQuestions.length === 0 &&
    result.personalizedRecommendations.length === 0
  ) {
    for (const item of introLines) {
      const lower = item.toLowerCase();
      if (/\b(?:best|fit|top\s+pick|winner|highest\s+alignment)\b/i.test(lower)) {
        result.bestCareerFit.push(item);
      } else if (/\b(?:pros?|cons?|advantages?|disadvantages?|trade-?offs?)\b/i.test(lower)) {
        result.prosAndCons.push(item);
      } else if (/\b(?:salary|compensation|growth|trajectory|ctc|equity|pay)\b/i.test(lower)) {
        result.salaryAndGrowth.push(item);
      } else if (/\b(?:ask|questions?|missing|unclear|inquire|recruiter)\b/i.test(lower)) {
        result.missingAndQuestions.push(item);
      } else {
        result.personalizedRecommendations.push(item);
      }
    }
  } else if (introLines.length > 0) {
    result.summaryIntro = introLines.join(" ");
  }

  return result;
}
