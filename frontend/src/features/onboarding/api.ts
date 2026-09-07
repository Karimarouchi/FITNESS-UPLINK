import { api } from "@/shared/api/client";
import type { AuthUser, CountrySummary, ProfileField, RoleCard, UploadMeta } from "@/features/auth/types";

export function fetchRoles() {
  return api.get<RoleCard[]>("/v1/catalog/roles");
}

export function fetchCountries(query = "") {
  const q = query.trim();
  const path = q ? `/v1/catalog/countries?q=${encodeURIComponent(q)}` : "/v1/catalog/countries";
  return api.get<CountrySummary[]>(path);
}

export function selectRole(roleId: string) {
  return api.post<AuthUser>("/v1/onboarding/role", { roleId });
}

export function selectCountry(countryId: string) {
  return api.post<AuthUser>("/v1/onboarding/country", { countryId });
}

export function fetchProfileFields() {
  return api.get<ProfileField[]>("/v1/onboarding/profile-fields");
}

export function completeProfile(values: Record<string, string>) {
  return api.post<AuthUser>("/v1/onboarding/profile", { values });
}

export function parseCv(uploadId: string) {
  return api.post<{ values: Record<string, string>; filledKeys: string[]; message: string }>(
    "/v1/onboarding/profile/parse-cv",
    { uploadId },
  );
}

export function fetchProfileValues() {
  return api.get<{ values: Record<string, string> }>("/v1/onboarding/profile");
}

export function uploadProfileFile(fieldKey: string, file: File) {
  const body = new FormData();
  body.append("fieldKey", fieldKey);
  body.append("file", file);
  return api.postForm<UploadMeta>("/v1/onboarding/uploads", body);
}

export function fetchUploadBlob(id: string) {
  return api.getBlob(`/v1/onboarding/uploads/${id}`);
}
