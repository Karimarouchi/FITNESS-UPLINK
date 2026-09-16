import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import {
  confirmBooking,
  declineBooking,
  createAvailabilityRule,
  deleteAvailabilityRule,
  createAvailabilityException,
  fetchAgendaSummary,
  fetchAvailabilityRules,
  fetchAvailabilityExceptions,
  fetchCoachBookings,
  fetchCoachSettings,
  saveCoachSettings,
  reportBooking,
  DAY_LABELS,
  type AvailabilityRule,
  type Booking,
  type CoachAgendaSummary,
} from "../api";

const ease = [0.16, 1, 0.3, 1] as const;
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

/** Returns Monday of the current week as a Date */
function weekStart(d = new Date()) {
  const day = d.getDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

/** Returns ISO YYYY-MM-DD for a Date */
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function CoachAgendaPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CoachAgendaSummary | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [ruleForm, setRuleForm] = useState<{ days: number[]; startTime: string; endTime: string }>({
    days: [1],
    startTime: "09:00",
    endTime: "17:00",
  });
  const [exceptionForm, setExceptionForm] = useState({ date: new Date().toISOString().slice(0, 10), note: "" });
  const [cancellationHours, setCancellationHours] = useState(0);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState<string | null>(null);

  function load() {
    fetchAgendaSummary().then(setSummary).catch(() => setSummary(null));
    fetchCoachBookings().then(setBookings).catch(() => setBookings([]));
    fetchAvailabilityRules().then(setRules).catch(() => setRules([]));
    fetchCoachSettings().then((s) => setCancellationHours(s.cancellationDeadlineHours)).catch(() => setCancellationHours(0));
  }

  async function savePolicy() {
    setSavingPolicy(true);
    try {
      const saved = await saveCoachSettings(cancellationHours);
      setCancellationHours(saved.cancellationDeadlineHours);
    } finally {
      setSavingPolicy(false);
    }
  }

  async function sendReport(bookingId: string) {
    if (!reportReason.trim()) return;
    setReportError(null);
    try {
      await reportBooking(bookingId, reportReason.trim());
      setReportingId(null);
      setReportReason("");
      setReportSent(bookingId);
    } catch (err) {
      setReportError(err instanceof ApiError ? err.message : "Impossible d’envoyer le signalement.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const today = new Date().toDateString();
  const pendingBookings = bookings.filter((b) => b.status === "PENDING");
  const todayBookings = bookings
    .filter((b) => b.status === "CONFIRMED" && new Date(b.scheduledAt).toDateString() === today)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  async function addRule() {
    if (ruleForm.days.length === 0) return;
    await Promise.all(
      ruleForm.days.map((dayOfWeek) =>
        createAvailabilityRule({ dayOfWeek, startTime: ruleForm.startTime, endTime: ruleForm.endTime }),
      ),
    );
    setShowRuleForm(false);
    load();
  }

  async function addException() {
    fetchAvailabilityExceptions(exceptionForm.date, exceptionForm.date).catch(() => []);
    await createAvailabilityException({ date: exceptionForm.date, note: exceptionForm.note || undefined });
    setShowExceptionForm(false);
    load();
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Agenda &amp; réservations</h1>
          <div className="sub">Séances de coaching privé réservées par vos clients</div>
        </div>
        <div className="head-actions">
          {user ? (
            <Button variant="outline" to={`/coaches/${user.id}`}>
              Voir mon profil public
            </Button>
          ) : null}
        </div>
      </div>

      <div className="cards-row">
        <motion.div className="kcard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
          <div className="lbl">Séances cette semaine</div>
          <div className="val">{summary?.sessionsThisWeek ?? "—"}</div>
        </motion.div>
        <motion.div className="kcard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05, ease }}>
          <div className="lbl">Clients actifs</div>
          <div className="val">{summary?.activeClients ?? "—"}</div>
        </motion.div>
        <motion.div className="kcard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease }}>
          <div className="lbl">Packs en cours</div>
          <div className="val">{summary?.activePacks ?? "—"}</div>
        </motion.div>
        <motion.div className="kcard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15, ease }}>
          <div className="lbl">Note moyenne</div>
          <div className="val">{summary && summary.averageRating > 0 ? summary.averageRating.toFixed(1) : "—"}</div>
        </motion.div>
        {summary && summary.pendingRequests > 0 ? (
          <motion.div className="kcard" style={{ borderColor: "var(--lime)", background: "var(--lime-dim)" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2, ease }}>
            <div className="lbl">Demandes en attente</div>
            <div className="val">{summary.pendingRequests}</div>
          </motion.div>
        ) : null}
      </div>

      {pendingBookings.length > 0 ? (
        <div className="panel" style={{ borderColor: "var(--lime)", boxShadow: "0 0 0 2px rgba(214,255,63,0.18)" }}>
          <div className="panel-head">
            <h2>⏳ Demandes en attente</h2>
          </div>
          <p className="empty-hint" style={{ padding: "0 22px 10px" }}>
            Ces membres demandent une séance. Acceptez ou refusez — ils seront notifiés immédiatement.
          </p>
          {pendingBookings.map((b) => (
            <PendingBookingRow key={b.id} booking={b} onAction={load} />
          ))}
        </div>
      ) : null}

      <div className="panel">
        <div className="panel-head">
          <h2>Aujourd’hui</h2>
        </div>
        {todayBookings.length === 0 ? (
          <p className="empty-hint" style={{ padding: "0 22px 20px" }}>
            Aucune séance prévue aujourd’hui.
          </p>
        ) : (
          todayBookings.map((b) => (
            <div key={b.id}>
              <div className="booking-item">
                <div className="booking-time">{new Date(b.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
                <div className="booking-body">
                  <div className="t">{b.clientDisplayName} — {b.serviceName}</div>
                  <div className="s">
                    {b.durationMinutes} min {b.packId ? "· via pack" : `· ${b.priceAmount} ${b.priceCurrency}`}
                  </div>
                </div>
                {reportSent === b.id ? (
                  <span className="empty-hint">Signalé</span>
                ) : (
                  <Button variant="mini" onClick={() => { setReportingId(reportingId === b.id ? null : b.id); setReportError(null); }}>
                    Signaler
                  </Button>
                )}
              </div>
              {reportingId === b.id ? (
                <div style={{ display: "flex", gap: 8, padding: "0 0 14px" }}>
                  <input
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Décrire le problème…"
                    style={{ flex: 1 }}
                  />
                  <Button variant="primary" onClick={() => void sendReport(b.id)}>
                    Envoyer
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
        {reportError ? <p className="auth-error" style={{ padding: "0 22px 14px" }}>{reportError}</p> : null}
      </div>

      {/* ── Calendrier unifié ─────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-head">
          <h2>Calendrier</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--slate-light)" }}>
              {(() => {
                const s = weekStart();
                const e = new Date(s);
                e.setDate(s.getDate() + 6);
                return `${s.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} – ${e.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`;
              })()}
            </span>
            <Button
              variant={showRuleForm ? "dark" : "primary"}
              onClick={() => { setShowRuleForm((v) => !v); setShowExceptionForm(false); }}
            >
              + Créneau
            </Button>
            <Button
              variant={showExceptionForm ? "dark" : "primary"}
              onClick={() => { setShowExceptionForm((v) => !v); setShowRuleForm(false); }}
            >
              + Indisponibilité
            </Button>
          </div>
        </div>

        {/* Inline forms */}
        <AnimatePresence>
          {showRuleForm ? (
            <motion.div
              key="rule-form"
              className="calendar-form-card"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.35, ease }}
            >
              <motion.div
                className="calendar-form-card-inner"
                initial={{ scale: 0.97 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, ease }}
              >
                <div className="calendar-form-card-title">Ajouter un créneau récurrent</div>
                <div className="two-col">
                  <label className="field" style={{ gridColumn: "1 / -1" }}>
                    <span>Jours (plusieurs possibles, appliqué chaque semaine)</span>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                        const active = ruleForm.days.includes(dayIndex);
                        return (
                          <button
                            key={dayIndex}
                            type="button"
                            className={`btn-mini${active ? " primary" : ""}`}
                            onClick={() =>
                              setRuleForm((f) => ({
                                ...f,
                                days: active ? f.days.filter((d) => d !== dayIndex) : [...f.days, dayIndex],
                              }))
                            }
                          >
                            {DAY_LABELS[dayIndex]}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                  <label className="field">
                    <span>Début</span>
                    <input type="time" value={ruleForm.startTime} onChange={(e) => setRuleForm({ ...ruleForm, startTime: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Fin</span>
                    <input type="time" value={ruleForm.endTime} onChange={(e) => setRuleForm({ ...ruleForm, endTime: e.target.value })} />
                  </label>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <Button variant="primary" disabled={ruleForm.days.length === 0} onClick={() => void addRule()}>Ajouter</Button>
                    <Button variant="outline" onClick={() => setShowRuleForm(false)}>Annuler</Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {showExceptionForm ? (
            <motion.div
              key="exception-form"
              className="calendar-form-card"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              transition={{ duration: 0.35, ease }}
            >
              <motion.div
                className="calendar-form-card-inner"
                initial={{ scale: 0.97 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, ease }}
              >
                <div className="calendar-form-card-title">Bloquer une date</div>
                <div className="two-col">
                  <label className="field">
                    <span>Date bloquée</span>
                    <input type="date" value={exceptionForm.date} onChange={(e) => setExceptionForm({ ...exceptionForm, date: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>Note</span>
                    <input value={exceptionForm.note} onChange={(e) => setExceptionForm({ ...exceptionForm, note: e.target.value })} placeholder="Congés, formation…" />
                  </label>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <Button variant="primary" onClick={() => void addException()}>Bloquer</Button>
                    <Button variant="outline" onClick={() => setShowExceptionForm(false)}>Annuler</Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Unified calendar grid */}
        <UnifiedCalendar
          rules={rules}
          bookings={bookings}
          onDeleteRule={(id) => void deleteAvailabilityRule(id).then(load)}
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Politique d’annulation</h2>
        </div>
        <div className="panel-body" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="field" style={{ maxWidth: 260 }}>
            <span>Délai avant lequel un client peut annuler sans frais (heures)</span>
            <input
              type="number"
              min={0}
              max={168}
              value={cancellationHours}
              onChange={(e) => setCancellationHours(Number(e.target.value))}
            />
          </label>
          <Button variant="primary" disabled={savingPolicy} onClick={() => void savePolicy()}>
            {savingPolicy ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <p className="field-hint" style={{ flexBasis: "100%" }}>
            {cancellationHours > 0
              ? `Un client ne pourra plus annuler moins de ${cancellationHours}h avant la séance.`
              : "Annulation libre à tout moment (aucune restriction)."}
          </p>
        </div>
      </div>

    </section>
  );
}

function PendingBookingRow({ booking, onAction }: { booking: Booking; onAction: () => void }) {
  const [loading, setLoading] = useState<"confirm" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([""]);

  async function confirm() {
    setLoading("confirm");
    setError(null);
    try {
      await confirmBooking(booking.id);
      onAction();
    } catch {
      setError("Impossible de traiter la demande.");
      setLoading(null);
    }
  }

  async function decline() {
    setLoading("decline");
    setError(null);
    try {
      const isoSlots = suggestions
        .filter((v) => v.trim())
        .map((v) => new Date(v).toISOString());
      await declineBooking(booking.id, isoSlots);
      onAction();
    } catch {
      setError("Impossible de traiter la demande.");
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="booking-item">
        <div className="booking-time">{new Date(booking.scheduledAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</div>
        <div className="booking-body">
          <div className="t">{booking.clientDisplayName} — {booking.serviceName}</div>
          <div className="s">{booking.durationMinutes} min {booking.packId ? "· via pack" : `· ${booking.priceAmount} ${booking.priceCurrency}`}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="primary"
            disabled={loading !== null || declining}
            onClick={() => void confirm()}
          >
            {loading === "confirm" ? "…" : "✓ Confirmer"}
          </Button>
          <Button
            variant="danger"
            disabled={loading !== null}
            onClick={() => setDeclining((v) => !v)}
          >
            {declining ? "Annuler" : "✗ Refuser"}
          </Button>
        </div>
      </div>
      {declining ? (
        <div style={{ padding: "0 22px 14px" }}>
          <p className="empty-hint" style={{ padding: 0, marginBottom: 8 }}>
            Vous pouvez proposer jusqu’à 3 autres créneaux libres — le client pourra en choisir un directement.
          </p>
          {suggestions.map((value, index) => (
            <div key={index} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <input
                type="datetime-local"
                value={value}
                onChange={(e) => {
                  const next = [...suggestions];
                  next[index] = e.target.value;
                  setSuggestions(next);
                }}
              />
              {suggestions.length > 1 ? (
                <Button variant="mini" onClick={() => setSuggestions(suggestions.filter((_, i) => i !== index))}>
                  Retirer
                </Button>
              ) : null}
            </div>
          ))}
          {suggestions.length < 3 ? (
            <Button variant="mini" onClick={() => setSuggestions([...suggestions, ""])}>
              + Ajouter un créneau
            </Button>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Button variant="danger" disabled={loading !== null} onClick={() => void decline()}>
              {loading === "decline" ? "…" : "Confirmer le refus"}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p className="auth-error" style={{ padding: "0 22px 10px" }}>{error}</p> : null}
    </div>
  );
}

function UnifiedCalendar({
  rules,
  bookings,
  onDeleteRule,
}: {
  rules: AvailabilityRule[];
  bookings: Booking[];
  onDeleteRule: (id: string) => void;
}) {
  const mon = weekStart();
  const WEEK_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const ORDERED = [1, 2, 3, 4, 5, 6, 0]; // Mon→Sun JS day

  // Build 7 Date objects for this week
  const days = ORDERED.map((_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });

  // Filter bookings in range [CONFIRMED | AWAITING_PAYMENT] this week
  const weekBookings = bookings.filter((b) => {
    const d = iso(new Date(b.scheduledAt));
    return (
      (b.status === "CONFIRMED" || b.status === "AWAITING_PAYMENT") &&
      d >= iso(days[0]) &&
      d <= iso(days[6])
    );
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <div className="week-grid" style={{ minWidth: 560 }}>

        {/* ── Header row ── */}
        <div className="hd" />
        {days.map((d, i) => {
          const isToday = iso(d) === iso(new Date());
          const hasBkg = weekBookings.some((b) => iso(new Date(b.scheduledAt)) === iso(d));
          return (
            <div
              key={i}
              className="hd"
              style={{
                background: isToday ? "var(--lime-dim)" : undefined,
                fontWeight: isToday ? 800 : undefined,
                borderBottom: hasBkg ? "3px solid var(--navy, #141a32)" : undefined,
              }}
            >
              {WEEK_LABELS[i]}
              <br />
              <span style={{ fontWeight: 400, fontSize: 11, color: "var(--slate-light)" }}>
                {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
              </span>
            </div>
          );
        })}

        {/* ── Time rows ── */}
        {HOURS.map((hour) => (
          <React.Fragment key={hour}>
            <div className="time">{String(hour).padStart(2, "0")}:00</div>
            {ORDERED.map((jsDay, colIdx) => {
              const dayDate = days[colIdx];
              const hh = String(hour).padStart(2, "0") + ":00";
              // Availability rule for this (day, hour)
              const rule = rules.find(
                (r) => r.dayOfWeek === jsDay && r.startTime <= hh && r.endTime > hh,
              );
              // Bookings starting at this exact hour on this day
              const cellBookings = weekBookings.filter((b) => {
                const bd = new Date(b.scheduledAt);
                return iso(bd) === iso(dayDate) && bd.getHours() === hour;
              });

              const hasBooking = cellBookings.length > 0;
              const isAwaitingPayment = cellBookings.some((b) => b.status === "AWAITING_PAYMENT");
              const cellBg = isAwaitingPayment ? "#ffe6bf" : hasBooking ? "#cfe0fe" : rule ? "var(--lime-dim)" : undefined;
              const cellBorder = isAwaitingPayment ? "#c9820a" : hasBooking ? "var(--navy, #141a32)" : undefined;

              return (
                <div
                  key={`${hour}-${jsDay}`}
                  className="slot"
                  title={rule && !hasBooking ? "Cliquer pour retirer ce créneau de disponibilité" : undefined}
                  style={{
                    // Booking takes visual priority over availability rule
                    background: cellBg,
                    borderLeft: hasBooking ? `3px solid ${cellBorder}` : undefined,
                    padding: hasBooking ? "2px 5px" : undefined,
                    cursor: rule && !hasBooking ? "pointer" : "default",
                    overflow: "hidden",
                    fontSize: 11,
                    lineHeight: 1.3,
                  }}
                  onClick={() => rule && !hasBooking && onDeleteRule(rule.id)}
                >
                  {cellBookings.map((b) => (
                    <div
                      key={b.id}
                      style={{ fontWeight: 700, color: "#141a32", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {new Date(b.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{" "}
                      {b.clientDisplayName ?? "Client"}
                      <br />
                      <span style={{ fontWeight: 400, fontSize: 10, color: "#334" }}>
                        {b.serviceName} · {b.durationMinutes} min
                        {b.status === "AWAITING_PAYMENT" ? " ⏳" : " ✓"}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Legend */}
      <div className="legend">
        <span>
          <span className="sw" style={{ background: "var(--lime-dim)", border: "1px solid var(--paper-line)" }} />
          Disponible (cliquer pour retirer)
        </span>
        <span>
          <span className="sw" style={{ background: "#cfe0fe", borderLeft: "3px solid #141a32" }} />
          Séance réservée ✓
        </span>
        <span>
          <span className="sw" style={{ background: "#ffe6bf", borderLeft: "3px solid #c9820a" }} />
          En attente paiement ⏳
        </span>
        <span>
          <span className="sw" style={{ background: "var(--paper-2)", border: "1px solid var(--paper-line)" }} />
          Indisponible
        </span>
      </div>
    </div>
  );
}
