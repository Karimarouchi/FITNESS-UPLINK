import { Outlet } from "react-router-dom";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicNavbar } from "@/components/layout/PublicNavbar";

export function PublicLayout() {
  return (
    <div className="fu-public" lang="fr">
      <PublicNavbar />
      <Outlet />
      <PublicFooter />
    </div>
  );
}
