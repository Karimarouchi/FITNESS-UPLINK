import { Link } from "react-router-dom";
import { PUBLIC_NAV_LINKS } from "@/components/public/publicData";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
        <div className="pf-grid">
          <div className="pf-brand">
            <Link className="pf-logo" to="/">
              <BrandLogo to={null} />
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
          <span>© {new Date().getFullYear()} Uplink Fitness. Tous droits réservés.</span>
          <span>Confidentialité · Conditions · Contact</span>
        </div>
      </div>
    </footer>
  );
}
