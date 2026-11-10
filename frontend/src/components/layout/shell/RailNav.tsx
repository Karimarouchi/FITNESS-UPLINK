import { useMemo } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight, Moon, Plus, Sun, type LucideIcon } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission, type AuthUser } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { useMarketplaceUnread } from "@/features/marketplace/useMarketplaceUnread";
import { useNotifications } from "@/features/notifications/useNotifications";
import { useTheme } from "@/features/theme/ThemeContext";
import { isSupplierWorkspace, shellSectionsFor, type ShellGroup, type ShellItem, type ShellLink } from "./shellNav";

// These catalogues are public pages, outside the shell.
const PUBLIC_PATHS = ["/academie", "/marketplace/products"];

function isOn(pathname: string, link: ShellLink) {
  if (link.external) return false;
  if (link.end) return pathname === link.to;
  return pathname === link.to || pathname.startsWith(`${link.to}/`);
}

/** Where a rail icon leads: a group opens its first page that stays inside the shell. */
function groupHome(group: ShellGroup) {
  return group.children.find((child) => !PUBLIC_PATHS.includes(child.to)) ?? group.children[0];
}

function asRailLink(item: ShellItem): ShellLink {
  return item.kind === "group" ? { ...groupHome(item), label: item.label, icon: item.icon } : item;
}

function itemIsOn(pathname: string, item: ShellItem) {
  return item.kind === "group" ? item.children.some((child) => isOn(pathname, child)) : isOn(pathname, item);
}

