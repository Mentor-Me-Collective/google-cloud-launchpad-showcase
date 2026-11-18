# Fraud Detection Rules

All rules live in [`src/lib/verify/engine.ts`](../src/lib/verify/engine.ts). They are implemented as regular-expression pattern matches on the offer text. The engine is **pure TypeScript** with no dependencies — no server call, no machine learning.

> **Important:** Results are heuristic signals, not proof of fraud. Each finding includes the exact evidence that triggered it.

---

## Scoring System

| Severity | Points |
| -------- | ------ |
| `low`    | 1      |
| `medium` | 3      |
| `high`   | 6      |

**Assessment thresholds:**

- **High Concern** — any `high` severity finding, OR total points ≥ 8
- **Needs Review** — total points ≥ 3
- **Low Concern** — total points < 3

---

## Negation Handling

Payment-related rules use `paymentPhrases()`, which splits the text into clauses (by newlines, punctuation and conjunctions like "but", "however") and **skips clauses that contain explicit negation**:

```
"do not pay", "don't", "never", "not required to pay", "no fees"
"fees are not required", "employer will cover", "company will pay"
```

This prevents false positives from sentences like _"You will not be required to pay any registration fee."_

---

## Rule Reference

### 1. Payment or Fee Requested

**ID:** `payment_request`  
**Severity:** High

Detects any explicit request to pay a fee before or after joining.

| Pattern                                                                            | Example match                                   |
| ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| `registration/security/processing/refundable/application/joining/verification fee` | "pay a refundable registration fee of Rs 2,999" |
| `payment of ₹/Rs/INR/$USD [amount]`                                                | "payment of ₹500"                               |
| `deposit/transfer/send the amount/money/fee`                                       | "deposit the amount"                            |
| `pay a fees`                                                                       | "pay a fees"                                    |

**Explanation:** Legitimate employers almost never ask candidates to pay any fee to receive or accept an offer.

**Action:** Do not pay. Contact the company via its official website and ask whether the fee is real.

---

### 2. Training or Equipment Payment

**ID:** `training_payment`  
**Severity:** High

Detects requests to pay for training, certification or equipment as part of onboarding.

| Pattern                                                               | Example match            |
| --------------------------------------------------------------------- | ------------------------ |
| `training/onboarding/certification/laptop/equipment fee/cost/charges` | "training fee of ₹3,000" |
| `pay for your training/laptop/certification`                          | "pay for your laptop"    |

**Explanation:** Asking new hires to fund their own onboarding materials is a common fake-internship pattern.

**Action:** Ask for the company's written policy on training costs and confirm it via official channels.

---

### 3. Potential Cheque Fraud

**ID:** `cheque_fraud`  
**Severity:** High

Requires **both** of the following patterns in the same offer:

- **Cheque deposit**: `deposit/cash this cheque`
- **Forward funds**: `forward/send/transfer/wire money/funds/balance to vendor/supplier/third-party`

**Explanation:** The classic fake-cheque scam pattern — a fraudulent cheque is sent, funds appear available temporarily, the victim forwards money to a "vendor", and the cheque later bounces.

**Action:** Do not forward funds. Ask your bank to investigate the cheque.

---

### 4. Pressure or Urgency Language

**ID:** `urgency`  
**Severity:** Low (1 match) or Medium (2+ matches)

| Pattern                                               | Example match                               |
| ----------------------------------------------------- | ------------------------------------------- |
| `within 24/48/12/2/6 hours`                           | "reply within 24 hours"                     |
| `immediately`, `urgently`, `ASAP`, `today itself`     | "confirm immediately"                       |
| `last chance`, `limited seats/slots`, `offer expires` | "limited seats available"                   |
| `failing which`                                       | "failing which the offer will be withdrawn" |
| `do not share this/with anyone`                       | "do not share this with anyone"             |

**Explanation:** Tight deadlines and secrecy discourage verification. Real employers give reasonable time to decide.

**Action:** Take the time you need. Ask for a deadline extension.

---

### 5. Sensitive Information Requested

**ID:** `sensitive_info`  
**Severity:** High (OTP/PIN/password/card) or Medium (ID documents/bank account)

| Pattern                                                 | Example match                                |
| ------------------------------------------------------- | -------------------------------------------- |
| `Aadhaar/Aadhar/PAN card/passport/SSN`                  | "share your Aadhaar card"                    |
| `bank account number/details`, `account number`, `IFSC` | "bank account details for salary processing" |
| `CVV`, `debit card`, `credit card`                      | "debit card number"                          |
| `OTP`, `UPI PIN`, `net banking password`                | "share your OTP"                             |

The severity is elevated to `high` if the matched term includes OTP, PIN, CVV or passwords — credentials that enable immediate financial fraud.

**Explanation:** ID documents can be misused; OTPs and PINs should never be shared.

**Action:** Share IDs only after verifying the employer, through their official HR portal only.

---

### 6. Unrealistic Promises

**ID:** `unrealistic_pay`  
**Severity:** Medium

