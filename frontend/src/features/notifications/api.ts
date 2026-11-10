import { api } from "@/shared/api/client";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  actionLabel: string | null;
  actionPath: string | null;
  readAt: string | null;
  createdAt: string;
};

/** Notifications saved before the link carried a tab: a coaching dispute opens the "Litiges" tab. */
function withDeepLink(list: AppNotification[]): AppNotification[] {
  return list.map((item) =>
    item.actionPath === "/admin/coaching" && item.title === "Litige coaching"
      ? { ...item, actionPath: "/admin/coaching?tab=reports" }
      : item,
  );
}

export function fetchNotifications() {
  return api.get<AppNotification[]>("/v1/notifications").then(withDeepLink);
}

export function markNotificationRead(id: string) {
  return api.patch<AppNotification[]>(`/v1/notifications/${id}/read`).then(withDeepLink);
}

export function markAllNotificationsRead() {
  return api.patch<AppNotification[]>("/v1/notifications/read-all").then(withDeepLink);
}
