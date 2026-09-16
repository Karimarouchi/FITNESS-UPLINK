import { useEffect, useState } from "react";
import { PublicAuthActions } from "@/components/layout/PublicAuthActions";
import { fetchCatalog, planPrice, type BillingCatalog } from "@/features/billing/api";
import "../home.css";

export function PricingPage() {
  const [family, setFamily] = useState("BUSINESS");
  const [catalog, setCatalog] = useState<BillingCatalog | null>(null);
  const [currency, setCurrency] = useState("TND");

  useEffect(() => {
    fetchCatalog(family)
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, [family]);

  return (
    <article className="fu-page">
      <header className="fu-page-head">
        <h1 className="fu-page-title">Tarifs</h1>
        <p className="fu-page-lead">
          Les montants et les fonctions viennent du back-office. Plus l’offre est haute, plus elle débloque de fonctions déjà
          livrées (contact, pipeline, SMTP, contrats…).
        </p>
        <div className="fu-page-actions">
          <select className="custom-input" value={family} onChange={(event) => setFamily(event.target.value)}>
            <option value="BUSINESS">Business</option>
            <option value="TALENT">Talent</option>
            <option value="CREATORS">Créateurs</option>
          </select>
          <select className="custom-input" value={currency} onChange={(event) => setCurrency(event.target.value)}>
            <option>TND</option>
            <option>EUR</option>
            <option>USD</option>
          </select>
          <PublicAuthActions ghostClass="fu-btn fu-btn--outline" solidClass="fu-btn fu-btn--lime" />
        </div>
      </header>
      <div className="fu-page-grid fu-page-grid--plans">
        {catalog?.plans.map((plan, index) => {
          const price = planPrice(plan, currency, false);
          return (
            <section className="fu-page-cell" key={plan.id}>
              <span className="fu-page-index">{String(index + 1).padStart(2, "0")}</span>
              <p className="fu-plan-cadence">
                {price ? `${price.amount} ${currency} / mois` : "Prix administré"}
              </p>
              <h2 className="fu-page-cell-title">{plan.name}</h2>
              <p className="fu-page-cell-copy">{plan.tagline}</p>
              <ul>
                {plan.entitlements.map((item) => (
                  <li key={item.code}>{item.label}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
}
