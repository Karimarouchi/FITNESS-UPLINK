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
  videos: string[];
  canViewMedia: boolean;
};

export function candidateLocation(item: { city: string | null; country: CountrySummary | null }) {
  const parts = [item.city?.trim() || null, item.country ? `${item.country.flagEmoji} ${item.country.name}` : null].filter(Boolean);
  return parts.join(" · ");
}

export type CandidatePage = {
  items: CandidateCard[];
  total: number;
  page: number;
  size: number;
};

export type CandidateSearchParams = {
  q?: string;
  countryId?: string;
  city?: string;
  title?: string;
  specialty?: string;
  availability?: string;
  contractType?: string;
  language?: string;
  relocate?: boolean;
  hasDiploma?: boolean;
  hasCertification?: boolean;
  sort?: "date" | "relevance" | "experience";
  page?: number;
  size?: number;
};

export function fetchCandidates(params: CandidateSearchParams | string = {}) {
  const filters: CandidateSearchParams = typeof params === "string" ? { q: params } : params;
  const query = new URLSearchParams();
  if (filters.q?.trim()) query.set("q", filters.q.trim());
  if (filters.countryId) query.set("countryId", filters.countryId);
  if (filters.city?.trim()) query.set("city", filters.city.trim());
  if (filters.title?.trim()) query.set("title", filters.title.trim());
  if (filters.specialty) query.set("specialty", filters.specialty);
  if (filters.availability) query.set("availability", filters.availability);
  if (filters.contractType) query.set("contractType", filters.contractType);
  if (filters.language?.trim()) query.set("language", filters.language.trim());
  if (filters.relocate) query.set("relocate", "true");
  if (filters.hasDiploma) query.set("hasDiploma", "true");
  if (filters.hasCertification) query.set("hasCertification", "true");
  query.set("sort", filters.sort ?? "date");
  query.set("page", String(filters.page ?? 0));
  query.set("size", String(filters.size ?? 12));
  return api.get<CandidatePage>(`/v1/candidates?${query.toString()}`);
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
