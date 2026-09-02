import { api } from "@/shared/api/client";
import type { JobOfferSummary } from "@/features/recruitment/api";
import { recruitmentError, type ContractStatus } from "@/features/recruitment/api";

export type ContractSource = "IMPORT" | "TEMPLATE";
export type ContractSignerRole = "CANDIDATE" | "EMPLOYER";

export type ContractTerms = {
  position: string;
  contractType: string;
  salaryAmount: string;
  salaryCurrency: string;
  startDate: string;
  location: string;
  extra: string;
};

export type ContractSigner = {
  id: string;
  userId: string;
  role: ContractSignerRole;
  displayName: string;
  email: string;
  signingOrder: number;
  signedAt: string | null;
};

export type Contract = {
  id: string;
  recruitmentId: string;
  employerId: string;
  candidateId: string;
  title: string;
  status: ContractStatus;
  source: ContractSource;
  employerName: string;
  candidateName: string;
  candidateEmail: string;
  employerEmail: string;
  jobOffer: JobOfferSummary | null;
  directRecruitment: boolean;
  terms: Partial<ContractTerms> | null;
  originalFileName: string | null;
  originalUploadId: string | null;
  signedUploadId: string | null;
  auditTrailUploadId: string | null;
  legalTemplateValidated: boolean;
  templateNotice: string | null;
  signers: ContractSigner[];
  createdAt: string;
  sentAt: string | null;
  candidateSignedAt: string | null;
  employerSignedAt: string | null;
  completedAt: string | null;
};

export type ContractHistory = {
  id: string;
  event: string;
  actorId: string | null;
  actorType: string;
  previousStatus: string | null;
  newStatus: string | null;
  createdAt: string;
};

export function contractError(code: string) {
  return recruitmentError(code);
}

export function contractStatusLabel(status: ContractStatus) {
  switch (status) {
    case "DRAFT":
      return "Brouillon";
    case "SENT":
      return "En attente de signature";
    case "CANDIDATE_SIGNED":
      return "Candidat signé";
    case "EMPLOYER_SIGNED":
      return "Employeur signé";
    case "COMPLETED":
      return "Finalisé";
    case "DECLINED":
      return "Refusé";
    case "CANCELLED":
      return "Annulé";
    case "EXPIRED":
      return "Expiré";
    default:
      return status;
  }
}

export function createContract(body: { recruitmentId: string; source: ContractSource; terms?: Partial<ContractTerms> }) {
  return api.post<Contract>("/v1/contracts", body);
}

export function fetchContracts() {
  return api.get<Contract[]>("/v1/contracts");
}

export function fetchContract(id: string) {
  return api.get<Contract>(`/v1/contracts/${id}`);
}

export function uploadContractPdf(id: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return api.postForm<Contract>(`/v1/contracts/${id}/upload`, body);
}

export function sendContract(id: string) {
  return api.post<Contract>(`/v1/contracts/${id}/send`);
}

export function signContract(id: string) {
  return api.post<Contract>(`/v1/contracts/${id}/sign`);
}

export function cancelContract(id: string) {
  return api.post<Contract>(`/v1/contracts/${id}/cancel`);
}

export function fetchContractHistory(id: string) {
  return api.get<ContractHistory[]>(`/v1/contracts/${id}/history`);
}

export function fetchContractDocument(id: string, signed = false) {
  return api.getBlob(signed ? `/v1/contracts/${id}/signed-document` : `/v1/contracts/${id}/document`);
}

export function historyLabel(event: string) {
  switch (event) {
    case "CREATED":
      return "Contrat créé";
    case "DOCUMENT_UPLOADED":
      return "Document importé";
    case "SENT":
      return "Contrat envoyé";
    case "CANDIDATE_SIGNED":
      return "Candidat signé";
    case "EMPLOYER_SIGNED":
      return "Employeur signé";
    case "COMPLETED":
      return "Contrat finalisé";
    case "CANCELLED":
      return "Contrat annulé";
    case "DECLINED":
      return "Contrat refusé";
    case "EXPIRED":
      return "Contrat expiré";
    default:
      return event;
  }
}

export function emptyTerms(item: {
  jobOffer: JobOfferSummary | null;
  directRecruitment: boolean;
  candidate: { displayName: string };
}): ContractTerms {
  return {
    position: item.jobOffer?.position || item.jobOffer?.title || "",
    contractType: "",
    salaryAmount: "",
    salaryCurrency: "AED",
    startDate: "",
    location: item.jobOffer?.location || "",
    extra: "",
  };
}
