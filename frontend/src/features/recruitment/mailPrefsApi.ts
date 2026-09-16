import { api } from "@/shared/api/client";

export type UserMailPrefs = {
  sendMode: "PLATFORM" | "OWN" | string;
  contactSubject: string;
  contactBody: string;
  messageSubject: string;
  messageBody: string;
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number | null;
  smtpUsername: string;
  passwordConfigured: boolean;
};

export function fetchMailPrefs() {
  return api.get<UserMailPrefs>("/v1/me/mail-prefs");
}

export function saveMailPrefs(payload: Partial<UserMailPrefs> & { smtpPassword?: string }) {
  return api.put<UserMailPrefs>("/v1/me/mail-prefs", payload);
}

export type MailTemplate = {
  purpose: string;
  subject: string;
  body: string;
};

export function fetchMailTemplates() {
  return api.get<MailTemplate[]>("/v1/admin/mail/templates");
}

export function saveMailTemplate(payload: MailTemplate) {
  return api.put<MailTemplate>("/v1/admin/mail/templates", payload);
}
