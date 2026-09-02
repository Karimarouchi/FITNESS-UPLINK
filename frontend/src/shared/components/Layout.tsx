import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isCandidate, isSuperAdmin, isVerified } from "@/features/auth/types";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";

type LayoutProps = {
  children?: ReactNode;
};

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const displayName = user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Profil";

  return (
    <div className="min-h-screen bg-surface">
      <header className="app-topbar">
        <p className="font-headline-md tracking-tight text-primary-container">Fitness Uplink</p>
        <nav className="flex items-center gap-6">
          <NavLink className={({ isActive }) => (isActive ? "text-secondary font-semibold" : "text-on-surface-variant")} to="/app/dashboard" end>
            Accueil
          </NavLink>
          {isBusiness(user) ? (
            <>
              <NavLink className={({ isActive }) => (isActive ? "text-secondary font-semibold" : "text-on-surface-variant")} to="/candidates">
                Recherche de talents
              </NavLink>
              <NavLink className={({ isActive }) => (isActive ? "text-secondary font-semibold" : "text-on-surface-variant")} to="/favorites">
                Favoris
              </NavLink>
              <NavLink className={({ isActive }) => (isActive ? "text-secondary font-semibold" : "text-on-surface-variant")} to="/pipeline">
                Pipeline de recrutement
              </NavLink>
              <NavLink className={({ isActive }) => (isActive ? "text-secondary font-semibold" : "text-on-surface-variant")} to="/job-offers">
                Offres d’emploi
              </NavLink>
              <NavLink className={({ isActive }) => (isActive ? "text-secondary font-semibold" : "text-on-surface-variant")} to="/contracts">
                Contrats
              </NavLink>
            </>
          ) : null}
          {isSuperAdmin(user) ? (
              <NavLink className={({ isActive }) => (isActive ? "text-secondary font-semibold" : "text-on-surface-variant")} to="/admin/verifications">
                Candidats & employeurs
              </NavLink>
          ) : null}
          {isCandidate(user) ? (
            <NavLink className={({ isActive }) => (isActive ? "text-secondary font-semibold" : "text-on-surface-variant")} to="/contracts">
              Mes contrats
            </NavLink>
          ) : null}
          <NavLink className={({ isActive }) => (isActive ? "text-secondary font-semibold" : "text-on-surface-variant")} to="/notifications">
            Notifications
          </NavLink>
          <NavLink to="/app/profile" className="app-avatar-link" title="Mon profil" aria-label="Voir et modifier mon profil">
            <span className="app-avatar-wrap">
              <ProfileAvatar uploadId={user?.avatarUploadId} name={displayName} size={40} />
              {isVerified(user) ? <span className="avatar-verified material-symbols-outlined">verified</span> : null}
            </span>
          </NavLink>
          <button className="font-label-caps uppercase text-secondary" type="button" onClick={() => void logout()}>
            Déconnexion
          </button>
        </nav>
      </header>
      <main className="max-w-[1280px] mx-auto px-6 py-8">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
