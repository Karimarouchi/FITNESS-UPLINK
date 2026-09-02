import { api } from "@/shared/api/client";
import type { CountrySummary } from "@/features/auth/types";

export type JobOfferStatus = "DRAFT" | "PUBLISHED";

export type JobOffer = {
  id: string;
  title: string;
  position: string | null;
  location: string | null;
  contractType: string | null;
  salaryAmount: string | null;
  salaryCurrency: string | null;
  languages: string[];
  certifications: string[];
  experience: string | null;
  description: string | null;
  status: JobOfferStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertJobOffer = {
  title: string;
  position?: string;
  location?: string;
  contractType?: string;
  salaryAmount?: string;
  salaryCurrency?: string;
  languages?: string[];
  certifications?: string[];
  experience?: string;
  description?: string;
  status?: JobOfferStatus;
  expiresAt?: string | null;
};

export const CONTRACT_TYPES = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "freelance", label: "Freelance" },
  { value: "part_time", label: "Temps partiel" },
  { value: "internship", label: "Stage" },
  { value: "vacation", label: "Vacation" },
];

export function fetchJobOffers() {
  return api.get<JobOffer[]>("/v1/job-offers");
}

export function fetchJobOffer(id: string) {
  return api.get<JobOffer>(`/v1/job-offers/${id}`);
}

export function createJobOffer(body: UpsertJobOffer) {
  return api.post<JobOffer>("/v1/job-offers", body);
}

export function updateJobOffer(id: string, body: UpsertJobOffer) {
  return api.patch<JobOffer>(`/v1/job-offers/${id}`, body);
}

export function deleteJobOffer(id: string) {
  return api.delete<void>(`/v1/job-offers/${id}`);
}

export type Opportunity = {
  id: string;
  title: string;
  position: string | null;
  location: string | null;
  contractType: string | null;
  salaryAmount: string | null;
  salaryCurrency: string | null;
  languages: string[];
  certifications: string[];
  experience: string | null;
  description: string | null;
  employerName: string;
  employerCountry: CountrySummary | null;
  applied: boolean;
  expiresAt: string | null;
  createdAt: string;
};

export function fetchOpportunities(query = "") {
  const q = query.trim();
  const path = q ? `/v1/opportunities?q=${encodeURIComponent(q)}` : "/v1/opportunities";
  return api.get<Opportunity[]>(path);
}

export function applyToOpportunity(id: string) {
  return api.post<void>(`/v1/opportunities/${id}/apply`);
}
