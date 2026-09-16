import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setAccessToken } from "@/shared/api/client";
import { fetchMe, login as loginRequest, logout as logoutRequest, signup as signupRequest } from "./api";
import type { AuthResponse, AuthUser } from "./types";

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<AuthUser>;
  signup: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptedTerms: boolean;
    recaptchaToken?: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function applySession(response: AuthResponse) {
  setAccessToken(response.accessToken);
  return response.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const refreshed = await api.refreshSession();
        if (refreshed && !cancelled) {
          setUser(await fetchMe());
        }
      } catch {
        setAccessToken(null);
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      login: async (email, password, rememberMe) => {
        const next = applySession(await loginRequest(email, password, rememberMe));
        setUser(next);
        return next;
      },
      signup: async (payload) => {
        const next = applySession(await signupRequest(payload));
        setUser(next);
        return next;
      },
      logout: async () => {
        await logoutRequest();
        setUser(null);
      },
      updateUser: (next) => setUser(next),
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
