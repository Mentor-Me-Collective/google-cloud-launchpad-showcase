import { useState } from "react";
import Icon from "./Icon";
import Logo from "./Logo";

export default function Navbar({ onWorkspace, onSignOut, signedIn = false, onNavigate, onHome, workspaceOpen = false }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className={workspaceOpen ? "navbar workspace-navbar" : "navbar"}>
      <div className="nav-inner">
        <Logo onHome={onHome} />
        <nav
          className={open ? "nav-links open" : "nav-links"}
          aria-label="Primary navigation"
        >
          <a href="/sites" onClick={(event) => { close(); onNavigate?.(event, "discover", "/sites"); }}>
            Discover
          </a>
          <a href="/species" onClick={(event) => { close(); onNavigate?.(event, "plants", "/species"); }}>
            Plant catalogue
          </a>
          <a href="/about" onClick={(event) => { close(); onNavigate?.(event, "about", "/about"); }}>
            About us
          </a>
          <a href="/contact" onClick={(event) => { close(); onNavigate?.(event, "contact", "/contact"); }}>
            Contact
          </a>
          <button
            className="button button-small mobile-cta"
            onClick={() => { close(); signedIn && workspaceOpen ? onSignOut() : onWorkspace(); }}
          >
            {signedIn && workspaceOpen ? "Sign out" : <>MyWorkspace <Icon name="arrow" size={17} /></>}
          </button>
        </nav>
        <button className="button button-small desktop-cta" onClick={signedIn && workspaceOpen ? onSignOut : onWorkspace}>
          {signedIn && workspaceOpen ? "Sign out" : <>MyWorkspace <Icon name="arrow" size={17} /></>}
        </button>
        <button
          className="menu-button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          <Icon name={open ? "close" : "menu"} size={25} />
        </button>
      </div>
    </header>
  );
}
