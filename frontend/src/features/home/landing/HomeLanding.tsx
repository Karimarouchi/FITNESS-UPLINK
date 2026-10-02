import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import {
  LANDING_AUDIENCES,
  LANDING_FAQ,
  LANDING_MODULES,
  LANDING_PILLARS,
  LANDING_STATS,
  LANDING_STEPS,
  LANDING_TRUST,
} from "./content";
import { HomeHero } from "./HomeHero";
import { HomeShowcase } from "./HomeShowcase";
import { VtButton, VtHead, VtLink, VtTitle } from "./Vantage";
import "./landing.css";
import "./vantage.css";

const FEATURED = LANDING_MODULES[0];
const OTHER_MODULES = LANDING_MODULES.slice(1);

export function HomeLanding() {
  const { user } = useAuth();
  const primaryTo = user ? "/app/dashboard" : "/signup";

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
    <div className="fu-home vt">
      <HomeHero />

      {/* the athlete's legs land on this section */}
      <section className="vt-section vt-intro">
        <div className="vt-wrap">
          <div className="vt-split" data-reveal>
            <VtTitle lines={["Pas un job board.", "Un circuit de"]} muted="puissance." />
            <div className="vt-prose">
              <p>
                Fitness Universe relie ceux qui recrutent, ceux qui coachent, ceux qui forment et ceux qui équipent. Même
                dossier, mêmes règles, même exigence — du premier contact jusqu’au contrat ou à la séance.
              </p>
              <p>
                Chaque profil est vérifié, chaque module partage le même compte. Le progrès se mesure en contrats signés,
                en séances réalisées et en formations validées — pas en clics.
              </p>
              <VtLink to="#methode">Notre méthode</VtLink>
            </div>
          </div>

          <dl className="vt-stats" data-reveal>
            {LANDING_STATS.map((stat) => (
              <div key={stat.label}>
                <dt className={stat.value === "∞" ? "is-symbol" : undefined}>{stat.value}</dt>
                <dd>{stat.label}</dd>
              </div>
            ))}
            <div>
              <dt>03</dt>
              <dd>Devises : TND · EUR · USD</dd>
            </div>
          </dl>

          <ol className="vt-cols" data-reveal>
            {LANDING_PILLARS.map((item) => (
              <li key={item.title}>
                <span className="vt-idx">{item.index}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <HomeShowcase />

      <section className="vt-section vt-section-white">
        <div className="vt-wrap" data-reveal>
          <VtHead title={<VtTitle lines={["Chaque rôle"]} muted="a sa force." />}>
            <p>Professionnels, salles, coachs, fournisseurs et académies : le réseau assemble chaque métier du fitness.</p>
          </VtHead>
          <div className="vt-cols vt-cols-links">
            {LANDING_AUDIENCES.map((item, index) => (
              <Link to={item.href} key={item.title}>
                <span className="vt-idx">{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <em>
                  Entrer
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_forward
                  </span>
                </em>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="vt-section vt-dark" id="modules">
        <div className="vt-wrap" data-reveal>
          <VtHead title={<VtTitle lines={["Sept métiers."]} muted="Un seul circuit." />}>
            <p>
              Pas une grille de produits. Une industrie assemblée : chaque module a sa profondeur, tous partagent le même
              dossier et les mêmes règles.
            </p>
          </VtHead>

          <div className="vt-eco">
            <Link className="vt-eco-feature" to={FEATURED.href}>
              <div
                className="vt-eco-photo"
                style={FEATURED.image ? { backgroundImage: `url(${FEATURED.image})` } : undefined}
                aria-hidden="true"
              />
              <div className="vt-eco-copy">
                <span className="vt-tag">Module phare</span>
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
            <div className="vt-eco-grid">
              {OTHER_MODULES.map((item) => (
                <Link to={item.href} key={item.href}>
                  <span className="vt-idx">{item.index}</span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <span className="vt-eco-go material-symbols-outlined" aria-hidden="true">
                    north_east
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="vt-section vt-method" id="methode">
        <div className="vt-wrap vt-method-grid" data-reveal>
          <div className="vt-method-photo" aria-hidden="true" />
          <div>
            <VtTitle lines={["Quatre temps."]} muted="Zéro improvisation." />
            <ol className="vt-steps">
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
            <VtButton to={primaryTo} tone="navy">
              {user ? "Continuer" : "Créer mon dossier"}
            </VtButton>
          </div>
        </div>
      </section>

      <section className="vt-section vt-section-white">
        <div className="vt-wrap" data-reveal>
          <VtHead title={<VtTitle lines={["L’exigence"]} muted="avant le volume." />} />
          <div className="vt-cols vt-cols-3">
            {LANDING_TRUST.map((item, index) => (
              <article key={item.title}>
                <span className="vt-idx">{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="vt-section">
        <div className="vt-wrap vt-faq-grid" data-reveal>
          <div className="vt-faq-head">
            <VtTitle lines={["Questions"]} muted="fréquentes." />
            <p>
              Une autre question ? Créez votre compte gratuitement et explorez : vous ne payez que lorsque vous activez une
              offre.
            </p>
          </div>
          <div className="vt-faq">
            {LANDING_FAQ.map((item, index) => (
              <details key={item.q} open={index === 0}>
                <summary>
                  {item.q}
                  <span className="vt-faq-ico" aria-hidden="true">
                    <span className="material-symbols-outlined">add</span>
                  </span>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="vt-cta">
        <div className="vt-wrap vt-cta-inner" data-reveal>
          <h2 className="vt-title">
            {user ? "Votre circuit" : "Entrez dans"}
            <br />
            <span className="vt-lime">{user ? "vous attend." : "le circuit."}</span>
          </h2>
          <div>
            <p>
              Professionnel, salle, coach, fournisseur ou académie : un compte, un dossier, l’accès à toute la force du
              réseau.
            </p>
            <div className="vt-cta-actions">
              <VtButton to={primaryTo} tone="lime">
                {user ? "Mon tableau de bord" : "Créer mon compte"}
              </VtButton>
              <Link className="vt-btn vt-btn-ghost" to="/tarifs">
                Voir les tarifs
                <span className="material-symbols-outlined" aria-hidden="true">
                  north_east
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
