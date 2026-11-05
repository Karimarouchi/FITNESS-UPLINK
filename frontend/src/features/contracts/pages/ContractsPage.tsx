import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, CircleCheck, FileText, FileSignature, Hourglass } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isCandidate } from "@/features/auth/types";
import { contractStatusLabel, fetchContracts, type Contract } from "../api";
import { formatPipelineDate } from "@/features/recruitment/api";
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";
import "@/shared/styles/backoffice-hire.css";

function Kpi({ icon, tone = "", label, value }: { icon: ReactNode; tone?: string; label: string; value: number }) {
  return (
    <div className="bo-dash-kpi">
      <span className={`bo-dash-icon ${tone}`}>{icon}</span>
      <span className="bo-dash-kpi-label">{label}</span>
      <span className="bo-dash-kpi-value">{value}</span>
    </div>
  );
}

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
    <section className="bo-dash bo-users bo-bm bo-hr">
      <header className="bo-dash-head">
        <div>
          <h1>{candidate ? "Mes contrats" : "Contrats"}</h1>
          <p>
            {candidate
              ? "Consultez et signez les contrats envoyés par les employeurs."
              : "Suivez les signatures et ouvrez le document de chaque recrutement."}
          </p>
        </div>
      </header>
      {error ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="bo-dash-kpis hr-kpis">
          <Kpi icon={<FileSignature size={22} />} label="À signer par vous" value={toSign} />
          <Kpi icon={<Hourglass size={22} />} tone="is-blue" label="En attente de l’autre partie" value={pending} />
          <Kpi icon={<CircleCheck size={22} />} tone="is-neutral" label={`Finalisé${done > 1 ? "s" : ""}`} value={done} />
        </div>
      ) : null}

      <div className="bo-dash-card bo-users-card">
        {loading ? (
          <div className="hr-list" aria-busy="true">
            {[0, 1, 2].map((key) => (
              <div key={key} className="bo-skeleton hr-skel-row" />
            ))}
          </div>
        ) : items.length === 0 && !error ? (
          <div className="bo-users-empty">
            <span>
              <FileText size={22} aria-hidden="true" />
            </span>
            <strong>Aucun contrat</strong>
            <p>Un contrat apparaîtra ici dès qu’il sera envoyé depuis le pipeline de recrutement.</p>
            {employer ? (
              <Link className="bm-btn" to="/applications">
                Ouvrir le pipeline
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="hr-list">
            {items.map((item) => {
              const action = needsMySignature(item);
              const finished = item.status === "COMPLETED";
              const Icon = finished ? CircleCheck : action ? FileSignature : FileText;
              return (
                <li key={item.id} className={action ? "hr-row is-action" : finished ? "hr-row is-done" : "hr-row"}>
                  <span className="hr-row-icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <div className="hr-row-main">
                    <strong>{candidate ? item.employerName : item.candidateName}</strong>
                    <small>{item.jobOffer?.title || item.terms?.position || "Recrutement direct"}</small>
                  </div>
                  <div className="hr-row-meta">
                    <span>{statusCopy(item)}</span>
                    <small>Créé le {formatPipelineDate(item.createdAt)}</small>
                  </div>
                  <span className={`bo-users-status ${action ? "is-warn" : finished ? "is-success" : "is-neutral"}`}>
                    {contractStatusLabel(item.status)}
                  </span>
                  <Link className={action ? "bm-btn" : "bm-btn is-outline"} to={`/contracts/${item.id}`}>
                    {action ? "Signer" : "Consulter"}
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
