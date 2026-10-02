import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Condensed uppercase title: every line is navy, `muted` is appended in grey. */
export function VtTitle({ lines, muted, as = "h2" }: { lines: string[]; muted?: string; as?: "h2" | "h3" }) {
  const Tag = as;
  return (
    <Tag className="vt-title">
      {lines.map((line, index) => (
        <span key={line}>
          {line}
          {index < lines.length - 1 || muted ? <br /> : null}
        </span>
      ))}
      {muted ? <span className="vt-muted">{muted}</span> : null}
    </Tag>
  );
}

/** Heading on the left, short copy on the right — the Vantage section header. */
export function VtHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <header className="vt-head">
      {title}
      {children ? <div className="vt-head-copy">{children}</div> : null}
    </header>
  );
}

export function VtLink({ to, children }: { to: string; children: ReactNode }) {
  const content = (
    <>
      {children}
      <span className="material-symbols-outlined" aria-hidden="true">
        arrow_forward
      </span>
    </>
  );
  // In-page anchors must be plain links so the browser scrolls to them.
  return to.startsWith("#") ? (
    <a className="vt-link" href={to}>
      {content}
    </a>
  ) : (
    <Link className="vt-link" to={to}>
      {content}
    </Link>
  );
}

export function VtButton({ to, children, tone = "line" }: { to: string; children: ReactNode; tone?: "line" | "lime" | "navy" }) {
  return (
    <Link className={`vt-btn vt-btn-${tone}`} to={to}>
      {children}
      <span className="material-symbols-outlined" aria-hidden="true">
        arrow_forward
      </span>
    </Link>
  );
}
