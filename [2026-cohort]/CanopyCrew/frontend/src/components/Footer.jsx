import { useState } from "react";
import Icon from "./Icon";
import Logo from "./Logo";

export default function Footer({ onHome, onWorkspace, onNavigate }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    if (email.trim()) setSent(true);
  };
  return (
    <footer id="contact">
      <div className="page-shell">
        <div className="footer-top">
          <div>
            <div className="eyebrow light">
              <span /> Stay in the loop
            </div>
            <h2>
              Good things are
              <br />
              growing nearby.
            </h2>
          </div>
          <div className="newsletter">
            <p>
              Get local project updates, seasonal planting tips, and invitations
              to community days.
            </p>
            {sent ? (
              <div className="success">
                <Icon name="leaf" /> You’re on the list. We’ll be in touch.
              </div>
            ) : (
              <form onSubmit={submit}>
                <label className="sr-only" htmlFor="email">
                  Email address
                </label>
                <Icon name="mail" size={19} />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Your email address"
                />
                <button type="submit" aria-label="Subscribe">
                  <Icon name="arrow" />
                </button>
              </form>
            )}
            <small>No spam. Just useful, local updates.</small>
          </div>
        </div>
        <div className="footer-main">
          <div className="footer-brand">
            <Logo onHome={onHome} />
            <p>
              Helping people and nature thrive together, one city patch at a
              time.
            </p>
          </div>
          <div className="footer-links">
            <strong>Explore</strong>
            <a href="/sites" onClick={(event) => onNavigate?.(event, "discover", "/sites")}>Nearby sites</a>
            <a href="/species" onClick={(event) => onNavigate?.(event, "plants", "/species")}>Plant catalogue</a>
            <a href="/about" onClick={(event) => onNavigate?.(event, "about", "/about")}>Our story</a>
          </div>
          <div className="footer-links">
            <strong>Get involved</strong>
            <a href="/workspace" onClick={(event) => { event.preventDefault(); onWorkspace?.(); }}>Start a project</a>
            <a href="mailto:hello@canopycrew.org">Partner with us</a>
          </div>
          <div className="footer-links contact-links">
            <strong>Say hello</strong>
            <a href="mailto:hello@canopycrew.org">hello@canopycrew.org</a>
            <span>Mon–Fri, 9am–5pm</span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 CanopyCrew</span>
          <span>Made for greener, kinder cities.</span>
          <div>
            <a href="#top">Privacy</a>
            <a href="#top">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
