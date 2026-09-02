import { Link } from "react-router-dom";
import type { HeroStat } from "../data";
import { StatsPanel } from "./StatsPanel";

type HeroProps = {
  stats: HeroStat[];
};

export function Hero({ stats }: HeroProps) {
  return (
    <section className="fu-hero" aria-labelledby="fu-hero-title">
      <div className="fu-hero-inner">
        <div className="fu-hero-copy">
          <h1 className="fu-hero-title" id="fu-hero-title">
            Toute l&apos;industrie
            <br />
            du fitness,
            <br />
            sur le même
            <br />
            terrain.
          </h1>
          <p className="fu-hero-lead">
            Recrutement, coaching, académie et marketplace — le réseau qui relie les professionnels, les salles et les talents du monde entier.
          </p>
          <div className="fu-hero-ctas">
            <Link className="fu-btn fu-btn--lime" to="/signup">
              Trouver un professionnel
            </Link>
            <Link className="fu-btn fu-btn--outline" to="/signup">
              Créer un profil
            </Link>
          </div>
        </div>
        <StatsPanel stats={stats} />
      </div>
    </section>
  );
}
