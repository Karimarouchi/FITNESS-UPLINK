export class ApiError extends Error {
  readonly status: number;
  readonly details: string[];

  constructor(status: number, message: string, details: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = RequestInit & { skipRefresh?: boolean; json?: boolean; responseType?: "json" | "blob" };

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { message?: string; details?: string[] };
    return new ApiError(response.status, body.message ?? `HTTP ${response.status}`, body.details ?? []);
  } catch {
    return new ApiError(response.status, `HTTP ${response.status}`);
  }
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch(`${API_BASE}/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setAccessToken(null);
        return false;
      }
      const body = (await response.json()) as { accessToken: string };
      setAccessToken(body.accessToken);
      return true;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.json !== false && !headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && !init.skipRefresh && !path.startsWith("/v1/auth/")) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, { ...init, skipRefresh: true });
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  if (init.responseType === "blob") {
    return (await response.blob()) as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
      ...init,
    }),
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, {
      method: "POST",
      body,
      json: false,
    }),
  getBlob: (path: string) => request<Blob>(path, { responseType: "blob" }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  refreshSession: tryRefresh,
};
