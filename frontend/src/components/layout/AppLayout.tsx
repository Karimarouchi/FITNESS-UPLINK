import { useEffect, useState, type CSSProperties } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { fetchMyDebts } from "@/features/academy/api";
import { useAuth } from "@/features/auth/AuthContext";
import { useOnboardingLocale } from "@/features/onboarding/LocaleContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { hasPermission, isBackOfficeUser } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { BoSidebar } from "./shell/BoSidebar";
import { BoTopbar } from "./shell/BoTopbar";
import { NavSubTabs } from "./shell/RailNav";
import { pageArtFor } from "./shell/pageArt";
import { usesWorkspaceShell } from "./shell/shellNav";
import "./app-vantage.css";
import "@/shared/styles/backoffice-tokens.css";
import "@/shared/styles/backoffice-light.css";
import "@/features/theme/legacy-dark.generated.css";
import "@/features/theme/legacy-dark.css";
import "@/shared/styles/rail.css";

// the seven admin module pages (exact routes, no wildcard)
const ADMIN_MODULE_PAGES = [
  "/admin/subscriptions",
  "/admin/recruitment",
  "/admin/coaching",
  "/admin/services",
  "/admin/formation",
  "/admin/events",
  "/admin/news",
];

// account pages that have a Premium version in the back-office shell
const ACCOUNT_PAGES = [
  "/app/settings",
  "/app/profile",
  "/app/billing",
  "/notifications",
  "/app/marketplace/mine",
  "/app/marketplace/messages",
  "/app/opportunities",
  "/app/applications",
  "/contracts",
  "/app/coaching/agenda",
  "/app/coaching/services",
  "/app/coaching/packs",
];

export function AppLayout() {
  const { user } = useAuth();
  const { t } = useOnboardingLocale();
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const workspace = usesWorkspaceShell(user);
  const memberLike = !isBackOfficeUser(user);
  // A member who skipped a "pay on site" formation owes the amount: the account only reaches the payment pages.
  const [owesAcademy, setOwesAcademy] = useState(false);
  const canBrowseAcademy = !!user && hasPermission(user, PERMS.ACADEMY_BROWSE) && !hasPermission(user, PERMS.ACADEMY_MANAGE);
  useEffect(() => {
    if (!canBrowseAcademy) {
      setOwesAcademy(false);
      return;
    }
    fetchMyDebts()
      .then((debts) => setOwesAcademy(debts.length > 0))
      .catch(() => setOwesAcademy(false));
  }, [canBrowseAcademy, pathname]);
  const blockedByDebt = owesAcademy && !pathname.startsWith("/app/academy/registrations");
  // Pages already designed for both themes. The other pages keep their light content for now
  // (the shared sidebar and header still follow the theme).
  const themedPage =
    pathname === "/users" ||
    pathname === "/admin/verifications" ||
    pathname === "/admin/marketplace" ||
    pathname === "/admin/config/roles" ||
    pathname === "/admin/config/offres" ||
    pathname === "/admin/config/emails" ||
    ADMIN_MODULE_PAGES.includes(pathname) ||
    (workspace && ACCOUNT_PAGES.includes(pathname)) ||
    pathname === "/app/dashboard";
  // Roles that run a business tool (recruitment, agenda, formations) keep the full sidebar like the back-office;
  // the other roles (members, candidates, suppliers, providers, organizers, creators) get a top navigation bar.
  const managesWork =
    hasPermission(user, PERMS.HIRE_SEARCH) ||
    hasPermission(user, PERMS.HIRE_JOBS) ||
    hasPermission(user, PERMS.COACHING_MANAGE) ||
    hasPermission(user, PERMS.ACADEMY_MANAGE);
  const rail = workspace && memberLike && !managesWork;
  const art = pageArtFor(pathname, user);
  const artStyle = art ? ({ "--page-art": `url(/illustrations/${art}.png)` } as CSSProperties) : undefined;
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("fu.bo.sidebar") === "collapsed";
    } catch {
      return false;
    }
  });
  const [notice, setNotice] = useState(() => {
    try {
      return sessionStorage.getItem("fu.visibility.notice") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      try {
        localStorage.setItem("fu.bo.sidebar", value ? "open" : "collapsed");
      } catch {
        /* storage unavailable: the menu still toggles */
      }
      return !value;
    });
  }

  function dismissNotice() {
    try {
      sessionStorage.removeItem("fu.visibility.notice");
    } catch {
      /* ignore */
    }
    setNotice(false);
  }

  const visibilityBanner =
    memberLike && user && user.profileVisible === false ? (
      <div className="fu-visibility-banner">
        {t.visibilityTitle}. {t.visibilityEmpty}
      </div>
    ) : null;

  if (blockedByDebt) {
    return <Navigate to="/app/academy/registrations" replace />;
  }

  return (
    <div className="fu-app" id="app" lang="fr" dir="ltr">
      <div
        className={`app-shell is-admin bo-shell bo-light${collapsed ? " is-collapsed" : ""}${rail ? " is-rail" : ""}`}
        data-bo-theme={theme}
      >
        <BoSidebar open={menuOpen} onClose={() => setMenuOpen(false)} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        {menuOpen ? <div className="bo-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" /> : null}
                <div className={themedPage ? "bo-main is-themed" : "bo-main is-themed is-legacy vt-app"} data-art={art ?? undefined} style={artStyle}>
          <BoTopbar onMenu={() => setMenuOpen(true)} rail={rail} />
          {rail ? <NavSubTabs /> : null}
          <main className="bo-content main-content">
            {visibilityBanner}
            <Outlet />
          </main>
        </div>
      </div>
      {memberLike && notice && user && user.profileVisible === false ? (
        <div className="ob-visibility" role="dialog" aria-modal="true">
          <div className="ob-visibility-card">
            <h2>{t.visibilityTitle}</h2>
            <p>{t.visibilityLead}</p>
            <p>{t.visibilityEmpty}</p>
            <button className="ob-primary" type="button" onClick={dismissNotice}>
              {t.visibilityOk}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
