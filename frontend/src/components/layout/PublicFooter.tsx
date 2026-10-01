import { Link } from "react-router-dom";
import { PUBLIC_NAV_LINKS } from "@/components/public/publicData";
import { useAuth } from "@/features/auth/AuthContext";

const PLATFORM_LINKS = [
  { label: "Services salles", href: "/services" },
  { label: "Tarifs", href: "/tarifs" },
  { label: "Créer un compte", href: "/signup" },
  { label: "Se connecter", href: "/login" },
];

export function PublicFooter() {
  const { user } = useAuth();
  const modules = PUBLIC_NAV_LINKS.filter((link) => link.href !== "/tarifs");

  return (
    <footer className="pf">
      <div className="pf-wrap">
        <div className="pf-band">
          <div>
            <p className="pf-kicker">{user ? `Content de vous revoir, ${user.firstName}` : "Rejoignez le réseau"}</p>
            <h2>{user ? "Votre espace vous attend." : "Un compte. Tout le circuit du fitness."}</h2>
          </div>
          <Link className="pf-cta" to={user ? "/app/dashboard" : "/signup"}>
            {user ? "Ouvrir mon tableau de bord" : "Créer mon compte gratuitement"}
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>

        <div className="pf-grid">
          <div className="pf-brand">
            <Link className="pf-logo" to="/">
              <span aria-hidden="true">F</span>
              Fitness Universe
            </Link>
            <p>
              Le circuit mondial du fitness : recrutement d’élite, coaching privé, formation, matériel et événements —
              sur un seul compte vérifié.
            </p>
            <ul className="pf-badges">
              <li>
                <span className="material-symbols-outlined" aria-hidden="true">
                  verified_user
                </span>
                Profils vérifiés
              </li>
              <li>
                <span className="material-symbols-outlined" aria-hidden="true">
                  public
                </span>
                Mobilité internationale
              </li>
            </ul>
          </div>

          <nav className="pf-col" aria-label="Modules">
            <h3>Modules</h3>
            {modules.map((link) => (
              <Link key={link.href} to={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>

          <nav className="pf-col" aria-label="Plateforme">
            <h3>Plateforme</h3>
            {(user
              ? [
                  { label: "Tableau de bord", href: "/app/dashboard" },
                  { label: "Mon profil", href: "/app/profile" },
                  { label: "Abonnement", href: "/app/billing" },
                  { label: "Tarifs", href: "/tarifs" },
                ]
              : PLATFORM_LINKS
            ).map((link) => (
              <Link key={link.href} to={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="pf-meta">
          <span>© {new Date().getFullYear()} Fitness Universe. Tous droits réservés.</span>
          <span>Confidentialité · Conditions · Contact</span>
        </div>
      </div>
    </footer>
  );
}
