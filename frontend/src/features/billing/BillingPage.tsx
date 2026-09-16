import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { cancelBilling, fetchInvoices, fetchInvoiceBlob, fetchMyBilling, type InvoiceDto, type MeBilling } from "./api";

export function BillingPage() {
  const [billing, setBilling] = useState<MeBilling | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([fetchMyBilling(), fetchInvoices()])
      .then(([me, list]) => {
        setBilling(me);
        setInvoices(list);
      })
      .catch(() => setError("Impossible de charger la facturation."));
  }, []);

  async function onCancel() {
    setBusy(true);
    try {
      setBilling(await cancelBilling());
    } catch {
      setError("Annulation impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function download(id: string, number: string) {
    const blob = await fetchInvoiceBlob(id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${number}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  const sub = billing?.subscription;
  const trialCopy =
    sub?.status === "TRIAL" && sub.trialEndsAt
      ? `Essai jusqu’au ${new Date(sub.trialEndsAt).toLocaleDateString("fr-FR")}, puis prélèvement. Carte refusée = suspension immédiate.`
      : "Prélèvement selon l’offre choisie. Carte refusée = suspension immédiate.";

  return (
    <section className="hire-page">
      <div className="page-head">
        <div>
          <h1>Paiements & abonnement</h1>
          <p className="sub">{trialCopy}</p>
        </div>
        <Button variant="primary" to="/app/profile/plan">
          Changer d’offre
        </Button>
      </div>
      {error ? <p className="auth-error">{error}</p> : null}
      <Panel title="Abonnement" body>
        {sub ? (
          <div className="info-grid">
            <div className="info-cell">
              <div className="k">Offre</div>
              <div className="v">{sub.planName}</div>
            </div>
            <div className="info-cell">
              <div className="k">Statut</div>
              <StatusPill tone={sub.status === "SUSPENDED" || sub.status === "EXPIRED" ? "refused" : "verified"}>
                {sub.status}
              </StatusPill>
            </div>
            <div className="info-cell">
              <div className="k">Devise</div>
              <div className="v">
                {sub.currency} · {sub.interval}
              </div>
            </div>
            <div className="info-cell">
              <div className="k">Carte</div>
              <div className="v">{sub.cardLast4 ? `•••• ${sub.cardLast4}` : "—"}</div>
            </div>
          </div>
        ) : (
          <p className="empty-hint">Aucune offre active. Choisissez un plan pour débloquer Hire.</p>
        )}
        {sub && sub.status !== "CANCELLED" && sub.status !== "EXPIRED" ? (
          <div className="settings-mail-actions">
            <Button variant="danger" type="button" disabled={busy} onClick={() => void onCancel()}>
              Annuler à la fin de période
            </Button>
          </div>
        ) : null}
      </Panel>
      <Panel title="Factures">
        {invoices.length === 0 ? (
          <p className="empty-hint">Les factures apparaissent après le premier prélèvement réussi.</p>
        ) : (
          <ul className="hire-file-list">
            {invoices.map((row) => (
              <li key={row.id}>
                <strong>{row.number}</strong>
                <button className="btn-mini" type="button" onClick={() => void download(row.id, row.number)}>
                  Télécharger
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </section>
  );
}
