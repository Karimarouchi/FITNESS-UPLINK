import { api } from "@/shared/api/client";
import type { CountrySummary } from "@/features/auth/types";

export type PipelineStatus =
  | "APPLIED"
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
  employer: {
    id: string;
    displayName: string;
    country: CountrySummary | null;
  } | null;
  jobOffer: JobOfferSummary | null;
  directRecruitment: boolean;
  status: PipelineStatus;
  internalNote: string | null;
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt: string;
  contract: ContractSummary | null;
  coverLetterText: string | null;
  coverLetterFile: { id: string; name: string; contentType: string; size: number } | null;
  cvFile: { id: string; name: string; contentType: string; size: number } | null;
  interviewAt: string | null;
  interviewMode: "MEET" | "ONSITE" | string | null;
  interviewPlace: string | null;
};

export type ContractSummary = {
  id: string;
  status: ContractStatus;
  candidateSigned: boolean;
  employerSigned: boolean;
  completed: boolean;
  sentAt: string | null;
};

export type ContractStatus =
  | "DRAFT"
  | "SENT"
  | "CANDIDATE_SIGNED"
  | "EMPLOYER_SIGNED"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELLED"
  | "EXPIRED";

export type RecruitmentSummary = {
  id: string;
  status: PipelineStatus;
  jobOffer: JobOfferSummary | null;
  directRecruitment: boolean;
  createdAt: string;
  statusUpdatedAt: string;
};

