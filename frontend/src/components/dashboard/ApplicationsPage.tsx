import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { HireThread, canMessage } from "@/features/recruitment/HireThread";
import {
  blockRecruitment,
  fetchCoverLetterBlob,
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
  const [selected, setSelected] = useState<Recruitment | null>(null);

  useEffect(() => {
    fetchRecruitments()
      .then(setRows)
      .catch(() => setError("Impossible de charger vos candidatures."));
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
      {rows.length === 0 && !error ? <p className="empty-hint">Aucune candidature pour le moment.</p> : null}
      <div className="hire-grid">
        {rows.map((row) => (
          <button key={row.id} type="button" className="hire-card is-button" onClick={() => setSelected(row)}>
            <div className="hire-card-copy">
              <strong>{opportunityLabel(row)}</strong>
              <p>{row.employer?.displayName ?? "Employeur"}</p>
              <p className="text-on-surface-variant">{formatPipelineDate(row.statusUpdatedAt || row.createdAt)}</p>
            </div>
            <StatusPill tone={pipelineTone(row.status)}>{statusLabel(row.status, "candidate")}</StatusPill>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="fu-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <aside className="fu-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="ob-link fiche-back" type="button" onClick={() => setSelected(null)}>
              Fermer
            </button>
            <h2 className="font-display-lg-mobile text-primary">{opportunityLabel(selected)}</h2>
            <p>{selected.employer?.displayName}</p>
            <p>
              Statut : <StatusPill tone={pipelineTone(selected.status)}>{statusLabel(selected.status, "candidate")}</StatusPill>
            </p>
            {selected.coverLetterText ? (
              <>
                <h3>Votre lettre</h3>
                <p>{selected.coverLetterText}</p>
              </>
            ) : null}
            {selected.coverLetterFile ? (
              <button
                className="ob-secondary"
                type="button"
                onClick={() => {
                  void fetchCoverLetterBlob(selected.id).then((blob) => {
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank", "noopener");
                  });
                }}
              >
                Voir le PDF joint
              </button>
            ) : null}
            {canMessage(selected.status) ? <HireThread recruitmentId={selected.id} /> : null}
            {selected.status !== "REJECTED" && selected.status !== "ARCHIVED" ? (
              <Button
                variant="danger"
                type="button"
                onClick={() => {
                  void blockRecruitment(selected.id).then(() => {
                    setRows((current) => current.filter((row) => row.id !== selected.id));
                    setSelected(null);
                  });
                }}
              >
                Bloquer
              </Button>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
