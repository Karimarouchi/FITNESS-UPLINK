import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { academyErrorMessage, cancelRegistration, fetchMyRegistrations, type Registration } from "../api";
import "@/shared/styles/backoffice-coaching.css";
import "./academy-tickets.css";

function formatWhen(value: string | null) {
  return value ? new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

function priceLabel(r: Registration) {
  return Number(r.priceAmount) > 0 ? `${r.priceAmount} ${r.priceCurrency}` : "Gratuit";
}

/** mm:ss left on the 5-minute online payment window. */
function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [target]);
  if (!target) return null;
  const left = Math.max(0, Math.floor((new Date(target).getTime() - now) / 1000));
  return { left, label: `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}` };
}

function HoldTimer({ until }: { until: string | null }) {
  const countdown = useCountdown(until);
  if (!countdown) return null;
  return (
    <span className={countdown.left < 60 ? "tk-timer is-low" : "tk-timer"}>
      {countdown.left > 0 ? `Place gardée ${countdown.label}` : "Délai dépassé"}
    </span>
  );
}

function Ticket({ registration }: { registration: Registration }) {
  if (!registration.ticketToken) return null;
  return (
    <div className="tk-ticket">
      <QRCodeSVG value={registration.ticketToken} size={132} level="M" marginSize={2} />
      <div className="tk-ticket-copy">
        <strong>Votre billet</strong>
        <small>Présentez ce QR code à l’entrée.</small>
        <code>{registration.ticketToken.slice(0, 8)}…</code>
      </div>
    </div>
  );
}

