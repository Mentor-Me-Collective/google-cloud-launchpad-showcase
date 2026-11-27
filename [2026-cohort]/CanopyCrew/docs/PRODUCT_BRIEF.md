# 🌿 CanopyCrew — Product Brief

| Field | Detail |
| :--- | :--- |
| **Project** | CanopyCrew |
| **Program** | Mentor Me Collective × Google Cloud Launchpad BUILD |
| **SDG Alignment** | SDG 11 — Sustainable Cities and Communities, Target 11.7 |
| **Author** | Barbara Mulu \| Product Narrative Lead \| AI Cloud Leader |
| **Technical Contributors** | Alice Gonçalves (Cloud Engineering), Laurine Nzuki (AI Research / Frontend), Idris Belgore (Cloud Cybersecurity) |
| **MVP Scope** | Four weeks \| São Paulo, Brazil |

---

## The Problem, Our Purpose, and Our User

### 1. The Opportunity
Imagine a group of neighbors in São Paulo who want to turn a neglected urban space into a thriving green area. They have enthusiasm, willing volunteers, and a shared vision—but where do they begin? Which plants are suitable? Will roots damage pavement or hit electrical wires? What will it cost, and who will care for the space after planting day?

**Problem Statement:** Community volunteers often lack a single, accessible resource that translates local ecological information into suitable planting choices, realistic project estimates, and manageable long-term care activities.

CanopyCrew is an AI-assisted urban greening planning platform that helps community volunteers identify suitable native plants, understand potential costs and environmental benefits, and organize ongoing maintenance—making community greening more accessible, informed, and sustainable, beginning with a focused pilot in São Paulo, Brazil.

### 2. Meet Our User: Lucas, the Saturday Volunteer
Lucas is a fictional 32-year-old neighborhood volunteer coordinator in Pinheiros, São Paulo, working with neighbors to transform an underused 35 m² urban space into a greener environment. Motivated but not a botanist or landscape designer, he needs reliable guidance without becoming an expert:
* **Plant selection:** Understanding which native species suit the space, sunlight, soil, and nearby infrastructure.
* **Budget planning:** Estimating what the planting initiative might require financially.
* **Practical implementation:** Translating botanical information into an understandable planting plan.
* **Long-term maintenance:** Keeping volunteers engaged in caring for plants beyond the initial planting activity.

Lucas is an illustrative design persona; therefore, the assumptions underlying his needs will be tested through user feedback.

### 3. Our Value Proposition
CanopyCrew turns the desire to green a neighborhood into a practical, informed planting plan by connecting site characteristics to relevant native species, indicative resource estimates, and understandable maintenance activities. It supports early planning and decision-making and does not replace municipal approvals, site inspections, or qualified ecological advice.

### 4. Municipal and Ecological Foundation
The pilot draws on São Paulo municipal biodiversity and urban greening resources to inform native vegetation selection, infrastructure constraints, and biodiversity corridors. Species and site constraints are grounded directly in official municipal frameworks:
* **Portaria SVMA nº 26/2024 (*Flora Nativa Paulistana*):** The municipal benchmark establishing authorized native Atlantic Forest (*Mata Atlântica*) trees, shrubs, and herbaceous plants for urban biodiversity and restoration.
* **BioSampa (5ª Edição - SVMA):** Municipal biodiversity indicator framework aligned with the Singapore Index on Cities' Biodiversity (CBI/IBC), establishing connectivity corridor goals and pollinator conservation targets.
* **Plano Municipal de Arborização Urbana (PMAU & CADES):** Urban arborization guidelines enforcing root setback rules, pedestrian passage minimums, and strict mature height clearances ($\le 5.0\text{ m}$) under overhead utility and electrical distribution wires.
* **Portaria SVMA nº 154/2009:** Municipal standards barring invasive exotic species (such as *Ficus microcarpa*, *Ligustrum lucidum*, and *Leucaena leucocephala*) from public urban planting.
* **Viveiro Municipal Manequinho Lopes & Portal SP 156:** Official civic municipal nursery infrastructure providing free sapling distributions for registered community initiatives.