| Pattern                                           | Example match                        |
| ------------------------------------------------- | ------------------------------------ |
| `earn/salary of/make [₹/$][amount] per day/daily` | "earn ₹5,000 per day"                |
| `no experience/interview/qualifications required` | "no experience required"             |
| `work from home/part-time` + large salary         | "work from home — ₹45,000 per month" |
| `guaranteed income/salary/placement/job`          | "guaranteed placement"               |

**Explanation:** High pay for little work and guaranteed outcomes are typical bait for scam offers.

**Action:** Compare the salary with published ranges on trusted job sites for the same role and city.

---

### 7. Recruiter Uses a Personal Email

**ID:** `personal_email`  
**Severity:** Medium

Triggered when any **recruiter-attributed** email address (not applicant's) uses a free email provider.

**Free email list checked:**
`gmail.com`, `yahoo.com`, `yahoo.in`, `outlook.com`, `hotmail.com`, `live.com`, `rediffmail.com`, `aol.com`, `icloud.com`, `proton.me`, `protonmail.com`, `mail.com`, `yandex.com`, `gmx.com`

**How recruiter emails are identified:** The engine scans the text around each email address looking for recruiter role keywords (`recruiter`, `HR manager`, `hiring manager`, `talent acquisition`, `from`, `sender`, `sent by`, etc.) and applicant keywords (`applicant`, `candidate`, `to:`). The closest preceding or following keyword determines the role.

**Explanation:** Established companies recruit from their own domain, not free services.

**Action:** Find the company's official HR email on its website and forward the offer there.

---

### 8. Company and Domain Don't Match

**ID:** `domain_mismatch`  
**Severity:** Medium

Triggered when:

1. A company name was extracted.
2. One or more corporate domains are present (from non-free-email sender addresses or URLs).
3. **None** of those domains contain a substring of the company name (first 5 characters, lowercase, letters only).

**Example:**

- Company: `Acme Global Solutions`
- Domain: `acmeglobal-careers.net`
- Key: `acmeg` → `acmeglobal-careers.net` → does not contain `acmeg` as a letter-only substring after stripping hyphens → **mismatch flagged**

**Explanation:** Scammers use look-alike or unrelated domains to impersonate companies.

**Action:** Search for the company's official website independently and compare domains.

---

### 9. Multiple Sender Domains

**ID:** `multiple_domains`  
**Severity:** Low

Triggered when the recruiter-attributed emails in the offer use **more than one root domain**.

**Example:** `hr@acmecorp.com` and `recruiter@acme-jobs.net` both appear as sender addresses.

**Explanation:** Inconsistent domains can indicate a copied or inconsistently assembled fraudulent document.

**Action:** Confirm which domain the company actually uses.

---

### 10. Suspicious Links

**ID:** `suspicious_links`  
**Severity:** Medium

A URL is flagged if any of the following are true:

| Condition                | Risky TLDs checked                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| Uses a URL shortener     | `bit.ly`, `tinyurl.com`, `t.co`, `goo.gl`, `rb.gy`, `cutt.ly`, `is.gd`, `shorturl.at`, `tiny.cc` |
| Uses a risky TLD         | `.xyz`, `.top`, `.click`, `.buzz`, `.work`, `.live`, `.icu`, `.online`, `.site`, `.info`         |
| Is a bare IP address     | e.g. `http://192.168.1.1/apply`                                                                  |
| Uses unencrypted HTTP    | `http://...`                                                                                     |
| Is a form/messaging link | `forms.gle`, `docs.google.com/forms`, `wa.me`, `t.me`                                            |

**Explanation:** These link types hide the true destination or are frequently used in phishing.

**Action:** Don't enter personal or payment details through these links.

---

### 11. Missing Key Details

**ID:** `missing_details`  
**Severity:** Low (2–3 missing) or Medium (4+ missing)

Checks whether the offer contains all five of: company name, job title, salary/stipend, work location, and contact details (email or phone).

Triggered when **2 or more** are absent.

**Explanation:** Formal offers normally state all these details. Vague offers are harder to verify and may be placeholders for a scam.

**Action:** Ask the recruiter for a formal offer on company letterhead that includes all these details.

---

## Email Classification Algorithm

The engine classifies every email address in the offer as one of:

- **Recruiter email** — explicitly labelled with recruiter context
- **Applicant email** — explicitly labelled with applicant context (e.g., appears after "To:", "sent to")
- **Unknown** — no clear label found

**Algorithm:**

1. For each email match, extract the same-line text before the address and up to 3 preceding non-empty, non-email lines as "before context".
2. Search that context for recruiter keywords (`RECRUITER_PATTERN`) and applicant keywords (`APPLICANT_PATTERN`), tracking position.
3. The last keyword match in the before-context determines the role.
4. If no before-context match, search the same-line text after the address and up to 2 following lines.
5. The first keyword match in the after-context determines the role.
6. Ambiguous addresses (matched as both roles) remain unknown.

Only recruiter-attributed emails are checked for personal email domains (Rule 7) and domain mismatches (Rule 8).
