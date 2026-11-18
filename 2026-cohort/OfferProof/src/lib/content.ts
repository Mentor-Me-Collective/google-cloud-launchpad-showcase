export interface Article {
  slug: string;
  title: string;
  category: string;
  summary: string;
  signs: string[];
  example: string;
}

export const ARTICLES: Article[] = [
  {
    slug: "fake-recruiters",
    title: "Fake recruiters on messaging apps",
    category: "Fake recruiters",
    summary:
      "Scammers pose as HR staff from well-known brands, usually on WhatsApp, Telegram or LinkedIn DMs, and move fast to an 'offer'.",
    signs: [
      "You were contacted without applying",
      "No video or in-person interview",
      "Recruiter uses a personal number or email",
      "Pressure to decide within hours",
    ],
    example:
      "Fictional example: \"Hi, I'm Neha from GlobalTech HR. You're shortlisted for a ₹45,000/month remote role. Reply YES on Telegram to receive your offer letter today.\"",
  },
  {
    slug: "payment-scams",
    title: "Registration, security and 'refundable' fees",
    category: "Payment scams",
    summary:
      "The most common fraud pattern: you're 'selected', then asked to pay for registration, documents, a laptop or a background check.",
    signs: [
      "Any fee to receive or accept an offer",
      "Promise that the fee is refundable",
      "Payment by UPI, gift card or crypto",
      "Payment to an individual's account",
    ],
    example:
      'Fictional example: "To confirm your seat, deposit a refundable security amount of ₹3,999 to the UPI ID below within 24 hours."',
  },
  {
    slug: "suspicious-domains",
    title: "Look-alike domains and suspicious links",
    category: "Suspicious domains",
    summary:
      "Scammers register domains like 'infosys-careers.co' or send shortened links to forms that harvest your data.",
    signs: [
      "Email domain differs from the company's site",
      "Extra words or hyphens in the domain",
      "Shortened links (bit.ly, tinyurl)",
      "Google Forms asking for ID and bank details",
    ],
    example:
      "Fictional example: offer sent from hr@amazon-jobs-india.xyz with a link to bit.ly/joinnow.",
  },
  {
    slug: "fraudulent-internships",
    title: "Fraudulent internships and 'certified' training",
    category: "Fraudulent internships",
    summary:
      "Unpaid or 'paid' internships that charge for training, certificates or a 'project kit' and never lead to real work.",
    signs: [
      "You must buy a course or certificate first",
      "Stipend promised only after paying",
      "Company has no verifiable office or website",
      "Vague role description",
    ],
    example:
      'Fictional example: "Internship confirmed! Pay ₹1,499 for your training kit and certificate. Stipend of ₹15,000 starts after completion."',
  },
];

export const FAQS = [
  {
    q: "Can OfferProof tell me if an offer is definitely real or fake?",
    a: "No. OfferProof looks for common warning signs and explains each one with evidence. A Low Concern result does not prove an offer is genuine, and a High Concern result does not prove fraud. Always verify with the company directly.",
  },
  {
    q: "Is the risk category a fraud probability?",
    a: "No. It is a simple rule-based heuristic that weighs the warning signs we found. It has not been scientifically validated as a probability of fraud.",
  },
  {
    q: "Can I compare multiple job offers?",
    a: "Yes! Log in to OfferProof to compare offers, review key differences, and make a more informed decision.",
  },
  {
    q: "What file types can I check?",
    a: "You can paste text, upload a PDF, or upload a JPG or PNG screenshot. Text is extracted in your browser, and you can review and edit it before analysis.",
  },
  {
    q: "Are my documents uploaded to a server?",
    a: "Text extraction (PDF.js, OCR) and heuristic analysis run in your browser — the offer file is never uploaded. If you request AI recommendations, offer text with emails and phone numbers redacted is sent to NVIDIA's inference API. Saving a report stores it to your account on Supabase.",
  },
  {
    q: "Should I ever pay a fee to get a job?",
    a: "Legitimate employers almost never ask candidates to pay for registration, training, equipment or background checks. Treat any such request as a serious warning sign.",
  },
  {
    q: "What should I do if I think I've been scammed?",
    a: "Stop all communication and payments, keep screenshots, contact your bank immediately if you paid, and report to your national cybercrime portal (in India, cybercrime.gov.in or helpline 1930).",
  },
  { q: "Is OfferProof free?", a: "Yes. Core verification works without any paid service." },
  {
    q: "How do I verify a recruiter myself?",
    a: "Find the company's official website independently, contact HR through the listed details, check the recruiter's profile history, and confirm the offer reference number.",
  },
];

export const CHECKLIST = [
  {
    group: "Company",
    items: [
      "Found the official website independently (not via a link in the offer)",
      "Company registration or listing is verifiable",
      "Office address exists on maps / official sources",
    ],
  },
  {
    group: "Recruiter",
    items: [
      "Email uses the company's own domain",
      "Recruiter has a credible, long-standing professional profile",
      "Confirmed the offer with HR via official contact details",
    ],
  },
  {
    group: "Salary & role",
    items: [
      "Salary is in line with similar roles and locations",
      "Role description is specific and matches what you applied for",
      "I had a genuine interview",
    ],
  },
  {
    group: "Payments & data",
    items: [
      "No fee, deposit or purchase is required",
      "No OTP, PIN, CVV or password was requested",
      "ID documents only go through an official HR portal",
    ],
  },
  {
    group: "Terms",
    items: [
      "Received a formal offer letter with terms",
      "Joining date, location and reporting manager are stated",
      "I had reasonable time to decide",
    ],
  },
];
