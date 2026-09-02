import { Panel } from "@/components/ui/Panel";

export function CoachingPage() {
  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Agenda & réservations</h1>
          <div className="sub">Module de coaching</div>
        </div>
      </div>
      <Panel>
        <p className="empty-hint">
          Les réservations de coaching ne sont pas encore disponibles dans l&apos;API. Aucune donnée fictive n&apos;est affichée.
        </p>
      </Panel>
    </section>
  );
}
