import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { ApiError } from "@/shared/api/client";
import {
  cancelBooking,
  createBooking,
  fetchMyBookings,
  fetchThread,
  reportBooking,
  sendMessage,
  submitReview,
  type Booking,
  type CoachingMessage,
} from "../api";

function cancelErrorMessage(err: unknown) {
  if (err instanceof ApiError && err.message === "CANCELLATION_DEADLINE_PASSED") {
    return "Trop tard pour annuler cette séance selon la politique du coach.";
  }
  return err instanceof ApiError ? err.message : "Impossible d'annuler cette séance.";
}

const ease = [0.16, 1, 0.3, 1] as const;

function statusTone(status: Booking["status"]) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "pending" as const;
    case "CONFIRMED":
      return "new" as const;
    case "COMPLETED":
      return "verified" as const;
    case "DECLINED":
    case "CANCELLED":
      return "refused" as const;
    default:
      return "pending" as const;
  }
}

function statusLabel(status: Booking["status"]) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return "À payer";
    case "PENDING":
      return "En attente";
    case "CONFIRMED":
      return "Confirmée";
    case "COMPLETED":
      return "Terminée";
    case "DECLINED":
      return "Refusée";
    case "CANCELLED":
      return "Annulée";
    default:
      return "Absence";
  }
}

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  function load() {
    fetchMyBookings().then(setBookings).catch(() => setBookings([]));
  }

  useEffect(() => {
    load();
  }, []);

  const now = Date.now();
  const pending = bookings.filter((b) => b.status === "PENDING");
  const toPay = bookings.filter((b) => b.status === "AWAITING_PAYMENT");
  const upcoming = bookings.filter((b) => b.status === "CONFIRMED" && new Date(b.scheduledAt).getTime() >= now);
  const past = bookings.filter(
    (b) => b.status === "DECLINED" || b.status === "CANCELLED" || b.status === "COMPLETED" || b.status === "NO_SHOW" ||
      (b.status === "CONFIRMED" && new Date(b.scheduledAt).getTime() < now),
  );

  async function cancel(id: string) {
    setCancelError(null);
    try {
      await cancelBooking(id, "Annulée par le client");
      load();
    } catch (err) {
      setCancelError(cancelErrorMessage(err));
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Mes réservations</h1>
          <p className="sub">Vos séances de coaching à venir et passées.</p>
        </div>
      </div>

      {pending.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2>En attente de confirmation</h2>
          </div>
          <p className="empty-hint" style={{ padding: "0 22px 10px", color: "var(--slate)" }}>
            Le coach doit confirmer votre demande. Vous serez notifié(e) dès sa réponse.
          </p>
          {pending.map((b) => (
            <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease }}>
              <div className="booking-item">
                <div className="booking-time">{new Date(b.scheduledAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</div>
                <div className="booking-body">
                  <div className="t">{b.coachDisplayName} — {b.serviceName}</div>
                  <div className="s">{b.durationMinutes} min {b.packId ? "· via pack" : `· ${b.priceAmount} ${b.priceCurrency}`}</div>
                  <StatusPill tone="pending">En attente</StatusPill>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="mini" onClick={() => setOpen(open === b.id ? null : b.id)}>
                    Message
                  </Button>
                  <Button variant="danger" onClick={() => void cancel(b.id)}>
                    Annuler
                  </Button>
                </div>
              </div>
              {open === b.id ? <MessageThread bookingId={b.id} /> : null}
            </motion.div>
          ))}
        </div>
      ) : null}

      {toPay.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2>À payer</h2>
          </div>
          <p className="empty-hint" style={{ padding: "0 22px 10px" }}>
            Le coach a accepté. Payez pour confirmer le créneau.
          </p>
          {toPay.map((b) => (
            <div key={b.id} className="booking-item">
              <div className="booking-time">{new Date(b.scheduledAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</div>
              <div className="booking-body">
                <div className="t">{b.coachDisplayName} — {b.serviceName}</div>
                <div className="s">{b.priceAmount} {b.priceCurrency}</div>
                <StatusPill tone="pending">À payer</StatusPill>
              </div>
              <Button variant="primary" to={`/app/coaching/bookings/${b.id}/pay`}>
                Payer
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="panel">
        <div className="panel-head">
          <h2>À venir</h2>
        </div>
        {cancelError ? <p className="auth-error" style={{ padding: "0 22px 14px" }}>{cancelError}</p> : null}
        {upcoming.length === 0 ? (
          <p className="empty-hint" style={{ padding: "0 22px 20px" }}>
            Aucune séance à venir.
          </p>
        ) : (
          upcoming.map((b) => (
            <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease }}>
              <div className="booking-item">
                <div className="booking-time">{new Date(b.scheduledAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</div>
                <div className="booking-body">
                  <div className="t">{b.coachDisplayName} — {b.serviceName}</div>
                  <div className="s">{b.durationMinutes} min {b.packId ? "· via pack" : `· ${b.priceAmount} ${b.priceCurrency}`}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="mini" onClick={() => setOpen(open === b.id ? null : b.id)}>
                    Message
                  </Button>
                  <ReportForm bookingId={b.id} />
                  <Button variant="danger" onClick={() => void cancel(b.id)}>
                    Annuler
                  </Button>
                </div>
              </div>
              {open === b.id ? <MessageThread bookingId={b.id} /> : null}
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
            Aucune séance passée.
          </p>
        ) : (
          past.map((b) => (
            <div key={b.id}>
              <div className="booking-item">
                <div className="booking-time">{new Date(b.scheduledAt).toLocaleDateString("fr-FR")}</div>
                <div className="booking-body">
                  <div className="t">{b.coachDisplayName} — {b.serviceName}</div>
                  <StatusPill tone={statusTone(b.status)}>{statusLabel(b.status)}</StatusPill>
                  {b.status === "DECLINED" ? (
                    <div className="s" style={{ color: "var(--coral)", marginTop: 4 }}>
                      Le coach n'était pas disponible.{" "}
                      {b.suggestedSlots.length === 0 ? "Vous pouvez choisir un autre créneau." : ""}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {b.status !== "DECLINED" ? (
                    <Button variant="mini" onClick={() => setOpen(open === b.id ? null : b.id)}>
                      Message
                    </Button>
                  ) : null}
                  <ReportForm bookingId={b.id} />
                  {b.status === "COMPLETED" && !b.reviewed ? (
                    <Button variant="mini" onClick={() => setReview(review === b.id ? null : b.id)}>
                      {review === b.id ? "Fermer l'avis" : "Laisser un avis"}
                    </Button>
                  ) : null}
                </div>
              </div>
              {b.status === "DECLINED" && b.suggestedSlots.length > 0 ? (
                <SuggestedSlots booking={b} onPicked={load} />
              ) : null}
              {open === b.id ? <MessageThread bookingId={b.id} /> : null}
              {review === b.id ? (
                <ReviewForm
                  bookingId={b.id}
                  coachName={b.coachDisplayName ?? "le coach"}
                  onDone={() => { setReview(null); load(); }}
                />
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function SuggestedSlots({ booking, onPicked }: { booking: Booking; onPicked: () => void }) {
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(slot: string) {
    setPicking(slot);
    setError(null);
    try {
      await createBooking({ coachServiceId: booking.coachServiceId, scheduledAt: slot });
      onPicked();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer la demande.");
      setPicking(null);
    }
  }

  return (
    <div className="panel" style={{ margin: "4px 22px 14px", padding: "14px 18px" }}>
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13.5 }}>
        Le coach propose ces autres créneaux :
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {booking.suggestedSlots.map((slot) => (
          <Button key={slot} variant="mini" disabled={picking !== null} onClick={() => void pick(slot)}>
            {picking === slot
              ? "…"
              : new Date(slot).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
          </Button>
        ))}
      </div>
      {error ? <p className="auth-error" style={{ marginTop: 8 }}>{error}</p> : null}
    </div>
  );
}

function ReportForm({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason.trim()) return;
    setError(null);
    try {
      await reportBooking(bookingId, reason.trim());
      setSent(true);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer le signalement.");
    }
  }

  if (sent) {
    return <span className="empty-hint">Signalé</span>;
  }
  if (!open) {
    return (
      <Button variant="mini" onClick={() => setOpen(true)}>
        Signaler
      </Button>
    );
  }
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Décrire le problème…" />
      <Button variant="primary" onClick={() => void submit()}>
        Envoyer
      </Button>
      {error ? <span className="auth-error">{error}</span> : null}
    </div>
  );
}

function MessageThread({ bookingId }: { bookingId: string }) {
  const [messages, setMessages] = useState<CoachingMessage[]>([]);
  const [text, setText] = useState("");

  function load() {
    fetchThread(bookingId).then(setMessages).catch(() => setMessages([]));
  }

  useEffect(() => {
    load();
  }, [bookingId]);

  async function send() {
    if (!text.trim()) return;
    await sendMessage(bookingId, text.trim());
    setText("");
    load();
  }

  return (
    <div className="panel" style={{ marginTop: -8, marginBottom: 12 }}>
      <div className="panel-body">
        {messages.map((m) => (
          <div key={m.id} className="exp-item">
            <div className="exp-body">
              <div className="t">{m.senderDisplayName}</div>
              <div className="d">{m.body}</div>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre message…" style={{ flex: 1 }} />
          <Button variant="primary" onClick={() => void send()}>
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <span style={{ display: "inline-flex", gap: 4 }} role="group" aria-label="Note sur 5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 30,
            lineHeight: 1,
            color: n <= active ? "#f59e0b" : "#d1d5db",
            transition: "color 0.1s, transform 0.1s",
            transform: n <= active ? "scale(1.18)" : "scale(1)",
          }}
        >
          {n <= active ? "★" : "☆"}
        </button>
      ))}
    </span>
  );
}

function ReviewForm({ bookingId, coachName, onDone }: { bookingId: string; coachName: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      await submitReview(bookingId, rating, comment || undefined);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer l'avis.");
    }
  }

  return (
    <div className="panel" style={{ margin: "4px 22px 14px", padding: "16px 20px" }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>Votre avis sur {coachName}</div>
      <StarPicker value={rating} onChange={(v) => { setRating(v); setComment(""); }} />
      <p style={{ fontSize: 12, color: "var(--slate)", marginTop: 6 }}>
        {rating === 1 ? "Très insatisfait" : rating === 2 ? "Insatisfait" : rating === 3 ? "Correct" : rating === 4 ? "Bien" : "Excellent"}
      </p>
      {rating <= 3 ? (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Qu'est-ce qui n'a pas fonctionné ? (optionnel)"
          rows={3}
          style={{ width: "100%", resize: "vertical", marginTop: 8, boxSizing: "border-box" }}
        />
      ) : null}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button variant="primary" onClick={() => void submit()}>
          Publier l'avis
        </Button>
      </div>
      {error ? <p className="auth-error" style={{ marginTop: 8 }}>{error}</p> : null}
    </div>
  );
}
