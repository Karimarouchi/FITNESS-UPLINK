import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BOARD_COLUMNS, PIPELINE_STATUSES, type PipelineStatus, type Recruitment } from "./api";
import type { InterviewDraft } from "./InterviewScheduleForm";
import { NegotiationPanel } from "./NegotiationPanel";

const WORKING: PipelineStatus[] = ["NEW", "CONTACTED", "INTERVIEW_SCHEDULED", "NEGOTIATION"];

const ICONS: Record<string, string> = {
  NEW: "fiber_new",
  CONTACTED: "chat",
  INTERVIEW_SCHEDULED: "event",
  NEGOTIATION: "handshake",
  CONTRACT_SENT: "draft",
  HIRED: "verified",
};

const HINTS: Record<string, string> = {
  NEW: "Dossier recruté, pas encore de contact.",
  CONTACTED: "La discussion avec le candidat est ouverte.",
  INTERVIEW_SCHEDULED: "Choisissez la date, l’heure et le lien ou le lieu.",
  NEGOTIATION: "Vous discutez des conditions.",
  CONTRACT_SENT: "S’active quand vous envoyez le contrat pour signature.",
  HIRED: "S’active quand le contrat est signé.",
};

function label(status: PipelineStatus) {
  return PIPELINE_STATUSES.find((item) => item.value === status)?.label ?? status;
}

