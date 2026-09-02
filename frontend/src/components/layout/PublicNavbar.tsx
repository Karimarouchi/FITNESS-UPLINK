import { Link, NavLink } from "react-router-dom";
import { PUBLIC_NAV_LINKS } from "@/components/public/publicData";
import { PublicAuthActions } from "./PublicAuthActions";

export function PublicNavbar() {
  return (
    <nav className="pub-nav">
      <Link className="pub-logo" to="/">
        <div className="mark">
          <span>F</span>
        </div>
        <div className="word">FITNESS UNIVERSE</div>
      </Link>
      <div className="pub-links">
        {PUBLIC_NAV_LINKS.map((link) => (
          <NavLink key={link.href} className={({ isActive }) => (isActive ? "is-active" : undefined)} to={link.href}>
            {link.label}
          </NavLink>
        ))}
      </div>
      <div className="pub-actions">
        <PublicAuthActions ghostClass="btn-ghost" solidClass="btn-solid" />
      </div>
    </nav>
  );
}
