import { api } from "@/shared/api/client";

export type EntitlementDto = {
  code: string;
  label: string;
  hint: string | null;
  limitKind: string;
  limitValue: number | null;
};

export type PriceDto = {
  currency: string;
  interval: string;
  amount: number;
};

export type BillingPlan = {
  id: string;
  family: string;
  familyLabel: string;
  code: string;
  name: string;
  tagline: string | null;
  featured: boolean;
  trialDays: number;
  prices: PriceDto[];
  entitlements: EntitlementDto[];
};

export type BillingCatalog = {
  family: string;
  familyLabel: string;
  plans: BillingPlan[];
  currencies: string[];
};

export type SubscriptionDto = {
  id: string;
  planId: string;
  planName: string;
  family: string;
  status: string;
  interval: string;
  currency: string;
  cardLast4: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
};

export type MeBilling = {
  subscription: SubscriptionDto | null;
  entitlements: string[];
  limits: Record<string, number>;
};

export type InvoiceDto = { id: string; number: string; createdAt: string };

export type AdminSubscriber = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  planName: string;
  status: string;
  currency: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
};

export function fetchCatalog(family?: string) {
  return api.get<BillingCatalog>(family ? `/v1/billing/catalog?family=${family}` : "/v1/billing/catalog");
}

export function fetchMyBilling() {
  return api.get<MeBilling>("/v1/billing/me");
}

export function checkout(body: {
  planId: string;
  interval: string;
  currency: string;
  cardNumber: string;
  holder: string;
  month: string;
  year: string;
  cvv: string;
  acceptCgv: boolean;
}) {
  return api.post<MeBilling>("/v1/billing/checkout", body);
}

export function cancelBilling() {
  return api.post<MeBilling>("/v1/billing/cancel");
}

export function fetchInvoices() {
  return api.get<InvoiceDto[]>("/v1/billing/invoices");
}

export function fetchInvoiceBlob(id: string) {
  return api.getBlob(`/v1/billing/invoices/${id}`);
}

export function fetchAdminPlans() {
  return api.get<BillingPlan[]>("/v1/admin/billing/plans");
}

export function fetchAdminEntitlements() {
  return api.get<EntitlementDto[]>("/v1/admin/billing/entitlements");
}

export function saveAdminPlan(
  id: string,
  body: {
    name?: string;
    tagline?: string;
    featured?: boolean;
    active?: boolean;
    trialDays?: number;
    prices?: PriceDto[];
    entitlements?: { code: string; limitValue: number | null }[];
  },
) {
  return api.put<BillingPlan>(`/v1/admin/billing/plans/${id}`, body);
}

export function fetchSubscribers() {
  return api.get<AdminSubscriber[]>("/v1/admin/billing/subscribers");
}

export function fetchTestCards() {
  return api.get<{ id: string; last4: string; outcome: string; label: string; enabled: boolean }[]>(
    "/v1/admin/billing/test-cards",
  );
}

export function saveTestCard(body: { pan: string; outcome: string; label: string; enabled: boolean }) {
  return api.post("/v1/admin/billing/test-cards", body);
}

export function fetchVat() {
  return api.get<{ iso2: string; rate: number }[]>("/v1/admin/billing/vat");
}

export function saveVat(iso2: string, rate: number) {
  return api.put("/v1/admin/billing/vat", { iso2, rate });
}

export function renewNow() {
  return api.post("/v1/admin/billing/renew-now");
}

export function planPrice(plan: BillingPlan, currency: string, yearly: boolean) {
  const interval = yearly ? "YEARLY" : "MONTHLY";
  return plan.prices.find((row) => row.currency === currency && row.interval === interval) ?? null;
}

export function hasEntitlement(codes: string[] | undefined, code: string) {
  return Boolean(codes?.includes(code) || codes?.includes("billing.unlock_all"));
}

export function billingError(code: string) {
  switch (code) {
    case "CGV_REQUIRED":
      return "Acceptez les CGV pour continuer.";
    case "CARD_DECLINED":
      return "Carte refusée. Utilisez 4242 4242 4242 4242 pour l’essai.";
    case "CARD_UNKNOWN":
    case "CARD_INVALID":
      return "Numéro de carte invalide : 16 chiffres requis.";
    case "CVV_INVALID":
      return "CVV invalide : 3 ou 4 chiffres requis.";
    case "PLAN_NOT_FOUND":
    case "PLAN_INACTIVE":
    case "PLAN_WRONG_FAMILY":
      return "Cette offre n’est plus disponible pour votre rôle.";
    case "PRICE_NOT_FOUND":
      return "Aucun prix pour cette devise. Changez de devise ou d’offre.";
    case "ENTITLEMENT_REQUIRED":
      return "Cette fonction n’est pas incluse dans votre offre.";
    case "ENTITLEMENT_LIMIT":
      return "Limite de votre offre atteinte. Passez à une offre supérieure.";
    case "NO_ACTIVE_SUBSCRIPTION":
      return "Aucun abonnement à annuler.";
    default:
      return code;
  }
}
