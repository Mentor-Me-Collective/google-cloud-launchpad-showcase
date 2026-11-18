# Future Scope & Limitations

---

## Current Limitations

While OfferProof offers robust, explainable heuristic checks and privacy-first verification, the following technical and architectural boundaries currently exist:

### 1. English-Language Focus

- Regex heuristics, OCR models (`tesseract.js` default `"eng"`), and AI system prompts are optimised for English offer letters and recruitment emails.
- Non-English offers or bilingual mixed-script communications (e.g., Hindi/Hinglish, Spanish) may not trigger rules accurately.

### 2. Client-Side OCR Performance & Resource Footprint

- In-browser OCR using `tesseract.js` downloads WASM binaries and language traineddata on initial use (~15–20 MB).
- Complex multi-column image layouts, low-resolution phone photos, or handwritten signatures may yield fragmented text.

### 3. Static Domain Matching Heuristic

- The `domain_mismatch` rule checks if the first 5 characters of the company name match the domain.
- Companies with non-intuitive domain names (e.g., parent companies, acronyms, or rebrands) may occasionally produce low-severity false positives that require manual user verification.

### 4. Non-Persistent Guest Reports

- Verification runs for guest users are stored exclusively in temporary `sessionStorage`.
- Closing the browser tab without creating an account or saving to the pending queue discards the report.

### 5. AI Recommendations Latency

- The NVIDIA model call relies on an external Edge Function and third-party inference endpoint, taking 2 to 6 seconds depending on network conditions.

---

## Roadmap & Potential Enhancements

### 1. Multilingual Support

- Incorporate multi-language heuristics and multilingual OCR language packs (Hindi, Spanish, German, French).
- Localise the UI and Scam Awareness Centre guides for international job seekers.

### 2. Live DNS & Domain Age Checks

- Add an Edge Function to query WHOIS / RDAP records in real time.
- Flag recently registered domains (< 30 days old) that impersonate known multinational corporations.

### 3. Community Scam Reporting & Blacklist Verification

- Allow authenticated users to report verified scam phone numbers, UPI IDs, and fraudulent recruiter emails to a crowd-sourced repository.
- Cross-reference extracted contact information against known scam databases and verified corporate registries.

### 4. Direct Email (.eml) & Header Inspection

- Add parsing for RFC 822 email files (`.eml`).
- Inspect DKIM, SPF, and DMARC alignment headers to catch email spoofing where a scammer fakes a legitimate `@company.com` header address.

### 5. Automated PDF Certificate / Signature Verification

- Inspect digital signatures (X.509 certificates) embedded in PDF offer letters to verify corporate issuer identities cryptographically.

### 6. Mobile Application (PWA / React Native)

- Package OfferProof as a Progressive Web App (PWA) with offline heuristic checking.
- Enable direct "Share to OfferProof" mobile intents from messaging apps (WhatsApp, Telegram, Gmail).
