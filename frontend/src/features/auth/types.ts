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

export function isVerified(user: AuthUser | null | undefined) {
  return user?.verificationStatus === "verified";
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
      return "/";
  }
}
