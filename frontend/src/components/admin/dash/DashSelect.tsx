import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

type Option<T extends string> = { value: T; label: string };

/** Small accessible dropdown (button + listbox) used by the dashboard filters. */
export function DashSelect<T extends string>({
  value,
  options,
  onChange,
  label,
  icon,
  align = "right",
  placement = "down",
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  label: string;
  icon?: ReactNode;
  align?: "left" | "right";
  /** "up" opens the list above the button (used near the bottom of a page). */
  placement?: "down" | "up";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="bo-dash-select" ref={root}>
      <button
        type="button"
        className="bo-dash-select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label} : ${current.label}`}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span>{current.label}</span>
        <ChevronDown size={16} aria-hidden="true" className={open ? "is-open" : ""} />
      </button>
      {open ? (
        <ul className={`bo-dash-select-list is-${align}${placement === "up" ? " is-up" : ""}`} id={listId} role="listbox" aria-label={label}>
          {options.map((option) => (
            <li key={option.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={option.value === value ? "is-on" : ""}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
                {option.value === value ? <Check size={15} aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
