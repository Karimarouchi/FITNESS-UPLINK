import { Link, useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { NotificationPrefs } from "@/features/notifications/NotificationPrefs";
import { EmployerMailSettings } from "@/features/recruitment/EmployerMailSettings";
import { useOwnProfile } from "@/features/me/ownProfile";
import { usesWorkspaceShell } from "@/components/layout/shell/shellNav";
import { Btn, Card } from "./settingsUi";
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { profile } = useOwnProfile();
  const navigate = useNavigate();
  // the back-office shell carries the Premium design system; the member shell keeps the legacy look
  const premium = usesWorkspaceShell(user);

  function signOut() {
    void logout().then(() => navigate("/login", { replace: true }));
  }

  const facts = [
    { k: "Adresse e-mail", v: user?.email },
    { k: "Téléphone", v: profile?.phone || "—" },
    { k: "Rôle", v: user?.role?.label ?? "—" },
    { k: "Pays", v: user?.country ? `${user.country.flagEmoji} ${user.country.name}` : "—" },
  ];

  if (premium) {
    return (
      <section className="bo-dash bo-users bo-bm bo-ml bo-st" lang="fr">
        <header className="bo-dash-head">
          <div>
            <h1>Paramètres</h1>
            <p>Profil, notifications, e-mails de recrutement et session.</p>
          </div>
          <div className="st-head-actions">
            <Link to="/app/billing" className="bm-btn is-outline">
              Abonnement
            </Link>
            <Link to="/app/profile/edit" className="bm-btn">
              Modifier le profil
            </Link>
          </div>
        </header>

        <Card premium title="Compte" icon={ShieldCheck} tone="is-blue">
          <dl className="st-facts">
            {facts.map((item) => (
              <div key={item.k} className="st-fact">
                <dt>{item.k}</dt>
                <dd dir="ltr">{item.v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <NotificationPrefs premium />

        {hasPermission(user, PERMS.HIRE_PIPELINE) ? <EmployerMailSettings premium /> : null}

        <Card premium title="Session" icon={LogOut} tone="is-rose">
          <div className="st-session">
            <div>
              <strong>Déconnexion</strong>
              <span>Fermer la session sur cet appareil</span>
            </div>
            <Btn premium variant="danger" type="button" onClick={signOut}>
              Se déconnecter
            </Btn>
          </div>
        </Card>
      </section>
    );
  }

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

      <Card premium={false} title="Compte">
        <div className="info-grid settings-facts">
          {facts.map((item) => (
            <div key={item.k} className="info-cell">
              <div className="k">{item.k}</div>
              <div className="v" dir="ltr">
                {item.v}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <NotificationPrefs />

      {hasPermission(user, PERMS.HIRE_PIPELINE) ? <EmployerMailSettings /> : null}

      <Card premium={false} title="Session">
        <div className="danger-zone">
          <div>
            <div className="k">Déconnexion</div>
            <div className="s">Fermer la session sur cet appareil</div>
          </div>
          <Btn premium={false} variant="danger" type="button" onClick={signOut}>
            Se déconnecter
          </Btn>
        </div>
      </Card>
    </section>
  );
}
