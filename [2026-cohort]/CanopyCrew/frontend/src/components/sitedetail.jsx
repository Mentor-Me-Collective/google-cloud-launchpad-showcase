import { useState } from "react";
import Icon from "./Icon";
import { getSiteImage } from "../data/siteimages";

const sunlightNames = {
  full_sun: "full sun",
  partial_shade: "partial shade",
  full_shade: "full shade",
  partial_to_full_shade: "partial to full shade",
};

const carePhases = [
  ["Initial month", "initial_month"],
  ["Quarterly maintenance", "maintenance_quarterly"],
  ["Annual care", "annual"],
];

function CareSchedule({ plant }) {
  return (
    <div className="care-schedule">
      <h4>Maintenance</h4>

      <div className="care-phases">
        {carePhases.map(([label, key]) => (
          <section className="care-phase" key={key}>
            <h5>{label}</h5>

            {plant.volunteer_care_schedule[key].map((task, index) => (
              <div className="care-task" key={`${key}-${index}`}>
                <strong>{task.task}</strong>
                <span>{task.frequency}</span>
                <p>{task.notes}</p>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function NarrativeBlock({ narrative }) {
  if (!narrative) return null;

  const blocks = narrative
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="nim-narrative-card">
      <div className="nim-narrative-header">
        <div>
          <p className="eyebrow">
            <span /> NVIDIA NIM · Read-Only Narrative Synthesis
          </p>
          <h3>Community Volunteer Care & Planting Guide</h3>
        </div>
        <span className="nim-model-badge">
          NVIDIA NIM · nvidia/nemotron-3-ultra-550b-a55b · UN SDG 11.7
        </span>
      </div>

      <div className="nim-narrative-body" lang="en">
        {blocks.map((block, index) => {
          if (block === "---") {
            return <hr key={index} className="nim-divider" />;
          }
          if (block.startsWith("# ")) {
            return <h4 key={index}>{block.slice(2)}</h4>;
          }
          if (block.startsWith("## ")) {
            return <h5 key={index}>{block.slice(3)}</h5>;
          }
          if (block.startsWith("### ")) {
            return <h6 key={index}>{block.slice(4)}</h6>;
          }
          if (block.startsWith(">")) {
            const cleanAlert = block
              .split("\n")
              .map((line) => line.replace(/^>\s*(\[!IMPORTANT\])?\s*/, ""))
              .filter(Boolean)
              .join(" ");
            return (
              <div key={index} className="nim-callout">
                <Icon name="leaf" size={17} />
                <p>{cleanAlert.replaceAll("**", "")}</p>
              </div>
            );
          }
          if (block.startsWith("- ") || block.startsWith("* ")) {
            const items = block
              .split("\n")
              .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
              .filter(Boolean);
            return (
              <ul key={index} role="list" className="nim-list">
                {items.map((item, idx) => (
                  <li key={idx}>{item.replaceAll("**", "").replaceAll("*", "")}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={index}>
              {block.replaceAll("**", "").replaceAll("*", "")}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function PlantRecommendation({ plant, site, isSelected, onToggleSelect }) {
  const exposure =
    sunlightNames[site.sunlight_exposure] ||
    site.sunlight_exposure.replaceAll("_", " ");

  const plantSunlight = plant.site_tolerances.sunlight
    .map((value) => sunlightNames[value] || value.replaceAll("_", " "))
    .join(", ");

  return (
    <article className="detail-plant-card">
      <div className="detail-plant-heading">
        <div>
          <p className="eyebrow">
            <span /> Native Atlantic Forest species
          </p>

          <h3>{plant.botanical.common_name_en}</h3>

          <p className="scientific">
            {plant.botanical.scientific_name} ·{" "}
            {plant.botanical.common_name_pt}
          </p>
        </div>

        <div className="detail-plant-actions">
          <span className="plant-height">
            {plant.physical_profile.mature_height_meters} m · $
            {plant.estimates.unit_cost_usd.toFixed(2)} USD ·{" "}
            {plant.estimates.canopy_coverage_m2_at_year_3} m² Yr-3
          </span>

          <button
            type="button"
            className="plant-select-toggle"
            aria-pressed={isSelected}
            aria-label={`Include ${plant.botanical.common_name_en} in volunteer planting plan`}
            onClick={() => onToggleSelect(plant.species_id)}
          >
            <Icon name="leaf" size={15} />
            <span>Include in planting plan</span>
          </button>
        </div>
      </div>

      <div className="suitability">
        <h4>Why it suits this site</h4>

        <ul role="list">
          <li>
            <Icon name="leaf" size={16} /> Selected by CanopyCrew's backend
            for the {site.archetype_label} archetype.
          </li>

          <li>
            <Icon name="sun" size={16} /> Sunlight tolerance: {plantSunlight};
            this site receives {exposure}.
          </li>

          <li>
            <Icon name="leaf" size={16} />{" "}
            {plant.ecological_interactions.ecological_role}
          </li>

          {site.constraints.overhead_power_lines && (
            <li>
              <Icon name="leaf" size={16} /> Overhead wire safety: this
              species has passed the backend's site-specific safety
              screening (≤ 5.0 m).
            </li>
          )}
        </ul>
      </div>

      <CareSchedule plant={plant} />
    </article>
  );
}

export default function SiteDetail({
  site,
  recommendations,
  status,
  onBack,
  onPostPlan,
}) {
  const goals = site.ecological_goals || [];
  const dimensions = site.constraints;

const defaultSpeciesIds = recommendations.map((plant) => plant.species_id);

const [customSelection, setCustomSelection] = useState(null);
const [planResult, setPlanResult] = useState(null);
const [planStatus, setPlanStatus] = useState("idle");
const [planError, setPlanError] = useState("");

const selectedSpeciesIds = customSelection ?? defaultSpeciesIds;

const toggleSpeciesSelection = (speciesId) => {
  setCustomSelection((current) => {
    const base = current ?? defaultSpeciesIds;

    return base.includes(speciesId)
      ? base.filter((id) => id !== speciesId)
      : [...base, speciesId];
  });
};

const submitVolunteerPlan = async (withNarrative) => {
  if (!onPostPlan || selectedSpeciesIds.length === 0) return;

  setPlanStatus(withNarrative ? "loading-narrative" : "loading-math");
  setPlanError("");

  const endpoint = withNarrative
    ? "/api/v1/volunteer-plan/narrative"
    : "/api/v1/volunteer-plan";

  try {
    const response = await onPostPlan(endpoint, {
      site_id: site.site_id,
      selected_species_ids: selectedSpeciesIds,
    });

    setPlanResult(response);
    setPlanStatus("ready");
  } catch (error) {
    setPlanError(
      error instanceof Error
        ? error.message
        : "Could not generate volunteer plan.",
    );

    setPlanStatus("error");
  }
};

const image = getSiteImage(site);

  return (
    <section className="site-detail">
      <div
        className="site-detail-hero"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(10,43,29,.9), rgba(10,43,29,.4)), url("${image}")`,
        }}
      >
        <div className="page-shell">
          <button
            className="back-button back-button-light"
            onClick={onBack}
          >
            <Icon name="chevron" size={18} /> Back to previous view
          </button>

          <p className="eyebrow light">
            <span /> {site.archetype_label}
          </p>

          <h1>{site.name}</h1>
          <p>{site.description}</p>
        </div>
      </div>

      <div className="page-shell site-detail-content">
        <section className="site-facts">
          <div>
            <span>Typical dimensions</span>
            <strong>{site.typical_dimensions}</strong>
          </div>

          <div>
            <span>Sunlight</span>
            <strong>
              {sunlightNames[site.sunlight_exposure] ||
                site.sunlight_exposure.replaceAll("_", " ")}
            </strong>
          </div>

          <div>
            <span>Overhead power lines</span>
            <strong>
              {dimensions.overhead_power_lines ? "Present (≤ 5.0 m)" : "None"}
            </strong>
          </div>

          <div>
            <span>Soil compaction</span>
            <strong>
              {dimensions.soil_compaction_level.replaceAll("_", " ")}
            </strong>
          </div>
        </section>

        <section className="site-goals">
          <div>
            <p className="eyebrow">
              <span /> Site priorities
            </p>

            <h2>What this space can support</h2>
          </div>

          <ul role="list">
            {goals.map((goal) => (
              <li key={goal}>
                <Icon name="leaf" size={17} />
                {goal}
              </li>
            ))}
          </ul>
        </section>

        {status === "ready" && recommendations.length > 0 && (
          <section className="volunteer-plan-builder">
            <div className="detail-section-heading">
              <div>
                <p className="eyebrow">
                  <span /> Deterministic Math + NVIDIA NIM Stewardship
                </p>
                <h2>Build your community planting plan</h2>
              </div>
              <p>
                Botanical compliance (Portaria SVMA nº 26/2024 & PMAU), wire
                safety, seedling costs, and Year-3 canopy projections are
                calculated deterministically in Python. NVIDIA NIM synthesizes
                the community volunteer care narrative.
              </p>
            </div>

            <div className="plan-builder-bar">
              <div className="plan-selection-summary">
                <strong>{selectedSpeciesIds.length}</strong> of{" "}
                {recommendations.length} eligible native species selected
                <div className="plan-quick-links">
                  <button
                    type="button"
                    className="clear-button"
                    onClick={() => setCustomSelection(null)}
                  >
                    Select all ({recommendations.length})
                  </button>
                  {selectedSpeciesIds.length > 0 && (
                    <button
                      type="button"
                      className="clear-button"
                      onClick={() => setCustomSelection([])}
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              </div>

              <div className="plan-builder-actions">
                <button
                  type="button"
                  className="button button-small"
                  disabled={
                    selectedSpeciesIds.length === 0 ||
                    planStatus.startsWith("loading")
                  }
                  onClick={() => submitVolunteerPlan(false)}
                >
                  {planStatus === "loading-math"
                    ? "Calculating plan…"
                    : "Calculate deterministic plan"}
                </button>

                <button
                  type="button"
                  className="button button-earth"
                  disabled={
                    selectedSpeciesIds.length === 0 ||
                    planStatus.startsWith("loading")
                  }
                  onClick={() => submitVolunteerPlan(true)}
                >
                  <Icon name="leaf" size={16} />
                  {planStatus === "loading-narrative"
                    ? "Synthesizing with NVIDIA NIM…"
                    : "Generate NVIDIA NIM care guide"}
                </button>
              </div>
            </div>

            {planStatus === "error" && (
              <p className="api-state" role="alert">
                {planError}
              </p>
            )}

            {planResult && (
              <div className="plan-results" aria-live="polite">
                <div className="plan-metrics">
                  <div>
                    <span>Selected native seedlings</span>
                    <strong>{planResult.selected_species_count} species</strong>
                  </div>
                  <div>
                    <span>Estimated seedling cost</span>
                    <strong>
                      ${planResult.total_seedling_cost_usd.toFixed(2)} USD
                    </strong>
                  </div>
                  <div>
                    <span>Projected Year-3 canopy</span>
                    <strong>
                      {planResult.projected_canopy_m2_year_3.toFixed(1)} m²
                    </strong>
                  </div>
                  <div>
                    <span>Municipal screening</span>
                    <strong>
                      {dimensions.overhead_power_lines
                        ? "Wire-safe (≤ 5.0 m)"
                        : "SVMA 26/2024 verified"}
                    </strong>
                  </div>
                </div>

                {planResult.care_narrative && (
                  <NarrativeBlock narrative={planResult.care_narrative} />
                )}
              </div>
            )}
          </section>
        )}

        <section className="site-recommendations">
          <div className="detail-section-heading">
            <div>
              <p className="eyebrow">
                <span /> Matched plants
              </p>

              <h2>Plants suited to this site</h2>
            </div>

            <p>
              Recommendations follow the site's growing conditions and
              safety requirements. Toggle any card to customize your
              volunteer planting plan above.
            </p>
          </div>

          {status === "loading" ? (
            <p className="api-state">Loading site matched plants…</p>
          ) : status === "error" ? (
            <p className="api-state" role="alert">
              Plant recommendations could not be loaded. Check that the
              CanopyCrew API is running.
            </p>
          ) : recommendations.length ? (
            <div className="detail-plant-list">
              {recommendations.map((plant) => (
                <PlantRecommendation
                  key={plant.species_id}
                  plant={plant}
                  site={site}
                  isSelected={selectedSpeciesIds.includes(plant.species_id)}
                  onToggleSelect={toggleSpeciesSelection}
                />
              ))}
            </div>
          ) : (
            <p className="api-state">
              No plant recommendations are available for this site yet.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
