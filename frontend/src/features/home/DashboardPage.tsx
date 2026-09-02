import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isSuperAdmin, isVerified } from "@/features/auth/types";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { VerificationBadge } from "@/shared/components/VerificationBadge";

export function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Profil";

  return (
    <section className="home-welcome">
      <p className="font-label-caps uppercase text-on-surface-variant mb-2">Tableau de bord</p>
      <h1 className="font-display-lg-mobile text-primary mb-3">Bonjour, {user?.firstName}</h1>
      <Link to="/app/profile" className="home-profile-card">
        <ProfileAvatar uploadId={user?.avatarUploadId} name={displayName} size={88} />
        <div className="home-profile-copy">
          <div className="talent-card-title">
            <p className="home-profile-name">{displayName}</p>
            <VerificationBadge verified={isVerified(user)} />
          </div>
          <p className="font-body-md text-on-surface-variant">
            {user?.role?.label ?? "Membre"}
            {user?.country ? ` · ${user.country.flagEmoji} ${user.country.name}` : ""}
          </p>
          <p className="home-profile-action">
            Voir et modifier mon profil
            <span className="material-symbols-outlined">arrow_forward</span>
          </p>
        </div>
      </Link>
      {isBusiness(user) ? (
        <>
          <Link to="/candidates" className="home-profile-card">
            <span className="home-shortcut-icon material-symbols-outlined">groups</span>
            <div className="home-profile-copy">
              <p className="home-profile-name">Recherche de talents</p>
              <p className="font-body-md text-on-surface-variant">Consultez les fiches et enregistrez vos favoris.</p>
            </div>
          </Link>
          <Link to="/pipeline" className="home-profile-card">
            <span className="home-shortcut-icon material-symbols-outlined">view_kanban</span>
            <div className="home-profile-copy">
              <p className="home-profile-name">Pipeline de recrutement</p>
              <p className="font-body-md text-on-surface-variant">Suivez les candidats avec lesquels vous avez démarré un recrutement.</p>
            </div>
          </Link>
          <Link to="/favorites" className="home-profile-card">
            <span className="home-shortcut-icon material-symbols-outlined">favorite</span>
            <div className="home-profile-copy">
              <p className="home-profile-name">Favoris</p>
              <p className="font-body-md text-on-surface-variant">Retrouvez les profils que vous avez sauvegardés.</p>
            </div>
          </Link>
        </>
      ) : null}
      {isSuperAdmin(user) ? (
        <Link to="/admin/verifications" className="home-profile-card">
          <span className="home-shortcut-icon material-symbols-outlined">verified_user</span>
          <div className="home-profile-copy">
            <p className="home-profile-name">Candidats et employeurs</p>
            <p className="font-body-md text-on-surface-variant">Consultez tous les inscrits, examinez les pièces et validez les comptes.</p>
          </div>
        </Link>
      ) : null}
    </section>
  );
}
