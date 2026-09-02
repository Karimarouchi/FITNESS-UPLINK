import { PUBLIC_MODULES } from "./publicData";

export function ModulesGrid() {
  return (
    <section className="modules">
      <div className="section-head">
        <h2>L&apos;écosystème</h2>
        <span>7 modules connectés</span>
      </div>
      <div className="module-grid">
        {PUBLIC_MODULES.map((module) => (
          <div className="module-card" key={module.index}>
            <div className="n">{module.index}</div>
            <h3>{module.title}</h3>
            <p>{module.description}</p>
          </div>
        ))}
        <div className="module-card dark">
          <h3>Voir tous les modules →</h3>
        </div>
      </div>
    </section>
  );
}
