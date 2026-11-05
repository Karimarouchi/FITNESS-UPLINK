import { Info } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

type IconType = ComponentType<{ size?: number }>;

const TONES = ["is-blue", "is-orange", "is-violet"];

/** Honest "nothing to manage here yet" card used by the admin modules that have no admin API. */
export function ModuleState({
  icons,
  title,
  description,
  chip,
  notes,
  action,
}: {
  icons: [IconType, IconType, IconType];
  title: string;
  description: string;
  chip?: string;
  notes?: string[];
  action?: ReactNode;
}) {
  return (
    <div className="bo-dash-card bm-state">
      <div className="bm-illus" aria-hidden="true">
        {icons.map((Icon, index) => (
          <span key={index} className={`bm-illus-tile ${TONES[index]}`}>
            <Icon size={index === 1 ? 28 : 24} />
          </span>
        ))}
      </div>
      {chip ? <span className="bm-chip">{chip}</span> : null}
      <h2>{title}</h2>
      <p>{description}</p>
      {notes && notes.length > 0 ? (
        <ul className="bm-notes">
          {notes.map((note) => (
            <li key={note}>
              <Info size={16} aria-hidden="true" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {action}
    </div>
  );
}
