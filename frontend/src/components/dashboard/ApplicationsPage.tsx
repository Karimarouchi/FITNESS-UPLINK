import { useEffect, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  Ban,
  BriefcaseBusiness,
  CalendarDays,
  CircleX,
  Eye,
  FileSignature,
  FileText,
  Handshake,
  Send,
  Video,
} from "lucide-react";
import { BoDrawer } from "@/components/ui/BoOverlay";
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
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";
import "@/shared/styles/backoffice-hire.css";

type IconType = ComponentType<{ size?: number }>;

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

function headline(status: PipelineStatus): { icon: IconType; text: string; tone: string } {
  switch (status) {
    case "APPLIED":
      return { icon: Send, text: "Candidature envoyée", tone: "is-info" };
    case "NEW":
    case "CONTACTED":
      return { icon: Eye, text: "Dossier à l’étude", tone: "is-info" };
    case "INTERVIEW_SCHEDULED":
      return { icon: CalendarDays, text: "Entretien prévu", tone: "is-warn" };
    case "NEGOTIATION":
      return { icon: Handshake, text: "En discussion", tone: "is-warn" };
    case "CONTRACT_SENT":
      return { icon: FileSignature, text: "Contrat à signer", tone: "is-warn" };
    case "HIRED":
      return { icon: BadgeCheck, text: "Recruté", tone: "is-success" };
    case "REJECTED":
      return { icon: CircleX, text: "Refusée", tone: "is-danger" };
    default:
      return { icon: Archive, text: "Archivée", tone: "is-neutral" };
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
    <ol className="hr-track" aria-label="Avancement de la candidature">
      {STEPS.map((step, index) => (
        <li key={step} className={index < reached ? "is-done" : index === reached ? "is-current" : ""}>
          <i />
          <small>{step}</small>
        </li>
      ))}
    </ol>
  );
}

function Status({ status }: { status: PipelineStatus }) {
  const info = headline(status);
  const Icon = info.icon;
  return (
    <span className={`bo-users-status hr-status ${info.tone}`}>
      <Icon size={14} />
      {info.text}
    </span>
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
    <section className="bo-dash bo-users bo-bm bo-hr">
      <header className="bo-dash-head">
        <div>
          <h1>Mes candidatures</h1>
          <p>Suivi de vos postulats et des recrutements ouverts à votre nom.</p>
        </div>
        <Link to="/app/opportunities" className="bm-btn is-outline">
          Voir les opportunités
        </Link>
      </header>

      {error ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="hr-grid hr-grid--bare" aria-busy="true">
          {[0, 1, 2].map((key) => (
            <div key={key} className="bo-skeleton hr-skel" />
          ))}
        </div>
      ) : rows.length === 0 && !error ? (
        <div className="bo-dash-card">
          <div className="bo-users-empty">
            <span>
              <BriefcaseBusiness size={22} aria-hidden="true" />
            </span>
            <strong>Aucune candidature</strong>
            <p>Postulez à une offre pour suivre ici l’avancement de votre dossier.</p>
            <Link className="bm-btn" to="/app/opportunities">
              Voir les opportunités
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="hr-grid hr-grid--bare">
          {rows.map((row) => {
            const info = headline(row.status);
            const employer = row.employer?.displayName ?? "Employeur";
            return (
              <button key={row.id} type="button" className={`hr-card hr-app ${info.tone}`} onClick={() => setSelected(row)}>
                <div className="hr-card-top">
                  <span className="hr-mark" aria-hidden="true">
                    {initials(employer)}
                  </span>
                  <Status status={row.status} />
                </div>
                <h3 className="hr-title">{opportunityLabel(row)}</h3>
                <p className="hr-employer">{employer}</p>
                {row.status === "INTERVIEW_SCHEDULED" && row.interviewAt ? (
                  <p className="hr-interview">
                    <CalendarDays size={15} aria-hidden="true" />
                    Entretien le {formatPipelineDate(row.interviewAt)}
                  </p>
                ) : null}
                <Tracker status={row.status} />
                <div className="hr-foot">
                  <span className="hr-updated">Mis à jour le {formatPipelineDate(row.statusUpdatedAt || row.createdAt)}</span>
                  <span className="hr-go">
                    Détails
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <BoDrawer
          premium
          className="hr-drawer"
          title={opportunityLabel(selected)}
          onClose={() => setSelected(null)}
          headerContent={
            <div className="hr-drawer-head">
              <p>{selected.employer?.displayName ?? "Employeur"}</p>
              <h2>{opportunityLabel(selected)}</h2>
              <Status status={selected.status} />
            </div>
          }
        >
          <div className="hr-drawer-body">
            <Tracker status={selected.status} />

            {selected.status === "INTERVIEW_SCHEDULED" && selected.interviewAt ? (
              <div className="hr-block hr-meet">
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
                  <a className="um-btn is-primary" href={selected.interviewPlace} target="_blank" rel="noreferrer noopener">
                    <Video size={16} aria-hidden="true" />
                    Rejoindre la réunion
                  </a>
                ) : null}
              </div>
            ) : null}

            {selected.coverLetterText ? (
              <div className="hr-block">
                <h3>Votre lettre</h3>
                <p>{selected.coverLetterText}</p>
              </div>
            ) : null}
            {selected.coverLetterFile ? (
              <button
                className="um-btn"
                type="button"
                onClick={() => {
                  void fetchCoverLetterBlob(selected.id).then((blob) => {
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank", "noopener");
                  });
                }}
              >
                <FileText size={16} aria-hidden="true" />
                Voir le PDF joint
              </button>
            ) : null}
            {selected.status === "NEGOTIATION" || selected.status === "CONTRACT_SENT" || selected.status === "HIRED" ? (
              <NegotiationPanel recruitmentId={selected.id} open={selected.status === "NEGOTIATION"} role="CANDIDATE" />
            ) : null}
            {canMessage(selected.status) ? <HireThread recruitmentId={selected.id} /> : null}
            {selected.status !== "REJECTED" && selected.status !== "ARCHIVED" ? (
              <button
                className="um-btn is-danger"
                type="button"
                onClick={() => {
                  void blockRecruitment(selected.id).then(() => {
                    setRows((current) => current.filter((row) => row.id !== selected.id));
                    setSelected(null);
                  });
                }}
              >
                <Ban size={16} aria-hidden="true" />
                Bloquer
              </button>
            ) : null}
          </div>
        </BoDrawer>
      ) : null}
    </section>
  );
}
