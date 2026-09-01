import { CandidatePhoto } from "@/features/talent/CandidatePhoto";
import { VerificationBadge } from "@/shared/components/VerificationBadge";
import { PIPELINE_STATUSES, formatPipelineDate, opportunityLabel, type PipelineStatus, type Recruitment } from "./api";
import { PipelineStatusBadge } from "./PipelineStatusBadge";

export function PipelineCandidateCard({
  item,
  onOpen,
  onStatus,
}: {
  item: Recruitment;
  onOpen: () => void;
  onStatus: (status: PipelineStatus) => void;
}) {
  const candidate = item.candidate;
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
      <label className="pipeline-card-status">
        <select
          aria-label="Statut"
          className="custom-input"
          value={item.status}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onStatus(event.target.value as PipelineStatus)}
        >
          {PIPELINE_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        <PipelineStatusBadge status={item.status} />
      </label>
    </article>
  );
}
