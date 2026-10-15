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
  deleteAvailabilityException,
  updateAvailabilityRule,
  fetchAgendaSummary,
  fetchAvailabilityRules,
  fetchAvailabilityExceptions,
  fetchCoachBookings,
  fetchCoachSettings,
  saveCoachSettings,
  reportBooking,
  DAY_LABELS,
  type AvailabilityException,
  type AvailabilityRule,
  type Booking,
  type CoachAgendaSummary,
} from "../api";

const ease = [0.16, 1, 0.3, 1] as const;
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

/** Returns Monday of the week shifted by `offset` weeks, at local midnight. */
function weekStart(offset = 0, d = new Date()) {
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff + offset * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Local calendar day as YYYY-MM-DD (toISOString would shift the day through UTC). */
function iso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "09:30" or "09:30:00" -> minutes since midnight. */
function toMin(time: string) {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

function hhmm(time: string) {
  return time.slice(0, 5);
}

const AGENDA_ERRORS: Record<string, string> = {
  TIME_RANGE_INVALID: "L’heure de fin doit être après l’heure de début.",
  AVAILABILITY_RULE_OVERLAP: "Ce créneau chevauche un créneau déjà défini ce jour-là.",
  DAY_OF_WEEK_INVALID: "Jour invalide.",
  AVAILABILITY_RULE_NOT_FOUND: "Ce créneau n’existe plus.",
  DATE_REQUIRED: "Choisissez une date.",
};

function agendaError(err: unknown) {
  return err instanceof ApiError ? (AGENDA_ERRORS[err.message] ?? "Action impossible.") : "Action impossible.";
}

/** Full-day block, or one covering part of the given hour. */
function blocksHour(e: AvailabilityException, hourStart: number) {
  if (!e.startTime && !e.endTime) {
    return true;
  }
  return toMin(e.startTime ?? "00:00") < hourStart + 60 && toMin(e.endTime ?? "24:00") > hourStart;
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const FULL_DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type DayWindow = { key: string; id?: string; startTime: string; endTime: string };
type DaySchedule = { open: boolean; windows: DayWindow[] };

let windowCounter = 0;

function newWindow(startTime = "09:00", endTime = "17:00"): DayWindow {
  windowCounter += 1;
  return { key: `new-${windowCounter}`, startTime, endTime };
}

function sortedRulesOf(rules: AvailabilityRule[], day: number) {
  return rules
    .filter((r) => r.active && r.dayOfWeek === day)
    .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
}

/** Every saved rule becomes an editable window of its day; closed days keep one blank window. */
function buildSchedule(rules: AvailabilityRule[]): Record<number, DaySchedule> {
  const out: Record<number, DaySchedule> = {};
  for (const day of WEEK_ORDER) {
    const list = sortedRulesOf(rules, day);
    out[day] = {
      open: list.length > 0,
      windows: list.length
        ? list.map((r) => ({ key: r.id, id: r.id, startTime: hhmm(r.startTime), endTime: hhmm(r.endTime) }))
        : [newWindow()],
    };
  }
  return out;
}

/** Windows that will really exist for the day once saved. */
function desiredOf(schedule: Record<number, DaySchedule>, day: number) {
  return schedule[day].open ? schedule[day].windows : [];
}

function signature(list: DayWindow[]) {
  return list.map((w) => `${w.id ?? "+"}|${w.startTime}|${w.endTime}`).join(";");
}

function hasOverlap(list: DayWindow[]) {
  const sorted = [...list].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
  return sorted.some((w, i) => i > 0 && toMin(w.startTime) < toMin(sorted[i - 1].endTime));
}

/** Merges windows that overlap or touch; the earliest one keeps its id. */
function mergeWindows(list: DayWindow[]) {
  const sorted = [...list].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
  const out: DayWindow[] = [];
  for (const w of sorted) {
    const last = out[out.length - 1];
    if (last && toMin(w.startTime) <= toMin(last.endTime)) {
      if (toMin(w.endTime) > toMin(last.endTime)) {
        last.endTime = w.endTime;
      }
    } else {
      out.push({ ...w });
    }
  }
  return out;
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
  const [exceptionForm, setExceptionForm] = useState({ date: iso(new Date()), note: "" });
  const [weekOffset, setWeekOffset] = useState(0);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [editing, setEditing] = useState<AvailabilityRule | null>(null);
  const [editForm, setEditForm] = useState({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>(() => buildSchedule([]));
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [weekOpen, setWeekOpen] = useState(() => {
    try {
      return window.localStorage.getItem("agenda.weekOpen") !== "0";
    } catch {
      return true;
    }
  });
  const [copyFor, setCopyFor] = useState<number | null>(null);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
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
    loadExceptions();
  }

  function loadExceptions() {
    const from = iso(weekStart(weekOffset));
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 120);
    const weekEnd = weekStart(weekOffset);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const to = iso(horizon > weekEnd ? horizon : weekEnd);
    fetchAvailabilityExceptions(from, to).then(setExceptions).catch(() => setExceptions([]));
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

  useEffect(() => {
    loadExceptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => {
    setSchedule(buildSchedule(rules));
  }, [rules]);

  const today = new Date().toDateString();
  const pendingBookings = bookings.filter((b) => b.status === "PENDING");
  const todayBookings = bookings
    .filter((b) => b.status === "CONFIRMED" && new Date(b.scheduledAt).toDateString() === today)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  async function addRule() {
    if (ruleForm.days.length === 0) return;
    if (toMin(ruleForm.startTime) >= toMin(ruleForm.endTime)) {
      setFormError(AGENDA_ERRORS.TIME_RANGE_INVALID);
      return;
    }
    setFormError(null);
    const failed: string[] = [];
    let lastError: unknown = null;
    for (const dayOfWeek of ruleForm.days) {
      try {
        await createAvailabilityRule({ dayOfWeek, startTime: ruleForm.startTime, endTime: ruleForm.endTime });
      } catch (err) {
        failed.push(DAY_LABELS[dayOfWeek]);
        lastError = err;
      }
    }
    load();
    if (failed.length) {
      setFormError(`${agendaError(lastError)} (${failed.join(", ")}). Pour changer un jour déjà défini, utilisez « Horaires de la semaine » ou cliquez sur le créneau dans le calendrier.`);
      return;
    }
    setShowRuleForm(false);
    setFlash("Créneau ajouté.");
  }

  async function addException() {
    setFormError(null);
    try {
      await createAvailabilityException({ date: exceptionForm.date, note: exceptionForm.note || undefined });
      setShowExceptionForm(false);
      setExceptionForm({ ...exceptionForm, note: "" });
      load();
      setFlash("Date bloquée.");
    } catch (err) {
      setFormError(agendaError(err));
    }
  }

  async function removeException(id: string) {
    try {
      await deleteAvailabilityException(id);
      setExceptions((current) => current.filter((item) => item.id !== id));
      setFlash("Date débloquée.");
    } catch (err) {
      setFlash(agendaError(err));
    }
  }

  const savedSchedule = buildSchedule(rules);
  const scheduleDirty = WEEK_ORDER.some(
    (day) => signature(desiredOf(schedule, day)) !== signature(desiredOf(savedSchedule, day)),
  );
  const scheduleHasOverlap = WEEK_ORDER.some((day) => hasOverlap(desiredOf(schedule, day)));

  function toggleWeekPanel() {
    setWeekOpen((open) => {
      try {
        window.localStorage.setItem("agenda.weekOpen", open ? "0" : "1");
      } catch {
        /* storage unavailable: the panel still toggles */
      }
      return !open;
    });
  }

  function patchDay(day: number, patch: Partial<DaySchedule>) {
    setSchedule((current) => ({ ...current, [day]: { ...current[day], ...patch } }));
    setScheduleError(null);
  }

  function patchWindow(day: number, key: string, patch: Partial<DayWindow>) {
    setSchedule((current) => ({
      ...current,
      [day]: { ...current[day], windows: current[day].windows.map((w) => (w.key === key ? { ...w, ...patch } : w)) },
    }));
    setScheduleError(null);
  }

  function addWindow(day: number) {
    setSchedule((current) => {
      const windows = current[day].windows;
      const lastEnd = windows.reduce((max, w) => Math.max(max, toMin(w.endTime)), 0);
      const start = lastEnd > 0 && lastEnd < 22 * 60 ? lastEnd : 9 * 60;
      const end = Math.min(start + 120, 23 * 60 + 59);
      const fmt = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      return { ...current, [day]: { open: true, windows: [...windows, newWindow(fmt(start), fmt(end))] } };
    });
    setScheduleError(null);
  }

  function removeWindow(day: number, key: string) {
    setSchedule((current) => {
      const left = current[day].windows.filter((w) => w.key !== key);
      return { ...current, [day]: left.length ? { ...current[day], windows: left } : { open: false, windows: [newWindow()] } };
    });
    setScheduleError(null);
  }

  function mergeAllOverlaps() {
    setSchedule((current) => {
      const next = { ...current };
      for (const day of WEEK_ORDER) {
        if (next[day].open && hasOverlap(next[day].windows)) {
          next[day] = { ...next[day], windows: mergeWindows(next[day].windows) };
        }
      }
      return next;
    });
    setScheduleError(null);
  }

  function applyCopy(from: number) {
    setSchedule((current) => {
      const next = { ...current };
      for (const target of copyTargets) {
        const existing = sortedRulesOf(rules, target);
        next[target] = {
          open: true,
          windows: current[from].windows.map((w, i) => ({
            key: existing[i]?.id ?? newWindow().key,
            id: existing[i]?.id,
            startTime: w.startTime,
            endTime: w.endTime,
          })),
        };
      }
      return next;
    });
    setCopyFor(null);
    setCopyTargets([]);
    setScheduleError(null);
  }

  async function saveSchedule() {
    for (const day of WEEK_ORDER) {
      const list = desiredOf(schedule, day);
      if (list.some((w) => toMin(w.startTime) >= toMin(w.endTime))) {
        setScheduleError(`${AGENDA_ERRORS.TIME_RANGE_INVALID} (${FULL_DAY_NAMES[day]})`);
        return;
      }
      if (hasOverlap(list)) {
        setScheduleError(`Des plages se chevauchent (${FULL_DAY_NAMES[day]}). Utilisez « Fusionner les plages qui se chevauchent ».`);
        return;
      }
    }
    setScheduleBusy(true);
    setScheduleError(null);
    const failed = new Set<string>();
    let lastError: unknown = null;
    const run = async (day: number, action: () => Promise<unknown>) => {
      try {
        await action();
      } catch (err) {
        failed.add(DAY_LABELS[day]);
        lastError = err;
      }
    };
    // Order matters: free the time first (deletes), then move (updates), then add (creates).
    for (const day of WEEK_ORDER) {
      const keep = new Set(desiredOf(schedule, day).filter((w) => w.id).map((w) => w.id));
      for (const rule of sortedRulesOf(rules, day)) {
        if (!keep.has(rule.id)) {
          await run(day, () => deleteAvailabilityRule(rule.id));
        }
      }
    }
    for (const day of WEEK_ORDER) {
      for (const w of desiredOf(schedule, day)) {
        const saved = w.id ? rules.find((r) => r.id === w.id) : undefined;
        if (saved && (hhmm(saved.startTime) !== w.startTime || hhmm(saved.endTime) !== w.endTime)) {
          await run(day, () => updateAvailabilityRule(saved.id, { dayOfWeek: day, startTime: w.startTime, endTime: w.endTime }));
        }
      }
    }
    for (const day of WEEK_ORDER) {
      for (const w of desiredOf(schedule, day)) {
        if (!w.id) {
          await run(day, () => createAvailabilityRule({ dayOfWeek: day, startTime: w.startTime, endTime: w.endTime }));
        }
      }
    }
    setScheduleBusy(false);
    load();
    if (failed.size) {
      setScheduleError(`${agendaError(lastError)} (${[...failed].join(", ")})`);
    } else {
      setFlash("Horaires enregistrés.");
    }
  }

  function openEditor(rule: AvailabilityRule) {
    setEditing(rule);
    setEditForm({ dayOfWeek: rule.dayOfWeek, startTime: hhmm(rule.startTime), endTime: hhmm(rule.endTime) });
    setEditError(null);
  }

  async function saveEdit() {
    if (!editing) return;
    if (toMin(editForm.startTime) >= toMin(editForm.endTime)) {
      setEditError(AGENDA_ERRORS.TIME_RANGE_INVALID);
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      await updateAvailabilityRule(editing.id, editForm);
      setEditing(null);
      setFlash("Créneau modifié.");
      load();
    } catch (err) {
      setEditError(agendaError(err));
    } finally {
      setEditBusy(false);
    }
  }

  async function deleteEdit() {
    if (!editing) return;
    setEditBusy(true);
    try {
      await deleteAvailabilityRule(editing.id);
      setEditing(null);
      setFlash("Créneau supprimé.");
      load();
    } catch (err) {
      setEditError(agendaError(err));
    } finally {
      setEditBusy(false);
    }
  }

  return (
    <section className="agx-page">
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
          <motion.div className="kcard" style={{ borderColor: "var(--vt-lime, #FC5101)", background: "var(--vt-lime-soft, #ffe8dc)" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2, ease }}>
            <div className="lbl">Demandes en attente</div>
            <div className="val">{summary.pendingRequests}</div>
          </motion.div>
        ) : null}
      </div>

      {pendingBookings.length > 0 ? (
        <div className="panel" style={{ borderColor: "var(--vt-navy, #0b1a33)", borderTop: "6px solid var(--vt-lime, #FC5101)" }}>
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

      {/* ── Horaires de la semaine ─────────────────────────────────── */}
      <div className={weekOpen ? "panel agx-fold is-open" : "panel agx-fold"}>
        <button
          type="button"
          className="agx-fold-head"
          aria-expanded={weekOpen}
          aria-controls="agx-week-body"
          onClick={toggleWeekPanel}
        >
          <h2>Horaires de la semaine</h2>
          {!weekOpen && scheduleDirty ? <span className="agx-fold-dot">Modifications non enregistrées</span> : null}
          <span className="agx-fold-state">{weekOpen ? "Réduire" : "Modifier"}</span>
          <span className="material-symbols-outlined agx-fold-icon" aria-hidden="true">
            expand_more
          </span>
        </button>
        <div className="agx-fold-body" id="agx-week-body">
        <div className="agx-fold-inner">
        <div className="agx-week">
          <p className="agx-week-hint">
            Ouvrez ou fermez chaque jour, écrivez vos heures, ajoutez plusieurs plages dans la même journée, ou copiez
            les horaires d’un jour vers d’autres jours.
          </p>
          {scheduleHasOverlap ? (
            <div className="agx-warn">
              <span className="material-symbols-outlined" aria-hidden="true">warning</span>
              <span>Certaines plages se chevauchent (doublons).</span>
              <button type="button" onClick={mergeAllOverlaps}>Fusionner les plages qui se chevauchent</button>
            </div>
          ) : null}
          <ul className="agx-week-list">
            {WEEK_ORDER.map((day) => {
              const row = schedule[day];
              const overlapping = row.open && hasOverlap(row.windows);
              return (
                <li key={day} className={row.open ? "agx-day is-open" : "agx-day"}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.open}
                    aria-label={`${FULL_DAY_NAMES[day]} : ${row.open ? "ouvert" : "fermé"}`}
                    className="agx-switch"
                    onClick={() => patchDay(day, { open: !row.open })}
                  >
                    <span />
                  </button>
                  <strong className="agx-day-name">{FULL_DAY_NAMES[day]}</strong>
                  {row.open ? (
                    <div className="agx-day-body">
                      {row.windows.map((w) => (
                        <div key={w.key} className={overlapping ? "agx-window is-bad" : "agx-window"}>
                          <input
                            type="time"
                            aria-label={`${FULL_DAY_NAMES[day]} début`}
                            value={w.startTime}
                            onChange={(e) => patchWindow(day, w.key, { startTime: e.target.value })}
                          />
                          <span>→</span>
                          <input
                            type="time"
                            aria-label={`${FULL_DAY_NAMES[day]} fin`}
                            value={w.endTime}
                            onChange={(e) => patchWindow(day, w.key, { endTime: e.target.value })}
                          />
                          <button
                            type="button"
                            className="agx-icon-btn"
                            aria-label="Retirer cette plage"
                            title="Retirer cette plage"
                            onClick={() => removeWindow(day, w.key)}
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">close</span>
                          </button>
                        </div>
                      ))}
                      <div className="agx-day-tools">
                        <button type="button" className="agx-link-btn" onClick={() => addWindow(day)}>
                          <span className="material-symbols-outlined" aria-hidden="true">add</span>
                          Ajouter une plage
                        </button>
                        <button
                          type="button"
                          className="agx-link-btn"
                          aria-expanded={copyFor === day}
                          onClick={() => {
                            setCopyFor(copyFor === day ? null : day);
                            setCopyTargets([]);
                          }}
                        >
                          <span className="material-symbols-outlined" aria-hidden="true">content_copy</span>
                          Copier vers…
                        </button>
                      </div>
                      {copyFor === day ? (
                        <div className="agx-copy">
                          <span>Appliquer ces horaires à :</span>
                          {WEEK_ORDER.filter((other) => other !== day).map((other) => {
                            const on = copyTargets.includes(other);
                            return (
                              <button
                                key={other}
                                type="button"
                                aria-pressed={on}
                                className={on ? "agx-chip is-on" : "agx-chip"}
                                onClick={() =>
                                  setCopyTargets((current) => (on ? current.filter((d) => d !== other) : [...current, other]))
                                }
                              >
                                {DAY_LABELS[other]}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            className="agx-chip"
                            onClick={() => setCopyTargets(WEEK_ORDER.filter((other) => other !== day))}
                          >
                            Tous
                          </button>
                          <button type="button" className="agx-link-btn is-strong" disabled={copyTargets.length === 0} onClick={() => applyCopy(day)}>
                            Appliquer
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="agx-day-off">Fermé</span>
                  )}
                </li>
              );
            })}
          </ul>
          {scheduleError ? <p className="auth-error">{scheduleError}</p> : null}
          <div className="agx-week-actions">
            <Button variant="outline" disabled={!scheduleDirty || scheduleBusy} onClick={() => setSchedule(buildSchedule(rules))}>
              Annuler les changements
            </Button>
            <Button variant="primary" disabled={!scheduleDirty || scheduleBusy} onClick={() => void saveSchedule()}>
              {scheduleBusy ? "Enregistrement…" : "Enregistrer les horaires"}
            </Button>
          </div>
        </div>
        </div>
        </div>
      </div>

      {/* ── Calendrier unifié ─────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-head">
          <h2>Calendrier</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="agx-nav">
              <button type="button" className="agx-nav-btn" aria-label="Semaine précédente" onClick={() => setWeekOffset((v) => v - 1)}>
                <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
              </button>
              <span className="agx-nav-label">
                {(() => {
                  const st = weekStart(weekOffset);
                  const e = new Date(st);
                  e.setDate(st.getDate() + 6);
                  return `${st.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} – ${e.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`;
                })()}
              </span>
              <button type="button" className="agx-nav-btn" aria-label="Semaine suivante" onClick={() => setWeekOffset((v) => v + 1)}>
                <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
              </button>
              {weekOffset !== 0 ? (
                <button type="button" className="agx-nav-today" onClick={() => setWeekOffset(0)}>
                  Aujourd’hui
                </button>
              ) : null}
            </div>
            <Button
              variant={showRuleForm ? "dark" : "primary"}
              onClick={() => { setShowRuleForm((v) => !v); setShowExceptionForm(false); setFormError(null); }}
            >
              + Créneau
            </Button>
            <Button
              variant={showExceptionForm ? "dark" : "primary"}
              onClick={() => { setShowExceptionForm((v) => !v); setShowRuleForm(false); setFormError(null); }}
            >
              + Indisponibilité
            </Button>
          </div>
        </div>

        {flash ? <p className="fu-flash" role="status">{flash}</p> : null}
        {formError ? <p className="auth-error" style={{ margin: "0 22px 10px" }}>{formError}</p> : null}

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
          exceptions={exceptions}
          weekOffset={weekOffset}
          onEditRule={openEditor}
        />

        {exceptions.length ? (
          <div className="agx-blocked">
            <h3>Dates bloquées</h3>
            <ul>
              {[...exceptions]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((item) => (
                  <li key={item.id}>
                    <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
                    <b>{new Date(`${item.date}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })}</b>
                    {item.startTime && item.endTime ? ` · ${hhmm(item.startTime)}–${hhmm(item.endTime)}` : " · journée entière"}
                    {item.note ? ` · ${item.note}` : ""}
                    <button type="button" aria-label="Débloquer cette date" onClick={() => void removeException(item.id)}>
                      <span className="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="fu-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <div className="agx-modal" role="dialog" aria-modal="true" aria-label="Modifier le créneau" onClick={(event) => event.stopPropagation()}>
            <h3>Modifier le créneau</h3>
            <p className="agx-modal-sub">Ce changement s’applique chaque semaine à ce jour.</p>
            <label className="field">
              <span>Jour</span>
              <select value={editForm.dayOfWeek} onChange={(e) => setEditForm({ ...editForm, dayOfWeek: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => (
                  <option key={dayIndex} value={dayIndex}>
                    {["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][dayIndex]}
                  </option>
                ))}
              </select>
            </label>
            <div className="agx-modal-times">
              <label className="field">
                <span>Début</span>
                <input type="time" value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} />
              </label>
              <label className="field">
                <span>Fin</span>
                <input type="time" value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} />
              </label>
            </div>
            {editError ? <p className="auth-error">{editError}</p> : null}
            <div className="agx-modal-actions">
              <Button variant="danger" disabled={editBusy} onClick={() => void deleteEdit()}>Supprimer</Button>
              <span style={{ flex: 1 }} />
              <Button variant="outline" disabled={editBusy} onClick={() => setEditing(null)}>Annuler</Button>
              <Button variant="primary" disabled={editBusy} onClick={() => void saveEdit()}>
                {editBusy ? "…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
  exceptions,
  weekOffset,
  onEditRule,
}: {
  rules: AvailabilityRule[];
  bookings: Booking[];
  exceptions: AvailabilityException[];
  weekOffset: number;
  onEditRule: (rule: AvailabilityRule) => void;
}) {
  const mon = weekStart(weekOffset);
  const WEEK_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const ORDERED = [1, 2, 3, 4, 5, 6, 0]; // Mon→Sun JS day

  // Build 7 Date objects for the displayed week
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
          const dayBlocked = exceptions.some((e) => e.date === iso(d) && !e.startTime && !e.endTime);
          return (
            <div
              key={i}
              className="hd"
              style={{
                background: isToday ? "var(--vt-lime-soft, #ffe8dc)" : undefined,
                fontWeight: isToday ? 800 : undefined,
                borderBottom: hasBkg ? "3px solid var(--navy, #141a32)" : undefined,
              }}
            >
              {WEEK_LABELS[i]}
              <br />
              <span style={{ fontWeight: 400, fontSize: 11, color: "var(--slate-light)" }}>
                {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
              </span>
              {dayBlocked ? <span className="agx-flag">Bloqué</span> : null}
            </div>
          );
        })}

        {/* ── Time rows ── */}
        {HOURS.map((hour) => (
          <React.Fragment key={hour}>
            <div className="time">{String(hour).padStart(2, "0")}:00</div>
            {ORDERED.map((jsDay, colIdx) => {
              const dayDate = days[colIdx];
              const hourStart = hour * 60;
              // Availability rule overlapping this (day, hour)
              const rule = rules.find(
                (r) => r.active && r.dayOfWeek === jsDay && toMin(r.startTime) < hourStart + 60 && toMin(r.endTime) > hourStart,
              );
              const blocked = exceptions.some((e) => e.date === iso(dayDate) && blocksHour(e, hourStart));
              // Bookings starting at this exact hour on this day
              const cellBookings = weekBookings.filter((b) => {
                const bd = new Date(b.scheduledAt);
                return iso(bd) === iso(dayDate) && bd.getHours() === hour;
              });

              const hasBooking = cellBookings.length > 0;
              const isAwaitingPayment = cellBookings.some((b) => b.status === "AWAITING_PAYMENT");
              const cellBg = isAwaitingPayment
                ? "#ffe6bf"
                : hasBooking
                  ? "#d5dcea"
                  : blocked
                    ? "repeating-linear-gradient(45deg, #eef0f4, #eef0f4 6px, #e1e4ea 6px, #e1e4ea 12px)"
                    : rule
                      ? "var(--vt-lime-soft, #ffe8dc)"
                      : undefined;
              const cellBorder = isAwaitingPayment ? "#c9820a" : hasBooking ? "var(--navy, #141a32)" : undefined;
              const editable = Boolean(rule) && !hasBooking;
              const startsHere = rule ? toMin(rule.startTime) >= hourStart : false;

              return (
                <div
                  key={`${hour}-${jsDay}`}
                  className={editable ? "slot agx-slot-editable" : "slot"}
                  role={editable ? "button" : undefined}
                  tabIndex={editable ? 0 : undefined}
                  title={
                    blocked && !hasBooking
                      ? "Date bloquée"
                      : editable && rule
                        ? `Disponible ${hhmm(rule.startTime)}–${hhmm(rule.endTime)} · cliquer pour modifier`
                        : undefined
                  }
                  style={{
                    // Booking takes visual priority over availability rule
                    background: cellBg,
                    borderLeft: hasBooking ? `3px solid ${cellBorder}` : undefined,
                    padding: hasBooking ? "2px 5px" : undefined,
                    cursor: editable ? "pointer" : "default",
                    overflow: "hidden",
                    fontSize: 11,
                    lineHeight: 1.3,
                  }}
                  onClick={() => editable && rule && onEditRule(rule)}
                  onKeyDown={(event) => {
                    if (editable && rule && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      onEditRule(rule);
                    }
                  }}
                >
                  {!hasBooking && editable && startsHere && rule ? (
                    <span className="agx-range">
                      {hhmm(rule.startTime)}–{hhmm(rule.endTime)}
                    </span>
                  ) : null}
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
          <span className="sw" style={{ background: "var(--vt-lime-soft, #ffe8dc)", border: "1px solid var(--paper-line)" }} />
          Disponible (cliquer pour modifier)
        </span>
        <span>
          <span className="sw" style={{ background: "#d5dcea", borderLeft: "3px solid #141a32" }} />
          Séance réservée ✓
        </span>
        <span>
          <span className="sw" style={{ background: "#ffe6bf", borderLeft: "3px solid #c9820a" }} />
          En attente paiement ⏳
        </span>
        <span>
          <span className="sw" style={{ background: "repeating-linear-gradient(45deg, #eef0f4, #eef0f4 4px, #e1e4ea 4px, #e1e4ea 8px)" }} />
          Date bloquée
        </span>
        <span>
          <span className="sw" style={{ background: "var(--paper-2)", border: "1px solid var(--paper-line)" }} />
          Indisponible
        </span>
      </div>
    </div>
  );
}
