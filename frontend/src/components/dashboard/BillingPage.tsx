import { Panel } from "@/components/ui/Panel";

export function BillingPage() {
  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Paiements & abonnement</h1>
        </div>
      </div>
      <Panel>
        <p className="empty-hint">
          Les abonnements et factures ne sont pas encore gérés par le backend. Aucune donnée fictive n&apos;est affichée.
        </p>
      </Panel>
    </section>
  );
}
