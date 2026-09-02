import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useAuth } from "@/features/auth/AuthContext";
import { useOwnProfile } from "@/features/me/ownProfile";
import { useNavigate } from "react-router-dom";

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { profile } = useOwnProfile();
  const navigate = useNavigate();

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Paramètres</h1>
        </div>
      </div>
      <Panel title="Compte">
        <div className="info-grid">
          <div className="info-cell">
            <div className="k">Adresse e-mail</div>
            <div className="v">{user?.email}</div>
          </div>
          <div className="info-cell">
            <div className="k">Téléphone</div>
            <div className="v">{profile?.phone || "—"}</div>
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
        <div className="settings-section">
          <Button variant="primary" to="/app/profile/edit">
            Modifier le profil
          </Button>
        </div>
      </Panel>
      <Panel>
        <div className="danger-zone">
          <div>
            <div className="k">Déconnexion</div>
            <div className="s">Fermer la session sur cet appareil</div>
          </div>
          <Button
            variant="danger"
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
