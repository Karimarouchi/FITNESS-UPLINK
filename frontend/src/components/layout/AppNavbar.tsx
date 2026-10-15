import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission, isSuperAdmin, isVerified, shortNameOf } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { InboxCountBadge, useInboxCount } from "@/features/recruitment/useInboxCount";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { sidebarGroupsFor } from "./sidebarNav";
import type { SidebarItem, SidebarLink } from "./sidebarTypes";

function pathMatches(pathname: string, link: SidebarLink) {
  if (link.end) {
    return pathname === link.to;
  }
  return pathname === link.to || pathname.startsWith(`${link.to}/`);
}

function itemIsActive(pathname: string, item: SidebarItem) {
  if (item.kind === "dropdown") {
    return item.children.some((child) => pathMatches(pathname, child));
  }
  return pathMatches(pathname, item);
}

function isAccountLink(item: SidebarLink) {
  return item.to === "/app/profile" || item.to === "/notifications" || item.to === "/app/settings";
}

function isUnusedTopLink(item: SidebarLink) {
  return (
    item.to === "/app/coaching" ||
    item.to === "/app/academy" ||
    item.to === "/app/marketplace" ||
    item.to === "/app/services" ||
    item.to === "/app/events" ||
    item.to === "/app/content"
  );
}

function navItemsFor(user: ReturnType<typeof useAuth>["user"]) {
  return sidebarGroupsFor(user)
    .flatMap((group) => group.items)
    .flatMap((item): SidebarItem[] => {
      if (item.kind === "dropdown") {
        if (item.id === "account") {
          return [];
        }
        const children = item.children.filter((child) => !isAccountLink(child));
        if (!children.length) {
          return [];
        }
        return [{ ...item, children }];
      }
      return isAccountLink(item) || isUnusedTopLink(item) ? [] : [item];
    });
}

function NavIcon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined size-4 text-muted-foreground" aria-hidden="true">
      {name}
    </span>
  );
}

