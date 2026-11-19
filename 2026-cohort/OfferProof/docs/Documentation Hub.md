# OfferProof — Documentation Hub

Welcome to the comprehensive technical documentation for **OfferProof**, an explainable, privacy-first job and internship offer verification platform.

---

## Documentation Index

| Section     | Document                                           | Description                                                                                  |
| ----------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **01**      | [Project Overview](./01-overview.md)               | What OfferProof is, problem statement, key features, and page routes                         |
| **02**      | [Technology Stack](./02-tech-stack.md)             | Complete list of frontend, backend, database, AI models, and testing tools                   |
| **03**      | [System Architecture](./03-architecture.md)        | High-level system architecture, component map, data flow, and Mermaid diagrams               |
| **04**      | [Working Workflow](./04-workflow.md)               | Step-by-step lifecycle of an offer: ingestion, session scoping, verification, and results    |
| **05**      | [Fraud Detection Rules](./05-fraud-detection.md)   | Complete reference of all 11 heuristic rules, negation handling, scoring, and severity       |
| **06**      | [AI Integration](./06-ai-integration.md)           | NVIDIA AI Edge Function, prompt design, structured parsing, and non-blocking state           |
| **07**      | [Database & APIs](./07-database-and-apis.md)       | Supabase PostgreSQL schema, RLS policies, Edge Functions, and BigQuery data flow             |
| **08**      | [Setup & Deployment](./08-setup-and-deployment.md) | Prerequisites, environment configuration, database migrations, running tests, and deployment |
| **09**      | [Security & Testing](./09-security-and-testing.md) | Data privacy, multi-user session isolation, 11 Vitest test suites, and troubleshooting       |
| **10**      | [Future Scope](./10-future-scope.md)               | Current boundaries, technical trade-offs, and enhancement roadmap                            |
| **11**      | [Application Sitemap & Routes](./11-sitemap.md)    | Complete route hierarchy, visual navigation diagram, route guards, and SEO sitemap           |
| **Roadmap** | [Development Phases & Roadmap](./roadmap.md)       | Project delivery phases, completed features, and upcoming milestone tracker                  |

---

## Search Engine Sitemap & Crawl Configuration

- **Search Engine XML Sitemap:** [`public/sitemap.xml`](../public/sitemap.xml)
- **Robots Policy:** [`public/robots.txt`](../public/robots.txt) (Disallows private authenticated dashboard paths like `/history`, `/compare`, `/reports/`)

---

## Exported Formats

- **Complete Word Document (`.docx`):** [`OfferProof_Documentation.docx`](./OfferProof_Documentation.docx)
  - A self-contained, beautifully formatted Microsoft Word document containing the entire documentation set, including tables, code snippets, architecture flows, sitemaps, and rule references.

---

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run all 64 automated tests across 11 test files
npm test

# Production build
npm run build
```
