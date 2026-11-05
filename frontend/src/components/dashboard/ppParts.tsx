import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarX,
  FileSignature,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  Ticket,
  Wallet,
} from "lucide-react";
import "@/shared/styles/backoffice-pro.css";

export type IconType = ComponentType<{ size?: number }>;

/** The notification helper names a Material Symbol; the Premium dashboards show the matching Lucide icon. */
export const NOTIFICATION_ICONS: Record<string, IconType> = {
  payments: Wallet,
  chat: MessageSquare,
  event_busy: CalendarX,
  event_seat: Ticket,
  school: GraduationCap,
  event_available: CalendarCheck,
  contract: FileSignature,
  work: BriefcaseBusiness,
  verified_user: ShieldCheck,
  notifications: Bell,
};

export function Kpi({
  to,
  icon: Icon,
  tone = "",
  value,
  label,
  alert,
}: {
  to: string;
  icon: IconType;
  tone?: string;
  value: ReactNode;
  label: string;
  alert?: boolean;
}) {
  return (
    <Link to={to} className={alert ? "pp-kpi is-alert" : "pp-kpi"}>
      <span className={`pp-icon ${alert ? "is-rose" : tone}`} aria-hidden="true">
        <Icon size={22} />
      </span>
      <span className="pp-kpi-label">{label}</span>
      <span className="pp-kpi-value">{value}</span>
    </Link>
  );
}

export function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="pp-card">
      <header>
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Empty({ icon: Icon, children }: { icon: IconType; children: ReactNode }) {
  return (
    <p className="pp-empty">
      <span aria-hidden="true">
        <Icon size={20} />
      </span>
      <span>{children}</span>
    </p>
  );
}
