import { useEffect, useMemo, useState } from "react";
import { Pricing, type PricingPlan } from "@/components/ui/pricing";
import { useAuth } from "@/features/auth/AuthContext";
import { fetchCatalog, planPrice, type BillingCatalog } from "@/features/billing/api";
import { PublicCta } from "../public/PublicCta";
import { PublicHero } from "../public/PublicHero";

const FAMILIES = [
  { id: "BUSINESS", label: "Business" },
  { id: "TALENT", label: "Talent" },
  { id: "CREATORS", label: "Créateurs" },
] as const;

function pickFamilyPlan(catalog: BillingCatalog) {
  return catalog.plans.find((plan) => plan.featured) ?? catalog.plans[catalog.plans.length - 1] ?? catalog.plans[0];
}

function toFamilyCard(
  catalog: BillingCatalog,
  label: string,
  currency: string,
  href: string,
  buttonText: string,
  popular: boolean,
): PricingPlan | null {
  const plan = pickFamilyPlan(catalog);
  if (!plan) return null;
  const monthly = planPrice(plan, currency, false);
  const yearly = planPrice(plan, currency, true);
  return {
    name: label,
    price: monthly ? String(monthly.amount) : "0",
    yearlyPrice: yearly ? String(yearly.amount) : monthly ? String(monthly.amount) : "0",
    period: "mois",
    yearlyPeriod: yearly ? "an" : "mois",
    features: plan.entitlements.map((item) =>
      item.limitValue != null ? `${item.label} (${item.limitValue})` : item.label,
    ),
    description: plan.tagline || catalog.familyLabel || "Offre administrée depuis le back-office.",
    buttonText,
    href,
    isPopular: popular,
  };
}

export function PricingPage() {
  const { user } = useAuth();
  const [catalogs, setCatalogs] = useState<Partial<Record<string, BillingCatalog>>>({});
  const [currency, setCurrency] = useState("TND");

  useEffect(() => {
    Promise.all(FAMILIES.map((item) => fetchCatalog(item.id).then((catalog) => [item.id, catalog] as const)))
      .then((rows) => {
        const next = Object.fromEntries(rows);
        setCatalogs(next);
        const available = rows.flatMap(([, catalog]) => catalog.currencies);
        if (available.length && !available.includes(currency)) {
          setCurrency(available[0]);
        }
      })
      .catch(() => setCatalogs({}));
  }, []);

  const joinTo = user ? "/app/profile/plan" : "/signup";
  const currencies = Array.from(
    new Set(Object.values(catalogs).flatMap((catalog) => catalog?.currencies ?? ["TND", "EUR", "USD"])),
  );
  const plans = useMemo(
    () =>
      FAMILIES.map((item, index) => {
        const catalog = catalogs[item.id];
        if (!catalog) return null;
        return toFamilyCard(
          catalog,
          item.label,
          currency,
          joinTo,
          user ? "Changer d’offre" : "Choisir",
          index === 1,
        );
      }).filter((plan): plan is PricingPlan => plan != null),
    [catalogs, currency, joinTo, user],
  );

  return (
    <article>
      <PublicHero
        kicker="Tarifs"
        title="L’accès à la force."
        lead="Les montants et les fonctions viennent du back-office. Plus l’offre est haute, plus elle débloque le contact, le pipeline, les contrats et le reste du circuit."
        image="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=2000&q=70"
      />
      <section className="pub-section">
        <div className="pub-wrap">
          <div className="pub-filters">
            <div className="pub-tabs" role="tablist" aria-label="Devise">
              {currencies.map((code) => (
                <button
                  key={code}
                  className={`pub-tab${currency === code ? " is-on" : ""}`}
                  type="button"
                  onClick={() => setCurrency(code)}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {plans.length > 0 ? (
            <Pricing
              plans={plans}
              currency={currency}
              title="Choisissez votre entrée."
              description="Business, talent ou créateurs — un compte, tout le circuit."
            />
          ) : (
            <p className="pub-empty">Les offres de cette famille apparaîtront ici dès qu’elles sont publiées.</p>
          )}
        </div>
      </section>
      <PublicCta
        title="Un compte. Tout le circuit."
        lead="Activez l’offre qui correspond à votre rôle, puis ouvrez les modules dont vous avez besoin."
        primaryTo={user ? "/app/dashboard" : "/signup"}
        primaryLabel={user ? "Tableau de bord" : "Créer mon dossier"}
        secondaryTo="/fitness-hire-elite"
        secondaryLabel="Voir Hire Elite"
      />
    </article>
  );
}
