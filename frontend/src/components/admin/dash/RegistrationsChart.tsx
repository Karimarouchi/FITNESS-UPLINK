import { useId, useState } from "react";
import { niceAxis, smoothPath, type Bucket } from "./dashData";

const WIDTH = 720;
const HEIGHT = 270;
const PAD = { top: 18, right: 22, bottom: 34, left: 40 };

/** Orange line chart of real registrations: hover or focus a point to read its value. */
export function RegistrationsChart({ buckets }: { buckets: Bucket[] }) {
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();
  const peak = Math.max(0, ...buckets.map((bucket) => bucket.count));
  const axis = niceAxis(peak);
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const stepX = buckets.length > 1 ? innerW / (buckets.length - 1) : 0;

  const points = buckets.map((bucket, index) => ({
    x: PAD.left + (buckets.length > 1 ? index * stepX : innerW / 2),
    y: PAD.top + innerH - (bucket.count / axis.max) * innerH,
  }));
  const line = smoothPath(points);
  const area = points.length
    ? `${line} L${points[points.length - 1].x},${PAD.top + innerH} L${points[0].x},${PAD.top + innerH} Z`
    : "";
  const labelEvery = buckets.length > 14 ? 5 : 1;
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const shown = active !== null ? buckets[active] : null;
  const shownPoint = active !== null ? points[active] : null;

  return (
    <div className="bo-dash-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Évolution des inscriptions : ${total} nouveau${total > 1 ? "x" : ""} utilisateur${total > 1 ? "s" : ""} sur la période`}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fc5101" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#fc5101" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {axis.ticks.map((tick) => {
          const y = PAD.top + innerH - (tick / axis.max) * innerH;
          return (
            <g key={tick}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} className="bo-dash-grid" />
              <text x={PAD.left - 10} y={y + 4} textAnchor="end" className="bo-dash-axis">
                {tick}
              </text>
            </g>
          );
        })}

        {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
        {line ? <path d={line} className="bo-dash-line" fill="none" pathLength={1} /> : null}

        {shownPoint ? <line x1={shownPoint.x} x2={shownPoint.x} y1={PAD.top} y2={PAD.top + innerH} className="bo-dash-guide" /> : null}

        {buckets.map((bucket, index) => (
          <g key={bucket.key}>
            {index % labelEvery === 0 || index === buckets.length - 1 ? (
              <text x={points[index].x} y={HEIGHT - 10} textAnchor="middle" className="bo-dash-axis">
                {bucket.label}
              </text>
            ) : null}
            <rect
              x={points[index].x - Math.max(stepX / 2, 8)}
              y={PAD.top}
              width={Math.max(stepX, 16)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setActive(index)}
            />
            <circle
              cx={points[index].x}
              cy={points[index].y}
              r={active === index ? 6 : buckets.length > 14 ? 3 : 4.5}
              className={active === index ? "bo-dash-dot is-on" : "bo-dash-dot"}
              tabIndex={0}
              role="img"
              aria-label={`${bucket.full} : ${bucket.count} inscription${bucket.count > 1 ? "s" : ""}`}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              onMouseEnter={() => setActive(index)}
            />
          </g>
        ))}
      </svg>

      {shown && shownPoint ? (
        <div
          className="bo-dash-tip"
          style={{
            left: `${(shownPoint.x / WIDTH) * 100}%`,
            top: `${(shownPoint.y / HEIGHT) * 100}%`,
          }}
          role="status"
        >
          <span>{shown.full}</span>
          <strong>
            {shown.count} inscription{shown.count > 1 ? "s" : ""}
          </strong>
        </div>
      ) : null}
    </div>
  );
}
