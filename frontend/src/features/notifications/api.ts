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

export function fetchNotifications() {
  return api.get<AppNotification[]>("/v1/notifications");
}

export function markNotificationRead(id: string) {
  return api.patch<AppNotification[]>(`/v1/notifications/${id}/read`);
}
