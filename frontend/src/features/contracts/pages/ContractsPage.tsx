import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isCandidate } from "@/features/auth/types";
import { contractStatusLabel, fetchContracts, type Contract } from "../api";
import { formatPipelineDate } from "@/features/recruitment/api";

export function ContractsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Contract[]>([]);
  const [error, setError] = useState<string | null>(null);
  const candidate = isCandidate(user);
  const employer = isBusiness(user);

  useEffect(() => {
    if (!candidate && !employer) {
      return;
    }
    fetchContracts()
      .then(setItems)
      .catch(() => setError("Impossible de charger les contrats."));
  }, [candidate, employer]);

  if (!candidate && !employer) {
    return <Navigate to="/app/dashboard" replace />;
  }

  function statusCopy(item: Contract) {
    if (item.status === "COMPLETED") {
      return "Contrat finalisé";
    }
    if (candidate && !item.candidateSignedAt) {
      return "En attente de votre signature";
    }
    if (employer && item.candidateSignedAt && !item.employerSignedAt) {
      return "Signature requise";
    }
    if (item.candidateSignedAt && !item.employerSignedAt) {
      return "Candidat signé — employeur en attente";
    }
    return contractStatusLabel(item.status);
  }

  return (
    <section className="talent-page talent-page--wide">
      <p className="font-label-caps uppercase text-on-surface-variant">{candidate ? "My Uplink" : "Recrutement"}</p>
      <h1 className="font-display-lg-mobile text-primary mb-4">{candidate ? "Mes contrats" : "Contrats"}</h1>
      {error ? <p className="auth-error">{error}</p> : null}
      {items.length === 0 && !error ? (
        <p className="font-body-md text-on-surface-variant">Aucun contrat pour le moment.</p>
      ) : (
        <ul className="verify-list">
          {items.map((item) => (
            <li key={item.id} className="verify-row">
              <div className="verify-copy">
                <strong>{candidate ? item.employerName : item.candidateName}</strong>
                <p>
                  {item.jobOffer?.title || item.terms?.position || "Recrutement direct"} · {formatPipelineDate(item.createdAt)}
                </p>
                <p className={item.status === "COMPLETED" ? "verify-check is-ok" : "verify-check is-ready"}>{statusCopy(item)}</p>
              </div>
              <div className="verify-actions">
                <Link className="ob-secondary" to={`/contracts/${item.id}`}>
                  Consulter
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
