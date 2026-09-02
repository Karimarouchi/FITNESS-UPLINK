export type StatusTone = "new" | "interview" | "sent" | "refused" | "verified" | "pending";

type StatusPillProps = {
  tone: StatusTone;
  children: string;
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}
