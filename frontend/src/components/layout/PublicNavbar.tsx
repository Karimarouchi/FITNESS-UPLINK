import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { PUBLIC_NAV_LINKS } from "@/components/public/publicData";
import { useAuth } from "@/features/auth/AuthContext";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";

const OVERLAY_PATHS = new Set([
  "/",
  "/fitness-hire-elite",
  "/coaching",
  "/services",
  "/marketplace",
  "/marketplace/products",
  "/academie",
  "/news",
  "/events",
  "/tarifs",
]);

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="pn-user" ref={ref}>
      <button
        className="pn-user-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <ProfileAvatar uploadId={user.avatarUploadId} name={user.displayName || user.firstName} size={30} />
        <span className="pn-user-name">{user.firstName || user.displayName}</span>
        <span className="material-symbols-outlined" aria-hidden="true">
          expand_more
        </span>
      </button>
      {open ? (
        <div className="pn-user-menu" id={menuId} role="menu">
          <div className="pn-user-head">
            <strong>{user.displayName}</strong>
            <span>{user.email}</span>
          </div>
          <Link role="menuitem" to="/app/dashboard" onClick={() => setOpen(false)}>
            <span className="material-symbols-outlined" aria-hidden="true">
              space_dashboard
            </span>
            Tableau de bord
          </Link>
          <Link role="menuitem" to="/app/profile" onClick={() => setOpen(false)}>
            <span className="material-symbols-outlined" aria-hidden="true">
              person
            </span>
            Mon profil
          </Link>
          <Link role="menuitem" to="/app/billing" onClick={() => setOpen(false)}>
            <span className="material-symbols-outlined" aria-hidden="true">
              credit_card
            </span>
            Abonnement
          </Link>
          <button
            role="menuitem"
            type="button"
            className="is-danger"
            onClick={() => {
              setOpen(false);
              void logout().then(() => navigate("/", { replace: true }));
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              logout
            </span>
            Déconnexion
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function PublicNavbar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const overlay = OVERLAY_PATHS.has(pathname);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelId = useId();

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1080) setOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const solid = !overlay || scrolled || open;
  const navClass = ["pn", overlay ? "pn--overlay" : "", solid ? "pn--solid" : "", open ? "pn--open" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={navClass}>
      <div className="pn-bar">
        <Link className="pn-logo" to="/" aria-label="Fitness Universe — accueil">
          <span className="pn-mark" aria-hidden="true">
            F
          </span>
          <span className="pn-word">
            Fitness <b>Universe</b>
          </span>
        </Link>

        <nav className="pn-links" aria-label="Navigation principale">
          {PUBLIC_NAV_LINKS.map((link) => (
            <NavLink key={link.href} className={({ isActive }) => (isActive ? "is-active" : undefined)} to={link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="pn-actions">
          {user ? (
            <>
              <Link className="pn-btn pn-btn-ghost" to="/app/dashboard">
                Mon espace
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link className="pn-btn pn-btn-ghost" to="/login">
                Se connecter
              </Link>
              <Link className="pn-btn pn-btn-solid" to="/signup">
                Rejoindre
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </>
          )}
        </div>

        <button
          className="pn-toggle"
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="material-symbols-outlined">{open ? "close" : "menu"}</span>
        </button>
      </div>

      <div className="pn-sheet" id={panelId} hidden={!open}>
        <div className="pn-sheet-links">
          {PUBLIC_NAV_LINKS.map((link, index) => (
            <NavLink
              key={link.href}
              className={({ isActive }) => (isActive ? "is-active" : undefined)}
              to={link.href}
              style={{ animationDelay: `${index * 35}ms` }}
            >
              <span className="pn-sheet-icon material-symbols-outlined" aria-hidden="true">
                {link.icon}
              </span>
              <span>
                <strong>{link.label}</strong>
                <small>{link.hint}</small>
              </span>
              <span className="material-symbols-outlined" aria-hidden="true">
                chevron_right
              </span>
            </NavLink>
          ))}
        </div>
        <div className="pn-sheet-actions">
          {user ? (
            <>
              <Link className="pn-btn pn-btn-solid" to="/app/dashboard">
                Tableau de bord
              </Link>
              <button
                className="pn-btn pn-btn-outline"
                type="button"
                onClick={() => {
                  setOpen(false);
                  void logout().then(() => navigate("/", { replace: true }));
                }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link className="pn-btn pn-btn-solid" to="/signup">
                Créer mon compte
              </Link>
              <Link className="pn-btn pn-btn-outline" to="/login">
                Se connecter
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
