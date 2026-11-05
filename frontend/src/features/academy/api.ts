import { api, ApiError } from "@/shared/api/client";

export type ContentType = "FORMATION" | "CERTIFICATION" | "WORKSHOP" | "WEBINAR" | "MASTERCLASS";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  FORMATION: "Formation",
  CERTIFICATION: "Certification",
  WORKSHOP: "Workshop",
  WEBINAR: "Webinar",
  MASTERCLASS: "Masterclass",
};

export type OrganizerSummary = {
  id: string;
  name: string;
  logoUploadId: string | null;
  city: string | null;
};

export type FormationCard = {
  id: string;
  contentType: ContentType;
  title: string;
  trainerName: string | null;
  language: string | null;
  location: string | null;
  online: boolean;
  priceAmount: string;
  priceCurrency: string;
  hasCertification: boolean;
  imageUploadId: string | null;
  organizer: OrganizerSummary | null;
  nextSessionAt: string | null;
  nextSessionSeatsLeft: number | null;
  acceptsOnline: boolean;
  acceptsOnSite: boolean;
};

export type FormationPage = {
  items: FormationCard[];
  total: number;
  page: number;
  size: number;
};

export type FormationSession = {
  id: string;
  formationId: string;
  scheduledAt: string;
  durationMinutes: number;
  capacity: number;
  confirmedCount: number;
  seatsLeft: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
};

export type FormationDetail = {
  formation: FormationCard;
  description: string | null;
  sessions: FormationSession[];
};

export type Formation = {
  id: string;
  contentType: ContentType;
  title: string;
  trainerName: string | null;
  description: string | null;
  language: string | null;
  location: string | null;
  online: boolean;
  priceAmount: string;
  priceCurrency: string;
  hasCertification: boolean;
  imageUploadId: string | null;
  active: boolean;
  createdAt: string;
  acceptsOnline: boolean;
  acceptsOnSite: boolean;
};

export type UpsertFormationRequest = {
  contentType: ContentType;
  title: string;
  trainerName?: string;
  description?: string;
  language?: string;
  location?: string;
  online: boolean;
  priceAmount: string;
  priceCurrency: string;
  hasCertification: boolean;
  imageUploadId?: string | null;
  acceptsOnline: boolean;
  acceptsOnSite: boolean;
};

export type Registration = {
  id: string;
  sessionId: string;
  formationId: string | null;
  formationTitle: string;
  scheduledAt: string | null;
  status: "PENDING_PAYMENT" | "PENDING_ON_SITE" | "CONFIRMED" | "WAITLISTED" | "CANCELLED" | "NO_SHOW";
  waitlistPosition: number | null;
  priceAmount: string;
  priceCurrency: string;
  createdAt: string;
  paymentMethod: PaymentMethod | null;
  paid: boolean;
  /** Secret shown as a QR code; only present while the seat is held (confirmed / pay on site). */
  ticketToken: string | null;
  /** End of the 5-minute online payment window. */
  holdExpiresAt: string | null;
  checkedInAt: string | null;
  canCancel: boolean;
  /** Last moment a member can cancel (48 h before the session). */
  cancelDeadline: string | null;
  invoiceNumber: string | null;
};

export type PaymentMethod = "ONLINE" | "ON_SITE";

export type Receipt = {
  invoiceNumber: string;
  formationTitle: string;
  scheduledAt: string;
  memberName: string;
  amount: string;
  currency: string;
  provider: string;
  paidAt: string;
};

export type Checkin = {
  registrationId: string;
  memberName: string;
  formationTitle: string;
  scheduledAt: string;
  status: string;
  paymentMethod: PaymentMethod | null;
  paid: boolean;
  amountDue: string;
  currency: string;
  checkedInAt: string | null;
  canConfirm: boolean;
  blockReason: string | null;
};

export type Participant = {
  registrationId: string;
  memberId: string;
  memberDisplayName: string;
  status: string;
  waitlistPosition: number | null;
  createdAt: string;
  paymentMethod: PaymentMethod | null;
  paid: boolean;
  amountDue: string;
  currency: string;
  checkedInAt: string | null;
};

export function formationImageUrl(formationId: string, uploadId: string) {
  const base = import.meta.env.VITE_API_BASE_URL ?? "/api";
  return `${base}/v1/academy/formations/${formationId}/files/${uploadId}`;
}

export function fetchFormations(params: { q?: string; contentType?: string; page?: number; size?: number } = {}) {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.contentType) query.set("contentType", params.contentType);
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 12));
  return api.get<FormationPage>(`/v1/academy/formations?${query.toString()}`);
}

export function fetchFormationDetail(id: string) {
  return api.get<FormationDetail>(`/v1/academy/formations/${id}`);
}

export function fetchMyFormations() {
  return api.get<Formation[]>("/v1/academy/mine");
}

export function createFormation(request: UpsertFormationRequest) {
  return api.post<Formation>("/v1/academy/mine", request);
}

