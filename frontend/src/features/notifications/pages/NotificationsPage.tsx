import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchNotifications, markNotificationRead, type AppNotification } from "../api";
import { formatPipelineDate } from "@/features/recruitment/api";

export function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications()
      .then(setItems)
      .catch(() => setError("Impossible de charger les notifications."));
  }, []);

  return (
    <section className="talent-page talent-page--wide">
      <p className="font-label-caps uppercase text-on-surface-variant">Compte</p>
      <h1 className="font-display-lg-mobile text-primary mb-4">Notifications</h1>
      {error ? <p className="auth-error">{error}</p> : null}
      {items.length === 0 && !error ? (
        <p className="font-body-md text-on-surface-variant">Aucune notification.</p>
      ) : (
        <ul className="verify-list">
          {items.map((item) => (
            <li key={item.id} className="verify-row">
              <div className="verify-copy">
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <p className="text-on-surface-variant">{formatPipelineDate(item.createdAt)}</p>
              </div>
              <div className="verify-actions">
                {item.actionPath ? (
                  <Link className="ob-secondary" to={item.actionPath} onClick={() => void markNotificationRead(item.id)}>
                    {item.actionLabel || "Ouvrir"}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
