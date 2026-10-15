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
      <div className="vx-inner">
        <div className="vx-copy">
          <h1 className="vx-title">
            Plus de
            <span>mouvement</span>
          </h1>
          <p className="vx-pitch">
            {user
              ? `Bon retour, ${user.firstName || user.displayName}. Opportunités, séances, formations et devis — votre réseau avance, reprenez la main.`
              : "Le fitness pour ceux qui traitent chaque séance comme une décision. Recrutement, coaching, formation et matériel — construits autour de vous."}
          </p>
          <div className="vx-actions">
            <Link className="vx-btn vx-btn-fill" to={primaryTo}>
              {primaryLabel}
            </Link>
            <Link className="vx-btn vx-btn-line" to={secondaryTo}>
              {secondaryLabel}
            </Link>
          </div>
        </div>

        <div className="vx-stage" aria-hidden="true">
          <span className="vx-orbit vx-orbit-a" />
          <span className="vx-orbit vx-orbit-b" />
          <img className="vx-athlete" src="/media/tennis-hero-gradient.png" alt="" />
          <img className="vx-ball vx-ball-basket" src="/media/basket.png" alt="" />
          <img className="vx-ball vx-ball-foot-sm" src="/media/foot.png" alt="" />
        </div>
      </div>
    </section>
  );
}