export function updateFormation(id: string, request: UpsertFormationRequest) {
  return api.put<Formation>(`/v1/academy/mine/${id}`, request);
}

export function deleteFormation(id: string) {
  return api.delete<void>(`/v1/academy/mine/${id}`);
}

export function uploadFormationImage(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api.postForm<{ uploadId: string }>("/v1/academy/mine/image", form);
}

export function fetchMySessions(formationId: string) {
  return api.get<FormationSession[]>(`/v1/academy/mine/${formationId}/sessions`);
}

export function createSession(formationId: string, request: { scheduledAt: string; durationMinutes: number; capacity: number }) {
  return api.post<FormationSession>(`/v1/academy/mine/${formationId}/sessions`, request);
}

export function deleteSession(formationId: string, sessionId: string) {
  return api.delete<void>(`/v1/academy/mine/${formationId}/sessions/${sessionId}`);
}

export function fetchParticipants(formationId: string, sessionId: string) {
  return api.get<Participant[]>(`/v1/academy/mine/${formationId}/sessions/${sessionId}/participants`);
}

export function registerForSession(sessionId: string, method: PaymentMethod = "ONLINE") {
  return api.post<Registration>(`/v1/academy/registrations?sessionId=${sessionId}&method=${method}`, {});
}

export function fetchMyDebts() {
  return api.get<Registration[]>("/v1/academy/registrations/debts");
}

export function fetchReceipt(id: string) {
  return api.get<Receipt>(`/v1/academy/registrations/${id}/receipt`);
}

export function lookupTicket(token: string) {
  return api.get<Checkin>(`/v1/academy/registrations/checkin/${encodeURIComponent(token)}`);
}

export function confirmTicket(token: string) {
  return api.post<Checkin>(`/v1/academy/registrations/checkin/${encodeURIComponent(token)}/confirm`, {});
}

export function fetchMyRegistrations() {
  return api.get<Registration[]>("/v1/academy/registrations/mine");
}

export function fetchRegistration(id: string) {
  return api.get<Registration>(`/v1/academy/registrations/${id}`);
}

export function payRegistration(id: string, cardNumber: string) {
  return api.post<Registration>(`/v1/academy/registrations/${id}/pay`, { cardNumber });
}

export function cancelRegistration(id: string) {
  return api.post<Registration>(`/v1/academy/registrations/${id}/cancel`, {});
}

const ACADEMY_ERRORS: Record<string, string> = {
  SESSION_NOT_OPEN: "Cette session n’est plus ouverte aux inscriptions.",
  SESSION_FULL: "Cette session vient d’être complète : toutes les places ont été payées.",
  SESSION_NOT_FOUND: "Cette session n’existe plus.",
  FORMATION_NOT_FOUND: "Cette formation n’est plus disponible.",
  ALREADY_REGISTERED: "Vous êtes déjà inscrit(e) à cette session.",
  REGISTRATION_NOT_AWAITING_PAYMENT: "Cette inscription n’attend plus de paiement.",
  PAYMENT_FAILED: "Carte refusée. Pour le test, utilisez 4242 4242 4242 4242.",
  HOLD_EXPIRED: "Le délai de 5 minutes est dépassé : la place a été libérée. Réservez à nouveau.",
  ACCOUNT_BLOCKED_UNPAID: "Votre compte est bloqué : réglez d’abord la somme due pour une formation manquée.",
  PAYMENT_METHOD_NOT_ACCEPTED: "Ce mode de paiement n’est pas proposé pour cette formation.",
  PAYMENT_METHOD_REQUIRED: "Choisissez au moins un mode de paiement (en ligne ou sur place).",
  CANCEL_TOO_LATE: "L’annulation n’est plus possible : elle doit se faire au moins 48 h avant la formation.",
  REGISTRATION_NO_SHOW: "Cette inscription est marquée absente : il reste à régler la somme due.",
  REGISTRATION_ALREADY_CANCELLED: "Cette inscription est déjà annulée.",
  TICKET_NOT_FOUND: "Billet introuvable. Vérifiez le code.",
  ALREADY_CHECKED_IN: "Ce billet a déjà été validé.",
  SESSION_CANCELLED: "Cette session est annulée.",
  PAYMENT_NOT_DONE: "Paiement en ligne non terminé : la place n’est pas confirmée.",
  ON_WAITLIST: "Cette personne est encore sur liste d’attente.",
  REGISTRATION_CANCELLED: "Cette inscription a été annulée.",
  RECEIPT_NOT_AVAILABLE: "Aucun reçu disponible pour cette inscription.",
  FORBIDDEN: "Ce billet n’appartient pas à l’une de vos formations.",
};

/** Turns backend error codes (e.g. SESSION_NOT_OPEN) into French messages. */
export function academyErrorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    return ACADEMY_ERRORS[err.message] ?? err.message ?? fallback;
  }
  return fallback;
}
