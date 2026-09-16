import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { ApiError } from "@/shared/api/client";
import { fetchReceivedQuoteRequests, fetchSentQuoteRequests, handleQuoteRequest, providerLocation, type QuoteRequest } from "../api";

const ease = [0.16, 1, 0.3, 1] as const;

export function MyQuoteRequestsPage() {
  const { user } = useAuth();
  const isProvider = hasPermission(user, PERMS.SERVICES_MANAGE);
  return isProvider ? <ReceivedView /> : <SentView />;
}

function SentView() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSentQuoteRequests()
      .then(setRequests)
      .catch(() => setError("Impossible de charger vos demandes."));
  }, []);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Mes demandes de devis</h1>
          <p className="sub">Suivi des demandes envoyées aux prestataires.</p>
        </div>
      </div>
      <div className="panel">
        {error ? <p className="empty-hint">{error}</p> : null}
        {!error && requests.length === 0 ? <p className="empty-hint">Aucune demande envoyée pour l’instant.</p> : null}
        {requests.map((r) => (
          <motion.div key={r.id} className="booking-item" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease }}>
            <div className="booking-time">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</div>
            <div className="booking-body">
              <div className="t">{r.providerDisplayName}</div>
              <div className="s">{r.message}</div>
            </div>
            <StatusPill tone={r.status === "HANDLED" ? "verified" : "new"}>{r.status === "HANDLED" ? "Traitée" : "Nouvelle"}</StatusPill>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ReceivedView() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    fetchReceivedQuoteRequests()
      .then(setRequests)
      .catch(() => setError("Impossible de charger les demandes reçues."));
  }

  useEffect(() => {
    load();
  }, []);

  async function markHandled(id: string) {
    setBusyId(id);
    try {
      await handleQuoteRequest(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de mettre à jour cette demande.");
    } finally {
      setBusyId(null);
    }
  }

  const open = requests.filter((r) => r.status === "NEW");
  const handled = requests.filter((r) => r.status === "HANDLED");

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Demandes de devis reçues</h1>
          <p className="sub">Les salles et studios qui souhaitent travailler avec vous.</p>
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
                {r.companyName} — {r.requesterDisplayName}
              </div>
              <div className="c">{providerLocation({ city: r.city, country: r.country })}</div>
              <div className="d">{r.message}</div>
              {r.attachments.length > 0 ? (
                <div className="d">Pièces jointes : {r.attachments.map((f) => f.name).join(", ")}</div>
              ) : null}
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
                  {r.companyName} — {r.requesterDisplayName}
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
