import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./public.css";

type PublicHeroProps = {
  kicker: string;
  title: string;
  lead: string;
  image: string;
  actions?: ReactNode;
  highlights?: { icon: string; label: string }[];
  compact?: boolean;
};

export function PublicHero({ kicker, title, lead, image, actions, highlights, compact = false }: PublicHeroProps) {
  return (
    <section className={compact ? "pub-hero is-compact" : "pub-hero"}>
      <div className="pub-wrap pub-hero-grid">
        <div className="pub-hero-copy">
          <nav className="pub-crumbs" aria-label="Fil d’Ariane">
            <Link to="/">Accueil</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{kicker}</span>
          </nav>
          <h1>{title}</h1>
          <p className="pub-lead">{lead}</p>
          {actions ? <div className="pub-hero-actions">{actions}</div> : null}
          {highlights?.length ? (
            <ul className="pub-hero-highlights">
              {highlights.map((item) => (
                <li key={item.label}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="pub-hero-visual" aria-hidden="true">
          <img src={image} alt="" />
        </div>
      </div>
    </section>
  );
}