---

## The CanopyCrew Solution

### 5. What the MVP Will Deliver
To maintain a realistic four-week scope, CanopyCrew focuses on three representative urban environments and a curated catalogue of ten native Atlantic Forest plant species, demonstrating how site characteristics shape recommendations:

#### Site Archetypes

| Site Archetype | Description | Primary Consideration |
| :--- | :--- | :--- |
| **A — Compact Sidewalk Strip** | Narrow planting strip (< 1.5 m wide), compacted soil, overhead utility wires | Root characteristics, pedestrian clearance, wire-safety height restriction ($\le 5.0\text{ m}$) |
| **B — Sunny Degraded Lot** | Approx. 20–50 m² with direct sunlight and degraded urban soil | Resilient pioneer vegetation, soil stabilization, high pollinator/bird support |
| **C — Shaded Courtyard** | Approx. 15–30 m² with limited sunlight and humid microclimate | Shade-tolerant understory vegetation and native avifauna habitat |

#### Ten-Species Curated Native Catalogue
Each species is cross-referenced with *Portaria SVMA nº 26/2024* and catalogued in `backend/data/species.json` and `docs/DATA_SCHEMA.md`:

| Scientific Name | Common Name | Growth Habit / Stratum | Mature Height | Wire-Safe? | Compatible Sites |
| :--- | :--- | :--- | :--- | :--- | :--- |
| *Eugenia uniflora* | Pitangueira | Understory small tree | 5.0 m | Yes | Sites A, B, C |
| *Schinus terebinthifolia* | Aroeira-pimenteira | Medium tree | 7.0 m | No | Site B |
| *Pleroma mutabile* | Manacá-da-serra | Small/medium tree | 6.0 m | No | Sites B, C |
| *Cecropia pachystachya* | Embaúba-branca | Pioneer medium tree | 10.0 m | No | Site B |
| *Calliandra tweediei* | Esponjinha-vermelha | Woody shrub | 2.5 m | Yes | Sites A, B |
| *Campomanesia phaea* | Cambuci | Heritage small tree | 4.5 m | Yes | Sites B, C |
| *Psidium cattleianum* | Araçá-amarelo | Small fruit tree | 4.0 m | Yes | Sites A, B |
| *Myrcia glabra* | Cabeludinha / Cambucá | Understory shrub/tree | 3.0 m | Yes | Site C |
| *Bromelia antiacantha* | Gravatá | Terrestrial bromeliad | 0.9 m | Yes | Sites A, B |
| *Salvia splendens* | Cardeal-do-brejo | Herbaceous shrub | 1.2 m | Yes | Sites A, B, C |

### 6. The Volunteer Experience
Core Journey: **Discover → Select → Plan → Care**

1. **Discover:** Lucas identifies the sample planting environment that most closely resembles his community’s space (e.g., Site A, B, or C).
2. **Select:** CanopyCrew presents relevant native plants from the curated catalogue, with automated suitability checks based on defined environmental and physical constraints (e.g., overhead wires, soil depth, sun exposure).
3. **Plan:** Lucas reviews an indicative planting concept, seedling cost estimate, and projected Year-3 canopy coverage to understand the proposed transformation.
4. **Care:** The system provides understandable maintenance guidance, covering initial establishment (Days 1–30), quarterly maintenance, and annual care activities.

### 7. Connecting User Problems to Product Features

| Problem | MVP Feature | Expected Value |
| :--- | :--- | :--- |
| Choosing unsuitable plants | Rules-based site compatibility engine | More informed, infrastructure-safe planting decisions |
| Difficulty identifying native vegetation | Ten-species curated Atlantic Forest catalogue | Accessible, locally grounded ecological information |
| Uncertainty about costs and results | Deterministic cost and canopy estimates with a visual concept | Clearer project planning and stakeholder discussions |
| Lack of post-planting coordination | Volunteer care guidance and recurring task schedules | Better understanding of ongoing maintenance responsibilities |

