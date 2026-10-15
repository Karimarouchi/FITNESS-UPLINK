import { useEffect, useState, type CSSProperties } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isCandidate } from "@/features/auth/types";
import { contractStatusLabel, fetchContracts, type Contract } from "../api";
import { formatPipelineDate } from "@/features/recruitment/api";

export function ContractsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const candidate = isCandidate(user);
  const employer = isBusiness(user);

  useEffect(() => {
    if (!candidate && !employer) {
      return;
    }
    fetchContracts()
      .then(setItems)
      .catch(() => setError("Impossible de charger les contrats."))
      .finally(() => setLoading(false));
  }, [candidate, employer]);

  if (!candidate && !employer) {
    return <Navigate to="/app/dashboard" replace />;
  }

  /** True when this user is the one who still has to sign. */
  function needsMySignature(item: Contract) {
    if (item.status === "COMPLETED" || item.status === "DECLINED" || item.status === "CANCELLED" || item.status === "EXPIRED" || item.status === "DRAFT") {
      return false;
    }
    if (candidate) {
      return !item.candidateSignedAt;
    }
    return Boolean(item.candidateSignedAt) && !item.employerSignedAt;
  }

  function statusCopy(item: Contract) {
    if (item.status === "COMPLETED") {
      return "Contrat finalisé";
    }
    if (needsMySignature(item)) {
      return candidate ? "En attente de votre signature" : "Signature requise";
    }
    if (item.candidateSignedAt && !item.employerSignedAt) {
      return "Candidat signé — employeur en attente";
    }
    if (!item.candidateSignedAt && item.employerSignedAt) {
      return "Employeur signé — candidat en attente";
    }
    return contractStatusLabel(item.status);
  }

  const toSign = items.filter(needsMySignature).length;
  const done = items.filter((item) => item.status === "COMPLETED").length;
  const pending = items.filter((item) => !needsMySignature(item) && item.status !== "COMPLETED" && (item.status === "SENT" || item.status === "CANDIDATE_SIGNED" || item.status === "EMPLOYER_SIGNED")).length;

  return (
    <section className="tlx-page">
      <div className="page-head">
        <div>
          <p className="font-label-caps uppercase text-on-surface-variant">Recrutement</p>
          <h1>{candidate ? "Mes contrats" : "Contrats"}</h1>
          <p className="sub">
            {candidate
              ? "Consultez et signez les contrats envoyés par les employeurs."
              : "Suivez les signatures et ouvrez le document de chaque recrutement."}
          </p>
        </div>
      </div>
      {error ? <p className="auth-error">{error}</p> : null}

      {items.length > 0 ? (
        <div className="pcx-stats ctx-stats">
          <div className="pcx-stat" style={{ "--i": 0 } as CSSProperties}>
            <span className="material-symbols-outlined" aria-hidden="true">draw</span>
            <b>{toSign}</b>
            <small>{candidate ? "À signer par vous" : "À signer par vous"}</small>
          </div>
          <div className="pcx-stat" style={{ "--i": 1 } as CSSProperties}>
            <span className="material-symbols-outlined" aria-hidden="true">hourglass_top</span>
            <b>{pending}</b>
            <small>En attente de l’autre partie</small>
          </div>
          <div className="pcx-stat" style={{ "--i": 2 } as CSSProperties}>
            <span className="material-symbols-outlined" aria-hidden="true">task_alt</span>
            <b>{done}</b>
            <small>Finalisé{done > 1 ? "s" : ""}</small>
          </div>
        </div>
      ) : null}

      {loading ? (
        <ul className="ctx-list" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index} className="tlx-card is-skeleton" style={{ "--i": index, minHeight: 84 } as CSSProperties}>
              <span className="tlx-sk tlx-sk-line" />
              <span className="tlx-sk tlx-sk-line is-short" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 && !error ? (
        <div className="tlx-empty">
          <span className="material-symbols-outlined" aria-hidden="true">description</span>
          <strong>Aucun contrat</strong>
          <p>Un contrat apparaîtra ici dès qu’il sera envoyé depuis le pipeline de recrutement.</p>
          {employer ? (
            <Link className="tlx-btn is-primary" to="/applications">
              Ouvrir le pipeline
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="ctx-list">
          {items.map((item, index) => {
            const action = needsMySignature(item);
            const finished = item.status === "COMPLETED";
            return (
              <li
                key={item.id}
                className={action ? "ctx-item is-action" : finished ? "ctx-item is-done" : "ctx-item"}
                style={{ "--i": index } as CSSProperties}
              >
                <span className="ctx-icon material-symbols-outlined" aria-hidden="true">
                  {finished ? "task_alt" : action ? "draw" : "description"}
                </span>
                <div className="ctx-main">
                  <strong>{candidate ? item.employerName : item.candidateName}</strong>
                  <small>{item.jobOffer?.title || item.terms?.position || "Recrutement direct"}</small>
                </div>
                <div className="ctx-meta">
                  <span>{statusCopy(item)}</span>
                  <small>Créé le {formatPipelineDate(item.createdAt)}</small>
                </div>
                <span className={action ? "pdx-pill" : "pdx-pill is-muted"}>{contractStatusLabel(item.status)}</span>
                <Link className="ctx-open" to={`/contracts/${item.id}`}>
                  {action ? "Signer" : "Consulter"}
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
