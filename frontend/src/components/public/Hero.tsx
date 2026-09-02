import { Button } from "@/components/ui/Button";
import { StatsPanel } from "./StatsPanel";

export function Hero() {
  return (
    <section className="hero">
      <div>
        <h1>
          Connecter
          <br />
          l&apos;industrie
          <br />
          <span className="accent">mondiale</span> du fitness
        </h1>
        <p>
          Recrutement, coaching, formation et équipement — un seul écosystème pour les professionnels, salles de sport et
          prestataires du fitness.
        </p>
        <div className="hero-ctas">
          <Button variant="solid" to="/signup">
            Trouver un professionnel
          </Button>
          <Button variant="outline" to="/signup">
            Créer un profil
          </Button>
        </div>
      </div>
      <StatsPanel />
    </section>
  );
}
