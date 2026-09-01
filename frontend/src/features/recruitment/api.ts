import { api } from "@/shared/api/client";
import type { CountrySummary } from "@/features/auth/types";

export type PipelineStatus =
  | "NEW"
  | "CONTACTED"
  | "INTERVIEW_SCHEDULED"
  | "NEGOTIATION"
  | "CONTRACT_SENT"
  | "HIRED"
  | "REJECTED"
  | "ARCHIVED";

export type JobOfferSummary = {
  id: string;
  title: string;
  position: string | null;
  location: string | null;
};

export type RecruitmentCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  title: string | null;
  city: string | null;
  country: CountrySummary | null;
  photoUploadId: string | null;
  verified: boolean;
  email: string;
};

export type Recruitment = {
  id: string;
  candidate: RecruitmentCandidate;
  jobOffer: JobOfferSummary | null;
  directRecruitment: boolean;
  status: PipelineStatus;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt: string;
};

export type RecruitmentSummary = {
  id: string;
  status: PipelineStatus;
  jobOffer: JobOfferSummary | null;
  directRecruitment: boolean;
  createdAt: string;
  statusUpdatedAt: string;
};

export const PIPELINE_STATUSES: { value: PipelineStatus; label: string }[] = [
  { value: "NEW", label: "Nouveau" },
  { value: "CONTACTED", label: "Contacté" },
  { value: "INTERVIEW_SCHEDULED", label: "Entretien prévu" },
  { value: "NEGOTIATION", label: "En négociation" },
  { value: "CONTRACT_SENT", label: "Contrat envoyé" },
  { value: "HIRED", label: "Recruté" },
  { value: "REJECTED", label: "Refusé" },
  { value: "ARCHIVED", label: "Archivé" },
];

export const BOARD_COLUMNS: PipelineStatus[] = [
  "NEW",
  "CONTACTED",
  "INTERVIEW_SCHEDULED",
  "NEGOTIATION",
  "CONTRACT_SENT",
  "HIRED",
];

export function statusLabel(status: PipelineStatus) {
  return PIPELINE_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function recruitmentError(code: string) {
  switch (code) {
    case "CANDIDATE_NOT_FOUND":
      return "Candidat introuvable.";
    case "JOB_OFFER_NOT_FOUND":
      return "Offre d’emploi introuvable.";
    case "RECRUITMENT_ALREADY_EXISTS":
      return "Ce candidat est déjà dans votre pipeline pour cette opportunité.";
    case "FORBIDDEN":
      return "Vous n’êtes pas autorisé à effectuer cette action.";
    case "INVALID_PIPELINE_STATUS":
      return "Statut de recrutement invalide.";
    case "RECRUITMENT_NOT_FOUND":
      return "Recrutement introuvable.";
    case "JOB_OFFER_IN_USE":
      return "Cette offre est liée à un recrutement en cours.";
    default:
      return code;
  }
}

export function fetchRecruitments(params: {
  jobOfferId?: string;
  direct?: boolean;
  status?: PipelineStatus;
  q?: string;
} = {}) {
  const search = new URLSearchParams();
  if (params.jobOfferId) search.set("jobOfferId", params.jobOfferId);
  if (params.direct === true) search.set("direct", "true");
  if (params.direct === false) search.set("direct", "false");
  if (params.status) search.set("status", params.status);
  if (params.q?.trim()) search.set("q", params.q.trim());
  const query = search.toString();
  return api.get<Recruitment[]>(query ? `/v1/recruitments?${query}` : "/v1/recruitments");
}

export function fetchRecruitment(id: string) {
  return api.get<Recruitment>(`/v1/recruitments/${id}`);
}

export function startRecruitment(body: { candidateId: string; jobOfferId?: string; internalNote?: string }) {
  return api.post<Recruitment>("/v1/recruitments", body);
}

export function updateRecruitmentStatus(id: string, status: PipelineStatus) {
  return api.patch<Recruitment>(`/v1/recruitments/${id}/status`, { status });
}

export function updateRecruitmentNote(id: string, internalNote: string) {
  return api.patch<Recruitment>(`/v1/recruitments/${id}/note`, { internalNote });
}

export function archiveRecruitment(id: string) {
  return api.patch<Recruitment>(`/v1/recruitments/${id}/archive`);
}

export function formatPipelineDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function opportunityLabel(item: { jobOffer: JobOfferSummary | null; directRecruitment: boolean }) {
  if (item.directRecruitment || !item.jobOffer) {
    return "Recrutement direct";
  }
  return item.jobOffer.title;
}

export type FavoriteCard = {
  id: string;
  displayName: string;
  title: string | null;
  city: string | null;
  country: CountrySummary | null;
  specialties: string[];
  experiences: { title: string | null; company: string | null; start: string | null; end: string | null; description: string | null }[];
  availabilityLabel: string | null;
  photoUploadId: string | null;
  verified: boolean;
  favorite: boolean;
  inPipeline: boolean;
  pipelineStatus: PipelineStatus | null;
  recruitmentId: string | null;
  email: string;
};

export function fetchFavorites() {
  return api.get<FavoriteCard[]>("/v1/favorites");
}
