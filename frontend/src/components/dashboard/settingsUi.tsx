import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

type IconType = ComponentType<{ size?: number }>;

/**
 * Settings blocks used by the account settings page. In the back-office shell (`premium`) they render with the
 * Premium Dashboard classes; elsewhere (member shell) they keep the legacy Panel / Button markup untouched.
 */
export function Card({
  premium,
  title,
  icon: Icon,
  tone = "",
  children,
}: {
  premium: boolean;
  title: string;
  icon?: IconType;
  tone?: string;
  children: ReactNode;
}) {
  if (!premium) {
    return (
      <Panel title={title} body>
        {children}
      </Panel>
    );
  }
  return (
    <section className="bo-dash-card bo-users-card st-card">
      <div className="ml-card-head">
        {Icon ? (
          <span className={`bo-dash-icon ${tone}`} aria-hidden="true">
            <Icon size={22} />
          </span>
        ) : null}
        <h2>{title}</h2>
      </div>
      <div className="st-body">{children}</div>
    </section>
  );
}

export function Notice({
  premium,
  flash,
  error,
  onClose,
}: {
  premium: boolean;
  flash?: string | null;
  error?: string | null;
  onClose?: () => void;
}) {
  if (!premium) {
    return (
      <>
        {flash ? <p className="fu-flash">{flash}</p> : null}
        {error ? <p className="auth-error">{error}</p> : null}
      </>
    );
  }
  return (
    <>
      {flash ? (
        <div className="bo-users-alert" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{flash}</span>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Masquer le message">
              <X size={16} />
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

export function Btn({
  premium,
  variant = "primary",
  children,
  ...props
}: {
  premium: boolean;
  variant?: "primary" | "outline" | "danger";
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  if (!premium) {
    return (
      <Button variant={variant} {...props}>
        {children}
      </Button>
    );
  }
  const cls = variant === "outline" ? "bm-btn is-outline" : variant === "danger" ? "bm-btn is-danger" : "bm-btn";
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
