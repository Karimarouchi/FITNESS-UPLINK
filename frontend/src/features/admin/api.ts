import type { CountrySummary, RoleSummary } from "@/features/auth/types";
import { api } from "@/shared/api/client";

export type VerificationStatus = "pending" | "verified" | "rejected";
export type VerificationKind = "PROFESSIONAL" | "COMPANY";

export type VerificationCheck = {
  key: string;
  label: string;
  complete: boolean;
  required: boolean;
  reviewStatus: VerificationStatus;
};

export type VerificationAccount = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: RoleSummary | null;
  country: CountrySummary | null;
  onboardingCompleted: boolean;
  createdAt: string;
  avatarUploadId: string | null;
  verificationStatus: VerificationStatus;
  kind: VerificationKind;
  checks: VerificationCheck[];
};

export type VerificationFile = {
  id: string;
  name: string;
  contentType: string;
  size: number;
};

export type VerificationPerson = {
  name: string;
  title: string | null;
  idNumber: string | null;
  email: string | null;
  phone: string | null;
};

export type VerificationSection = {
  key: string;
  label: string;
  hint: string;
  complete: boolean;
  required: boolean;
  reviewStatus: VerificationStatus;
  facts: string[];
  files: VerificationFile[];
  people: VerificationPerson[];
};

export type VerificationDossier = {
  account: VerificationAccount;
  sections: VerificationSection[];
};

export function fetchVerifications(group = "all", status = "") {
  const params = new URLSearchParams();
  if (group) {
    params.set("group", group);
  }
  if (status) {
    params.set("status", status);
  }
  const query = params.toString();
  return api.get<VerificationAccount[]>(`/v1/admin/verifications${query ? `?${query}` : ""}`);
}

export function fetchVerificationDossier(id: string) {
  return api.get<VerificationDossier>(`/v1/admin/verifications/${id}`);
}

export function updateVerification(id: string, status: VerificationStatus) {
  return api.patch<VerificationAccount>(`/v1/admin/verifications/${id}`, { status });
}

export function updateVerificationCheck(id: string, key: string, status: VerificationStatus) {
  return api.patch<VerificationDossier>(`/v1/admin/verifications/${id}/checks/${key}`, { status });
}
