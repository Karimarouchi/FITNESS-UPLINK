import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import {
  coachLocation,
  createBooking,
  fetchCoachAvailability,
  fetchCoachPackOffers,
  fetchCoachProfile,
  purchasePack,
  fetchDirectMessages,
  sendDirectMessage,
  submitCoachReview,
  PACK_TYPE_LABELS,
  type CoachProfile,
  type DirectMessage,
  type PackOffer,
  type TimeSlot,
} from "../api";
import { CoachPhoto } from "../CoachPhoto";
import { RatingStars } from "../RatingStars";
import { openCoachChat } from "@/features/recruitment/openHireChat";

const ease = [0.16, 1, 0.3, 1] as const;
type Tab = "services" | "availability" | "reviews";

export function CoachProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [offers, setOffers] = useState<PackOffer[]>([]);
  const [tab, setTab] = useState<Tab>("services");
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<{ serviceId: string; serviceName: string; price: string; currency: string } | null>(null);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchCoachProfile(id).then(setProfile).catch(() => setError("Coach introuvable."));
    fetchCoachPackOffers(id).then(setOffers).catch(() => setOffers([]));
  }, [id]);

  if (error) {
    return (
      <section>
        <p className="jobs-empty">
          <strong>{error}</strong>
        </p>
      </section>
    );
  }
  if (!profile || !id) {
    return null;
  }

  const place = coachLocation(profile);

  return (
    <section>
      <motion.div className="profile-banner" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <CoachPhoto coachId={profile.id} uploadId={profile.photoUploadId} name={profile.displayName} size={88} />
        <div>
          <div className="pn">{profile.displayName}</div>
          <div className="pt">{profile.title || "Coach sportif"}</div>
          <div className="ploc">{place || "Lieu non renseigné"}</div>
          <RatingStars
            value={profile.averageRating}
            count={profile.reviewCount}
            canReview={profile.canReview}
            myRating={profile.myRating}
            onSubmit={async (rating, comment) => {
              await submitCoachReview(id, rating, comment);
              const next = await fetchCoachProfile(id);
              setProfile(next);
            }}
          />
          <div className="tag-row">
            {profile.specialties.map((s) => (
              <Tag key={s}>{s}</Tag>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <Button
              variant="outline"
              onClick={() => {
                // Prefer the global chat widget; only fall back to the inline panel when it isn't mounted.
                if (!openCoachChat(id, profile.displayName)) setShowContact(true);
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>chat</span>
              Contacter le coach
            </Button>
          </div>
        </div>
      </motion.div>

      {profile.biography ? (
        <div className="panel">
          <div className="panel-head">
            <h2>À propos</h2>
          </div>
          <p style={{ padding: "0 22px 20px", color: "var(--slate)" }}>{profile.biography}</p>
        </div>
      ) : null}

      <div className="meta-bar" style={{ justifyContent: "flex-start", padding: "0 0 18px" }}>
        {(["services", "availability", "reviews"] as Tab[]).map((t) => (
          <button key={t} type="button" className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t === "services" ? "Services" : t === "availability" ? "Disponibilités" : "Avis"}
          </button>
        ))}
      </div>

      {tab === "services" ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Services proposés</h2>
          </div>
          <div className="doc-grid">
            {profile.services.map((service) => (
              <div key={service.id} className="doc-card">
                <div className="top">
                  <div className="doc-icon">🏋️</div>
                </div>
                <div className="t">{service.name}</div>
                <div className="org">
                  {service.durationMinutes} min · {service.priceAmount} {service.priceCurrency}
                </div>
                {service.description ? <div className="meta">{service.description}</div> : null}
                <div style={{ marginTop: 10 }}>
                  <Button
                    variant="primary"
                    onClick={() => setBooking({ serviceId: service.id, serviceName: service.name, price: service.priceAmount, currency: service.priceCurrency })}
                  >
                    Réserver
                  </Button>
                </div>
              </div>
            ))}
            {profile.services.length === 0 ? <p className="empty-hint">Ce coach n’a pas encore publié de service.</p> : null}
          </div>

          {offers.length > 0 ? (
            <>
              <div className="panel-head" style={{ marginTop: 24 }}>
                <h2>Packs de séances</h2>
              </div>
              <PackOffers offers={offers} coachName={profile.displayName} />
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "availability" ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Disponibilités</h2>
          </div>
          <p className="empty-hint" style={{ padding: "0 22px 20px" }}>
            Choisissez un service pour voir les créneaux disponibles.
          </p>
          <div className="doc-grid">
            {profile.services.map((service) => (
              <button
                key={service.id}
                type="button"
                className="doc-card"
                onClick={() => setBooking({ serviceId: service.id, serviceName: service.name, price: service.priceAmount, currency: service.priceCurrency })}
              >
                <div className="t">{service.name}</div>
                <div className="org">{service.durationMinutes} min</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "reviews" ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Avis</h2>
          </div>
          {profile.reviews.length === 0 ? (
            <p className="empty-hint" style={{ padding: "0 22px 20px" }}>
              Pas encore d’avis pour ce coach.
            </p>
          ) : (
            <>
              {profile.reviews.map((review) => (
                <div key={review.id} className="booking-item">
                  <div className="booking-time">
                    {[1,2,3,4,5].map((n) => (
                      <span key={n} className="material-symbols-outlined" style={{ fontSize: 15, color: n <= review.rating ? "#f59e0b" : "#cbd5e0", fontVariationSettings: n <= review.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                    ))}
                  </div>
                  <div className="booking-body">
                    <div className="t">{review.clientDisplayName}</div>
                    {review.comment ? <div className="s">{review.comment}</div> : null}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      ) : null}

      <AnimatePresence>
        {showContact ? (
          <DirectMessagePanel
            coachId={id}
            coachName={profile.displayName}
            onClose={() => setShowContact(false)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {booking ? (
          <BookingModal
            coachId={id}
            service={booking}
            onClose={() => setBooking(null)}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function PackOffers({ offers, coachName }: { offers: PackOffer[]; coachName: string }) {
  const [buying, setBuying] = useState<string | null>(null);
  const [card, setCard] = useState("4242424242424242");
  const [message, setMessage] = useState<string | null>(null);

  async function buy(offerId: string) {
    setMessage(null);
    try {
      await purchasePack(offerId, card);
      setMessage("Pack acheté avec succès.");
      setBuying(null);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Paiement refusé.");
    }
  }

  return (
    <div className="doc-grid">
      {offers.map((offer) => (
        <motion.div key={offer.id} className="doc-card" whileHover={{ y: -6 }} transition={{ duration: 0.2 }}>
          <div className="t">{PACK_TYPE_LABELS[offer.packType] ?? offer.packType}</div>
          <div className="org">
            {offer.priceAmount} {offer.priceCurrency}
            {offer.validityDays ? ` · valable ${offer.validityDays} j` : ""}
          </div>
          {buying === offer.id ? (
            <div style={{ marginTop: 8 }}>
              <input value={card} onChange={(e) => setCard(e.target.value)} placeholder="Numéro de carte" />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Button variant="primary" onClick={() => void buy(offer.id)}>
                  Payer
                </Button>
                <Button variant="outline" onClick={() => setBuying(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>
              <Button variant="primary" onClick={() => setBuying(offer.id)}>
                Acheter ce pack chez {coachName}
              </Button>
            </div>
          )}
        </motion.div>
      ))}
      {message ? <p className="auth-error mt-6">{message}</p> : null}
    </div>
  );
}

function BookingModal({
  coachId,
  service,
  onClose,
}: {
  coachId: string;
  service: { serviceId: string; serviceName: string; price: string; currency: string };
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selected, setSelected] = useState<TimeSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSelected(null);
    setLoadingSlots(true);
    void (async () => {
      try {
        let day = date;
        for (let i = 0; i < 21; i += 1) {
          const list = await fetchCoachAvailability(coachId, service.serviceId, day);
          if (cancelled) return;
          if (list.some((slot) => slot.available)) {
            if (day !== date) {
              setDate(day);
            }
            setSlots(list);
            setLoadingSlots(false);
            return;
          }
          const next = new Date(`${day}T12:00:00`);
          next.setDate(next.getDate() + 1);
          day = next.toISOString().slice(0, 10);
        }
        setSlots([]);
        setLoadingSlots(false);
      } catch {
        if (!cancelled) {
          setSlots([]);
          setLoadingSlots(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coachId, service.serviceId, date]);

  async function confirm() {
    if (!selected) return;
    setError(null);
    setSending(true);
    try {
      await createBooking({ coachServiceId: service.serviceId, scheduledAt: selected.start });
      navigate("/app/coaching/bookings", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer la demande.");
    } finally {
      setSending(false);
    }
  }

  const available = slots.filter((slot) => slot.available);

  return (
    <motion.div
      className="modal-backdrop"
      style={{ position: "fixed", inset: 0, background: "rgba(16,21,26,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="panel"
        style={{ maxWidth: 480, width: "92%", maxHeight: "86vh", overflowY: "auto" }}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.3, ease }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>Réserver — {service.serviceName}</h2>
        </div>
        <div className="panel-body">
            <>
              <p className="empty-hint" style={{ padding: 0, marginBottom: 12 }}>
                Choisissez un jour et une heure. Le coach doit d’abord confirmer ce créneau ; vous réglerez le tarif
                ({service.price} {service.currency}) une fois la demande acceptée.
              </p>
              <label className="field">
                <span>Date</span>
                <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
              </label>
              <div className="week-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginTop: 12 }}>
                {slots.map((slot) => {
                  const label = new Date(slot.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                  const isSelected = selected?.start === slot.start;
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={!slot.available}
                      className={`slot slot-pick ${slot.available ? "avail" : "booked"} ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelected(slot)}
                    >
                      {label}
                    </button>
                  );
                })}
                {!loadingSlots && slots.length === 0 ? (
                  <p className="empty-hint">Ce coach n’a pas encore défini de créneaux sur cette période.</p>
                ) : null}
                {!loadingSlots && slots.length > 0 && available.length === 0 ? (
                  <p className="empty-hint">Aucun créneau libre ce jour-là. Changez de date.</p>
                ) : null}
              </div>

              {error ? <p className="auth-error mt-6">{error}</p> : null}

              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Button variant="primary" disabled={!selected || sending} onClick={() => void confirm()}>
                  {sending ? "Envoi…" : "Envoyer la demande"}
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Annuler
                </Button>
              </div>
            </>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DirectMessagePanel({
  coachId,
  coachName,
  onClose,
}: {
  coachId: string;
  coachName: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function load() {
    fetchDirectMessages(coachId)
      .then((msgs) => {
        setMessages((prev) => {
          if (prev.length === msgs.length && prev.at(-1)?.id === msgs.at(-1)?.id) return prev;
          return msgs;
        });
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    setText("");
    try {
      await sendDirectMessage(coachId, body);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi impossible.");
      setText(body);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <motion.div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(16,21,26,0.55)",
        display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
        padding: "0 32px 32px",
        zIndex: 50,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={{
          width: 380, height: 520,
          background: "var(--paper-2)",
          borderRadius: 18,
          boxShadow: "0 24px 60px rgba(16,21,26,0.28)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.28, ease }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px",
          background: "var(--ink)", color: "#f4f5f1",
          flexShrink: 0,
        }}>
          <CoachPhoto coachId={coachId} uploadId={null} name={coachName} size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{coachName}</div>
            <div style={{ fontSize: 11, opacity: 0.62 }}>Coaching · En ligne</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: 0, color: "#f4f5f1", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.length === 0 ? (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--slate)", fontSize: 13 }}>
              <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>💬</span>
              Aucun message encore.<br />Posez votre question sans réserver d'abord.
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === user?.id;
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
                  <div style={{
                    maxWidth: "74%",
                    padding: "9px 13px",
                    borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: isMe ? "var(--ink)" : "var(--paper)",
                    color: isMe ? "#f4f5f1" : "var(--ink)",
                    fontSize: 13.5,
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}>
                    {m.body}
                    <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: isMe ? "right" : "left" }}>
                      {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--paper-line)",
          display: "flex", gap: 8, alignItems: "center",
          flexShrink: 0, background: "var(--paper-2)",
        }}>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Aa"
            disabled={sending}
            style={{
              flex: 1, height: 38, borderRadius: 999,
              background: "var(--paper)", border: "1px solid var(--paper-line)",
              padding: "0 14px", fontSize: 13.5,
              outline: "none",
            }}
          />
          <button
            type="button"
            disabled={sending || !text.trim()}
            onClick={() => void send()}
            style={{
              width: 38, height: 38, borderRadius: "50%", border: 0,
              background: text.trim() ? "var(--ink)" : "var(--paper-line)",
              color: text.trim() ? "#f4f5f1" : "var(--slate-light)",
              cursor: text.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
          </button>
        </div>
        {error ? <p style={{ padding: "4px 12px 8px", color: "var(--coral)", fontSize: 12, margin: 0 }}>{error}</p> : null}
      </motion.div>
    </motion.div>
  );
}