export const PIPELINE_STATUSES: { value: PipelineStatus; label: string }[] = [
  { value: "APPLIED", label: "Candidature reçue" },
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

export function statusLabel(status: PipelineStatus, audience: "employer" | "candidate" = "employer") {
  if (audience === "candidate") {
    if (status === "APPLIED") {
      return "Envoyée";
    }
    if (status === "REJECTED") {
      return "Refusée";
    }
    if (status === "HIRED") {
      return "Recruté";
    }
    if (status === "ARCHIVED") {
      return "Archivée";
    }
    return "En cours";
  }
  return PIPELINE_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function pipelineTone(status: PipelineStatus): "new" | "interview" | "sent" | "refused" | "verified" | "pending" {
  switch (status) {
    case "APPLIED":
      return "pending";
    case "NEW":
    case "CONTACTED":
      return "new";
    case "INTERVIEW_SCHEDULED":
    case "NEGOTIATION":
      return "interview";
    case "CONTRACT_SENT":
      return "sent";
    case "HIRED":
      return "verified";
    case "REJECTED":
      return "refused";
    default:
      return "pending";
  }
}

export function recruitmentError(code: string) {
  switch (code) {
    case "CANDIDATE_NOT_FOUND":
      return "Candidat introuvable.";
    case "JOB_OFFER_NOT_FOUND":
      return "Offre d’emploi introuvable.";
    case "RECRUITMENT_ALREADY_EXISTS":
      return "Une candidature existe déjà pour cette offre.";
    case "COVER_LETTER_TOO_LONG":
      return "La lettre de motivation est trop longue.";
    case "INVALID_COVER_LETTER":
      return "Le fichier de lettre de motivation n’est pas valide.";
    case "MESSAGING_NOT_OPEN":
      return "La conversation s’ouvre une fois le candidat recruté.";
    case "EMPTY_MESSAGE":
      return "Écrivez un message avant d’envoyer.";
    case "MESSAGE_TOO_LONG":
      return "Le message est trop long.";
    case "FORBIDDEN":
      return "Vous n’êtes pas autorisé à effectuer cette action.";
    case "INVALID_PIPELINE_STATUS":
      return "Statut de recrutement invalide.";
    case "RECRUITMENT_NOT_FOUND":
      return "Recrutement introuvable.";
    case "JOB_OFFER_IN_USE":
      return "Cette offre est liée à un recrutement en cours.";
    case "CONTRACT_REQUIRED":
      return "Un contrat doit être envoyé avant de passer au statut Contrat envoyé.";
    case "CONTRACT_NOT_COMPLETED":
      return "Le contrat doit être finalisé avant de marquer ce candidat comme recruté.";
    case "INVALID_RECRUITMENT_TRANSITION":
      return "Cette transition de statut n’est pas autorisée.";
    case "CONTRACT_NOT_FOUND":
      return "Contrat introuvable.";
    case "CANDIDATE_MUST_UPLOAD":
      return "Téléchargez le contrat, signez-le, puis téléversez le PDF signé.";
    case "CONTRACT_ALREADY_SIGNED":
      return "Vous avez déjà renvoyé ce contrat signé.";
    case "CONTRACT_ALREADY_SENT":
      return "Un contrat est déjà en cours pour ce recrutement.";
    case "SIGNATURE_PROVIDER_ERROR":
      return "Le contrat n’a pas pu être envoyé.";
    case "INVALID_CONTRACT_STATUS":
      return "Cette action n’est pas possible sur le contrat dans son état actuel.";
    case "FILE_TOO_LARGE":
      return "Ce fichier est trop volumineux (10 Mo maximum).";
    case "INVALID_FILE_TYPE":
      return "PDF, JPG ou PNG uniquement (8 Mo max).";
    case "INTERVIEW_DETAILS_REQUIRED":
      return "Indiquez la date, l’heure et le lieu ou le lien de l’entretien.";
    case "INTERVIEW_MEET_LINK_REQUIRED":
      return "Collez le lien de la visioconférence (https://…).";
    case "INVALID_ATTACHMENT":
      return "La pièce jointe n’est pas valide.";
    case "REPORT_REASON_REQUIRED":
      return "Écrivez le motif du signalement.";
    case "Trop de messages. Réessayez plus tard.":
      return "Trop de messages. Réessayez plus tard.";
    case "Trop de contacts aujourd’hui. Réessayez demain.":
      return "Trop de contacts aujourd’hui. Réessayez demain.";
    case "Trop de signalements aujourd’hui.":
      return "Trop de signalements aujourd’hui.";
    case "Too many attempts. Try again later.":
      return "Trop de tentatives. Réessayez plus tard.";
    case "ENTITLEMENT_REQUIRED":
      return "Cette fonction n’est pas incluse dans votre offre.";
    case "ENTITLEMENT_LIMIT":
      return "Limite de votre offre atteinte. Passez à une offre supérieure.";
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

export function fetchInboxCount() {
  return api.get<{ count: number }>("/v1/recruitments/inbox-count");
}

export function acceptApplication(id: string) {
  return updateRecruitmentStatus(id, "CONTACTED");
}

export function rejectApplication(id: string) {
  return updateRecruitmentStatus(id, "REJECTED");
}

export type RecruitmentFile = { id: string; name: string; contentType: string; size: number };

export type RecruitmentMessage = {
  id: string;
  senderId: string;
  senderName: string;
  mine: boolean;
  body: string;
  createdAt: string;
  file: RecruitmentFile | null;
};

export function fetchMessages(id: string) {
  return api.get<RecruitmentMessage[]>(`/v1/recruitments/${id}/messages`);
}

export function sendMessage(id: string, body: string, uploadId?: string) {
  return api.post<RecruitmentMessage>(`/v1/recruitments/${id}/messages`, { body, uploadId });
}

export function uploadMessageFile(id: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return api.postForm<RecruitmentFile>(`/v1/recruitments/${id}/messages/file`, body);
}

export function reportRecruitment(id: string, reason: string) {
  return api.post<{ status: string }>(`/v1/recruitments/${id}/report`, { reason });
}

export type RecruitmentConversation = {
  id: string;
  peerName: string;
  title: string;
  lastBody: string | null;
  lastAt: string;
  lastMine: boolean;
  status: PipelineStatus;
};

export function fetchConversations() {
  return api.get<RecruitmentConversation[]>("/v1/recruitments/conversations");
}

export function fetchCoverLetterBlob(id: string) {
  return api.getBlob(`/v1/recruitments/${id}/cover-letter`);
}

export function fetchMessageFileBlob(recruitmentId: string, messageId: string) {
  return api.getBlob(`/v1/recruitments/${recruitmentId}/messages/${messageId}/file`);
}

export function startRecruitment(body: { candidateId: string; jobOfferId?: string; internalNote?: string }) {
  return api.post<Recruitment>("/v1/recruitments", body);
}

export function updateRecruitmentStatus(
  id: string,
  status: PipelineStatus,
  interview?: { interviewAt: string; interviewMode: "MEET" | "ONSITE"; interviewPlace: string },
) {
  return api.patch<Recruitment>(`/v1/recruitments/${id}/status`, { status, ...interview });
}

export function updateRecruitmentNote(id: string, internalNote: string) {
  return api.patch<Recruitment>(`/v1/recruitments/${id}/note`, { internalNote });
}

export function archiveRecruitment(id: string) {
  return api.patch<Recruitment>(`/v1/recruitments/${id}/archive`);
}

export function blockRecruitment(id: string) {
  return api.post<Recruitment>(`/v1/recruitments/${id}/block`);
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

export type NegotiationOffer = {
  id: string;
  proposerName: string;
  proposerRole: "EMPLOYER" | "CANDIDATE";
  mine: boolean;
  salaryAmount: number;
  salaryCurrency: string;
  contractType: string;
  startDate: string | null;
  location: string | null;
  note: string | null;
  status: "PROPOSED" | "ACCEPTED" | "DECLINED" | "SUPERSEDED";
  createdAt: string;
  respondedAt: string | null;
};

export type NegotiationDraft = {
  salaryAmount: number;
  salaryCurrency: string;
  contractType: string;
  startDate: string | null;
  location: string | null;
  note: string | null;
};

export function fetchNegotiation(recruitmentId: string) {
  return api.get<NegotiationOffer[]>(`/v1/recruitments/${recruitmentId}/negotiation`);
}

export function proposeNegotiation(recruitmentId: string, body: NegotiationDraft) {
  return api.post<NegotiationOffer>(`/v1/recruitments/${recruitmentId}/negotiation`, body);
}

export function respondNegotiation(recruitmentId: string, offerId: string, accept: boolean) {
  return api.post<NegotiationOffer>(
    `/v1/recruitments/${recruitmentId}/negotiation/${offerId}/${accept ? "accept" : "decline"}`,
  );
}

export function negotiationError(code: string) {
  switch (code) {
    case "NEGOTIATION_NOT_OPEN":
      return "La négociation n’est pas ouverte pour ce dossier.";
    case "NEGOTIATION_SALARY_INVALID":
      return "Indiquez un salaire supérieur à 0.";
    case "NEGOTIATION_CURRENCY_INVALID":
      return "Devise invalide.";
    case "NEGOTIATION_CONTRACT_INVALID":
      return "Choisissez un type de contrat.";
    case "NEGOTIATION_DATE_INVALID":
      return "La date de début ne peut pas être dans le passé.";
    case "NEGOTIATION_TEXT_TOO_LONG":
      return "Le texte est trop long.";
    case "NEGOTIATION_LIMIT":
      return "Trop de propositions échangées sur ce dossier.";
    case "NEGOTIATION_OFFER_CLOSED":
      return "Cette proposition a déjà reçu une réponse ou a été remplacée.";
    case "NEGOTIATION_OWN_OFFER":
      return "Vous ne pouvez pas répondre à votre propre proposition.";
    case "NEGOTIATION_OFFER_NOT_FOUND":
      return "Proposition introuvable.";
    default:
      return recruitmentError(code);
  }
}
