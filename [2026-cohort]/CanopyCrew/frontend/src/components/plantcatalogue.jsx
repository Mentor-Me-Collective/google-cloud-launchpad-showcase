import { useMemo, useState } from "react";
import Icon from "./Icon";
import { getPlantImage } from "../data/plantimages";

function SectionHeading({ eyebrow, title, copy }) {
  return (
    <div className="section-heading">
      <div>
        <div className="eyebrow">
          <span /> {eyebrow}
        </div>
        <h2>{title}</h2>
      </div>
      <div className="heading-side">
        <p>{copy}</p>
      </div>
    </div>
  );
}

function sunlightLabel(values) {
  const labels = {
    full_sun: "Full sun",
    partial_shade: "Part shade",
    full_shade: "Shade",
    partial_to_full_shade: "Part to full shade",
  };
  return [
    ...new Set(
      values.map((value) => labels[value] || value.replaceAll("_", " ")),
    ),
  ].join(", ");
}

function PlantCard({ plant, index }) {
  const type = plant.physical_profile.growth_habit.replaceAll("_", " ");
  return (
    <article className="plant-card">
      <div className="plant-image">
        <img
          src={getPlantImage(plant, index)}
          alt={`Native plant: ${plant.botanical.common_name_en}`}
          loading="lazy"
        />
        <span>{type}</span>
      </div>
      <div className="plant-info">
        <h3>{plant.botanical.common_name_en}</h3>
        <p className="scientific">{plant.botanical.scientific_name}</p>
        <p className="plant-common-name">{plant.botanical.common_name_pt}</p>
        <div className="plant-meta">
          <span>
            <Icon name="sun" size={17} />
            {sunlightLabel(plant.site_tolerances.sunlight)}
          </span>
          <span>
            <Icon name="leaf" size={17} />
            {plant.physical_profile.mature_height_meters} m
          </span>
        </div>
        <div className="plant-benefit">
          <Icon name="leaf" size={17} />{" "}
          {plant.ecological_interactions.ecological_role}
        </div>
      </div>
    </article>
  );
}

export default function PlantCatalogue({ plants, status }) {
  const [type, setType] = useState("All plants");
  const [light, setLight] = useState("Any light");
  const [search, setSearch] = useState("");
  const types = useMemo(
    () => [
      ...new Set(
        plants.map((plant) =>
          plant.physical_profile.growth_habit.replaceAll("_", " "),
        ),
      ),
    ],
    [plants],
  );
  const lights = useMemo(
    () => [
      ...new Set(
        plants.flatMap((plant) =>
          plant.site_tolerances.sunlight.map((value) => sunlightLabel([value])),
        ),
      ),
    ],
    [plants],
  );
  const filtered = useMemo(
    () =>
      plants.filter((plant) => {
        const plantType = plant.physical_profile.growth_habit.replaceAll(
          "_",
          " ",
        );
        const query = search.toLowerCase();
        return (
          (type === "All plants" || plantType === type) &&
          (light === "Any light" ||
            plant.site_tolerances.sunlight.some(
              (value) => sunlightLabel([value]) === light,
            )) &&
          `${plant.botanical.common_name_en} ${plant.botanical.common_name_pt} ${plant.botanical.scientific_name}`
            .toLowerCase()
            .includes(query)
        );
      }),
    [plants, type, light, search],
  );

  return (
    <section className="section catalogue" id="plants">
      <div className="page-shell">
        <SectionHeading
          eyebrow="Plant catalogue"
          title={
            <>
              Right plant.
              <br />
              Right place. Less fuss.
            </>
          }
          copy="Explore native Atlantic Forest species matched to CanopyCrew’s São Paulo site types."
        />
        {status === "loading" ? (
          <p className="api-state">Loading native plant recommendations…</p>
        ) : status === "error" ? (
          <p className="api-state" role="alert">
            Plant recommendations could not be loaded. Check that the CanopyCrew
            API is running.
          </p>
        ) : (
          <>
            <div className="filter-bar">
              <label className="search-box">
                <Icon name="search" size={19} />
                <span className="sr-only">Search plants</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by plant name…"
                />
              </label>
              <label>
                <span>Growth habit</span>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  <option>All plants</option>
                  {types.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Sunlight</span>
                <select
                  value={light}
                  onChange={(event) => setLight(event.target.value)}
                >
                  <option>Any light</option>
                  {lights.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              {(type !== "All plants" || light !== "Any light" || search) && (
                <button
                  className="clear-button"
                  onClick={() => {
                    setType("All plants");
                    setLight("Any light");
                    setSearch("");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="result-count">
              <strong>{filtered.length}</strong> plants for your patch
            </div>
            {filtered.length ? (
              <div className="plant-grid">
                {filtered.map((plant, index) => (
                  <PlantCard
                    plant={plant}
                    index={index}
                    key={plant.species_id}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Icon name="leaf" size={30} />
                <h3>No plants found</h3>
                <p>Try widening your search or clearing the filters.</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
