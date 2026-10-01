import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import {
  LANDING_AUDIENCES,
  LANDING_FAQ,
  LANDING_MODULES,
  LANDING_PILLARS,
  LANDING_ROLES,
  LANDING_SHORTCUTS,
  LANDING_STATS,
  LANDING_STEPS,
  LANDING_TRUST,
} from "./content";
import { HomeShowcase } from "./HomeShowcase";
import "./landing.css";

const FEATURED = LANDING_MODULES[0];
const OTHER_MODULES = LANDING_MODULES.slice(1);

export function HomeLanding() {
  const { user } = useAuth();
  const primaryTo = user ? "/app/dashboard" : "/signup";
  const primaryLabel = user ? "Tableau de bord" : "Rejoindre le réseau";
  const secondaryTo = user ? "/app/profile" : "/fitness-hire-elite";
  const secondaryLabel = user ? "Mon profil" : "Découvrir Hire Elite";

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(".fu-home [data-reveal]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("is-in"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="fu-home">
      <section className="home-hero">
        <div className="home-hero-media" aria-hidden="true" />
        <div className="home-hero-shade" aria-hidden="true" />
        <div className="home-wrap home-hero-grid">
          <div className="home-hero-copy" data-reveal>
            <p className="home-kicker home-kicker-pill">
              <span className="home-dot" aria-hidden="true" />
              {user ? `Bon retour, ${user.firstName || user.displayName}` : "L’écosystème mondial du fitness"}
            </p>
            <h1>
              Plus de
              <br />
              mouvement.
              <br />
              <span>Plus de réseau.</span>
            </h1>
            <p className="home-lead">
              {user
                ? "Votre réseau avance. Reprenez là où vous en étiez : opportunités, séances, formations et devis vous attendent."
                : "Recrutement d’élite, coaching privé, formations, matériel et événements — une seule plateforme pour les professionnels, les salles et les prestataires qui font l’industrie."}
            </p>
            <div className="home-hero-actions">
              <Link className="home-btn home-btn-pill" to={primaryTo}>
                {primaryLabel}
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <Link className="home-btn home-btn-ghost" to={secondaryTo}>
                {secondaryLabel}
              </Link>
            </div>
            {user ? null : (
              <div className="home-roles-pick">
                <span>Je suis</span>
                <div>
                  {LANDING_ROLES.map((role) => (
                    <Link key={role.label} to={role.href}>
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {role.icon}
                      </span>
                      {role.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {user ? (
            <div className="home-showcase" aria-label="Raccourcis" data-reveal>
              <div className="home-card home-shortcuts">
                <p className="home-card-label">Accès rapide</p>
                <div className="home-shortcuts-grid">
                  {LANDING_SHORTCUTS.map((item) => (
                    <Link key={item.href} to={item.href}>
                      <span className="material-symbols-outlined" aria-hidden="true">
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="home-wrap home-stats" data-reveal>
          {LANDING_STATS.map((stat) => (
            <div key={stat.label}>
              <b>{stat.value}</b>
              <span>{stat.label}</span>
            </div>
          ))}
          <a className="home-scroll" href="#reseau" aria-label="Découvrir la suite">
            <span className="material-symbols-outlined" aria-hidden="true">
              south
            </span>
          </a>
        </div>
      </section>

      <section className="home-strip" id="reseau" aria-label="Preuves">
        <div className="home-strip-track">
          {[0, 1].map((copy) => (
            <div className="home-strip-row" key={copy} aria-hidden={copy === 1}>
              <span>Vérification d’identité</span>
              <span>Matching métier</span>
              <span>Pipeline &amp; contrats</span>
              <span>Coaching &amp; packs</span>
              <span>Académie</span>
              <span>Marketplace</span>
            </div>
          ))}
        </div>
      </section>

      <HomeShowcase />

      <section className="home-block">
        <div className="home-wrap home-platform" data-reveal>
          <header className="home-head">
            <p className="home-kicker dark">La plateforme</p>
            <h2>Pas un job board. Un circuit de puissance.</h2>
            <p>
              Fitness Universe relie ceux qui recrutent, ceux qui coachent, ceux qui forment et ceux qui équipent. Même
              dossier, mêmes règles, même exigence — du premier contact jusqu’au contrat ou à la séance.
            </p>
          </header>
          <ol className="home-lines">
            {LANDING_PILLARS.map((item) => (
              <li key={item.title}>
                <span className="home-idx">{item.index}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-block home-block-ice">
        <div className="home-wrap" data-reveal>
          <header className="home-head">
            <p className="home-kicker dark">Pour qui</p>
            <h2>Chaque rôle a sa force. Le réseau les assemble.</h2>
          </header>
          <div className="home-roles">
            {LANDING_AUDIENCES.map((item) => (
              <Link className="home-role" to={item.href} key={item.title}>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
                <em>
                  Entrer
                  <span className="material-symbols-outlined" aria-hidden="true">
                    north_east
                  </span>
                </em>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-eco" id="modules">
        <div className="home-wrap" data-reveal>
          <header className="home-head">
            <p className="home-kicker dark">L’écosystème</p>
            <h2>Sept métiers. Un seul circuit.</h2>
            <p>
              Pas une grille de produits. Une industrie assemblée : chaque module a sa profondeur, tous partagent le
              même dossier et les mêmes règles.
            </p>
          </header>
        </div>
        <Link className="home-eco-feature" to={FEATURED.href} data-reveal>
          <div
            className="home-eco-photo"
            style={FEATURED.image ? { backgroundImage: `url(${FEATURED.image})` } : undefined}
            aria-hidden="true"
          />
          <div className="home-eco-copy">
            <p className="home-kicker dark">
              {FEATURED.index} · Module phare
            </p>
            <h3>{FEATURED.title}</h3>
            <p>{FEATURED.text}</p>
            <em>
              Explorer
              <span className="material-symbols-outlined" aria-hidden="true">
                north_east
              </span>
            </em>
          </div>
        </Link>
        <div className="home-wrap home-bento" data-reveal>
          {OTHER_MODULES.map((item) => (
            <Link to={item.href} key={item.href}>
              <span className="home-bento-icon material-symbols-outlined" aria-hidden="true">
                {item.icon}
              </span>
              <span className="home-bento-idx">{item.index}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
              <em>
                Explorer
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </em>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-split">
        <div className="home-split-photo" aria-hidden="true" />
        <div className="home-split-copy" data-reveal>
          <p className="home-kicker dark">Méthode</p>
          <h2>Quatre temps. Zéro improvisation.</h2>
          <ol className="home-steps">
            {LANDING_STEPS.map((step) => (
              <li key={step.index}>
                <span>{step.index}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link className="home-btn home-btn-pill" to={primaryTo}>
            {user ? "Continuer" : "Créer mon dossier"}
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </section>

      <section className="home-block">
        <div className="home-wrap" data-reveal>
          <header className="home-head">
            <p className="home-kicker dark">Pourquoi ici</p>
            <h2>L’exigence avant le volume.</h2>
          </header>
          <div className="home-trust">
            {LANDING_TRUST.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-block home-faq-block">
        <div className="home-wrap home-faq-wrap" data-reveal>
          <header className="home-head">
            <p className="home-kicker dark">Questions fréquentes</p>
            <h2>Tout ce qu’il faut savoir avant d’entrer.</h2>
            <p>
              Une autre question ? Créez votre compte gratuitement et explorez : vous ne payez que lorsque vous activez
              une offre.
            </p>
          </header>
          <div className="home-faq">
            {LANDING_FAQ.map((item, index) => (
              <details key={item.q} open={index === 0}>
                <summary>
                  {item.q}
                  <span className="material-symbols-outlined" aria-hidden="true">
                    add
                  </span>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div className="home-wrap" data-reveal>
          <div className="home-cta-inner">
            <div>
              <p className="home-kicker">{user ? "On continue" : "Prêt"}</p>
              <h2>{user ? "Votre circuit vous attend." : "Entrez dans le circuit."}</h2>
              <p>
                Professionnel, salle, coach, fournisseur ou académie : un compte, un dossier, l’accès à toute la force du
                réseau.
              </p>
            </div>
            <div className="home-cta-actions">
              <Link className="home-btn home-btn-volt" to={primaryTo}>
                {user ? "Ouvrir mon tableau de bord" : "Créer mon compte gratuit"}
                <span className="material-symbols-outlined" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <Link className="home-btn home-btn-ghost" to="/tarifs">
                Voir les tarifs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
