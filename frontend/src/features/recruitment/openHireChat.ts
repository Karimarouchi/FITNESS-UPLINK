import type { RecruitmentConversation } from "./api";

export function openHireChat(conversation: Pick<RecruitmentConversation, "id" | "peerName" | "title">) {
  window.dispatchEvent(new CustomEvent("fu-open-hire-chat", { detail: conversation }));
}
