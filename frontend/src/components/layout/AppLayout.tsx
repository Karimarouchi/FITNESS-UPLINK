import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { fetchMyDebts } from "@/features/academy/api";
import { useAuth } from "@/features/auth/AuthContext";
import { useOnboardingLocale } from "@/features/onboarding/LocaleContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { hasPermission, isBackOfficeUser, isSuperAdmin } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { AppNavbar } from "./AppNavbar";
import { BoSidebar } from "./shell/BoSidebar";
import { BoTopbar } from "./shell/BoTopbar";
import { isSupplierWorkspace, usesWorkspaceShell } from "./shell/shellNav";
import { ChatWidget } from "@/features/recruitment/ChatWidget";
import "./app-vantage.css";
import "@/shared/styles/backoffice-tokens.css";
import "@/shared/styles/backoffice-light.css";
import "@/features/theme/legacy-dark.generated.css";
import "@/features/theme/legacy-dark.css";

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

/** Same rule as DashboardPage: these accounts get the professional dashboard. */
function usesProDashboard(user: ReturnType<typeof useAuth>["user"]) {
  if (isSuperAdmin(user) || hasPermission(user, PERMS.HIRE_PIPELINE)) return false;
  return (
    hasPermission(user, PERMS.HIRE_APPLY) ||
    (hasPermission(user, PERMS.HIRE_PROFILE) && hasPermission(user, PERMS.COACHING_MANAGE))
  );
}

/** Members (and any account without a dedicated workspace) get the member dashboard: same fall-through order as DashboardPage. */
function usesMemberDashboard(user: ReturnType<typeof useAuth>["user"]) {
  if (isSuperAdmin(user) || usesProDashboard(user) || isSupplierWorkspace(user)) return false;
  return !(
    hasPermission(user, PERMS.HIRE_PIPELINE) ||
    hasPermission(user, PERMS.ACADEMY_MANAGE) ||
    hasPermission(user, PERMS.SERVICES_MANAGE) ||
    hasPermission(user, PERMS.EVENTS_MANAGE) ||
    hasPermission(user, PERMS.CONTENT_PUBLISH) ||
    hasPermission(user, PERMS.COACHING_MANAGE)
  );
}

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
    (pathname === "/app/dashboard" && (isSuperAdmin(user) || isSupplierWorkspace(user) || usesProDashboard(user) || usesMemberDashboard(user) || hasPermission(user, PERMS.HIRE_PIPELINE)));
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
      {workspace ? (
        <div
          className={collapsed ? "app-shell is-admin bo-shell bo-light is-collapsed" : "app-shell is-admin bo-shell bo-light"}
          data-bo-theme={theme}
        >
          <BoSidebar open={menuOpen} onClose={() => setMenuOpen(false)} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
          {menuOpen ? <div className="bo-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" /> : null}
          <div className={themedPage ? "bo-main is-themed" : "bo-main is-themed is-legacy vt-app"}>
            <BoTopbar onMenu={() => setMenuOpen(true)} />
            <main className="bo-content main-content">
              {visibilityBanner}
              <Outlet />
            </main>
          </div>
        </div>
      ) : (
        <div className="app-shell vt-app">
          <AppNavbar />
          <div className="main">
            <div className="main-content">
              {visibilityBanner}
              <Outlet />
            </div>
          </div>
        </div>
      )}
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
      {!workspace ? <ChatWidget /> : null}
    </div>
  );
}
