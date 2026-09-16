import { api } from "@/shared/api/client";

export type UserNotifyPrefs = {
  inAppContact: boolean;
  emailContact: boolean;
  inAppMessage: boolean;
  emailMessage: boolean;
  inAppApplication: boolean;
  emailApplication: boolean;
  inAppDocument: boolean;
  emailDocument: boolean;
  inAppContract: boolean;
  emailContract: boolean;
};

export function fetchNotifyPrefs() {
  return api.get<UserNotifyPrefs>("/v1/me/notify-prefs");
}

export function saveNotifyPrefs(body: UserNotifyPrefs) {
  return api.put<UserNotifyPrefs>("/v1/me/notify-prefs", body);
}
