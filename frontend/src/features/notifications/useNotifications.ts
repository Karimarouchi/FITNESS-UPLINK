import { useCallback, useEffect, useSyncExternalStore } from "react";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "./api";

/**
 * One shared notification store for the whole app: the navbar bell and the
 * notifications page read the same list, so marking something as read in one
 * place updates the other immediately. Polls while at least one consumer is mounted.
 */
type State = { items: AppNotification[]; loaded: boolean; error: boolean };

const POLL_MS = 30_000;
let state: State = { items: [], loaded: false, error: false };
const listeners = new Set<() => void>();
let consumers = 0;
let timer: number | null = null;
let inflight: Promise<void> | null = null;

function emit(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

function refresh() {
  if (inflight) return inflight;
  inflight = fetchNotifications()
    .then((items) => emit({ items, loaded: true, error: false }))
    .catch(() => emit({ ...state, loaded: true, error: true }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function onVisible() {
  if (document.visibilityState === "visible") void refresh();
}

function start() {
  consumers += 1;
  if (consumers > 1) return;
  void refresh();
  timer = window.setInterval(() => void refresh(), POLL_MS);
  document.addEventListener("visibilitychange", onVisible);
}

function stop() {
  consumers -= 1;
  if (consumers > 0) return;
  if (timer != null) window.clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", onVisible);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNotifications() {
  const snapshot = useSyncExternalStore(subscribe, () => state);

  useEffect(() => {
    start();
    return stop;
  }, []);

  const markRead = useCallback(async (id: string) => {
    const target = state.items.find((item) => item.id === id);
    if (!target || target.readAt) return;
    // Optimistic: clear the dot right away, then sync with the server.
    emit({
      ...state,
      items: state.items.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
    });
    try {
      emit({ ...state, items: await markNotificationRead(id) });
    } catch {
      void refresh();
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    emit({ ...state, items: state.items.map((item) => (item.readAt ? item : { ...item, readAt: now })) });
    try {
      emit({ ...state, items: await markAllNotificationsRead() });
    } catch {
      void refresh();
    }
  }, []);

  return {
    items: snapshot.items,
    loaded: snapshot.loaded,
    error: snapshot.error,
    unreadCount: snapshot.items.filter((item) => !item.readAt).length,
    markRead,
    markAllRead,
    refresh,
  };
}

/** Material icon matching a notification, from its title. */
export function notificationIcon(item: AppNotification) {
  const title = item.title.toLowerCase();
  if (title.includes("paiement") || title.includes("payé")) return "payments";
  if (title.includes("message") || title.includes("contact") || title.includes("réponse")) return "chat";
  if (title.includes("annul")) return "event_busy";
  if (title.includes("place") || title.includes("attente")) return "event_seat";
  if (title.includes("inscription") || title.includes("formation")) return "school";
  if (title.includes("séance") || title.includes("réservation") || title.includes("booking")) return "event_available";
  if (title.includes("contrat")) return "contract";
  if (title.includes("candidat") || title.includes("offre") || title.includes("entretien")) return "work";
  if (title.includes("vérif") || title.includes("profil")) return "verified_user";
  return "notifications";
}

/** "à l’instant", "il y a 5 min", "hier", "12 oct." */
export function notificationTime(value: string) {
  const date = new Date(value);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "à l’instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 172800) return "hier";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
