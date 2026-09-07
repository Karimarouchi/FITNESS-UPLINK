import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/features/auth/AuthContext";
import { isBusiness, isCandidate } from "@/features/auth/types";
import { contractStatusLabel, contractStatusTone, fetchContracts, type Contract } from "../api";
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
    <section>
      <div className="page-head">
        <div>
          <h1>{candidate ? "Mes contrats" : "Contrats"}</h1>
          <p className="sub">
            {candidate
              ? "Consultez et signez les contrats envoyés par les employeurs."
              : "Suivez les signatures et ouvrez le document de chaque recrutement."}
          </p>
        </div>
      </div>
      {error ? <p className="auth-error">{error}</p> : null}
      <Panel title="Tous les contrats" actionLabel={items.length ? String(items.length) : undefined}>
        {items.length === 0 && !error ? (
          <p className="jobs-empty">
            <strong>Aucun contrat</strong>
            <span>Cette liste est vide. Un contrat apparaîtra ici dès qu’il sera envoyé depuis le pipeline.</span>
          </p>
        ) : items.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>{candidate ? "Employeur" : "Candidat"}</th>
                <th>Poste</th>
                <th>Date</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{candidate ? item.employerName : item.candidateName}</strong>
                    <div className="muted-line">{statusCopy(item)}</div>
                  </td>
                  <td>{item.jobOffer?.title || item.terms?.position || "Recrutement direct"}</td>
                  <td>{formatPipelineDate(item.createdAt)}</td>
                  <td>
                    <StatusPill tone={contractStatusTone(item.status)}>{contractStatusLabel(item.status)}</StatusPill>
                  </td>
                  <td>
                    <Button variant="mini" to={`/contracts/${item.id}`}>
                      Consulter
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Panel>
    </section>
  );
}
