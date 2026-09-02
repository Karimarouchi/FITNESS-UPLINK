import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type PanelProps = {
  title?: string;
  actionLabel?: string;
  actionTo?: string;
  children: ReactNode;
  body?: boolean;
};

export function Panel({ title, actionLabel, actionTo, children, body = false }: PanelProps) {
  return (
    <div className="panel">
      {title ? (
        <div className="panel-head">
          <h2>{title}</h2>
          {actionLabel && actionTo ? (
            <Link className="panel-action" to={actionTo}>
              {actionLabel}
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          ) : actionLabel ? (
            <span className="panel-action">{actionLabel}</span>
          ) : null}
        </div>
      ) : null}
      {body ? <div className="panel-body">{children}</div> : children}
    </div>
  );
}
