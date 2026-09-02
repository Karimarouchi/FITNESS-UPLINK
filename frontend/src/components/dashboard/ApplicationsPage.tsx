import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  fetchRecruitments,
  formatPipelineDate,
  opportunityLabel,
  pipelineTone,
  statusLabel,
  type Recruitment,
} from "@/features/recruitment/api";

export function ApplicationsPage() {
  const [rows, setRows] = useState<Recruitment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecruitments()
      .then(setRows)
      .catch(() => setError("Impossible de charger vos candidatures."));
  }, []);

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Candidatures</h1>
          <div className="sub">Suivi des recrutements ouverts à votre nom par les employeurs, et de vos postulats</div>
        </div>
      </div>
      <Panel>
        {error ? <p className="empty-hint">{error}</p> : null}
        {!error && rows.length === 0 ? (
          <p className="empty-hint">Aucune candidature pour le moment.</p>
        ) : null}
        {rows.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Employeur</th>
                <th>Poste</th>
                <th>Pays</th>
                <th>Mise à jour</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.employer?.displayName ?? "Employeur"}</td>
                  <td>{opportunityLabel(row)}</td>
                  <td>{row.employer?.country?.name ?? row.jobOffer?.location ?? "—"}</td>
                  <td>{formatPipelineDate(row.statusUpdatedAt || row.createdAt)}</td>
                  <td>
                    <StatusPill tone={pipelineTone(row.status)}>{statusLabel(row.status)}</StatusPill>
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
