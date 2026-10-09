import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

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
};

export function BoDrawer({ title, subtitle, children, footer, onClose, width }: OverlayProps) {
  useEscape(onClose);
  return createPortal(
    <div className="fu-app bo-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside
        className="bo-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={width ? { width: `min(${width}px, 100%)` } : undefined}
      >
        <div className="bo-drawer-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
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
