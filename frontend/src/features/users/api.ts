import { api } from "@/shared/api/client";
import type { AuthUser } from "@/features/auth/types";

export type BulkUserAction = "BLOCK" | "UNBLOCK" | "DELETE";

export type BulkUserActionResult = {
  processed: number;
  skipped: number;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  label: string;
  entityType: string | null;
  entityId: string | null;
  actorLabel: string | null;
  metadata: string | null;
  createdAt: string;
};

export type AuditLogPage = {
  items: AuditLogEntry[];
  total: number;
  page: number;
  size: number;
};

export function fetchUsers() {
  return api.get<AuthUser[]>("/v1/users");
}

export function fetchUserActivity(id: string, page = 0, size = 20) {
  return api.get<AuditLogPage>(`/v1/users/${id}/activity?page=${page}&size=${size}`);
}

export function setUserEnabled(id: string, enabled: boolean) {
  return api.patch<AuthUser>(`/v1/users/${id}/enabled`, { enabled });
}

export function deleteUser(id: string) {
  return api.delete<void>(`/v1/users/${id}`);
}

export function bulkUserAction(ids: string[], action: BulkUserAction) {
  return api.post<BulkUserActionResult>("/v1/users/bulk", { ids, action });
}
