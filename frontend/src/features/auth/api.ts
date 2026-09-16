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
  recaptchaToken?: string;
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

export function verifyEmail(code: string) {
  return api.post<AuthUser>("/v1/auth/verify-email", { code });
}

export function resendVerification() {
  return api.post<void>("/v1/auth/resend-verification");
}

export function changeEmail(email: string) {
  return api.post<AuthUser>("/v1/auth/change-email", { email });
}

export function forgotPassword(email: string) {
  return api.post<void>("/v1/auth/forgot-password", { email }, { skipRefresh: true });
}

export function verifyResetCode(email: string, code: string) {
  return api.post<void>("/v1/auth/verify-reset-code", { email, code }, { skipRefresh: true });
}

export function resetPassword(payload: {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}) {
  return api.post<void>("/v1/auth/reset-password", payload, { skipRefresh: true });
}
