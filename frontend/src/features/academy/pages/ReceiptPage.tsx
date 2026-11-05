import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { academyErrorMessage, fetchReceipt, type Receipt } from "../api";
import "@/shared/styles/backoffice-coaching.css";
import "./academy-tickets.css";

export function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchReceipt(id)
      .then(setReceipt)
      .catch((err) => setError(academyErrorMessage(err, "Reçu introuvable.")));
  }, [id]);

  return (
    <section className="cg-skin">
      <div className="page-head">
        <div>
          <h1>Reçu de paiement</h1>
          <p className="sub">Preuve de paiement de votre inscription.</p>
        </div>
        <div className="head-actions">
          <Button variant="mini" onClick={() => window.print()} disabled={!receipt}>
            Imprimer
          </Button>
        </div>
      </div>
      {error ? <p className="auth-error">{error}</p> : null}
      {receipt ? (
        <div className="rc-card">
          <p className="pill-paid" style={{ marginLeft: 0 }}>Payé</p>
          <dl>
            <div><dt>N° de facture</dt><dd>{receipt.invoiceNumber}</dd></div>
            <div><dt>Formation</dt><dd>{receipt.formationTitle}</dd></div>
            <div><dt>Date de la session</dt><dd>{new Date(receipt.scheduledAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}</dd></div>
            <div><dt>Participant</dt><dd>{receipt.memberName}</dd></div>
            <div><dt>Mode de paiement</dt><dd>{receipt.provider === "ON_SITE" ? "Sur place" : "En ligne"}</dd></div>
            <div><dt>Payé le</dt><dd>{new Date(receipt.paidAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
            <div className="rc-total"><dt>Montant</dt><dd>{receipt.amount} {receipt.currency}</dd></div>
          </dl>
        </div>
      ) : null}
      <p style={{ marginTop: 18 }}>
        <Link className="tk-link" style={{ marginLeft: 0 }} to="/app/academy/registrations">← Mes inscriptions</Link>
      </p>
    </section>
  );
}
