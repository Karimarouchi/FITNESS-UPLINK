import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type SelectOption = { value: string; label: string };

type SelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
};

export function Select({ id, value, onChange, options, placeholder = "Sélectionner", disabled, invalid, className }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`ui-select${invalid ? " is-invalid" : ""}${disabled ? " is-disabled" : ""}${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        id={id}
        className="ui-select-trigger custom-input"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected ? "ui-select-value" : "ui-select-placeholder"}>{selected ? selected.label : placeholder}</span>
        <span className={`material-symbols-outlined ui-select-chevron${open ? " is-open" : ""}`} aria-hidden="true">
          expand_more
        </span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.ul
            className="ui-select-panel"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`ui-select-option${option.value === value ? " is-selected" : ""}`}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))}
            {options.length === 0 ? <li className="ui-select-empty">Aucune option</li> : null}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
