export type DonutSlice = { key: string; label: string; value: number; color: string };

const SIZE = 180;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

/** Donut whose centre is the sum of its slices, so the total always matches what is drawn. */
export function DonutChart({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let offset = 0;
  const gap = slices.filter((slice) => slice.value > 0).length > 1 ? 3 : 0;

  return (
    <svg
      className="bo-dash-donut"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`${total} ${centerLabel.toLowerCase()} : ${slices.map((slice) => `${slice.value} ${slice.label.toLowerCase()}`).join(", ")}`}
    >
      <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--bt-donut-track)" strokeWidth={STROKE} />
      {total > 0
        ? slices.map((slice) => {
            if (slice.value <= 0) return null;
            const length = (slice.value / total) * CIRC;
            const dash = Math.max(length - gap, 0.5);
            const node = (
              <circle
                key={slice.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${CIRC - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                className="bo-dash-donut-arc"
              />
            );
            offset += length;
            return node;
          })
        : null}
      <text x="50%" y="48%" textAnchor="middle" className="bo-dash-donut-total">
        {total}
      </text>
      <text x="50%" y="62%" textAnchor="middle" className="bo-dash-donut-label">
        {centerLabel}
      </text>
    </svg>
  );
}
