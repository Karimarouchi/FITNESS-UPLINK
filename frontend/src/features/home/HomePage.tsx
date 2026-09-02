import { Hero } from "./components/Hero";
import { ModulesGrid } from "./components/ModulesGrid";
import { PublicLayout } from "./components/PublicLayout";
import { HERO_STATS, MODULES } from "./data";

export function HomePage() {
  return (
    <PublicLayout>
      <Hero stats={HERO_STATS} />
      <ModulesGrid modules={MODULES} />
    </PublicLayout>
  );
}
