import { PRICING_PLANS } from "../data";
import { PublicAuthActions } from "@/components/layout/PublicAuthActions";
import "../home.css";

export function PricingPage() {
  return (
    <article className="fu-page">
      <header className="fu-page-head">
        <h1 className="fu-page-title">Tarifs</h1>
        <p className="fu-page-lead">
          Plans d’abonnement différenciés par catégorie d’utilisateur. Les montants, devises et droits sont administrés depuis le back-office — jamais figés dans le code.
        </p>
        <div className="fu-page-actions">
          <PublicAuthActions ghostClass="fu-btn fu-btn--outline" solidClass="fu-btn fu-btn--lime" />
        </div>
      </header>
      <div className="fu-page-grid fu-page-grid--plans">
        {PRICING_PLANS.map((plan, index) => (
          <section className="fu-page-cell" key={plan.audience}>
            <span className="fu-page-index">{String(index + 1).padStart(2, "0")}</span>
            <p className="fu-plan-cadence">{plan.cadence}</p>
            <h2 className="fu-page-cell-title">{plan.audience}</h2>
            <p className="fu-page-cell-copy">{plan.description}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
