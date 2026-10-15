import { useEffect, useId, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import type { NavLinkItem } from "../data";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PublicAuthActions } from "@/components/layout/PublicAuthActions";

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
            <BrandLogo to={null} />
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
            <PublicAuthActions ghostClass="fu-btn fu-btn--ghost" solidClass="fu-btn fu-btn--lime" />
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
              <PublicAuthActions
                ghostClass="fu-btn fu-btn--ghost"
                solidClass="fu-btn fu-btn--lime"
                onNavigate={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
