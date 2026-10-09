import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { notificationIcon, notificationTime, useNotifications } from "./useNotifications";

const PREVIEW = 6;

export function NotificationBell() {
  const { items, loaded, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
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

  const latest = items.slice(0, PREVIEW);

  return (
    <div className="nb" ref={ref}>
      <button
        type="button"
        className={unreadCount ? "bell unread nb-trigger" : "bell nb-trigger"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unreadCount ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Notifications"}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          notifications
        </span>
        {unreadCount ? <span className="nb-count">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="nb-panel" role="dialog" aria-label="Notifications">
          <header className="nb-head">
            <strong>Notifications</strong>
            {unreadCount ? (
              <button type="button" onClick={() => void markAllRead()}>
                Tout marquer comme lu
              </button>
            ) : null}
          </header>

          {!loaded ? (
            <p className="nb-empty">Chargement…</p>
          ) : latest.length === 0 ? (
            <div className="nb-empty">
              <span className="material-symbols-outlined" aria-hidden="true">
                notifications_off
              </span>
              <p>Aucune notification pour le moment.</p>
            </div>
          ) : (
            <ul className="nb-list">
              {latest.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={item.readAt ? "nb-item" : "nb-item is-unread"}
                    onClick={() => {
                      void markRead(item.id);
                      setOpen(false);
                      navigate(item.actionPath || "/notifications");
                    }}
                  >
                    <span className="nb-icon material-symbols-outlined" aria-hidden="true">
                      {notificationIcon(item)}
                    </span>
                    <span className="nb-copy">
                      <strong>{item.title}</strong>
                      <span>{item.message}</span>
                      <small>{notificationTime(item.createdAt)}</small>
                    </span>
                    {item.readAt ? null : <span className="nb-dot" aria-label="Non lue" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link className="nb-all" to="/notifications" onClick={() => setOpen(false)}>
            Voir toutes les notifications
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
