import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppNotification } from "../api";
import { notificationIcon, notificationTime, useNotifications } from "../useNotifications";

type Filter = "all" | "unread";

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
  const { items, loaded, error, unreadCount, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const navigate = useNavigate();

  const visible = useMemo(() => (filter === "unread" ? items.filter((item) => !item.readAt) : items), [items, filter]);
  const groups = useMemo(() => groupByDay(visible), [visible]);

  return (
    <section className="nf">
      <div className="page-head">
        <div>
          <h1>Notifications</h1>
          <p className="sub">
            {unreadCount
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}.`
              : "Vous êtes à jour."}
          </p>
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
        <p className="nf-empty-text">Chargement…</p>
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
