export type OnboardingStep = "ROLE" | "COUNTRY" | "PROFILE" | "DONE";

export type RoleSummary = {
  id: string;
  code: string;
  label: string;
  category: string;
  categoryLabel: string;
  icon: string;
};

export type CountrySummary = {
  id: string;
  iso2: string;
  name: string;
  flagEmoji: string;
  callingCode: string;
};

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: RoleSummary | null;
  country: CountrySummary | null;
  onboardingCompleted: boolean;
  onboardingStep: OnboardingStep;
  createdAt: string;
  avatarUploadId: string | null;
  verificationStatus: "pending" | "verified" | "rejected";
};

export type AuthResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
};

export type RoleCard = RoleSummary & {
  description: string | null;
  sortOrder: number;
};

export type ItemField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: { value: string; label: string }[];
};

export type ProfileField = {
  fieldKey: string;
  label: string;
  fieldType: string;
  placeholder: string | null;
  options: { value: string; label: string }[];
  itemFields: ItemField[];
  required: boolean;
  maxLength: number | null;
  sortOrder: number;
  sectionKey: string;
  sectionLabel: string;
  sectionIcon: string;
  helpText: string | null;
  accept: string | null;
};

export type UploadMeta = {
  id: string;
  fieldKey: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
};

export function isSuperAdmin(user: AuthUser | null | undefined) {
  return user?.role?.code === "SUPER_ADMIN";
}

export function isBusiness(user: AuthUser | null | undefined) {
  return user?.role?.category === "BUSINESS";
}

export function isCandidate(user: AuthUser | null | undefined) {
  return user?.role?.code === "CANDIDATE";
}

export function isMember(user: AuthUser | null | undefined) {
  return user?.role?.code === "MEMBER";
}

export function isVerified(user: AuthUser | null | undefined) {
  return user?.verificationStatus === "verified";
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "U";
  }
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function shortNameOf(user: AuthUser) {
  const first = user.firstName?.trim() ?? "";
  const last = user.lastName?.trim() ?? "";
  if (first && last) {
    return `${first} ${last[0]}.`;
  }
  return user.displayName || user.email;
}

export function verificationLabel(user: AuthUser | null | undefined) {
  if (isVerified(user)) {
    return "Profil vérifié";
  }
  if (user?.verificationStatus === "rejected") {
    return "Profil refusé";
  }
  return "Vérification en cours";
}

export function destinationFor(user: AuthUser) {
  switch (user.onboardingStep) {
    case "ROLE":
      return "/onboarding/role";
    case "COUNTRY":
      return "/onboarding/country";
    case "PROFILE":
      return "/onboarding/profile";
    default:
      return "/app/dashboard";
  }
}
