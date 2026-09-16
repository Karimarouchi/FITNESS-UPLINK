import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { NotificationPrefs } from "@/features/notifications/NotificationPrefs";
import { EmployerMailSettings } from "@/features/recruitment/EmployerMailSettings";
import { useOwnProfile } from "@/features/me/ownProfile";
import { useNavigate } from "react-router-dom";

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { profile } = useOwnProfile();
  const navigate = useNavigate();

  return (
    <section className="hire-page settings-page" dir="ltr" lang="fr">
      <div className="page-head settings-head">
        <div>
          <h1>Paramètres</h1>
          <p className="sub">Profil, notifications, e-mails de recrutement et session.</p>
        </div>
        <div className="head-actions">
          <Button variant="outline" to="/app/billing">
            Abonnement
          </Button>
          <Button variant="primary" to="/app/profile/edit">
            Modifier le profil
          </Button>
        </div>
      </div>

      <Panel title="Compte" body>
        <div className="info-grid settings-facts">
          <div className="info-cell">
            <div className="k">Adresse e-mail</div>
            <div className="v" dir="ltr">
              {user?.email}
            </div>
          </div>
          <div className="info-cell">
            <div className="k">Téléphone</div>
            <div className="v" dir="ltr">
              {profile?.phone || "—"}
            </div>
          </div>
          <div className="info-cell">
            <div className="k">Rôle</div>
            <div className="v">{user?.role?.label ?? "—"}</div>
          </div>
          <div className="info-cell">
            <div className="k">Pays</div>
            <div className="v">{user?.country ? `${user.country.flagEmoji} ${user.country.name}` : "—"}</div>
          </div>
        </div>
      </Panel>

      <NotificationPrefs />

      {hasPermission(user, PERMS.HIRE_PIPELINE) ? <EmployerMailSettings /> : null}

      <Panel title="Session" body>
        <div className="danger-zone">
          <div>
            <div className="k">Déconnexion</div>
            <div className="s">Fermer la session sur cet appareil</div>
          </div>
          <Button
            variant="danger"
            type="button"
            onClick={() => {
              void logout().then(() => navigate("/login", { replace: true }));
            }}
          >
            Se déconnecter
          </Button>
        </div>
      </Panel>
    </section>
  );
}
