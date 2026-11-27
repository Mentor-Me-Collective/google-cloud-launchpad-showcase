import Icon from "./Icon";

export default function Logo({ onHome }) {
  return (
    <a
      href="/"
      className="logo"
      aria-label="CanopyCrew home"
      onClick={onHome ? (event) => { event.preventDefault(); onHome(); } : undefined}
    >
      <span className="logo-mark">
        <Icon name="leaf" size={24} />
      </span>
      <span>
        Canopy<span>Crew</span>
      </span>
    </a>
  );
}
