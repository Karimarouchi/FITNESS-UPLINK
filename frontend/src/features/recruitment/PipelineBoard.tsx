import { BOARD_COLUMNS, PIPELINE_STATUSES, type PipelineStatus, type Recruitment } from "./api";
import { PipelineCandidateCard } from "./PipelineCandidateCard";

export function PipelineBoard({
  items,
  onOpen,
  onStatus,
}: {
  items: Recruitment[];
  onOpen: (item: Recruitment) => void;
  onStatus: (item: Recruitment, status: PipelineStatus) => void;
}) {
  return (
    <div className="pipeline-board">
      {BOARD_COLUMNS.map((column) => {
        const cards = items.filter((item) => item.status === column);
        const label = PIPELINE_STATUSES.find((status) => status.value === column)?.label ?? column;
        return (
          <section key={column} className="pipeline-column">
            <header>
              <h2>{label}</h2>
              <span>{cards.length}</span>
            </header>
            <div className="pipeline-column-body">
              {cards.map((item) => (
                <PipelineCandidateCard
                  key={item.id}
                  item={item}
                  onOpen={() => onOpen(item)}
                  onStatus={(status) => onStatus(item, status)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