export function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navOpen, setNavOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const displayName = user?.displayName || "Profil";
  const items = useMemo(() => navItemsFor(user), [user]);
  const dashboardItem = items.find((item) => item.kind !== "dropdown" && item.to === "/app/dashboard");
  const menuItems = items.filter((item) => item !== dashboardItem);
  const inboxCount = useInboxCount();

  useEffect(() => {
    setMobileOpen(false);
    setNavOpen(null);
  }, [pathname]);

  useEffect(() => {
    if (!open && !navOpen) {
      return;
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpen(false);
      }
      if (navRef.current && !navRef.current.contains(target)) {
        setNavOpen(null);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setMobileOpen(false);
        setNavOpen(null);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, navOpen]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (isSuperAdmin(user) || hasPermission(user, PERMS.ADMIN_USERS)) {
      navigate(q ? `/users?q=${encodeURIComponent(q)}` : "/users");
      return;
    }
    if (hasPermission(user, PERMS.HIRE_SEARCH)) {
      navigate(q ? `/candidates?q=${encodeURIComponent(q)}` : "/candidates");
      return;
    }
    if (hasPermission(user, PERMS.HIRE_APPLY)) {
      navigate(q ? `/app/opportunities?q=${encodeURIComponent(q)}` : "/app/opportunities");
      return;
    }
    // Members: search coaches first, then the academy and the marketplace catalogues.
    if (hasPermission(user, PERMS.COACHING_DISCOVER)) {
      navigate(q ? `/coaches?q=${encodeURIComponent(q)}` : "/coaches");
      return;
    }
    if (hasPermission(user, PERMS.ACADEMY_BROWSE)) {
      navigate(q ? `/academie?q=${encodeURIComponent(q)}` : "/academie");
      return;
    }
    if (hasPermission(user, PERMS.MARKETPLACE_BROWSE)) {
      navigate(q ? `/marketplace/products?q=${encodeURIComponent(q)}` : "/marketplace/products");
    }
  }

  function goTo(to: string) {
    setNavOpen(null);
    setMobileOpen(false);
    navigate(to);
  }

  return (
    <header className="app-navbar">
      <Link className="app-navbar-logo" to="/app/dashboard">
        <BrandLogo to={null} />
      </Link>

      <div className="app-navbar-menu" ref={navRef}>
        <nav className="app-nav-list" aria-label="Navigation principale">
          {dashboardItem && dashboardItem.kind !== "dropdown" ? (
            <Link
              className={itemIsActive(pathname, dashboardItem) ? "app-nav-link is-on" : "app-nav-link"}
              to={dashboardItem.to}
            >
              {dashboardItem.label}
            </Link>
          ) : null}
          {menuItems.map((item) =>
            item.kind === "dropdown" ? (
              <div
                key={item.id}
                className={`app-nav-drop${itemIsActive(pathname, item) ? " is-on" : ""}${navOpen === item.id ? " is-open" : ""}`}
              >
                <button
                  type="button"
                  aria-expanded={navOpen === item.id}
                  aria-haspopup="true"
                  onClick={() => setNavOpen((current) => (current === item.id ? null : item.id))}
                >
                  {item.label}
                  <span className="material-symbols-outlined" aria-hidden="true">
                    expand_more
                  </span>
                </button>
                {navOpen === item.id ? (
                  <div className="app-nav-panel" role="menu">
                    {item.children.map((child) => (
                      <Link
                        key={child.to}
                        role="menuitem"
                        to={child.to}
                        className={pathMatches(pathname, child) ? "is-on" : undefined}
                        onClick={() => goTo(child.to)}
                      >
                        <NavIcon name={child.icon} />
                        <span>{child.label}</span>
                        {child.to === "/applications" ? <InboxCountBadge count={inboxCount} /> : null}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                key={item.to}
                className={itemIsActive(pathname, item) ? "app-nav-link is-on" : "app-nav-link"}
                to={item.to}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </div>

      <div className="app-navbar-right">
        <form className="search app-navbar-search" onSubmit={onSearch} role="search">
          <span className="material-symbols-outlined search-icon" aria-hidden="true">
            search
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              isSuperAdmin(user) || hasPermission(user, PERMS.ADMIN_USERS)
                ? "Rechercher un utilisateur…"
                : hasPermission(user, PERMS.HIRE_SEARCH)
                  ? "Rechercher un talent…"
                  : hasPermission(user, PERMS.HIRE_APPLY)
                    ? "Rechercher une offre…"
                    : hasPermission(user, PERMS.COACHING_DISCOVER)
                      ? "Rechercher un coach…"
                      : "Rechercher…"
            }
            aria-label="Recherche"
          />
        </form>
        <NotificationBell />
        <div className="account-menu" ref={menuRef}>
          <button
            type="button"
            className="app-navbar-avatar"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Menu du compte"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="app-avatar-wrap">
              <ProfileAvatar uploadId={user?.avatarUploadId} name={displayName} size={40} />
              {isVerified(user) ? (
                <span className="avatar-verified material-symbols-outlined">verified</span>
              ) : null}
            </span>
          </button>
          {open ? (
            <div className="account-dropdown" role="menu">
              <div className="who">
                <div className="n">{user ? shortNameOf(user) : "Profil"}</div>
                <div className="r">{user?.role?.label ?? "Compte"}</div>
              </div>
              <Link role="menuitem" to="/app/profile" onClick={() => setOpen(false)}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  person
                </span>
                Mon profil
              </Link>
              <Link role="menuitem" to="/app/settings" onClick={() => setOpen(false)}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  settings
                </span>
                Paramètres
              </Link>
              <Link role="menuitem" to="/notifications" onClick={() => setOpen(false)}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  notifications
                </span>
                Notifications
              </Link>
              <button
                type="button"
                className="danger"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void logout().then(() => navigate("/login", { replace: true }));
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
        <button
          className="app-navbar-toggle"
          type="button"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setMobileOpen((value) => !value)}
        >
          <span className="material-symbols-outlined">{mobileOpen ? "close" : "menu"}</span>
        </button>
      </div>

      {mobileOpen ? (
        <div className="app-navbar-mobile">
          {items.map((item) =>
            item.kind === "dropdown" ? (
              <div key={item.id} className="app-navbar-mobile-group">
                <p>{item.label}</p>
                {item.children.map((child) => (
                  <button key={child.to} type="button" onClick={() => goTo(child.to)}>
                    {child.label}
                    {child.to === "/applications" ? <InboxCountBadge count={inboxCount} /> : null}
                  </button>
                ))}
              </div>
            ) : (
              <button key={item.to} type="button" onClick={() => goTo(item.to)}>
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </header>
  );
}
