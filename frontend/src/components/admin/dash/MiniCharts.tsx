/** Small decorative charts used by KPI cards. They only draw numbers they are given. */

export function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const width = 120;
  const height = 44;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const pts = values.map((value, index) => `${index * step},${height - 4 - (value / max) * (height - 10)}`);
  return (
    <svg className="bo-dash-spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={`0,${height} ${pts.join(" ")} ${width},${height}`} className="bo-dash-spark-fill" />
      <polyline points={pts.join(" ")} className="bo-dash-spark-line" fill="none" />
    </svg>
  );
}

export function Ring({ percent, tone }: { percent: number; tone: "orange" | "blue" | "rose" }) {
  const radius = 20;
  const circ = 2 * Math.PI * radius;
  return (
    <svg className={`bo-dash-ring is-${tone}`} viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r={radius} className="bo-dash-ring-bg" />
      <circle
        cx="26"
        cy="26"
        r={radius}
        className="bo-dash-ring-fg"
        strokeDasharray={`${(percent / 100) * circ} ${circ}`}
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle">
        {percent}%
      </text>
    </svg>
  );
}
