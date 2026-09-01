import { api, setAccessToken } from "@/shared/api/client";
import type { AuthResponse, AuthUser } from "./types";

export function login(email: string, password: string, rememberMe: boolean) {
  return api.post<AuthResponse>("/v1/auth/login", { email, password, rememberMe }, { skipRefresh: true });
}

export function signup(payload: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}) {
  return api.post<AuthResponse>("/v1/auth/signup", payload, { skipRefresh: true });
}

export function logout() {
  return api.post<void>("/v1/auth/logout", undefined, { skipRefresh: true }).finally(() => {
    setAccessToken(null);
  });
}

export function fetchMe() {
  return api.get<AuthUser>("/v1/auth/me");
}
