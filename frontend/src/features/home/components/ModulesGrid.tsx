import { Link } from "react-router-dom";
import type { ModuleItem } from "../data";

type ModulesGridProps = {
  modules: ModuleItem[];
};

export function ModulesGrid({ modules }: ModulesGridProps) {
  return (
    <section className="fu-modules" id="ecosystem" aria-labelledby="fu-modules-title">
      <div className="fu-modules-head">
        <h2 className="fu-modules-title" id="fu-modules-title">
          L&apos;écosystème
        </h2>
        <p className="fu-modules-meta">{modules.length} modules connectés</p>
      </div>
      <div className="fu-modules-grid">
        {modules.map((module) => (
          <Link className="fu-module" key={module.index} to={module.href}>
            <span className="fu-module-index">{module.index}</span>
            <h3 className="fu-module-title">{module.title}</h3>
            <p className="fu-module-copy">{module.description}</p>
          </Link>
        ))}
        <Link className="fu-module-cta" to="/signup">
          <span className="fu-module-cta-index">08</span>
          <p className="fu-module-cta-label">Voir tous les modules →</p>
        </Link>
      </div>
    </section>
  );
}
