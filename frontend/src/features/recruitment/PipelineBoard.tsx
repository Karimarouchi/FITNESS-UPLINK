import type { DragEvent } from "react";
import { BOARD_COLUMNS, PIPELINE_STATUSES, type PipelineStatus, type Recruitment } from "./api";
import { PipelineCandidateCard } from "./PipelineCandidateCard";

const DRAG_TYPE = "application/x-fitness-recruitment";

export function PipelineBoard({
  items,
  onOpen,
  onStatus,
  onPrepareContract,
  onViewContract,
  onMarkHired,
}: {
  items: Recruitment[];
  onOpen: (item: Recruitment) => void;
  onStatus: (item: Recruitment, status: PipelineStatus) => void;
  onPrepareContract: (item: Recruitment) => void;
  onViewContract: (item: Recruitment) => void;
  onMarkHired: (item: Recruitment) => void;
}) {
  function dropOn(column: PipelineStatus, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const id = event.dataTransfer.getData(DRAG_TYPE) || event.dataTransfer.getData("text/plain");
    const item = items.find((entry) => entry.id === id);
    (event.currentTarget as HTMLElement).classList.remove("is-drop");
    if (!item || item.status === column) {
      return;
    }
    onStatus(item, column);
  }

  return (
    <div className="pipeline-board">
      {BOARD_COLUMNS.map((column) => {
        const cards = items.filter((item) => item.status === column);
        const label = PIPELINE_STATUSES.find((status) => status.value === column)?.label ?? column;
        return (
          <section
            key={column}
            className="pipeline-column"
            data-pipeline-column={column}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              event.currentTarget.classList.add("is-drop");
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                event.currentTarget.classList.remove("is-drop");
              }
            }}
            onDrop={(event) => dropOn(column, event)}
          >
            <header>
              <h2>{label}</h2>
              <span>{cards.length}</span>
            </header>
            <div className="pipeline-column-body">
              {cards.length === 0 ? (
                <p className="pipeline-column-empty">
                  <strong>Vide</strong>
                  <span>Déposez une carte ici</span>
                </p>
              ) : (
                cards.map((item) => (
                  <PipelineCandidateCard
                    key={item.id}
                    item={item}
                    draggable
                    onOpen={() => onOpen(item)}
                    onStatus={(status) => onStatus(item, status)}
                    onPrepareContract={() => onPrepareContract(item)}
                    onViewContract={() => onViewContract(item)}
                    onMarkHired={() => onMarkHired(item)}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
