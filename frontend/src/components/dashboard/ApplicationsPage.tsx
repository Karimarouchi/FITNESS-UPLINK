import { useEffect, useState, type CSSProperties } from "react";
import { HireThread, canMessage } from "@/features/recruitment/HireThread";
import { NegotiationPanel } from "@/features/recruitment/NegotiationPanel";
import {
  blockRecruitment,
  fetchCoverLetterBlob,
  fetchRecruitments,
  formatPipelineDate,
  opportunityLabel,
  type PipelineStatus,
  type Recruitment,
} from "@/features/recruitment/api";

const STEPS = ["Envoyée", "En étude", "Entretien", "Contrat", "Recruté"];

/** 0-based index of the furthest step reached, or null when the file is closed. */
function progressOf(status: PipelineStatus): number | null {
  switch (status) {
    case "APPLIED":
      return 0;
    case "NEW":
    case "CONTACTED":
      return 1;
    case "INTERVIEW_SCHEDULED":
    case "NEGOTIATION":
      return 2;
    case "CONTRACT_SENT":
      return 3;
    case "HIRED":
      return 4;
    default:
      return null;
  }
}

function headline(status: PipelineStatus) {
  switch (status) {
    case "APPLIED":
      return { icon: "send", text: "Candidature envoyée", tone: "" };
    case "NEW":
    case "CONTACTED":
      return { icon: "visibility", text: "Dossier à l’étude", tone: "" };
    case "INTERVIEW_SCHEDULED":
      return { icon: "event", text: "Entretien prévu", tone: "is-hot" };
    case "NEGOTIATION":
      return { icon: "handshake", text: "En discussion", tone: "is-hot" };
    case "CONTRACT_SENT":
      return { icon: "draft", text: "Contrat à signer", tone: "is-hot" };
    case "HIRED":
      return { icon: "verified", text: "Recruté", tone: "is-win" };
    case "REJECTED":
      return { icon: "cancel", text: "Refusée", tone: "is-closed" };
    default:
      return { icon: "inventory_2", text: "Archivée", tone: "is-closed" };
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Tracker({ status }: { status: PipelineStatus }) {
  const reached = progressOf(status);
  if (reached === null) {
    return null;
  }
  return (
    <ol className="appx-track" aria-label="Avancement de la candidature">
      {STEPS.map((step, index) => (
        <li key={step} className={index < reached ? "is-done" : index === reached ? "is-current" : ""}>
          <span className="appx-pip" />
          <small>{step}</small>
        </li>
      ))}
    </ol>
  );
}

export function ApplicationsPage() {
  const [rows, setRows] = useState<Recruitment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Recruitment | null>(null);

  useEffect(() => {
    fetchRecruitments()
      .then(setRows)
      .catch(() => setError("Impossible de charger vos candidatures."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="hire-page">
      <div className="page-head">
        <div>
          <p className="font-label-caps uppercase text-on-surface-variant">Recrutement</p>
          <h1>Mes candidatures</h1>
          <p className="sub">Suivi de vos postulats et des recrutements ouverts à votre nom.</p>
        </div>
      </div>
      {error ? <p className="auth-error">{error}</p> : null}

      {loading ? (
        <div className="appx-grid" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="appx-card is-skeleton" style={{ "--i": index } as CSSProperties}>
              <span className="appx-sk appx-sk-mark" />
              <span className="appx-sk appx-sk-line" />
              <span className="appx-sk appx-sk-line is-short" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 && !error ? (
        <div className="appx-empty">
          <span className="material-symbols-outlined" aria-hidden="true">
            work_history
          </span>
          <strong>Aucune candidature</strong>
          <p>Postulez à une offre pour suivre ici l’avancement de votre dossier.</p>
          <a className="appx-cta" href="/app/opportunities">
            Voir les opportunités
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </a>
        </div>
      ) : (
        <div className="appx-grid">
          {rows.map((row, index) => {
            const info = headline(row.status);
            const employer = row.employer?.displayName ?? "Employeur";
            return (
              <button
                key={row.id}
                type="button"
                className={`appx-card ${info.tone}`}
                style={{ "--i": index } as CSSProperties}
                onClick={() => setSelected(row)}
              >
                <div className="appx-top">
                  <span className="appx-mark" aria-hidden="true">
                    {initials(employer)}
                  </span>
                  <span className={`appx-badge ${info.tone}`}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {info.icon}
                    </span>
                    {info.text}
                  </span>
                </div>
                <h3 className="appx-title">{opportunityLabel(row)}</h3>
                <p className="appx-employer">{employer}</p>
                {row.status === "INTERVIEW_SCHEDULED" && row.interviewAt ? (
                  <p className="appx-interview">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      event
                    </span>
                    Entretien le {formatPipelineDate(row.interviewAt)}
                  </p>
                ) : null}
                <Tracker status={row.status} />
                <div className="appx-foot">
                  <span>Mis à jour le {formatPipelineDate(row.statusUpdatedAt || row.createdAt)}</span>
                  <span className="appx-go">
                    Détails
                    <span className="material-symbols-outlined" aria-hidden="true">
                      arrow_forward
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <div className="fu-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <aside className="fu-drawer appx-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="appx-close" type="button" onClick={() => setSelected(null)}>
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
              Fermer
            </button>
            <p className="appx-kicker">{selected.employer?.displayName ?? "Employeur"}</p>
            <h2 className="appx-drawer-title">{opportunityLabel(selected)}</h2>
            <span className={`appx-badge ${headline(selected.status).tone}`}>
              <span className="material-symbols-outlined" aria-hidden="true">
                {headline(selected.status).icon}
              </span>
              {headline(selected.status).text}
            </span>
            <Tracker status={selected.status} />

            {selected.status === "INTERVIEW_SCHEDULED" && selected.interviewAt ? (
              <div className="appx-block appx-meet">
                <h3>Votre entretien</h3>
                <p>
                  <b>
                    {new Date(selected.interviewAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </b>{" "}
                  à {new Date(selected.interviewAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p>{selected.interviewMode === "ONSITE" ? "En présentiel" : "En visioconférence"}</p>
                {selected.interviewMode === "ONSITE" ? (
                  <p>{selected.interviewPlace}</p>
                ) : selected.interviewPlace ? (
                  <a className="appx-join" href={selected.interviewPlace} target="_blank" rel="noreferrer noopener">
                    <span className="material-symbols-outlined" aria-hidden="true">videocam</span>
                    Rejoindre la réunion
                  </a>
                ) : null}
              </div>
            ) : null}

            {selected.coverLetterText ? (
              <div className="appx-block">
                <h3>Votre lettre</h3>
                <p>{selected.coverLetterText}</p>
              </div>
            ) : null}
            {selected.coverLetterFile ? (
              <button
                className="appx-btn"
                type="button"
                onClick={() => {
                  void fetchCoverLetterBlob(selected.id).then((blob) => {
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank", "noopener");
                  });
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  picture_as_pdf
                </span>
                Voir le PDF joint
              </button>
            ) : null}
            {selected.status === "NEGOTIATION" || selected.status === "CONTRACT_SENT" || selected.status === "HIRED" ? (
              <NegotiationPanel recruitmentId={selected.id} open={selected.status === "NEGOTIATION"} role="CANDIDATE" />
            ) : null}
            {canMessage(selected.status) ? <HireThread recruitmentId={selected.id} /> : null}
            {selected.status !== "REJECTED" && selected.status !== "ARCHIVED" ? (
              <button
                className="appx-btn is-danger"
                type="button"
                onClick={() => {
                  void blockRecruitment(selected.id).then(() => {
                    setRows((current) => current.filter((row) => row.id !== selected.id));
                    setSelected(null);
                  });
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  block
                </span>
                Bloquer
              </button>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
