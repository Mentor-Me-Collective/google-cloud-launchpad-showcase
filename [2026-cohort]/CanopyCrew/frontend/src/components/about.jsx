export default function About() {
  return (
    <section className="about" id="about">
      <div className="page-shell about-grid">
        <div className="about-visual">
          <img
            src="https://images.unsplash.com/photo-1555955207-cf6fba0f1f57?auto=format&fit=crop&w=1200&q=86"
            alt="Community members learning about plants together"
          />
          <div className="about-note">
            <strong>
              Small actions.
              <br />
              Visible change.
            </strong>
            <span>One block at a time.</span>
          </div>
        </div>
        <div className="about-copy">
          <div className="eyebrow light">
            <span /> Why CanopyCrew
          </div>
          <h2>Growing places where people belong.</h2>
          <p className="lead">
            We make urban greening simple, social, and possible for everyone—not
            only the experts.
          </p>
          <p>
            CanopyCrew connects neighbours with overlooked spaces, practical
            plant knowledge, and each other. Whether you have ten minutes or a
            whole weekend, there’s a way to pitch in.
          </p>
          <div className="principles">
            <div>
              <b>01</b>
              <span>
                <strong>Start where you are</strong>
                <small>No garden or experience needed.</small>
              </span>
            </div>
            <div>
              <b>02</b>
              <span>
                <strong>Grow it together</strong>
                <small>Local crews make lasting change.</small>
              </span>
            </div>
            <div>
              <b>03</b>
              <span>
                <strong>Plan for the long term</strong>
                <small>Resilient plants, practical care.</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
