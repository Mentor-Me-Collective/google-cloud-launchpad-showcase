
import Icon from "./Icon";
import { getSiteImage } from "../data/siteimages";

function SectionHeading({ eyebrow, title, copy, action }) {
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
        {action}
      </div>
    </div>
  );
}

function SiteCard({ site, index, onSiteOpen }) {
  const image = getSiteImage(site, index);
  const light = site.sunlight_exposure.replaceAll("_", " ");

  return (
    <a
      className="site-card"
      href={`/sites/${encodeURIComponent(site.site_id)}`}
      onClick={(event) => onSiteOpen?.(event, site.site_id)}
    >
      <div className="site-image-wrap">
        <img
          src={image}
          alt={`${site.archetype_label} planting site`}
          loading="lazy"
        />
        <span className="site-number">0{index + 1}</span>
        <span className="distance">
          <Icon name="pin" size={15} /> São Paulo
        </span>
      </div>

      <div className="site-body">
        <p className="site-location">
          <Icon name="pin" size={16} /> {site.archetype_label}
        </p>

        <h3>{site.name}</h3>

        <p className="site-description">{site.description}</p>

        <div className="tags">
          <span>{site.typical_dimensions}</span>
          <span>{light}</span>
        </div>

        <div className="card-link">
          <span>
            View site details · {site.ecological_goals.length} ecological goals
          </span>
          <Icon name="arrow" size={18} />
        </div>
      </div>
    </a>
  );
}

export default function Discover({ sites, status, onNavigate, onSiteOpen }) {
  return (
    <section className="section discover" id="discover">
      <div className="page-shell">
        <SectionHeading
          eyebrow="Discover a place"
          title={
            <>
              A greener corner
              <br />
              is closer than you think.
            </>
          }
          copy="Explore the São Paulo site types CanopyCrew helps communities transform, grounded in local growing conditions."
          action={
            <a className="text-link" href="/contact" onClick={(event) => onNavigate?.(event, "contact", "/contact")}>
              Get involved <Icon name="arrow" size={18} />
            </a>
          }
        />

        {status === "loading" ? (
          <p className="api-state">Loading site types…</p>
        ) : status === "error" ? (
          <p className="api-state" role="alert">
            Site types could not be loaded. Check that the CanopyCrew API is
            running.
          </p>
        ) : (
          <div className="site-grid">
            {sites.map((site, index) => (
              <SiteCard
                key={site.site_id}
                site={site}
                index={index}
                onSiteOpen={onSiteOpen}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