/** The curved icon rail. Each entry is a section; the pages inside a section are the tabs of the top bar. */
export function RailMenu() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { unreadCount } = useNotifications();
  const unreadMessages = useMarketplaceUnread(isSupplierWorkspace(user) || hasPermission(user, PERMS.MARKETPLACE_BROWSE));
  const sections = useMemo(() => shellSectionsFor(user), [user]);
  const badges = { marketplaceUnread: unreadMessages, notifications: unreadCount };

  return (
    <div className="mb-rail-slot">
      <nav className="mb-rail" aria-label="Navigation principale">
        <svg className="mb-rail-cap" viewBox="0 0 88 76" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0C0 44 88 26 88 76H0Z" />
        </svg>
        <div className="mb-rail-body">
          {sections.map((section) => (
            <div className="mb-rail-group" key={section.title}>
              {section.items.filter((item) => item.kind === "group" || item.to !== "/notifications").map((item) => {
                const link = asRailLink(item);
                const Icon = link.icon;
                const count = item.kind === "group" ? 0 : item.badge ? badges[item.badge] : 0;
                const inner = (
                  <>
                    <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                    <span className="mb-rail-tip">{link.label}</span>
                    {count > 0 ? <span className="mb-rail-count">{count > 9 ? "9+" : count}</span> : null}
                  </>
                );
                return link.external ? (
                  <a key={link.to} href={link.to} target="_blank" rel="noreferrer" aria-label={link.label} className="mb-rail-link">
                    {inner}
                  </a>
                ) : (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    aria-label={link.label}
                    className={itemIsOn(pathname, item) ? "mb-rail-link is-on" : "mb-rail-link"}
                  >
                    {inner}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
        <svg className="mb-rail-cap" viewBox="0 0 88 76" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 76C0 32 88 50 88 0H0Z" />
        </svg>
      </nav>
    </div>
  );
}

/** The pages of the current section, or the first main sections on a page that has none. */
export function RailTabs() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const tabs = useMemo(() => {
    const sections = shellSectionsFor(user);
    const current = sections
      .flatMap((section) => section.items)
      .find((item): item is ShellGroup => item.kind === "group" && item.children.some((child) => isOn(pathname, child)));
    if (current) return current.children;
    return sections
      .filter((section) => section.title !== "Compte")
      .flatMap((section) => section.items)
      .map(asRailLink)
      .filter((link) => !link.external)
      .slice(0, 3);
  }, [pathname, user]);

  return (
    <nav className="mb-tabs" aria-label="Pages de la section">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={isOn(pathname, tab) ? "mb-tab is-on" : "mb-tab"}>
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

/** Top navigation of the roles without a side menu: one tab per section of their workspace. */
export function NavTabs() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const items = useMemo(
    () =>
      shellSectionsFor(user)
        .filter((section) => section.title !== "Compte")
        .flatMap((section) => section.items),
    [user],
  );
  return (
    <nav className="mb-tabs" aria-label="Navigation principale">
      {items.map((item) => {
        const link = asRailLink(item);
        const Icon = link.icon;
        if (link.external) return null;
        return (
          <NavLink key={link.to} to={link.to} end={link.end} className={itemIsOn(pathname, item) ? "mb-tab is-on" : "mb-tab"}>
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
            {link.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

/** Second row of the top navigation: the pages of the section being viewed (only when it has several). */
export function NavSubTabs() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const group = useMemo(
    () =>
      shellSectionsFor(user)
        .flatMap((section) => section.items)
        .find((item): item is ShellGroup => item.kind === "group" && item.children.some((child) => isOn(pathname, child))),
    [pathname, user],
  );
  if (!group || group.children.length < 2) return null;
  return (
    <nav className="mb-subtabs" aria-label={`Pages de ${group.label}`}>
      {group.children.map((child) => (
        <NavLink key={child.to} to={child.to} end={child.end} className={isOn(pathname, child) ? "mb-subtab is-on" : "mb-subtab"}>
          {child.label}
        </NavLink>
      ))}
    </nav>
  );
}

function mainActionFor(user: AuthUser | null): { to: string; label: string; icon: LucideIcon } | null {
  if (hasPermission(user, PERMS.HIRE_JOBS)) return { to: "/job-offers", label: "Mes offres d’emploi", icon: ArrowRight };
  if (hasPermission(user, PERMS.HIRE_APPLY)) return { to: "/app/opportunities", label: "Voir les opportunités", icon: ArrowRight };
  if (hasPermission(user, PERMS.COACHING_MANAGE)) return { to: "/app/coaching/agenda", label: "Mon agenda", icon: ArrowRight };
  if (hasPermission(user, PERMS.MARKETPLACE_MANAGE)) return { to: "/app/marketplace/mine?new=1", label: "Nouvel article", icon: Plus };
  if (hasPermission(user, PERMS.ACADEMY_MANAGE)) return { to: "/app/academy/formations", label: "Mes formations", icon: ArrowRight };
  if (hasPermission(user, PERMS.SERVICES_MANAGE)) return { to: "/app/services/mine", label: "Mes services", icon: ArrowRight };
  if (hasPermission(user, PERMS.COACHING_DISCOVER)) return { to: "/coaches", label: "Réserver une séance", icon: Plus };
  return null;
}

/** The dark button of the top bar: the thing this role does most. */
export function RailAction() {
  const { user } = useAuth();
  const action = mainActionFor(user);
  if (!action) return null;
  const Icon = action.icon;
  return (
    <Link className="mb-cta" to={action.to} aria-label={action.label} title={action.label}>
      <Icon size={15} aria-hidden="true" />
      <span>{action.label}</span>
    </Link>
  );
}

/** Labelled light / dark switch of the top bar. */
export function RailThemeSwitch() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <div className="mb-theme" role="group" aria-label="Thème">
      <button type="button" className={isDark ? "" : "is-on"} aria-label="Mode clair" aria-pressed={!isDark} onClick={isDark ? toggleTheme : undefined}>
        <Sun size={14} aria-hidden="true" />
        <span>Clair</span>
      </button>
      <button type="button" className={isDark ? "is-on" : ""} aria-label="Mode sombre" aria-pressed={isDark} onClick={isDark ? undefined : toggleTheme}>
        <Moon size={14} aria-hidden="true" />
        <span>Sombre</span>
      </button>
    </div>
  );
}
