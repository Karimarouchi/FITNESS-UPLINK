import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import "@/features/home/public/public.css";
import "./public-shell.css";

export function PublicLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="fu-public" lang="fr">
      <PublicNavbar />
      <main className="fu-public-main">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
