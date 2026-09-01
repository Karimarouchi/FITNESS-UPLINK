import { api } from "@/shared/api/client";
import type { AuthUser } from "@/features/auth/types";

export function fetchUsers() {
  return api.get<AuthUser[]>("/v1/users");
}
