import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { cancelRegistration, fetchMyRegistrations, type Registration } from "../api";

const ease = [0.16, 1, 0.3, 1] as const;

export function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  function load() {
    fetchMyRegistrations().then(setRegistrations).catch(() => setRegistrations([]));
  }

  useEffect(() => {
    load();
  }, []);

  const now = Date.now();
  const toPay = registrations.filter((r) => r.status === "PENDING_PAYMENT");
  const waitlisted = registrations.filter((r) => r.status === "WAITLISTED");
  const upcoming = registrations.filter(
    (r) => r.status === "CONFIRMED" && (!r.scheduledAt || new Date(r.scheduledAt).getTime() >= now),
  );
  const past = registrations.filter(
    (r) => r.status === "CANCELLED" || (r.status === "CONFIRMED" && r.scheduledAt && new Date(r.scheduledAt).getTime() < now),
  );

  async function cancel(id: string) {
    await cancelRegistration(id);
    load();
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Mes formations</h1>
          <p className="sub">Vos inscriptions aux formations, workshops et masterclass.</p>
        </div>
      </div>

      {toPay.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2>À payer</h2>
          </div>
          <p className="empty-hint" style={{ padding: "0 22px 10px" }}>
            Une place vous est réservée. Payez pour la confirmer.
          </p>
          {toPay.map((r) => (
            <div key={r.id} className="booking-item">
              <div className="booking-time">
                {r.scheduledAt ? new Date(r.scheduledAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}
              </div>
              <div className="booking-body">
                <div className="t">{r.formationTitle}</div>
                <div className="s">{r.priceAmount} {r.priceCurrency}</div>
                <StatusPill tone="pending">À payer</StatusPill>
              </div>
              <Button variant="primary" to={`/app/academy/registrations/${r.id}/pay`}>
                Payer
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {waitlisted.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Liste d'attente</h2>
          </div>
          {waitlisted.map((r) => (
            <div key={r.id} className="booking-item">
              <div className="booking-time">
                {r.scheduledAt ? new Date(r.scheduledAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}
              </div>
              <div className="booking-body">
                <div className="t">{r.formationTitle}</div>
                <div className="s">Position #{r.waitlistPosition}</div>
                <StatusPill tone="pending">Liste d'attente</StatusPill>
              </div>
              <Button variant="danger" onClick={() => void cancel(r.id)}>
                Annuler
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="panel">
        <div className="panel-head">
          <h2>À venir</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="empty-hint" style={{ padding: "0 22px 20px" }}>
            Aucune formation à venir.
          </p>
        ) : (
          upcoming.map((r) => (
            <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease }}>
              <div className="booking-item">
                <div className="booking-time">
                  {r.scheduledAt ? new Date(r.scheduledAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                </div>
                <div className="booking-body">
                  <div className="t">{r.formationTitle}</div>
                  <div className="s">{Number(r.priceAmount) > 0 ? `${r.priceAmount} ${r.priceCurrency}` : "Gratuit"}</div>
                  <StatusPill tone="new">Confirmée</StatusPill>
                </div>
                <Button variant="danger" onClick={() => void cancel(r.id)}>
                  Annuler
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Historique</h2>
        </div>
        {past.length === 0 ? (
          <p className="empty-hint" style={{ padding: "0 22px 20px" }}>
            Aucune formation passée.
          </p>
        ) : (
          past.map((r) => (
            <div key={r.id} className="booking-item">
              <div className="booking-time">
                {r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("fr-FR") : "—"}
              </div>
              <div className="booking-body">
                <div className="t">{r.formationTitle}</div>
                <StatusPill tone={r.status === "CANCELLED" ? "refused" : "verified"}>
                  {r.status === "CANCELLED" ? "Annulée" : "Terminée"}
                </StatusPill>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