/** Why a step cannot be picked by hand, or null when it can. */
function lockReason(current: PipelineStatus, target: PipelineStatus): string | null {
  if (target === "CONTRACT_SENT") {
    return "Se fait en envoyant un contrat";
  }
  if (target === "HIRED") {
    return "Après la signature du contrat";
  }
  if (current === "HIRED") {
    return "Candidat déjà recruté";
  }
  if (current === "APPLIED") {
    return "Recrutez d’abord le dossier";
  }
  if (!WORKING.includes(current) && current !== "CONTRACT_SENT") {
    return "Étape indisponible";
  }
  return null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Splits an ISO instant into the local date / time the inputs expect. */
function toLocalParts(iso: string | null) {
  if (!iso) {
    return { date: "", time: "" };
  }
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Returns an error message, or null when the interview details are valid. */
function checkInterview(date: string, time: string, mode: "MEET" | "ONSITE", place: string): string | null {
  if (!date || !time) {
    return "Choisissez la date et l’heure de l’entretien.";
  }
  if (new Date(`${date}T${time}`).getTime() < Date.now() - 60_000) {
    return "La date de l’entretien est déjà passée.";
  }
  if (!place.trim()) {
    return mode === "MEET" ? "Ajoutez le lien de la visioconférence." : "Ajoutez l’adresse de l’entretien.";
  }
  if (mode === "MEET" && !/^https?:\/\/\S+$/i.test(place.trim())) {
    return "Le lien doit commencer par https:// (Google Meet, Zoom, Teams…).";
  }
  return null;
}

type Props = {
  item: Recruitment;
  /** Opens the contract preparation screen (template or PDF import). */
  onPrepareContract?: () => void;
  /** The plan does not include contracts: show an upgrade link instead of the button. */
  contractLocked?: boolean;
  /** Resolves to an error message, or null on success. */
  onStatus: (item: Recruitment, status: PipelineStatus, interview?: InterviewDraft) => Promise<string | null>;
};

export function PipelineStepper({ item, onStatus, onPrepareContract, contractLocked }: Props) {
  const [pending, setPending] = useState<PipelineStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = toLocalParts(item.interviewAt);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [mode, setMode] = useState<"MEET" | "ONSITE">(item.interviewMode === "ONSITE" ? "ONSITE" : "MEET");
  const [place, setPlace] = useState(item.interviewPlace ?? "");
  const [editing, setEditing] = useState(false);

  const currentIndex = BOARD_COLUMNS.indexOf(item.status);
  const nextWorking = WORKING.find((status) => BOARD_COLUMNS.indexOf(status) > currentIndex && !lockReason(item.status, status));
  const interviewOpen = pending === "INTERVIEW_SCHEDULED" || editing;

  useEffect(() => {
    setPending(null);
    setEditing(false);
    setError(null);
  }, [item.status, item.id]);

  useEffect(() => {
    const parts = toLocalParts(item.interviewAt);
    setDate(parts.date);
    setTime(parts.time);
    setMode(item.interviewMode === "ONSITE" ? "ONSITE" : "MEET");
    setPlace(item.interviewPlace ?? "");
  }, [item.interviewAt, item.interviewMode, item.interviewPlace]);

  function pick(status: PipelineStatus | null) {
    setPending(status);
    setEditing(false);
    setError(null);
  }

  async function run(status: PipelineStatus, interview?: InterviewDraft) {
    setBusy(true);
    setError(null);
    const failure = await onStatus(item, status, interview);
    setBusy(false);
    if (failure) {
      setError(failure);
    }
  }

  function submitInterview(event: FormEvent) {
    event.preventDefault();
    const problem = checkInterview(date, time, mode, place);
    if (problem) {
      setError(problem);
      return;
    }
    void run("INTERVIEW_SCHEDULED", { interviewAt: `${date}T${time}`, interviewMode: mode, interviewPlace: place.trim() });
  }

  const hasInterview = item.status === "INTERVIEW_SCHEDULED" && item.interviewAt;

  return (
    <div className="stepx">
      <ol className="stepx-list">
        {BOARD_COLUMNS.map((status, index) => {
          const isCurrent = status === item.status;
          const isDone = currentIndex > index;
          const locked = lockReason(item.status, status);
          const selectable = !isCurrent && !locked;
          const isPending = pending === status;
          const className = [
            "stepx-step",
            isCurrent ? "is-current" : "",
            isDone ? "is-done" : "",
            locked && !isCurrent ? "is-locked" : "",
            isPending ? "is-pending" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li key={status} className={className} style={{ "--i": index } as CSSProperties}>
              <button
                type="button"
                className="stepx-btn"
                disabled={!selectable || busy}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => pick(isPending ? null : status)}
              >
                <span className="stepx-dot">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {isDone ? "check" : locked && !isCurrent ? "lock" : ICONS[status]}
                  </span>
                </span>
                <span className="stepx-copy">
                  <strong>{label(status)}</strong>
                  <small>{isCurrent ? "Étape actuelle" : status === "CONTRACT_SENT" && item.status === "NEGOTIATION" && item.contract?.status === "DRAFT" ? "Brouillon prêt : il reste à l’envoyer pour signature." : locked ? locked : isDone ? "Étape passée" : HINTS[status]}</small>
                </span>
              </button>
              {status === "CONTRACT_SENT" && item.contract && item.contract.status !== "DRAFT" ? (
                <Link className="stepx-link" to={`/contracts/${item.contract.id}`}>
                  Voir le contrat
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
              ) : status === "CONTRACT_SENT" && item.status === "NEGOTIATION" && contractLocked ? (
                <Link className="stepx-link" to="/app/profile/plan">
                  Débloquer
                  <span className="material-symbols-outlined" aria-hidden="true">
                    lock_open
                  </span>
                </Link>
              ) : status === "CONTRACT_SENT" && item.status === "NEGOTIATION" && onPrepareContract ? (
                <button type="button" className="stepx-link is-strong" onClick={onPrepareContract}>
                  {item.contract?.status === "DRAFT" ? "Vérifier et envoyer" : "Préparer"}
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_forward
                  </span>
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>

      {hasInterview && !interviewOpen ? (
        <div className="stepx-interview">
          <header>
            <strong>
              <span className="material-symbols-outlined" aria-hidden="true">event</span>
              Entretien prévu
            </strong>
            <button type="button" onClick={() => { setEditing(true); setError(null); }}>
              Modifier
            </button>
          </header>
          <dl>
            <div>
              <dt>Date</dt>
              <dd>
                {new Date(item.interviewAt as string).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </dd>
            </div>
            <div>
              <dt>Heure</dt>
              <dd>{new Date(item.interviewAt as string).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{item.interviewMode === "ONSITE" ? "Présentiel" : "Visioconférence"}</dd>
            </div>
            <div>
              <dt>{item.interviewMode === "ONSITE" ? "Adresse" : "Lien"}</dt>
              <dd>
                {item.interviewMode !== "ONSITE" && item.interviewPlace ? (
                  <a href={item.interviewPlace} target="_blank" rel="noreferrer noopener">
                    Rejoindre la réunion
                    <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>
                  </a>
                ) : (
                  item.interviewPlace
                )}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {item.status === "NEGOTIATION" || item.status === "CONTRACT_SENT" || item.status === "HIRED" ? (
        <NegotiationPanel
          recruitmentId={item.id}
          open={item.status === "NEGOTIATION"}
          role="EMPLOYER"
          onPrepareContract={onPrepareContract}
          contractLocked={contractLocked}
          contractDraft={item.contract?.status === "DRAFT"}
          defaults={{
            salary: null,
            location: item.jobOffer?.location ?? null,
          }}
        />
      ) : null}

      {interviewOpen ? (
        <form className="stepx-form" onSubmit={submitInterview} noValidate>
          <h3>{editing ? "Modifier l’entretien" : "Planifier l’entretien"}</h3>
          <p>Le candidat reçoit une notification et un e-mail avec tous les détails.</p>
          <div className="stepx-modes" role="radiogroup" aria-label="Mode de l’entretien">
            <button type="button" role="radio" aria-checked={mode === "MEET"} className={mode === "MEET" ? "is-on" : ""} onClick={() => setMode("MEET")}>
              <span className="material-symbols-outlined" aria-hidden="true">videocam</span>
              Visioconférence
            </button>
            <button type="button" role="radio" aria-checked={mode === "ONSITE"} className={mode === "ONSITE" ? "is-on" : ""} onClick={() => setMode("ONSITE")}>
              <span className="material-symbols-outlined" aria-hidden="true">location_on</span>
              Présentiel
            </button>
          </div>
          <div className="stepx-row">
            <label>
              <span>Date</span>
              <input type="date" min={todayLocal()} value={date} onChange={(e) => { setDate(e.target.value); setError(null); }} />
            </label>
            <label>
              <span>Heure</span>
              <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setError(null); }} />
            </label>
          </div>
          <label>
            <span>{mode === "MEET" ? "Lien de la réunion" : "Adresse"}</span>
            <input
              value={place}
              placeholder={mode === "MEET" ? "https://meet.google.com/abc-defg-hij" : "Salle, rue, ville"}
              onChange={(e) => { setPlace(e.target.value); setError(null); }}
            />
          </label>
          {mode === "MEET" ? (
            <p className="stepx-tip">
              <span className="material-symbols-outlined" aria-hidden="true">lightbulb</span>
              Créez la réunion sur Google Meet, Zoom ou Teams, puis collez le lien ici.
            </p>
          ) : null}
          {error ? <p className="stepx-error" role="alert">{error}</p> : null}
          <div className="stepx-actions">
            <button type="button" className="stepx-action" disabled={busy} onClick={() => pick(null)}>
              Annuler
            </button>
            <button type="submit" className="stepx-action is-primary" disabled={busy}>
              {busy ? "Envoi…" : editing ? "Enregistrer et prévenir" : "Confirmer l’entretien"}
            </button>
          </div>
        </form>
      ) : pending ? (
        <div className="stepx-confirm" role="alert">
          <p>
            Passer <b>{item.candidate.displayName}</b> à l’étape « {label(pending)} » ? Le candidat sera notifié.
          </p>
          {error ? <p className="stepx-error" role="alert">{error}</p> : null}
          <div>
            <button type="button" className="stepx-action" disabled={busy} onClick={() => pick(null)}>
              Annuler
            </button>
            <button type="button" className="stepx-action is-primary" disabled={busy} onClick={() => void run(pending)}>
              {busy ? "…" : "Confirmer"}
            </button>
          </div>
        </div>
      ) : nextWorking ? (
        <button type="button" className="stepx-next" onClick={() => pick(nextWorking)}>
          Étape suivante : {label(nextWorking)}
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_forward
          </span>
        </button>
      ) : null}
    </div>
  );
}
