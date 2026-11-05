import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTheme } from "@/features/theme/ThemeContext";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

/**
 * Premium modal of the Users page: portal on <body>, Escape closes it, the page behind cannot
 * scroll, focus moves inside and stays there (Tab loops), then returns to the opener.
 * Clicking the dark overlay closes it too, like the other back-office overlays.
 */
export function UsersModal({
  title,
  subtitle,
  children,
  footer,
  onClose,
  size = "md",
  locked = false,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: "sm" | "md";
  /** While true (a request is running) closing is ignored. */
  locked?: boolean;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { theme } = useTheme();
  const closeRef = useRef(onClose);
  closeRef.current = locked ? () => undefined : onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    if (!dialog.current?.contains(document.activeElement)) {
      dialog.current?.focus();
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog.current) return;
      const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        event.preventDefault();
        dialog.current.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="fu-app bo-overlay is-center um-overlay"
      data-bo-theme={theme}
      onMouseDown={(event) => event.target === event.currentTarget && closeRef.current()}
    >
      <div
        ref={dialog}
        className={`um-modal is-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="um-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="um-close" onClick={() => closeRef.current()} aria-label="Fermer" disabled={locked}>
            <X size={18} />
          </button>
        </header>
        <div className="um-body">{children}</div>
        {footer ? <footer className="um-foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
