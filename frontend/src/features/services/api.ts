import { api } from "@/shared/api/client";
import type { CountrySummary } from "@/features/auth/types";
import type { FileRef } from "@/features/talent/api";

export type ServiceCategory = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export type ProviderService = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  active: boolean;
};

export type ProviderCard = {
  id: string;
  displayName: string;
  logoUploadId: string | null;
  description: string | null;
  city: string | null;
  country: CountrySummary | null;
  categoryNames: string[];
  subscribed: boolean;
};

export type ProviderPage = {
  items: ProviderCard[];
  total: number;
  page: number;
  size: number;
};

export type ProviderProfile = ProviderCard & {
  website: string | null;
  phone: string | null;
  email: string | null;
  coverageCountries: CountrySummary[];
  photoUploadIds: string[];
  portfolioVideos: string[];
  services: ProviderService[];
};

export type QuoteRequest = {
  id: string;
  providerId: string;
  providerDisplayName: string | null;
  requesterId: string;
  requesterDisplayName: string | null;
  companyName: string;
  country: CountrySummary | null;
  city: string | null;
  message: string;
  attachments: FileRef[];
  status: "NEW" | "HANDLED";
  createdAt: string;
  handledAt: string | null;
};

export type ProviderSearchParams = {
  q?: string;
  countryId?: string;
  categoryId?: string;
  page?: number;
  size?: number;
};

export function fetchServiceCategories() {
  return api.get<ServiceCategory[]>("/v1/services/categories");
}

export function fetchAdminServiceCategories() {
  return api.get<ServiceCategory[]>("/v1/admin/services/categories");
}

export function saveServiceCategory(id: string | null, request: { name: string; sortOrder: number; active: boolean }) {
  return id
    ? api.put<ServiceCategory>(`/v1/admin/services/categories/${id}`, request)
    : api.post<ServiceCategory>("/v1/admin/services/categories", request);
}

export function deleteServiceCategory(id: string) {
  return api.delete<void>(`/v1/admin/services/categories/${id}`);
}

export function fetchProviders(params: ProviderSearchParams = {}) {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.countryId) query.set("countryId", params.countryId);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 12));
  return api.get<ProviderPage>(`/v1/services/providers?${query.toString()}`);
}

export function fetchProviderProfile(id: string) {
  return api.get<ProviderProfile>(`/v1/services/providers/${id}`);
}

export function fetchProviderFile(providerId: string, uploadId: string) {
  return api.getBlob(`/v1/services/providers/${providerId}/files/${uploadId}`);
}

export function fetchMyProviderServices() {
  return api.get<ProviderService[]>("/v1/services/mine");
}

export function saveProviderService(id: string | null, request: { categoryId: string; name: string; description: string | null; active: boolean }) {
  return id
    ? api.put<ProviderService>(`/v1/services/mine/${id}`, request)
    : api.post<ProviderService>("/v1/services/mine", request);
}

export function deleteProviderService(id: string) {
  return api.delete<void>(`/v1/services/mine/${id}`);
}

export function createQuoteRequest(
  providerId: string,
  request: { companyName: string; countryId?: string; city?: string; message: string; attachmentUploadIds: string[] },
) {
  return api.post<QuoteRequest>(`/v1/services/providers/${providerId}/quote-requests`, request);
}

export function fetchSentQuoteRequests() {
  return api.get<QuoteRequest[]>("/v1/services/quote-requests/sent");
}

export function fetchReceivedQuoteRequests() {
  return api.get<QuoteRequest[]>("/v1/services/quote-requests/received");
}

export function handleQuoteRequest(id: string) {
  return api.post<QuoteRequest>(`/v1/services/quote-requests/${id}/handle`);
}

export function uploadQuoteAttachment(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api.postForm<{ uploadId: string }>("/v1/services/quote-requests/attachments", form);
}

export function providerLocation(item: { city: string | null; country: CountrySummary | null }) {
  const parts = [item.city?.trim() || null, item.country ? `${item.country.flagEmoji} ${item.country.name}` : null].filter(Boolean);
  return parts.join(" · ");
}
