import { api } from "@/shared/api/client";

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
};

export type Registration = {
  id: string;
  sessionId: string;
  formationId: string | null;
  formationTitle: string;
  scheduledAt: string | null;
  status: "PENDING_PAYMENT" | "CONFIRMED" | "WAITLISTED" | "CANCELLED";
  waitlistPosition: number | null;
  priceAmount: string;
  priceCurrency: string;
  createdAt: string;
};

export type Participant = {
  registrationId: string;
  memberId: string;
  memberDisplayName: string;
  status: string;
  waitlistPosition: number | null;
  createdAt: string;
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

export function registerForSession(sessionId: string) {
  return api.post<Registration>(`/v1/academy/registrations?sessionId=${sessionId}`, {});
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
