import { api } from "@/shared/api/client";
import type { CountrySummary } from "@/features/auth/types";
import type { PipelineStatus, RecruitmentSummary } from "@/features/recruitment/api";

export type FileRef = {
  id: string;
  name: string;
  contentType: string;
  size: number;
};

export type MoneyValue = {
  amount: string;
  currency: string;
};

export type ExperienceItem = {
  title: string | null;
  company: string | null;
  start: string | null;
  end: string | null;
  description: string | null;
};

export type LanguageItem = {
  language: string | null;
  level: string | null;
};

export type CandidateCard = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  title: string | null;
  city: string | null;
  country: CountrySummary | null;
  specialties: string[];
  experiences: ExperienceItem[];
  availability: string | null;
  availabilityLabel: string | null;
  photoUploadId: string | null;
  verified: boolean;
  favorite: boolean;
  inPipeline: boolean;
  pipelineStatus: PipelineStatus | null;
  recruitmentId: string | null;
  email?: string;
};

export type CandidateDetail = CandidateCard & {
  biography: string | null;
  languages: LanguageItem[];
  certifications: FileRef[];
  diplomas: FileRef[];
  salary: MoneyValue | null;
  recruitments: RecruitmentSummary[];
  email: string;
  phone: string | null;
  cv: FileRef | null;
  videos: FileRef[];
  canViewMedia: boolean;
};

export function candidateLocation(item: { city: string | null; country: CountrySummary | null }) {
  const parts = [item.city?.trim() || null, item.country ? `${item.country.flagEmoji} ${item.country.name}` : null].filter(Boolean);
  return parts.join(" · ");
}

export function fetchCandidates(query = "") {
  const q = query.trim();
  const path = q ? `/v1/candidates?q=${encodeURIComponent(q)}` : "/v1/candidates";
  return api.get<CandidateCard[]>(path);
}

export function fetchCandidate(id: string) {
  return api.get<CandidateDetail>(`/v1/candidates/${id}`);
}

export function favoriteCandidate(id: string) {
  return api.post<void>(`/v1/candidates/${id}/favorite`);
}

export function unfavoriteCandidate(id: string) {
  return api.delete<void>(`/v1/candidates/${id}/favorite`);
}

export function fetchCandidateFile(candidateId: string, uploadId: string) {
  return api.getBlob(`/v1/candidates/${candidateId}/files/${uploadId}`);
}
