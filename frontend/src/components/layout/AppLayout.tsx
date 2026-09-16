import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isBackOfficeUser } from "@/features/auth/types";
import { useOnboardingLocale } from "@/features/onboarding/LocaleContext";
import { AppNavbar } from "./AppNavbar";
import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { ChatWidget } from "@/features/recruitment/ChatWidget";

export function AppLayout() {
  const { user } = useAuth();
  const { t } = useOnboardingLocale();
  const backOffice = isBackOfficeUser(user);
  const [notice, setNotice] = useState(() => {
    try {
      return sessionStorage.getItem("fu.visibility.notice") === "1";
    } catch {
      return false;
    }
  });

  function dismissNotice() {
    try {
      sessionStorage.removeItem("fu.visibility.notice");
    } catch {
      /* ignore */
    }
    setNotice(false);
  }

  return (
    <div className="fu-app" id="app" lang="fr" dir="ltr">
      <div className={backOffice ? "app-shell is-admin" : "app-shell"}>
        {backOffice ? <AppSidebar /> : <AppNavbar />}
        <div className="main">
          {backOffice ? <AppTopbar /> : null}
          <div className="main-content">
            {!backOffice && user && user.profileVisible === false ? (
              <div className="fu-visibility-banner">
                {t.visibilityTitle}. {t.visibilityEmpty}
              </div>
            ) : null}
            <Outlet />
          </div>
        </div>
      </div>
      {!backOffice && notice && user && user.profileVisible === false ? (
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
      {!backOffice ? <ChatWidget /> : null}
    </div>
  );
}
