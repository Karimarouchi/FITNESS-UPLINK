import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import "./hero.css";

export function HomeHero() {
  const { user } = useAuth();

  const primaryTo = user ? "/app/dashboard" : "/signup";
  const primaryLabel = user ? "Mon tableau de bord" : "Rejoindre le réseau";
  const secondaryTo = user ? "/app/profile" : "/fitness-hire-elite";
  const secondaryLabel = user ? "Mon profil" : "Découvrir Hire Elite";

  return (
    <section className="vx" aria-label="Fitness Universe">
      {/* layer 1 — sky */}
      <div className="vx-sky" aria-hidden="true" />

      {/* layer 2 — headline */}
      <h1 className="vx-title">Plus de mouvement</h1>

      {/* layer 3 — athlete (overflows onto the next section) */}
      <img className="vx-athlete" src="/media/tennisMan.png" alt="" aria-hidden="true" />

      <div className="vx-ui">
        <div className="vx-row">
          <div className="vx-actions">
            <Link className="vx-btn vx-btn-lime" to={primaryTo}>
              {primaryLabel}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <Link className="vx-btn vx-btn-line" to={secondaryTo}>
              {secondaryLabel}
              <span className="material-symbols-outlined" aria-hidden="true">
                north_east
              </span>
            </Link>
          </div>
          <p className="vx-pitch">
            {user
              ? `Bon retour, ${user.firstName || user.displayName}. Opportunités, séances, formations et devis — votre réseau avance, reprenez la main.`
              : "Le fitness pour ceux qui traitent chaque séance comme une décision. Recrutement, coaching, formation et matériel — construits autour de vous."}
          </p>
        </div>

        <div className="vx-meta">
          <div>
            <b>Est. 2026</b>
            <span>Tunis · International</span>
          </div>
          <div>
            <b>Profils vérifiés</b>
            <span>Coachs · Salles · Académies</span>
          </div>
        </div>
      </div>
    </section>
  );
}
