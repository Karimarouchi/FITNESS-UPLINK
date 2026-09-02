import { Link } from "react-router-dom";
import type { PublicModuleContent } from "../data";

type PublicModulePageProps = {
  content: PublicModuleContent;
};

export function PublicModulePage({ content }: PublicModulePageProps) {
  return (
    <article className="fu-page">
      <header className="fu-page-head">
        <h1 className="fu-page-title">{content.title}</h1>
        <p className="fu-page-lead">{content.lead}</p>
        <div className="fu-page-actions">
          <Link className="fu-btn fu-btn--lime" to="/signup">
            {content.ctaLabel}
          </Link>
          <Link className="fu-btn fu-btn--outline" to="/login">
            Se connecter
          </Link>
        </div>
      </header>
      <div className="fu-page-grid">
        {content.points.map((point, index) => (
          <section className="fu-page-cell" key={point.title}>
            <span className="fu-page-index">{String(index + 1).padStart(2, "0")}</span>
            <h2 className="fu-page-cell-title">{point.title}</h2>
            <p className="fu-page-cell-copy">{point.description}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
