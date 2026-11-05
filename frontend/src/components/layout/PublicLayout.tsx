import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import "@/features/home/public/public.css";
import "./public-shell.css";
import "@/features/theme/public-dark.generated.css";
import "@/features/theme/public-dark.css";
import { useTheme } from "@/features/theme/ThemeContext";

export function PublicLayout() {
  const { pathname } = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="fu-public" lang="fr" data-bo-theme={theme}>
      <PublicNavbar />
      <main className="fu-public-main">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
