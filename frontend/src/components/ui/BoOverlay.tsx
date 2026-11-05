import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTheme } from "@/features/theme/ThemeContext";

function useEscape(onClose: () => void) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);
}

type OverlayProps = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: number;
  /** Premium back-office look: follows the Light/Dark theme and manages focus (Tab loop, restore on close). */
  premium?: boolean;
  /** Replaces the title/subtitle block of the header (the title stays the dialog's accessible name). */
  headerContent?: ReactNode;
  /** Extra class on the panel (premium variant only), for page-specific styling. */
  className?: string;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

function useFocusScope(active: boolean) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        event.preventDefault();
        panel.current.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || current === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      opener?.focus?.();
    };
  }, [active]);
  return panel;
}

export function BoDrawer({ title, subtitle, children, footer, onClose, width, premium = false, headerContent, className }: OverlayProps) {
  useEscape(onClose);
  const { theme } = useTheme();
  const panel = useFocusScope(premium);
  return createPortal(
    <div
      className={premium ? "fu-app bo-overlay um-overlay" : "fu-app bo-overlay"}
      data-bo-theme={premium ? theme : undefined}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <aside
        ref={panel}
        className={premium ? `bo-drawer vx-drawer${className ? ` ${className}` : ""}` : "bo-drawer"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={premium ? -1 : undefined}
        style={width ? { width: `min(${width}px, 100%)` } : undefined}
      >
        <div className="bo-drawer-head">
          {headerContent ?? (
            <div>
              <h2>{title}</h2>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          )}
          <button type="button" className="bo-icon-btn" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="bo-drawer-body">{children}</div>
        {footer ? <div className="bo-drawer-foot">{footer}</div> : null}
      </aside>
    </div>,
    document.body,
  );
}

export function BoModal({ title, subtitle, children, footer, onClose }: OverlayProps) {
  useEscape(onClose);
  return createPortal(
    <div className="fu-app bo-overlay is-center" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="bo-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="bo-modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="bo-icon-btn" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="bo-modal-body">{children}</div>
        {footer ? <div className="bo-modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
