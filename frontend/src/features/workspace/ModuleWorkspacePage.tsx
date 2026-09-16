import { Panel } from "@/components/ui/Panel";

export type WorkspaceCopy = {
  title: string;
  lead: string;
  empty: string;
};

export const WORKSPACES: Record<string, WorkspaceCopy> = {
  academy: {
    title: "Académie",
    lead: "Formations, sessions et inscriptions.",
    empty: "L’académie n’est pas encore ouverte. Vos programmes apparaîtront ici.",
  },
  events: {
    title: "Événements",
    lead: "Événements, inscriptions et participants.",
    empty: "Les événements ne sont pas encore en base. Votre espace organisateur sera ici.",
  },
  content: {
    title: "Contenus",
    lead: "Recettes, articles et programmes autorisés.",
    empty: "La publication de contenus n’est pas encore ouverte. Votre atelier créateur sera ici.",
  },
};

export function ModuleWorkspacePage({ workspace }: { workspace: string }) {
  const copy = WORKSPACES[workspace];
  if (!copy) {
    return (
      <section>
        <div className="page-head">
          <h1>Espace</h1>
        </div>
        <Panel>
          <p className="empty-hint">Cet espace n’existe pas.</p>
        </Panel>
      </section>
    );
  }
  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{copy.title}</h1>
          <p className="sub">{copy.lead}</p>
        </div>
      </div>
      <Panel title="Votre espace">
        <p className="empty-hint">{copy.empty}</p>
      </Panel>
    </section>
  );
}
