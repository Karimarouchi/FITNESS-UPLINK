import type { CSSProperties } from "react";
import "./skeleton.css";

/**
 * Loading placeholders shared by the whole app. They follow the Light/Dark theme through the
 * `--bt-skel-*` tokens when present (back-office shell, onboarding) and fall back to neutral greys
 * elsewhere. Every group announces itself once to screen readers and hides its blocks.
 */
export function Skeleton({
  w,
  h = 16,
  r = 10,
  className = "",
  style,
}: {
  w?: number | string;
  h?: number | string;
  r?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`sk${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      style={{ width: w, height: h, borderRadius: r, ...style }}
    />
  );
}

function Busy({ label = "Chargement…", className = "", children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-live="polite">
      <span className="sk-sr">{label}</span>
      {children}
    </div>
  );
}

/** A few lines of text. The last line is shorter. */
export function SkeletonText({ lines = 3, label }: { lines?: number; label?: string }) {
  return (
    <Busy label={label} className="sk-stack">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} h={14} w={index === lines - 1 && lines > 1 ? "62%" : "100%"} />
      ))}
    </Busy>
  );
}

/** List rows: round avatar + two lines. */
export function SkeletonRows({ rows = 4, label }: { rows?: number; label?: string }) {
  return (
    <Busy label={label} className="sk-rows">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="sk-row" aria-hidden="true">
          <Skeleton w={44} h={44} r={14} />
          <div className="sk-row-main">
            <Skeleton h={14} w={index % 2 ? "46%" : "58%"} />
            <Skeleton h={12} w={index % 2 ? "72%" : "64%"} />
          </div>
          <Skeleton w={64} h={26} r={999} />
        </div>
      ))}
    </Busy>
  );
}

/** A grid of cards (photo + lines). */
export function SkeletonCards({ count = 3, h = 220, label }: { count?: number; h?: number; label?: string }) {
  return (
    <Busy label={label} className="sk-cards">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="sk-card" aria-hidden="true" style={{ minHeight: h }}>
          <Skeleton w={46} h={46} r={14} />
          <Skeleton h={16} w="64%" />
          <Skeleton h={12} w="88%" />
          <Skeleton h={12} w="52%" />
        </div>
      ))}
    </Busy>
  );
}

/** A whole page: title, a row of stat cards, then a panel. Used for route-level loading. */
export function PageSkeleton({ label }: { label?: string }) {
  return (
    <Busy label={label} className="sk-page">
      <div className="sk-page-head" aria-hidden="true">
        <Skeleton h={38} w="min(340px, 70%)" r={12} />
        <Skeleton h={14} w="min(460px, 90%)" />
      </div>
      <div className="sk-kpis" aria-hidden="true">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="sk-card">
            <Skeleton w={44} h={44} r={14} />
            <Skeleton h={30} w="40%" />
            <Skeleton h={12} w="70%" />
          </div>
        ))}
      </div>
      <div className="sk-panel" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((key) => (
          <div key={key} className="sk-row">
            <Skeleton w={40} h={40} r={12} />
            <div className="sk-row-main">
              <Skeleton h={14} w={key % 2 ? "42%" : "56%"} />
              <Skeleton h={12} w="68%" />
            </div>
          </div>
        ))}
      </div>
    </Busy>
  );
}

/** Full-screen version shown while the session is being restored. */
export function AppLoading() {
  return (
    <div className="sk-screen">
      <PageSkeleton label="Chargement de votre espace…" />
    </div>
  );
}
