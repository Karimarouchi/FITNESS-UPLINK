import { Link } from "react-router-dom";

type PublicCtaProps = {
  kicker?: string;
  title: string;
  lead: string;
  primaryTo: string;
  primaryLabel: string;
  secondaryTo?: string;
  secondaryLabel?: string;
};

export function PublicCta({
  kicker = "Prêt",
  title,
  lead,
  primaryTo,
  primaryLabel,
  secondaryTo,
  secondaryLabel,
}: PublicCtaProps) {
  return (
    <section className="pub-cta">
      <div className="pub-wrap">
        <div className="pub-cta-card">
          <div>
            <p className="pub-kicker">{kicker}</p>
            <h2>{title}</h2>
            <p>{lead}</p>
          </div>
          <div className="pub-cta-actions">
            <Link className="pub-btn pub-btn-volt" to={primaryTo}>
              {primaryLabel}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            {secondaryTo && secondaryLabel ? (
              <Link className="pub-btn pub-btn-line" to={secondaryTo}>
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
