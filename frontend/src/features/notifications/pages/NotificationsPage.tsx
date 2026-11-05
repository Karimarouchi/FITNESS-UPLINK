import { useMemo, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarX,
  Check,
  CheckCheck,
  FileSignature,
  GraduationCap,
  MailCheck,
  MessageSquare,
  ShieldCheck,
  Ticket,
  Wallet,
} from "lucide-react";
import { usesWorkspaceShell } from "@/components/layout/shell/shellNav";
import { useAuth } from "@/features/auth/AuthContext";
import type { AppNotification } from "../api";
import { notificationIcon, notificationTime, useNotifications } from "../useNotifications";
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";
import { SkeletonRows } from "@/components/ui/Skeleton";

type Filter = "all" | "unread";
type IconType = ComponentType<{ size?: number }>;

// the legacy helper names a Material Symbol; the Premium list shows the matching Lucide icon
const LUCIDE: Record<string, IconType> = {
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

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const time = date.getTime();
  if (time >= startOfToday) return "Aujourd’hui";
  if (time >= startOfToday - 86_400_000) return "Hier";
  return "Plus tôt";
}

function groupByDay(items: AppNotification[]) {
  const groups: { label: string; items: AppNotification[] }[] = [];
  items.forEach((item) => {
    const label = dayLabel(item.createdAt);
    const group = groups.find((entry) => entry.label === label);
    if (group) group.items.push(item);
    else groups.push({ label, items: [item] });
  });
  return groups;
}

export function NotificationsPage() {
  const { user } = useAuth();
  const premium = usesWorkspaceShell(user);
  const { items, loaded, error, unreadCount, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const navigate = useNavigate();

  const visible = useMemo(() => (filter === "unread" ? items.filter((item) => !item.readAt) : items), [items, filter]);
  const groups = useMemo(() => groupByDay(visible), [visible]);

  const subtitle = unreadCount
    ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}.`
    : "Vous êtes à jour.";

  if (premium) {
    return (
      <section className="bo-dash bo-users bo-bm bo-nx">
        <header className="bo-dash-head">
          <div>
            <h1>Notifications</h1>
            <p>{subtitle}</p>
          </div>
          {unreadCount ? (
            <button className="bm-btn is-outline" type="button" onClick={() => void markAllRead()}>
              <CheckCheck size={16} aria-hidden="true" />
              Tout marquer comme lu
            </button>
          ) : null}
        </header>

        <div className="bo-dash-card bo-users-card">
          <div className="bo-users-toolbar">
            <div className="bo-users-tabs" role="tablist" aria-label="Filtrer les notifications">
              <button type="button" role="tab" aria-selected={filter === "all"} className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>
                Toutes <span>{items.length}</span>
              </button>
              <button type="button" role="tab" aria-selected={filter === "unread"} className={filter === "unread" ? "is-active" : ""} onClick={() => setFilter("unread")}>
                Non lues <span>{unreadCount}</span>
              </button>
            </div>
          </div>

          {error && items.length === 0 ? (
            <p className="bo-dash-error bm-inline-error" role="alert">
              Impossible de charger les notifications.
            </p>
          ) : !loaded ? (
            <div className="nx-note"><SkeletonRows rows={4} /></div>
          ) : visible.length === 0 ? (
            <div className="bo-users-empty">
              <span>{filter === "unread" ? <MailCheck size={22} aria-hidden="true" /> : <BellOff size={22} aria-hidden="true" />}</span>
              <strong>{filter === "unread" ? "Tout est lu" : "Aucune notification"}</strong>
              <p>
                {filter === "unread"
                  ? "Vous avez traité toutes vos notifications."
                  : "Inscriptions, paiements, messages et séances apparaîtront ici."}
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section className="nx-group" key={group.label} aria-label={group.label}>
                <h2>{group.label}</h2>
                <ul className="nx-list">
                  {group.items.map((item) => {
                    const Icon = LUCIDE[notificationIcon(item)] ?? Bell;
                    return (
                      <li key={item.id} className={item.readAt ? "nx-item" : "nx-item is-unread"}>
                        <span className="nx-icon" aria-hidden="true">
                          <Icon size={20} />
                        </span>
                        <div className="nx-copy">
                          <strong>
                            {item.title}
                            {item.readAt ? null : <i className="nx-dot" aria-label="Non lue" />}
                          </strong>
                          <p>{item.message}</p>
                          <small>{notificationTime(item.createdAt)}</small>
                        </div>
                        <div className="nx-actions">
                          {item.actionPath ? (
                            <button
                              className="bm-btn is-outline"
                              type="button"
                              onClick={() => {
                                void markRead(item.id);
                                navigate(item.actionPath as string);
                              }}
                            >
                              {item.actionLabel || "Ouvrir"}
                            </button>
                          ) : null}
                          {item.readAt ? null : (
                            <button className="nx-read" type="button" onClick={() => void markRead(item.id)} aria-label="Marquer comme lue">
                              <Check size={16} aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="nf">
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p className="sub">{subtitle}</p>
        </div>
        {unreadCount ? (
          <button className="btn-outline" type="button" onClick={() => void markAllRead()}>
            <span className="material-symbols-outlined" aria-hidden="true">
              done_all
            </span>
            Tout marquer comme lu
          </button>
        ) : null}
      </div>

      <div className="nf-tabs" role="tablist" aria-label="Filtrer les notifications">
        <button type="button" role="tab" aria-selected={filter === "all"} className={filter === "all" ? "is-on" : undefined} onClick={() => setFilter("all")}>
          Toutes <em>{items.length}</em>
        </button>
        <button type="button" role="tab" aria-selected={filter === "unread"} className={filter === "unread" ? "is-on" : undefined} onClick={() => setFilter("unread")}>
          Non lues <em>{unreadCount}</em>
        </button>
      </div>

      {error && items.length === 0 ? (
        <p className="auth-error">Impossible de charger les notifications.</p>
      ) : !loaded ? (
        <SkeletonRows rows={4} />
      ) : visible.length === 0 ? (
        <div className="nf-empty">
          <span className="material-symbols-outlined" aria-hidden="true">
            {filter === "unread" ? "mark_email_read" : "notifications_off"}
          </span>
          <h2>{filter === "unread" ? "Tout est lu" : "Aucune notification"}</h2>
          <p>
            {filter === "unread"
              ? "Vous avez traité toutes vos notifications."
              : "Inscriptions, paiements, messages et séances apparaîtront ici."}
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <section className="nf-group" key={group.label}>
            <h2>{group.label}</h2>
            <ul className="nf-list">
              {group.items.map((item) => (
                <li key={item.id} className={item.readAt ? "nf-item" : "nf-item is-unread"}>
                  <span className="nf-icon material-symbols-outlined" aria-hidden="true">
                    {notificationIcon(item)}
                  </span>
                  <div className="nf-copy">
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small>{notificationTime(item.createdAt)}</small>
                  </div>
                  <div className="nf-actions">
                    {item.actionPath ? (
                      <button
                        className="btn-mini primary"
                        type="button"
                        onClick={() => {
                          void markRead(item.id);
                          navigate(item.actionPath as string);
                        }}
                      >
                        {item.actionLabel || "Ouvrir"}
                      </button>
                    ) : null}
                    {item.readAt ? null : (
                      <button className="nf-read" type="button" onClick={() => void markRead(item.id)} aria-label="Marquer comme lue">
                        <span className="material-symbols-outlined" aria-hidden="true">
                          check
                        </span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
