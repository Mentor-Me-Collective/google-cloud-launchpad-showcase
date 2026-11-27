import Icon from "./Icon";

const heroImage =
  "https://images.unsplash.com/photo-1524247108137-732e0f642303?auto=format&fit=crop&w=1800&q=88";

export default function Hero({ onNavigate }) {
  return (
    <section className="hero" id="top">
      <img
        className="hero-image"
        src={heroImage}
        alt="Neighbours planting flowers together in a community garden"
      />
      <div className="hero-overlay" />
      <div className="hero-content page-shell">
        <div className="eyebrow light">
          <span /> Greener streets start with us
        </div>
        <h1>
          From concrete
          <br />
          to <em>canopy.</em>
        </h1>
        <p>
          Find a patch, meet your neighbours, and help nature take root in the
          places we call home.
        </p>
        <div className="hero-actions">
          <a href="/sites" className="button button-earth" onClick={(event) => onNavigate?.(event, "discover", "/sites")}>
            Explore sample sites <Icon name="arrow" />
          </a>
          <a href="/species" className="text-link light-link" onClick={(event) => onNavigate?.(event, "plants", "/species")}>
            Browse plants <Icon name="chevron" size={17} />
          </a>
        </div>
      </div>
      <div className="hero-stats">
        <div>
          <strong>3</strong>
          <span>São Paulo site types</span>
        </div>
        <div>
          <strong>10</strong>
          <span>native species</span>
        </div>
        <div>
          <strong>1</strong>
          <span>greener community</span>
        </div>
      </div>
    </section>
  );
}
