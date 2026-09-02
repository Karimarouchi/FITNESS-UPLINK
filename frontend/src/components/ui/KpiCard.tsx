type KpiCardProps = {
  label: string;
  value: string;
  delta?: string;
};

export function KpiCard({ label, value, delta }: KpiCardProps) {
  return (
    <div className="kcard">
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
      {delta ? <div className="delta">{delta}</div> : null}
    </div>
  );
}
