import { CandidatePhoto } from "@/features/talent/CandidatePhoto";
import { VerificationBadge } from "@/shared/components/VerificationBadge";
import { PIPELINE_STATUSES, formatPipelineDate, opportunityLabel, type PipelineStatus, type Recruitment } from "./api";
import { PipelineStatusBadge } from "./PipelineStatusBadge";

export function PipelineCandidateCard({
  item,
  onOpen,
  onStatus,
  onPrepareContract,
  onViewContract,
  onMarkHired,
}: {
  item: Recruitment;
  onOpen: () => void;
  onStatus: (status: PipelineStatus) => void;
  onPrepareContract: () => void;
  onViewContract: () => void;
  onMarkHired: () => void;
}) {
  const candidate = item.candidate;
  const contract = item.contract;
  const canHire = Boolean(contract?.completed);

  function changeStatus(next: PipelineStatus) {
    if (next === "HIRED" && !canHire) {
      return;
    }
    onStatus(next);
  }

  return (
    <article className="pipeline-card">
      <button className="pipeline-card-main" type="button" onClick={onOpen}>
        <CandidatePhoto candidateId={candidate.id} uploadId={candidate.photoUploadId} name={candidate.displayName} size={48} />
        <div>
          <div className="talent-card-title">
            <strong>{candidate.displayName}</strong>
            <VerificationBadge verified={candidate.verified} compact />
          </div>
          <p>{candidate.title || "Candidat"}</p>
          <p className="text-on-surface-variant">
            {candidate.city || "—"}
            {candidate.country ? ` · ${candidate.country.name}` : ""}
          </p>
          <p className="talent-meta">{opportunityLabel(item)}</p>
          <p className="text-on-surface-variant">Ajoutée le {formatPipelineDate(item.createdAt)}</p>
        </div>
      </button>
      <div className="pipeline-card-status">
        <p>
          Statut : <PipelineStatusBadge status={item.status} />
        </p>
        {item.status === "NEGOTIATION" ? (
          <button className="ob-primary" type="button" onClick={onPrepareContract}>
            Préparer le contrat
          </button>
        ) : null}
        {item.status === "CONTRACT_SENT" && contract ? (
          <div className="pipeline-contract-state">
            <p>{contract.candidateSigned ? "✓ Candidat signé" : "○ Signature candidat en attente"}</p>
            <p>{contract.employerSigned ? "✓ Employeur signé" : contract.candidateSigned ? "○ Employeur doit signer" : "○ Signature employeur en attente"}</p>
            {contract.completed ? <p>✓ Contrat finalisé</p> : null}
            <button className="ob-secondary" type="button" onClick={onViewContract}>
              {contract.completed ? "Télécharger PDF" : contract.candidateSigned && !contract.employerSigned ? "Signer" : "Voir le contrat"}
            </button>
            {contract.completed ? (
              <button className="ob-primary" type="button" onClick={onMarkHired}>
                Marquer comme recruté
              </button>
            ) : null}
          </div>
        ) : null}
        {item.status === "HIRED" ? <p className="pipeline-hired-mark">✓ Recruté</p> : null}
        <label>
          Changer le statut
          <select
            aria-label="Statut"
            className="custom-input"
            value={item.status}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => changeStatus(event.target.value as PipelineStatus)}
          >
            {PIPELINE_STATUSES.map((status) => (
              <option key={status.value} value={status.value} disabled={status.value === "HIRED" && !canHire && item.status !== "HIRED"}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}
