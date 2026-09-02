type BadgeProps = {
  children: string;
  variant?: "default" | "warn" | "pending";
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  const cls = variant === "default" ? "badge" : `badge ${variant}`;
  return (
    <span className={cls}>
      <span className="dot" />
      {children}
    </span>
  );
}