export function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetchMyRegistrations().then(setRegistrations).catch(() => setRegistrations([]));
  }

  useEffect(() => {
    load();
    // seats held online are released after 5 minutes: refresh the list regularly
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const now = Date.now();
  const isFuture = (r: Registration) => !r.scheduledAt || new Date(r.scheduledAt).getTime() >= now;
  const toPay = registrations.filter((r) => r.status === "PENDING_PAYMENT" && (!r.holdExpiresAt || new Date(r.holdExpiresAt).getTime() > now));
  const onSite = registrations.filter((r) => r.status === "PENDING_ON_SITE" && isFuture(r));
  const waitlisted = registrations.filter((r) => r.status === "WAITLISTED");
  const upcoming = registrations.filter((r) => r.status === "CONFIRMED" && isFuture(r));
  const debts = registrations.filter((r) => r.status === "NO_SHOW" && !r.paid);
  const past = registrations.filter(
    (r) =>
      r.status === "CANCELLED" ||
      (r.status === "NO_SHOW" && r.paid) ||
      (r.status === "PENDING_PAYMENT" && r.holdExpiresAt && new Date(r.holdExpiresAt).getTime() <= now) ||
      (r.status === "CONFIRMED" && !isFuture(r)),
  );

  async function cancel(id: string) {
    setError(null);
    try {
      await cancelRegistration(id);
      load();
    } catch (err) {
      setError(academyErrorMessage(err, "Impossible d’annuler cette inscription."));
    }
  }

  function CancelAction({ r }: { r: Registration }) {
    if (r.canCancel) {
      return (
        <Button variant="danger" onClick={() => void cancel(r.id)}>
          Annuler
        </Button>
      );
    }
    return <small className="tk-note">Annulation impossible (moins de 48 h avant)</small>;
  }

  return (
    <section className="cg-skin">
      <div className="page-head">
        <div>
          <h1>Mes inscriptions</h1>
          <p className="sub">Vos formations, billets QR et reçus de paiement.</p>
        </div>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      {debts.length > 0 ? (
        <div className="panel tk-alert">
          <div className="panel-head">
            <h2>Somme due</h2>
          </div>
          <p className="empty-hint" style={{ padding: "0 22px 10px" }}>
            Vous ne vous êtes pas présenté(e) à une formation « paiement sur place ». Votre compte est bloqué tant que
            la somme n’est pas réglée.
          </p>
          {debts.map((r) => (
            <div key={r.id} className="booking-item">
              <div className="booking-time">{formatWhen(r.scheduledAt)}</div>
              <div className="booking-body">
                <div className="t">{r.formationTitle}</div>
                <div className="s">{priceLabel(r)}</div>
                <StatusPill tone="refused">Absent · à régler</StatusPill>
              </div>
              <Button variant="primary" to={`/app/academy/registrations/${r.id}/pay`}>
                Payer maintenant
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {toPay.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2>À payer maintenant</h2>
          </div>
          <p className="empty-hint" style={{ padding: "0 22px 10px" }}>
            Votre place est gardée 5 minutes. Sans paiement, elle redevient disponible pour les autres.
          </p>
          {toPay.map((r) => (
            <div key={r.id} className="booking-item">
              <div className="booking-time">{formatWhen(r.scheduledAt)}</div>
              <div className="booking-body">
                <div className="t">{r.formationTitle}</div>
                <div className="s">{priceLabel(r)}</div>
                <StatusPill tone="pending">À payer</StatusPill> <HoldTimer until={r.holdExpiresAt} />
              </div>
              <Button variant="primary" to={`/app/academy/registrations/${r.id}/pay`}>
                Payer en ligne
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {onSite.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Paiement sur place</h2>
          </div>
          <p className="empty-hint" style={{ padding: "0 22px 10px" }}>
            Votre place est réservée. Réglez à l’entrée en présentant votre billet. Si vous ne venez pas, la somme reste
            due et votre compte est bloqué jusqu’au paiement.
          </p>
          {onSite.map((r) => (
            <div key={r.id} className="booking-item tk-item">
              <div className="booking-time">{formatWhen(r.scheduledAt)}</div>
              <div className="booking-body">
                <div className="t">{r.formationTitle}</div>
                <div className="s">À payer sur place : {priceLabel(r)}</div>
                <StatusPill tone="pending">À régler à l’entrée</StatusPill>
              </div>
              <div className="tk-actions">
                <Button variant="mini" to={`/app/academy/registrations/${r.id}/pay`}>
                  Payer en ligne
                </Button>
                <CancelAction r={r} />
              </div>
              <Ticket registration={r} />
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
              <div className="booking-time">{formatWhen(r.scheduledAt)}</div>
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
            Aucune formation payée à venir.
          </p>
        ) : (
          upcoming.map((r) => (
            <div key={r.id} className="booking-item tk-item">
              <div className="booking-time">{formatWhen(r.scheduledAt)}</div>
              <div className="booking-body">
                <div className="t">{r.formationTitle}</div>
                <div className="s">{priceLabel(r)}</div>
                <StatusPill tone="new">{r.paid && Number(r.priceAmount) > 0 ? "Payée" : "Confirmée"}</StatusPill>
                {r.invoiceNumber ? (
                  <Link className="tk-link" to={`/app/academy/registrations/${r.id}/receipt`}>
                    Voir le reçu
                  </Link>
                ) : null}
              </div>
              <div className="tk-actions">
                <CancelAction r={r} />
              </div>
              <Ticket registration={r} />
            </div>
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
              <div className="booking-time">{r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("fr-FR") : "—"}</div>
              <div className="booking-body">
                <div className="t">{r.formationTitle}</div>
                <StatusPill tone={r.status === "CANCELLED" || r.status === "PENDING_PAYMENT" ? "refused" : "verified"}>
                  {r.status === "CANCELLED"
                    ? "Annulée"
                    : r.status === "PENDING_PAYMENT"
                      ? "Délai de paiement dépassé"
                      : r.status === "NO_SHOW"
                        ? "Absent · réglée"
                        : r.checkedInAt
                          ? "Présent(e)"
                          : "Terminée"}
                </StatusPill>
                {r.invoiceNumber ? (
                  <Link className="tk-link" to={`/app/academy/registrations/${r.id}/receipt`}>
                    Voir le reçu
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
