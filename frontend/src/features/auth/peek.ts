import type { AuthUser } from "./types";

export function peekPath(user: AuthUser | null, target: string) {
  return user ? target : `/login?redirect=${encodeURIComponent(target)}`;
}
