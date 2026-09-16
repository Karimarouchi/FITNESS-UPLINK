import { api } from "@/shared/api/client";

export type AdminPermission = {
  id: string;
  code: string;
  module: string;
  moduleLabel: string;
  label: string;
  description: string | null;
  sortOrder: number;
};

export type AdminRoleAccess = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  category: string;
  categoryLabel: string;
  selectable: boolean;
  locked: boolean;
  permissionCodes: string[];
};

export function fetchAdminRoles() {
  return api.get<AdminRoleAccess[]>("/v1/admin/roles");
}

export function fetchAdminPermissions() {
  return api.get<AdminPermission[]>("/v1/admin/roles/permissions");
}

export function saveRolePermissions(roleId: string, permissionCodes: string[]) {
  return api.put<AdminRoleAccess>(`/v1/admin/roles/${roleId}/permissions`, { permissionCodes });
}
