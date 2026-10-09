import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useOnboardingLocale } from "@/features/onboarding/LocaleContext";
import { AppNavbar } from "./AppNavbar";
import { BoSidebar } from "./shell/BoSidebar";
import { BoTopbar } from "./shell/BoTopbar";
import { isSupplierWorkspace, usesWorkspaceShell } from "./shell/shellNav";
import { ChatWidget } from "@/features/recruitment/ChatWidget";
import "./app-vantage.css";

export function AppLayout() {
  const { user } = useAuth();
  const { t } = useOnboardingLocale();
  const { pathname } = useLocation();
  const workspace = usesWorkspaceShell(user);
  const memberLike = !workspace || isSupplierWorkspace(user);
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <div className="fu-app" id="app" lang="fr" dir="ltr">
      {workspace ? (
        <div className="app-shell is-admin bo-shell">
          <BoSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
          {menuOpen ? <div className="bo-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" /> : null}
          <div className="bo-main">
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
