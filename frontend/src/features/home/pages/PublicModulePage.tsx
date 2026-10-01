import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import type { PublicModuleContent } from "../data";
import { PublicCta } from "../public/PublicCta";
import { PublicHero } from "../public/PublicHero";

type PublicModulePageProps = {
  content: PublicModuleContent;
};

export function PublicModulePage({ content }: PublicModulePageProps) {
  const { user } = useAuth();
  const primaryTo = user ? "/app/dashboard" : content.ctaHref ?? "/signup";
  const primaryLabel = user ? "Tableau de bord" : content.ctaLabel;

  return (
    <article>
      <PublicHero
        kicker={content.kicker}
        title={content.title}
        lead={content.lead}
        image={content.image}
        highlights={content.highlights}
        actions={
          <>
            <Link className="pub-btn pub-btn-lime" to={primaryTo}>
              {primaryLabel}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <Link className="pub-btn pub-btn-line" to="/tarifs">
              Voir les tarifs
            </Link>
          </>
        }
      />

      <section className="pub-section">
        <div className="pub-wrap">
          <header className="pub-section-head">
            <p className="pub-kicker ink">Ce que ça ouvre</p>
            <h2>Tout le métier, sur un seul compte.</h2>
            <p>Chaque fonctionnalité est pensée pour les pros du fitness — et connectée au reste de l’écosystème.</p>
          </header>
          <ul className="pub-features">
            {content.points.map((point) => (
              <li key={point.title}>
                <span className="pub-feature-icon material-symbols-outlined" aria-hidden="true">
                  {point.icon ?? "check_circle"}
                </span>
                <h3>{point.title}</h3>
                <p>{point.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {content.promise ? (
        <section className="pub-promise">
          <div className="pub-promise-media" style={{ backgroundImage: `url(${content.image})` }} aria-hidden="true" />
          <div className="pub-wrap pub-promise-inner">
            <p className="pub-kicker">La promesse</p>
            <h2>{content.promise.title}</h2>
            <p>{content.promise.text}</p>
            <Link className="pub-btn pub-btn-volt" to={primaryTo}>
              {user ? "Ouvrir mon espace" : "Commencer gratuitement"}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      ) : null}

      <PublicCta
        title="Entrez dans le circuit."
        lead="Un compte, un dossier vérifié, l’accès à ce module et à tout l’écosystème Fitness Universe."
        primaryTo={primaryTo}
        primaryLabel={primaryLabel}
        secondaryTo="/tarifs"
        secondaryLabel="Comparer les offres"
      />
    </article>
  );
}
