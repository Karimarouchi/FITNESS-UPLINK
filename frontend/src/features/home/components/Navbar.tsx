import { useEffect, useId, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import type { NavLinkItem } from "../data";

type NavbarProps = {
  links: NavLinkItem[];
};

export function Navbar({ links }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) {
        setOpen(false);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="fu-nav">
      <nav aria-label="Navigation principale">
        <div className="fu-nav-inner">
          <Link className="fu-logo" to="/" onClick={() => setOpen(false)}>
            <span className="fu-logo-mark" aria-hidden="true">
              FU
            </span>
            <span className="fu-logo-word">Fitness Universe</span>
          </Link>

          <ul className="fu-nav-links">
            {links.map((link) => (
              <li key={link.href}>
                <NavLink className={({ isActive }) => `fu-nav-link${isActive ? " is-active" : ""}`} to={link.href}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="fu-nav-actions">
            <Link className="fu-btn fu-btn--ghost" to="/login">
              Se connecter
            </Link>
            <Link className="fu-btn fu-btn--lime" to="/signup">
              Rejoindre
            </Link>
          </div>

          <button
            className="fu-nav-toggle"
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="material-symbols-outlined">{open ? "close" : "menu"}</span>
          </button>
        </div>

        <div
          className={`fu-nav-panel${open ? " is-open" : ""}`}
          id={panelId}
          inert={!open}
          aria-hidden={!open}
        >
          <div className="fu-nav-panel-inner">
            <ul className="fu-nav-panel-list">
              {links.map((link) => (
                <li key={link.href}>
                  <NavLink
                    className={({ isActive }) => `fu-nav-link${isActive ? " is-active" : ""}`}
                    to={link.href}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="fu-nav-panel-actions">
              <Link className="fu-btn fu-btn--ghost" to="/login" onClick={() => setOpen(false)}>
                Se connecter
              </Link>
              <Link className="fu-btn fu-btn--lime" to="/signup" onClick={() => setOpen(false)}>
                Rejoindre
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
