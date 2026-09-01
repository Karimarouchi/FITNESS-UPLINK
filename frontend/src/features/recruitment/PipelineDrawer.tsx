import { Link } from "react-router-dom";
import { CandidatePhoto } from "@/features/talent/CandidatePhoto";
import { VerificationBadge } from "@/shared/components/VerificationBadge";
import {
  PIPELINE_STATUSES,
  formatPipelineDate,
  opportunityLabel,
  type PipelineStatus,
  type Recruitment,
} from "./api";
import { PipelineStatusBadge } from "./PipelineStatusBadge";

export function PipelineDrawer({
  item,
  noteDraft,
  onNoteDraft,
  onClose,
  onStatus,
  onSaveNote,
  onArchive,
  onContact,
  onNewRecruitment,
}: {
  item: Recruitment;
  noteDraft: string;
  onNoteDraft: (value: string) => void;
  onClose: () => void;
  onStatus: (status: PipelineStatus) => void;
  onSaveNote: () => void;
  onArchive: () => void;
  onContact: () => void;
  onNewRecruitment: () => void;
}) {
  const candidate = item.candidate;
  return (
    <div className="fu-backdrop" role="presentation" onClick={onClose}>
      <aside className="fu-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button className="ob-link fiche-back" type="button" onClick={onClose}>
          Fermer
        </button>
        <div className="talent-card-title">
          <CandidatePhoto candidateId={candidate.id} uploadId={candidate.photoUploadId} name={candidate.displayName} size={72} />
          <div>
            <h2 className="font-display-lg-mobile text-primary">{candidate.displayName}</h2>
            <VerificationBadge verified={candidate.verified} />
          </div>
        </div>
        <p className="font-body-lg">{candidate.title || "Candidat"}</p>
        <p className="font-body-md text-on-surface-variant">
          {candidate.city || "—"}
          {candidate.country ? ` · ${candidate.country.flagEmoji} ${candidate.country.name}` : ""}
        </p>
        <p>
          Statut : <PipelineStatusBadge status={item.status} />
        </p>
        <p>Recrutement : {opportunityLabel(item)}</p>
        <p>Date d’entrée : {formatPipelineDate(item.createdAt)}</p>
        <p>Dernière mise à jour : {formatPipelineDate(item.updatedAt)}</p>
        <label className="fu-field">
          Changer le statut
          <select className="custom-input" value={item.status} onChange={(event) => onStatus(event.target.value as PipelineStatus)}>
            {PIPELINE_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="fu-field">
          Note interne
          <textarea className="custom-input custom-textarea" value={noteDraft} onChange={(event) => onNoteDraft(event.target.value)} />
        </label>
        <div className="fiche-actions">
          <Link className="ob-secondary" to={`/candidates/${candidate.id}`}>
            Voir le profil
          </Link>
          <button className="ob-secondary" type="button" onClick={onContact}>
            Contacter
          </button>
          <button className="ob-secondary" type="button" onClick={onSaveNote}>
            Enregistrer la note
          </button>
          <button className="ob-secondary" type="button" onClick={onNewRecruitment}>
            Nouveau recrutement
          </button>
          {item.status !== "ARCHIVED" ? (
            <button className="ob-secondary" type="button" onClick={onArchive}>
              Archiver
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
