import { api } from "@/shared/api/client";

export type MailSettings = {
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number | null;
  smtpUsername: string;
  passwordConfigured: boolean;
  usingEnvSmtp: boolean;
};

export type MailEvent = {
  id: string;
  createdAt: string;
  purpose: "VERIFY_EMAIL" | "RESET_PASSWORD" | "WELCOME" | "TEST";
  status: "SENT" | "FAILED";
  recipientMasked: string;
  errorCode: string | null;
  errorMessage: string | null;
  durationMs: number | null;
};

export type MailEventPage = {
  items: MailEvent[];
  total: number;
  page: number;
  size: number;
};

export function fetchMailSettings() {
  return api.get<MailSettings>("/v1/admin/mail/settings");
}

export function saveMailSettings(payload: {
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number | null;
  smtpUsername: string;
  smtpPassword?: string;
}) {
  return api.put<MailSettings>("/v1/admin/mail/settings", payload);
}

export function fetchMailEvents(status = "", page = 0) {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  params.set("page", String(page));
  params.set("size", "20");
  return api.get<MailEventPage>(`/v1/admin/mail/events?${params.toString()}`);
}

export function sendMailTest() {
  return api.post<void>("/v1/admin/mail/test", {});
}
