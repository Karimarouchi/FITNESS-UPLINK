import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Download, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { Btn, Card, Notice } from "@/components/dashboard/settingsUi";
import { usesWorkspaceShell } from "@/components/layout/shell/shellNav";
import { useAuth } from "@/features/auth/AuthContext";
import { cancelBilling, fetchInvoices, fetchInvoiceBlob, fetchMyBilling, type InvoiceDto, type MeBilling } from "./api";
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";

const STATUS: Record<string, { label: string; tone: string }> = {
  TRIAL: { label: "Essai", tone: "is-info" },
  ACTIVE: { label: "Actif", tone: "is-success" },
  PAST_DUE: { label: "Impayé", tone: "is-warn" },
  CANCELLED: { label: "Résilié", tone: "is-neutral" },
  SUSPENDED: { label: "Suspendu", tone: "is-danger" },
  EXPIRED: { label: "Expiré", tone: "is-danger" },
};

const INTERVAL: Record<string, string> = { MONTHLY: "Mensuel", YEARLY: "Annuel" };

export function BillingPage() {
  const { user } = useAuth();
  const premium = usesWorkspaceShell(user);
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
  const cancellable = Boolean(sub && sub.status !== "CANCELLED" && sub.status !== "EXPIRED");

  if (premium) {
    const status = sub ? (STATUS[sub.status] ?? { label: sub.status, tone: "is-neutral" }) : null;
    return (
      <section className="bo-dash bo-users bo-bm bo-ml bo-st">
        <header className="bo-dash-head">
          <div>
            <h1>Paiements &amp; abonnement</h1>
            <p>{trialCopy}</p>
          </div>
          <Link to="/app/profile/plan" className="bm-btn">
            Changer d’offre
          </Link>
        </header>
        <Notice premium error={error} />

        <Card premium title="Abonnement" icon={CreditCard}>
          {sub && status ? (
            <dl className="st-facts">
              <div className="st-fact">
                <dt>Offre</dt>
                <dd>{sub.planName}</dd>
              </div>
              <div className="st-fact">
                <dt>Statut</dt>
                <dd>
                  <span className={`bo-users-status ${status.tone}`}>{status.label}</span>
                </dd>
              </div>
              <div className="st-fact">
                <dt>Devise</dt>
                <dd>
                  {sub.currency} · {INTERVAL[sub.interval] ?? sub.interval}
                </dd>
              </div>
              <div className="st-fact">
                <dt>Carte</dt>
                <dd>{sub.cardLast4 ? `•••• ${sub.cardLast4}` : "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="ml-hint">Aucune offre active. Choisissez un plan pour débloquer Hire.</p>
          )}
          {cancellable ? (
            <div className="ml-actions st-actions">
              <Btn premium variant="danger" type="button" disabled={busy} onClick={() => void onCancel()}>
                Annuler à la fin de période
              </Btn>
            </div>
          ) : null}
        </Card>

        <Card premium title="Factures" icon={ReceiptText} tone="is-blue">
          {invoices.length === 0 ? (
            <p className="ml-hint">Les factures apparaissent après le premier prélèvement réussi.</p>
          ) : (
            <ul className="st-invoices">
              {invoices.map((row) => (
                <li key={row.id}>
                  <strong>{row.number}</strong>
                  <span>{new Date(row.createdAt).toLocaleDateString("fr-FR")}</span>
                  <button className="bm-btn is-outline" type="button" onClick={() => void download(row.id, row.number)}>
                    <Download size={16} aria-hidden="true" />
                    Télécharger
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    );
  }

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
        {cancellable ? (
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
