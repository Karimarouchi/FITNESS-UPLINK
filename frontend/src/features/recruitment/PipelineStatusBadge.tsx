import { statusLabel, type PipelineStatus } from "./api";

export function PipelineStatusBadge({ status }: { status: PipelineStatus }) {
  return <span className={`pipeline-badge pipeline-badge--${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}
