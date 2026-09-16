import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/shared/api/client";
import { fetchReceivedMarketplaceRequests, handleMarketplaceRequest, type ReceivedQuoteRequest } from "../api";

export function MarketplaceRequestsPage() {
  const [requests, setRequests] = useState<ReceivedQuoteRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    fetchReceivedMarketplaceRequests()
      .then(setRequests)
      .catch(() => setError("Impossible de charger les demandes reçues."));
  }

  useEffect(() => {
    load();
  }, []);

  async function markHandled(id: string) {
    setBusyId(id);
    try {
      await handleMarketplaceRequest(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de mettre à jour cette demande.");
    } finally {
      setBusyId(null);
    }
  }

  const open = requests.filter((r) => r.status === "SENT");
  const handled = requests.filter((r) => r.status === "HANDLED");

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Demandes de devis</h1>
          <p className="sub">Visiteurs ayant confirmé leur e-mail pour un de vos produits.</p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Nouvelles ({open.length})</h2>
        </div>
        {error ? <p className="empty-hint">{error}</p> : null}
        {open.length === 0 ? <p className="empty-hint">Aucune nouvelle demande.</p> : null}
        {open.map((r) => (
          <div key={r.id} className="exp-item">
            <div className="exp-body">
              <div className="t">
                {r.fullName} — {r.productName}
              </div>
              <div className="c">
                {r.email}
                {r.phone ? ` · ${r.phone}` : ""}
              </div>
              <div className="d">{r.message}</div>
              <div style={{ marginTop: 8 }}>
                <Button variant="primary" disabled={busyId === r.id} onClick={() => void markHandled(r.id)}>
                  Marquer traitée
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Traitées ({handled.length})</h2>
        </div>
        {handled.length === 0 ? (
          <p className="empty-hint">Aucune demande traitée pour l’instant.</p>
        ) : (
          handled.map((r) => (
            <div key={r.id} className="exp-item">
              <div className="exp-body">
                <div className="t">
                  {r.fullName} — {r.productName}
                </div>
                <div className="d">{r.message}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
