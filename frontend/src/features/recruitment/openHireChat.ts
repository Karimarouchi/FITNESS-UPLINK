import type { RecruitmentConversation } from "./api";

export function openHireChat(conversation: Pick<RecruitmentConversation, "id" | "peerName" | "title">) {
  window.dispatchEvent(new CustomEvent("fu-open-hire-chat", { detail: conversation }));
}

export type OpenCoachChatDetail = { coachId: string; coachDisplayName: string; handled?: boolean };

/**
 * Opens the global chat widget on the member ↔ coach thread.
 * Returns false when no widget is mounted (e.g. back-office shell) so the caller can fall back.
 */
export function openCoachChat(coachId: string, coachDisplayName: string) {
  const detail: OpenCoachChatDetail = { coachId, coachDisplayName };
  window.dispatchEvent(new CustomEvent("fu-open-coach-chat", { detail }));
  return Boolean(detail.handled);
}