### 8. The Role of AI
CanopyCrew combines structured ecological information, deterministic recommendation logic, and generative AI:
* **Deterministic Recommendation Engine:** Applies defined municipal rules to plant suitability (filtering by root profile, shade tolerance, and wire clearances) and calculates seedling budgets and canopy areas directly from structured schemas (`sites.json` and `species.json`).
* **Generative Layer (NVIDIA NIM):** Generates accessible volunteer explanations and contextual care narratives based strictly on validated engine outputs—ensuring the AI communicates the plan effectively without hallucinating botanical facts or overriding safety rules.

### 9. MVP Boundaries
The initial product does not attempt comprehensive citywide GIS mapping, custom computer vision, native mobile applications, or unrestricted landscape design. Instead, the team focuses on demonstrating a consistent, reliable planning experience for the three agreed archetypes.

---

## Impact, Feasibility, and Success

### 10. Contribution to Sustainable Development Goal 11
CanopyCrew aligns with **SDG 11, Target 11.7** (universal access to safe, inclusive, accessible green and public spaces) by helping communities make informed urban greening decisions and sustain planted spaces:
* Improving public access to practical urban greening knowledge and native Atlantic Forest biodiversity.
* Supporting community participation in planting, ongoing stewardship, and civic infrastructure awareness.

### 11. Technology and Team Contributions
* **Barbara Mulu (AI Cloud Leadership):** Product narrative, user persona, three-page brief, stakeholder perspective, SDG alignment, and pitch deck.
* **Alice Gonçalves (Cloud Engineering):** Municipal ecological datasets, data schemas (`docs/DATA_SCHEMA.md`), deterministic recommendation services, Google Cloud Run architecture, and API delivery.
* **Laurine Nzuki (AI Research & Frontend):** User experience, React interface development, prompt design, and AI-assisted visualization.
* **Idris Belgore (Cloud Cybersecurity):** Security reviews, Secret Manager credential isolation, identity and access management, and cloud perimeter safeguards.

**Technical Stack:** React frontend (Firebase Hosting), Python/FastAPI microservices (Google Cloud Run), Google Cloud Firestore, and NVIDIA NIM microservices.

### 12. Defining Success for the Four-Week MVP

| Area | Acceptance Measure |
| :--- | :--- |
| **Site coverage** | Three defined urban site profiles (Sites A, B, and C) |
| **Plant catalogue** | Ten reviewed native species with supporting botanical and care data |
| **Recommendation quality** | Recommended plants satisfy configured municipal and physical compatibility rules |
| **Planning experience** | User obtains a planting concept, seedling cost breakdown, and Year-3 canopy estimate |
| **Maintenance guidance** | User receives structured establishment and recurring care schedules |
| **Usability** | A non-technical reviewer can complete the core journey and explain the next action |

**User Validation:** The team proposes testing the core user journey with five non-technical participants. Participants will select a site, interpret plant recommendations and planning estimates, and identify their next maintenance action. The success threshold is at least four out of five participants completing the journey unassisted.

### 13. Risks and Considerations
* **Ecological Grounding:** Grounding recommendations in municipal frameworks (*Portaria SVMA nº 26/2024*) and isolating generative AI to avoid botanical hallucinations.
* **Clarity of Claims:** Clearly presenting planning outputs as indicative estimates, noting that real-world plantings require municipal permits and on-site utility verification.
* **Cloud & Security Controls:** Enforcing secret isolation, least-privilege IAM policies, and free-tier compute budget limits ($1.00 alert threshold).

### 14. Looking Ahead
The immediate priority is completing and demonstrating the MVP, confirming recommendation accuracy, and gathering usability feedback. Future development will expand to additional São Paulo sub-prefectures, broader Atlantic Forest species inventories, and collaborative volunteer coordination tooling.

---
*CanopyCrew — Greener spaces begin with informed communities. 🌿*
