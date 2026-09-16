export type PlanId = "FREE" | "BASIC" | "PLUS" | "ELITE";
export type PlanInterval = "MONTHLY" | "YEARLY";

export type PlanDef = {
  id: PlanId;
  monthly: number;
  icon: string;
  featured?: boolean;
};

export const MEMBER_PLANS: PlanDef[] = [
  { id: "FREE", monthly: 0, icon: "layers" },
  { id: "BASIC", monthly: 29, icon: "monitor" },
  { id: "PLUS", monthly: 99, icon: "group", featured: true },
  { id: "ELITE", monthly: 199, icon: "apartment" },
];

export const MEMBER_PLAN_COPY = {
  fr: {
    FREE: { name: "Gratuit", tag: "Pour découvrir Fitness Uplink" },
    BASIC: { name: "Essentiel", tag: "Pour s’entraîner régulièrement" },
    PLUS: { name: "Plus", tag: "Pour un accompagnement complet" },
    ELITE: { name: "Elite", tag: "Pour un suivi premium" },
  },
  en: {
    FREE: { name: "Free", tag: "Discover Fitness Uplink" },
    BASIC: { name: "Basic", tag: "Train on a regular cadence" },
    PLUS: { name: "Plus", tag: "Full member support" },
    ELITE: { name: "Elite", tag: "Premium follow-up" },
  },
} as const;

export function yearlyMonthly(amount: number) {
  return Math.round(amount * 0.8);
}

export function yearlyTotal(amount: number) {
  return Math.round(amount * 12 * 0.8);
}

export function planAmount(plan: PlanDef, yearly: boolean) {
  if (plan.monthly === 0) {
    return { price: 0, yearly: 0 };
  }
  return yearly ? { price: yearlyMonthly(plan.monthly), yearly: yearlyTotal(plan.monthly) } : { price: plan.monthly, yearly: 0 };
}

export function intervalLabel(interval: string | null | undefined, locale: "fr" | "en" = "fr") {
  if (interval === "YEARLY") {
    return locale === "en" ? "Yearly" : "Annuel";
  }
  return locale === "en" ? "Monthly" : "Mensuel";
}

export function findMemberPlan(id: string | null | undefined) {
  return MEMBER_PLANS.find((plan) => plan.id === id) ?? null;
}
