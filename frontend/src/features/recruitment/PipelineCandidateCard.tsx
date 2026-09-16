import { useRef } from "react";
import { CandidatePhoto } from "@/features/talent/CandidatePhoto";
import { VerificationBadge } from "@/shared/components/VerificationBadge";
import { formatPipelineDate, opportunityLabel, type Recruitment } from "./api";
import { PipelineStatusBadge } from "./PipelineStatusBadge";

const DRAG_TYPE = "application/x-fitness-recruitment";

export function PipelineCandidateCard({
  item,
  draggable = false,
  onOpen,
}: {
  item: Recruitment;
  draggable?: boolean;
  onOpen: () => void;
}) {
  const candidate = item.candidate;
  const dragged = useRef(false);

  return (
    <article
      className={`pipeline-card is-compact${draggable ? " is-movable" : ""}`}
      draggable={draggable}
      onDragStart={(event) => {
        dragged.current = true;
        event.dataTransfer.setData(DRAG_TYPE, item.id);
        event.dataTransfer.setData("text/plain", item.id);
        event.dataTransfer.effectAllowed = "move";
        event.currentTarget.classList.add("is-dragging");
      }}
      onDragEnd={(event) => {
        event.currentTarget.classList.remove("is-dragging");
        window.setTimeout(() => {
          dragged.current = false;
        }, 0);
      }}
    >
      <div
        className="pipeline-card-main"
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!dragged.current) {
            onOpen();
          }
        }}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !dragged.current) {
            event.preventDefault();
            onOpen();
          }
        }}
      >
        <CandidatePhoto candidateId={candidate.id} uploadId={candidate.photoUploadId} name={candidate.displayName} size={40} />
        <div>
          <div className="talent-card-title">
            <strong>{candidate.displayName}</strong>
            <VerificationBadge verified={candidate.verified} compact />
          </div>
          <p className="talent-meta">{opportunityLabel(item)}</p>
          <p className="text-on-surface-variant">{formatPipelineDate(item.createdAt)}</p>
          <PipelineStatusBadge status={item.status} />
        </div>
      </div>
    </article>
  );
}
